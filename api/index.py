import sys
import traceback
from pathlib import Path

class DummyMock:
    def __init__(self, name=""):
        self.__name__ = name
        self.__path__ = []
    def __getattr__(self, name):
        if name == "__path__":
            return []
        return DummyMock(name)
    def __call__(self, *args, **kwargs):
        return DummyMock()
    def __iter__(self):
        return iter([])

mock_modules = [
    'pandas', 'numpy', 'numpy.linalg', 'pdfplumber', 'pypdf', 'reportlab', 
    'reportlab.lib', 'reportlab.lib.pagesizes', 'reportlab.lib.styles',
    'reportlab.platypus', 'reportlab.pdfgen', 'docx', 'docx.shared', 
    'docx.enum', 'docx.enum.text', 'openpyxl', 'matplotlib', 'matplotlib.pyplot', 
    'seaborn', 'wordcloud', 'openpyxl.styles'
]
for mod_name in mock_modules:
    sys.modules[mod_name] = DummyMock()

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# TRICK VERCEL'S STATIC ANALYZER: This forces @vercel/python to bundle backend/
if False:
    from backend.main import app

# LAZY LOADING ASGI APP: Bypasses the 10-second AWS Lambda cold start init limit
_app_instance = None

async def app(scope, receive, send):
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

