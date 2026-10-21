"""
MineIntel Document Extractor Service
Guards against binary garbage (PK..., %PDF, null bytes) and extracts
clean, structured text from DOCX, XLSX, PDF, and text documents.
"""
import io
import logging
from typing import Any, Optional

logger = logging.getLogger("mineintel.document_extractor")


def _looks_binary(text: str) -> bool:
    """
    Checks if extracted text contains raw binary signatures or control characters.
    Catches PK zip headers (DOCX/XLSX raw bytes), PDF headers, and null bytes.
    """
    if not text:
        return False
    # Explicit binary header / magic byte signatures
    if "PK\x03\x04" in text or text.startswith("PK"):
        return True
    if "%PDF" in text:
        return True
    if "\x00" in text:
        return True

    # Check for excessive unprintable control characters (excluding newline, cr, tab)
    sample = text[:1000]
    control_chars = sum(1 for c in sample if ord(c) < 32 and c not in "\n\r\t")
    if control_chars > 5:
        return True

    return False


def _extract_docx(data: bytes) -> str:
    """Extracts paragraphs and tables from DOCX binary bytes using python-docx."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(data))
        paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        table_lines = []
        for t in doc.tables:
            for row in t.rows:
                cells = [c.text.strip() for c in row.cells]
                if any(cells):
                    table_lines.append(" | ".join(cells))

        combined = "\n".join(paras)
        if table_lines:
            combined += "\n\n--- Tables ---\n" + "\n".join(table_lines)
        return combined
    except Exception as e:
        logger.warning(f"DOCX extraction failed: {e}")
        return ""


def _extract_xlsx(data: bytes) -> str:
    """Extracts sheets and tabular data from XLSX/XLS binary bytes using pandas and openpyxl."""
    try:
        import pandas as pd
        xl = pd.ExcelFile(io.BytesIO(data), engine="openpyxl")
        sheets_text = []
        for sheet_name in xl.sheet_names:
            try:
                df = pd.read_excel(xl, sheet_name=sheet_name)
                csv_repr = df.to_csv(index=False)
                if csv_repr.strip():
                    sheets_text.append(f"Sheet: {sheet_name}\n{csv_repr}")
            except Exception as sheet_err:
                logger.warning(f"Error reading sheet {sheet_name}: {sheet_err}")

        return "\n\n".join(sheets_text)
    except Exception as e:
        # Fallback without engine specified if xls
        try:
            import pandas as pd
            df = pd.read_excel(io.BytesIO(data))
            return df.to_csv(index=False)
        except Exception as e2:
            logger.warning(f"XLSX extraction failed: {e2}")
            return ""


def _extract_pdf(data: bytes) -> str:
    """Extracts text pages from PDF binary bytes using pypdf."""
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(data))
        pages_text = []
        for p in reader.pages[:30]:
            txt = p.extract_text()
            if txt and txt.strip():
                pages_text.append(txt.strip())
        return "\n\n".join(pages_text)
    except Exception as e:
        logger.warning(f"PDF extraction failed: {e}")
        return ""


def _extract_text(data: bytes) -> str:
    """Decodes plain text files with UTF-8 or latin-1 fallback."""
    try:
        return data.decode("utf-8", errors="ignore")
    except Exception:
        return data.decode("latin-1", errors="ignore")


def build_evidence_block(filename: str, data: Any) -> str:
    """
    Extracts text from file data and builds a clean evidence block.
    Guards against binary garbage: if binary content is detected,
    returns an explicit error message instead of corrupt bytes.
    """
    fbytes: bytes
    if isinstance(data, bytes):
        fbytes = data
    elif isinstance(data, str):
        # If already string, check if it was raw binary decoded naively
        if _looks_binary(data):
            return f"--- SOURCE FILE: {filename} ---\n[ERROR: Binary content detected. Text extraction failed. Do not reference this file.]"
        return f"--- SOURCE FILE: {filename} ---\n{data.strip()[:12000]}"
    else:
        try:
            fbytes = bytes(data)
        except Exception:
            return f"--- SOURCE FILE: {filename} ---\n[ERROR: Unsupported data format. Text extraction failed.]"

    name_lower = (filename or "").lower()
    extracted_text = ""

    if name_lower.endswith(".docx"):
        extracted_text = _extract_docx(fbytes)
    elif name_lower.endswith((".xlsx", ".xls")):
        extracted_text = _extract_xlsx(fbytes)
    elif name_lower.endswith(".pdf"):
        extracted_text = _extract_pdf(fbytes)
    elif name_lower.endswith((".txt", ".md", ".csv", ".tsv", ".json", ".log")):
        extracted_text = _extract_text(fbytes)
    else:
        # Fallback
        extracted_text = _extract_text(fbytes)

    # FINAL SAFETY CHECK: Guard against binary garbage (e.g. PK..., %PDF, null bytes)
    if _looks_binary(extracted_text):
        return f"--- SOURCE FILE: {filename} ---\n[ERROR: Binary content detected. Text extraction failed. Do not reference this file.]"

    if not extracted_text.strip():
        if isinstance(data, (bytes, bytearray)) and (b"PK\x03\x04" in data or b"%PDF" in data or b"\x00" in data[:100]):
            return f"--- SOURCE FILE: {filename} ---\n[ERROR: Binary content detected. Text extraction failed. Do not reference this file.]"
        return f"--- SOURCE FILE: {filename} ---\n[WARNING: Empty document or no text could be extracted.]"

    return f"--- SOURCE FILE: {filename} ---\n{extracted_text.strip()[:12000]}"
