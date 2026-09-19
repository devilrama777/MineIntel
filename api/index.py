import sys
import traceback
from pathlib import Path

class DummyMock:
    def __getattr__(self, name):
        return DummyMock()
    def __call__(self, *args, **kwargs):
        return DummyMock()

mock_modules = [
    'pandas', 'numpy', 'numpy.linalg', 'pdfplumber', 'pypdf', 'reportlab', 
    'reportlab.lib', 'reportlab.lib.pagesizes', 'reportlab.lib.styles',
    'reportlab.platypus', 'reportlab.pdfgen', 'docx', 'docx.shared', 
    'docx.enum', 'docx.enum.text', 'openpyxl', 'matplotlib', 'matplotlib.pyplot', 
    'seaborn', 'wordcloud'
]
for mod_name in mock_modules:
    sys.modules[mod_name] = DummyMock()

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from backend.main import app  # noqa: E402,F401
except Exception as e:
    err_trace = traceback.format_exc()
    
    async def app(scope, receive, send):
        assert scope['type'] == 'http'
        await send({
            'type': 'http.response.start',
            'status': 500,
            'headers': [(b'content-type', b'text/plain')]
        })
        await send({
            'type': 'http.response.body',
            'body': err_trace.encode('utf-8')
        })


