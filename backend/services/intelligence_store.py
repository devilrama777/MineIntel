"""
MineIntel Phase 4: Intelligence Persistence Store (Neon PostgreSQL + Local JSON Fallback)

Provides persistence for:
- Organized Evidence Dossiers (topics, chronology, duplicate clusters, deduplicated items)
- Flagged Conflicts and Auditor Resolution states
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

logger = logging.getLogger("mineintel.intelligence_store")

INTELLIGENCE_FILE = config.DATA_DIR / "intelligence_store.json"
_pg_intelligence_initialized = False


def is_postgres_configured() -> bool:
    return bool(config.get_database_url().strip())


def _get_pg_connection():
    import psycopg2
    db_url = config.get_database_url().strip()
    if "sslmode=" not in db_url and ("neon.tech" in db_url or "aws" in db_url or "render.com" in db_url):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"
    return psycopg2.connect(db_url, connect_timeout=10)


def init_intelligence_schema() -> None:
    global _pg_intelligence_initialized
    if _pg_intelligence_initialized:
        return
    if not is_postgres_configured():
        return
    try:
        import psycopg2
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mineintel_intelligence_dossiers (
                        job_id VARCHAR(128) PRIMARY KEY,
                        owner_id VARCHAR(128) NOT NULL,
                        total_source_items INT NOT NULL DEFAULT 0,
                        deduplicated_items_count INT NOT NULL DEFAULT 0,
                        dossier_data JSONB NOT NULL,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_intel_dossier_owner ON mineintel_intelligence_dossiers (owner_id);

                    CREATE TABLE IF NOT EXISTS mineintel_conflicts (
                        conflict_id VARCHAR(128) PRIMARY KEY,
                        job_id VARCHAR(128) NOT NULL,
                        owner_id VARCHAR(128) NOT NULL,
                        conflict_type VARCHAR(64) NOT NULL,
                        severity VARCHAR(32) NOT NULL,
                        topic VARCHAR(64) NOT NULL,
                        entity_or_metric VARCHAR(128) NOT NULL,
                        status VARCHAR(32) NOT NULL DEFAULT 'flagged_for_review',
                        conflict_data JSONB NOT NULL,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_intel_conflicts_job ON mineintel_conflicts (job_id);
                    CREATE INDEX IF NOT EXISTS idx_intel_conflicts_owner ON mineintel_conflicts (owner_id);
                """)
            conn.commit()
        _pg_intelligence_initialized = True
    except Exception as e:
        logger.warning(f"PostgreSQL intelligence schema init error: {e}")


def _load_local_store() -> Dict[str, Any]:
    if not INTELLIGENCE_FILE.exists():
        return {"dossiers": {}, "conflicts": {}}
    try:
        data = json.loads(INTELLIGENCE_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"dossiers": {}, "conflicts": {}}
        data.setdefault("dossiers", {})
        data.setdefault("conflicts", {})
        return data
    except Exception as e:
        logger.warning(f"Failed to read intelligence store {INTELLIGENCE_FILE}: {e}")
        return {"dossiers": {}, "conflicts": {}}


def _atomic_write_local_store(data: Dict[str, Any]) -> None:
    try:
        INTELLIGENCE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=str(INTELLIGENCE_FILE.parent), delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, str(INTELLIGENCE_FILE))
    except Exception as e:
        logger.warning(f"Atomic intelligence store write error: {e}")
        try:
            INTELLIGENCE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            pass


def save_dossier(dossier: Dict[str, Any]) -> None:
    """Saves organized evidence dossier and its conflicts to Neon or local fallback."""
    job_id = dossier.get("job_id", "")
    owner_id = dossier.get("owner_id", "")
    now_ms = int(time.time() * 1000)

    if is_postgres_configured():
        try:
            init_intelligence_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO mineintel_intelligence_dossiers
                        (job_id, owner_id, total_source_items, deduplicated_items_count, dossier_data, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (job_id) DO UPDATE SET
                            total_source_items = EXCLUDED.total_source_items,
                            deduplicated_items_count = EXCLUDED.deduplicated_items_count,
                            dossier_data = EXCLUDED.dossier_data,
                            updated_at = EXCLUDED.updated_at
                    """, (
                        job_id,
                        owner_id,
                        dossier.get("total_source_items", 0),
                        dossier.get("deduplicated_items_count", 0),
                        json.dumps(dossier),
                        now_ms,
                        now_ms
                    ))

                    # Save conflicts
                    for conf in dossier.get("conflicts", []):
                        cur.execute("""
                            INSERT INTO mineintel_conflicts
                            (conflict_id, job_id, owner_id, conflict_type, severity, topic, entity_or_metric, status, conflict_data, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (conflict_id) DO UPDATE SET
                                status = EXCLUDED.status,
                                conflict_data = EXCLUDED.conflict_data,
                                updated_at = EXCLUDED.updated_at
                        """, (
                            conf.get("conflict_id"),
                            job_id,
                            owner_id,
                            conf.get("conflict_type", ""),
                            conf.get("severity", ""),
                            conf.get("topic", ""),
                            conf.get("entity_or_metric", ""),
                            conf.get("status", "flagged_for_review"),
                            json.dumps(conf),
                            now_ms,
                            now_ms
                        ))
                conn.commit()
            return
        except Exception as e:
            logger.warning(f"PostgreSQL dossier save error, falling back to local: {e}")

    # Local storage fallback
    store = _load_local_store()
    store["dossiers"][job_id] = dossier
    for conf in dossier.get("conflicts", []):
        c_id = conf.get("conflict_id")
        if c_id:
            store["conflicts"][c_id] = conf
    _atomic_write_local_store(store)


def get_dossier(job_id: str, owner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves organized dossier for a job, optionally enforcing ownership."""
    if is_postgres_configured():
        try:
            init_intelligence_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT dossier_data FROM mineintel_intelligence_dossiers WHERE job_id = %s AND owner_id = %s LIMIT 1",
                            (job_id, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT dossier_data FROM mineintel_intelligence_dossiers WHERE job_id = %s LIMIT 1",
                            (job_id,)
                        )
                    row = cur.fetchone()
                    if row:
                        val = row[0]
                        return json.loads(val) if isinstance(val, str) else val
            return None
        except Exception as e:
            logger.warning(f"PostgreSQL get_dossier error, falling back to local: {e}")

    store = _load_local_store()
    dossier = store["dossiers"].get(job_id)
    if not dossier:
        return None
    if owner_id and dossier.get("owner_id") != owner_id:
        return None
    return dossier


def list_conflicts(job_id: str, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lists flagged conflicts for an ingestion job."""
    if is_postgres_configured():
        try:
            init_intelligence_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute(
                            "SELECT conflict_data FROM mineintel_conflicts WHERE job_id = %s AND owner_id = %s ORDER BY created_at ASC",
                            (job_id, owner_id)
                        )
                    else:
                        cur.execute(
                            "SELECT conflict_data FROM mineintel_conflicts WHERE job_id = %s ORDER BY created_at ASC",
                            (job_id,)
                        )
                    rows = cur.fetchall()
                    return [json.loads(r[0]) if isinstance(r[0], str) else r[0] for r in rows]
        except Exception as e:
            logger.warning(f"PostgreSQL list_conflicts error, falling back to local: {e}")

    store = _load_local_store()
    res = []
    for conf in store["conflicts"].values():
        if conf.get("job_id") == job_id:
            if not owner_id or conf.get("owner_id") == owner_id:
                res.append(conf)
    return res


def update_conflict_status(
    conflict_id: str,
    status: str,
    resolution_notes: Optional[str] = None,
    owner_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Updates resolution status for a flagged conflict."""
    now_ms = int(time.time() * 1000)

    if is_postgres_configured():
        try:
            init_intelligence_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT conflict_data, owner_id FROM mineintel_conflicts WHERE conflict_id = %s LIMIT 1", (conflict_id,))
                    row = cur.fetchone()
                    if not row:
                        return None
                    conf_data, conf_owner = row
                    conf_dict = json.loads(conf_data) if isinstance(conf_data, str) else conf_data
                    if owner_id and conf_owner != owner_id:
                        return None

                    conf_dict["status"] = status
                    if resolution_notes:
                        conf_dict["resolution_notes"] = resolution_notes
                    conf_dict["resolved_at"] = now_ms

                    cur.execute("""
                        UPDATE mineintel_conflicts
                        SET status = %s, conflict_data = %s, updated_at = %s
                        WHERE conflict_id = %s
                    """, (status, json.dumps(conf_dict), now_ms, conflict_id))
                conn.commit()
                return conf_dict
        except Exception as e:
            logger.warning(f"PostgreSQL update conflict error: {e}")

    store = _load_local_store()
    conf = store["conflicts"].get(conflict_id)
    if not conf:
        return None
    if owner_id and conf.get("owner_id") != owner_id:
        return None

    conf["status"] = status
    if resolution_notes:
        conf["resolution_notes"] = resolution_notes
    conf["resolved_at"] = now_ms
    store["conflicts"][conflict_id] = conf
    _atomic_write_local_store(store)
    return conf
