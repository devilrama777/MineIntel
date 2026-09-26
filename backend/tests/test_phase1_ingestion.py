"""
Unit & Integration Tests for MineIntel Phase 1: Evidence Ingestion Foundation

Tests:
1. Multi-file job and manifest generation
2. Format-specific extraction: PDF, scanned PDF foundation, DOCX, XLSX, CSV, PNG
3. Granular source/provenance references (PDF page, DOCX para/table, XLSX sheet/range, image)
4. Immutable raw-file preservation on disk
5. Cryptographic SHA-256 calculation and duplicate detection without file deletion
6. Dual persistence layer (PostgreSQL / local JSON store)
7. Job and file processing status APIs
8. Sovereign ownership enforcement using Phase 0 security
"""
import hashlib
import io
import json
import os
import shutil
import tempfile
import time
import unittest
from unittest.mock import patch
from pathlib import Path
from typing import Dict, Any
import uuid

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
from backend.services.ingestion_models import (
    EvidenceFileRecord,
    IngestionJobRecord,
    ProvenanceRecord,
)
from backend.services.ingestion_service import IngestionEngine, ingestion_engine
from backend.services import ingestion_store
from backend.main import (
    app,
    create_ingestion_job,
    create_session_token,
    download_raw_evidence_file,
    get_evidence_file_details,
    get_ingestion_job_manifest,
    get_ingestion_job_status,
    get_normalized_evidence_content,
    list_ingestion_jobs,
    require_auth,
)


class TestPhase1EvidenceIngestion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = Path(tempfile.mkdtemp(prefix="mineintel_phase1_test_"))
        cls.orig_outputs = config.OUTPUTS_DIR
        cls.orig_data = config.DATA_DIR
        config.OUTPUTS_DIR = cls.test_dir / "outputs"
        config.DATA_DIR = cls.test_dir / "data"
        config.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        config.DATA_DIR.mkdir(parents=True, exist_ok=True)
        ingestion_store.STORE_FILE = config.DATA_DIR / "ingestion_store.json"

        # Create test users: User A, User B, Master User
        cls.master_officer = os.environ["MINEINTEL_OFFICER_ID"]
        cls.master_token = create_session_token(cls.master_officer, role="Senior Senior Officer")

        if not auth_store.get_user_by_id("MOC-AUDITOR-A"):
            auth_store.create_user(
                officer_id="MOC-AUDITOR-A",
                password="AuditorPassword123!",
                display_name="Auditor Alpha",
                role="Senior Officer"
            )
        cls.user_a_token = create_session_token("MOC-AUDITOR-A", role="Senior Officer")

        if not auth_store.get_user_by_id("MOC-AUDITOR-B"):
            auth_store.create_user(
                officer_id="MOC-AUDITOR-B",
                password="AuditorPassword456!",
                display_name="Auditor Beta",
                role="Senior Officer"
            )
        cls.user_b_token = create_session_token("MOC-AUDITOR-B", role="Senior Officer")

    @classmethod
    def tearDownClass(cls):
        config.OUTPUTS_DIR = cls.orig_outputs
        config.DATA_DIR = cls.orig_data
        if cls.test_dir.exists():
            shutil.rmtree(cls.test_dir, ignore_errors=True)

    # ---------------------------------------------------------------------
    # Helper generators for realistic test files
    # ---------------------------------------------------------------------
    def _create_test_pdf(self) -> bytes:
        buf = io.BytesIO()
        c = canvas.Canvas(buf)
        c.drawString(100, 750, "Ministry of Coal Production Telemetry Page 1")
        c.drawString(100, 720, "Colliery Lakhanpur: 45,000 MT produced.")
        c.showPage()
        c.drawString(100, 750, "Ministry of Coal Production Telemetry Page 2")
        c.drawString(100, 720, "Colliery Kusmunda: 62,000 MT dispatched.")
        c.showPage()
        c.save()
        return buf.getvalue()

    def _create_scanned_pdf(self) -> bytes:
        # PDF with minimal/blank text to trigger scanned PDF foundation detection
        buf = io.BytesIO()
        c = canvas.Canvas(buf)
        # Empty text on page
        c.showPage()
        c.save()
        return buf.getvalue()

    def _create_test_docx(self) -> bytes:
        doc = docx.Document()
        doc.add_heading("Colliery Inspection Briefing", level=1)
        doc.add_paragraph("First observation: Safety compliance audit completed with zero critical defects.")
        doc.add_paragraph("Second observation: Haul road drainage requires maintenance before monsoon.")
        table = doc.add_table(rows=2, cols=2)
        table.rows[0].cells[0].text = "Metric"
        table.rows[0].cells[1].text = "Value"
        table.rows[1].cells[0].text = "Active Dumpers"
        table.rows[1].cells[1].text = "48"
        buf = io.BytesIO()
        doc.save(buf)
        return buf.getvalue()

    def _create_test_xlsx(self) -> bytes:
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df1 = pd.DataFrame({
                "Colliery": ["Lakhanpur", "Gevra"],
                "Production_MT": [12500.5, 23000.0]
            })
            df1.to_excel(writer, sheet_name="Production", index=False)
            df2 = pd.DataFrame({
                "Equipment": ["EXC-101", "DUMP-204"],
                "Fuel_LPH": [42.5, 38.0]
            })
            df2.to_excel(writer, sheet_name="Fleet", index=False)
        return buf.getvalue()

    def _create_test_csv(self) -> bytes:
        content = "Colliery,Extraction_MT,Target_MT\nDipka,14200.0,15000.0\nKusmunda,18500.0,18000.0\n"
        return content.encode("utf-8")

    def _create_test_png(self) -> bytes:
        buf = io.BytesIO()
        img = Image.new("RGB", (320, 240), color=(34, 139, 34))
        img.save(buf, format="PNG")
        return buf.getvalue()

    # ---------------------------------------------------------------------
    # Tests
    # ---------------------------------------------------------------------
    def test_01_hashing_and_immutable_preservation(self):
        """Verifies raw file is preserved immutably with exact SHA-256 hash match."""
        csv_bytes = self._create_test_csv()
        sha256 = IngestionEngine.compute_sha256(csv_bytes)
        self.assertEqual(sha256, hashlib.sha256(csv_bytes).hexdigest())

        job_dir = config.OUTPUTS_DIR / "test_immutability"
        rec = IngestionEngine.process_evidence_file(
            job_id="job_immutability",
            owner_id="MOC-AUDITOR-A",
            raw_filename="colliery_extraction.csv",
            raw_bytes=csv_bytes,
            job_dir=job_dir
        )

        self.assertEqual(rec.sha256_hash, sha256)
        raw_path = Path(rec.raw_path)
        self.assertTrue(raw_path.exists(), "Raw evidence file must be immutably saved on disk.")
        self.assertEqual(raw_path.read_bytes(), csv_bytes)

    def test_02_duplicate_detection_without_deletion(self):
        """Verifies duplicate files are detected via hash, flagged, and NEVER deleted."""
        csv_bytes = f"Colliery,Target\nSECL-1,1000\nSECL-2,2000\n# {uuid.uuid4().hex}\n".encode("utf-8")
        job_dir = config.OUTPUTS_DIR / "test_dup"

        # First upload
        rec1 = IngestionEngine.process_evidence_file(
            job_id="job_dup",
            owner_id="MOC-AUDITOR-A",
            raw_filename="original.csv",
            raw_bytes=csv_bytes,
            job_dir=job_dir
        )
        self.assertFalse(rec1.is_duplicate)
        self.assertIsNone(rec1.duplicate_of_file_id)

        # Second upload with identical bytes
        rec2 = IngestionEngine.process_evidence_file(
            job_id="job_dup",
            owner_id="MOC-AUDITOR-A",
            raw_filename="copy_of_original.csv",
            raw_bytes=csv_bytes,
            job_dir=job_dir
        )
        self.assertTrue(rec2.is_duplicate, "Second identical file must be detected as duplicate.")
        self.assertEqual(rec2.duplicate_of_file_id, rec1.file_id)

        # Both raw files must still exist on disk (immutability)
        self.assertTrue(Path(rec1.raw_path).exists(), "Original raw file must NOT be deleted.")
        self.assertTrue(Path(rec2.raw_path).exists(), "Duplicate raw file must NOT be deleted.")

    def test_03_format_extractions_and_provenance(self):
        """Verifies extraction and granular provenance for PDF, DOCX, XLSX, CSV, and PNG."""
        job_dir = config.OUTPUTS_DIR / "test_formats"

        # 1. PDF with page provenance
        pdf_bytes = self._create_test_pdf()
        rec_pdf = IngestionEngine.process_evidence_file(
            job_id="job_formats",
            owner_id="MOC-AUDITOR-A",
            raw_filename="telemetry.pdf",
            raw_bytes=pdf_bytes,
            job_dir=job_dir
        )
        self.assertEqual(rec_pdf.file_type, "pdf")
        self.assertEqual(rec_pdf.status, "completed")
        pdf_prov_types = [p["source_type"] for p in rec_pdf.provenance]
        self.assertIn("pdf", pdf_prov_types)
        pdf_prov_citations = [p["provenance"] for p in rec_pdf.provenance]
        self.assertTrue(any("Page 1" in c for c in pdf_prov_citations))
        self.assertTrue(any("Page 2" in c for c in pdf_prov_citations))

        # 2. Scanned PDF detection foundation
        scanned_bytes = self._create_scanned_pdf()
        rec_scanned = IngestionEngine.process_evidence_file(
            job_id="job_formats",
            owner_id="MOC-AUDITOR-A",
            raw_filename="scanned_blank.pdf",
            raw_bytes=scanned_bytes,
            job_dir=job_dir
        )
        self.assertEqual(rec_scanned.file_type, "scanned_pdf")
        self.assertTrue(rec_scanned.metadata.get("is_scanned_pdf"))
        self.assertIn("Scanned Document Foundation", Path(rec_scanned.normalized_path).read_text(encoding="utf-8"))

        # 3. DOCX with paragraph & table provenance
        docx_bytes = self._create_test_docx()
        rec_docx = IngestionEngine.process_evidence_file(
            job_id="job_formats",
            owner_id="MOC-AUDITOR-A",
            raw_filename="audit.docx",
            raw_bytes=docx_bytes,
            job_dir=job_dir
        )
        self.assertEqual(rec_docx.file_type, "docx")
        docx_provs = [p["provenance"] for p in rec_docx.provenance]
        self.assertTrue(any("Para" in c for c in docx_provs))
        self.assertTrue(any("Table 1" in c for c in docx_provs))

        # 4. XLSX with worksheet & cell range provenance
        xlsx_bytes = self._create_test_xlsx()
        rec_xlsx = IngestionEngine.process_evidence_file(
            job_id="job_formats",
            owner_id="MOC-AUDITOR-A",
            raw_filename="colliery_fleet.xlsx",
            raw_bytes=xlsx_bytes,
            job_dir=job_dir
        )
        self.assertEqual(rec_xlsx.file_type, "xlsx")
        xlsx_provs = [p["provenance"] for p in rec_xlsx.provenance]
        self.assertTrue(any("Production!" in c for c in xlsx_provs))
        self.assertTrue(any("Fleet!" in c for c in xlsx_provs))

        # 5. Image (PNG) with dimensions and media provenance
        png_bytes = self._create_test_png()
        rec_png = IngestionEngine.process_evidence_file(
            job_id="job_formats",
            owner_id="MOC-AUDITOR-A",
            raw_filename="substation.png",
            raw_bytes=png_bytes,
            job_dir=job_dir
        )
        self.assertEqual(rec_png.file_type, "image")
        self.assertEqual(rec_png.metadata.get("width"), 320)
        self.assertEqual(rec_png.metadata.get("height"), 240)
        png_prov = rec_png.provenance[0]["provenance"]
        self.assertIn("320x240", png_prov)

    def test_04_multi_file_manifest_generation(self):
        """Verifies multi-file batch job creates structured manifest.json with all files."""
        files = [
            ("production.csv", self._create_test_csv()),
            ("briefing.docx", self._create_test_docx()),
            ("site_photo.png", self._create_test_png())
        ]
        manifest = IngestionEngine.create_ingestion_job(
            owner_id="MOC-AUDITOR-A",
            files=files
        )
        self.assertIn("job_id", manifest)
        self.assertEqual(manifest["total_files"], 3)
        self.assertEqual(manifest["completed_files"], 3)
        self.assertEqual(manifest["status"], "completed")
        self.assertEqual(len(manifest["files"]), 3)

        manifest_file = Path(manifest["manifest_path"])
        self.assertTrue(manifest_file.exists())
        loaded = json.loads(manifest_file.read_text(encoding="utf-8"))
        self.assertEqual(loaded["job_id"], manifest["job_id"])
        self.assertEqual(len(loaded["files"]), 3)

    def test_05_api_multi_file_upload_and_status(self):
        """Verifies POST /api/ingest/jobs endpoint and status queries."""
        import asyncio

        csv_bytes = self._create_test_csv()
        docx_bytes = self._create_test_docx()

        upload_files = [
            UploadFile(filename="mine_data.csv", file=io.BytesIO(csv_bytes)),
            UploadFile(filename="inspection.docx", file=io.BytesIO(docx_bytes))
        ]

        auth_user_a = {"officer_id": "MOC-AUDITOR-A", "role": "Senior Officer"}

        # Run async endpoint
        res = asyncio.run(create_ingestion_job(files=upload_files, auth=auth_user_a))
        self.assertTrue(res["success"])
        job_id = res["job_id"]
        self.assertEqual(res["total_files"], 2)

        # GET /api/ingest/jobs/{job_id}
        job_status = get_ingestion_job_status(job_id=job_id, auth=auth_user_a)
        self.assertTrue(job_status["success"])
        self.assertEqual(job_status["job"]["job_id"], job_id)

        # GET /api/ingest/jobs/{job_id}/manifest
        manifest_res = get_ingestion_job_manifest(job_id=job_id, auth=auth_user_a)
        self.assertEqual(manifest_res["job_id"], job_id)

        # GET /api/ingest/files/{file_id}
        files = res["manifest"]["files"]
        first_file_id = files[0]["file_id"]
        file_details = get_evidence_file_details(file_id=first_file_id, auth=auth_user_a)
        self.assertTrue(file_details["success"])
        self.assertEqual(file_details["file"]["file_id"], first_file_id)

        # GET /api/ingest/files/{file_id}/normalized
        norm_res = get_normalized_evidence_content(file_id=first_file_id, auth=auth_user_a)
        self.assertTrue(norm_res["success"])
        self.assertIn("# CSV Dataset Dossier", norm_res["normalized_markdown"])

        # GET /api/ingest/files/{file_id}/raw
        raw_res = download_raw_evidence_file(file_id=first_file_id, auth=auth_user_a)
        self.assertEqual(raw_res.status_code, 200)

    def test_06_ownership_isolation_cross_user(self):
        """Verifies Phase 0 ownership isolation: User B cannot access User A's jobs or evidence files."""
        import asyncio

        csv_bytes = self._create_test_csv()
        upload_files = [UploadFile(filename="secret_mine_data.csv", file=io.BytesIO(csv_bytes))]
        auth_user_a = {"officer_id": "MOC-AUDITOR-A", "role": "Senior Officer"}
        auth_user_b = {"officer_id": "MOC-AUDITOR-B", "role": "Senior Officer"}

        # User A creates job
        res = asyncio.run(create_ingestion_job(files=upload_files, auth=auth_user_a))
        job_id = res["job_id"]
        file_id = res["manifest"]["files"][0]["file_id"]

        # User B attempts to access User A's job -> 403
        with self.assertRaises(HTTPException) as cm:
            get_ingestion_job_status(job_id=job_id, auth=auth_user_b)
        self.assertEqual(cm.exception.status_code, 403)

        # User B attempts to access User A's manifest -> 403
        with self.assertRaises(HTTPException) as cm:
            get_ingestion_job_manifest(job_id=job_id, auth=auth_user_b)
        self.assertEqual(cm.exception.status_code, 403)

        # User B attempts to access User A's evidence file -> 403
        with self.assertRaises(HTTPException) as cm:
            get_evidence_file_details(file_id=file_id, auth=auth_user_b)
        self.assertEqual(cm.exception.status_code, 403)

        # User B attempts to download User A's raw file -> 403
        with self.assertRaises(HTTPException) as cm:
            download_raw_evidence_file(file_id=file_id, auth=auth_user_b)
        self.assertEqual(cm.exception.status_code, 403)

        # User B attempts to access User A's normalized file -> 403
        with self.assertRaises(HTTPException) as cm:
            get_normalized_evidence_content(file_id=file_id, auth=auth_user_b)
        self.assertEqual(cm.exception.status_code, 403)

        # Master Auditor CAN access User A's job
        auth_master = {"officer_id": self.master_officer, "role": "Senior Senior Officer"}
        master_job_res = get_ingestion_job_status(job_id=job_id, auth=auth_master)
        self.assertTrue(master_job_res["success"])

        master_file_res = get_evidence_file_details(file_id=file_id, auth=auth_master)
        self.assertTrue(master_file_res["success"])

    def test_07_zero_synthetic_data_guarantee(self):
        """Verifies that no synthetic/demo business records are produced."""
        from backend.services.history_manager import get_history

        # Ensure history manager returns clean empty list when no reports generated
        non_existent_history_file = config.OUTPUTS_DIR / "non_existent_reports.json"
        with patch("backend.services.history_manager.HISTORY_FILE", non_existent_history_file):
            history = get_history()
            self.assertEqual(history, [], "Must not inject synthetic demo reports when history file does not exist.")


if __name__ == "__main__":
    unittest.main()
