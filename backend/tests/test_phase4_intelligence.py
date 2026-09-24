"""
MineIntel Phase 4: Intelligence & Organization Layer Comprehensive Unit Tests

Tests:
1. Topic classification into Ministry of Coal domain ontology
2. Adaptive chronology parsing and dominant granularity calculation
3. Multi-tier duplicate detection without deleting source items
4. Source-priority weighting and authoritative primary item selection
5. Conflict & numerical variance detection (> 1%)
6. Statutory contradiction detection
7. Resolution of conflicts and audit trail persistence
8. REST API endpoints and Phase 0 ownership enforcement (403 on cross-user access)
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
    analyze_job_intelligence_endpoint,
    get_job_conflicts_endpoint,
    get_job_dossier_endpoint,
    get_job_timeline_endpoint,
    resolve_conflict_endpoint,
    ConflictResolveRequest,
)
from backend.services import evidence_store, ingestion_store, intelligence_store
from backend.services.chronology_engine import chronology_engine
from backend.services.conflict_detector import conflict_detector
from backend.services.duplicate_detector import duplicate_detector
from backend.services.intelligence_models import (
    ChronologyGranularity,
    ConflictSeverity,
    ConflictType,
    SourcePriority,
    TopicCategory,
)
from backend.services.intelligence_service import intelligence_service
from backend.services.topic_classifier import topic_classifier


class TestPhase4Intelligence(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.orig_data = config.DATA_DIR
        config.DATA_DIR = Path(self.temp_dir)

        self.orig_ingest_store = ingestion_store.STORE_FILE
        self.orig_ev_store = evidence_store.EVIDENCE_FILE
        self.orig_auth_store = auth_store.USERS_FILE
        self.orig_intel_store = intelligence_store.INTELLIGENCE_FILE

        ingestion_store.STORE_FILE = Path(self.temp_dir) / "ingestion_store.json"
        evidence_store.EVIDENCE_FILE = Path(self.temp_dir) / "evidence_store.json"
        auth_store.USERS_FILE = Path(self.temp_dir) / "users.json"
        intelligence_store.INTELLIGENCE_FILE = Path(self.temp_dir) / "intelligence_store.json"

        # Mock Postgres configuration to force local store in tests
        self.pg_p1 = patch.object(intelligence_store, "is_postgres_configured", return_value=False)
        self.pg_p2 = patch.object(evidence_store, "is_postgres_configured", return_value=False)
        self.pg_p3 = patch.object(ingestion_store, "is_postgres_configured", return_value=False)
        self.pg_p4 = patch.object(auth_store, "is_postgres_configured", return_value=False)
        self.pg_p1.start()
        self.pg_p2.start()
        self.pg_p3.start()
        self.pg_p4.start()

        # Seed test users
        auth_store.create_user(
            officer_id="OFFICER_ALPHA",
            password="PassA123!",
            role="Senior Officer",
            display_name="Auditor Alpha"
        )
        auth_store.create_user(
            officer_id="OFFICER_BETA",
            password="PassB123!",
            role="Senior Officer",
            display_name="Auditor Beta"
        )

        self.auth_a = {"officer_id": "OFFICER_ALPHA", "role": "Senior Officer"}
        self.auth_b = {"officer_id": "OFFICER_BETA", "role": "Senior Officer"}

    def tearDown(self):
        self.pg_p1.stop()
        self.pg_p2.stop()
        self.pg_p3.stop()
        self.pg_p4.stop()
        ingestion_store.STORE_FILE = self.orig_ingest_store
        evidence_store.EVIDENCE_FILE = self.orig_ev_store
        auth_store.USERS_FILE = self.orig_auth_store
        intelligence_store.INTELLIGENCE_FILE = self.orig_intel_store
        config.DATA_DIR = self.orig_data
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # 1. Topic Classifier Tests
    # -------------------------------------------------------------------------
    def test_topic_classification_domain_ontology(self):
        item_prod = {
            "evidence_id": "EV-01",
            "content_text": "Daily coal production achieved 4500 metric tons and dispatch was 4200 tonnes via railway siding.",
            "provenance": {"filename": "daily_dispatch.csv"}
        }
        item_safety = {
            "evidence_id": "EV-02",
            "content_text": "Dust suppression water treatment and PM10 air quality monitoring showed compliance.",
            "provenance": {"filename": "environmental_audit.pdf"}
        }
        item_geology = {
            "evidence_id": "EV-03",
            "content_text": "Borehole sample analysis confirmed seam thickness of 12.4m and gross calorific value GCV 4200.",
            "provenance": {"filename": "strata_report.docx"}
        }
        item_compliance = {
            "evidence_id": "EV-04",
            "content_text": "DGMS inspection issued notice regarding haul road gradient compliance.",
            "provenance": {"filename": "dgms_notice.pdf"}
        }

        self.assertEqual(topic_classifier.classify_item(item_prod), TopicCategory.PRODUCTION_DISPATCH.value)
        self.assertEqual(topic_classifier.classify_item(item_safety), TopicCategory.SAFETY_ENVIRONMENTAL.value)
        self.assertEqual(topic_classifier.classify_item(item_geology), TopicCategory.GEOLOGICAL_RESERVES.value)
        self.assertEqual(topic_classifier.classify_item(item_compliance), TopicCategory.STATUTORY_COMPLIANCE.value)

        batch_result = topic_classifier.organize_by_topic([item_prod, item_safety, item_geology, item_compliance])
        self.assertIn(TopicCategory.PRODUCTION_DISPATCH.value, batch_result)
        self.assertIn("EV-01", batch_result[TopicCategory.PRODUCTION_DISPATCH.value])
        self.assertIn("EV-02", batch_result[TopicCategory.SAFETY_ENVIRONMENTAL.value])

    # -------------------------------------------------------------------------
    # 2. Adaptive Chronology Engine Tests
    # -------------------------------------------------------------------------
    def test_chronology_date_parsing_and_granularity(self):
        # ISO format
        sig1 = chronology_engine.extract_temporal_signal({"content_text": "Shift log for 2024-03-15 colliery report."})
        self.assertEqual(sig1.granularity, ChronologyGranularity.DAY.value)
        self.assertEqual(sig1.normalized_date, "2024-03-15")
        self.assertEqual(sig1.quarter, "Q1")

        # DD/MM/YYYY format
        sig2 = chronology_engine.extract_temporal_signal({"content_text": "Blast conducted on 22/07/2023 at pit 4."})
        self.assertEqual(sig2.granularity, ChronologyGranularity.DAY.value)
        self.assertEqual(sig2.normalized_date, "2023-07-22")
        self.assertEqual(sig2.quarter, "Q3")

        # Month + Year
        sig3 = chronology_engine.extract_temporal_signal({"content_text": "Monthly dispatch for March 2024 totaled 150000 MT."})
        self.assertEqual(sig3.granularity, ChronologyGranularity.MONTH.value)
        self.assertEqual(sig3.normalized_date, "2024-03")

        # Quarter format
        sig4 = chronology_engine.extract_temporal_signal({"content_text": "Financial review for Q3 FY24."})
        self.assertEqual(sig4.granularity, ChronologyGranularity.QUARTER.value)
        self.assertEqual(sig4.quarter, "Q3")

    def test_adaptive_timeline_dominant_granularity(self):
        items = [
            {"evidence_id": "EV-D1", "content_text": "Production on 2024-01-10: 100 MT"},
            {"evidence_id": "EV-D2", "content_text": "Production on 2024-01-11: 120 MT"},
            {"evidence_id": "EV-D3", "content_text": "Production on 2024-01-12: 110 MT"},
            {"evidence_id": "EV-U1", "content_text": "General operating policy and guidelines."},
        ]
        timeline = chronology_engine.build_adaptive_timeline(items)
        self.assertTrue(len(timeline) >= 2)
        # Should detect day granularity as dominant
        self.assertEqual(timeline[0]["granularity"], ChronologyGranularity.DAY.value)
        # Undated bucket should exist
        undated_bucket = [b for b in timeline if b["period"] == "Undated"]
        self.assertEqual(len(undated_bucket), 1)
        self.assertIn("EV-U1", undated_bucket[0]["evidence_ids"])

    # -------------------------------------------------------------------------
    # 3. Duplicate Detection & Source Priority Selection Tests
    # -------------------------------------------------------------------------
    def test_duplicate_detection_preserves_originals(self):
        item_csv = {
            "evidence_id": "EV-CSV-01",
            "layer": "processed",
            "classification": "CALCULATED VALUE",
            "content_text": "Monthly coal output: 450,000 metric tonnes.",
            "provenance": {"filename": "audited_production.csv", "source_type": "csv"}
        }
        item_docx = {
            "evidence_id": "EV-DOCX-01",
            "layer": "processed",
            "classification": "SUMMARIZABLE TEXT",
            "content_text": "monthly coal output 450000 metric tonnes",  # normalized match
            "provenance": {"filename": "draft_memo.docx", "source_type": "docx"}
        }
        item_ai = {
            "evidence_id": "EV-AI-01",
            "layer": "derived",
            "classification": "AI ANALYSIS",
            "content_text": "Monthly coal output: 450,000 metric tonnes.",
            "provenance": {"filename": "summary.md", "source_type": "markdown"}
        }

        all_items = [item_csv, item_docx, item_ai]
        clusters, deduplicated = duplicate_detector.find_duplicate_clusters(all_items)

        # 1 cluster found
        self.assertEqual(len(clusters), 1)
        cluster = clusters[0]
        # Primary item must be CSV (SourcePriority.AUDITED_CALCULATION = 100 > DOCX 60 > AI 20)
        self.assertEqual(cluster.primary_evidence_id, "EV-CSV-01")
        self.assertIn("EV-DOCX-01", cluster.duplicate_evidence_ids)
        self.assertIn("EV-AI-01", cluster.duplicate_evidence_ids)

        # Downstream deduplicated items only has 1 primary record
        self.assertEqual(len(deduplicated), 1)
        self.assertEqual(deduplicated[0]["evidence_id"], "EV-CSV-01")
        # Original items list was NOT mutated or deleted
        self.assertEqual(len(all_items), 3)

    # -------------------------------------------------------------------------
    # 4. Conflict & Discrepancy Detection Tests
    # -------------------------------------------------------------------------
    def test_numerical_variance_conflict_detection(self):
        item_official_csv = {
            "evidence_id": "EV-PROD-CSV",
            "layer": "processed",
            "classification": "CALCULATED VALUE",
            "content_text": "Coal production achieved 500.0 MT for the fiscal year.",
            "provenance": {"filename": "audited_accounts.csv", "source_type": "csv"}
        }
        item_memo_docx = {
            "evidence_id": "EV-PROD-DOCX",
            "layer": "processed",
            "classification": "SUMMARIZABLE TEXT",
            "content_text": "Estimated coal production: 420.0 MT for the fiscal year.",
            "provenance": {"filename": "internal_memo.docx", "source_type": "docx"}
        }

        conflicts = conflict_detector.detect_conflicts(
            items=[item_official_csv, item_memo_docx],
            job_id="job-intel-01",
            owner_id="OFFICER_ALPHA"
        )

        self.assertEqual(len(conflicts), 1)
        c = conflicts[0]
        self.assertEqual(c.conflict_type, ConflictType.NUMERICAL_VARIANCE.value)
        self.assertEqual(c.entity_or_metric, "coal_production")
        # Variance: abs(500 - 420) / 500 = 16% -> HIGH severity
        self.assertEqual(c.severity, ConflictSeverity.HIGH.value)
        self.assertEqual(c.variance_pct, 16.0)
        # CSV has priority over DOCX
        self.assertEqual(c.recommended_evidence_id, "EV-PROD-CSV")
        self.assertEqual(c.recommended_value, 500.0)

    def test_statutory_contradiction_detection(self):
        item_clearance = {
            "evidence_id": "EV-CLEAR-01",
            "layer": "processed",
            "classification": "LOCKED FACT",
            "content_text": "Colliery is fully compliant with environmental statutory standards.",
            "provenance": {"filename": "clearance.pdf", "source_type": "pdf"}
        }
        item_violation = {
            "evidence_id": "EV-VIOL-01",
            "layer": "processed",
            "classification": "LOCKED FACT",
            "content_text": "DGMS safety audit found site non-compliant due to missing dust curtains.",
            "provenance": {"filename": "inspection.pdf", "source_type": "pdf"}
        }

        conflicts = conflict_detector.detect_conflicts(
            items=[item_clearance, item_violation],
            job_id="job-intel-02",
            owner_id="OFFICER_ALPHA"
        )

        self.assertEqual(len(conflicts), 1)
        c = conflicts[0]
        self.assertEqual(c.conflict_type, ConflictType.STATUTORY_DIVERGENCE.value)
        self.assertEqual(c.severity, ConflictSeverity.CRITICAL.value)

    # -------------------------------------------------------------------------
    # 5. REST API Endpoints & Phase 0 Ownership Enforcement Tests
    # -------------------------------------------------------------------------
    def test_intelligence_orchestrator_and_endpoints(self):
        # 1. Setup Job and Evidence for OFFICER_ALPHA
        ingestion_store.save_job({
            "job_id": "job-alpha-intel",
            "owner_id": "OFFICER_ALPHA",
            "status": "completed",
            "total_files": 2,
            "completed_files": 2
        })

        evidence_items = [
            {
                "evidence_id": "EV-A-01",
                "job_id": "job-alpha-intel",
                "file_id": "f-1",
                "owner_id": "OFFICER_ALPHA",
                "layer": "processed",
                "classification": "CALCULATED VALUE",
                "content_text": "Coal production on 2024-02-10: 1250 MT",
                "confidence": 1.0,
                "provenance": {"filename": "prod_feb.csv", "source_type": "csv"}
            },
            {
                "evidence_id": "EV-A-02",
                "job_id": "job-alpha-intel",
                "file_id": "f-2",
                "owner_id": "OFFICER_ALPHA",
                "layer": "processed",
                "classification": "SUMMARIZABLE TEXT",
                "content_text": "Coal production on 2024-02-10 was roughly 1100 MT",
                "confidence": 0.9,
                "provenance": {"filename": "shift_notes.docx", "source_type": "docx"}
            }
        ]
        evidence_store.save_evidence_items(evidence_items)

        # 2. Analyze job intelligence as OFFICER_ALPHA
        res = analyze_job_intelligence_endpoint(job_id="job-alpha-intel", auth=self.auth_a)
        self.assertTrue(res["success"])
        dossier = res["dossier"]
        self.assertEqual(dossier["total_source_items"], 2)
        self.assertEqual(len(dossier["conflicts"]), 1)
        conflict_id = dossier["conflicts"][0]["conflict_id"]

        # 3. Retrieve dossier
        dossier_res = get_job_dossier_endpoint(job_id="job-alpha-intel", auth=self.auth_a)
        self.assertTrue(dossier_res["success"])
        self.assertEqual(dossier_res["dossier"]["job_id"], "job-alpha-intel")

        # 4. Retrieve conflicts
        conflicts_res = get_job_conflicts_endpoint(job_id="job-alpha-intel", auth=self.auth_a)
        self.assertTrue(conflicts_res["success"])
        self.assertEqual(conflicts_res["conflicts_count"], 1)

        # 5. Retrieve timeline
        timeline_res = get_job_timeline_endpoint(job_id="job-alpha-intel", auth=self.auth_a)
        self.assertTrue(timeline_res["success"])
        self.assertTrue(len(timeline_res["timeline"]) >= 1)

        # 6. Resolve conflict as OFFICER_ALPHA
        resolve_req = ConflictResolveRequest(
            status="resolved",
            resolution_notes="Audited against weighbridge telemetry. CSV figure of 1250 MT confirmed."
        )
        resolve_res = resolve_conflict_endpoint(
            conflict_id=conflict_id,
            payload=resolve_req,
            auth=self.auth_a
        )
        self.assertTrue(resolve_res["success"])
        self.assertEqual(resolve_res["resolved_conflict"]["status"], "resolved")
        self.assertIn("weighbridge telemetry", resolve_res["resolved_conflict"]["resolution_notes"])

    def test_phase0_ownership_isolation_enforcement(self):
        # Job owned by OFFICER_ALPHA
        ingestion_store.save_job({
            "job_id": "job-alpha-private",
            "owner_id": "OFFICER_ALPHA",
            "status": "completed",
            "total_files": 1,
            "completed_files": 1
        })
        evidence_store.save_evidence_items([{
            "evidence_id": "EV-ALPHA-PRIV",
            "job_id": "job-alpha-private",
            "file_id": "f-priv",
            "owner_id": "OFFICER_ALPHA",
            "layer": "processed",
            "classification": "LOCKED FACT",
            "content_text": "Sensitive geological core data 2024-01-15.",
            "confidence": 1.0,
            "provenance": {"filename": "secret.csv", "source_type": "csv"}
        }])

        # OFFICER_BETA attempts to analyze OFFICER_ALPHA's job -> 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            analyze_job_intelligence_endpoint(job_id="job-alpha-private", auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("Forbidden", ctx.exception.detail)

        # OFFICER_BETA attempts to get dossier -> 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            get_job_dossier_endpoint(job_id="job-alpha-private", auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)

        # OFFICER_BETA attempts to get conflicts -> 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            get_job_conflicts_endpoint(job_id="job-alpha-private", auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)

        # OFFICER_BETA attempts to get timeline -> 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            get_job_timeline_endpoint(job_id="job-alpha-private", auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
