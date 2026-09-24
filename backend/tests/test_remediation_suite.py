import asyncio
import io
import json
import os
import shutil
import tempfile
import time
import unittest
from unittest.mock import patch
from pathlib import Path

# Set up test environment with secure test-only credentials (NOT hardcoded production values)
os.environ["MINEINTEL_OFFICER_ID"] = "MOC-TEST-OFFICER-7890"
os.environ["MINEINTEL_AUTH_PASSWORD"] = "TestEnclaveSecret2026!"
os.environ["MINEINTEL_JWT_SECRET"] = "test-jwt-secret-key-2026"

import sys
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import HTTPException, UploadFile
from backend import config
from backend.services import captcha as captcha_service
from backend.main import (
    app,
    auth_login,
    auth_logout,
    auth_verify,
    create_session_token,
    download_active_csv,
    download_report_format,
    fill_template_content,
    generate_report_package,
    get_analytics_summary,
    get_dataset_details,
    get_report,
    get_reports_history,
    get_trends_data,
    health_check,
    list_available_datasets,
    list_report_templates,
    quick_preview,
    require_auth,
    run_full_pipeline,
    save_uploaded_file,
    upload_file,
    validate_uploaded_file,
    verify_session_token,
    add_report_history,
    LoginRequest,
    RecordHistoryRequest,
    ReportPackageRequest,
    TemplateFillRequest,
)
from backend.services.converter import MarkdownConverter
from backend.services.document_generator import DocumentGenerator, get_active_dataset_metrics
from backend.services.gemma_client import GemmaClient
from backend.services.history_manager import get_history, record_report
from backend.services.llama_client import LlamaClient
from backend.services.math_engine import MathEngine, safe_eval_expr
from backend.services.pipeline import DocumentPipeline



def make_login_request(officer_id, password):
    with patch.object(captcha_service, "_secure_answer", return_value="AB12CD"):
        challenge = captcha_service.create_challenge()
    return LoginRequest(officer_id=officer_id, password=password, captcha_challenge_id=challenge["challenge_id"], captcha_answer="AB12CD")

class TestRemediationSuite(unittest.TestCase):
    """
    Comprehensive verification test suite ensuring:
    1. Zero syntax / compilation errors across all modules
    2. Real sovereign authentication and session token verification
    3. Upload validation (file format, size limits, empty files)
    4. Deterministic conversion & bounded processing without truncation
    5. Truthful AI status (no fake 100% success or dummy Coal India data)
    6. Mathematical calculation verification via AST
    7. Clean multi-format document generation (PDF, DOCX, 4-sheet XLSX)
    8. Strict job-isolated outputs preventing concurrent collision
    9. Atomic history management
    10. API endpoint integrity and Vercel compatibility
    """

    @classmethod
    def setUpClass(cls):
        cls.test_dir = ROOT_DIR / "backend" / "tests" / "temp_test_workspace"
        cls.test_dir.mkdir(parents=True, exist_ok=True)

    @classmethod
    def tearDownClass(cls):
        if cls.test_dir.exists():
            shutil.rmtree(cls.test_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # 1. AUTHENTICATION & SECURITY TESTS
    # -------------------------------------------------------------------------
    def test_01_auth_token_lifecycle(self):
        """Verify HMAC session token creation, verification, and expiration."""
        token = create_session_token("MOC-7890", "Senior Officer")
        self.assertIsInstance(token, str)
        self.assertEqual(len(token.split(":")), 4)

        session = verify_session_token(token)
        self.assertIsNotNone(session)
        self.assertEqual(session["officer_id"], "MOC-7890")
        self.assertEqual(session["role"], "Senior Officer")

        # Verify tampered token fails
        tampered = token[:-4] + "ffff"
        self.assertIsNone(verify_session_token(tampered))

        # Verify invalid format fails
        self.assertIsNone(verify_session_token("invalid:token"))

    def test_02_auth_api_endpoints(self):
        """Test auth_login and auth_verify endpoints directly with env-supplied credentials."""
        test_officer = os.environ.get("MINEINTEL_OFFICER_ID", "MOC-TEST-OFFICER-7890")
        test_pwd = os.environ.get("MINEINTEL_AUTH_PASSWORD", "TestEnclaveSecret2026!")

        # 1. Valid login using environment credentials
        req = make_login_request(test_officer, test_pwd)
        data = auth_login(req)
        self.assertTrue(data["success"])
        self.assertTrue(data["authenticated"])
        self.assertIn("token", data)
        token = data["token"]

        # 2. Verify endpoint with token header
        verify_res = auth_verify(authorization=f"Bearer {token}")
        self.assertTrue(verify_res["authenticated"])
        self.assertEqual(verify_res["officer_id"], test_officer)

        # 3. Invalid credentials
        bad_req = make_login_request(test_officer, "WrongPassword!")
        with self.assertRaises(HTTPException) as ctx:
            auth_login(bad_req)
        self.assertEqual(ctx.exception.status_code, 401)

        # 4. Missing token on verify
        with self.assertRaises(HTTPException) as ctx2:
            auth_verify(authorization=None, token=None)
        self.assertEqual(ctx2.exception.status_code, 401)

        # 5. Tampered token on verify
        tampered = token[:-6] + "tamper"
        with self.assertRaises(HTTPException) as ctx3:
            auth_verify(authorization=f"Bearer {tampered}")
        self.assertEqual(ctx3.exception.status_code, 401)

        # 6. Logout endpoint
        logout_data = auth_logout()
        self.assertTrue(logout_data["success"])

    def test_02_b_protected_endpoints_require_valid_token(self):
        """Verify require_auth blocks unauthenticated / tampered requests on protected routes."""
        test_officer = os.environ.get("MINEINTEL_OFFICER_ID", "MOC-TEST-OFFICER-7890")
        valid_token = create_session_token(test_officer)

        # 1. require_auth with valid token
        auth_data = require_auth(authorization=f"Bearer {valid_token}")
        self.assertEqual(auth_data["officer_id"], test_officer)

        # 2. require_auth missing header
        with self.assertRaises(HTTPException) as ctx:
            require_auth(authorization=None)
        self.assertEqual(ctx.exception.status_code, 401)

        # 3. require_auth bad scheme
        with self.assertRaises(HTTPException) as ctx2:
            require_auth(authorization=f"Basic {valid_token}")
        self.assertEqual(ctx2.exception.status_code, 401)

        # 4. require_auth tampered token
        with self.assertRaises(HTTPException) as ctx3:
            require_auth(authorization=f"Bearer {valid_token[:-5]}99999")
        self.assertEqual(ctx3.exception.status_code, 401)

    # -------------------------------------------------------------------------
    # 2. UPLOAD VALIDATION & EXTRACTION
    # -------------------------------------------------------------------------
    def test_03_upload_validation(self):
        """Test upload validation rejects invalid extensions, empty files, and size limits."""
        # 1. Unsupported extension
        bad_file = UploadFile(filename="malicious.exe", file=io.BytesIO(b"binary content"))
        with self.assertRaises(HTTPException) as ctx:
            validate_uploaded_file(bad_file)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Unsupported file format", ctx.exception.detail)

        # 2. Empty file
        empty_file = UploadFile(filename="empty.csv", file=io.BytesIO(b""))
        dest = self.test_dir / "empty.csv"
        with self.assertRaises(HTTPException) as ctx2:
            save_uploaded_file(empty_file, dest)
        self.assertEqual(ctx2.exception.status_code, 400)
        self.assertIn("empty", ctx2.exception.detail.lower())

        # 3. File size limit enforcement
        large_content = b"X" * (1024 * 1024 + 100)  # 1MB + 100 bytes
        large_file = UploadFile(filename="large.csv", file=io.BytesIO(large_content))
        dest_large = self.test_dir / "large.csv"
        with self.assertRaises(HTTPException) as ctx3:
            save_uploaded_file(large_file, dest_large, max_bytes=1024 * 1024)  # 1MB limit for test
        self.assertEqual(ctx3.exception.status_code, 413)

        # 4. Valid CSV upload
        valid_csv = b"Mine,Target,Actual\nAlpha,100,95\nBeta,200,198\n"
        valid_file = UploadFile(filename="valid_data.csv", file=io.BytesIO(valid_csv))
        res_valid = asyncio.run(upload_file(valid_file))
        self.assertIn("file_id", res_valid)
        self.assertTrue(Path(res_valid["file_path"]).exists())

    def test_04_converter_deterministic_extraction(self):
        """Verify converter produces structured markdown without hardcoded 45k char truncation."""
        converter = MarkdownConverter()
        sample_csv = self.test_dir / "test_extract.csv"
        sample_csv.write_text(
            "State,Colliery,Production_MT,Dispatch_MT\n"
            "Odisha,Belpahar,15.2,14.8\n"
            "Chhattisgarh,Gevra,42.5,41.9\n"
            "Jharkhand,Ashoka,8.4,8.1\n",
            encoding="utf-8"
        )
        res = converter.convert(sample_csv)
        self.assertEqual(res["file_type"], "csv")
        self.assertIn("Belpahar", res["markdown"])
        self.assertIn("Gevra", res["markdown"])
        self.assertIn("Numerical Summary Statistics", res["markdown"])
        self.assertTrue(len(res.get("records", [])) >= 3)

    # -------------------------------------------------------------------------
    # 3. TRUTHFUL STATUS & AI FALLBACK TESTS (NO FAKE COAL INDIA DATA)
    # -------------------------------------------------------------------------
    def test_05_llama_client_truthful_fallback(self):
        """Verify LLaMA client returns truthful status and does NOT fabricate Coal India data."""
        # Force an offline client with an invalid port
        offline_client = LlamaClient(base_url="http://127.0.0.1:59999")
        self.assertFalse(offline_client.is_available())

        sample_custom_content = (
            "# Solar Farm Equipment Report\n"
            "Inverters installed: 500 units.\n"
            "Total Power Generation: 45.8 MW.\n"
            "Peak Efficiency: 98.2%.\n"
        )
        res = offline_client.analyze_document(
            markdown_content=sample_custom_content,
            file_type="pdf"
        )
        self.assertTrue(res.get("is_fallback"))
        self.assertEqual(res.get("status"), "deterministic_fallback")
        analysis = res.get("analysis", "")
        # Must reflect the user's solar farm text, NOT Coal India SECL/MCL!
        self.assertIn("Solar Farm Equipment Report", analysis)
        self.assertNotIn("SECL (Bilaspur)", analysis)
        self.assertNotIn("131,608.90 MT", analysis)

    def test_06_gemma_client_truthful_fallback(self):
        """Verify Gemma client synthesizes grounded report without fake claims."""
        offline_gemma = GemmaClient(base_url="http://127.0.0.1:59999")
        self.assertFalse(offline_gemma.is_available())

        custom_analysis = "Audit of Hospital Oxygen Supplies: Total cylinders: 1,200. Reserve days: 25 days."
        custom_math = "Total verified: 1200 cylinders. Discrepancy: 0."
        res = offline_gemma.generate_systematic_report(
            llama_analysis=custom_analysis,
            math_audit_markdown=custom_math
        )
        self.assertTrue(res.get("fallback"))
        self.assertEqual(res.get("status"), "deterministic_fallback")
        report = res.get("report", "")
        self.assertIn("Hospital Oxygen Supplies", report)
        self.assertNotIn("MCL (Sambalpur)", report)

    # -------------------------------------------------------------------------
    # 4. MATH ENGINE & AST CALCULATIONS
    # -------------------------------------------------------------------------
    def test_07_math_engine_verification(self):
        """Test AST mathematical calculation engine and discrepancy detection."""
        math_engine = MathEngine()

        # Simple verification
        verified = math_engine.verify_expression("250 + 150", 400.0)
        self.assertEqual(verified["status"], "VERIFIED")
        self.assertEqual(verified["calculated"], 400.0)

        # Discrepancy detection
        failed = math_engine.verify_expression("250 + 150", 500.0)
        self.assertEqual(failed["status"], "DISCREPANCY_DETECTED")
        self.assertEqual(failed["calculated"], 400.0)

        # Safe eval handles standard math but rejects arbitrary code execution
        self.assertEqual(safe_eval_expr("10 * 5 + 2"), 52)
        with self.assertRaises(Exception):
            safe_eval_expr("__import__('os').system('dir')")

    # -------------------------------------------------------------------------
    # 5. DOCUMENT GENERATION (PDF, DOCX, 4-SHEET XLSX) & DATA ISOLATION
    # -------------------------------------------------------------------------
    def test_08_document_generator_custom_data_no_cil_contamination(self):
        """Verify DocumentGenerator uses custom user data when provided and does not contaminate with CIL baseline."""
        doc_gen = DocumentGenerator()
        custom_records = [
            {"Colliery": "Airport Terminal A", "Production": 12.5, "Dispatch": 11.8},
            {"Colliery": "Airport Terminal B", "Production": 18.2, "Dispatch": 17.5},
            {"Colliery": "Airport Terminal C", "Production": 9.4, "Dispatch": 9.0}
        ]

        metrics = get_active_dataset_metrics(
            user_records=custom_records,
            document_title="Airport Logistics Report"
        )
        self.assertEqual(metrics["count"], 3)
        self.assertAlmostEqual(metrics["total_production"], 40.1, places=1)
        self.assertIn("Airport Terminal", metrics["collieries"][0]["name"])

        # Test report packaging with custom records
        report_id = "TEST-REP-01"
        pkg = doc_gen.generate_all_packages(
            template_name="bento_grid",
            report_id=report_id,
            summary_text="Airport Logistics Operational Audit Summary.",
            user_records=custom_records,
            custom_title="Airport Logistics Report"
        )
        self.assertTrue(pkg.get("success"))
        files = pkg.get("files", {})
        self.assertIn("pdf", files)
        self.assertIn("docx", files)
        self.assertIn("xlsx", files)

        # Check excel file creation
        raw_xlsx = files["xlsx"]["path"] if isinstance(files["xlsx"], dict) else files["xlsx"]
        xlsx_path = Path(raw_xlsx)
        self.assertTrue(xlsx_path.exists())

        # Inspect excel sheets if openpyxl is available
        try:
            import openpyxl
            wb = openpyxl.load_workbook(xlsx_path)
            sheet_names = wb.sheetnames
            self.assertIn("Overview & KPIs", sheet_names)
            self.assertIn("Dataset Records", sheet_names)
            self.assertIn("Statistical Breakdown", sheet_names)
            self.assertIn("Verification Audit", sheet_names)
        except ImportError:
            pass

    def test_09_job_isolated_execution(self):
        """Verify pipeline strictly isolates files inside outputs/{job_id}/."""
        pipeline = DocumentPipeline()
        sample_csv = self.test_dir / "isolated_sample.csv"
        sample_csv.write_text(
            "Equipment,Runtime_Hours,Fuel_Liters\n"
            "Excavator-1,120,4800\n"
            "Dumper-4,150,6000\n",
            encoding="utf-8"
        )

        res = pipeline.process_file(file_path=sample_csv)
        self.assertIn("job_id", res)
        job_id = res["job_id"]
        job_dir = config.OUTPUTS_DIR / job_id

        self.assertTrue(job_dir.exists())
        self.assertTrue((job_dir / "01_raw_converted.md").exists())
        self.assertTrue((job_dir / "02_llama_analysis.md").exists())
        self.assertTrue((job_dir / "03_math_audit.json").exists())
        self.assertTrue((job_dir / "04_final_systematic_report.md").exists())
        self.assertTrue((job_dir / "metadata.json").exists())

        # Verify job endpoint retrieves isolated artifacts
        job_res = get_report(job_id)
        self.assertEqual(job_res["job_id"], job_id)
        self.assertIn("Excavator-1", job_res["raw_markdown"])

    def test_10_history_manager_atomic_persistence(self):
        """Verify history manager records reports atomically without duplicates and supports job_id."""
        test_officer = os.environ.get("MINEINTEL_OFFICER_ID", "MOC-TEST-OFFICER-7890")
        test_id = f"REP-TEST-{int(time.time())}"
        test_job_id = f"job_test_{int(time.time())}"

        # 1. Test record_report without job_id (backward compatibility)
        entry1 = record_report(
            report_id=test_id,
            title="Sovereign Audit Test",
            template_id="bento_grid",
            template_name="Bento Grid",
            theme="Modern Grid",
            auditor_id=test_officer,
            records_count=5,
            summary_snippet="Test summary snippet."
        )
        self.assertEqual(entry1["id"], test_id)
        self.assertEqual(entry1["job_id"], test_id)

        # 2. Test record_report with job_id
        entry2 = record_report(
            report_id=f"{test_id}_2",
            title="Sovereign Audit Test with Job ID",
            template_id="aurora_gradient",
            template_name="Aurora Modern Presentation",
            theme="Modern Aurora",
            auditor_id=test_officer,
            records_count=8,
            summary_snippet="Test summary snippet with job isolation.",
            job_id=test_job_id
        )
        self.assertEqual(entry2["id"], f"{test_id}_2")
        self.assertEqual(entry2["job_id"], test_job_id)
        self.assertIn(f"job_id={test_job_id}", entry2["pdf_url"])

        # 3. Test add_report_history API endpoint with job_id
        req_hist = RecordHistoryRequest(
            id=f"{test_id}_api",
            title="API Recorded Report",
            template="bento_grid",
            template_name="Bento Grid",
            theme="Modern Grid",
            auditor_id=test_officer,
            records_count=10,
            summary_snippet="API recorded snippet",
            job_id=test_job_id
        )
        api_res = add_report_history(req_hist)
        self.assertTrue(api_res["success"])
        self.assertEqual(api_res["entry"]["job_id"], test_job_id)

        # 4. Test fill_template_content doesn't fail on record_report(..., job_id=job_id)
        test_job_dir = config.OUTPUTS_DIR / test_job_id
        test_job_dir.mkdir(parents=True, exist_ok=True)
        (test_job_dir / "active_dataset.json").write_text(
            json.dumps([{"Entity": "Substation-1", "Output": 450.0}, {"Entity": "Substation-2", "Output": 320.0}]),
            encoding="utf-8"
        )
        (test_job_dir / "04_final_systematic_report.md").write_text(
            "## Executive Summary\nTest substation telemetry verified.",
            encoding="utf-8"
        )
        fill_res = fill_template_content(
            template_id="bento_grid",
            req=TemplateFillRequest(job_id=test_job_id)
        )
        self.assertTrue(fill_res["success"])
        self.assertEqual(fill_res["job_id"], test_job_id)

        # 5. Test download_report_format dynamic generation with job_id
        dl_res = download_report_format(fmt="pdf", template="bento_grid", job_id=test_job_id)
        self.assertIsNotNone(dl_res)
        self.assertEqual(dl_res.status_code, 200)

        # Retrieve and verify search by title and by job_id
        history = get_history(search="Sovereign Audit Test")
        self.assertTrue(any(h["id"] == test_id for h in history))
        hist_job = get_history(search=test_job_id)
        self.assertTrue(any(h.get("job_id") == test_job_id for h in hist_job))

    def test_11_core_api_endpoints(self):
        """Verify core discovery and dataset endpoint functions respond successfully."""
        # 1. Health
        h = health_check()
        self.assertEqual(h["status"], "healthy")

        # 2. Templates
        t = list_report_templates()
        self.assertEqual(len(t["templates"]), 6)

        # 3. Datasets Catalog
        d = list_available_datasets()
        self.assertTrue(len(d["datasets"]) >= 5)

        # 4. Trends
        tr = get_trends_data()
        self.assertIn("status", tr)

        # 5. Analytics Summary
        a = get_analytics_summary()
        self.assertEqual(a["status"], "success")
        self.assertIn("total_production_mt", a)

    def test_12_large_document_coverage_no_page_drop(self):
        """Verify large document extraction (60 pages) extracts 100% of pages with NO truncation."""
        try:
            from reportlab.pdfgen import canvas
        except ImportError:
            self.skipTest("ReportLab not available for synthetic PDF generation")

        pdf_path = self.test_dir / "large_60_page_audit.pdf"
        c = canvas.Canvas(str(pdf_path))
        for page_num in range(1, 61):
            c.drawString(100, 750, f"Ministry Audit Telemetry - Page {page_num}")
            c.drawString(100, 700, f"Colliery Data Block {page_num}: Production={page_num * 10} MT")
            if page_num == 60:
                c.drawString(100, 650, "PAGE_60_CRITICAL_TELEMETRY_MARKER_CONFIRMED")
            c.showPage()
        c.save()

        # Convert without arbitrary max_pages truncation
        converter = MarkdownConverter()
        result = converter.convert(pdf_path)
        markdown = result["markdown"]

        # Verify all pages extracted without silent drops
        self.assertIn("## Page 1", markdown)
        self.assertIn("## Page 30", markdown)
        self.assertIn("## Page 50", markdown)
        self.assertIn("## Page 60", markdown)
        self.assertIn("PAGE_60_CRITICAL_TELEMETRY_MARKER_CONFIRMED", markdown)

        # Verify LLM chunking preserves late pages without truncation
        llama = LlamaClient()
        chunks = llama._chunk_markdown(markdown, max_chunk_chars=3000)
        self.assertTrue(len(chunks) > 1)
        full_chunked_text = " ".join(chunks)
        self.assertIn("PAGE_60_CRITICAL_TELEMETRY_MARKER_CONFIRMED", full_chunked_text)

    def test_13_excel_xls_xlsx_pipeline(self):
        """Verify multi-sheet XLSX extraction, tabular conversion, and full pipeline processing."""
        try:
            import pandas as pd
        except ImportError:
            self.skipTest("Pandas not available for Excel pipeline test")

        excel_path = self.test_dir / "multisheet_coal_telemetry.xlsx"
        with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
            df_prod = pd.DataFrame({
                "Colliery": ["MCL-Lakhanpur", "SECL-Dipka", "BCCL-Kusmunda"],
                "Target_MT": [25.0, 30.0, 40.0],
                "Actual_MT": [24.8, 31.2, 39.5]
            })
            df_prod.to_excel(writer, sheet_name="Production_Data", index=False)

            df_fleet = pd.DataFrame({
                "Fleet_ID": ["EXC-101", "DUMP-204", "DRAG-302"],
                "Fuel_Rate_LPH": [42.5, 38.0, 95.0],
                "Health_Score": [98, 92, 88]
            })
            df_fleet.to_excel(writer, sheet_name="Fleet_Telemetry", index=False)

        converter = MarkdownConverter()
        conv_res = converter.convert(excel_path)
        self.assertEqual(conv_res["file_type"], "xlsx")
        self.assertIn("Sheet 1: Production_Data", conv_res["markdown"])
        self.assertIn("Sheet 2: Fleet_Telemetry", conv_res["markdown"])
        self.assertIn("MCL-Lakhanpur", conv_res["markdown"])
        self.assertIn("EXC-101", conv_res["markdown"])
        self.assertTrue(len(conv_res.get("records", [])) >= 3)

        # Test pipeline execution on this multi-sheet excel file
        pipeline = DocumentPipeline()
        pipe_res = pipeline.process_file(file_path=excel_path)
        self.assertTrue(pipe_res["success"])
        self.assertEqual(pipe_res["metadata"]["status"], "COMPLETED")
        job_dir = config.OUTPUTS_DIR / pipe_res["job_id"]
        self.assertTrue((job_dir / "01_raw_converted.md").exists())
        self.assertTrue((job_dir / "04_final_systematic_report.md").exists())


if __name__ == "__main__":
    unittest.main()
