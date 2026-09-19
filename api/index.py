import sys
import types
import traceback
from pathlib import Path

class DummyMock:
    def __getattr__(self, name):
        return DummyMock()
    def __call__(self, *args, **kwargs):
        return DummyMock()

def module_getattr(name):
    return DummyMock()

mock_modules = [
    'pandas', 'numpy', 'numpy.linalg', 'pdfplumber', 'pypdf', 'reportlab', 
    'reportlab.lib', 'reportlab.lib.pagesizes', 'reportlab.lib.styles',
    'reportlab.platypus', 'reportlab.pdfgen', 'docx', 'docx.shared', 
    'docx.enum', 'docx.enum.text', 'openpyxl', 'openpyxl.styles', 'matplotlib', 
    'matplotlib.pyplot', 'seaborn', 'wordcloud'
]

for mod_name in mock_modules:
    mod = types.ModuleType(mod_name)
    mod.__path__ = []
    mod.__getattr__ = module_getattr
    sys.modules[mod_name] = mod

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# TRICK VERCEL'S STATIC ANALYZER: This forces @vercel/python to bundle backend/
if False:
    from backend.main import app

# LAZY LOADING ASGI APP: Bypasses the 10-second AWS Lambda cold start init limit
_app_instance = None

async def app(scope, receive, send):
    if scope['type'] == 'http' and scope.get('path') == '/api/debug':
        import os
        debug_info = {
            "cwd": os.getcwd(),
            "env": dict(os.environ),
            "sys_path": sys.path
        }
        import json
        await send({
            'type': 'http.response.start',
            'status': 200,
            'headers': [(b'content-type', b'application/json')]
        })
        await send({
            'type': 'http.response.body',
            'body': json.dumps(debug_info).encode('utf-8')
        })
        return

    global _app_instance
    if _app_instance is None:
        try:
            from backend.main import app as real_app
            _app_instance = real_app
        except Exception as e:
            err_trace = traceback.format_exc()
            await send({
                'type': 'http.response.start',
                'status': 500,
                'headers': [(b'content-type', b'text/plain')]
            })
            await send({
                'type': 'http.response.body',
                'body': err_trace.encode('utf-8')
            })
            return
            
    await _app_instance(scope, receive, send)

