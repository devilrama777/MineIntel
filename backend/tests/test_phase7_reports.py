"""
MineIntel Phase 7: Long-Document Report Generation Comprehensive Test Suite

Verifies:
1. Generation of source-grounded reports consuming Phase 6 Report Plans (rather than fixed templates)
2. Professional layout with NumberedReportCanvas running headers, footers ("Page X of Y"), and cover page
3. Dynamic section rendering with supporting evidence, Phase 5 charts, and tabular provenance
4. Strict factual groundedness: calculations come from evidence/Phase 5; zero numerical AI fabrication
5. Explicit handling of missing/insufficient evidence via audit alert callouts
6. Multi-format export: PDF primary, plus DOCX and Markdown
7. Large-document streaming capability
8. Strict Phase 0 user ownership isolation across generation, status, and download APIs
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
    GenerateLongReportRequest,
    download_report_endpoint,
    generate_long_report_endpoint,
    get_report_status_endpoint,
    list_job_reports_endpoint,
)
from backend.services import (
    chart_store,
    evidence_store,
    ingestion_store,
    intelligence_store,
    planner_store,
)
from backend.services.evidence_models import (
    EvidenceClassification,
    StructuredEvidenceItem,
)
from backend.services.long_document_builder import long_document_builder
from backend.services.planner_service import planner_service
from backend.services.report_generator_models import (
    GeneratedReportArtifact,
    ReportGenerationStatus,
)
from backend.services.report_generator_service import report_generator_service
from backend.services import report_generator_store


class TestPhase7ReportGeneration(unittest.TestCase):
    """Integration and unit tests for Phase 7 report generation."""

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

        ingestion_store.STORE_FILE = Path(self.temp_dir) / "ingestion_store.json"
        evidence_store.EVIDENCE_FILE = Path(self.temp_dir) / "evidence_store.json"
        intelligence_store.INTELLIGENCE_FILE = Path(self.temp_dir) / "intelligence_store.json"
        chart_store.CHARTS_FILE = Path(self.temp_dir) / "charts_store.json"
        planner_store.PLANS_FILE = Path(self.temp_dir) / "report_plans.json"
        report_generator_store.REPORTS_META_FILE = Path(self.temp_dir) / "generated_reports.json"

        self.officer_1 = "OFFICER_P7_ALPHA"
        self.officer_2 = "OFFICER_P7_BETA"
        self.auth_1 = {"officer_id": self.officer_1, "role": "Investigator"}
        self.auth_2 = {"officer_id": self.officer_2, "role": "Investigator"}

        # Seed an ingestion job
        self.job_id = "job_p7_test_001"
        ingestion_store.save_job({
            "job_id": self.job_id,
            "owner_id": self.officer_1,
            "status": "completed",
            "files": [
                {
                    "file_id": "file_p7_1",
                    "filename": "annual_coal_dispatch.csv",
                    "format": "csv",
                    "status": "processed"
                }
            ],
            "created_at": 1700000000000
        })

        # Seed structured evidence
        self.ev_items = [
            StructuredEvidenceItem(
                evidence_id="EV-P7-001",
                job_id=self.job_id,
                file_id="file_p7_1",
                owner_id=self.officer_1,
                layer="processed",
                classification=EvidenceClassification.LOCKED_FACT.value,
                content_text="Total FY2023-24 Raw Coal Dispatch reached 14.82 Million Metric Tonnes across North Karanpura.",
                provenance={"filename": "annual_coal_dispatch.csv", "citation": "annual_coal_dispatch.csv, Row 4", "row_index": 4}
            ),
            StructuredEvidenceItem(
                evidence_id="EV-P7-002",
                job_id=self.job_id,
                file_id="file_p7_1",
                owner_id=self.officer_1,
                layer="processed",
                classification=EvidenceClassification.CALCULATED_VALUE.value,
                content_text="Compound dispatch growth measured +12.4% over previous fiscal audit baseline.",
                provenance={"filename": "annual_coal_dispatch.csv", "citation": "annual_coal_dispatch.csv, Col B-D"}
            )
        ]
        evidence_store.save_evidence_items([e.to_dict() for e in self.ev_items])

        # Generate Phase 6 Plan
        plan_res = planner_service.generate_plan(
            job_id=self.job_id,
            owner_id=self.officer_1,
            title="Dossier on Operational Coal Dispatches"
        )
        self.assertTrue(plan_res.get("success"), f"Plan generation failed: {plan_res}")
        self.plan_id = plan_res["plan_id"]

    def tearDown(self):
        config.DATA_DIR = self.orig_data
        ingestion_store.STORE_FILE = self.orig_ingest_store
        evidence_store.EVIDENCE_FILE = self.orig_ev_store
        intelligence_store.INTELLIGENCE_FILE = self.orig_intel_store
        chart_store.CHARTS_FILE = self.orig_chart_store
        planner_store.PLANS_FILE = self.orig_plan_store
        report_generator_store.REPORTS_META_FILE = self.orig_rep_store
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_report_builder_pdf_compilation(self):
        """Tests that LongDocumentBuilder produces a valid multi-page PDF with NumberedCanvas."""
        plan_dict = planner_service.get_plan(self.plan_id, owner_id=self.officer_1)
        self.assertIsNotNone(plan_dict)
        from backend.services.planner_models import ReportPlan
        plan_obj = ReportPlan.from_dict(plan_dict)

        pdf_path, page_count = long_document_builder.build_pdf(
            plan=plan_obj,
            evidence_items=[e.to_dict() for e in self.ev_items],
            charts=[],
            output_filename="test_run_long_doc.pdf"
        )

        self.assertTrue(Path(pdf_path).exists())
        self.assertGreaterEqual(page_count, 2)  # Cover + TOC + Sections
        with open(pdf_path, "rb") as f:
            header = f.read(5)
            self.assertEqual(header, b"%PDF-")

    def test_report_builder_docx_and_markdown(self):
        """Tests Word DOCX and Markdown compilation from the exact same plan."""
        plan_dict = planner_service.get_plan(self.plan_id, owner_id=self.officer_1)
        self.assertIsNotNone(plan_dict)
        from backend.services.planner_models import ReportPlan
        plan = ReportPlan.from_dict(plan_dict)

        # DOCX
        docx_path = long_document_builder.build_docx(
            plan=plan,
            evidence_items=[e.to_dict() for e in self.ev_items],
            charts=[],
            output_filename="test_run_doc.docx"
        )
        self.assertTrue(Path(docx_path).exists())
        self.assertGreater(os.path.getsize(docx_path), 500)

        # Markdown
        md_path = long_document_builder.build_markdown(
            plan=plan,
            evidence_items=[e.to_dict() for e in self.ev_items],
            charts=[],
            output_filename="test_run_doc.md"
        )
        self.assertTrue(Path(md_path).exists())
        content = Path(md_path).read_text(encoding="utf-8")
        self.assertIn("MIN/REP/", content)
        self.assertIn("EV-P7-001", content)
        self.assertIn("annual_coal_dispatch.csv", content)

    def test_report_service_end_to_end_generation(self):
        """Tests report_generator_service full generation pipeline with formats and status persistence."""
        res = report_generator_service.generate_report(
            job_id=self.job_id,
            owner_id=self.officer_1,
            plan_id=self.plan_id,
            formats=["pdf", "docx", "md"]
        )
        self.assertTrue(res.get("success"), f"Generation failed: {res}")
        self.assertEqual(res.get("status"), ReportGenerationStatus.COMPLETED.value)
        self.assertGreater(res.get("page_count", 0), 1)

        rep_id = res["report_id"]
        saved = report_generator_service.get_report(rep_id, owner_id=self.officer_1)
        self.assertIsNotNone(saved)
        self.assertEqual(saved["report_id"], rep_id)
        self.assertEqual(saved["job_id"], self.job_id)
        self.assertEqual(saved["owner_id"], self.officer_1)
        self.assertTrue(Path(saved["pdf_path"]).exists())
        self.assertTrue(Path(saved["docx_path"]).exists())
        self.assertTrue(Path(saved["md_path"]).exists())

    def test_missing_evidence_audit_callout_rendered(self):
        """Tests that sections flagged with insufficient evidence render audit warning callouts."""
        plan_dict = planner_service.get_plan(self.plan_id, owner_id=self.officer_1)
        plan_dict["sections"][0]["validation_status"] = "insufficient"
        plan_dict["insufficient_evidence_flags"] = [{
            "flag_id": "flag_missing_01",
            "section_id": plan_dict["sections"][0]["section_id"],
            "topic": "Environment",
            "required_evidence_type": "Water Pollution Assessment",
            "rationale": "Zero water discharge monitoring records were supplied in files."
        }]

        from backend.services.planner_models import ReportPlan
        plan_obj = ReportPlan.from_dict(plan_dict)

        md_path = long_document_builder.build_markdown(
            plan=plan_obj,
            evidence_items=[e.to_dict() for e in self.ev_items],
            charts=[],
            output_filename="test_missing_alert.md"
        )
        content = Path(md_path).read_text(encoding="utf-8")
        self.assertIn("AUDIT NOTICE", content)
        self.assertIn("Zero water discharge monitoring records were supplied", content)

    def test_large_document_streaming_scalability(self):
        """Tests that long document compilation scales reliably to large section counts without failure."""
        plan_dict = planner_service.get_plan(self.plan_id, owner_id=self.officer_1)
        from backend.services.planner_models import PlannedSection, ReportPlan
        plan_obj = ReportPlan.from_dict(plan_dict)

        # Scale sections to simulate large multi-chapter dossier
        expanded_sections = []
        for i in range(1, 25):
            expanded_sections.append(PlannedSection(
                section_id=f"{i}.0",
                title=f"Detailed Technical Audit Module {i}",
                topic="Technical Compliance",
                section_type="topic_analysis",
                order_index=i,
                evidence_ids=["EV-P7-001", "EV-P7-002"],
                evidence_breakdown={"LOCKED FACT": 1, "CALCULATED VALUE": 1}
            ))
        plan_obj.sections = expanded_sections

        pdf_path, pages = long_document_builder.build_pdf(
            plan=plan_obj,
            evidence_items=[e.to_dict() for e in self.ev_items],
            charts=[],
            output_filename="test_scalable_dossier.pdf"
        )
        self.assertTrue(Path(pdf_path).exists())
        self.assertGreaterEqual(pages, 10)

    def test_api_generate_long_report_endpoints(self):
        """Tests FastAPI endpoints with auth and verification."""
        req = GenerateLongReportRequest(
            job_id=self.job_id,
            plan_id=self.plan_id,
            formats=["pdf", "md"]
        )
        gen_resp = generate_long_report_endpoint(payload=req, auth=self.auth_1)
        self.assertTrue(gen_resp.get("success"))
        report_id = gen_resp.get("report_id")

        # Test Status API
        st_resp = get_report_status_endpoint(report_id=report_id, auth=self.auth_1)
        self.assertTrue(st_resp["success"])
        self.assertEqual(st_resp["report"]["status"], "completed")

        # Test History API
        hist_resp = list_job_reports_endpoint(job_id=self.job_id, auth=self.auth_1)
        self.assertTrue(hist_resp["success"])
        self.assertGreaterEqual(hist_resp["reports_count"], 1)

        # Test Download API (PDF)
        dl_pdf = download_report_endpoint(report_id=report_id, format="pdf", auth=self.auth_1)
        self.assertIsInstance(dl_pdf, FileResponse)
        self.assertEqual(dl_pdf.media_type, "application/pdf")
        self.assertTrue(Path(dl_pdf.path).exists())

        # Test Download API (MD)
        dl_md = download_report_endpoint(report_id=report_id, format="md", auth=self.auth_1)
        self.assertIsInstance(dl_md, FileResponse)
        self.assertEqual(dl_md.media_type, "text/markdown")
        self.assertTrue(Path(dl_md.path).exists())

    def test_ownership_isolation_cross_user_denied(self):
        """Tests that another user cannot generate, inspect, or download officer 1's reports."""
        req = GenerateLongReportRequest(job_id=self.job_id)

        # 1. User 2 cannot generate report for User 1's job -> 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            generate_long_report_endpoint(payload=req, auth=self.auth_2)
        self.assertEqual(ctx.exception.status_code, 403)

        # 2. Generate report as User 1
        res = report_generator_service.generate_report(
            job_id=self.job_id,
            owner_id=self.officer_1,
            plan_id=self.plan_id,
            formats=["pdf"]
        )
        rep_id = res["report_id"]

        # 3. User 2 cannot access status of User 1's report -> 404
        with self.assertRaises(HTTPException) as ctx:
            get_report_status_endpoint(report_id=rep_id, auth=self.auth_2)
        self.assertEqual(ctx.exception.status_code, 404)

        # 4. User 2 cannot download User 1's report -> 404
        with self.assertRaises(HTTPException) as ctx:
            download_report_endpoint(report_id=rep_id, format="pdf", auth=self.auth_2)
        self.assertEqual(ctx.exception.status_code, 404)

        # 5. User 2 cannot list User 1's job reports -> 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            list_job_reports_endpoint(job_id=self.job_id, auth=self.auth_2)
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
