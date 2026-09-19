"""
MineIntel Phase 7: Report Generator Persistence Store (Neon PostgreSQL + Local JSON Fallback)

Persists generated report metadata, generation status, page counts, and artifact paths.
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

logger = logging.getLogger("mineintel.report_generator_store")

REPORTS_META_FILE = config.DATA_DIR / "generated_reports.json"
_pg_rep_initialized = False


def is_postgres_configured() -> bool:
    return bool(config.get_database_url().strip())


def _get_pg_connection():
    import psycopg2
    db_url = config.get_database_url().strip()
    if "sslmode=" not in db_url and ("neon.tech" in db_url or "aws" in db_url or "render.com" in db_url):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"
    return psycopg2.connect(db_url, connect_timeout=10)


def init_report_schema() -> None:
    global _pg_rep_initialized
    if _pg_rep_initialized:
        return
    if not is_postgres_configured():
        return
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mineintel_generated_reports (
                        report_id VARCHAR(128) PRIMARY KEY,
                        plan_id VARCHAR(128) NOT NULL,
                        job_id VARCHAR(128) NOT NULL,
                        owner_id VARCHAR(128) NOT NULL,
                        status VARCHAR(64) NOT NULL,
                        title TEXT NOT NULL,
                        page_count INT NOT NULL DEFAULT 0,
                        pdf_path TEXT NOT NULL,
                        docx_path TEXT,
                        md_path TEXT,
                        report_data JSONB NOT NULL,
                        created_at BIGINT NOT NULL,
                        completed_at BIGINT
                    );
                    CREATE INDEX IF NOT EXISTS idx_rep_job ON mineintel_generated_reports (job_id);
                    CREATE INDEX IF NOT EXISTS idx_rep_owner ON mineintel_generated_reports (owner_id);
                """)
            conn.commit()
        _pg_rep_initialized = True
    except Exception as e:
        logger.warning(f"PostgreSQL report schema init error: {e}")


def _load_local_store() -> Dict[str, Any]:
    if not REPORTS_META_FILE.exists():
        return {"reports": {}}
    try:
        data = json.loads(REPORTS_META_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"reports": {}}
        data.setdefault("reports", {})
        return data
    except Exception as e:
        logger.warning(f"Failed to load report generator store {REPORTS_META_FILE}: {e}")
        return {"reports": {}}


def _atomic_write_local_store(data: Dict[str, Any]) -> None:
    try:
        REPORTS_META_FILE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=str(REPORTS_META_FILE.parent), delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, str(REPORTS_META_FILE))
    except Exception as e:
        logger.warning(f"Atomic report store write error: {e}")
        try:
            REPORTS_META_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            pass


def save_report(report_dict: Dict[str, Any]) -> None:
    """Saves report metadata and generation status to Neon or local fallback."""
    report_id = report_dict.get("report_id")
    plan_id = report_dict.get("plan_id")
    job_id = report_dict.get("job_id")
    owner_id = report_dict.get("owner_id")
    status = report_dict.get("status", "pending")
    title = report_dict.get("title", "Report")
    page_count = int(report_dict.get("page_count", 0))
    pdf_path = report_dict.get("pdf_path", "")
    docx_path = report_dict.get("docx_path")
    md_path = report_dict.get("md_path")
    now_ms = int(time.time() * 1000)
    completed_at = report_dict.get("completed_at")

    if is_postgres_configured():
        try:
            init_report_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO mineintel_generated_reports
                        (report_id, plan_id, job_id, owner_id, status, title, page_count, pdf_path, docx_path, md_path, report_data, created_at, completed_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (report_id) DO UPDATE SET
                            status = EXCLUDED.status,
                            title = EXCLUDED.title,
                            page_count = EXCLUDED.page_count,
                            pdf_path = EXCLUDED.pdf_path,
                            docx_path = EXCLUDED.docx_path,
                            md_path = EXCLUDED.md_path,
                            report_data = EXCLUDED.report_data,
                            completed_at = EXCLUDED.completed_at;
                    """, (
                        report_id,
                        plan_id,
                        job_id,
                        owner_id,
                        status,
                        title,
                        page_count,
                        pdf_path,
                        docx_path,
                        md_path,
                        json.dumps(report_dict),
                        report_dict.get("created_at") or now_ms,
                        completed_at
                    ))
                conn.commit()
            return
        except Exception as e:
            logger.warning(f"PostgreSQL save_report error, falling back to local: {e}")

    store = _load_local_store()
    store["reports"][report_id] = report_dict
    _atomic_write_local_store(store)


def get_report(report_id: str, owner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves generated report metadata by report_id, enforcing ownership if provided."""
    if is_postgres_configured():
        try:
            init_report_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT report_data FROM mineintel_generated_reports WHERE report_id = %s AND owner_id = %s LIMIT 1;",
                            (report_id, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT report_data FROM mineintel_generated_reports WHERE report_id = %s LIMIT 1;",
                            (report_id,)
                        )
                    row = cur.fetchone()
                    if row:
                        val = row[0]
                        return json.loads(val) if isinstance(val, str) else val
            return None
        except Exception as e:
            logger.warning(f"PostgreSQL get_report error, falling back to local: {e}")

    store = _load_local_store()
    r = store["reports"].get(report_id)
    if not r:
        return None
    if owner_id and r.get("owner_id") != owner_id:
        return None
    return r


def list_reports_for_job(job_id: str, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lists all generated reports for a specific ingestion job."""
    if is_postgres_configured():
        try:
            init_report_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT report_data FROM mineintel_generated_reports WHERE job_id = %s AND owner_id = %s ORDER BY created_at DESC;",
                            (job_id, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT report_data FROM mineintel_generated_reports WHERE job_id = %s ORDER BY created_at DESC;",
                            (job_id,)
                        )
                    rows = cur.fetchall()
                    return [json.loads(r[0]) if isinstance(r[0], str) else r[0] for r in rows]
        except Exception as e:
            logger.warning(f"PostgreSQL list_reports error, falling back to local: {e}")

    store = _load_local_store()
    matched = [
        r for r in store["reports"].values()
        if r.get("job_id") == job_id and (not owner_id or r.get("owner_id") == owner_id)
    ]
    matched.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return matched
