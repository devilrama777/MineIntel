from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
from backend import config
from backend.routers.auth import require_auth
import os

router = APIRouter(prefix="/api/settings", tags=["settings"])


class AIModeRequest(BaseModel):
    mode: str  # "groq" or "local_ollama"


@router.get("/ai-mode")
def get_ai_mode(auth: Dict[str, Any] = Depends(require_auth)):
    from backend.services.ai_providers.registry import detect_active_provider
    return {
        "configured": config.AI_PROVIDER_MODE,
        "active": detect_active_provider(),
        "groq_key_set": bool(config.GROQ_API_KEY)
    }


@router.post("/ai-mode")
def set_ai_mode(req: AIModeRequest, auth: Dict[str, Any] = Depends(require_auth)):
    if req.mode not in ("groq", "local_ollama"):
        raise HTTPException(status_code=400, detail="Invalid mode")
    os.environ["MINEINTEL_AI_PROVIDER"] = req.mode
    config.AI_PROVIDER_MODE = req.mode
    # Persist to .env file
    env_path = config.BASE_DIR / ".env"
    try:
        lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
        lines = [l for l in lines if not l.startswith("MINEINTEL_AI_PROVIDER=")]
        lines.append(f"MINEINTEL_AI_PROVIDER={req.mode}")
        env_path.write_text("\n".join(lines), encoding="utf-8")
    except Exception:
        pass
    return {"success": True, "mode": req.mode}
