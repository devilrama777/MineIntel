"""Admin maintenance endpoints. Senior Officer only."""
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_
from backend.database import Document, SessionLocal
from backend.routers.auth import require_auth

router = APIRouter(prefix="/api/admin", tags=["admin"])

class PurgeRequest(BaseModel):
    confirm: str

@router.post("/purge-test-data")
def purge_test_data(req: PurgeRequest, auth: Dict[str, Any] = Depends(require_auth)):
    if auth.get("role") != "Senior Officer":
        raise HTTPException(status_code=403, detail="Senior Officer role required.")
    if req.confirm != "PURGE":
        raise HTTPException(status_code=400, detail='Body must be {"confirm": "PURGE"}')
    patterns = ["secret_%", "test_%", "mine_data%", "inspection%",
                "confidential_%", "valid_%", "clearance%", "main.py%"]
    db = SessionLocal()
    try:
        q = db.query(Document).filter(
            or_(*[Document.filename.ilike(p) for p in patterns])
        )
        candidates = q.all()
        deleted = len(candidates)
        for doc in candidates:
            db.delete(doc)
        db.commit()
        remaining = db.query(Document).count()
    finally:
        db.close()
    return {"success": True, "deleted": deleted, "remaining": remaining}
