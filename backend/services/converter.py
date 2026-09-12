import io
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import pandas as pd

logger = logging.getLogger("mineintel.converter")

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import pypdf
except ImportError:
    pypdf = None


class MarkdownConverter:
    """Converts CSV and PDF files into structured, clean Markdown without data loss."""

    @staticmethod
    def _table_to_markdown(table: List[List[Any]]) -> str:
        """Converts a 2D list into a GitHub Flavored Markdown table."""
        if not table or not table[0]:
            return ""

        # Normalize rows to match header length
        header = [str(col).strip() if col is not None else "" for col in table[0]]
        num_cols = len(header)
        if num_cols == 0:
            return ""

        md_lines = []
        md_lines.append("| " + " | ".join(header) + " |")
        md_lines.append("| " + " | ".join(["---"] * num_cols) + " |")

        for row in table[1:]:
            normalized_row = []
            for i in range(num_cols):
                val = row[i] if i < len(row) else ""
                val_str = str(val).strip().replace("\n", " ") if val is not None else ""
                normalized_row.append(val_str)
            md_lines.append("| " + " | ".join(normalized_row) + " |")

        return "\n".join(md_lines) + "\n\n"

    @classmethod
    def convert_pdf_to_markdown(
        cls,
        file_path: Path,
        output_media_dir: Optional[Path] = None,
        max_pages: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Converts a PDF file into structured Markdown with extracted tables, text,
        and isolated media assets without premature truncation.
        Processes all pages by default (max_pages=None).
        """
        markdown_sections: List[str] = []
        total_pages = 0
        total_tables = 0
        extracted_images: List[Dict[str, Any]] = []
        extracted_audio: List[Dict[str, Any]] = []
        extracted_table_data: List[List[List[Any]]] = []

        media_dir = output_media_dir or (file_path.parent / "extracted_media")
        try:
            media_dir.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass

        # 1. Extract embedded visual images and attachments via pypdf
        if pypdf is not None:
            try:
                reader = pypdf.PdfReader(str(file_path))
                total_pages = len(reader.pages)

                for page_idx, page in enumerate(reader.pages, start=1):
                    if len(extracted_images) >= 12:
                        break
                    try:
                        for img_idx, img_file in enumerate(page.images, start=1):
                            if len(extracted_images) >= 12:
                                break
                            if len(img_file.data) < 2048:
                                continue
                            img_filename = f"p{page_idx}_img{img_idx}_{img_file.name}"
                            img_path = media_dir / img_filename
                            try:
                                img_path.write_bytes(img_file.data)
                                extracted_images.append({
                                    "page": page_idx,
                                    "index": img_idx,
                                    "name": img_filename,
                                    "path": str(img_path),
                                    "size_bytes": len(img_file.data)
                                })
                            except Exception as write_err:
                                logger.debug(f"Could not persist image {img_filename}: {write_err}")
                    except Exception as img_err:
                        logger.debug(f"Image extraction skipped on page {page_idx}: {img_err}")

                # Check attachments (audio/video/csv/etc.)
                if hasattr(reader, "attachments") and reader.attachments:
                    for name, data in reader.attachments.items():
                        ext = Path(name).suffix.lower()
                        media_type = "document"
                        if ext in [".mp3", ".wav", ".aac", ".ogg", ".m4a"]:
                            media_type = "audio"
                        elif ext in [".mp4", ".avi", ".mov", ".mkv"]:
                            media_type = "video"

                        media_path = media_dir / name
                        try:
                            raw_bytes = data[0] if isinstance(data, list) else data
                            media_path.write_bytes(raw_bytes)
                            extracted_audio.append({
                                "name": name,
                                "path": str(media_path),
                                "type": media_type,
                                "size_bytes": len(raw_bytes),
                                "inference_note": "Acoustic/telemetry media preserved. Speech transcription requires Whisper audio pipeline."
                            })
                        except Exception as att_err:
                            logger.debug(f"Attachment save error {name}: {att_err}")
            except Exception as pdf_read_err:
                logger.warning(f"pypdf reader initialization error: {pdf_read_err}")

        # 2. Extract layout, text, and tables with pdfplumber
        if pdfplumber is not None:
            try:
                with pdfplumber.open(file_path) as pdf:
                    total_pages = len(pdf.pages)
                    markdown_sections.append(f"# Document Overview: {file_path.name}\n")
                    markdown_sections.append(f"- **Total Pages:** {total_pages}\n")
                    if extracted_images:
                        markdown_sections.append(f"- **Extracted Visual Figures:** {len(extracted_images)} figures isolated for report publication\n")
                    if extracted_audio:
                        markdown_sections.append(f"- **Extracted Media Attachments:** {len(extracted_audio)} media files recorded (preserved)\n")
                    markdown_sections.append("\n---\n")

                    limit_pages = total_pages if max_pages is None else min(total_pages, max_pages)
                    for page_num in range(1, limit_pages + 1):
                        page = pdf.pages[page_num - 1]
                        markdown_sections.append(f"\n## Page {page_num}\n")

                        # Extract tables with high fidelity
                        tables = page.extract_tables()
                        if tables:
                            for table_idx, tbl in enumerate(tables, start=1):
                                total_tables += 1
                                extracted_table_data.append(tbl)
                                tbl_md = f"### Table {page_num}.{table_idx}\n" + cls._table_to_markdown(tbl)
                                markdown_sections.append(tbl_md)

                        # Extract textual content with structural layout
                        text = page.extract_text(layout=True)
                        if text and text.strip():
                            cleaned_lines = [line.rstrip() for line in text.splitlines() if line.strip()]
                            markdown_sections.append("### Content\n" + "\n".join(cleaned_lines) + "\n\n")

                    if max_pages is not None and total_pages > max_pages:
                        markdown_sections.append(f"\n\n*Note: Document contains {total_pages} total pages. First {max_pages} pages processed in primary pass.*\n")

            except Exception as plumber_err:
                logger.warning(f"pdfplumber extraction encountered error: {plumber_err}, falling back to pypdf text")
                if pypdf is not None:
                    try:
                        reader = pypdf.PdfReader(str(file_path))
                        markdown_sections.append(f"# Document Overview: {file_path.name}\n**Total Pages:** {len(reader.pages)}\n\n---\n")
                        pages_slice = reader.pages if max_pages is None else reader.pages[:max_pages]
                        for idx, p in enumerate(pages_slice, start=1):
                            ptxt = p.extract_text() or ""
                            if ptxt.strip():
                                markdown_sections.append(f"\n## Page {idx}\n\n{ptxt.strip()}\n\n")
                    except Exception as fallback_err:
                        logger.error(f"Fallback pypdf extraction also failed: {fallback_err}")
                        markdown_sections.append(f"# PDF Document: {file_path.name}\n\nUnable to extract raw text: {fallback_err}")

        elif pypdf is not None:
            try:
                reader = pypdf.PdfReader(str(file_path))
                total_pages = len(reader.pages)
                markdown_sections.append(f"# Document Overview: {file_path.name}\n**Total Pages:** {total_pages}\n\n---\n")
                pages_slice = reader.pages if max_pages is None else reader.pages[:max_pages]
                for page_num, page in enumerate(pages_slice, start=1):
                    txt = page.extract_text() or ""
                    if txt.strip():
                        markdown_sections.append(f"\n## Page {page_num}\n\n{txt.strip()}\n\n")
            except Exception as err:
                markdown_sections.append(f"# PDF Document: {file_path.name}\n\nExtraction error: {err}")
        else:
            markdown_sections.append(f"# PDF Document: {file_path.name}\n\nNeither pdfplumber nor pypdf available for extraction.")

        full_md = "\n".join(markdown_sections)

        pdf_records = []
        for tbl in extracted_table_data:
            if tbl and len(tbl) > 1:
                headers = [str(c or "").strip() for c in tbl[0]]
                for row in tbl[1:]:
                    row_dict = {}
                    for col_idx, h in enumerate(headers):
                        if h and col_idx < len(row):
                            val = row[col_idx]
                            row_dict[h] = str(val or "").strip()
                    if any(row_dict.values()):
                        pdf_records.append(row_dict)

        return {
            "markdown": full_md,
            "file_type": "pdf",
            "records": pdf_records,
            "extracted_images": extracted_images,
            "extracted_audio": extracted_audio,
            "has_multimedia": (len(extracted_images) > 0 or len(extracted_audio) > 0),
            "tables": extracted_table_data,
            "metadata": {
                "filename": file_path.name,
                "total_pages": total_pages,
                "total_tables_extracted": total_tables,
                "total_images_extracted": len(extracted_images),
                "total_audio_extracted": len(extracted_audio),
                "char_count": len(full_md)
            }
        }

    @classmethod
    def convert_csv_to_markdown(cls, file_path: Path, max_preview_rows: int = 100) -> Dict[str, Any]:
        """Converts a CSV/TSV file into structured Markdown with schema and statistical overview."""
        encodings = ["utf-8", "utf-8-sig", "latin1", "cp1252", "iso-8859-1"]
        df: Optional[pd.DataFrame] = None
        sep = "\t" if file_path.suffix.lower() == ".tsv" else None

        for enc in encodings:
            try:
                df = pd.read_csv(file_path, encoding=enc, sep=sep, engine="python" if sep is None else "c")
                break
            except Exception:
                continue

        if df is None:
            # Fallback simple read
            df = pd.read_csv(file_path, sep=None, engine="python")

        row_count, col_count = df.shape
        md_sections: List[str] = []
        md_sections.append(f"# CSV Dataset Overview: {file_path.name}\n")
        md_sections.append(f"- **Total Records:** {row_count:,}")
        md_sections.append(f"- **Total Columns:** {col_count}")
        md_sections.append(f"- **Column List:** {', '.join(df.columns.astype(str))}\n\n---\n")

        # Column Schema & Missing Values Table
        schema_rows = [["Column Name", "Data Type", "Non-Null Count", "Missing Count", "Unique Values"]]
        for col in df.columns:
            non_null = int(df[col].notnull().sum())
            missing = row_count - non_null
            unique = int(df[col].nunique())
            dtype = str(df[col].dtype)
            schema_rows.append([str(col), dtype, str(non_null), str(missing), str(unique)])

        md_sections.append("## Dataset Schema\n")
        md_sections.append(cls._table_to_markdown(schema_rows))

        # Numerical Summary Statistics (if numeric columns exist)
        numeric_df = df.select_dtypes(include=["number"])
        if not numeric_df.empty:
            md_sections.append("## Numerical Summary Statistics\n")
            desc = numeric_df.describe().T.reset_index()
            desc.rename(columns={"index": "Metric / Column"}, inplace=True)
            stats_rows = [desc.columns.tolist()] + desc.round(4).values.tolist()
            md_sections.append(cls._table_to_markdown(stats_rows))

        # Data Sample Preview
        md_sections.append(f"## Data Records Preview (Showing first {min(row_count, max_preview_rows)} rows)\n")
        preview_df = df.head(max_preview_rows)
        preview_rows = [preview_df.columns.tolist()] + preview_df.fillna("").values.tolist()
        md_sections.append(cls._table_to_markdown(preview_rows))

        full_md = "\n".join(md_sections)
        records = df.head(500).fillna("").to_dict(orient="records")

        return {
            "markdown": full_md,
            "file_type": "csv",
            "records": records,
            "dataframe": df,
            "extracted_images": [],
            "extracted_audio": [],
            "has_multimedia": False,
            "metadata": {
                "filename": file_path.name,
                "row_count": row_count,
                "column_count": col_count,
                "numeric_columns": numeric_df.columns.tolist(),
                "char_count": len(full_md)
            }
        }

    @classmethod
    def convert_excel_to_markdown(cls, file_path: Path, max_preview_rows: int = 100) -> Dict[str, Any]:
        """
        Converts a multi-sheet Excel spreadsheet (.xlsx, .xls) into structured Markdown.
        Reads all worksheets, extracts schemas, summaries, and structured records.
        """
        md_sections: List[str] = [f"# Excel Spreadsheet Dossier: {file_path.name}\n"]
        excel_data = pd.read_excel(file_path, sheet_name=None)
        all_records: List[Dict[str, Any]] = []
        total_rows = 0
        total_cols = 0
        sheet_names = list(excel_data.keys())

        md_sections.append(f"- **Workbook Sheets ({len(sheet_names)}):** {', '.join(sheet_names)}\n")
        md_sections.append("\n---\n")

        for s_idx, (sheet_name, df) in enumerate(excel_data.items(), start=1):
            s_rows, s_cols = df.shape
            total_rows += s_rows
            total_cols = max(total_cols, s_cols)

            md_sections.append(f"\n## Sheet {s_idx}: {sheet_name}\n")
            md_sections.append(f"- **Dimensions:** {s_rows} rows × {s_cols} columns\n")

            if df.empty:
                md_sections.append("*Sheet is empty.*\n")
                continue

            clean_df = df.copy()

            # Schema Table
            schema_rows = [["Column Name", "Data Type", "Non-Null Count", "Unique Values"]]
            for col in clean_df.columns:
                non_null = int(clean_df[col].notnull().sum())
                unique = int(clean_df[col].nunique())
                dtype = str(clean_df[col].dtype)
                schema_rows.append([str(col), dtype, str(non_null), str(unique)])

            md_sections.append("### Sheet Schema\n")
            md_sections.append(cls._table_to_markdown(schema_rows))

            # Numerical statistics
            numeric_df = clean_df.select_dtypes(include=["number"])
            if not numeric_df.empty:
                md_sections.append("### Sheet Statistical Summary\n")
                desc = numeric_df.describe().T.reset_index()
                desc.rename(columns={"index": "Metric / Column"}, inplace=True)
                stats_rows = [desc.columns.tolist()] + desc.round(4).values.tolist()
                md_sections.append(cls._table_to_markdown(stats_rows))

            # Data records preview
            md_sections.append(f"### Sheet Records Preview (Showing first {min(s_rows, max_preview_rows)} rows)\n")
            preview_df = clean_df.head(max_preview_rows)
            preview_rows = [preview_df.columns.tolist()] + preview_df.fillna("").values.tolist()
            md_sections.append(cls._table_to_markdown(preview_rows))

            if s_idx == 1:
                all_records = clean_df.head(500).fillna("").to_dict(orient="records")

        full_md = "\n".join(md_sections)
        first_df = list(excel_data.values())[0] if excel_data else pd.DataFrame()

        return {
            "markdown": full_md,
            "file_type": "xlsx",
            "records": all_records,
            "dataframe": first_df,
            "extracted_images": [],
            "extracted_audio": [],
            "has_multimedia": False,
            "metadata": {
                "filename": file_path.name,
                "sheet_count": len(sheet_names),
                "sheet_names": sheet_names,
                "total_rows": total_rows,
                "column_count": total_cols,
                "char_count": len(full_md)
            }
        }

    @classmethod
    def convert_docx_to_markdown(cls, file_path: Path) -> Dict[str, Any]:
        """Converts a Microsoft Word DOCX file into structured Markdown."""
        try:
            import docx
            doc = docx.Document(file_path)
            md_sections: List[str] = [f"# Word Document Dossier: {file_path.name}\n"]
            extracted_tables: List[List[List[Any]]] = []

            for p in doc.paragraphs:
                txt = p.text.strip()
                if not txt:
                    continue
                if p.style and p.style.name and p.style.name.startswith("Heading 1"):
                    md_sections.append(f"\n# {txt}\n")
                elif p.style and p.style.name and p.style.name.startswith("Heading 2"):
                    md_sections.append(f"\n## {txt}\n")
                elif p.style and p.style.name and p.style.name.startswith("Heading 3"):
                    md_sections.append(f"\n### {txt}\n")
                else:
                    md_sections.append(f"{txt}\n")

            for t_idx, table in enumerate(doc.tables, start=1):
                t_rows = []
                for row in table.rows:
                    t_rows.append([cell.text.strip() for cell in row.cells])
                if t_rows:
                    extracted_tables.append(t_rows)
                    md_sections.append(f"\n### Table {t_idx}\n" + cls._table_to_markdown(t_rows))

            docx_records = []
            for tbl in extracted_tables:
                if tbl and len(tbl) > 1:
                    headers = [str(c or "").strip() for c in tbl[0]]
                    for row in tbl[1:]:
                        row_dict = {}
                        for col_idx, h in enumerate(headers):
                            if h and col_idx < len(row):
                                val = row[col_idx]
                                row_dict[h] = str(val or "").strip()
                        if any(row_dict.values()):
                            docx_records.append(row_dict)

            full_md = "\n".join(md_sections)
            return {
                "markdown": full_md,
                "file_type": "docx",
                "records": docx_records,
                "extracted_images": [],
                "extracted_audio": [],
                "has_multimedia": False,
                "tables": extracted_tables,
                "metadata": {
                    "filename": file_path.name,
                    "paragraph_count": len(doc.paragraphs),
                    "table_count": len(doc.tables),
                    "char_count": len(full_md)
                }
            }
        except Exception as docx_err:
            return {
                "markdown": f"# Word Document: {file_path.name}\n\nExtraction error: {docx_err}",
                "file_type": "docx",
                "records": [],
                "extracted_images": [],
                "extracted_audio": [],
                "has_multimedia": False,
                "metadata": {"filename": file_path.name, "char_count": 0}
            }

    @classmethod
    def convert(cls, file_path: Path, output_media_dir: Optional[Path] = None) -> Dict[str, Any]:
        """Auto-detects file extension and converts to Markdown."""
        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            return cls.convert_pdf_to_markdown(file_path, output_media_dir=output_media_dir)
        elif suffix in [".csv", ".tsv", ".txt"]:
            return cls.convert_csv_to_markdown(file_path)
        elif suffix in [".xlsx", ".xls"]:
            return cls.convert_excel_to_markdown(file_path)
        elif suffix == ".docx":
            return cls.convert_docx_to_markdown(file_path)
        else:
            raise ValueError(f"Unsupported file format: '{suffix}'. Supported: .pdf, .csv, .tsv, .txt, .xlsx, .xls, .docx")
