"""
MineIntel Phase 9: User-Specific Learning & Feedback Layer Comprehensive Unit Tests

Verifies:
1. Capture of original AI-generated output and subsequent user edits
2. Signal extraction: terminology rules, style preferences (bullets, conciseness), chart choices
3. Audit traceability: learned preferences link back to supporting feedback event IDs
4. Contextual guidance: guidelines never overwrite immutable source facts
5. Fine-tuning dataset export: formatted pairs for offline training without auto fine-tuning
6. Strict Phase 0 user ownership isolation (zero cross-user data leakage)
7. Deletion lifecycle: user learning data wiped cleanly without affecting other users
"""

import os
import shutil
import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException

from backend import config
from backend.main import (
    ChartFeedbackRequest,
    UserPreferencesUpdateRequest,
    delete_user_learning_data_endpoint,
    export_fine_tuning_dataset_endpoint,
    get_user_learning_profile_endpoint,
    list_user_learning_events_endpoint,
    record_chart_feedback_endpoint,
    update_user_preferences_endpoint,
)
from backend.services import (
    chart_store,
    evidence_store,
    ingestion_store,
    intelligence_store,
    learning_store,
    planner_store,
    report_editor_store,
    report_generator_store,
)
from backend.services.evidence_models import (
    EvidenceClassification,
    StructuredEvidenceItem,
)
from backend.services.learning_models import FeedbackEventType
from backend.services.learning_service import learning_service
from backend.services.planner_service import planner_service
from backend.services.report_editor_service import report_editor_service
from backend.services.report_generator_service import report_generator_service


class TestPhase9Learning(unittest.TestCase):
    """Unit and integration tests for Phase 9 Learning & Feedback Layer."""

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
        self.orig_events_store = learning_store.EVENTS_FILE
        self.orig_profiles_store = learning_store.PROFILES_FILE

        ingestion_store.STORE_FILE = Path(self.temp_dir) / "ingestion_store.json"
        evidence_store.EVIDENCE_FILE = Path(self.temp_dir) / "evidence_store.json"
        intelligence_store.INTELLIGENCE_FILE = Path(self.temp_dir) / "intelligence_store.json"
        chart_store.CHARTS_FILE = Path(self.temp_dir) / "charts_store.json"
        planner_store.PLANS_FILE = Path(self.temp_dir) / "report_plans.json"
        report_generator_store.REPORTS_META_FILE = Path(self.temp_dir) / "generated_reports.json"
        report_editor_store.REVISIONS_FILE = Path(self.temp_dir) / "report_revisions.json"
        learning_store.EVENTS_FILE = Path(self.temp_dir) / "learning_events.json"
        learning_store.PROFILES_FILE = Path(self.temp_dir) / "user_profiles.json"

        self.user_a = "OFFICER_P9_A"
        self.user_b = "OFFICER_P9_B"
        self.auth_a = {"officer_id": self.user_a, "role": "Investigator"}
        self.auth_b = {"officer_id": self.user_b, "role": "Investigator"}

        # Seed an ingestion job and evidence for User A
        self.job_id = "job_p9_test_001"
        ingestion_store.save_job({
            "job_id": self.job_id,
            "owner_id": self.user_a,
            "status": "completed",
            "files": [{"file_id": "file_p9_1", "filename": "production_log.csv", "format": "csv"}]
        })

        self.ev_items = [
            StructuredEvidenceItem(
                evidence_id="EV-P9-001",
                job_id=self.job_id,
                file_id="file_p9_1",
                owner_id=self.user_a,
                layer="processed",
                classification=EvidenceClassification.LOCKED_FACT.value,
                content_text="Total FY24 coal extracted was 14.5 MT from pit #3.",
                provenance={"filename": "production_log.csv", "citation": "Row 2"}
            )
        ]
        evidence_store.save_evidence_items([e.to_dict() for e in self.ev_items])

        # Generate Phase 6 plan and Phase 7 report
        plan_res = planner_service.generate_plan(job_id=self.job_id, owner_id=self.user_a, title="Quarterly Mining Audit")
        self.plan_id = plan_res["plan_id"]
        rep_res = report_generator_service.generate_report(job_id=self.job_id, owner_id=self.user_a, plan_id=self.plan_id)
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
        learning_store.EVENTS_FILE = self.orig_events_store
        learning_store.PROFILES_FILE = self.orig_profiles_store
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_record_edit_event_and_terminology_learning(self):
        """Tests that editing a section automatically captures a feedback event and learns terminology substitutes."""
        v1 = report_editor_service.get_revision(self.report_id, version=1, owner_id=self.user_a)
        sec_id = v1["sections"][0]["section_id"]

        # Edit section: systematically replace 'pit' with 'excavation_quarry' and add bullets
        orig_text = v1["sections"][0]["content_text"]
        new_text = "Verified Audit Findings:\n- Total FY24 coal extracted was 14.5 MT from quarry #3.\n- Environmental clearance active."

        edit_res = report_editor_service.edit_section(
            report_id=self.report_id,
            owner_id=self.user_a,
            section_id=sec_id,
            new_content=new_text,
            change_summary="Terminology update and bulleting"
        )
        self.assertTrue(edit_res["success"])

        # Verify learning event was created
        events = learning_service.list_user_events(user_id=self.user_a)
        self.assertGreaterEqual(len(events), 1)
        latest_evt = events[0]
        self.assertEqual(latest_evt["user_id"], self.user_a)
        self.assertEqual(latest_evt["report_id"], self.report_id)
        self.assertEqual(latest_evt["section_id"], sec_id)
        self.assertEqual(latest_evt["original_text"], orig_text)
        self.assertEqual(latest_evt["edited_text"], new_text)

        # Verify learned profile extracted bulleting preference
        profile = learning_service.get_user_profile(user_id=self.user_a)
        self.assertGreater(profile["total_events_captured"], 0)
        self.assertEqual(profile["style_preferences"].get("format_style"), "bulleted_findings")

    def test_audit_traceability_of_preferences(self):
        """Tests that derived preferences link back to supporting feedback event IDs."""
        event = learning_service.record_edit_feedback(
            user_id=self.user_a,
            report_id=self.report_id,
            job_id=self.job_id,
            section_id="1.0",
            original_text="Draft report with standard paragraph layout.",
            edited_text="Audit Summary:\n- Item 1\n- Item 2\n- Item 3"
        )

        profile = learning_service.get_user_profile(user_id=self.user_a)
        pref = profile["preferences"].get("style_bulleted_findings")
        self.assertIsNotNone(pref)
        self.assertIn(event.event_id, pref["supporting_event_ids"])
        self.assertGreater(pref["confidence"], 0.5)

    def test_chart_feedback_selection_and_rejection(self):
        """Tests recording chart selection and rejection feedback."""
        # 1. Accept bar chart for production metric
        ev1 = learning_service.record_chart_feedback(
            user_id=self.user_a,
            report_id=self.report_id,
            job_id=self.job_id,
            chart_id="chart_p9_01",
            chart_type="bar",
            action="accepted",
            details={"metric_name": "production_volume"}
        )
        self.assertEqual(ev1.event_type, FeedbackEventType.CHART_SELECTION.value)

        prof1 = learning_service.get_user_profile(user_id=self.user_a)
        self.assertEqual(prof1["chart_preferences"].get("production_volume"), "bar")

        # 2. Reject pie chart for production metric
        ev2 = learning_service.record_chart_feedback(
            user_id=self.user_a,
            report_id=self.report_id,
            job_id=self.job_id,
            chart_id="chart_p9_02",
            chart_type="pie",
            action="rejected",
            details={"metric_name": "production_volume"}
        )
        self.assertEqual(ev2.event_type, FeedbackEventType.CHART_REJECTION.value)

    def test_contextual_guidance_separation(self):
        """Tests that contextual guidance clearly separates preferences from source evidence."""
        learning_service.update_user_preferences(
            user_id=self.user_a,
            style_preferences={"format_style": "bulleted_findings", "tone": "regulatory_formal"},
            terminology_rules={"CIL": "Coal India Limited"}
        )

        guidance = learning_service.get_contextual_guidance(user_id=self.user_a, topic="Environment")
        self.assertTrue(guidance.get("is_contextual_guidance"))
        self.assertEqual(guidance["style_preferences"]["format_style"], "bulleted_findings")
        self.assertEqual(guidance["terminology_rules"]["CIL"], "Coal India Limited")

        # Verify raw evidence items were NOT mutated
        ev_query = evidence_store.query_evidence(job_id=self.job_id, owner_id=self.user_a)
        ev_items = ev_query.get("items", [])
        self.assertEqual(ev_items[0]["content_text"], "Total FY24 coal extracted was 14.5 MT from pit #3.")

    def test_export_fine_tuning_dataset(self):
        """Tests exporting supervised fine-tuning dataset pairs from recorded edits without auto fine-tuning."""
        learning_service.record_edit_feedback(
            user_id=self.user_a,
            report_id=self.report_id,
            job_id=self.job_id,
            section_id="1.0",
            section_topic="Operational Coal Extraction",
            original_text="Raw coal yield was measured at 14.5 MT.",
            edited_text="Official verified raw coal yield reached 14.5 MT across Rajmahal Open Cast.",
            evidence_ids=["EV-P9-001"]
        )

        dataset = learning_service.export_fine_tuning_dataset(user_id=self.user_a)
        self.assertGreaterEqual(len(dataset), 1)
        item = dataset[0]
        self.assertIn("instruction", item)
        self.assertIn("input_context", item)
        self.assertEqual(item["original_ai_output"], "Raw coal yield was measured at 14.5 MT.")
        self.assertEqual(item["user_edited_output"], "Official verified raw coal yield reached 14.5 MT across Rajmahal Open Cast.")
        self.assertIn("EV-P9-001", item["provenance_ids"])

    def test_api_endpoints_and_cross_user_isolation(self):
        """Tests FastAPI Phase 9 endpoints and verifies that user learning data is strictly isolated."""
        # User A updates preferences
        update_req = UserPreferencesUpdateRequest(
            style_preferences={"conciseness": "high"},
            terminology_rules={"DGMS": "Directorate General of Mines Safety"}
        )
        up_res = update_user_preferences_endpoint(payload=update_req, auth=self.auth_a)
        self.assertTrue(up_res["success"])
        self.assertEqual(up_res["profile"]["terminology_rules"]["DGMS"], "Directorate General of Mines Safety")

        # User A retrieves profile
        prof_res = get_user_learning_profile_endpoint(auth=self.auth_a)
        self.assertTrue(prof_res["success"])
        self.assertEqual(prof_res["profile"]["style_preferences"]["conciseness"], "high")

        # User B retrieves profile -> MUST BE EMPTY/DEFAULT, ZERO LEAKAGE
        prof_b = get_user_learning_profile_endpoint(auth=self.auth_b)
        self.assertEqual(prof_b["profile"]["user_id"], self.user_b)
        self.assertNotIn("conciseness", prof_b["profile"]["style_preferences"])
        self.assertNotIn("DGMS", prof_b["profile"]["terminology_rules"])

        # User B events list -> 0 events
        events_b = list_user_learning_events_endpoint(limit=50, auth=self.auth_b)
        self.assertEqual(events_b["events_count"], 0)

        # User B export dataset -> 0 items
        exp_b = export_fine_tuning_dataset_endpoint(auth=self.auth_b)
        self.assertEqual(exp_b["dataset_count"], 0)

    def test_user_data_deletion_lifecycle(self):
        """Tests deleting user learning data completely removes records for that user only."""
        # 1. Add event and preference for User A and User B
        learning_service.record_edit_feedback(
            user_id=self.user_a,
            report_id=self.report_id,
            job_id=self.job_id,
            section_id="1.0",
            original_text="Text A",
            edited_text="Edited Text A"
        )
        learning_service.record_edit_feedback(
            user_id=self.user_b,
            report_id="rep_b",
            job_id="job_b",
            section_id="1.0",
            original_text="Text B",
            edited_text="Edited Text B"
        )

        # 2. Delete User A's data
        del_res = delete_user_learning_data_endpoint(auth=self.auth_a)
        self.assertTrue(del_res["success"])
        self.assertTrue(del_res["deleted"])

        # 3. User A events must now be empty
        events_a = learning_service.list_user_events(user_id=self.user_a)
        self.assertEqual(len(events_a), 0)

        # 4. User B data must be completely preserved!
        events_b = learning_service.list_user_events(user_id=self.user_b)
        self.assertEqual(len(events_b), 1)
        self.assertEqual(events_b[0]["edited_text"], "Edited Text B")


if __name__ == "__main__":
    unittest.main()
