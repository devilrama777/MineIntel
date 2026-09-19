"""
MineIntel Phase 9: User-Specific Learning Persistence Store (Neon PostgreSQL + Local JSON Fallback)

Persists learning events, feedback signals, and user-isolated preference profiles.
Guarantees zero cross-user leakage and provides lifecycle deletion support.
"""

import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend import config

logger = logging.getLogger("mineintel.learning_store")

EVENTS_FILE = config.DATA_DIR / "learning_events.json"
PROFILES_FILE = config.DATA_DIR / "user_profiles.json"
_pg_learning_initialized = False


def is_postgres_configured() -> bool:
    return bool(config.get_database_url().strip())


def _get_pg_connection():
    import psycopg2
    db_url = config.get_database_url().strip()
    if "sslmode=" not in db_url and ("neon.tech" in db_url or "aws" in db_url or "render.com" in db_url):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"
    return psycopg2.connect(db_url, connect_timeout=10)


def init_learning_schema() -> None:
    global _pg_learning_initialized
    if _pg_learning_initialized:
        return
    if not is_postgres_configured():
        return
    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mineintel_learning_events (
                        event_id VARCHAR(128) PRIMARY KEY,
                        user_id VARCHAR(128) NOT NULL,
                        job_id VARCHAR(128) NOT NULL,
                        report_id VARCHAR(128) NOT NULL,
                        event_type VARCHAR(64) NOT NULL,
                        event_data JSONB NOT NULL,
                        created_at BIGINT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_learn_user ON mineintel_learning_events (user_id);
                    CREATE INDEX IF NOT EXISTS idx_learn_report ON mineintel_learning_events (report_id);

                    CREATE TABLE IF NOT EXISTS mineintel_user_preferences (
                        user_id VARCHAR(128) PRIMARY KEY,
                        profile_data JSONB NOT NULL,
                        updated_at BIGINT NOT NULL
                    );
                """)
            conn.commit()
        _pg_learning_initialized = True
    except Exception as e:
        logger.warning(f"PostgreSQL learning schema init error: {e}")


def _load_local_events() -> Dict[str, Any]:
    if not EVENTS_FILE.exists():
        return {"events": {}}
    try:
        data = json.loads(EVENTS_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"events": {}}
        data.setdefault("events", {})
        return data
    except Exception as e:
        logger.warning(f"Error loading events file {EVENTS_FILE}: {e}")
        return {"events": {}}


def _atomic_write_local_events(data: Dict[str, Any]) -> None:
    try:
        EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=str(EVENTS_FILE.parent), delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, str(EVENTS_FILE))
    except Exception as e:
        logger.warning(f"Atomic events write error: {e}")


def _load_local_profiles() -> Dict[str, Any]:
    if not PROFILES_FILE.exists():
        return {"profiles": {}}
    try:
        data = json.loads(PROFILES_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"profiles": {}}
        data.setdefault("profiles", {})
        return data
    except Exception as e:
        logger.warning(f"Error loading profiles file {PROFILES_FILE}: {e}")
        return {"profiles": {}}


def _atomic_write_local_profiles(data: Dict[str, Any]) -> None:
    try:
        PROFILES_FILE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=str(PROFILES_FILE.parent), delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, str(PROFILES_FILE))
    except Exception as e:
        logger.warning(f"Atomic profiles write error: {e}")


def save_learning_event(event_dict: Dict[str, Any]) -> None:
    """Saves learning feedback event strictly tagged with user_id."""
    event_id = event_dict.get("event_id")
    user_id = event_dict.get("user_id")
    job_id = event_dict.get("job_id", "")
    report_id = event_dict.get("report_id", "")
    event_type = event_dict.get("event_type", "section_edit")
    created_at = event_dict.get("created_at") or int(time.time() * 1000)

    if is_postgres_configured():
        try:
            init_learning_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO mineintel_learning_events
                        (event_id, user_id, job_id, report_id, event_type, event_data, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (event_id) DO NOTHING;
                    """, (
                        event_id,
                        user_id,
                        job_id,
                        report_id,
                        event_type,
                        json.dumps(event_dict),
                        created_at
                    ))
                conn.commit()
            return
        except Exception as e:
            logger.warning(f"PostgreSQL save_learning_event error, falling back to local: {e}")

    store = _load_local_events()
    store["events"][event_id] = event_dict
    _atomic_write_local_events(store)


def list_events_for_user(user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Lists feedback events exclusively belonging to user_id (never leaked)."""
    if is_postgres_configured():
        try:
            init_learning_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT event_data FROM mineintel_learning_events
                        WHERE user_id = %s
                        ORDER BY created_at DESC
                        LIMIT %s;
                    """, (user_id, limit))
                    rows = cur.fetchall()
                    return [json.loads(r[0]) if isinstance(r[0], str) else r[0] for r in rows]
        except Exception as e:
            logger.warning(f"PostgreSQL list_events error, falling back to local: {e}")

    store = _load_local_events()
    user_events = [
        ev for ev in store["events"].values()
        if ev.get("user_id") == user_id
    ]
    user_events.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return user_events[:limit]


def save_user_profile(profile_dict: Dict[str, Any]) -> None:
    """Saves user-specific learning profile into Neon or local store."""
    user_id = profile_dict.get("user_id")
    now_ms = int(time.time() * 1000)
    updated_at = profile_dict.get("updated_at") or now_ms

    if is_postgres_configured():
        try:
            init_learning_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO mineintel_user_preferences
                        (user_id, profile_data, updated_at)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (user_id) DO UPDATE SET
                            profile_data = EXCLUDED.profile_data,
                            updated_at = EXCLUDED.updated_at;
                    """, (
                        user_id,
                        json.dumps(profile_dict),
                        updated_at
                    ))
                conn.commit()
            return
        except Exception as e:
            logger.warning(f"PostgreSQL save_user_profile error, falling back to local: {e}")

    store = _load_local_profiles()
    store["profiles"][user_id] = profile_dict
    _atomic_write_local_profiles(store)


def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves user learning profile strictly for user_id."""
    if is_postgres_configured():
        try:
            init_learning_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT profile_data FROM mineintel_user_preferences WHERE user_id = %s LIMIT 1;",
                        (user_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        val = row[0]
                        return json.loads(val) if isinstance(val, str) else val
            return None
        except Exception as e:
            logger.warning(f"PostgreSQL get_user_profile error, falling back to local: {e}")

    store = _load_local_profiles()
    return store["profiles"].get(user_id)


def delete_user_learning_data(user_id: str) -> bool:
    """
    Deletes all learning events and preference profiles belonging to user_id.
    Fulfills Phase 0 ownership lifecycle cleanup.
    """
    deleted = False
    if is_postgres_configured():
        try:
            init_learning_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM mineintel_learning_events WHERE user_id = %s;", (user_id,))
                    cur.execute("DELETE FROM mineintel_user_preferences WHERE user_id = %s;", (user_id,))
                conn.commit()
            deleted = True
        except Exception as e:
            logger.warning(f"PostgreSQL delete_user_learning_data error: {e}")

    # Also clean local store
    events_store = _load_local_events()
    to_del_events = [k for k, v in events_store["events"].items() if v.get("user_id") == user_id]
    for k in to_del_events:
        del events_store["events"][k]
    if to_del_events:
        _atomic_write_local_events(events_store)
        deleted = True

    profiles_store = _load_local_profiles()
    if user_id in profiles_store["profiles"]:
        del profiles_store["profiles"][user_id]
        _atomic_write_local_profiles(profiles_store)
        deleted = True

    return deleted
