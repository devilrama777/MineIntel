import os
from pathlib import Path
from typing import Optional, Set

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR / "data"
PROMPTS_DIR = BACKEND_DIR / "prompts"

IS_VERCEL = bool(os.getenv("VERCEL") == "1" or os.getenv("VERCEL_ENV"))

if IS_VERCEL:
    WORK_DIR = Path("/tmp")
    UPLOADS_DIR = WORK_DIR / "uploads"
    OUTPUTS_DIR = WORK_DIR / "outputs"
    REPORTS_DIR = OUTPUTS_DIR / "reports"
    REPORTED_DATA_DIR = WORK_DIR / "reported_data"
    PROCESSED_OUTPUT_DIR = WORK_DIR / "processed_output"
else:
    UPLOADS_DIR = BASE_DIR / "uploads"
    OUTPUTS_DIR = BASE_DIR / "outputs"
    REPORTS_DIR = OUTPUTS_DIR / "reports"
    REPORTED_DATA_DIR = BASE_DIR / "reported_data"
    PROCESSED_OUTPUT_DIR = BASE_DIR / "processed_output"

STATIC_REPORTS_DIR = OUTPUTS_DIR / "reports" if IS_VERCEL else (BASE_DIR / "outputs" / "reports")
PUBLIC_REPORTS_DIR = BASE_DIR / "public" / "reports"

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
        DATA_DIR / safe_name,
        REPORTED_DATA_DIR / safe_name,
        BASE_DIR / "reported_data" / safe_name,
        BASE_DIR / "default_data_backup" / safe_name,
        BASE_DIR / "processed_output" / safe_name
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
ALLOWED_EXTENSIONS: Set[str] = {".pdf", ".csv", ".tsv", ".txt"}

# Security & Authentication configurations
CORS_ORIGINS = [orig.strip() for orig in os.getenv("CORS_ORIGINS", "*").split(",") if orig.strip()]
AUTH_OFFICER_ID = os.getenv("AUTH_OFFICER_ID", "MOC-7890")
AUTH_SECRET_PASSWORD = os.getenv("AUTH_SECRET_PASSWORD", "SecureEnclave2026!")
JWT_SECRET = os.getenv("JWT_SECRET", "sih-mining-enclave-secret-key-2026-secure")
SESSION_EXPIRY_HOURS = int(os.getenv("SESSION_EXPIRY_HOURS", "24"))

# Bounded chunking parameters for large documents
MAX_CHUNK_CHARS = int(os.getenv("MAX_CHUNK_CHARS", "8000"))
CHUNK_OVERLAP_CHARS = int(os.getenv("CHUNK_OVERLAP_CHARS", "500"))

# Ollama & Model configurations
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LLAMA_MODEL = os.getenv("LLAMA_MODEL", "llama3.1:latest")
GEMMA_MODEL = os.getenv("GEMMA_MODEL", "gemma4:latest")
GEMMA_FALLBACK_MODEL = os.getenv("GEMMA_FALLBACK_MODEL", "llama3.1:latest")

# Default Request Timeout for Local LLM (seconds)
# In serverless/Vercel, timeout is set lower (e.g. 5s) to avoid gateway 504s
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "8" if IS_VERCEL else "120"))
