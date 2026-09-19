import sys
from pathlib import Path
from unittest.mock import MagicMock

class MockImporter:
    def __init__(self, mock_modules):
        self.mock_modules = mock_modules
    
    def find_spec(self, fullname, path, target=None):
        if any(fullname == m or fullname.startswith(m + '.') for m in self.mock_modules):
            import importlib.util
            import importlib.machinery
            class MockLoader(importlib.machinery.BuiltinImporter):
                @classmethod
                def exec_module(cls, module):
                    pass
                @classmethod
                def create_module(cls, spec):
                    mock = MagicMock(name=fullname)
                    mock.__path__ = []
                    return mock
            return importlib.util.spec_from_loader(fullname, MockLoader())
        return None

sys.meta_path.insert(0, MockImporter(['pandas', 'numpy', 'pdfplumber', 'pypdf', 
                                      'reportlab', 'docx', 'openpyxl', 'matplotlib']))

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.main import app  # noqa: E402,F401

