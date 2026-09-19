"""
MineIntel Phase 2: Structured Evidence Extractor

Transforms raw ingested files into the Raw -> Processed -> Derived evidence hierarchy:
- Generates stable, reproducible, content-addressed evidence IDs (e.g. EVD-A1B2C3D4E5F6)
- Preserves immutable raw-source references
- Extracts granular source provenance:
    * PDF: Page numbers and Table indices
    * DOCX: Paragraph indices and Table indices
    * XLSX: Sheet names and cell coordinate ranges
    * CSV: Row ranges and column schema
    * Images: Dimensions, format, and media specifications
- Strict evidence classification:
    * LOCKED FACT (source-faithful exact numbers, dates, codes, tables, specifications)
    * CALCULATED VALUE (deterministic sums, counts, averages, variances derived from locked facts)
    * SUMMARIZABLE TEXT (source paragraphs, inspection narratives, observational logs)
    * AI ANALYSIS (analytical deductions and pattern identifications)
    * AI-GENERATED CAPTION (figure and media asset descriptions)
    * AI INTERPRETATION (evaluative synthesis and probabilistic insights)
- Links derived items back to parent source evidence IDs (derived_from_ids)
"""
import hashlib
import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from PIL import Image

from backend.services.evidence_models import (
    EvidenceClassification,
    EvidenceLayer,
    StructuredEvidenceItem,
)
from backend.services.ingestion_models import EvidenceFileRecord

logger = logging.getLogger("mineintel.evidence_extractor")

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import docx
except ImportError:
    docx = None


class EvidenceExtractor:
    """Extracts, classifies, and derives structured evidence items from ingested files."""

    @staticmethod
    def generate_stable_id(prefix: str, content_key: str) -> str:
        """Generates a stable, reproducible, content-addressed evidence ID."""
        digest = hashlib.sha256(content_key.encode("utf-8")).hexdigest()[:12].upper()
        return f"EVD-{prefix}-{digest}"

    @classmethod
    def extract_from_file_record(
        cls,
        file_rec: Dict[str, Any]
    ) -> List[StructuredEvidenceItem]:
        """
        Extracts raw, processed, and derived evidence items from an EvidenceFileRecord.
        """
        evidence_items: List[StructuredEvidenceItem] = []
        job_id = file_rec["job_id"]
        file_id = file_rec["file_id"]
        owner_id = file_rec["owner_id"]
        filename = file_rec["filename"]
        file_type = file_rec.get("file_type", "")
        raw_path_str = file_rec.get("raw_path", "")
        sha256 = file_rec.get("sha256_hash", "")
        file_size = file_rec.get("file_size", 0)
        raw_path = Path(raw_path_str) if raw_path_str else None
        now_ms = int(time.time() * 1000)

        raw_ref = {
            "file_id": file_id,
            "filename": filename,
            "raw_path": raw_path_str,
            "sha256_hash": sha256,
            "file_size": file_size
        }

        # -----------------------------------------------------------------
        # 1. RAW LAYER: Immutable Source File Evidence
        # -----------------------------------------------------------------
        raw_ev_id = cls.generate_stable_id("RAW", f"{file_id}:{sha256}")
        raw_item = StructuredEvidenceItem(
            evidence_id=raw_ev_id,
            job_id=job_id,
            file_id=file_id,
            owner_id=owner_id,
            layer=EvidenceLayer.RAW.value,
            classification=EvidenceClassification.LOCKED_FACT.value,
            content_text=f"Immutable raw source file: {filename} ({file_size:,} bytes, SHA-256: {sha256})",
            content_json={
                "filename": filename,
                "file_type": file_type,
                "file_size": file_size,
                "sha256_hash": sha256
            },
            raw_reference=raw_ref,
            provenance={
                "source_type": file_type,
                "provenance": filename,
                "citation": f"File: {filename}"
            },
            confidence=1.0,
            metadata={"is_raw_root": True},
            created_at=now_ms
        )
        evidence_items.append(raw_item)

        if not raw_path or not raw_path.exists():
            return evidence_items

        suffix = raw_path.suffix.lower()

        # -----------------------------------------------------------------
        # 2. PROCESSED & DERIVED LAYERS BY FORMAT
        # -----------------------------------------------------------------
        if suffix in [".csv", ".tsv"]:
            items = cls._extract_tabular_csv(raw_path, job_id, file_id, owner_id, raw_ref, raw_ev_id, now_ms)
            evidence_items.extend(items)
        elif suffix in [".xlsx", ".xls"]:
            items = cls._extract_tabular_xlsx(raw_path, job_id, file_id, owner_id, raw_ref, raw_ev_id, now_ms)
            evidence_items.extend(items)
        elif suffix == ".pdf":
            items = cls._extract_pdf(raw_path, job_id, file_id, owner_id, raw_ref, raw_ev_id, now_ms)
            evidence_items.extend(items)
        elif suffix == ".docx":
            items = cls._extract_docx(raw_path, job_id, file_id, owner_id, raw_ref, raw_ev_id, now_ms)
            evidence_items.extend(items)
        elif suffix in [".png", ".jpg", ".jpeg"]:
            items = cls._extract_image(raw_path, job_id, file_id, owner_id, raw_ref, raw_ev_id, now_ms)
            evidence_items.extend(items)

        return evidence_items

    @classmethod
    def _extract_tabular_csv(
        cls,
        raw_path: Path,
        job_id: str,
        file_id: str,
        owner_id: str,
        raw_ref: Dict[str, Any],
        raw_ev_id: str,
        now_ms: int
    ) -> List[StructuredEvidenceItem]:
        """Extracts structured row/cell facts and derived calculations from CSV."""
        items: List[StructuredEvidenceItem] = []
        try:
            df = pd.read_csv(raw_path, encoding="utf-8", errors="replace")
        except Exception:
            try:
                df = pd.read_csv(raw_path, encoding="latin1")
            except Exception:
                return items

        row_fact_ids: List[str] = []
        numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()

        # Extract rows as LOCKED FACTS
        for row_idx, row in df.head(100).iterrows():
            row_dict = {str(k): (None if pd.isna(v) else v) for k, v in row.to_dict().items()}
            row_str = ", ".join(f"{k}={v}" for k, v in row_dict.items() if v is not None)
            prov_citation = f"Rows {row_idx + 1}"
            ev_id = cls.generate_stable_id("FACT", f"{file_id}:csv_row:{row_idx}:{row_str}")
            row_fact_ids.append(ev_id)

            item = StructuredEvidenceItem(
                evidence_id=ev_id,
                job_id=job_id,
                file_id=file_id,
                owner_id=owner_id,
                layer=EvidenceLayer.PROCESSED.value,
                classification=EvidenceClassification.LOCKED_FACT.value,
                content_text=f"Row {row_idx + 1}: {row_str}",
                content_json=row_dict,
                raw_reference=raw_ref,
                provenance={
                    "source_type": "csv",
                    "provenance": prov_citation,
                    "line_start": int(row_idx + 1),
                    "line_end": int(row_idx + 1)
                },
                derived_from_ids=[raw_ev_id],
                confidence=1.0,
                metadata={"row_index": int(row_idx + 1), "format": "csv"},
                created_at=now_ms
            )
            items.append(item)

        # Derived calculations: Column totals and statistical sums
        for col in numeric_cols:
            col_series = pd.to_numeric(df[col], errors="coerce").dropna()
            if not col_series.empty:
                col_sum = float(col_series.sum())
                col_mean = float(col_series.mean())
                calc_id = cls.generate_stable_id("CALC", f"{file_id}:csv_sum:{col}:{col_sum}")
                calc_text = f"Calculated Total {col}: {col_sum:,.2f} (Count: {len(col_series)}, Mean: {col_mean:,.2f})"

                calc_item = StructuredEvidenceItem(
                    evidence_id=calc_id,
                    job_id=job_id,
                    file_id=file_id,
                    owner_id=owner_id,
                    layer=EvidenceLayer.DERIVED.value,
                    classification=EvidenceClassification.CALCULATED_VALUE.value,
                    content_text=calc_text,
                    content_json={
                        "column": str(col),
                        "total_sum": col_sum,
                        "mean": col_mean,
                        "count": len(col_series)
                    },
                    raw_reference=raw_ref,
                    provenance={
                        "source_type": "csv",
                        "provenance": f"Derived from {len(row_fact_ids)} rows in {raw_path.name}",
                        "citation": f"Aggregation over column '{col}'"
                    },
                    derived_from_ids=row_fact_ids[:20],  # Parent fact linkage
                    confidence=1.0,
                    metadata={"calculation_type": "column_sum", "column": str(col)},
                    created_at=now_ms
                )
                items.append(calc_item)

        return items

    @classmethod
    def _extract_tabular_xlsx(
        cls,
        raw_path: Path,
        job_id: str,
        file_id: str,
        owner_id: str,
        raw_ref: Dict[str, Any],
        raw_ev_id: str,
        now_ms: int
    ) -> List[StructuredEvidenceItem]:
        """Extracts structured worksheet records and calculated metrics from XLSX."""
        items: List[StructuredEvidenceItem] = []
        try:
            excel_data = pd.read_excel(raw_path, sheet_name=None)
        except Exception:
            return items

        for sheet_name, df in excel_data.items():
            if df.empty:
                continue
            s_rows, s_cols = df.shape
            col_letter = chr(ord("A") + min(s_cols - 1, 25)) if s_cols > 0 else "A"
            sheet_range = f"{sheet_name}!A1:{col_letter}{s_rows}"

            sheet_fact_ids: List[str] = []
            numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()

            # Process individual rows as LOCKED FACTS
            for row_idx, row in df.head(50).iterrows():
                row_dict = {str(k): (None if pd.isna(v) else v) for k, v in row.to_dict().items()}
                row_str = ", ".join(f"{k}={v}" for k, v in row_dict.items() if v is not None)
                cell_citation = f"{sheet_name}!A{row_idx + 2}:{col_letter}{row_idx + 2}"
                ev_id = cls.generate_stable_id("FACT", f"{file_id}:{sheet_name}:row:{row_idx}:{row_str}")
                sheet_fact_ids.append(ev_id)

                item = StructuredEvidenceItem(
                    evidence_id=ev_id,
                    job_id=job_id,
                    file_id=file_id,
                    owner_id=owner_id,
                    layer=EvidenceLayer.PROCESSED.value,
                    classification=EvidenceClassification.LOCKED_FACT.value,
                    content_text=f"[{cell_citation}] {row_str}",
                    content_json=row_dict,
                    raw_reference=raw_ref,
                    provenance={
                        "source_type": "xlsx",
                        "provenance": cell_citation,
                        "sheet": sheet_name,
                        "range": cell_citation
                    },
                    derived_from_ids=[raw_ev_id],
                    confidence=1.0,
                    metadata={"sheet": sheet_name, "row_index": int(row_idx + 2)},
                    created_at=now_ms
                )
                items.append(item)

            # Derived calculations: Column totals across worksheets
            for col in numeric_cols:
                col_series = pd.to_numeric(df[col], errors="coerce").dropna()
                if not col_series.empty:
                    col_sum = float(col_series.sum())
                    calc_id = cls.generate_stable_id("CALC", f"{file_id}:{sheet_name}:sum:{col}:{col_sum}")
                    calc_text = f"Calculated Sheet Sum '{sheet_name}' -> {col}: {col_sum:,.2f} ({len(col_series)} entries)"

                    calc_item = StructuredEvidenceItem(
                        evidence_id=calc_id,
                        job_id=job_id,
                        file_id=file_id,
                        owner_id=owner_id,
                        layer=EvidenceLayer.DERIVED.value,
                        classification=EvidenceClassification.CALCULATED_VALUE.value,
                        content_text=calc_text,
                        content_json={
                            "sheet": sheet_name,
                            "column": str(col),
                            "total_sum": col_sum,
                            "count": len(col_series)
                        },
                        raw_reference=raw_ref,
                        provenance={
                            "source_type": "xlsx",
                            "provenance": f"Derived from {sheet_range}",
                            "sheet": sheet_name,
                            "range": sheet_range
                        },
                        derived_from_ids=sheet_fact_ids[:20],
                        confidence=1.0,
                        metadata={"calculation_type": "worksheet_sum", "sheet": sheet_name, "column": str(col)},
                        created_at=now_ms
                    )
                    items.append(calc_item)

        return items

    @classmethod
    def _extract_pdf(
        cls,
        raw_path: Path,
        job_id: str,
        file_id: str,
        owner_id: str,
        raw_ref: Dict[str, Any],
        raw_ev_id: str,
        now_ms: int
    ) -> List[StructuredEvidenceItem]:
        """Extracts page narratives, extracted tables, and figure captions from PDF."""
        items: List[StructuredEvidenceItem] = []
        if pdfplumber is None:
            return items

        try:
            with pdfplumber.open(raw_path) as pdf:
                for page_idx, page in enumerate(pdf.pages, start=1):
                    page_prov = f"Page {page_idx}"

                    # 1. Extracted Tables -> LOCKED FACTS
                    tables = page.extract_tables() or []
                    for t_idx, tbl in enumerate(tables, start=1):
                        if tbl and len(tbl) > 1:
                            tbl_prov = f"Page {page_idx} Table {t_idx}"
                            tbl_json = {"headers": tbl[0], "rows": tbl[1:]}
                            tbl_text = f"Table on {tbl_prov} with {len(tbl) - 1} data rows."
                            ev_id = cls.generate_stable_id("FACT", f"{file_id}:pdf_tbl:{page_idx}:{t_idx}")

                            item = StructuredEvidenceItem(
                                evidence_id=ev_id,
                                job_id=job_id,
                                file_id=file_id,
                                owner_id=owner_id,
                                layer=EvidenceLayer.PROCESSED.value,
                                classification=EvidenceClassification.LOCKED_FACT.value,
                                content_text=tbl_text,
                                content_json=tbl_json,
                                raw_reference=raw_ref,
                                provenance={
                                    "source_type": "pdf",
                                    "provenance": tbl_prov,
                                    "page": page_idx,
                                    "table_index": t_idx
                                },
                                derived_from_ids=[raw_ev_id],
                                confidence=1.0,
                                metadata={"page": page_idx, "table_index": t_idx},
                                created_at=now_ms
                            )
                            items.append(item)

                    # 2. Text paragraphs -> SUMMARIZABLE TEXT
                    text = (page.extract_text(layout=True) or "").strip()
                    if text:
                        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
                        for p_idx, para in enumerate(paragraphs[:10], start=1):
                            para_clean = " ".join(para.split())
                            ev_id = cls.generate_stable_id("TEXT", f"{file_id}:pdf_para:{page_idx}:{p_idx}:{para_clean[:40]}")

                            item = StructuredEvidenceItem(
                                evidence_id=ev_id,
                                job_id=job_id,
                                file_id=file_id,
                                owner_id=owner_id,
                                layer=EvidenceLayer.PROCESSED.value,
                                classification=EvidenceClassification.SUMMARIZABLE_TEXT.value,
                                content_text=para_clean,
                                content_json={"snippet": para_clean[:200], "char_count": len(para_clean)},
                                raw_reference=raw_ref,
                                provenance={
                                    "source_type": "pdf",
                                    "provenance": f"{page_prov} Para {p_idx}",
                                    "page": page_idx
                                },
                                derived_from_ids=[raw_ev_id],
                                confidence=1.0,
                                metadata={"page": page_idx, "paragraph_index": p_idx},
                                created_at=now_ms
                            )
                            items.append(item)
                    else:
                        # Scanned PDF indicator -> SUMMARIZABLE TEXT
                        ev_id = cls.generate_stable_id("SCAN", f"{file_id}:pdf_scan:{page_idx}")
                        item = StructuredEvidenceItem(
                            evidence_id=ev_id,
                            job_id=job_id,
                            file_id=file_id,
                            owner_id=owner_id,
                            layer=EvidenceLayer.PROCESSED.value,
                            classification=EvidenceClassification.SUMMARIZABLE_TEXT.value,
                            content_text=f"Scanned bitmap page on {page_prov}. Raw bitmap preserved for Phase 2+ OCR.",
                            content_json={"page": page_idx, "is_scanned": True},
                            raw_reference=raw_ref,
                            provenance={"source_type": "scanned_pdf", "provenance": page_prov, "page": page_idx},
                            derived_from_ids=[raw_ev_id],
                            confidence=1.0,
                            metadata={"page": page_idx, "is_scanned": True},
                            created_at=now_ms
                        )
                        items.append(item)

        except Exception as e:
            logger.warning(f"Error extracting PDF evidence from {raw_path.name}: {e}")

        return items

    @classmethod
    def _extract_docx(
        cls,
        raw_path: Path,
        job_id: str,
        file_id: str,
        owner_id: str,
        raw_ref: Dict[str, Any],
        raw_ev_id: str,
        now_ms: int
    ) -> List[StructuredEvidenceItem]:
        """Extracts structured paragraphs and tables from DOCX."""
        items: List[StructuredEvidenceItem] = []
        if docx is None:
            return items

        try:
            doc = docx.Document(raw_path)

            # 1. Paragraphs -> SUMMARIZABLE TEXT
            for p_idx, p in enumerate(doc.paragraphs, start=1):
                txt = p.text.strip()
                if not txt or len(txt) < 15:
                    continue
                prov_cite = f"Para {p_idx}"
                ev_id = cls.generate_stable_id("TEXT", f"{file_id}:docx_para:{p_idx}:{txt[:40]}")

                item = StructuredEvidenceItem(
                    evidence_id=ev_id,
                    job_id=job_id,
                    file_id=file_id,
                    owner_id=owner_id,
                    layer=EvidenceLayer.PROCESSED.value,
                    classification=EvidenceClassification.SUMMARIZABLE_TEXT.value,
                    content_text=txt,
                    content_json={"snippet": txt[:200], "char_count": len(txt)},
                    raw_reference=raw_ref,
                    provenance={
                        "source_type": "docx",
                        "provenance": prov_cite,
                        "paragraph_index": p_idx
                    },
                    derived_from_ids=[raw_ev_id],
                    confidence=1.0,
                    metadata={"paragraph_index": p_idx},
                    created_at=now_ms
                )
                items.append(item)

            # 2. Tables -> LOCKED FACTS
            for t_idx, table in enumerate(doc.tables, start=1):
                t_rows = []
                for row in table.rows:
                    t_rows.append([c.text.strip() for c in row.cells])
                if t_rows and len(t_rows) > 1:
                    prov_cite = f"Table {t_idx}"
                    ev_id = cls.generate_stable_id("FACT", f"{file_id}:docx_tbl:{t_idx}")
                    tbl_json = {"headers": t_rows[0], "rows": t_rows[1:]}

                    item = StructuredEvidenceItem(
                        evidence_id=ev_id,
                        job_id=job_id,
                        file_id=file_id,
                        owner_id=owner_id,
                        layer=EvidenceLayer.PROCESSED.value,
                        classification=EvidenceClassification.LOCKED_FACT.value,
                        content_text=f"Word Table {t_idx} with {len(t_rows) - 1} records.",
                        content_json=tbl_json,
                        raw_reference=raw_ref,
                        provenance={
                            "source_type": "docx",
                            "provenance": prov_cite,
                            "table_index": t_idx
                        },
                        derived_from_ids=[raw_ev_id],
                        confidence=1.0,
                        metadata={"table_index": t_idx},
                        created_at=now_ms
                    )
                    items.append(item)

        except Exception as e:
            logger.warning(f"Error extracting DOCX evidence from {raw_path.name}: {e}")

        return items

    @classmethod
    def _extract_image(
        cls,
        raw_path: Path,
        job_id: str,
        file_id: str,
        owner_id: str,
        raw_ref: Dict[str, Any],
        raw_ev_id: str,
        now_ms: int
    ) -> List[StructuredEvidenceItem]:
        """Extracts image specifications and figure caption reference."""
        items: List[StructuredEvidenceItem] = []
        try:
            with Image.open(raw_path) as img:
                w, h = img.size
                fmt = img.format or raw_path.suffix.lstrip(".").upper()
                mode = img.mode

            spec_prov = f"{raw_path.name} ({w}x{h} {fmt})"

            # 1. Image Technical Specs -> LOCKED FACT
            spec_id = cls.generate_stable_id("FACT", f"{file_id}:img_spec:{w}:{h}:{fmt}")
            spec_item = StructuredEvidenceItem(
                evidence_id=spec_id,
                job_id=job_id,
                file_id=file_id,
                owner_id=owner_id,
                layer=EvidenceLayer.PROCESSED.value,
                classification=EvidenceClassification.LOCKED_FACT.value,
                content_text=f"Image specification: {raw_path.name} (Dimensions: {w}x{h}, Format: {fmt}, Color Mode: {mode})",
                content_json={
                    "filename": raw_path.name,
                    "width": w,
                    "height": h,
                    "format": fmt,
                    "mode": mode
                },
                raw_reference=raw_ref,
                provenance={
                    "source_type": "image",
                    "provenance": spec_prov,
                    "dimensions": [w, h]
                },
                derived_from_ids=[raw_ev_id],
                confidence=1.0,
                metadata={"dimensions": [w, h], "mode": mode},
                created_at=now_ms
            )
            items.append(spec_item)

            # 2. Media Figure Caption -> AI-GENERATED CAPTION
            caption_id = cls.generate_stable_id("CAPTION", f"{file_id}:img_caption:{w}:{h}")
            caption_text = f"Visual evidence asset '{raw_path.name}' captured at {w}x{h} resolution in {fmt} format."
            caption_item = StructuredEvidenceItem(
                evidence_id=caption_id,
                job_id=job_id,
                file_id=file_id,
                owner_id=owner_id,
                layer=EvidenceLayer.DERIVED.value,
                classification=EvidenceClassification.AI_GENERATED_CAPTION.value,
                content_text=caption_text,
                content_json={"caption": caption_text, "asset_path": raw_path.as_posix()},
                raw_reference=raw_ref,
                provenance={
                    "source_type": "image",
                    "provenance": spec_prov,
                    "dimensions": [w, h]
                },
                derived_from_ids=[spec_id],
                confidence=0.95,
                metadata={"is_caption": True},
                created_at=now_ms
            )
            items.append(caption_item)

        except Exception as e:
            logger.warning(f"Error extracting image evidence from {raw_path.name}: {e}")

        return items


# Singleton extractor instance
evidence_extractor = EvidenceExtractor()
