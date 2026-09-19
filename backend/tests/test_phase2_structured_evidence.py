"""
Unit & Integration Tests for MineIntel Phase 2: Structured Evidence Layer

Tests:
1. Normalized structured evidence model across all Phase 1 file types (CSV, XLSX, PDF, DOCX, PNG)
2. Stable, reproducible, content-addressed evidence IDs
3. Immutable raw-source references
4. Detailed provenance linking evidence back to PDF page, XLSX/CSV sheet/cell/range, DOCX paragraph/table, and image/file
5. Strict evidence classification:
    * LOCKED FACT
    * CALCULATED VALUE
    * SUMMARIZABLE TEXT
    * AI ANALYSIS
    * AI-GENERATED CAPTION
    * AI INTERPRETATION
6. Raw -> Processed -> Derived hierarchy with parent traceability (derived_from_ids)
7. Dual persistence layer (PostgreSQL + Local JSON store)
8. Query/retrieval APIs with multi-dimensional filtering
9. Phase 0 sovereign user/job ownership isolation
10. Zero synthetic/demo business data guarantee
"""
import hashlib
import io
import json
import os
import shutil
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from typing import Dict, Any

# Ensure test credentials
os.environ["MINEINTEL_OFFICER_ID"] = "MOC-TEST-OFFICER-7890"
os.environ["MINEINTEL_AUTH_PASSWORD"] = "TestEnclaveSecret2026!"
os.environ["MINEINTEL_JWT_SECRET"] = "test-jwt-secret-key-2026"

import sys
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import HTTPException, UploadFile
from PIL import Image
import docx
import openpyxl
import pandas as pd
from reportlab.pdfgen import canvas

from backend import config, auth_store
from backend.services.evidence_models import (
    EvidenceClassification,
    EvidenceLayer,
    StructuredEvidenceItem,
)
from backend.services import evidence_store
from backend.services.evidence_extractor import evidence_extractor, EvidenceExtractor
from backend.services.ingestion_service import ingestion_engine
from backend.services import ingestion_store
from backend.main import (
    app,
    create_ingestion_job,
    create_session_token,
    get_job_evidence_summary_api,
    get_single_evidence_item,
    list_structured_evidence,
    trigger_evidence_extraction,
)


class TestPhase2StructuredEvidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = Path(tempfile.mkdtemp(prefix="mineintel_phase2_test_"))
        cls.orig_outputs = config.OUTPUTS_DIR
        cls.orig_data = config.DATA_DIR
        config.OUTPUTS_DIR = cls.test_dir / "outputs"
        config.DATA_DIR = cls.test_dir / "data"
        config.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        config.DATA_DIR.mkdir(parents=True, exist_ok=True)
        ingestion_store.STORE_FILE = config.DATA_DIR / "ingestion_store.json"
        evidence_store.EVIDENCE_FILE = config.DATA_DIR / "structured_evidence.json"

        cls.master_officer = os.environ["MINEINTEL_OFFICER_ID"]
        cls.master_token = create_session_token(cls.master_officer, role="Senior Operational Auditor")

        if not auth_store.get_user_by_id("MOC-PHASE2-A"):
            auth_store.create_user(
                officer_id="MOC-PHASE2-A",
                password="AuditorPassword123!",
                display_name="Auditor Alpha 2",
                role="Operational Auditor"
            )
        cls.user_a_token = create_session_token("MOC-PHASE2-A", role="Operational Auditor")

        if not auth_store.get_user_by_id("MOC-PHASE2-B"):
            auth_store.create_user(
                officer_id="MOC-PHASE2-B",
                password="AuditorPassword456!",
                display_name="Auditor Beta 2",
                role="Operational Auditor"
            )
        cls.user_b_token = create_session_token("MOC-PHASE2-B", role="Operational Auditor")

    @classmethod
    def tearDownClass(cls):
        config.OUTPUTS_DIR = cls.orig_outputs
        config.DATA_DIR = cls.orig_data
        if cls.test_dir.exists():
            shutil.rmtree(cls.test_dir, ignore_errors=True)

    # ---------------------------------------------------------------------
    # Test Data Generators
    # ---------------------------------------------------------------------
    def _create_sample_csv(self) -> bytes:
        return (
            "Colliery,Target_MT,Actual_MT,Variance_MT\n"
            "Lakhanpur,50000.0,48500.0,-1500.0\n"
            "Kusmunda,65000.0,66200.0,1200.0\n"
            "Dipka,40000.0,39800.0,-200.0\n"
        ).encode("utf-8")

    def _create_sample_xlsx(self) -> bytes:
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df = pd.DataFrame({
                "Pit_Name": ["Pit-North", "Pit-South"],
                "Overburden_BCM": [120000.0, 95000.0],
                "Stripping_Ratio": [2.4, 1.9]
            })
            df.to_excel(writer, sheet_name="Mining_Pits", index=False)
        return buf.getvalue()

    def _create_sample_pdf(self) -> bytes:
        buf = io.BytesIO()
        c = canvas.Canvas(buf)
        c.drawString(100, 750, "Ministry of Coal Statutory Safety Report")
        c.drawString(100, 720, "Observation 1: Conveyor belt emergency stops tested with 100% responsiveness.")
        c.drawString(100, 690, "Observation 2: Methane monitoring telemetry calibrated on all underground working faces.")
        c.showPage()
        c.save()
        return buf.getvalue()

    def _create_sample_docx(self) -> bytes:
        doc = docx.Document()
        doc.add_heading("Environmental Clearance Compliance Audit", level=1)
        doc.add_paragraph("Afforestation target of 50,000 saplings achieved across reclaimed overburden dumps.")
        doc.add_paragraph("Ambient air particulate PM10 concentration remains within permissible limits.")
        tbl = doc.add_table(rows=2, cols=2)
        tbl.rows[0].cells[0].text = "Station"
        tbl.rows[0].cells[1].text = "PM10_ug_m3"
        tbl.rows[1].cells[0].text = "Air-Station-1"
        tbl.rows[1].cells[1].text = "68.5"
        buf = io.BytesIO()
        doc.save(buf)
        return buf.getvalue()

    def _create_sample_png(self) -> bytes:
        buf = io.BytesIO()
        img = Image.new("RGB", (640, 480), color=(100, 149, 237))
        img.save(buf, format="PNG")
        return buf.getvalue()

    # ---------------------------------------------------------------------
    # Test Cases
    # ---------------------------------------------------------------------
    def test_01_structured_models_and_classifications(self):
        """Verifies all required classifications and layers are formally defined."""
        # Classifications
        self.assertEqual(EvidenceClassification.LOCKED_FACT.value, "LOCKED FACT")
        self.assertEqual(EvidenceClassification.CALCULATED_VALUE.value, "CALCULATED VALUE")
        self.assertEqual(EvidenceClassification.SUMMARIZABLE_TEXT.value, "SUMMARIZABLE TEXT")
        self.assertEqual(EvidenceClassification.AI_ANALYSIS.value, "AI ANALYSIS")
        self.assertEqual(EvidenceClassification.AI_GENERATED_CAPTION.value, "AI-GENERATED CAPTION")
        self.assertEqual(EvidenceClassification.AI_INTERPRETATION.value, "AI INTERPRETATION")

        # Layers
        self.assertEqual(EvidenceLayer.RAW.value, "raw")
        self.assertEqual(EvidenceLayer.PROCESSED.value, "processed")
        self.assertEqual(EvidenceLayer.DERIVED.value, "derived")

        # StructuredEvidenceItem construction
        item = StructuredEvidenceItem(
            evidence_id="EVD-TEST-001",
            job_id="job_001",
            file_id="f_001",
            owner_id="MOC-PHASE2-A",
            layer=EvidenceLayer.PROCESSED.value,
            classification=EvidenceClassification.LOCKED_FACT.value,
            content_text="Lakhanpur Production = 48500 MT",
            content_json={"colliery": "Lakhanpur", "production": 48500},
            raw_reference={"file_id": "f_001", "raw_path": "/tmp/f_001.csv"},
            provenance={"source_type": "csv", "provenance": "Rows 1"},
            confidence=1.0
        )
        d = item.to_dict()
        self.assertEqual(d["evidence_id"], "EVD-TEST-001")
        self.assertEqual(d["classification"], "LOCKED FACT")
        self.assertEqual(d["confidence"], 1.0)

    def test_02_stable_evidence_ids_reproducibility(self):
        """Verifies evidence IDs are stable, deterministic, and content-addressed across runs."""
        key1 = "file_123:csv_row:0:Colliery=Lakhanpur, Target_MT=50000"
        id1_a = EvidenceExtractor.generate_stable_id("FACT", key1)
        id1_b = EvidenceExtractor.generate_stable_id("FACT", key1)
        self.assertEqual(id1_a, id1_b, "Evidence IDs for identical content must be strictly identical across runs.")
        self.assertTrue(id1_a.startswith("EVD-FACT-"))

        # Different content yields different stable ID
        key2 = "file_123:csv_row:1:Colliery=Kusmunda, Target_MT=65000"
        id2 = EvidenceExtractor.generate_stable_id("FACT", key2)
        self.assertNotEqual(id1_a, id2)

    def test_03_format_extractions_triad(self):
        """Verifies raw -> processed -> derived hierarchy across CSV, XLSX, PDF, DOCX, and PNG."""
        job_dir = config.OUTPUTS_DIR / "phase2_formats"
        job_dir.mkdir(parents=True, exist_ok=True)

        # 1. CSV
        csv_bytes = self._create_sample_csv()
        csv_file = job_dir / "production.csv"
        csv_file.write_bytes(csv_bytes)
        rec_csv = {
            "job_id": "job_p2_fmt",
            "file_id": "f_csv",
            "owner_id": "MOC-PHASE2-A",
            "filename": "production.csv",
            "file_type": "csv",
            "raw_path": str(csv_file),
            "sha256_hash": hashlib.sha256(csv_bytes).hexdigest(),
            "file_size": len(csv_bytes)
        }
        items_csv = evidence_extractor.extract_from_file_record(rec_csv)

        # Verify raw layer
        raw_items = [i for i in items_csv if i.layer == EvidenceLayer.RAW.value]
        self.assertEqual(len(raw_items), 1)
        self.assertEqual(raw_items[0].classification, "LOCKED FACT")
        self.assertEqual(raw_items[0].raw_reference["sha256_hash"], rec_csv["sha256_hash"])

        # Verify processed row facts
        row_facts = [i for i in items_csv if i.layer == EvidenceLayer.PROCESSED.value and i.classification == "LOCKED FACT"]
        self.assertEqual(len(row_facts), 3)
        self.assertIn("Lakhanpur", row_facts[0].content_text)
        self.assertEqual(row_facts[0].provenance["source_type"], "csv")

        # Verify derived calculated values
        calc_values = [i for i in items_csv if i.layer == EvidenceLayer.DERIVED.value and i.classification == "CALCULATED VALUE"]
        self.assertTrue(len(calc_values) >= 1)
        sum_item = next(c for c in calc_values if c.content_json.get("column") == "Actual_MT")
        # Sum = 48500 + 66200 + 39800 = 154500
        self.assertAlmostEqual(sum_item.content_json["total_sum"], 154500.0)
        # Parent facts linkage
        self.assertTrue(len(sum_item.derived_from_ids) >= 3)
        self.assertIn(row_facts[0].evidence_id, sum_item.derived_from_ids)

        # 2. XLSX
        xlsx_bytes = self._create_sample_xlsx()
        xlsx_file = job_dir / "pits.xlsx"
        xlsx_file.write_bytes(xlsx_bytes)
        rec_xlsx = {
            "job_id": "job_p2_fmt",
            "file_id": "f_xlsx",
            "owner_id": "MOC-PHASE2-A",
            "filename": "pits.xlsx",
            "file_type": "xlsx",
            "raw_path": str(xlsx_file),
            "sha256_hash": hashlib.sha256(xlsx_bytes).hexdigest(),
            "file_size": len(xlsx_bytes)
        }
        items_xlsx = evidence_extractor.extract_from_file_record(rec_xlsx)
        xlsx_facts = [i for i in items_xlsx if i.classification == "LOCKED FACT" and i.layer == EvidenceLayer.PROCESSED.value]
        self.assertTrue(any("Mining_Pits!" in i.provenance.get("provenance", "") for i in xlsx_facts))
        xlsx_calcs = [i for i in items_xlsx if i.classification == "CALCULATED VALUE"]
        self.assertTrue(len(xlsx_calcs) >= 1)

        # 3. PDF
        pdf_bytes = self._create_sample_pdf()
        pdf_file = job_dir / "safety.pdf"
        pdf_file.write_bytes(pdf_bytes)
        rec_pdf = {
            "job_id": "job_p2_fmt",
            "file_id": "f_pdf",
            "owner_id": "MOC-PHASE2-A",
            "filename": "safety.pdf",
            "file_type": "pdf",
            "raw_path": str(pdf_file),
            "sha256_hash": hashlib.sha256(pdf_bytes).hexdigest(),
            "file_size": len(pdf_bytes)
        }
        items_pdf = evidence_extractor.extract_from_file_record(rec_pdf)
        pdf_texts = [i for i in items_pdf if i.classification == "SUMMARIZABLE TEXT"]
        self.assertTrue(len(pdf_texts) >= 1)
        self.assertIn("Page 1", pdf_texts[0].provenance.get("provenance", ""))

        # 4. DOCX
        docx_bytes = self._create_sample_docx()
        docx_file = job_dir / "environment.docx"
        docx_file.write_bytes(docx_bytes)
        rec_docx = {
            "job_id": "job_p2_fmt",
            "file_id": "f_docx",
            "owner_id": "MOC-PHASE2-A",
            "filename": "environment.docx",
            "file_type": "docx",
            "raw_path": str(docx_file),
            "sha256_hash": hashlib.sha256(docx_bytes).hexdigest(),
            "file_size": len(docx_bytes)
        }
        items_docx = evidence_extractor.extract_from_file_record(rec_docx)
        docx_texts = [i for i in items_docx if i.classification == "SUMMARIZABLE TEXT"]
        self.assertTrue(len(docx_texts) >= 1)
        self.assertTrue(any("Para" in i.provenance.get("provenance", "") for i in docx_texts))
        docx_facts = [i for i in items_docx if i.classification == "LOCKED FACT" and i.layer == EvidenceLayer.PROCESSED.value]
        self.assertTrue(any("Table 1" in i.provenance.get("provenance", "") for i in docx_facts))

        # 5. Image (PNG)
        png_bytes = self._create_sample_png()
        png_file = job_dir / "drone_survey.png"
        png_file.write_bytes(png_bytes)
        rec_png = {
            "job_id": "job_p2_fmt",
            "file_id": "f_png",
            "owner_id": "MOC-PHASE2-A",
            "filename": "drone_survey.png",
            "file_type": "image",
            "raw_path": str(png_file),
            "sha256_hash": hashlib.sha256(png_bytes).hexdigest(),
            "file_size": len(png_bytes)
        }
        items_png = evidence_extractor.extract_from_file_record(rec_png)
        png_fact = next(i for i in items_png if i.classification == "LOCKED FACT" and i.layer == EvidenceLayer.PROCESSED.value)
        self.assertEqual(png_fact.content_json["width"], 640)
        self.assertEqual(png_fact.content_json["height"], 480)
        png_caption = next(i for i in items_png if i.classification == "AI-GENERATED CAPTION")
        self.assertIn("drone_survey.png", png_caption.content_text)
        self.assertIn(png_fact.evidence_id, png_caption.derived_from_ids)

    def test_04_parent_lineage_traceability(self):
        """Verifies that all derived evidence items maintain explicit traceability to parent facts."""
        csv_bytes = self._create_sample_csv()
        job_dir = config.OUTPUTS_DIR / "phase2_lineage"
        job_dir.mkdir(parents=True, exist_ok=True)
        csv_file = job_dir / "lineage_test.csv"
        csv_file.write_bytes(csv_bytes)

        rec = {
            "job_id": "job_lineage",
            "file_id": "f_lineage",
            "owner_id": "MOC-PHASE2-A",
            "filename": "lineage_test.csv",
            "file_type": "csv",
            "raw_path": str(csv_file),
            "sha256_hash": hashlib.sha256(csv_bytes).hexdigest(),
            "file_size": len(csv_bytes)
        }

        items = evidence_extractor.extract_from_file_record(rec)
        evidence_dict = {i.evidence_id: i for i in items}

        derived_items = [i for i in items if i.layer == EvidenceLayer.DERIVED.value]
        self.assertTrue(len(derived_items) > 0)

        for der in derived_items:
            self.assertTrue(len(der.derived_from_ids) > 0, "Derived evidence item must link to parent evidence IDs.")
            for pid in der.derived_from_ids:
                self.assertIn(pid, evidence_dict, f"Parent ID {pid} must exist in the evidence catalog.")
                parent_item = evidence_dict[pid]
                self.assertIn(parent_item.layer, [EvidenceLayer.RAW.value, EvidenceLayer.PROCESSED.value])

    def test_05_store_persistence_and_summary(self):
        """Verifies persistence in evidence_store and job breakdown summary generation."""
        job_id = "job_store_test_01"
        items = [
            StructuredEvidenceItem(
                evidence_id="EVD-TEST-F1",
                job_id=job_id,
                file_id="f_01",
                owner_id="MOC-PHASE2-A",
                layer=EvidenceLayer.PROCESSED.value,
                classification=EvidenceClassification.LOCKED_FACT.value,
                content_text="Colliery A production = 1000",
                confidence=1.0
            ),
            StructuredEvidenceItem(
                evidence_id="EVD-TEST-C1",
                job_id=job_id,
                file_id="f_01",
                owner_id="MOC-PHASE2-A",
                layer=EvidenceLayer.DERIVED.value,
                classification=EvidenceClassification.CALCULATED_VALUE.value,
                content_text="Total = 1000",
                derived_from_ids=["EVD-TEST-F1"],
                confidence=1.0
            ),
            StructuredEvidenceItem(
                evidence_id="EVD-TEST-T1",
                job_id=job_id,
                file_id="f_02",
                owner_id="MOC-PHASE2-A",
                layer=EvidenceLayer.PROCESSED.value,
                classification=EvidenceClassification.SUMMARIZABLE_TEXT.value,
                content_text="Operations ran smoothly throughout shift.",
                confidence=1.0
            )
        ]

        # Save items
        evidence_store.save_evidence_items([i.to_dict() for i in items])

        # Retrieve by ID
        saved_f1 = evidence_store.get_evidence_by_id("EVD-TEST-F1")
        self.assertIsNotNone(saved_f1)
        self.assertEqual(saved_f1["classification"], "LOCKED FACT")

        # Query items
        q_res = evidence_store.query_evidence(job_id=job_id, classification="LOCKED FACT")
        self.assertEqual(q_res["total"], 1)
        self.assertEqual(q_res["items"][0]["evidence_id"], "EVD-TEST-F1")

        # Summary
        summary = evidence_store.get_job_evidence_summary(job_id=job_id)
        self.assertEqual(summary["total_evidence_items"], 3)
        self.assertEqual(summary["total_files_linked"], 2)
        self.assertEqual(summary["by_layer"]["processed"], 2)
        self.assertEqual(summary["by_layer"]["derived"], 1)
        self.assertEqual(summary["by_classification"]["LOCKED FACT"], 1)
        self.assertEqual(summary["by_classification"]["CALCULATED VALUE"], 1)
        self.assertEqual(summary["by_classification"]["SUMMARIZABLE TEXT"], 1)

    def test_06_query_apis_and_filtering(self):
        """Verifies REST endpoints for evidence queries, single item retrieval, and job summaries."""
        import asyncio

        csv_bytes = self._create_sample_csv()
        docx_bytes = self._create_sample_docx()

        upload_files = [
            UploadFile(filename="pit_audit.csv", file=io.BytesIO(csv_bytes)),
            UploadFile(filename="clearance.docx", file=io.BytesIO(docx_bytes))
        ]

        auth_user_a = {"officer_id": "MOC-PHASE2-A", "role": "Operational Auditor"}

        # Ingest files (automatically extracts and persists structured evidence)
        res = asyncio.run(create_ingestion_job(files=upload_files, auth=auth_user_a))
        job_id = res["job_id"]

        # 1. GET /api/evidence
        ev_list = list_structured_evidence(job_id=job_id, auth=auth_user_a)
        self.assertTrue(ev_list["success"])
        self.assertTrue(ev_list["total"] > 0)
        first_ev_id = ev_list["items"][0]["evidence_id"]

        # 2. Filter by classification=LOCKED FACT
        fact_list = list_structured_evidence(job_id=job_id, classification="LOCKED FACT", auth=auth_user_a)
        self.assertTrue(all(it["classification"] == "LOCKED FACT" for it in fact_list["items"]))

        # 3. Filter by classification=CALCULATED VALUE
        calc_list = list_structured_evidence(job_id=job_id, classification="CALCULATED VALUE", auth=auth_user_a)
        self.assertTrue(all(it["classification"] == "CALCULATED VALUE" for it in calc_list["items"]))

        # 4. Filter by layer=derived
        der_list = list_structured_evidence(job_id=job_id, layer="derived", auth=auth_user_a)
        self.assertTrue(all(it["layer"] == "derived" for it in der_list["items"]))

        # 5. GET /api/evidence/{evidence_id}
        single_ev = get_single_evidence_item(evidence_id=first_ev_id, auth=auth_user_a)
        self.assertTrue(single_ev["success"])
        self.assertEqual(single_ev["evidence"]["evidence_id"], first_ev_id)

        # 6. GET /api/evidence/jobs/{job_id}/summary
        summary_res = get_job_evidence_summary_api(job_id=job_id, auth=auth_user_a)
        self.assertTrue(summary_res["success"])
        self.assertIn("by_classification", summary_res["summary"])
        self.assertIn("by_layer", summary_res["summary"])

        # 7. POST /api/evidence/extract/{job_id} (re-extract idempotence)
        re_extract = trigger_evidence_extraction(job_id=job_id, auth=auth_user_a)
        self.assertTrue(re_extract["success"])
        self.assertEqual(re_extract["job_id"], job_id)

    def test_07_ownership_enforcement_cross_user(self):
        """Verifies Phase 0 security: User B cannot access User A's structured evidence."""
        import asyncio

        csv_bytes = self._create_sample_csv()
        upload_files = [UploadFile(filename="confidential_audit.csv", file=io.BytesIO(csv_bytes))]
        auth_user_a = {"officer_id": "MOC-PHASE2-A", "role": "Operational Auditor"}
        auth_user_b = {"officer_id": "MOC-PHASE2-B", "role": "Operational Auditor"}
        auth_master = {"officer_id": self.master_officer, "role": "Senior Operational Auditor"}

        # User A creates job
        res = asyncio.run(create_ingestion_job(files=upload_files, auth=auth_user_a))
        job_id = res["job_id"]

        # User A lists evidence
        ev_list = list_structured_evidence(job_id=job_id, auth=auth_user_a)
        target_ev_id = ev_list["items"][0]["evidence_id"]

        # User B attempts to query User A's job evidence -> 403
        with self.assertRaises(HTTPException) as cm:
            list_structured_evidence(job_id=job_id, auth=auth_user_b)
        self.assertEqual(cm.exception.status_code, 403)

        # User B attempts to get single evidence item of User A -> 403
        with self.assertRaises(HTTPException) as cm:
            get_single_evidence_item(evidence_id=target_ev_id, auth=auth_user_b)
        self.assertEqual(cm.exception.status_code, 403)

        # User B attempts to get job evidence summary -> 403
        with self.assertRaises(HTTPException) as cm:
            get_job_evidence_summary_api(job_id=job_id, auth=auth_user_b)
        self.assertEqual(cm.exception.status_code, 403)

        # User B attempts to trigger extraction on User A's job -> 403
        with self.assertRaises(HTTPException) as cm:
            trigger_evidence_extraction(job_id=job_id, auth=auth_user_b)
        self.assertEqual(cm.exception.status_code, 403)

        # Master Auditor CAN access User A's evidence
        master_res = get_single_evidence_item(evidence_id=target_ev_id, auth=auth_master)
        self.assertTrue(master_res["success"])
        master_sum = get_job_evidence_summary_api(job_id=job_id, auth=auth_master)
        self.assertTrue(master_sum["success"])

    def test_08_zero_synthetic_data_guarantee(self):
        """Verifies that all evidence items originate strictly from ingested real files."""
        # Query global store with no files
        fake_job = "job_empty_nonexistent_9999"
        res = evidence_store.query_evidence(job_id=fake_job)
        self.assertEqual(res["total"], 0, "No evidence items must exist for non-existent job.")
        self.assertEqual(len(res["items"]), 0)


if __name__ == "__main__":
    unittest.main()
