"""
MineIntel Ingestion Router (/api/ingest)
Handles multi-file evidence ingestion, cryptographic hashing, provenance extraction,
job progress monitoring, and access to raw and normalized evidence artifacts.
"""
import json
import secrets
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse

from backend import config
from backend.services import ingestion_store
from backend.services.ingestion_service import ingestion_engine
from backend.routers.auth import require_auth

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("/jobs", status_code=201)
async def create_ingestion_job(
    files: List[UploadFile] = File(...),
    auth: Dict[str, Any] = Depends(require_auth)
):
    """
    Unified multi-file evidence ingestion endpoint.
    Accepts PDF, scanned PDF, PNG/JPG/JPEG, CSV, XLSX, and DOCX files.
    Computes cryptographic SHA-256 hashes, detects duplicates without deleting originals,
    preserves immutable raw files, generates normalized markdown with granular source provenance,
    and returns the multi-file job manifest.
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

    owner_id = auth["officer_id"]
    manifest = await run_in_threadpool(
        ingestion_engine.create_ingestion_job,
        owner_id=owner_id,
        files=uploaded_payloads
    )
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
    auth: Dict[str, Any] = Depends(require_auth)
):
    """
    Lists ingestion jobs.
    Enforces Phase 0 ownership isolation: normal officers can only view their own jobs.
    Master officers can view all jobs or filter by owner_id.
    """
    master_officer = config.get_auth_officer_id().strip().strip("\"'").strip()
    is_master = (
        bool(master_officer) and secrets.compare_digest(auth.get("officer_id", "").lower(), master_officer.lower())
    )
    filter_owner = auth["officer_id"] if not is_master else (owner_id or None)
    jobs = ingestion_store.list_jobs(owner_id=filter_owner)
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
