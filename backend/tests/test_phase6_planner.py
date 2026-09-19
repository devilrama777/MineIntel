"""
MineIntel Phase 6: Report Planner Comprehensive Unit Tests

Tests:
1. Dynamic section hierarchy generation based on available evidence (no rigid templates)
2. Evidence classification tracking (LOCKED FACT, CALCULATED VALUE, SUMMARIZABLE TEXT, AI ANALYSIS, etc.)
3. Phase 5 chart and candidate table allocation to relevant sections
4. Evidence sufficiency calculation and missing evidence flagging (no fake content)
5. Plan versioning and reproducible persistence
6. REST API endpoints and Phase 0 user ownership isolation (403 on cross-user access)
"""

import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

from backend import auth_store, config
from backend.main import (
    PlanGenerateRequest,
    generate_report_plan_endpoint,
    get_active_job_plan_endpoint,
    get_report_plan_endpoint,
    list_job_plan_versions_endpoint,
    validate_report_plan_endpoint,
)
from backend.services import (
    chart_store,
    evidence_store,
    ingestion_store,
    intelligence_store,
    planner_store,
)
from backend.services.evidence_models import EvidenceClassification
from backend.services.intelligence_models import TopicCategory
from backend.services.planner_models import PlanStatus, SectionType
from backend.services.planner_service import planner_service
from backend.services.report_planner import report_planner


class TestPhase6Planner(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.orig_data = config.DATA_DIR
        config.DATA_DIR = Path(self.temp_dir)

        self.orig_ingest_store = ingestion_store.STORE_FILE
        self.orig_ev_store = evidence_store.EVIDENCE_FILE
        self.orig_intel_store = intelligence_store.INTELLIGENCE_FILE
        self.orig_chart_store = chart_store.CHARTS_FILE
        self.orig_plan_store = planner_store.PLANS_FILE
        self.orig_auth_store = auth_store.USERS_FILE

        ingestion_store.STORE_FILE = Path(self.temp_dir) / "ingestion_store.json"
        evidence_store.EVIDENCE_FILE = Path(self.temp_dir) / "evidence_store.json"
        intelligence_store.INTELLIGENCE_FILE = Path(self.temp_dir) / "intelligence_store.json"
        chart_store.CHARTS_FILE = Path(self.temp_dir) / "charts_store.json"
        planner_store.PLANS_FILE = Path(self.temp_dir) / "report_plans.json"
        auth_store.USERS_FILE = Path(self.temp_dir) / "users.json"

        # Mock Postgres to enforce local storage in tests
        self.pg_p1 = patch.object(planner_store, "is_postgres_configured", return_value=False)
        self.pg_p2 = patch.object(chart_store, "is_postgres_configured", return_value=False)
        self.pg_p3 = patch.object(intelligence_store, "is_postgres_configured", return_value=False)
        self.pg_p4 = patch.object(evidence_store, "is_postgres_configured", return_value=False)
        self.pg_p5 = patch.object(ingestion_store, "is_postgres_configured", return_value=False)
        self.pg_p6 = patch.object(auth_store, "is_postgres_configured", return_value=False)
        self.pg_p1.start()
        self.pg_p2.start()
        self.pg_p3.start()
        self.pg_p4.start()
        self.pg_p5.start()
        self.pg_p6.start()

        # Seed test officers
        auth_store.create_user(
            officer_id="OFFICER_PLAN_A",
            password="PassA123!",
            role="Operational Auditor",
            display_name="Auditor Alpha"
        )
        auth_store.create_user(
            officer_id="OFFICER_PLAN_B",
            password="PassB123!",
            role="Operational Auditor",
            display_name="Auditor Beta"
        )

        self.auth_a = {"officer_id": "OFFICER_PLAN_A", "role": "Operational Auditor"}
        self.auth_b = {"officer_id": "OFFICER_PLAN_B", "role": "Operational Auditor"}

    def tearDown(self):
        self.pg_p1.stop()
        self.pg_p2.stop()
        self.pg_p3.stop()
        self.pg_p4.stop()
        self.pg_p5.stop()
        self.pg_p6.stop()
        ingestion_store.STORE_FILE = self.orig_ingest_store
        evidence_store.EVIDENCE_FILE = self.orig_ev_store
        intelligence_store.INTELLIGENCE_FILE = self.orig_intel_store
        chart_store.CHARTS_FILE = self.orig_chart_store
        planner_store.PLANS_FILE = self.orig_plan_store
        auth_store.USERS_FILE = self.orig_auth_store
        config.DATA_DIR = self.orig_data
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # 1. Dynamic Section Hierarchy & Evidence Allocation Tests
    # -------------------------------------------------------------------------
    def test_dynamic_section_generation_from_evidence(self):
        evidence_items = [
            {
                "evidence_id": "EV-PROD-01",
                "job_id": "job-test",
                "classification": EvidenceClassification.LOCKED_FACT.value,
                "content_text": "Coal production in March 2024 was 120,000 MT.",
                "provenance": {"filename": "prod.csv", "source_type": "csv"}
            },
            {
                "evidence_id": "EV-PROD-02",
                "job_id": "job-test",
                "classification": EvidenceClassification.CALCULATED_VALUE.value,
                "content_text": "Average extraction rate: 4,000 MT/day.",
                "provenance": {"filename": "prod.csv", "source_type": "csv"}
            },
            {
                "evidence_id": "EV-SAFE-01",
                "job_id": "job-test",
                "classification": EvidenceClassification.SUMMARIZABLE_TEXT.value,
                "content_text": "Air quality PM10 dust suppression systems functioning normally.",
                "provenance": {"filename": "safety.docx", "source_type": "docx"}
            }
        ]

        dossier = {
            "topics": {
                TopicCategory.PRODUCTION_DISPATCH.value: ["EV-PROD-01", "EV-PROD-02"],
                TopicCategory.SAFETY_ENVIRONMENTAL.value: ["EV-SAFE-01"]
            },
            "chronological_timeline": [
                {"period": "2024-03", "evidence_ids": ["EV-PROD-01", "EV-PROD-02"]}
            ]
        }

        charts = [
            {
                "chart_id": "CHART-PROD-01",
                "config": {"title": "Production Trend March 2024", "y_axis_label": "Tonnage MT"}
            }
        ]

        plan = report_planner.plan(
            job_id="job-test",
            owner_id="OFFICER_PLAN_A",
            evidence_items=evidence_items,
            dossier=dossier,
            charts=charts,
            version=1
        )

        self.assertIsNotNone(plan)
        self.assertEqual(plan.job_id, "job-test")
        self.assertEqual(plan.version, 1)

        # Check section types
        sec_types = [s.section_type for s in plan.sections]
        self.assertIn(SectionType.EXECUTIVE_SUMMARY.value, sec_types)
        self.assertIn(SectionType.TOPIC_ANALYSIS.value, sec_types)
        self.assertIn(SectionType.TABULAR_AUDIT.value, sec_types)

        # Verify Production section has chart attached
        prod_sec = next(s for s in plan.sections if s.topic == TopicCategory.PRODUCTION_DISPATCH.value)
        self.assertIn("CHART-PROD-01", prod_sec.chart_ids)
        self.assertEqual(len(prod_sec.subsections), 1)
        self.assertEqual(prod_sec.subsections[0].chronology_period, "2024-03")

        # Verify classification breakdown in Production section
        breakdown = prod_sec.evidence_breakdown
        self.assertEqual(breakdown.get(EvidenceClassification.LOCKED_FACT.value), 1)
        self.assertEqual(breakdown.get(EvidenceClassification.CALCULATED_VALUE.value), 1)

    # -------------------------------------------------------------------------
    # 2. Evidence Sufficiency & Missing Evidence Flagging Tests
    # -------------------------------------------------------------------------
    def test_missing_evidence_flagging_zero_hallucination(self):
        # Empty evidence items -> plan must NOT invent fake sections
        evidence_items = []

        plan = report_planner.plan(
            job_id="job-empty",
            owner_id="OFFICER_PLAN_A",
            evidence_items=evidence_items,
            dossier=None,
            charts=None,
            version=1
        )

        self.assertEqual(plan.status, PlanStatus.INSUFFICIENT_EVIDENCE.value)
        self.assertLess(plan.evidence_sufficiency_score, 0.5)
        self.assertTrue(len(plan.insufficient_evidence_flags) >= 1)

        # Section validation status
        exec_sec = plan.sections[0]
        self.assertEqual(exec_sec.validation_status, "insufficient")
        self.assertTrue(any("insufficient" in note.lower() for note in exec_sec.validation_notes))

    # -------------------------------------------------------------------------
    # 3. Plan Versioning & Persistence Tests
    # -------------------------------------------------------------------------
    def test_plan_version_increment_and_persistence(self):
        job_id = "job-version-test"
        ingestion_store.save_job({
            "job_id": job_id,
            "owner_id": "OFFICER_PLAN_A",
            "status": "completed",
            "total_files": 1,
            "completed_files": 1
        })
        evidence_store.save_evidence_items([{
            "evidence_id": "EV-V-1",
            "job_id": job_id,
            "file_id": "f-1",
            "owner_id": "OFFICER_PLAN_A",
            "layer": "processed",
            "classification": "LOCKED FACT",
            "content_text": "Production data 2024.",
            "provenance": {"filename": "data.csv"}
        }])

        # Generate version 1
        res_v1 = planner_service.generate_plan(job_id=job_id, owner_id="OFFICER_PLAN_A")
        self.assertTrue(res_v1["success"])
        self.assertEqual(res_v1["version"], 1)

        # Generate version 2
        res_v2 = planner_service.generate_plan(job_id=job_id, owner_id="OFFICER_PLAN_A")
        self.assertTrue(res_v2["success"])
        self.assertEqual(res_v2["version"], 2)

        # List versions
        versions = planner_store.list_plan_versions(job_id, owner_id="OFFICER_PLAN_A")
        self.assertEqual(len(versions), 2)
        self.assertEqual(versions[0]["version"], 1)
        self.assertEqual(versions[1]["version"], 2)

        # Active plan should be newest (v2)
        active = planner_store.get_latest_plan_for_job(job_id, owner_id="OFFICER_PLAN_A")
        self.assertEqual(active["version"], 2)

    # -------------------------------------------------------------------------
    # 4. REST API Endpoints & Phase 0 User Ownership Isolation Tests
    # -------------------------------------------------------------------------
    def test_planner_endpoints_and_ownership_isolation(self):
        job_id = "job-api-planner"
        ingestion_store.save_job({
            "job_id": job_id,
            "owner_id": "OFFICER_PLAN_A",
            "status": "completed",
            "total_files": 1,
            "completed_files": 1
        })
        evidence_store.save_evidence_items([{
            "evidence_id": "EV-API-1",
            "job_id": job_id,
            "file_id": "f-1",
            "owner_id": "OFFICER_PLAN_A",
            "layer": "processed",
            "classification": "LOCKED FACT",
            "content_text": "Coal dispatch figures for Q2 FY24.",
            "provenance": {"filename": "dispatch.csv"}
        }])

        # 1. Generate plan as OFFICER_PLAN_A
        req = PlanGenerateRequest(job_id=job_id, title="Custom Mining Dossier")
        gen_res = generate_report_plan_endpoint(payload=req, auth=self.auth_a)
        self.assertTrue(gen_res["success"])
        plan_id = gen_res["plan_id"]

        # 2. Retrieve plan as OFFICER_PLAN_A
        get_res = get_report_plan_endpoint(plan_id=plan_id, auth=self.auth_a)
        self.assertTrue(get_res["success"])
        self.assertEqual(get_res["plan"]["title"], "Custom Mining Dossier")

        # 3. Retrieve active job plan as OFFICER_PLAN_A
        active_res = get_active_job_plan_endpoint(job_id=job_id, auth=self.auth_a)
        self.assertTrue(active_res["success"])
        self.assertEqual(active_res["plan"]["plan_id"], plan_id)

        # 4. List versions as OFFICER_PLAN_A
        ver_res = list_job_plan_versions_endpoint(job_id=job_id, auth=self.auth_a)
        self.assertTrue(ver_res["success"])
        self.assertEqual(ver_res["versions_count"], 1)

        # 5. Validate plan as OFFICER_PLAN_A
        val_res = validate_report_plan_endpoint(plan_id=plan_id, auth=self.auth_a)
        self.assertTrue(val_res["success"])

        # 6. CROSS-USER ISOLATION: OFFICER_PLAN_B attempts access -> 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            generate_report_plan_endpoint(payload=req, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)

        with self.assertRaises(HTTPException) as ctx:
            get_active_job_plan_endpoint(job_id=job_id, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)

        with self.assertRaises(HTTPException) as ctx:
            list_job_plan_versions_endpoint(job_id=job_id, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)

        with self.assertRaises(HTTPException) as ctx:
            get_report_plan_endpoint(plan_id=plan_id, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            validate_report_plan_endpoint(plan_id=plan_id, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
