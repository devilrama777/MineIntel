import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from backend.main import app  # noqa: E402,F401
except Exception as e:
    import traceback
    err_msg = traceback.format_exc().encode('utf-8')
    
    async def app(scope, receive, send):
        if scope['type'] == 'http':
            await send({
                'type': 'http.response.start',
                'status': 500,
                'headers': [
                    (b'content-type', b'text/plain'),
                ]
            })
            await send({
                'type': 'http.response.body',
                'body': err_msg,
            })
