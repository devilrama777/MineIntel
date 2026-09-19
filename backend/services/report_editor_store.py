"""
MineIntel Phase 8: Report Editor Persistence Store (Neon PostgreSQL + Local JSON Fallback)

Persists report revisions, states (original, draft_edit, approved, finalized), and edit metadata.
Enforces Phase 0 sovereign user ownership and isolation.
"""

import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend import config

logger = logging.getLogger("mineintel.report_editor_store")

REVISIONS_FILE = config.DATA_DIR / "report_revisions.json"
_pg_rev_initialized = False


def is_postgres_configured() -> bool:
    return bool(config.get_database_url().strip())


def _get_pg_connection():
    import psycopg2
    db_url = config.get_database_url().strip()
    if "sslmode=" not in db_url and ("neon.tech" in db_url or "aws" in db_url or "render.com" in db_url):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"
    return psycopg2.connect(db_url, connect_timeout=10)


def init_revision_schema() -> None:
    global _pg_rev_initialized
    if _pg_rev_initialized:
        return
    if not is_postgres_configured():
        return
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mineintel_report_revisions (
                        revision_id VARCHAR(128) PRIMARY KEY,
                        report_id VARCHAR(128) NOT NULL,
                        job_id VARCHAR(128) NOT NULL,
                        owner_id VARCHAR(128) NOT NULL,
                        version INT NOT NULL,
                        state VARCHAR(64) NOT NULL,
                        title TEXT NOT NULL,
                        revision_data JSONB NOT NULL,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL,
                        UNIQUE(report_id, version)
                    );
                    CREATE INDEX IF NOT EXISTS idx_rev_report ON mineintel_report_revisions (report_id);
                    CREATE INDEX IF NOT EXISTS idx_rev_job ON mineintel_report_revisions (job_id);
                    CREATE INDEX IF NOT EXISTS idx_rev_owner ON mineintel_report_revisions (owner_id);
                """)
            conn.commit()
        _pg_rev_initialized = True
    except Exception as e:
        logger.warning(f"PostgreSQL revision schema init error: {e}")


def _load_local_store() -> Dict[str, Any]:
    if not REVISIONS_FILE.exists():
        return {"revisions": {}}
    try:
        data = json.loads(REVISIONS_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"revisions": {}}
        data.setdefault("revisions", {})
        return data
    except Exception as e:
        logger.warning(f"Failed to load revision store {REVISIONS_FILE}: {e}")
        return {"revisions": {}}


def _atomic_write_local_store(data: Dict[str, Any]) -> None:
    try:
        REVISIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=str(REVISIONS_FILE.parent), delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, str(REVISIONS_FILE))
    except Exception as e:
        logger.warning(f"Atomic revision store write error: {e}")
        try:
            REVISIONS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            pass


def save_revision(revision_dict: Dict[str, Any]) -> None:
    """Saves report revision to Neon or local fallback."""
    revision_id = revision_dict.get("revision_id")
    report_id = revision_dict.get("report_id")
    job_id = revision_dict.get("job_id")
    owner_id = revision_dict.get("owner_id")
    version = int(revision_dict.get("version", 1))
    state = revision_dict.get("state", "original")
    title = revision_dict.get("title", "Report")
    now_ms = int(time.time() * 1000)
    created_at = revision_dict.get("created_at") or now_ms
    updated_at = revision_dict.get("updated_at") or now_ms

    if is_postgres_configured():
        try:
            init_revision_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO mineintel_report_revisions
                        (revision_id, report_id, job_id, owner_id, version, state, title, revision_data, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (report_id, version) DO UPDATE SET
                            state = EXCLUDED.state,
                            title = EXCLUDED.title,
                            revision_data = EXCLUDED.revision_data,
                            updated_at = EXCLUDED.updated_at;
                    """, (
                        revision_id,
                        report_id,
                        job_id,
                        owner_id,
                        version,
                        state,
                        title,
                        json.dumps(revision_dict),
                        created_at,
                        updated_at
                    ))
                conn.commit()
            return
        except Exception as e:
            logger.warning(f"PostgreSQL save_revision error, falling back to local: {e}")

    store = _load_local_store()
    store["revisions"][revision_id] = revision_dict
    _atomic_write_local_store(store)


def get_revision(report_id: str, version: int, owner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves a specific revision of a report by version, enforcing ownership if provided."""
    if is_postgres_configured():
        try:
            init_revision_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT revision_data FROM mineintel_report_revisions WHERE report_id = %s AND version = %s AND owner_id = %s LIMIT 1;",
                            (report_id, version, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT revision_data FROM mineintel_report_revisions WHERE report_id = %s AND version = %s LIMIT 1;",
                            (report_id, version)
                        )
                    row = cur.fetchone()
                    if row:
                        val = row[0]
                        return json.loads(val) if isinstance(val, str) else val
            return None
        except Exception as e:
            logger.warning(f"PostgreSQL get_revision error, falling back to local: {e}")

    store = _load_local_store()
    for r in store["revisions"].values():
        if r.get("report_id") == report_id and int(r.get("version", 0)) == int(version):
            if not owner_id or r.get("owner_id") == owner_id:
                return r
    return None


def get_latest_revision(report_id: str, owner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves the highest-numbered revision for a report."""
    revisions = list_revisions(report_id=report_id, owner_id=owner_id)
    if not revisions:
        return None
    # Sort by version descending
    revisions.sort(key=lambda r: int(r.get("version", 0)), reverse=True)
    return revisions[0]


def get_approved_revision(report_id: str, owner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves the latest revision with state 'approved' or 'finalized'."""
    revisions = list_revisions(report_id=report_id, owner_id=owner_id)
    approved = [
        r for r in revisions
        if r.get("state") in ("approved", "finalized")
    ]
    if not approved:
        return None
    approved.sort(key=lambda r: int(r.get("version", 0)), reverse=True)
    return approved[0]


def list_revisions(report_id: str, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lists all revisions for a given report_id in ascending version order."""
    if is_postgres_configured():
        try:
            init_revision_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT revision_data FROM mineintel_report_revisions WHERE report_id = %s AND owner_id = %s ORDER BY version ASC;",
                            (report_id, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT revision_data FROM mineintel_report_revisions WHERE report_id = %s ORDER BY version ASC;",
                            (report_id,)
                        )
                    rows = cur.fetchall()
                    return [json.loads(r[0]) if isinstance(r[0], str) else r[0] for r in rows]
        except Exception as e:
            logger.warning(f"PostgreSQL list_revisions error, falling back to local: {e}")

    store = _load_local_store()
    matched = [
        r for r in store["revisions"].values()
        if r.get("report_id") == report_id and (not owner_id or r.get("owner_id") == owner_id)
    ]
    matched.sort(key=lambda x: int(x.get("version", 0)))
    return matched
