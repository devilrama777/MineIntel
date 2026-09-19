"""
MineIntel Phase 5: Chart Persistence Store (Neon PostgreSQL + Local JSON Fallback)

Provides persistence for:
- Rendered chart artifacts, configs, deterministic calculations, and source evidence provenance
- Enforces Phase 0 user/job ownership isolation
"""

import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend import config

logger = logging.getLogger("mineintel.chart_store")

CHARTS_FILE = config.DATA_DIR / "charts_store.json"
_pg_charts_initialized = False


def is_postgres_configured() -> bool:
    return bool(config.get_database_url().strip())


def _get_pg_connection():
    import psycopg2
    db_url = config.get_database_url().strip()
    if "sslmode=" not in db_url and ("neon.tech" in db_url or "aws" in db_url or "render.com" in db_url):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"
    return psycopg2.connect(db_url, connect_timeout=10)


def init_chart_schema() -> None:
    global _pg_charts_initialized
    if _pg_charts_initialized:
        return
    if not is_postgres_configured():
        return
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mineintel_charts (
                        chart_id VARCHAR(128) PRIMARY KEY,
                        job_id VARCHAR(128) NOT NULL,
                        owner_id VARCHAR(128) NOT NULL,
                        chart_type VARCHAR(64) NOT NULL,
                        title TEXT NOT NULL,
                        png_path TEXT NOT NULL,
                        svg_path TEXT,
                        chart_data JSONB NOT NULL,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_charts_job ON mineintel_charts (job_id);
                    CREATE INDEX IF NOT EXISTS idx_charts_owner ON mineintel_charts (owner_id);
                """)
            conn.commit()
        _pg_charts_initialized = True
    except Exception as e:
        logger.warning(f"PostgreSQL chart schema init error: {e}")


def _load_local_store() -> Dict[str, Any]:
    if not CHARTS_FILE.exists():
        return {"charts": {}}
    try:
        data = json.loads(CHARTS_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"charts": {}}
        data.setdefault("charts", {})
        return data
    except Exception as e:
        logger.warning(f"Failed to load charts store {CHARTS_FILE}: {e}")
        return {"charts": {}}


def _atomic_write_local_store(data: Dict[str, Any]) -> None:
    try:
        CHARTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=str(CHARTS_FILE.parent), delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, str(CHARTS_FILE))
    except Exception as e:
        logger.warning(f"Atomic chart store write error: {e}")
        try:
            CHARTS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            pass


def save_chart(chart_dict: Dict[str, Any]) -> None:
    """Saves rendered chart artifact and configuration to Neon or local fallback."""
    chart_id = chart_dict.get("chart_id")
    job_id = chart_dict.get("job_id")
    owner_id = chart_dict.get("owner_id")
    cfg = chart_dict.get("config") or {}
    chart_type = cfg.get("chart_type", "bar")
    title = cfg.get("title", "Chart")
    png_path = chart_dict.get("png_path", "")
    svg_path = chart_dict.get("svg_path")
    now_ms = int(time.time() * 1000)

    if is_postgres_configured():
        try:
            init_chart_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO mineintel_charts
                        (chart_id, job_id, owner_id, chart_type, title, png_path, svg_path, chart_data, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (chart_id) DO UPDATE SET
                            title = EXCLUDED.title,
                            png_path = EXCLUDED.png_path,
                            svg_path = EXCLUDED.svg_path,
                            chart_data = EXCLUDED.chart_data,
                            updated_at = EXCLUDED.updated_at;
                    """, (
                        chart_id,
                        job_id,
                        owner_id,
                        chart_type,
                        title,
                        png_path,
                        svg_path,
                        json.dumps(chart_dict),
                        now_ms,
                        now_ms
                    ))
                conn.commit()
            return
        except Exception as e:
            logger.warning(f"PostgreSQL chart save error, falling back to local: {e}")

    # Local fallback
    store = _load_local_store()
    store["charts"][chart_id] = chart_dict
    _atomic_write_local_store(store)


def get_chart(chart_id: str, owner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves chart artifact by chart_id with optional ownership enforcement."""
    if is_postgres_configured():
        try:
            init_chart_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT chart_data FROM mineintel_charts WHERE chart_id = %s AND owner_id = %s LIMIT 1;",
                            (chart_id, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT chart_data FROM mineintel_charts WHERE chart_id = %s LIMIT 1;",
                            (chart_id,)
                        )
                    row = cur.fetchone()
                    if row:
                        val = row[0]
                        return json.loads(val) if isinstance(val, str) else val
            return None
        except Exception as e:
            logger.warning(f"PostgreSQL get_chart error, falling back to local: {e}")

    store = _load_local_store()
    c = store["charts"].get(chart_id)
    if not c:
        return None
    if owner_id and c.get("owner_id") != owner_id:
        return None
    return c


def list_charts_for_job(job_id: str, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lists all charts generated for a specific ingestion job."""
    if is_postgres_configured():
        try:
            init_chart_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT chart_data FROM mineintel_charts WHERE job_id = %s AND owner_id = %s ORDER BY created_at ASC;",
                            (job_id, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT chart_data FROM mineintel_charts WHERE job_id = %s ORDER BY created_at ASC;",
                            (job_id,)
                        )
                    rows = cur.fetchall()
                    return [json.loads(r[0]) if isinstance(r[0], str) else r[0] for r in rows]
        except Exception as e:
            logger.warning(f"PostgreSQL list_charts error, falling back to local: {e}")

    store = _load_local_store()
    res = []
    for c in store["charts"].values():
        if c.get("job_id") == job_id:
            if not owner_id or c.get("owner_id") == owner_id:
                res.append(c)
    return res


def delete_chart(chart_id: str, owner_id: Optional[str] = None) -> bool:
    """Deletes chart record and its rendered image files."""
    chart = get_chart(chart_id, owner_id=owner_id)
    if not chart:
        return False

    # Remove physical files if they exist
    png_path = chart.get("png_path")
    if png_path and Path(png_path).exists():
        try:
            Path(png_path).unlink()
        except Exception:
            pass

    svg_path = chart.get("svg_path")
    if svg_path and Path(svg_path).exists():
        try:
            Path(svg_path).unlink()
        except Exception:
            pass

    if is_postgres_configured():
        try:
            init_chart_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute("DELETE FROM mineintel_charts WHERE chart_id = %s AND owner_id = %s;", (chart_id, owner_id))
                    else:
                        cur.execute("DELETE FROM mineintel_charts WHERE chart_id = %s;", (chart_id,))
                conn.commit()
            return True
        except Exception as e:
            logger.warning(f"PostgreSQL delete_chart error, falling back to local: {e}")

    store = _load_local_store()
    if chart_id in store["charts"]:
        del store["charts"][chart_id]
        _atomic_write_local_store(store)
        return True
    return False
