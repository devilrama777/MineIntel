"""
MineIntel Phase 2: Structured Evidence Persistence Store (Neon PostgreSQL + Local JSON Fallback)

Provides:
- PostgreSQL persistence for StructuredEvidenceItem records in Neon
- Local atomic JSON fallback (backend/data/structured_evidence.json)
- Multi-dimensional filtering by job_id, file_id, owner_id, layer, classification, and source_type
- Job-level evidence breakdown summaries
"""
import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend import config

logger = logging.getLogger("mineintel.evidence_store")

EVIDENCE_FILE = config.DATA_DIR / "structured_evidence.json"

_pg_evidence_initialized = False


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


def init_evidence_schema() -> None:
    """Initializes PostgreSQL table for structured evidence if not already initialized."""
    global _pg_evidence_initialized
    if _pg_evidence_initialized:
        return
    if not is_postgres_configured():
        _pg_evidence_initialized = True
        return

    try:
        with _get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mineintel_structured_evidence (
                        evidence_id VARCHAR(128) PRIMARY KEY,
                        job_id VARCHAR(128) NOT NULL,
                        file_id VARCHAR(128) NOT NULL,
                        owner_id VARCHAR(128) NOT NULL,
                        layer VARCHAR(32) NOT NULL,
                        classification VARCHAR(64) NOT NULL,
                        content_text TEXT,
                        content_json JSONB,
                        raw_reference JSONB,
                        provenance JSONB,
                        derived_from_ids JSONB,
                        confidence FLOAT NOT NULL DEFAULT 1.0,
                        evidence_metadata JSONB,
                        created_at BIGINT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_structured_evd_job 
                    ON mineintel_structured_evidence (job_id);
                    CREATE INDEX IF NOT EXISTS idx_structured_evd_owner 
                    ON mineintel_structured_evidence (owner_id);
                    CREATE INDEX IF NOT EXISTS idx_structured_evd_class 
                    ON mineintel_structured_evidence (classification);
                    CREATE INDEX IF NOT EXISTS idx_structured_evd_file 
                    ON mineintel_structured_evidence (file_id);
                    CREATE INDEX IF NOT EXISTS idx_structured_evd_layer 
                    ON mineintel_structured_evidence (layer);
                """)
            conn.commit()
        _pg_evidence_initialized = True
        logger.info("Neon/PostgreSQL structured evidence schema initialized.")
    except Exception as e:
        logger.warning(f"PostgreSQL evidence schema initialization deferred/failed: {e}")


# -------------------------------------------------------------------------
# LOCAL JSON ATOMIC STORAGE HELPERS
# -------------------------------------------------------------------------
def _load_local_evidence() -> Dict[str, Dict[str, Any]]:
    """Loads all evidence records from local JSON store."""
    if not EVIDENCE_FILE.exists():
        return {}
    try:
        data = json.loads(EVIDENCE_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception as e:
        logger.warning(f"Failed to read local structured evidence {EVIDENCE_FILE}: {e}")
        return {}


def _atomic_write_local_evidence(data: Dict[str, Dict[str, Any]]) -> None:
    """Atomically writes evidence records to local JSON file."""
    try:
        EVIDENCE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=str(EVIDENCE_FILE.parent), delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, str(EVIDENCE_FILE))
    except Exception as e:
        logger.warning(f"Atomic evidence store write error: {e}")
        try:
            EVIDENCE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            pass


# -------------------------------------------------------------------------
# CRUD & QUERY METHODS
# -------------------------------------------------------------------------
def save_evidence_items(items: List[Dict[str, Any]]) -> None:
    """Saves or updates a batch of StructuredEvidenceItem records."""
    if not items:
        return

    # 1. Update local JSON mirror
    local_data = _load_local_evidence()
    for item in items:
        ev_id = item["evidence_id"]
        local_data[ev_id] = item
    _atomic_write_local_evidence(local_data)

    # 2. Persist to Neon / PostgreSQL if configured
    if is_postgres_configured():
        init_evidence_schema()
        try:
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    for it in items:
                        cur.execute("""
                            INSERT INTO mineintel_structured_evidence
                            (evidence_id, job_id, file_id, owner_id, layer, classification, 
                             content_text, content_json, raw_reference, provenance, 
                             derived_from_ids, confidence, evidence_metadata, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s::jsonb, %s)
                            ON CONFLICT (evidence_id) DO UPDATE SET
                                layer = EXCLUDED.layer,
                                classification = EXCLUDED.classification,
                                content_text = EXCLUDED.content_text,
                                content_json = EXCLUDED.content_json,
                                raw_reference = EXCLUDED.raw_reference,
                                provenance = EXCLUDED.provenance,
                                derived_from_ids = EXCLUDED.derived_from_ids,
                                confidence = EXCLUDED.confidence,
                                evidence_metadata = EXCLUDED.evidence_metadata;
                        """, (
                            it["evidence_id"],
                            it["job_id"],
                            it["file_id"],
                            it["owner_id"],
                            it["layer"],
                            it["classification"],
                            it.get("content_text", ""),
                            json.dumps(it.get("content_json", {})),
                            json.dumps(it.get("raw_reference", {})),
                            json.dumps(it.get("provenance", {})),
                            json.dumps(it.get("derived_from_ids", [])),
                            float(it.get("confidence", 1.0)),
                            json.dumps(it.get("metadata", {})),
                            int(it.get("created_at") or time.time() * 1000)
                        ))
                conn.commit()
        except Exception as e:
            logger.warning(f"Failed to persist evidence items to PostgreSQL: {e}")


def get_evidence_by_id(evidence_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single evidence item by evidence_id."""
    if is_postgres_configured():
        init_evidence_schema()
        try:
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT evidence_id, job_id, file_id, owner_id, layer, classification, 
                               content_text, content_json, raw_reference, provenance, 
                               derived_from_ids, confidence, evidence_metadata, created_at
                        FROM mineintel_structured_evidence WHERE evidence_id = %s;
                    """, (evidence_id,))
                    row = cur.fetchone()
                    if row:
                        return {
                            "evidence_id": row[0],
                            "job_id": row[1],
                            "file_id": row[2],
                            "owner_id": row[3],
                            "layer": row[4],
                            "classification": row[5],
                            "content_text": row[6],
                            "content_json": row[7] if isinstance(row[7], dict) else (json.loads(row[7]) if row[7] else {}),
                            "raw_reference": row[8] if isinstance(row[8], dict) else (json.loads(row[8]) if row[8] else {}),
                            "provenance": row[9] if isinstance(row[9], dict) else (json.loads(row[9]) if row[9] else {}),
                            "derived_from_ids": row[10] if isinstance(row[10], list) else (json.loads(row[10]) if row[10] else []),
                            "confidence": row[11],
                            "metadata": row[12] if isinstance(row[12], dict) else (json.loads(row[12]) if row[12] else {}),
                            "created_at": row[13]
                        }
        except Exception as e:
            logger.warning(f"Failed to query evidence {evidence_id} from PostgreSQL: {e}")

    local_data = _load_local_evidence()
    return local_data.get(evidence_id)


def query_evidence(
    job_id: Optional[str] = None,
    file_id: Optional[str] = None,
    owner_id: Optional[str] = None,
    layer: Optional[str] = None,
    classification: Optional[str] = None,
    source_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    """Queries evidence items with multi-dimensional filtering and pagination."""
    # Sanitize query arguments (handling direct Python calls where FastAPI Query objects may be default values)
    job_id = job_id if isinstance(job_id, str) and job_id.strip() else None
    file_id = file_id if isinstance(file_id, str) and file_id.strip() else None
    owner_id = owner_id if isinstance(owner_id, str) and owner_id.strip() else None
    layer = layer if isinstance(layer, str) and layer.strip() else None
    classification = classification if isinstance(classification, str) and classification.strip() else None
    source_type = source_type if isinstance(source_type, str) and source_type.strip() else None
    search = search if isinstance(search, str) and search.strip() else None
    limit = limit if isinstance(limit, int) else 100
    offset = offset if isinstance(offset, int) else 0

    if is_postgres_configured():
        init_evidence_schema()
        try:
            with _get_pg_connection() as conn:
                with conn.cursor() as cur:
                    where_clauses = []
                    params: List[Any] = []

                    if job_id:
                        where_clauses.append("job_id = %s")
                        params.append(job_id)
                    if file_id:
                        where_clauses.append("file_id = %s")
                        params.append(file_id)
                    if owner_id:
                        where_clauses.append("owner_id = %s")
                        params.append(owner_id)
                    if layer:
                        where_clauses.append("layer = %s")
                        params.append(layer)
                    if classification:
                        where_clauses.append("classification = %s")
                        params.append(classification)
                    if source_type:
                        where_clauses.append("provenance->>'source_type' = %s")
                        params.append(source_type)
                    if search and search.strip():
                        where_clauses.append("(content_text ILIKE %s OR evidence_id ILIKE %s)")
                        term = f"%{search.strip()}%"
                        params.extend([term, term])

                    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

                    # Count total matches
                    cur.execute(f"SELECT COUNT(*) FROM mineintel_structured_evidence {where_sql};", params)
                    total_count = cur.fetchone()[0]

                    # Retrieve page items
                    query_sql = f"""
                        SELECT evidence_id, job_id, file_id, owner_id, layer, classification, 
                               content_text, content_json, raw_reference, provenance, 
                               derived_from_ids, confidence, evidence_metadata, created_at
                        FROM mineintel_structured_evidence
                        {where_sql}
                        ORDER BY created_at ASC, evidence_id ASC
                        LIMIT %s OFFSET %s;
                    """
                    cur.execute(query_sql, params + [limit, offset])
                    rows = cur.fetchall()
                    items = []
                    for row in rows:
                        items.append({
                            "evidence_id": row[0],
                            "job_id": row[1],
                            "file_id": row[2],
                            "owner_id": row[3],
                            "layer": row[4],
                            "classification": row[5],
                            "content_text": row[6],
                            "content_json": row[7] if isinstance(row[7], dict) else (json.loads(row[7]) if row[7] else {}),
                            "raw_reference": row[8] if isinstance(row[8], dict) else (json.loads(row[8]) if row[8] else {}),
                            "provenance": row[9] if isinstance(row[9], dict) else (json.loads(row[9]) if row[9] else {}),
                            "derived_from_ids": row[10] if isinstance(row[10], list) else (json.loads(row[10]) if row[10] else []),
                            "confidence": row[11],
                            "metadata": row[12] if isinstance(row[12], dict) else (json.loads(row[12]) if row[12] else {}),
                            "created_at": row[13]
                        })
                    return {
                        "total": total_count,
                        "limit": limit,
                        "offset": offset,
                        "items": items
                    }
        except Exception as e:
            logger.warning(f"PostgreSQL evidence query fallback to local store: {e}")

    # Local fallback filter
    local_data = _load_local_evidence()
    items = list(local_data.values())

    if job_id:
        items = [i for i in items if i.get("job_id") == job_id]
    if file_id:
        items = [i for i in items if i.get("file_id") == file_id]
    if owner_id:
        items = [i for i in items if i.get("owner_id") == owner_id]
    if layer:
        items = [i for i in items if i.get("layer") == layer]
    if classification:
        items = [i for i in items if i.get("classification") == classification]
    if source_type:
        items = [i for i in items if (i.get("provenance") or {}).get("source_type") == source_type]
    if search and search.strip():
        q = search.strip().lower()
        items = [i for i in items if q in i.get("content_text", "").lower() or q in i.get("evidence_id", "").lower()]

    items.sort(key=lambda x: (x.get("created_at", 0), x.get("evidence_id", "")))
    total_count = len(items)
    page_items = items[offset: offset + limit]

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "items": page_items
    }


def get_job_evidence_summary(job_id: str, owner_id: Optional[str] = None) -> Dict[str, Any]:
    """Generates analytical counts and summary of evidence items for a given job."""
    res = query_evidence(job_id=job_id, owner_id=owner_id, limit=10000)
    items = res.get("items", [])

    layer_counts: Dict[str, int] = {}
    class_counts: Dict[str, int] = {}
    file_ids = set()

    for it in items:
        l = it.get("layer", "unknown")
        c = it.get("classification", "unknown")
        f = it.get("file_id")
        if f:
            file_ids.add(f)
        layer_counts[l] = layer_counts.get(l, 0) + 1
        class_counts[c] = class_counts.get(c, 0) + 1

    return {
        "job_id": job_id,
        "total_evidence_items": len(items),
        "total_files_linked": len(file_ids),
        "by_layer": layer_counts,
        "by_classification": class_counts
    }
