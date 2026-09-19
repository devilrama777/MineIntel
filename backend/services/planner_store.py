"""
MineIntel Phase 6: Report Planner Persistence Store (Neon PostgreSQL + Local JSON Fallback)

Provides persistence for:
- Machine-readable Report Plans with full section trees and provenance links
- Multi-version plan snapshots for reproducible downstream generation
- Enforces sovereign user ownership and isolation
"""

import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend import config

logger = logging.getLogger("mineintel.planner_store")

PLANS_FILE = config.DATA_DIR / "report_plans.json"
_pg_planner_initialized = False


def is_postgres_configured() -> bool:
    return bool(config.get_database_url().strip())


def _get_pg_connection():
    import psycopg2
    db_url = config.get_database_url().strip()
    if "sslmode=" not in db_url and ("neon.tech" in db_url or "aws" in db_url or "render.com" in db_url):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"
    return psycopg2.connect(db_url, connect_timeout=10)


def init_planner_schema() -> None:
    global _pg_planner_initialized
    if _pg_planner_initialized:
        return
    if not is_postgres_configured():
        return
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mineintel_report_plans (
                        plan_id VARCHAR(128) PRIMARY KEY,
                        job_id VARCHAR(128) NOT NULL,
                        owner_id VARCHAR(128) NOT NULL,
                        version INT NOT NULL DEFAULT 1,
                        status VARCHAR(64) NOT NULL,
                        title TEXT NOT NULL,
                        plan_data JSONB NOT NULL,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_plans_job ON mineintel_report_plans (job_id);
                    CREATE INDEX IF NOT EXISTS idx_plans_owner ON mineintel_report_plans (owner_id);
                """)
            conn.commit()
        _pg_planner_initialized = True
    except Exception as e:
        logger.warning(f"PostgreSQL planner schema init error: {e}")


def _load_local_store() -> Dict[str, Any]:
    if not PLANS_FILE.exists():
        return {"plans": {}}
    try:
        data = json.loads(PLANS_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"plans": {}}
        data.setdefault("plans", {})
        return data
    except Exception as e:
        logger.warning(f"Failed to load planner store {PLANS_FILE}: {e}")
        return {"plans": {}}


def _atomic_write_local_store(data: Dict[str, Any]) -> None:
    try:
        PLANS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=str(PLANS_FILE.parent), delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, str(PLANS_FILE))
    except Exception as e:
        logger.warning(f"Atomic planner store write error: {e}")
        try:
            PLANS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            pass


def save_plan(plan_dict: Dict[str, Any]) -> None:
    """Saves Report Plan to Neon or local fallback."""
    plan_id = plan_dict.get("plan_id")
    job_id = plan_dict.get("job_id")
    owner_id = plan_dict.get("owner_id")
    version = int(plan_dict.get("version", 1))
    status = plan_dict.get("status", "draft")
    title = plan_dict.get("title", "Report Plan")
    now_ms = int(time.time() * 1000)

    if is_postgres_configured():
        try:
            init_planner_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO mineintel_report_plans
                        (plan_id, job_id, owner_id, version, status, title, plan_data, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (plan_id) DO UPDATE SET
                            status = EXCLUDED.status,
                            title = EXCLUDED.title,
                            plan_data = EXCLUDED.plan_data,
                            updated_at = EXCLUDED.updated_at;
                    """, (
                        plan_id,
                        job_id,
                        owner_id,
                        version,
                        status,
                        title,
                        json.dumps(plan_dict),
                        now_ms,
                        now_ms
                    ))
                conn.commit()
            return
        except Exception as e:
            logger.warning(f"PostgreSQL save_plan error, falling back to local: {e}")

    store = _load_local_store()
    store["plans"][plan_id] = plan_dict
    _atomic_write_local_store(store)


def get_plan(plan_id: str, owner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves a specific plan by plan_id, enforcing ownership if provided."""
    if is_postgres_configured():
        try:
            init_planner_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT plan_data FROM mineintel_report_plans WHERE plan_id = %s AND owner_id = %s LIMIT 1;",
                            (plan_id, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT plan_data FROM mineintel_report_plans WHERE plan_id = %s LIMIT 1;",
                            (plan_id,)
                        )
                    row = cur.fetchone()
                    if row:
                        val = row[0]
                        return json.loads(val) if isinstance(val, str) else val
            return None
        except Exception as e:
            logger.warning(f"PostgreSQL get_plan error, falling back to local: {e}")

    store = _load_local_store()
    p = store["plans"].get(plan_id)
    if not p:
        return None
    if owner_id and p.get("owner_id") != owner_id:
        return None
    return p


def get_latest_plan_for_job(job_id: str, owner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves the newest version plan for a job."""
    if is_postgres_configured():
        try:
            init_planner_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT plan_data FROM mineintel_report_plans WHERE job_id = %s AND owner_id = %s ORDER BY version DESC, created_at DESC LIMIT 1;",
                            (job_id, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT plan_data FROM mineintel_report_plans WHERE job_id = %s ORDER BY version DESC, created_at DESC LIMIT 1;",
                            (job_id,)
                        )
                    row = cur.fetchone()
                    if row:
                        val = row[0]
                        return json.loads(val) if isinstance(val, str) else val
            return None
        except Exception as e:
            logger.warning(f"PostgreSQL get_latest_plan error, falling back to local: {e}")

    store = _load_local_store()
    matched = [
        p for p in store["plans"].values()
        if p.get("job_id") == job_id and (not owner_id or p.get("owner_id") == owner_id)
    ]
    if not matched:
        return None
    matched.sort(key=lambda x: (x.get("version", 1), x.get("created_at", 0)), reverse=True)
    return matched[0]


def list_plan_versions(job_id: str, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lists all plan versions for a job."""
    if is_postgres_configured():
        try:
            init_planner_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT plan_data FROM mineintel_report_plans WHERE job_id = %s AND owner_id = %s ORDER BY version ASC;",
                            (job_id, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT plan_data FROM mineintel_report_plans WHERE job_id = %s ORDER BY version ASC;",
                            (job_id,)
                        )
                    rows = cur.fetchall()
                    return [json.loads(r[0]) if isinstance(r[0], str) else r[0] for r in rows]
        except Exception as e:
            logger.warning(f"PostgreSQL list_plan_versions error, falling back to local: {e}")

    store = _load_local_store()
    matched = [
        p for p in store["plans"].values()
        if p.get("job_id") == job_id and (not owner_id or p.get("owner_id") == owner_id)
    ]
    matched.sort(key=lambda x: x.get("version", 1))
    return matched


def get_next_version_number(job_id: str, owner_id: Optional[str] = None) -> int:
    """Calculates incremented version number for subsequent planning runs."""
    versions = list_plan_versions(job_id, owner_id=owner_id)
    if not versions:
        return 1
    max_v = max(int(v.get("version", 1)) for v in versions)
    return max_v + 1
