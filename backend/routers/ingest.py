"""
MineIntel Ingestion Router (/api/ingest)
Handles multi-file evidence ingestion, cryptographic hashing, provenance extraction,
job progress monitoring, and access to raw and normalized evidence artifacts.
"""
import hashlib
import json
import logging
import secrets
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend import config
from backend.database import Document, get_db, SessionLocal
from backend.services import ingestion_store
from backend.services.ingestion_service import ingestion_engine
from backend.routers.auth import require_auth, get_current_user_or_default

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("/upload")
async def upload_single_evidence_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    auth: Dict[str, Any] = Depends(get_current_user_or_default)
):
    """
    Direct evidence upload endpoint saving file into both persistent storage and SQLite Document table.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename cannot be empty.")
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail=f"Uploaded file '{file.filename}' is empty.")

    file_id = f"doc_{int(time.time())}_{secrets.token_hex(4)}"
    upload_dir = config.OUTPUTS_DIR / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    raw_path = upload_dir / f"{file_id}_{Path(file.filename).name}"
    raw_path.write_bytes(content)

    sha256 = hashlib.sha256(content).hexdigest()
    ext = Path(file.filename).suffix.lower()
    file_type = "PDF" if ext == ".pdf" else (ext.lstrip(".").upper() or "DOCUMENT")

    session_managed = False
    if not isinstance(db, Session):
        db = SessionLocal()
        session_managed = True
    try:
        owner_id = auth.get("officer_id", "LOCAL_OFFICER") if isinstance(auth, dict) else "LOCAL_OFFICER"
        existing = db.query(Document).filter(
            Document.sha256_hash == sha256,
            Document.owner_id == owner_id
        ).first()
        if existing:
            return {
                "success": True,
                "duplicate": True,
                "file_id": existing.id,
                "message": f"File already ingested as '{existing.filename}'."
            }

        doc = Document(
            id=file_id,
            filename=file.filename,
            file_type=file_type,
            file_size=len(content),
            sha256_hash=sha256,
            raw_path=str(raw_path),
            normalized_path=str(raw_path),
            status="completed",
            owner_id=owner_id,
            metadata_json=json.dumps({"upload_type": "direct_upload"}),
            created_at=int(time.time() * 1000)
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        return {
            "success": True,
            "document": doc.to_dict(),
            "file_id": file_id,
            "file_path": str(raw_path)
        }
    finally:
        if session_managed:
            db.close()


@router.get("/data-sources")
@router.get("/sources")
def get_data_sources(db: Session = Depends(get_db)):
    """
    Retrieves all previously uploaded files from the database using db.query(Document).all().
    Ensures L3 persistent Data Sources across browser refreshes.
    """
    documents = db.query(Document).order_by(Document.created_at.desc()).all()
    docs_data = [d.to_dict() for d in documents]
    return {
        "success": True,
        "documents": docs_data,
        "data_sources": docs_data,
        "sources": docs_data,
        "count": len(docs_data)
    }


@router.post("/jobs", status_code=201)
async def create_ingestion_job(
    files: List[UploadFile] = File(...),
    auth: Dict[str, Any] = Depends(get_current_user_or_default)
):
    """
    Unified multi-file evidence ingestion endpoint.
    Accepts PDF, scanned PDF, PNG/JPG/JPEG, CSV, XLSX, and DOCX files.
    Computes cryptographic SHA-256 hashes, saves raw copies, generates structured provenance,
    persists records directly into SQLite/SQLAlchemy Document table, and returns the manifest.
    """
    if not files:
        raise HTTPException(status_code=400, detail="At least one evidence file must be provided.")

    uploaded_payloads: List[Tuple[str, bytes]] = []
    for f in files:
        if not f.filename:
            continue
        ext = Path(f.filename).suffix.lower()
        if ext not in config.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}' for file '{f.filename}'. Allowed: {', '.join(sorted(config.ALLOWED_EXTENSIONS))}"
            )
        content = await f.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail=f"Uploaded file '{f.filename}' is empty (0 bytes).")
        if len(content) > config.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File '{f.filename}' exceeds upload size limit of {config.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB."
            )
        uploaded_payloads.append((f.filename, content))

    if not uploaded_payloads:
        raise HTTPException(status_code=400, detail="No valid non-empty files were provided.")

    owner_id = auth.get("officer_id", "LOCAL_OFFICER")
    manifest = await run_in_threadpool(
        ingestion_engine.create_ingestion_job,
        owner_id=owner_id,
        files=uploaded_payloads
    )

    # Persist every ingested evidence file into SQLite Document table
    try:
        db = SessionLocal()
        for f_rec in manifest.get("files", []):
            f_dict = f_rec if isinstance(f_rec, dict) else (f_rec.to_dict() if hasattr(f_rec, "to_dict") else {})
            f_id = f_dict.get("file_id")
            if not f_id:
                continue
            sha256 = f_dict.get("sha256_hash")
            if sha256:
                existing = db.query(Document).filter(
                    Document.sha256_hash == sha256,
                    Document.owner_id == owner_id
                ).first()
                if existing:
                    continue
            doc = Document(
                id=f_id,
                filename=f_dict.get("filename") or "evidence.pdf",
                file_type=f_dict.get("file_type") or "application/pdf",
                file_size=int(f_dict.get("file_size") or 0),
                sha256_hash=f_dict.get("sha256_hash"),
                raw_path=str(f_dict.get("raw_path") or ""),
                normalized_path=str(f_dict.get("normalized_path") or ""),
                status=f_dict.get("status") or "completed",
                owner_id=owner_id,
                metadata_json=json.dumps(f_dict.get("metadata") or {}),
                created_at=int(f_dict.get("created_at") or time.time() * 1000)
            )
            db.merge(doc)
        db.commit()
    except Exception as db_err:
        logger.warning(f"Database persistence warning in create_ingestion_job: {db_err}")
    finally:
        db.close()

    return {
        "success": True,
        "job_id": manifest["job_id"],
        "status": manifest["status"],
        "total_files": manifest["total_files"],
        "completed_files": manifest["completed_files"],
        "failed_files": manifest["failed_files"],
        "manifest": manifest
    }


@router.get("/jobs")
def list_ingestion_jobs(
    owner_id: Optional[str] = Query(None),
    auth: Dict[str, Any] = Depends(get_current_user_or_default)
):
    """
    Lists ingestion jobs with their persistent documents.
    """
    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    is_master = (
        bool(master_officer) and secrets.compare_digest(auth.get("officer_id", "").lower(), master_officer.lower())
    )
    filter_owner = auth["officer_id"] if not is_master else (owner_id or None)
    jobs = ingestion_store.list_jobs(owner_id=filter_owner)

    # Ensure all jobs have their files populated from SQLite Document table
    try:
        db = SessionLocal()
        all_docs = db.query(Document).order_by(Document.created_at.desc()).all()
        doc_dicts = [d.to_dict() for d in all_docs]
        if not jobs and doc_dicts:
            # Create a virtual consolidated job so legacy frontends immediately see all persistent files
            jobs = [{
                "job_id": "job_persistent_vault",
                "owner_id": auth.get("officer_id", "LOCAL_OFFICER"),
                "status": "completed",
                "total_files": len(doc_dicts),
                "completed_files": len(doc_dicts),
                "failed_files": 0,
                "created_at": int(time.time() * 1000),
                "files": doc_dicts
            }]
        elif jobs and doc_dicts:
            # Augment existing jobs if files array is missing or empty
            for j in jobs:
                if not j.get("files") or len(j.get("files", [])) == 0:
                    j_files = ingestion_store.list_files_for_job(j["job_id"])
                    if not j_files:
                        j["files"] = doc_dicts
                    else:
                        j["files"] = j_files
    except Exception as e:
        logger.warning(f"Error augmenting jobs with Document table: {e}")
    finally:
        db.close()

    return {
        "success": True,
        "jobs": jobs
    }


@router.get("/jobs/{job_id}")
def get_ingestion_job_status(
    job_id: str,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """
    Retrieves status, file progress, and manifest summary for a specific ingestion job.
    Enforces Phase 0 ownership isolation.
    """
    job = ingestion_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Ingestion job '{job_id}' not found.")

    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    is_master = (
        bool(master_officer) and secrets.compare_digest(auth.get("officer_id", "").lower(), master_officer.lower())
    )
    if not is_master and job.get("owner_id") != auth["officer_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You do not have ownership access to this ingestion job.")

    return {
        "success": True,
        "job": job
    }


@router.get("/jobs/{job_id}/manifest")
def get_ingestion_job_manifest(
    job_id: str,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Retrieves the full manifest JSON for an ingestion job."""
    job = ingestion_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Ingestion job '{job_id}' not found.")

    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    is_master = (
        bool(master_officer) and secrets.compare_digest(auth.get("officer_id", "").lower(), master_officer.lower())
    )
    if not is_master and job.get("owner_id") != auth["officer_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: Access denied to job manifest.")

    manifest_path = Path(job.get("manifest_path", ""))
    if manifest_path.exists():
        try:
            return json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return job


@router.get("/files/{file_id}")
def get_evidence_file_details(
    file_id: str,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """
    Retrieves metadata, cryptographic hash, duplicate status, and source provenance for an evidence file.
    Enforces Phase 0 ownership isolation.
    """
    rec = ingestion_store.get_evidence_file(file_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Evidence file '{file_id}' not found.")

    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    is_master = (
        bool(master_officer) and secrets.compare_digest(auth.get("officer_id", "").lower(), master_officer.lower())
    )
    if not is_master and rec.get("owner_id") != auth["officer_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: Access denied to evidence file.")

    return {
        "success": True,
        "file": rec
    }


@router.get("/files/{file_id}/raw")
def download_raw_evidence_file(
    file_id: str,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Downloads the immutable raw uploaded evidence file."""
    rec = ingestion_store.get_evidence_file(file_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Evidence file '{file_id}' not found.")

    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    is_master = (
        bool(master_officer) and secrets.compare_digest(auth.get("officer_id", "").lower(), master_officer.lower())
    )
    if not is_master and rec.get("owner_id") != auth["officer_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: Access denied to raw evidence file.")

    raw_path = Path(rec.get("raw_path", ""))
    if not raw_path.exists():
        raise HTTPException(status_code=404, detail="Raw evidence file is not present on disk.")

    return FileResponse(
        path=str(raw_path),
        filename=rec.get("filename", raw_path.name),
        media_type="application/octet-stream"
    )


@router.get("/files/{file_id}/normalized")
def get_normalized_evidence_content(
    file_id: str,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Retrieves the normalized Markdown representation of an ingested evidence file."""
    rec = ingestion_store.get_evidence_file(file_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Evidence file '{file_id}' not found.")

    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    is_master = (
        bool(master_officer) and secrets.compare_digest(auth.get("officer_id", "").lower(), master_officer.lower())
    )
    if not is_master and rec.get("owner_id") != auth["officer_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: Access denied to normalized evidence.")

    norm_path = Path(rec.get("normalized_path", ""))
    content = ""
    if norm_path.exists():
        try:
            content = norm_path.read_text(encoding="utf-8")
        except Exception:
            pass

    return {
        "success": True,
        "file_id": file_id,
        "filename": rec.get("filename"),
        "file_type": rec.get("file_type"),
        "normalized_markdown": content,
        "provenance": rec.get("provenance", [])
    }


@router.delete("/files/{file_id}")
def delete_evidence_file(
    file_id: str,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Delete an ingested file record (and raw bytes on disk)."""
    rec = ingestion_store.get_evidence_file(file_id)
    if not rec:
        try:
            _db = SessionLocal()
            _doc = _db.query(Document).filter(Document.id == file_id).first()
            if _doc:
                rec = {"owner_id": _doc.owner_id, "raw_path": _doc.raw_path, "filename": _doc.filename}
        except Exception:
            pass
        finally:
            try: _db.close()
            except Exception: pass

    if not rec:
        # Idempotent: return success even if not found
        return {"success": True, "file_id": file_id, "deleted": False}
    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    is_master = (
        bool(master_officer)
        and secrets.compare_digest(auth.get("officer_id", "").lower(),
                                   master_officer.lower())
    )
    if not is_master and rec.get("owner_id") != auth.get("officer_id"):
        raise HTTPException(status_code=403, detail="Not your file.")
    # Remove from Document table
    try:
        db = SessionLocal()
        doc = db.query(Document).filter(Document.id == file_id).first()
        if doc:
            try:
                if doc.raw_path and Path(doc.raw_path).exists():
                    Path(doc.raw_path).unlink(missing_ok=True)
            except Exception:
                pass
            db.delete(doc)
            db.commit()
    except Exception:
        pass
    finally:
        try: db.close()
        except Exception: pass
    # Remove from ingestion_store
    try:
        ingestion_store.delete_evidence_file(file_id)
    except Exception:
        pass
    return {"success": True, "file_id": file_id, "deleted": True}

