import os
from pathlib import Path
from typing import Optional, Set

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR / "data"
PROMPTS_DIR = BACKEND_DIR / "prompts"

def _sync_env_file(path: Path) -> None:
    """Safely loads environment variables from a .env file, with dotenv or fallback."""
    if not path.exists() or not path.is_file():
        return
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=path, override=False)
    except Exception:
        pass
    try:
        content = path.read_text(encoding="utf-8")
        for line in content.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("\"'").strip()
                if k not in os.environ:
                    os.environ[k] = v
    except Exception:
        pass

# Load local workspace environment variables securely if .env is present
_sync_env_file(BASE_DIR / ".env")


IS_VERCEL = bool(
    os.getenv("VERCEL") == "1" or 
    os.getenv("VERCEL_ENV") or 
    os.getenv("AWS_EXECUTION_ENV") or 
    os.getenv("AWS_LAMBDA_FUNCTION_NAME") or
    str(BASE_DIR).startswith("/var/task")
)

# --- Startup diagnostic (visible in Vercel function logs) ---
import logging as _logging
_startup_logger = _logging.getLogger("mineintel.config")

_officer_id_set = bool(os.getenv("MINEINTEL_OFFICER_ID") or os.getenv("AUTH_OFFICER_ID"))
_auth_pw_set = bool(os.getenv("MINEINTEL_AUTH_PASSWORD") or os.getenv("AUTH_SECRET_PASSWORD"))

if IS_VERCEL and not (_officer_id_set and _auth_pw_set):
    _startup_logger.critical(
        "PRODUCTION MISCONFIGURATION: Master authentication environment variables are not set. "
        "Set MINEINTEL_OFFICER_ID and MINEINTEL_AUTH_PASSWORD in the Vercel dashboard under "
        "Project → Settings → Environment Variables. Without these, all login attempts will "
        "return HTTP 503."
    )
elif not (_officer_id_set and _auth_pw_set):
    _startup_logger.warning(
        "Master auth env vars (MINEINTEL_OFFICER_ID / MINEINTEL_AUTH_PASSWORD) are not set. "
        "Login will only work if normal users exist in the database. "
        "See .env.example for required variables."
    )

if IS_VERCEL:
    WORK_DIR = Path("/tmp")
    DATA_DIR = WORK_DIR / "data"
    UPLOADS_DIR = WORK_DIR / "uploads"
    OUTPUTS_DIR = WORK_DIR / "outputs"
    REPORTS_DIR = OUTPUTS_DIR / "reports"
    REPORTED_DATA_DIR = WORK_DIR / "reported_data"
    PROCESSED_OUTPUT_DIR = WORK_DIR / "processed_output"
else:
    DATA_DIR = BACKEND_DIR / "data"
    UPLOADS_DIR = BASE_DIR / "uploads"
    OUTPUTS_DIR = BASE_DIR / "outputs"
    REPORTS_DIR = OUTPUTS_DIR / "reports"
    REPORTED_DATA_DIR = BASE_DIR / "reported_data"
    PROCESSED_OUTPUT_DIR = BASE_DIR / "processed_output"

STATIC_REPORTS_DIR = OUTPUTS_DIR / "reports" if IS_VERCEL else (BASE_DIR / "outputs" / "reports")

for d in (UPLOADS_DIR, OUTPUTS_DIR, REPORTS_DIR, REPORTED_DATA_DIR, PROCESSED_OUTPUT_DIR, DATA_DIR):
    try:
        d.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass


def find_data_file(filename: str) -> Optional[Path]:
    """Finds a dataset or output file searching priority order. Sanitizes filename to prevent path traversal."""
    # Sanitize filename to prevent path traversal
    safe_name = Path(filename).name
    candidates = [
        PROCESSED_OUTPUT_DIR / safe_name,
        OUTPUTS_DIR / safe_name,
        DATA_DIR / safe_name
    ]
    for c in candidates:
        if c.exists() and c.is_file():
            return c
    return None


def read_data_text(filename: str, fallback_default: str = "") -> str:
    """Safely reads a text file from any candidate location."""
    p = find_data_file(filename)
    if p and p.exists():
        try:
            return p.read_text(encoding="utf-8")
        except Exception:
            pass
    return fallback_default


# Upload limits and validation
MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(50 * 1024 * 1024)))  # 50 MB
ALLOWED_EXTENSIONS: Set[str] = {".pdf", ".csv", ".tsv", ".txt", ".xlsx", ".xls", ".docx", ".png", ".jpg", ".jpeg"}

# Security & Authentication configurations
# Production credentials are supplied ONLY through secure environment configuration
CORS_ORIGINS = [orig.strip() for orig in os.getenv("CORS_ORIGINS", "*").split(",") if orig.strip()]
AUTH_OFFICER_ID = os.getenv("MINEINTEL_OFFICER_ID") or os.getenv("AUTH_OFFICER_ID", "")
AUTH_SECRET_PASSWORD = os.getenv("MINEINTEL_AUTH_PASSWORD") or os.getenv("AUTH_SECRET_PASSWORD", "")
JWT_SECRET = os.getenv("MINEINTEL_JWT_SECRET") or os.getenv("JWT_SECRET", "sih-mining-enclave-secret-key-2026-secure")
SESSION_EXPIRY_HOURS = int(os.getenv("SESSION_EXPIRY_HOURS", "24"))
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or os.getenv("MineIntel_DATABASE_URL") or os.getenv("MineIntel_POSTGRES_URL") or ""


def refresh_local_env() -> None:
    """Ensures local .env is loaded and synchronized with environment when not on Vercel."""
    if not IS_VERCEL:
        for path in (BASE_DIR / ".env", Path.cwd() / ".env"):
            if path.exists() and path.is_file():
                _sync_env_file(path)
                break


def get_database_url() -> str:
    """Returns PostgreSQL connection string if configured in environment."""
    if not IS_VERCEL:
        refresh_local_env()
    val = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or os.getenv("MineIntel_DATABASE_URL")
        or os.getenv("MineIntel_POSTGRES_URL")
        or DATABASE_URL
    )
    if isinstance(val, str):
        val = val.strip().strip("\"'").strip()
    return val or ""


def get_auth_officer_id() -> str:
    """Returns officer ID dynamically checking environment or configured default."""
    if not IS_VERCEL:
        refresh_local_env()
    val = os.getenv("MINEINTEL_OFFICER_ID") or os.getenv("AUTH_OFFICER_ID") or AUTH_OFFICER_ID
    if isinstance(val, str):
        val = val.strip().strip("\"'").strip()
    return val or ""


def get_auth_secret_password() -> str:
    """Returns secret password dynamically checking environment or configured default."""
    if not IS_VERCEL:
        refresh_local_env()
    val = os.getenv("MINEINTEL_AUTH_PASSWORD") or os.getenv("AUTH_SECRET_PASSWORD") or AUTH_SECRET_PASSWORD
    if isinstance(val, str):
        val = val.strip().strip("\"'").strip()
    return val or ""


# Bounded chunking parameters for large documents
MAX_CHUNK_CHARS = int(os.getenv("MAX_CHUNK_CHARS", "8000"))
CHUNK_OVERLAP_CHARS = int(os.getenv("CHUNK_OVERLAP_CHARS", "500"))

# Sole AI Provider Configuration: Local Ollama Only
AI_PROVIDER = os.getenv("MINEINTEL_AI_PROVIDER", "local_ollama")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")
CLOUD_AI_TIMEOUT = int(os.getenv("CLOUD_AI_TIMEOUT", "30"))

# Local Ollama AI Configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
LOCAL_MODEL_QWEN3 = os.getenv("MINEINTEL_LOCAL_MODEL", "qwen2.5:7b")
LOCAL_MODEL_QWEN3_VL = os.getenv("MINEINTEL_LOCAL_VL_MODEL", "qwen2-vl:7b")
LOCAL_AI_TIMEOUT = int(os.getenv("LOCAL_AI_TIMEOUT", "60"))

# Legacy model name aliases for backward-compatible pipeline invocations
LLAMA_MODEL = LOCAL_MODEL_QWEN3
GEMMA_MODEL = LOCAL_MODEL_QWEN3
GEMMA_FALLBACK_MODEL = LOCAL_MODEL_QWEN3

# Request timeout (seconds)
LLM_TIMEOUT = LOCAL_AI_TIMEOUT

