import sys
import traceback
from pathlib import Path

# Add project root and api directory to Python module search path
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent

for p in [str(root_dir), str(current_dir), str(Path.cwd())]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.main import app
except Exception as exc:
    import logging
    logging.exception("Failed to import backend.main in api/index.py")
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="Mineintel Enclave Fallback")
    tb = traceback.format_exc()

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def catch_all_fallback(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "status": "initialization_error",
                "message": "Backend initialization exception",
                "error": str(exc),
                "traceback": tb
            }
        )

