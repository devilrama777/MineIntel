import sys
from pathlib import Path
from unittest.mock import MagicMock

# Mock heavy modules that exceed Vercel's 250MB Lambda limit so they don't 
# crash the API with ModuleNotFoundError during initialization.
mock_modules = [
    'pandas', 'numpy', 'numpy.linalg', 'pdfplumber', 'pypdf', 'reportlab', 
    'reportlab.lib', 'reportlab.lib.pagesizes', 'reportlab.lib.styles',
    'reportlab.platypus', 'reportlab.pdfgen', 'docx', 'docx.shared', 
    'docx.enum', 'docx.enum.text', 'openpyxl', 'matplotlib', 'matplotlib.pyplot', 
    'seaborn', 'wordcloud'
]
for mod_name in mock_modules:
    sys.modules[mod_name] = MagicMock()

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.main import app  # noqa: E402,F401

