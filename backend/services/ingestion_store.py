"""
MineIntel Phase 1: Ingestion Persistence Store (Neon PostgreSQL + Local JSON Fallback)

Provides persistent dual-mode storage for:
- Multi-file Ingestion Jobs
- Evidence Files with SHA-256 deduplication index
- Source Provenance mapping
"""
import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend import config

logger = logging.getLogger("mineintel.ingestion_store")

STORE_FILE = config.DATA_DIR / "ingestion_store.json"

_pg_schema_initialized = False


def is_postgres_configured() -> bool:
    """Checks if a PostgreSQL connection string is configured in the environment."""
    return bool(config.get_database_url().strip())


def _get_pg_connection():
    """Returns a psycopg2 connection using DATABASE_URL with SSL support for Neon."""
    import psycopg2
    db_url = config.get_database_url().strip()
    if "sslmode=" not in db_url and ("neon.tech" in db_url or "aws" in db_url or "render.com" in db_url):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"
    return psycopg2.connect(db_url, connect_timeout=10)


def init_ingestion_schema() -> None:
    """Initializes PostgreSQL tables for jobs and evidence files if not already initialized."""
    global _pg_schema_initialized
    if _pg_schema_initialized:
        return
    if not is_postgres_configured():
        _pg_schema_initialized = True
        return

    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mineintel_ingestion_jobs (
                        job_id VARCHAR(128) PRIMARY KEY,
                        owner_id VARCHAR(128) NOT NULL,
                        status VARCHAR(64) NOT NULL,
                        total_files INT NOT NULL DEFAULT 0,
                        completed_files INT NOT NULL DEFAULT 0,
                        failed_files INT NOT NULL DEFAULT 0,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL,
                        manifest_path TEXT,
                        manifest JSONB
                    );
                    CREATE INDEX IF NOT EXISTS idx_mineintel_ingest_owner 
                    ON mineintel_ingestion_jobs (owner_id);

                    CREATE TABLE IF NOT EXISTS mineintel_evidence_files (
                        file_id VARCHAR(128) PRIMARY KEY,
                        job_id VARCHAR(128) NOT NULL,
                        owner_id VARCHAR(128) NOT NULL,
                        filename VARCHAR(255) NOT NULL,
                        file_type VARCHAR(64) NOT NULL,
                        sha256_hash VARCHAR(64) NOT NULL,
                        file_size BIGINT NOT NULL,
                        is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
                        duplicate_of_id VARCHAR(128),
                        status VARCHAR(64) NOT NULL,
                        error_message TEXT,
                        raw_path TEXT NOT NULL,
                        normalized_path TEXT,
                        provenance_meta JSONB,
                        file_metadata JSONB,
                        created_at BIGINT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_mineintel_evidence_hash 
                    ON mineintel_evidence_files (sha256_hash);
                    CREATE INDEX IF NOT EXISTS idx_mineintel_evidence_job 
                    ON mineintel_evidence_files (job_id);
                    CREATE INDEX IF NOT EXISTS idx_mineintel_evidence_owner 
                    ON mineintel_evidence_files (owner_id);
                """)
            conn.commit()
        _pg_schema_initialized = True
        logger.info("Neon/PostgreSQL ingestion schema initialized successfully.")
    except Exception as e:
        logger.warning(f"PostgreSQL ingestion schema initialization deferred/failed: {e}")


# -------------------------------------------------------------------------
# LOCAL JSON ATOMIC STORAGE HELPERS
# -------------------------------------------------------------------------
def _load_local_store() -> Dict[str, Any]:
    """Loads all jobs and evidence files from local JSON store."""
    if not STORE_FILE.exists():
        return {"jobs": {}, "files": {}}
    try:
        data = json.loads(STORE_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"jobs": {}, "files": {}}
        data.setdefault("jobs", {})
        data.setdefault("files", {})
        return data
    except Exception as e:
        logger.warning(f"Failed to read local ingestion store {STORE_FILE}: {e}")
        return {"jobs": {}, "files": {}}


def _atomic_write_local_store(data: Dict[str, Any]) -> None:
    """Atomically writes data to local ingestion store JSON."""
    try:
        STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=str(STORE_FILE.parent), delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, str(STORE_FILE))
    except Exception as e:
        logger.warning(f"Atomic ingestion store write error: {e}")
        try:
            STORE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            pass


# -------------------------------------------------------------------------
# UNIFIED CRUD METHODS
# -------------------------------------------------------------------------
def save_job(job_data: Dict[str, Any]) -> None:
    """Saves or updates an IngestionJob record in Neon PostgreSQL and local JSON."""
    job_id = job_data["job_id"]
    owner_id = job_data["owner_id"]
    status = job_data.get("status", "pending")
    total_files = job_data.get("total_files", 0)
    completed_files = job_data.get("completed_files", 0)
    failed_files = job_data.get("failed_files", 0)
    created_at = int(job_data.get("created_at") or time.time() * 1000)
    updated_at = int(job_data.get("updated_at") or time.time() * 1000)
    manifest_path = job_data.get("manifest_path", "")
    manifest_json = json.dumps(job_data)

    # Local fallback / mirror write
    local_data = _load_local_store()
    local_data["jobs"][job_id] = job_data
    _atomic_write_local_store(local_data)

    # Neon / PostgreSQL write if configured
    if is_postgres_configured():
        init_ingestion_schema()
        try:
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO mineintel_ingestion_jobs 
                        (job_id, owner_id, status, total_files, completed_files, failed_files, created_at, updated_at, manifest_path, manifest)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                        ON CONFLICT (job_id) DO UPDATE SET
                            status = EXCLUDED.status,
                            total_files = EXCLUDED.total_files,
                            completed_files = EXCLUDED.completed_files,
                            failed_files = EXCLUDED.failed_files,
                            updated_at = EXCLUDED.updated_at,
                            manifest_path = EXCLUDED.manifest_path,
                            manifest = EXCLUDED.manifest;
                    """, (job_id, owner_id, status, total_files, completed_files, failed_files, created_at, updated_at, manifest_path, manifest_json))
                conn.commit()
        except Exception as e:
            logger.warning(f"Failed to persist job {job_id} to PostgreSQL: {e}")


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves an IngestionJob record by job_id from PostgreSQL or local store."""
    if is_postgres_configured():
        init_ingestion_schema()
        try:
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT manifest FROM mineintel_ingestion_jobs WHERE job_id = %s;
                    """, (job_id,))
                    row = cur.fetchone()
                    if row and row[0]:
                        res = row[0] if isinstance(row[0], dict) else json.loads(row[0])
                        return res
        except Exception as e:
            logger.warning(f"Failed to query job {job_id} from PostgreSQL: {e}")

    local_data = _load_local_store()
    return local_data.get("jobs", {}).get(job_id)


def list_jobs(owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lists all IngestionJobs, optionally filtered by owner_id."""
    if is_postgres_configured():
        init_ingestion_schema()
        try:
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute("""
                            SELECT manifest FROM mineintel_ingestion_jobs 
                            WHERE owner_id = %s 
                            ORDER BY created_at DESC;
                        """, (owner_id,))
                    else:
                        cur.execute("""
                            SELECT manifest FROM mineintel_ingestion_jobs 
                            ORDER BY created_at DESC;
                        """)
                    rows = cur.fetchall()
                    jobs = []
                    for r in rows:
                        item = r[0] if isinstance(r[0], dict) else json.loads(r[0])
                        jobs.append(item)
                    return jobs
        except Exception as e:
            logger.warning(f"Failed to list jobs from PostgreSQL: {e}")

    local_data = _load_local_store()
    jobs = list(local_data.get("jobs", {}).values())
    if owner_id:
        jobs = [j for j in jobs if j.get("owner_id") == owner_id]
    jobs.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return jobs


def save_evidence_file(file_data: Dict[str, Any]) -> None:
    """Saves or updates an EvidenceFile record in Neon PostgreSQL and local JSON."""
    file_id = file_data["file_id"]
    job_id = file_data["job_id"]
    owner_id = file_data["owner_id"]
    filename = file_data["filename"]
    file_type = file_data.get("file_type", "unknown")
    sha256_hash = file_data.get("sha256_hash", "")
    file_size = file_data.get("file_size", 0)
    is_duplicate = bool(file_data.get("is_duplicate", False))
    duplicate_of_id = file_data.get("duplicate_of_file_id")
    status = file_data.get("status", "pending")
    error_message = file_data.get("error_message")
    raw_path = file_data.get("raw_path", "")
    normalized_path = file_data.get("normalized_path")
    provenance_meta = json.dumps(file_data.get("provenance", []))
    file_meta = json.dumps(file_data.get("metadata", {}))
    created_at = int(file_data.get("created_at") or time.time() * 1000)

    # Local fallback / mirror write
    local_data = _load_local_store()
    local_data["files"][file_id] = file_data
    _atomic_write_local_store(local_data)

    # Neon / PostgreSQL write if configured
    if is_postgres_configured():
        init_ingestion_schema()
        try:
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO mineintel_evidence_files 
                        (file_id, job_id, owner_id, filename, file_type, sha256_hash, file_size, 
                         is_duplicate, duplicate_of_id, status, error_message, raw_path, normalized_path, 
                         provenance_meta, file_metadata, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
                        ON CONFLICT (file_id) DO UPDATE SET
                            status = EXCLUDED.status,
                            error_message = EXCLUDED.error_message,
                            normalized_path = EXCLUDED.normalized_path,
                            provenance_meta = EXCLUDED.provenance_meta,
                            file_metadata = EXCLUDED.file_metadata,
                            is_duplicate = EXCLUDED.is_duplicate,
                            duplicate_of_id = EXCLUDED.duplicate_of_id;
                    """, (file_id, job_id, owner_id, filename, file_type, sha256_hash, file_size,
                          is_duplicate, duplicate_of_id, status, error_message, raw_path, normalized_path,
                          provenance_meta, file_meta, created_at))
                conn.commit()
        except Exception as e:
            logger.warning(f"Failed to persist evidence file {file_id} to PostgreSQL: {e}")


def get_evidence_file(file_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves an EvidenceFile record by file_id from PostgreSQL or local store."""
    if is_postgres_configured():
        init_ingestion_schema()
        try:
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT file_id, job_id, owner_id, filename, file_type, sha256_hash, 
                               file_size, is_duplicate, duplicate_of_id, status, error_message, 
                               raw_path, normalized_path, provenance_meta, file_metadata, created_at
                        FROM mineintel_evidence_files WHERE file_id = %s;
                    """, (file_id,))
                    row = cur.fetchone()
                    if row:
                        return {
                            "file_id": row[0],
                            "job_id": row[1],
                            "owner_id": row[2],
                            "filename": row[3],
                            "file_type": row[4],
                            "sha256_hash": row[5],
                            "file_size": row[6],
                            "is_duplicate": row[7],
                            "duplicate_of_file_id": row[8],
                            "status": row[9],
                            "error_message": row[10],
                            "raw_path": row[11],
                            "normalized_path": row[12],
                            "provenance": row[13] if isinstance(row[13], list) else (json.loads(row[13]) if row[13] else []),
                            "metadata": row[14] if isinstance(row[14], dict) else (json.loads(row[14]) if row[14] else {}),
                            "created_at": row[15]
                        }
        except Exception as e:
            logger.warning(f"Failed to query evidence file {file_id} from PostgreSQL: {e}")

    local_data = _load_local_store()
    return local_data.get("files", {}).get(file_id)


def find_file_by_hash(sha256_hash: str, owner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Finds an existing evidence file with the same SHA-256 hash for duplicate detection.
    Does not delete originals; simply returns the existing match so callers can reference it.
    """
    if not sha256_hash:
        return None

    if is_postgres_configured():
        init_ingestion_schema()
        try:
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    if owner_id:
                        cur.execute("""
                            SELECT file_id, job_id, owner_id, filename, file_type, sha256_hash, 
                                   file_size, is_duplicate, duplicate_of_id, status, raw_path
                            FROM mineintel_evidence_files 
                            WHERE sha256_hash = %s AND owner_id = %s
                            LIMIT 1;
                        """, (sha256_hash, owner_id))
                    else:
                        cur.execute("""
                            SELECT file_id, job_id, owner_id, filename, file_type, sha256_hash, 
                                   file_size, is_duplicate, duplicate_of_id, status, raw_path
                            FROM mineintel_evidence_files 
                            WHERE sha256_hash = %s
                            LIMIT 1;
                        """, (sha256_hash,))
                    row = cur.fetchone()
                    if row:
                        return {
                            "file_id": row[0],
                            "job_id": row[1],
                            "owner_id": row[2],
                            "filename": row[3],
                            "file_type": row[4],
                            "sha256_hash": row[5],
                            "file_size": row[6],
                            "is_duplicate": row[7],
                            "duplicate_of_file_id": row[8],
                            "status": row[9],
                            "raw_path": row[10]
                        }
        except Exception as e:
            logger.warning(f"Failed to query evidence hash {sha256_hash} from PostgreSQL: {e}")

    local_data = _load_local_store()
    for f in local_data.get("files", {}).values():
        if f.get("sha256_hash") == sha256_hash:
            if owner_id is None or f.get("owner_id") == owner_id:
                return f
    return None


def list_files_for_job(job_id: str) -> List[Dict[str, Any]]:
    """Retrieves all evidence files belonging to a specific job."""
    if is_postgres_configured():
        init_ingestion_schema()
        try:
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT file_id, job_id, owner_id, filename, file_type, sha256_hash, 
                               file_size, is_duplicate, duplicate_of_id, status, error_message, 
                               raw_path, normalized_path, provenance_meta, file_metadata, created_at
                        FROM mineintel_evidence_files 
                        WHERE job_id = %s
                        ORDER BY created_at ASC;
                    """, (job_id,))
                    rows = cur.fetchall()
                    files = []
                    for row in rows:
                        files.append({
                            "file_id": row[0],
                            "job_id": row[1],
                            "owner_id": row[2],
                            "filename": row[3],
                            "file_type": row[4],
                            "sha256_hash": row[5],
                            "file_size": row[6],
                            "is_duplicate": row[7],
                            "duplicate_of_file_id": row[8],
                            "status": row[9],
                            "error_message": row[10],
                            "raw_path": row[11],
                            "normalized_path": row[12],
                            "provenance": row[13] if isinstance(row[13], list) else (json.loads(row[13]) if row[13] else []),
                            "metadata": row[14] if isinstance(row[14], dict) else (json.loads(row[14]) if row[14] else {}),
                            "created_at": row[15]
                        })
                    return files
        except Exception as e:
            logger.warning(f"Failed to list evidence files for job {job_id} from PostgreSQL: {e}")

    local_data = _load_local_store()
    files = [f for f in local_data.get("files", {}).values() if f.get("job_id") == job_id]
    files.sort(key=lambda x: x.get("created_at", 0))
    return files
