"""
MineIntel Agent State Persistence Store

Provides:
- PostgreSQL persistence for AgentTaskState records in Neon
- JSONB structured state persistence
- Strict owner_id isolation
- Single Agent store interface used by the API/coordinator

No SQLite.
No local JSON fallback.
No in-memory persistence fallback.
"""

import json
import logging
import time
from typing import Any, Dict, Optional

from backend import config
from backend.services.agent.agent_models import AgentTaskState

logger = logging.getLogger("mineintel.agent_store")

_pg_agent_initialized = False


def is_postgres_configured() -> bool:
    """Return True only when PostgreSQL is configured."""
    return bool(config.get_database_url().strip())


def _get_pg_connection():
    """Create a PostgreSQL connection with Neon SSL support."""
    import psycopg2

    db_url = config.get_database_url().strip()

    if not db_url:
        raise ValueError("DATABASE_URL is not configured.")

    if (
        "sslmode=" not in db_url
        and (
            "neon.tech" in db_url
            or "aws" in db_url
            or "render.com" in db_url
        )
    ):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"

    return psycopg2.connect(db_url, connect_timeout=10)


def init_agent_schema() -> None:
    """Create the Agent state table/indexes when required."""
    global _pg_agent_initialized

    if _pg_agent_initialized:
        return

    if not is_postgres_configured():
        raise RuntimeError("PostgreSQL is not configured.")

    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
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
                    """
                )

            conn.commit()

        _pg_agent_initialized = True
        logger.info("Neon/PostgreSQL Agent state schema initialized.")

    except Exception:
        logger.exception("PostgreSQL Agent state schema initialization failed.")
        raise


# -------------------------------------------------------------------------
# INTERNAL SERIALIZATION
# -------------------------------------------------------------------------

def _state_to_dict(state: AgentTaskState) -> Dict[str, Any]:
    """Convert AgentTaskState into a persistence-safe dictionary."""
    if hasattr(state, "model_dump"):
        return state.model_dump()
    return state.dict()


def _json_value(value: Any, default: Any) -> Any:
    """Normalize PostgreSQL JSONB values returned as dict/list/string."""
    if value is None:
        return default

    if isinstance(value, (dict, list)):
        return value

    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default

    return default


def _row_to_state(row) -> AgentTaskState:
    """Convert a PostgreSQL row into AgentTaskState."""
    return AgentTaskState(
        job_id=row[0],
        owner_id=row[1],
        status=row[2],
        structured_state=_json_value(row[3], {}),
        evidence_references=_json_value(row[4], []),
        conflict_logs=_json_value(row[5], []),
        execution_history=_json_value(row[6], []),
        created_at=row[7],
        updated_at=row[8],
    )


# -------------------------------------------------------------------------
# LOW-LEVEL STATE PERSISTENCE
# -------------------------------------------------------------------------

def save_agent_state(state_dict: Dict[str, Any]) -> None:
    """
    Insert or update an AgentTaskState.

    owner_id is mandatory and is persisted with the state.
    """
    job_id = state_dict.get("job_id")
    owner_id = state_dict.get("owner_id")

    if not job_id:
        raise ValueError("job_id is required.")

    if not owner_id:
        raise ValueError("owner_id is required.")

    if not is_postgres_configured():
        raise RuntimeError("PostgreSQL is not configured.")

    now = int(time.time() * 1000)

    if not state_dict.get("created_at"):
        state_dict["created_at"] = now

    state_dict["updated_at"] = now

    init_agent_schema()

    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO mineintel_agent_state (
                    job_id,
                    owner_id,
                    status,
                    structured_state,
                    evidence_references,
                    conflict_logs,
                    execution_history,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s::jsonb,
                    %s::jsonb,
                    %s::jsonb,
                    %s::jsonb,
                    %s,
                    %s
                )
                ON CONFLICT (job_id)
                DO UPDATE SET
                    owner_id = EXCLUDED.owner_id,
                    status = EXCLUDED.status,
                    structured_state = EXCLUDED.structured_state,
                    evidence_references = EXCLUDED.evidence_references,
                    conflict_logs = EXCLUDED.conflict_logs,
                    execution_history = EXCLUDED.execution_history,
                    updated_at = EXCLUDED.updated_at;
                """,
                (
                    job_id,
                    owner_id,
                    state_dict.get("status"),
                    json.dumps(state_dict.get("structured_state", {})),
                    json.dumps(state_dict.get("evidence_references", [])),
                    json.dumps(state_dict.get("conflict_logs", [])),
                    json.dumps(state_dict.get("execution_history", [])),
                    state_dict.get("created_at"),
                    state_dict.get("updated_at"),
                ),
            )

        conn.commit()


def get_agent_state(
    job_id: str,
    owner_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Retrieve Agent state using BOTH job_id and owner_id.

    This is the primary ownership isolation boundary.
    """
    if not job_id:
        raise ValueError("job_id is required.")

    if not owner_id:
        raise ValueError("owner_id is required.")

    if not is_postgres_configured():
        raise RuntimeError("PostgreSQL is not configured.")

    init_agent_schema()

    with _get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    job_id,
                    owner_id,
                    status,
                    structured_state,
                    evidence_references,
                    conflict_logs,
                    execution_history,
                    created_at,
                    updated_at
                FROM mineintel_agent_state
                WHERE job_id = %s
                  AND owner_id = %s;
                """,
                (job_id, owner_id),
            )

            row = cur.fetchone()

            if not row:
                return None

            state = _row_to_state(row)
            return _state_to_dict(state)


# -------------------------------------------------------------------------
# PUBLIC AGENT STORE API
# -------------------------------------------------------------------------

class AgentStore:
    """
    Single persistence interface used by Agent API/coordinator.

    All operations are backed by Neon PostgreSQL.
    """

    def create_task(
        self,
        owner_id: str,
        job_id: str,
        instruction: str,
    ) -> AgentTaskState:
        """
        Create a new Agent task.

        The authenticated owner_id must be supplied by the backend.
        """
        if not owner_id:
            raise ValueError("owner_id is required.")

        if not job_id:
            raise ValueError("job_id is required.")

        if not instruction:
            raise ValueError("instruction is required.")

        existing = get_agent_state(job_id, owner_id)

        if existing is not None:
            raise ValueError(
                f"Agent task already exists for job_id '{job_id}'."
            )

        now = int(time.time() * 1000)

        state = AgentTaskState(
            job_id=job_id,
            owner_id=owner_id,
            status="PENDING",
            structured_state={
                "instruction": instruction,
            },
            evidence_references=[],
            conflict_logs=[],
            execution_history=[],
            created_at=now,
            updated_at=now,
        )

        save_agent_state(_state_to_dict(state))

        return state

    def get_task(
        self,
        job_id: str,
        owner_id: str,
    ) -> Optional[AgentTaskState]:
        """
        Retrieve a task.

        owner_id is mandatory so callers cannot perform an
        owner-agnostic lookup.
        """
        state = get_agent_state(job_id, owner_id)

        if state is None:
            return None

        return AgentTaskState(**state)

    def update_task(
        self,
        task: AgentTaskState,
    ) -> AgentTaskState:
        """Persist the complete updated Agent task state."""
        save_agent_state(_state_to_dict(task))
        return task

    def update_task_state(
        self,
        job_id: str,
        owner_id: str,
        status,
        **updates: Any,
    ) -> Optional[AgentTaskState]:
        """
        Update a task while preserving owner isolation.
        """
        task = self.get_task(job_id, owner_id)

        if task is None:
            return None

        task.status = status

        for key, value in updates.items():
            if hasattr(task, key):
                setattr(task, key, value)

        self.update_task(task)

        return task


# -------------------------------------------------------------------------
# SINGLETON STORE
# -------------------------------------------------------------------------

_agent_store: Optional[AgentStore] = None


def get_agent_store() -> AgentStore:
    """
    Return the single AgentStore instance.

    Persistence itself remains PostgreSQL-backed; this singleton is
    only the Python service object and is NOT a data store.
    """
    global _agent_store

    if _agent_store is None:
        _agent_store = AgentStore()

    return _agent_store
