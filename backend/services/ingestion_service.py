"""
MineIntel Phase 1: Unified Multi-File Evidence Ingestion Engine

Handles:
- Multi-file job and manifest generation
- Immutable raw-file preservation
- Cryptographic SHA-256 hashing and deduplication without file deletion
- Format-specific extraction:
    * PDF (text, tables, page markers)
    * Scanned PDF foundation (low-density detection, scan preservation)
    * DOCX (paragraph and table indexing)
    * XLSX (worksheets and cell coordinate ranges)
    * CSV / TSV (row line ranges and column schema)
    * PNG / JPG / JPEG (image dimensions, color mode, media tagging)
- Granular source/provenance references
- Normalized processed Markdown representation
- Synchronization with Ingestion Store (PostgreSQL / Local JSON)
"""
import hashlib
import json
import logging
import re
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from PIL import Image

from backend import config
from backend.services.converter import MarkdownConverter
from backend.services.ingestion_models import (
    EvidenceFileRecord,
    IngestionJobRecord,
    ProvenanceRecord,
)
from backend.services.ingestion_store import (
    find_file_by_hash,
    get_job,
    list_files_for_job,
    list_jobs,
    save_evidence_file,
    save_job,
)

logger = logging.getLogger("mineintel.ingestion_service")

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import docx
except ImportError:
    docx = None


class IngestionEngine:
    """Core engine for ingesting and processing evidence files with complete provenance tracking."""

    @staticmethod
    def compute_sha256(data: bytes) -> str:
        """Computes SHA-256 hexadecimal hash over raw file bytes."""
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitizes filename against path traversal and special characters."""
        clean = Path(filename).name
        clean = re.sub(r"[^\w\.-]", "_", clean)
        return clean[:120] or "evidence_file"

    @classmethod
    def extract_pdf(
        cls,
        raw_path: Path,
        media_dir: Path
    ) -> Tuple[str, str, List[ProvenanceRecord], Dict[str, Any]]:
        """
        Extracts PDF content with page-level provenance.
        Detects scanned PDFs (low character density per page) and establishes the foundation for Phase 2 OCR.
        """
        markdown_sections: List[str] = []
        provenance_list: List[ProvenanceRecord] = []
        total_pages = 0
        total_chars = 0
        total_tables = 0
        extracted_images_count = 0
        is_scanned = False

        if pdfplumber is not None:
            try:
                with pdfplumber.open(raw_path) as pdf:
                    total_pages = len(pdf.pages)
                    markdown_sections.append(f"# Evidence Dossier: {raw_path.name}\n")
                    markdown_sections.append(f"- **Total Pages:** {total_pages}\n---\n")

                    for page_num in range(1, total_pages + 1):
                        page = pdf.pages[page_num - 1]
                        page_provenance = f"Page {page_num}"
                        markdown_sections.append(f"\n## {page_provenance}\n")

                        # 1. Extract tables
                        tables = page.extract_tables() or []
                        for t_idx, tbl in enumerate(tables, start=1):
                            if tbl:
                                total_tables += 1
                                tbl_provenance = f"Page {page_num} Table {t_idx}"
                                tbl_md = MarkdownConverter._table_to_markdown(tbl)
                                markdown_sections.append(f"### Table {t_idx} (Source: {tbl_provenance})\n{tbl_md}")
                                provenance_list.append(
                                    ProvenanceRecord(
                                        source_type="pdf",
                                        provenance=tbl_provenance,
                                        page=page_num,
                                        table_index=t_idx,
                                        snippet=f"Table {t_idx} on Page {page_num} with {len(tbl)} rows."
                                    )
                                )

                        # 2. Extract textual content
                        text = (page.extract_text(layout=True) or "").strip()
                        total_chars += len(text)
                        if text:
                            lines = [line.rstrip() for line in text.splitlines() if line.strip()]
                            snippet = lines[0][:150] if lines else ""
                            markdown_sections.append(f"### Content (Source: {page_provenance})\n" + "\n".join(lines) + "\n\n")
                            provenance_list.append(
                                ProvenanceRecord(
                                    source_type="pdf",
                                    provenance=page_provenance,
                                    page=page_num,
                                    snippet=snippet
                                )
                            )
                        else:
                            markdown_sections.append(f"*(No selectable text on {page_provenance})*\n\n")

            except Exception as e:
                logger.warning(f"pdfplumber extraction encountered error on {raw_path.name}: {e}")

        # Fallback to pypdf if pdfplumber failed or extracted zero pages
        if total_pages == 0 and pypdf is not None:
            try:
                reader = pypdf.PdfReader(str(raw_path))
                total_pages = len(reader.pages)
                markdown_sections.append(f"# Evidence Dossier: {raw_path.name}\n- **Total Pages:** {total_pages}\n---\n")
                for page_num, p in enumerate(reader.pages, start=1):
                    page_provenance = f"Page {page_num}"
                    ptxt = (p.extract_text() or "").strip()
                    total_chars += len(ptxt)
                    markdown_sections.append(f"\n## {page_provenance}\n")
                    if ptxt:
                        markdown_sections.append(ptxt + "\n\n")
                        provenance_list.append(
                            ProvenanceRecord(
                                source_type="pdf",
                                provenance=page_provenance,
                                page=page_num,
                                snippet=ptxt[:150]
                            )
                        )
            except Exception as e:
                logger.warning(f"pypdf fallback failed on {raw_path.name}: {e}")

        # Extract embedded images for figures
        if pypdf is not None:
            try:
                reader = pypdf.PdfReader(str(raw_path))
                for p_idx, page in enumerate(reader.pages, start=1):
                    if extracted_images_count >= 10:
                        break
                    try:
                        for img_idx, img_file in enumerate(page.images, start=1):
                            if extracted_images_count >= 10:
                                break
                            if len(img_file.data) < 2048:
                                continue
                            img_name = f"p{p_idx}_fig{img_idx}_{img_file.name}"
                            img_dest = media_dir / img_name
                            img_dest.write_bytes(img_file.data)
                            extracted_images_count += 1
                            fig_provenance = f"Page {p_idx} Figure {img_idx}"
                            provenance_list.append(
                                ProvenanceRecord(
                                    source_type="pdf",
                                    provenance=fig_provenance,
                                    page=p_idx,
                                    snippet=f"Visual asset {img_name}"
                                )
                            )
                    except Exception:
                        pass
            except Exception:
                pass

        # Scanned PDF Detection Foundation:
        # If total character count is lower than 50 chars per page on average, this is primarily a scanned document
        avg_chars_per_page = (total_chars / total_pages) if total_pages > 0 else 0
        if total_pages > 0 and avg_chars_per_page < 50:
            is_scanned = True
            markdown_sections.insert(
                2,
                "> [!NOTE]\n"
                "> **Scanned Document Foundation**: Selectable text density is minimal "
                f"({total_chars} total characters across {total_pages} pages). "
                "Raw bitmap pages are preserved immutably for neural OCR processing in Phase 2.\n\n"
            )

        full_md = "\n".join(markdown_sections)
        file_type = "scanned_pdf" if is_scanned else "pdf"
        meta = {
            "total_pages": total_pages,
            "total_characters": total_chars,
            "avg_chars_per_page": round(avg_chars_per_page, 1),
            "total_tables": total_tables,
            "figures_extracted": extracted_images_count,
            "is_scanned_pdf": is_scanned
        }
        return full_md, file_type, provenance_list, meta

    @classmethod
    def extract_docx(
        cls,
        raw_path: Path
    ) -> Tuple[str, str, List[ProvenanceRecord], Dict[str, Any]]:
        """Extracts DOCX content with paragraph and table indexing provenance."""
        if docx is None:
            raise RuntimeError("python-docx library is not available for DOCX extraction.")

        doc = docx.Document(raw_path)
        markdown_sections: List[str] = [f"# Word Document Dossier: {raw_path.name}\n\n---\n"]
        provenance_list: List[ProvenanceRecord] = []
        para_count = 0
        table_count = 0

        # Paragraph extraction
        for p_idx, p in enumerate(doc.paragraphs, start=1):
            txt = p.text.strip()
            if not txt:
                continue
            para_count += 1
            prov = f"Para {p_idx}"
            style_name = (p.style.name or "") if p.style else ""
            if style_name.startswith("Heading 1"):
                markdown_sections.append(f"\n# {txt} <!-- Source: {prov} -->\n")
            elif style_name.startswith("Heading 2"):
                markdown_sections.append(f"\n## {txt} <!-- Source: {prov} -->\n")
            elif style_name.startswith("Heading 3"):
                markdown_sections.append(f"\n### {txt} <!-- Source: {prov} -->\n")
            else:
                markdown_sections.append(f"{txt} `[{prov}]`\n\n")

            provenance_list.append(
                ProvenanceRecord(
                    source_type="docx",
                    provenance=prov,
                    paragraph_index=p_idx,
                    snippet=txt[:150]
                )
            )

        # Table extraction
        for t_idx, table in enumerate(doc.tables, start=1):
            t_rows = []
            for row in table.rows:
                t_rows.append([cell.text.strip() for cell in row.cells])
            if t_rows:
                table_count += 1
                prov = f"Table {t_idx}"
                tbl_md = MarkdownConverter._table_to_markdown(t_rows)
                markdown_sections.append(f"\n### Table {t_idx} (Source: {prov})\n" + tbl_md)
                provenance_list.append(
                    ProvenanceRecord(
                        source_type="docx",
                        provenance=prov,
                        table_index=t_idx,
                        snippet=f"Table {t_idx} with {len(t_rows)} rows."
                    )
                )

        full_md = "\n".join(markdown_sections)
        meta = {
            "total_paragraphs": len(doc.paragraphs),
            "non_empty_paragraphs": para_count,
            "total_tables": table_count
        }
        return full_md, "docx", provenance_list, meta

    @classmethod
    def extract_xlsx(
        cls,
        raw_path: Path
    ) -> Tuple[str, str, List[ProvenanceRecord], Dict[str, Any]]:
        """Extracts multi-sheet Excel spreadsheet with sheet names and cell range bounds."""
        excel_data = pd.read_excel(raw_path, sheet_name=None)
        markdown_sections: List[str] = [f"# Excel Spreadsheet Dossier: {raw_path.name}\n"]
        sheet_names = list(excel_data.keys())
        markdown_sections.append(f"- **Worksheets ({len(sheet_names)}):** {', '.join(sheet_names)}\n---\n")

        provenance_list: List[ProvenanceRecord] = []
        total_rows = 0

        for s_idx, (sheet_name, df) in enumerate(excel_data.items(), start=1):
            s_rows, s_cols = df.shape
            total_rows += s_rows

            col_letter = chr(ord("A") + min(s_cols - 1, 25)) if s_cols > 0 else "A"
            cell_range = f"A1:{col_letter}{max(s_rows, 1)}"
            sheet_provenance = f"{sheet_name}!{cell_range}"

            markdown_sections.append(f"\n## Sheet {s_idx}: {sheet_name} (Source: `{sheet_provenance}`)\n")
            markdown_sections.append(f"- **Range:** `{cell_range}` ({s_rows} rows × {s_cols} columns)\n")

            if df.empty:
                markdown_sections.append("*Sheet is empty.*\n")
                continue

            clean_df = df.copy()

            # Schema Table
            schema_rows = [["Column Name", "Data Type", "Non-Null Count", "Unique Values"]]
            for col in clean_df.columns:
                non_null = int(clean_df[col].notnull().sum())
                unique = int(clean_df[col].nunique())
                dtype = str(clean_df[col].dtype)
                schema_rows.append([str(col), dtype, str(non_null), str(unique)])

            markdown_sections.append("### Sheet Schema\n")
            markdown_sections.append(MarkdownConverter._table_to_markdown(schema_rows))

            # Preview rows
            preview_limit = min(s_rows, 50)
            preview_range = f"A1:{col_letter}{preview_limit + 1}"
            preview_prov = f"{sheet_name}!{preview_range}"
            markdown_sections.append(f"### Records Preview (Showing first {preview_limit} rows from `{preview_prov}`)\n")
            preview_df = clean_df.head(preview_limit)
            preview_rows = [preview_df.columns.tolist()] + preview_df.fillna("").values.tolist()
            markdown_sections.append(MarkdownConverter._table_to_markdown(preview_rows))

            provenance_list.append(
                ProvenanceRecord(
                    source_type="xlsx",
                    provenance=sheet_provenance,
                    sheet=sheet_name,
                    range=cell_range,
                    snippet=f"{sheet_name}: {s_rows} rows, {s_cols} columns ({', '.join(str(c) for c in clean_df.columns[:5])})"
                )
            )

        full_md = "\n".join(markdown_sections)
        meta = {
            "sheet_count": len(sheet_names),
            "sheet_names": sheet_names,
            "total_rows": total_rows
        }
        return full_md, "xlsx", provenance_list, meta

    @classmethod
    def extract_csv(
        cls,
        raw_path: Path
    ) -> Tuple[str, str, List[ProvenanceRecord], Dict[str, Any]]:
        """Extracts CSV/TSV data with row line number provenance and schema overview."""
        encodings = ["utf-8", "utf-8-sig", "latin1", "cp1252"]
        df: Optional[pd.DataFrame] = None
        sep = "\t" if raw_path.suffix.lower() == ".tsv" else None

        for enc in encodings:
            try:
                df = pd.read_csv(raw_path, encoding=enc, sep=sep, engine="python" if sep is None else "c")
                break
            except Exception:
                continue

        if df is None:
            if raw_path.suffix.lower() in [".txt", ".md"]:
                content = raw_path.read_text(encoding="utf-8", errors="replace")
                lines = [l for l in content.splitlines() if l.strip()]
                prov_list = [
                    ProvenanceRecord(source_type="text", provenance=f"Para {i+1}", snippet=line[:150])
                    for i, line in enumerate(lines[:100])
                ]
                return content, "text", prov_list, {"line_count": len(lines)}
            df = pd.read_csv(raw_path, sep=None, engine="python")

        row_count, col_count = df.shape
        prov_citation = f"Rows 1-{min(row_count, 100)}"
        markdown_sections: List[str] = [
            f"# CSV Dataset Dossier: {raw_path.name}\n",
            f"- **Total Records:** {row_count:,}",
            f"- **Columns:** {col_count} ({', '.join(df.columns.astype(str))})\n---\n",
            "## Schema & Data Types\n"
        ]

        schema_rows = [["Column Name", "Data Type", "Non-Null Count", "Missing Count", "Unique Values"]]
        for col in df.columns:
            non_null = int(df[col].notnull().sum())
            missing = row_count - non_null
            unique = int(df[col].nunique())
            schema_rows.append([str(col), str(df[col].dtype), str(non_null), str(missing), str(unique)])

        markdown_sections.append(MarkdownConverter._table_to_markdown(schema_rows))

        preview_limit = min(row_count, 50)
        markdown_sections.append(f"## Data Records Preview (Source: `{prov_citation}`)\n")
        preview_df = df.head(preview_limit)
        preview_rows = [preview_df.columns.tolist()] + preview_df.fillna("").values.tolist()
        markdown_sections.append(MarkdownConverter._table_to_markdown(preview_rows))

        provenance_list = [
            ProvenanceRecord(
                source_type="csv",
                provenance=prov_citation,
                line_start=1,
                line_end=preview_limit,
                snippet=f"CSV with {row_count} rows, columns: {', '.join(str(c) for c in df.columns[:6])}"
            )
        ]

        full_md = "\n".join(markdown_sections)
        meta = {
            "row_count": row_count,
            "column_count": col_count,
            "columns": [str(c) for c in df.columns]
        }
        return full_md, "csv", provenance_list, meta

    @classmethod
    def extract_image(
        cls,
        raw_path: Path
    ) -> Tuple[str, str, List[ProvenanceRecord], Dict[str, Any]]:
        """Extracts image metadata, dimensions, color mode, and embeds media provenance."""
        with Image.open(raw_path) as img:
            width, height = img.size
            img_format = (img.format or raw_path.suffix.lstrip(".").upper())
            img_mode = img.mode

        img_provenance = f"{raw_path.name} ({width}x{height} {img_format})"
        md_sections = [
            f"# Visual Evidence Asset: {raw_path.name}\n\n---\n",
            "## Image Specifications\n",
            f"| Specification | Value |\n|---|---|\n"
            f"| **Filename** | `{raw_path.name}` |\n"
            f"| **Format** | {img_format} |\n"
            f"| **Dimensions** | {width} × {height} px |\n"
            f"| **Color Mode** | {img_mode} |\n"
            f"| **Source Reference** | `{img_provenance}` |\n\n",
            f"![Visual Evidence: {raw_path.name}]({raw_path.as_posix()})\n\n",
            "> [!NOTE]\n"
            "> Raw image asset preserved immutably. Specialized vision model analysis is scheduled for Phase 2+.\n"
        ]

        provenance_list = [
            ProvenanceRecord(
                source_type="image",
                provenance=img_provenance,
                dimensions=[width, height],
                snippet=f"Visual asset {raw_path.name} ({width}x{height}, {img_format}, mode={img_mode})"
            )
        ]

        full_md = "\n".join(md_sections)
        meta = {
            "width": width,
            "height": height,
            "format": img_format,
            "mode": img_mode
        }
        return full_md, "image", provenance_list, meta

    @classmethod
    def process_evidence_file(
        cls,
        job_id: str,
        owner_id: str,
        raw_filename: str,
        raw_bytes: bytes,
        job_dir: Path
    ) -> EvidenceFileRecord:
        """
        Processes a single uploaded file:
        1. Computes SHA-256 hash
        2. Detects duplicates against database/local index WITHOUT deleting files
        3. Immutably saves raw file in outputs/{job_id}/raw/
        4. Extracts normalized markdown and provenance references
        5. Writes outputs/{job_id}/normalized/{file_id}_normalized.md
        6. Persists EvidenceFileRecord in IngestionStore
        """
        file_id = f"ev_{uuid.uuid4().hex[:12]}"
        clean_name = cls.sanitize_filename(raw_filename)
        sha256 = cls.compute_sha256(raw_bytes)
        file_size = len(raw_bytes)
        suffix = Path(clean_name).suffix.lower()

        # 1. Immutable Raw Storage
        raw_dir = job_dir / "raw"
        raw_dir.mkdir(parents=True, exist_ok=True)
        raw_file_path = raw_dir / f"{file_id}_{clean_name}"
        raw_file_path.write_bytes(raw_bytes)

        # 2. Duplicate Detection (Preserves raw file, links duplicate)
        existing = find_file_by_hash(sha256, owner_id=owner_id)
        is_duplicate = False
        duplicate_of_id = None
        if existing and existing.get("file_id") != file_id:
            is_duplicate = True
            duplicate_of_id = existing.get("file_id")
            logger.info(f"File {clean_name} is duplicate of existing file {duplicate_of_id} (hash={sha256[:12]}). Preserving raw upload.")

        # 3. Format-specific extraction
        media_dir = job_dir / "extracted_media"
        media_dir.mkdir(parents=True, exist_ok=True)
        normalized_dir = job_dir / "normalized"
        normalized_dir.mkdir(parents=True, exist_ok=True)

        status = "completed"
        error_msg = None
        provenance_records: List[ProvenanceRecord] = []
        meta: Dict[str, Any] = {}
        normalized_md = ""
        file_type = suffix.lstrip(".") or "unknown"

        try:
            if suffix == ".pdf":
                normalized_md, file_type, provenance_records, meta = cls.extract_pdf(raw_file_path, media_dir)
            elif suffix == ".docx":
                normalized_md, file_type, provenance_records, meta = cls.extract_docx(raw_file_path)
            elif suffix in [".xlsx", ".xls"]:
                normalized_md, file_type, provenance_records, meta = cls.extract_xlsx(raw_file_path)
            elif suffix in [".csv", ".tsv", ".txt", ".md"]:
                normalized_md, file_type, provenance_records, meta = cls.extract_csv(raw_file_path)
            elif suffix in [".png", ".jpg", ".jpeg"]:
                normalized_md, file_type, provenance_records, meta = cls.extract_image(raw_file_path)
            else:
                # Unsupported format fallback
                file_type = "unsupported"
                status = "failed"
                error_msg = f"Unsupported file format: '{suffix}'"
                normalized_md = f"# Evidence File: {clean_name}\n\nUnsupported format: `{suffix}`\n"
        except Exception as extract_err:
            logger.error(f"Extraction failed for {clean_name}: {extract_err}")
            status = "failed"
            error_msg = str(extract_err)
            normalized_md = f"# Evidence File: {clean_name}\n\nExtraction error: {extract_err}\n"

        # 4. Save normalized output
        norm_path = normalized_dir / f"{file_id}_normalized.md"
        norm_path.write_text(normalized_md, encoding="utf-8")

        prov_dicts = [p.to_dict() if hasattr(p, "to_dict") else p for p in provenance_records]

        evidence_record = EvidenceFileRecord(
            file_id=file_id,
            job_id=job_id,
            owner_id=owner_id,
            filename=clean_name,
            file_type=file_type,
            file_size=file_size,
            sha256_hash=sha256,
            is_duplicate=is_duplicate,
            duplicate_of_file_id=duplicate_of_id,
            status=status,
            error_message=error_msg,
            raw_path=str(raw_file_path),
            normalized_path=str(norm_path),
            provenance=prov_dicts,
            metadata=meta,
            created_at=int(time.time() * 1000)
        )

        save_evidence_file(evidence_record.to_dict())

        # 5. Extract and persist structured evidence layer
        try:
            from backend.services.evidence_extractor import evidence_extractor
            from backend.services import evidence_store
            ev_items = evidence_extractor.extract_from_file_record(evidence_record.to_dict())
            evidence_store.save_evidence_items([item.to_dict() for item in ev_items])
        except Exception as ev_err:
            logger.warning(f"Structured evidence extraction error for {clean_name}: {ev_err}")

        return evidence_record

    @classmethod
    def create_ingestion_job(
        cls,
        owner_id: str,
        files: List[Tuple[str, bytes]]
    ) -> Dict[str, Any]:
        """
        Creates and executes a multi-file Ingestion Job:
        - Allocates job_id
        - Processes all files sequentially with immutable raw copies
        - Generates structured evidence items with stable IDs and classifications
        - Constructs job manifest.json with evidence summary
        - Updates job state in Ingestion Store
        """
        now_ms = int(time.time() * 1000)
        job_id = f"ingest_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        job_dir = config.OUTPUTS_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        job_record = IngestionJobRecord(
            job_id=job_id,
            owner_id=owner_id,
            status="processing",
            total_files=len(files),
            completed_files=0,
            failed_files=0,
            created_at=now_ms,
            updated_at=now_ms,
            manifest_path=str(job_dir / "manifest.json")
        )
        save_job(job_record.to_dict())

        evidence_files: List[EvidenceFileRecord] = []
        completed_count = 0
        failed_count = 0

        for filename, file_bytes in files:
            rec = cls.process_evidence_file(
                job_id=job_id,
                owner_id=owner_id,
                raw_filename=filename,
                raw_bytes=file_bytes,
                job_dir=job_dir
            )
            evidence_files.append(rec)
            if rec.status == "completed":
                completed_count += 1
            else:
                failed_count += 1

        overall_status = "completed" if failed_count == 0 else ("failed" if completed_count == 0 else "completed")

        job_record.status = overall_status
        job_record.completed_files = completed_count
        job_record.failed_files = failed_count
        job_record.updated_at = int(time.time() * 1000)
        job_record.files = evidence_files

        # Compute evidence breakdown summary for this job
        manifest_data = job_record.to_dict()
        try:
            from backend.services import evidence_store
            manifest_data["evidence_summary"] = evidence_store.get_job_evidence_summary(job_id=job_id, owner_id=owner_id)
        except Exception:
            manifest_data["evidence_summary"] = {}

        # Write manifest.json
        manifest_file = job_dir / "manifest.json"
        manifest_file.write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")

        save_job(manifest_data)
        return manifest_data


# Singleton engine instance
ingestion_engine = IngestionEngine()
