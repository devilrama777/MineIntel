import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

_app_instance = None

async def app(scope, receive, send):
    global _app_instance
    if _app_instance is None:
        from backend.main import app as real_app
        _app_instance = real_app
    await _app_instance(scope, receive, send)
