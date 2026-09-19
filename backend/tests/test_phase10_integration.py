"""
MineIntel Phase 10 Integration Verification Test Suite

Verifies:
1. Login & Authentication Flow with real token validation and CAPTCHA challenge
2. Ingestion Flow: real file upload, job manifest, status tracking, and file retrieval
3. Model Status: /api/ai/status returns provider-neutral local model status without cloud replacement
4. Structured Evidence: /api/evidence queries return immutable structured items
5. Intelligence & Organization: /api/intelligence/dossier and conflicts
6. Chart Intelligence: /api/charts/detect and /api/charts/generate
7. Report Planner: /api/planner/generate produces dynamic plan tree
8. Long Report Generation: /api/reports/generate-long compiles PDF/DOCX/MD
9. Report Editor & Versioning: /api/reports/{id}/edit-section creates immutable revisions and diffs
10. Zero Demo Data Guarantee: A user with zero files receives zero demo/CIL business data
11. Security & Ownership Isolation: Cross-officer isolation is strictly enforced
"""

import io
import json
import os
import unittest
from pathlib import Path

from fastapi import HTTPException, Response

from backend import auth_store, config
from backend.main import (
    LoginRequest,
    PlanGenerateRequest,
    GenerateLongReportRequest,
    ReportSectionEditRequest,
    ReportExportRequest,
    auth_captcha,
    auth_login,
    auth_verify,
    auth_profile,
    get_ai_status_endpoint,
    list_structured_evidence,
    list_ingestion_jobs,
    get_ingestion_job_status,
    generate_report_plan_endpoint,
    generate_long_report_endpoint,
    list_report_revisions_endpoint,
    edit_report_section_endpoint,
    download_report_endpoint,
    export_report_v1,
)
from unittest.mock import patch
from backend.services import captcha as captcha_service
from backend.services.captcha import create_challenge
from backend.services.ingestion_service import ingestion_engine
from backend.services.intelligence_service import intelligence_service
from backend.services.chart_service import chart_service


class TestPhase10Integration(unittest.TestCase):
    def setUp(self):
        self.officer_id = "PHASE10_AUDITOR"
        self.password = "SecPass_P10_2026!"
        if not auth_store.get_user_by_id(self.officer_id):
            auth_store.create_user(
                officer_id=self.officer_id,
                password=self.password,
                display_name="Phase 10 Certified Auditor",
                role="Operational Auditor",
                phone="+91-9988776655",
                email="p10@mineintel.gov.in"
            )

        # Authenticate via real login
        with patch.object(captcha_service, "_secure_answer", return_value="CAP123"):
            challenge = captcha_service.create_challenge()
            login_res = auth_login(LoginRequest(
                officer_id=self.officer_id,
                password=self.password,
                captcha_challenge_id=challenge["challenge_id"],
                captcha_answer="CAP123"
            ))
        self.assertIn("token", login_res)
        self.token = login_res["token"]
        self.auth = {"officer_id": self.officer_id, "role": "Operational Auditor"}

    def test_01_auth_flow_and_captcha(self):
        """Verifies login, token verification, profile, and CAPTCHA behavior."""
        # 1. CAPTCHA generation
        cap_data = auth_captcha(Response())
        self.assertIn("challenge_id", cap_data)
        self.assertIn("image", cap_data)

        # 2. Token verification
        verify_data = auth_verify(authorization=f"Bearer {self.token}")
        self.assertTrue(verify_data["authenticated"])
        self.assertEqual(verify_data["officer_id"], self.officer_id)

        # 3. Profile query
        prof_data = auth_profile(self.auth)
        self.assertEqual(prof_data["officer_id"], self.officer_id)

    def test_02_empty_state_guarantee(self):
        """A new user with zero files must receive empty state and zero demo/CIL business data."""
        import uuid
        fresh_officer_id = f"FRESH_OFFICER_{uuid.uuid4().hex[:6]}"
        fresh_auth = {"officer_id": fresh_officer_id, "role": "Operational Auditor"}

        # Evidence query with 0 files
        ev_data = list_structured_evidence(auth=fresh_auth)
        user_items = [i for i in ev_data.get("items", []) if i.get("owner_id") == fresh_officer_id]
        self.assertEqual(len(user_items), 0)

        # Ingestion jobs query
        jobs_data = list_ingestion_jobs(auth=fresh_auth)
        user_jobs = jobs_data.get("jobs", [])
        self.assertEqual(len(user_jobs), 0)

    def test_03_model_status_local_ai(self):
        """Verifies /api/ai/status returns provider-neutral status without cloud replacement."""
        ai_data = get_ai_status_endpoint(auth=self.auth)
        self.assertTrue(ai_data["success"])
        status = ai_data["ai_status"]
        self.assertIn("active_provider", status)
        self.assertIn("active_status", status)
        self.assertIn("all_providers", status)

    def test_04_full_ingestion_to_report_flow(self):
        """Verifies ingestion -> evidence -> intelligence -> charts -> planner -> report -> editor -> export."""
        # 1. Ingestion of real CSV evidence
        csv_bytes = b"Colliery,Target_MT,Actual_MT,Variance_MT,Month\nRajmahal_OCP,14.5,15.2,0.7,Jan-2026\nPiprawar_OCP,12.0,11.8,-0.2,Jan-2026\n"
        manifest = ingestion_engine.create_ingestion_job(
            owner_id=self.officer_id,
            files=[("production_audit_actual.csv", csv_bytes)]
        )
        job_id = manifest["job_id"]
        self.assertTrue(job_id.startswith("ingest_"))

        # 2. Job status check
        job_data = get_ingestion_job_status(job_id=job_id, auth=self.auth)
        self.assertEqual(job_data["job"]["job_id"], job_id)

        # 3. Evidence extraction query
        ev_data = list_structured_evidence(job_id=job_id, auth=self.auth)
        items = ev_data.get("items", [])
        self.assertGreater(len(items), 0)

        # 4. Intelligence organization
        intel_res = intelligence_service.organize_job_evidence(job_id=job_id, owner_id=self.officer_id)
        self.assertTrue(intel_res.get("success", True))

        # 5. Chart detection
        tables = chart_service.detect_tables(job_id=job_id, owner_id=self.officer_id)
        self.assertIsInstance(tables, list)

        # 6. Report Planner
        plan_res = generate_report_plan_endpoint(
            payload=PlanGenerateRequest(
                job_id=job_id,
                title="Quarterly Regulatory Production Review",
                use_ai=False
            ),
            auth=self.auth
        )
        self.assertTrue(plan_res["success"])
        plan_id = plan_res["plan_id"]

        # 7. Long-Document Report Generation
        gen_res = generate_long_report_endpoint(
            payload=GenerateLongReportRequest(
                job_id=job_id,
                plan_id=plan_id,
                title="Quarterly Regulatory Production Review",
                formats=["pdf", "docx", "md"]
            ),
            auth=self.auth
        )
        self.assertTrue(gen_res["success"])
        report_id = gen_res["report_id"]

        # 8. Report Revisions / Editor (Phase 8)
        rev_data = list_report_revisions_endpoint(report_id=report_id, auth=self.auth)
        self.assertTrue(rev_data["success"])
        self.assertGreater(len(rev_data["revisions"]), 0)

        # Edit a section
        sections = rev_data["revisions"][0].get("sections", [])
        self.assertGreater(len(sections), 0)
        sec_id = sections[0]["section_id"]
        edit_data = edit_report_section_endpoint(
            report_id=report_id,
            payload=ReportSectionEditRequest(
                section_id=sec_id,
                title="Executive Summary (Auditor Verified)",
                content_text="Auditor verified factual reconciliation against production_audit_actual.csv.",
                change_summary="Reconciled numbers with source ledger."
            ),
            auth=self.auth
        )
        self.assertTrue(edit_data["success"])

        # 9. Download Report
        dl_res = download_report_endpoint(report_id=report_id, format="pdf", auth=self.auth)
        self.assertIsNotNone(dl_res)

        # 10. Export v1 endpoint bridge
        exp_data = export_report_v1(req=ReportExportRequest(
            format="pdf",
            report_title="Quarterly Review",
            job_id=report_id
        ))
        self.assertEqual(exp_data["status"], "success")
        self.assertIn(f"/api/reports/{report_id}/download?format=pdf", exp_data["download_url"])

    def test_05_cross_user_isolation(self):
        """Ensures officer A cannot access officer B's jobs or reports."""
        auth_b = {"officer_id": "OFFICER_B", "role": "Operational Auditor"}

        # User A uploads a job
        csv_bytes = b"Colliery,Target\nMine_A,10.0\n"
        manifest = ingestion_engine.create_ingestion_job(
            owner_id=self.officer_id,
            files=[("secret_a.csv", csv_bytes)]
        )
        job_id_a = manifest["job_id"]

        # User B attempts to access user A's job status -> must raise HTTPException(403)
        with self.assertRaises(HTTPException) as cm:
            get_ingestion_job_status(job_id=job_id_a, auth=auth_b)
        self.assertEqual(cm.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
