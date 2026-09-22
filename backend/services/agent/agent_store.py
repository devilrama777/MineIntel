"""
MineIntel Phase 1: Agent State Persistence Store
Provides:
- PostgreSQL persistence for AgentTaskState records in Neon (mineintel_agent_state)
- STRICT Neon PostgreSQL JSONB only (no local JSON fallback)
"""
import json
import logging
import time
from typing import Any, Dict, Optional

from backend import config

logger = logging.getLogger("mineintel.agent_store")

_pg_agent_initialized = False


def is_postgres_configured() -> bool:
    """Checks if a PostgreSQL connection string is configured in the environment."""
    return bool(config.get_database_url().strip())


def _get_pg_connection():
    """Returns a psycopg2 connection using DATABASE_URL with SSL support for Neon."""
    import psycopg2
    db_url = config.get_database_url().strip()
    if not db_url:
        raise ValueError("DATABASE_URL is not configured.")
    if "sslmode=" not in db_url and ("neon.tech" in db_url or "aws" in db_url or "render.com" in db_url):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"
    return psycopg2.connect(db_url, connect_timeout=10)


def init_agent_schema() -> None:
    """Initializes PostgreSQL table for agent state if not already initialized."""
    global _pg_agent_initialized
    if _pg_agent_initialized:
        return
    if not is_postgres_configured():
        logger.warning("PostgreSQL is not configured. Agent state persistence will fail.")
        return

    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mineintel_agent_state (
                        job_id VARCHAR(128) PRIMARY KEY,
                        owner_id VARCHAR(128) NOT NULL,
                        status VARCHAR(32) NOT NULL,
                        structured_state JSONB,
                        evidence_references JSONB,
                        conflict_logs JSONB,
                        execution_history JSONB,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_agent_state_owner 
                    ON mineintel_agent_state (owner_id);
                    CREATE INDEX IF NOT EXISTS idx_agent_state_status 
                    ON mineintel_agent_state (status);
                """)
            conn.commit()
        _pg_agent_initialized = True
        logger.info("Neon/PostgreSQL agent state schema initialized.")
    except Exception as e:
        logger.error(f"PostgreSQL agent state schema initialization failed: {e}")
        raise


# -------------------------------------------------------------------------
# CRUD & QUERY METHODS
# -------------------------------------------------------------------------
def save_agent_state(state_dict: Dict[str, Any]) -> None:
    """Saves or updates an AgentTaskState record in Neon PostgreSQL."""
    job_id = state_dict.get("job_id")
    owner_id = state_dict.get("owner_id")
    if not job_id or not owner_id:
        raise ValueError("job_id and owner_id are strictly required to save agent state.")

    now = int(time.time() * 1000)
    if not state_dict.get("created_at"):
        state_dict["created_at"] = now
    state_dict["updated_at"] = now

    if not is_postgres_configured():
        logger.error("Cannot save agent state: PostgreSQL is not configured.")
        raise RuntimeError("PostgreSQL is not configured.")

    init_agent_schema()
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO mineintel_agent_state
                    (job_id, owner_id, status, structured_state, evidence_references, conflict_logs, execution_history, created_at, updated_at)
                    VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s)
                    ON CONFLICT (job_id) DO UPDATE SET
                        owner_id = EXCLUDED.owner_id,
                        status = EXCLUDED.status,
                        structured_state = EXCLUDED.structured_state,
                        evidence_references = EXCLUDED.evidence_references,
                        conflict_logs = EXCLUDED.conflict_logs,
                        execution_history = EXCLUDED.execution_history,
                        updated_at = EXCLUDED.updated_at;
                """, (
                    job_id,
                    owner_id,
                    state_dict.get("status"),
                    json.dumps(state_dict.get("structured_state", {})),
                    json.dumps(state_dict.get("evidence_references", [])),
                    json.dumps(state_dict.get("conflict_logs", [])),
                    json.dumps(state_dict.get("execution_history", [])),
                    state_dict.get("created_at"),
                    state_dict.get("updated_at")
                ))
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to persist agent state to PostgreSQL: {e}")
        raise


def get_agent_state(job_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves an agent state item by job_id, strictly scoped by owner_id from Neon PostgreSQL."""
    if not is_postgres_configured():
        logger.error("Cannot get agent state: PostgreSQL is not configured.")
        return None

    init_agent_schema()
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT job_id, owner_id, status, structured_state, evidence_references, conflict_logs, execution_history, created_at, updated_at
                    FROM mineintel_agent_state WHERE job_id = %s AND owner_id = %s;
                """, (job_id, owner_id))
                row = cur.fetchone()
                if row:
                    return {
                        "job_id": row[0],
                        "owner_id": row[1],
                        "status": row[2],
                        "structured_state": row[3] if isinstance(row[3], dict) else (json.loads(row[3]) if row[3] else {}),
                        "evidence_references": row[4] if isinstance(row[4], list) else (json.loads(row[4]) if row[4] else []),
                        "conflict_logs": row[5] if isinstance(row[5], list) else (json.loads(row[5]) if row[5] else []),
                        "execution_history": row[6] if isinstance(row[6], list) else (json.loads(row[6]) if row[6] else []),
                        "created_at": row[7],
                        "updated_at": row[8]
                    }
    except Exception as e:
        logger.error(f"Failed to query agent state {job_id} from PostgreSQL: {e}")
        raise
    
    return None
