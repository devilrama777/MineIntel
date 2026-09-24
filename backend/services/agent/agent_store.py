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
                        task_id VARCHAR(128) PRIMARY KEY,
                        owner_id VARCHAR(128) NOT NULL,
                        status VARCHAR(32) NOT NULL,
                        structured_state JSONB,
                        evidence_references JSONB,
                        conflict_logs JSONB,
                        execution_history JSONB,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL
                    );
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'mineintel_agent_state' AND column_name = 'job_id'
                        ) THEN
                            ALTER TABLE mineintel_agent_state RENAME COLUMN job_id TO task_id;
                        END IF;
                    END $$;
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
def create_task(state_dict: Dict[str, Any]) -> None:
    """Saves a new AgentTaskState record in Neon PostgreSQL."""
    _save_or_update(state_dict)


def update_task_state(state_dict: Dict[str, Any]) -> None:
    """Updates an existing AgentTaskState record in Neon PostgreSQL."""
    _save_or_update(state_dict)


def _save_or_update(state_dict: Dict[str, Any]) -> None:
    task_id = state_dict.get("task_id")
    owner_id = state_dict.get("owner_id")
    if not task_id or not owner_id:
        raise ValueError("task_id and owner_id are strictly required to save agent state.")

    now = int(time.time() * 1000)
    if not state_dict.get("created_at"):
        state_dict["created_at"] = now
    state_dict["updated_at"] = now

    # Mirror top-level lifecycle fields into structured_state for complete JSONB persistence
    ss = state_dict.get("structured_state") or {}
    if state_dict.get("started_at") and "started_at" not in ss:
        ss["started_at"] = state_dict.get("started_at")
    if state_dict.get("heartbeat_at"):
        ss["heartbeat_at"] = state_dict.get("heartbeat_at")
    if state_dict.get("error"):
        err_val = state_dict.get("error")
        ss["error"] = err_val.model_dump() if hasattr(err_val, "model_dump") else err_val
    state_dict["structured_state"] = ss

    if not is_postgres_configured():
        logger.error("Cannot save agent state: PostgreSQL is not configured.")
        raise RuntimeError("PostgreSQL is not configured.")

    init_agent_schema()
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO mineintel_agent_state
                    (task_id, owner_id, status, structured_state, evidence_references, conflict_logs, execution_history, created_at, updated_at)
                    VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s)
                    ON CONFLICT (task_id) DO UPDATE SET
                        owner_id = EXCLUDED.owner_id,
                        status = EXCLUDED.status,
                        structured_state = EXCLUDED.structured_state,
                        evidence_references = EXCLUDED.evidence_references,
                        conflict_logs = EXCLUDED.conflict_logs,
                        execution_history = EXCLUDED.execution_history,
                        updated_at = EXCLUDED.updated_at;
                """, (
                    task_id,
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


def get_task(task_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves an agent state item by task_id, strictly scoped by owner_id from Neon PostgreSQL."""
    if not is_postgres_configured():
        logger.error("Cannot get agent state: PostgreSQL is not configured.")
        return None

    init_agent_schema()
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT task_id, owner_id, status, structured_state, evidence_references, conflict_logs, execution_history, created_at, updated_at
                    FROM mineintel_agent_state WHERE task_id = %s AND owner_id = %s;
                """, (task_id, owner_id))
                row = cur.fetchone()
                if row:
                    return {
                        "task_id": row[0],
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
        logger.error(f"Failed to query agent state {task_id} from PostgreSQL: {e}")
        raise
    
    return None


def list_tasks(owner_id: str) -> list:
    """Lists agent tasks strictly scoped by owner_id from Neon PostgreSQL."""
    if not is_postgres_configured():
        logger.error("Cannot list agent state: PostgreSQL is not configured.")
        return []

    init_agent_schema()
    tasks = []
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT task_id, owner_id, status, structured_state, evidence_references, conflict_logs, execution_history, created_at, updated_at
                    FROM mineintel_agent_state WHERE owner_id = %s ORDER BY created_at DESC;
                """, (owner_id,))
                rows = cur.fetchall()
                for row in rows:
                    tasks.append({
                        "task_id": row[0],
                        "owner_id": row[1],
                        "status": row[2],
                        "structured_state": row[3] if isinstance(row[3], dict) else (json.loads(row[3]) if row[3] else {}),
                        "evidence_references": row[4] if isinstance(row[4], list) else (json.loads(row[4]) if row[4] else []),
                        "conflict_logs": row[5] if isinstance(row[5], list) else (json.loads(row[5]) if row[5] else []),
                        "execution_history": row[6] if isinstance(row[6], list) else (json.loads(row[6]) if row[6] else []),
                        "created_at": row[7],
                        "updated_at": row[8]
                    })
    except Exception as e:
        logger.error(f"Failed to query agent states for owner {owner_id} from PostgreSQL: {e}")
        raise
    
    return tasks


def get_active_task_for_job(owner_id: str, job_id: str) -> Optional[Dict[str, Any]]:
    """
    Checks for an existing active non-terminal task for this owner and job_id.
    Prevents duplicate Agent execution.
    """
    if not is_postgres_configured():
        return None

    init_agent_schema()
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT task_id, owner_id, status, structured_state, evidence_references, conflict_logs, execution_history, created_at, updated_at
                    FROM mineintel_agent_state 
                    WHERE owner_id = %s 
                      AND (task_id = %s OR structured_state->>'job_id' = %s)
                      AND status IN ('PENDING', 'RUNNING', 'VALIDATING', 'RETRYING')
                    ORDER BY created_at DESC
                    LIMIT 1;
                """, (owner_id, job_id, job_id))
                row = cur.fetchone()
                if row:
                    return {
                        "task_id": row[0],
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
        logger.warning(f"Error querying active task for job {job_id}: {e}")

    return None

