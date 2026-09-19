import sys
from pathlib import Path
from unittest.mock import MagicMock

# Mock heavy modules that exceed Vercel's 250MB Lambda limit so they don't 
# crash the API with ModuleNotFoundError during initialization.
for mod_name in ['pandas', 'numpy', 'pdfplumber', 'pypdf', 'reportlab', 
                 'reportlab.lib', 'reportlab.platypus', 'docx', 'openpyxl']:
    sys.modules[mod_name] = MagicMock()

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.main import app  # noqa: E402,F401

