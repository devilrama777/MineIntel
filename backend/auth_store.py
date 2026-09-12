"""
MineIntel Sovereign Authentication & User Store Layer (Option B with PostgreSQL & Local File Persistence)

Provides:
- PBKDF2-HMAC-SHA256 password hashing with per-user cryptographic salt
- Persistent storage:
    * Primary production: Neon / PostgreSQL when DATABASE_URL or POSTGRES_URL is configured
    * Local development: Atomic JSON file (backend/data/users.json)
- Dynamic Master Account provisioning from environment variables
- Normal Member account creation, role assignment, and active/revocation state
- Safe retrieval without exposing password hashes or salts
"""
import hashlib
import json
import logging
import os
import secrets
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend import config

logger = logging.getLogger("mineintel.auth_store")

HASH_ITERATIONS = 100_000

# Local fallback file location
USERS_FILE = config.DATA_DIR / "users.json"

_pg_initialized = False


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 rounds and a secure salt."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        HASH_ITERATIONS
    )
    return key.hex(), salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """Verifies a password against the stored hash and salt in constant time."""
    try:
        calculated_hash, _ = hash_password(password, salt)
        return secrets.compare_digest(calculated_hash, password_hash)
    except Exception:
        return False


def is_postgres_configured() -> bool:
    """Checks if a PostgreSQL connection string is supplied."""
    db_url = config.get_database_url().strip()
    return bool(db_url)


def _get_pg_connection():
    """Returns a psycopg2 connection using DATABASE_URL with SSL support for Neon."""
    import psycopg2
    db_url = config.get_database_url().strip()
    # Ensure sslmode=require if connecting to remote cloud host like Neon
    if "sslmode=" not in db_url and ("neon.tech" in db_url or "aws" in db_url or "render.com" in db_url):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"
    return psycopg2.connect(db_url, connect_timeout=10)


def _init_pg_schema() -> None:
    """Ensures mineintel_users table exists in PostgreSQL."""
    global _pg_initialized
    if _pg_initialized:
        return
    try:
        import psycopg2
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mineintel_users (
                        officer_id VARCHAR(128) PRIMARY KEY,
                        display_name VARCHAR(255) NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        salt VARCHAR(64) NOT NULL,
                        role VARCHAR(128) NOT NULL DEFAULT 'Operational Auditor',
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at BIGINT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_mineintel_users_lower_id 
                    ON mineintel_users (LOWER(officer_id));
                """)
            conn.commit()
        _pg_initialized = True
    except Exception as e:
        logger.warning(f"PostgreSQL schema initialization deferred/failed: {e}")


# -------------------------------------------------------------------------
# LOCAL JSON ATOMIC STORAGE HELPERS
# -------------------------------------------------------------------------
def _atomic_write_local_users(users: Dict[str, Dict[str, Any]]) -> None:
    """Atomically writes user dictionary to local disk."""
    try:
        USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=str(USERS_FILE.parent), delete=False, encoding="utf-8") as tf:
            json.dump(users, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, str(USERS_FILE))
    except Exception as e:
        logger.warning(f"Atomic user store write error: {e}")
        try:
            USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")
        except Exception:
            pass


def _load_local_users() -> Dict[str, Dict[str, Any]]:
    """Loads all user records from local persistent JSON."""
    if not USERS_FILE.exists():
        return {}
    try:
        return json.loads(USERS_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning(f"Error reading users file {USERS_FILE}: {e}")
        return {}


# -------------------------------------------------------------------------
# UNIFIED USER DATA ACCESS METHODS
# -------------------------------------------------------------------------
def load_users() -> Dict[str, Dict[str, Any]]:
    """Loads user dictionary, preferring PostgreSQL if configured, else local file."""
    if is_postgres_configured():
        try:
            _init_pg_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT officer_id, display_name, password_hash, salt, role, is_active, created_at FROM mineintel_users")
                    rows = cur.fetchall()
                    users = {}
                    for row in rows:
                        oid, dname, phash, salt, role, active, created = row
                        users[oid.strip().lower()] = {
                            "officer_id": oid,
                            "display_name": dname,
                            "password_hash": phash,
                            "salt": salt,
                            "role": role,
                            "is_active": active,
                            "created_at": created
                        }
                    return users
        except Exception as e:
            logger.warning(f"PostgreSQL load error, attempting local fallback: {e}")

    return _load_local_users()


def get_user_by_id(officer_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves user by officer ID / username (case-insensitive)."""
    clean_id = officer_id.strip()
    if not clean_id:
        return None

    if is_postgres_configured():
        try:
            _init_pg_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT officer_id, display_name, password_hash, salt, role, is_active, created_at "
                        "FROM mineintel_users WHERE LOWER(officer_id) = LOWER(%s) LIMIT 1",
                        (clean_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        oid, dname, phash, salt, role, active, created = row
                        return {
                            "officer_id": oid,
                            "display_name": dname,
                            "password_hash": phash,
                            "salt": salt,
                            "role": role,
                            "is_active": active,
                            "created_at": created
                        }
                    return None
        except Exception as e:
            logger.warning(f"PostgreSQL query error, falling back to local: {e}")

    users = _load_local_users()
    return users.get(clean_id.lower())


def get_all_users_safe() -> List[Dict[str, Any]]:
    """Returns all users without password hashes or salts."""
    users = load_users()
    safe_list = []
    for u in users.values():
        safe_list.append({
            "officer_id": u["officer_id"],
            "display_name": u.get("display_name", u["officer_id"]),
            "role": u.get("role", "Operational Auditor"),
            "is_active": u.get("is_active", True),
            "created_at": u.get("created_at", int(time.time()))
        })
    return safe_list


def create_user(
    officer_id: str,
    password: str,
    display_name: Optional[str] = None,
    role: str = "Operational Auditor"
) -> Dict[str, Any]:
    """Creates a new normal user with salted PBKDF2 hash in PostgreSQL or local file."""
    clean_id = officer_id.strip()
    if not clean_id:
        raise ValueError("Officer ID / Username cannot be empty.")
    if len(password.strip()) < 4:
        raise ValueError("Password must be at least 4 characters.")

    # Disallow shadowing the Master Account
    master_id = config.get_auth_officer_id().strip().lower()
    if master_id and clean_id.lower() == master_id:
        raise ValueError("Cannot create a user with the Master Officer ID.")

    # Check if user already exists
    if get_user_by_id(clean_id):
        raise ValueError(f"User '{clean_id}' already exists.")

    pwd_hash, salt = hash_password(password.strip())
    created_ts = int(time.time())
    display_val = (display_name or clean_id).strip()
    role_val = role.strip() if role else "Operational Auditor"

    if is_postgres_configured():
        try:
            _init_pg_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO mineintel_users (officer_id, display_name, password_hash, salt, role, is_active, created_at) "
                        "VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
                        (clean_id, display_val, pwd_hash, salt, role_val, created_ts)
                    )
                conn.commit()
            return {
                "officer_id": clean_id,
                "display_name": display_val,
                "role": role_val,
                "is_active": True,
                "created_at": created_ts
            }
        except Exception as e:
            logger.warning(f"PostgreSQL write failed: {e}")
            raise RuntimeError(f"Database write error: {e}")

    # Local fallback
    local_users = _load_local_users()
    new_user = {
        "officer_id": clean_id,
        "display_name": display_val,
        "password_hash": pwd_hash,
        "salt": salt,
        "role": role_val,
        "is_active": True,
        "created_at": created_ts
    }
    local_users[clean_id.lower()] = new_user
    _atomic_write_local_users(local_users)

    return {
        "officer_id": new_user["officer_id"],
        "display_name": new_user["display_name"],
        "role": new_user["role"],
        "is_active": new_user["is_active"],
        "created_at": new_user["created_at"]
    }


def set_user_status(officer_id: str, is_active: bool) -> bool:
    """Enables or disables/revokes a user in PostgreSQL or local file."""
    clean_id = officer_id.strip()
    if not clean_id:
        return False

    if is_postgres_configured():
        try:
            _init_pg_schema()
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE mineintel_users SET is_active = %s WHERE LOWER(officer_id) = LOWER(%s)",
                        (is_active, clean_id)
                    )
                    affected = cur.rowcount
                conn.commit()
            return affected > 0
        except Exception as e:
            logger.warning(f"PostgreSQL update failed: {e}")
            return False

    local_users = _load_local_users()
    key = clean_id.lower()
    if key not in local_users:
        return False
    local_users[key]["is_active"] = is_active
    _atomic_write_local_users(local_users)
    return True


def authenticate_user(officer_id: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Authenticates either:
    1. The provisioned Master Account (from environment variables)
    2. A registered normal user from PostgreSQL or local persistent storage
    Returns safe user info dict if valid, else None.
    """
    clean_id = officer_id.strip()
    clean_pw = password.strip()
    if not clean_id or not clean_pw:
        return None

    # Check 1: Provisioned Master Account
    master_officer = config.get_auth_officer_id().strip()
    master_secret = config.get_auth_secret_password().strip()

    if master_officer and master_secret:
        if secrets.compare_digest(clean_id.lower(), master_officer.lower()) and secrets.compare_digest(clean_pw, master_secret):
            return {
                "officer_id": master_officer,
                "display_name": "Executive Master Auditor",
                "role": "Senior Operational Auditor",
                "is_master": True,
                "is_active": True
            }

    # Check 2: Registered Normal User
    user = get_user_by_id(clean_id)
    if not user:
        return None

    if not user.get("is_active", True):
        return {
            "error": "USER_DISABLED",
            "message": f"Officer account '{clean_id}' has been disabled or revoked."
        }

    if verify_password(clean_pw, user["password_hash"], user["salt"]):
        return {
            "officer_id": user["officer_id"],
            "display_name": user.get("display_name", user["officer_id"]),
            "role": user.get("role", "Operational Auditor"),
            "is_master": False,
            "is_active": True
        }

    return None
