"""
MineIntel Phase 8: Report Editor & Versioning Comprehensive Unit Tests

Verifies:
1. Initialization and preservation of Version 1 (ORIGINAL) immutable baseline
2. Revision version creation (v2, v3) on section and batch edits
3. Tracking original, edited, approved, and finalized states
4. Retention of evidence IDs, chart IDs, and provenance citations across revisions
5. Audit diff tracking (user_modified=True, modified_sections list)
6. Restoring historical versions (appends new version without rewriting past history)
7. Formal regulatory approval (state=approved, stamped approving officer) and finalization
8. Prevention of accidental modifications to finalized reports
9. Export endpoint serving the active/approved revision export
10. Strict Phase 0 user ownership isolation across editing, restore, and approval APIs
"""

import os
import shutil
import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse

from backend import config
from backend.main import (
    ReportApproveRequest,
    ReportBatchEditRequest,
    ReportFinalizeRequest,
    ReportRestoreRequest,
    ReportSectionEditRequest,
    approve_report_endpoint,
    download_report_endpoint,
    edit_report_batch_endpoint,
    edit_report_section_endpoint,
    finalize_report_endpoint,
    get_report_revision_endpoint,
    list_report_revisions_endpoint,
    restore_report_revision_endpoint,
)
from backend.services import (
    chart_store,
    evidence_store,
    ingestion_store,
    intelligence_store,
    planner_store,
    report_editor_store,
    report_generator_store,
)
from backend.services.evidence_models import (
    EvidenceClassification,
    StructuredEvidenceItem,
)
from backend.services.planner_service import planner_service
from backend.services.report_editor_models import ReportRevision, ReportState
from backend.services.report_editor_service import report_editor_service
from backend.services.report_generator_service import report_generator_service


class TestPhase8ReportEditor(unittest.TestCase):
    """Unit and integration tests for Phase 8 Report Editor & Versioning."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.orig_data = config.DATA_DIR
        config.DATA_DIR = Path(self.temp_dir)

        self.orig_ingest_store = ingestion_store.STORE_FILE
        self.orig_ev_store = evidence_store.EVIDENCE_FILE
        self.orig_intel_store = intelligence_store.INTELLIGENCE_FILE
        self.orig_chart_store = chart_store.CHARTS_FILE
        self.orig_plan_store = planner_store.PLANS_FILE
        self.orig_rep_store = report_generator_store.REPORTS_META_FILE
        self.orig_rev_store = report_editor_store.REVISIONS_FILE

        ingestion_store.STORE_FILE = Path(self.temp_dir) / "ingestion_store.json"
        evidence_store.EVIDENCE_FILE = Path(self.temp_dir) / "evidence_store.json"
        intelligence_store.INTELLIGENCE_FILE = Path(self.temp_dir) / "intelligence_store.json"
        chart_store.CHARTS_FILE = Path(self.temp_dir) / "charts_store.json"
        planner_store.PLANS_FILE = Path(self.temp_dir) / "report_plans.json"
        report_generator_store.REPORTS_META_FILE = Path(self.temp_dir) / "generated_reports.json"
        report_editor_store.REVISIONS_FILE = Path(self.temp_dir) / "report_revisions.json"

        self.officer_1 = "OFFICER_P8_ALPHA"
        self.officer_2 = "OFFICER_P8_BETA"
        self.auth_1 = {"officer_id": self.officer_1, "role": "Investigator"}
        self.auth_2 = {"officer_id": self.officer_2, "role": "Investigator"}

        # 1. Seed job
        self.job_id = "job_p8_test_001"
        ingestion_store.save_job({
            "job_id": self.job_id,
            "owner_id": self.officer_1,
            "status": "completed",
            "files": [{"file_id": "file_p8_1", "filename": "mine_operations.csv", "format": "csv"}]
        })

        # 2. Seed structured evidence
        self.ev_items = [
            StructuredEvidenceItem(
                evidence_id="EV-P8-001",
                job_id=self.job_id,
                file_id="file_p8_1",
                owner_id=self.officer_1,
                layer="processed",
                classification=EvidenceClassification.LOCKED_FACT.value,
                content_text="Total FY2023-24 Coal Production: 18.5 MT across Rajmahal Open Cast Project.",
                provenance={"filename": "mine_operations.csv", "citation": "mine_operations.csv, Row 2"}
            ),
            StructuredEvidenceItem(
                evidence_id="EV-P8-002",
                job_id=self.job_id,
                file_id="file_p8_1",
                owner_id=self.officer_1,
                layer="processed",
                classification=EvidenceClassification.CALCULATED_VALUE.value,
                content_text="Overburden removal efficiency ratio stood at 3.12 m3/T.",
                provenance={"filename": "mine_operations.csv", "citation": "mine_operations.csv, Col E"}
            )
        ]
        evidence_store.save_evidence_items([e.to_dict() for e in self.ev_items])

        # 3. Generate Phase 6 Plan
        plan_res = planner_service.generate_plan(
            job_id=self.job_id,
            owner_id=self.officer_1,
            title="Sovereign Audit of Rajmahal Open Cast Mining"
        )
        self.assertTrue(plan_res.get("success"))
        self.plan_id = plan_res["plan_id"]

        # 4. Generate Phase 7 Report
        rep_res = report_generator_service.generate_report(
            job_id=self.job_id,
            owner_id=self.officer_1,
            plan_id=self.plan_id,
            formats=["pdf", "md"]
        )
        self.assertTrue(rep_res.get("success"))
        self.report_id = rep_res["report_id"]

    def tearDown(self):
        config.DATA_DIR = self.orig_data
        ingestion_store.STORE_FILE = self.orig_ingest_store
        evidence_store.EVIDENCE_FILE = self.orig_ev_store
        intelligence_store.INTELLIGENCE_FILE = self.orig_intel_store
        chart_store.CHARTS_FILE = self.orig_chart_store
        planner_store.PLANS_FILE = self.orig_plan_store
        report_generator_store.REPORTS_META_FILE = self.orig_rep_store
        report_editor_store.REVISIONS_FILE = self.orig_rev_store
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_version_1_baseline_preserved(self):
        """Tests that initial generated report creates an immutable Version 1 with state ORIGINAL."""
        v1 = report_editor_service.get_revision(self.report_id, version=1, owner_id=self.officer_1)
        self.assertIsNotNone(v1)
        self.assertEqual(v1["version"], 1)
        self.assertEqual(v1["state"], ReportState.ORIGINAL.value)
        self.assertEqual(v1["owner_id"], self.officer_1)
        self.assertEqual(v1["report_id"], self.report_id)
        self.assertGreater(len(v1["sections"]), 0)
        # Verify evidence citations are attached to sections
        sec1 = v1["sections"][0]
        self.assertFalse(sec1["user_modified"])
        self.assertIn("EV-P8-", sec1["evidence_ids"][0])

    def test_edit_section_increments_version_and_preserves_original(self):
        """Tests editing a specific section creates Version 2 with user_modified=True while v1 remains intact."""
        v1 = report_editor_service.get_revision(self.report_id, version=1, owner_id=self.officer_1)
        target_sec_id = v1["sections"][0]["section_id"]
        original_text = v1["sections"][0]["content_text"]

        # Edit section
        edit_res = report_editor_service.edit_section(
            report_id=self.report_id,
            owner_id=self.officer_1,
            section_id=target_sec_id,
            new_title="Revised Executive Findings",
            new_content="AUDITOR REVISION: Coal output in Rajmahal was validated at 18.5 MT with full environmental compliance.",
            change_summary="Updated executive findings for regulatory clarity"
        )
        self.assertTrue(edit_res.get("success"), f"Edit failed: {edit_res}")
        self.assertEqual(edit_res["version"], 2)
        self.assertEqual(edit_res["state"], ReportState.DRAFT_EDIT.value)
        self.assertIn(target_sec_id, edit_res["modified_sections"])

        # Check v2
        v2 = report_editor_service.get_revision(self.report_id, version=2, owner_id=self.officer_1)
        self.assertIsNotNone(v2)
        self.assertEqual(v2["sections"][0]["title"], "Revised Executive Findings")
        self.assertTrue(v2["sections"][0]["user_modified"])
        self.assertEqual(v2["sections"][0]["original_content_text"], original_text)
        # Evidence IDs must be preserved!
        self.assertEqual(v2["sections"][0]["evidence_ids"], v1["sections"][0]["evidence_ids"])

        # Check v1 remains completely unchanged (immutable baseline)
        v1_recheck = report_editor_service.get_revision(self.report_id, version=1, owner_id=self.officer_1)
        self.assertEqual(v1_recheck["version"], 1)
        self.assertEqual(v1_recheck["state"], ReportState.ORIGINAL.value)
        self.assertEqual(v1_recheck["sections"][0]["title"], v1["sections"][0]["title"])
        self.assertFalse(v1_recheck["sections"][0]["user_modified"])

    def test_batch_edit_report(self):
        """Tests batch editing title and multiple sections creates Version 2/3."""
        v1 = report_editor_service.get_revision(self.report_id, version=1, owner_id=self.officer_1)
        target_sec = v1["sections"][0]["section_id"]

        batch_res = report_editor_service.edit_report(
            report_id=self.report_id,
            owner_id=self.officer_1,
            title="Final Operational Assessment of Rajmahal Mines",
            subtitle="Prepared for Ministry of Coal Review",
            section_updates=[
                {"section_id": target_sec, "content_text": "Updated multi-factor audit text."}
            ],
            change_summary="Comprehensive title and section revision"
        )
        self.assertTrue(batch_res["success"])
        self.assertEqual(batch_res["version"], 2)

        v2 = report_editor_service.get_revision(self.report_id, version=2, owner_id=self.officer_1)
        self.assertEqual(v2["title"], "Final Operational Assessment of Rajmahal Mines")
        self.assertEqual(v2["subtitle"], "Prepared for Ministry of Coal Review")

    def test_restore_previous_version(self):
        """Tests restoring a previous revision appends a new version without deleting history."""
        # 1. Edit section to create v2
        v1 = report_editor_service.get_revision(self.report_id, version=1, owner_id=self.officer_1)
        sec_id = v1["sections"][0]["section_id"]
        report_editor_service.edit_section(
            report_id=self.report_id,
            owner_id=self.officer_1,
            section_id=sec_id,
            new_title="V2 Modified Title",
            new_content="V2 Content"
        )

        # 2. Restore v1
        restore_res = report_editor_service.restore_revision(
            report_id=self.report_id,
            target_version=1,
            owner_id=self.officer_1
        )
        self.assertTrue(restore_res["success"])
        self.assertEqual(restore_res["version"], 3)
        self.assertEqual(restore_res["restored_from_version"], 1)

        # 3. Verify v3 content matches v1
        v3 = report_editor_service.get_revision(self.report_id, version=3, owner_id=self.officer_1)
        self.assertEqual(v3["sections"][0]["title"], v1["sections"][0]["title"])
        self.assertEqual(v3["parent_version"], 1)

        # 4. Verify all 3 revisions exist in history
        rev_list = report_editor_service.list_revisions(self.report_id, owner_id=self.officer_1)
        self.assertEqual(len(rev_list), 3)
        self.assertEqual([r["version"] for r in rev_list], [1, 2, 3])

    def test_approval_and_finalization_workflow(self):
        """Tests approving and finalizing revisions, and verifying lock on finalized reports."""
        # Approve version 1
        app_res = report_editor_service.approve_report(
            report_id=self.report_id,
            owner_id=self.officer_1,
            version=1,
            approving_officer="SENIOR_AUDITOR_SHARMA"
        )
        self.assertTrue(app_res["success"])
        self.assertEqual(app_res["state"], ReportState.APPROVED.value)
        self.assertEqual(app_res["approved_by"], "SENIOR_AUDITOR_SHARMA")

        v1_app = report_editor_service.get_revision(self.report_id, version=1, owner_id=self.officer_1)
        self.assertEqual(v1_app["state"], ReportState.APPROVED.value)

        # Finalize report
        fin_res = report_editor_service.finalize_report(
            report_id=self.report_id,
            owner_id=self.officer_1,
            version=1,
            finalizing_officer="DIRECTOR_GENERAL_MINES"
        )
        self.assertTrue(fin_res["success"])
        self.assertEqual(fin_res["state"], ReportState.FINALIZED.value)

        # Editing a finalized report directly is prevented
        sec_id = v1_app["sections"][0]["section_id"]
        blocked_edit = report_editor_service.edit_section(
            report_id=self.report_id,
            owner_id=self.officer_1,
            section_id=sec_id,
            new_content="Illegal modification"
        )
        self.assertFalse(blocked_edit["success"])
        self.assertIn("FINALIZED", blocked_edit["error"])

    def test_consistent_export_reflects_approved_version(self):
        """Tests that download endpoint serves the approved revision export rather than outdated draft."""
        # 1. Edit section to create v2
        v1 = report_editor_service.get_revision(self.report_id, version=1, owner_id=self.officer_1)
        sec_id = v1["sections"][0]["section_id"]
        report_editor_service.edit_section(
            report_id=self.report_id,
            owner_id=self.officer_1,
            section_id=sec_id,
            new_title="Approved Title In Output",
            new_content="Approved specific textual addition.",
            change_summary="Ready for regulatory sign-off"
        )

        # 2. Approve v2
        report_editor_service.approve_report(
            report_id=self.report_id,
            owner_id=self.officer_1,
            version=2,
            approving_officer="AUDITOR_GENERAL"
        )

        # 3. Call download endpoint for MD
        dl_resp = download_report_endpoint(
            report_id=self.report_id,
            format="md",
            auth=self.auth_1
        )
        self.assertIsInstance(dl_resp, FileResponse)
        content = Path(dl_resp.path).read_text(encoding="utf-8")
        self.assertIn("Approved Title In Output", content)
        self.assertIn("Approved specific textual addition", content)

    def test_api_endpoints_and_cross_user_isolation(self):
        """Tests FastAPI editor endpoints and verifies 403/404 on cross-user unauthorized access."""
        # 1. List revisions as Officer 1
        list_res = list_report_revisions_endpoint(report_id=self.report_id, auth=self.auth_1)
        self.assertTrue(list_res["success"])
        self.assertGreaterEqual(list_res["revisions_count"], 1)

        # 2. Get specific revision as Officer 1
        get_res = get_report_revision_endpoint(report_id=self.report_id, version=1, auth=self.auth_1)
        self.assertTrue(get_res["success"])
        sec_id = get_res["revision"]["sections"][0]["section_id"]

        # 3. Edit section via API
        edit_req = ReportSectionEditRequest(
            section_id=sec_id,
            content_text="API revised text string."
        )
        edit_res = edit_report_section_endpoint(report_id=self.report_id, payload=edit_req, auth=self.auth_1)
        self.assertTrue(edit_res["success"])
        new_v = edit_res["version"]

        # 4. Restore via API
        rest_req = ReportRestoreRequest(version=1)
        rest_res = restore_report_revision_endpoint(report_id=self.report_id, payload=rest_req, auth=self.auth_1)
        self.assertTrue(rest_res["success"])

        # 5. Approve via API
        app_req = ReportApproveRequest(version=new_v)
        app_res = approve_report_endpoint(report_id=self.report_id, payload=app_req, auth=self.auth_1)
        self.assertTrue(app_res["success"])

        # 6. Finalize via API
        fin_req = ReportFinalizeRequest(version=new_v)
        fin_res = finalize_report_endpoint(report_id=self.report_id, payload=fin_req, auth=self.auth_1)
        self.assertTrue(fin_res["success"])

        # 7. CROSS-USER ISOLATION: Officer 2 cannot access Officer 1's report
        with self.assertRaises(HTTPException) as ctx:
            list_report_revisions_endpoint(report_id=self.report_id, auth=self.auth_2)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            get_report_revision_endpoint(report_id=self.report_id, version=1, auth=self.auth_2)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            edit_report_section_endpoint(report_id=self.report_id, payload=edit_req, auth=self.auth_2)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            restore_report_revision_endpoint(report_id=self.report_id, payload=rest_req, auth=self.auth_2)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            approve_report_endpoint(report_id=self.report_id, payload=app_req, auth=self.auth_2)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            finalize_report_endpoint(report_id=self.report_id, payload=fin_req, auth=self.auth_2)
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
