import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add the project root to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.services.agent.agent_coordinator import AgentCoordinator
from backend.services.agent.agent_tool_registry import execute_tool
from backend.services.planner_models import PlannedSection, ReportPlan, SectionType
from backend.services.report_generator_service import report_generator_service


class TestPhaseADeterministicWorkflow(unittest.TestCase):

    def setUp(self):
        self.owner_id = "test_officer_phase_a"
        self.job_id = "job_phase_a_test"
        self.coordinator = AgentCoordinator(owner_id=self.owner_id)

    def test_planned_section_content_text_serialization(self):
        """Verify PlannedSection to_dict and from_dict preserve synthesized content_text."""
        sec = PlannedSection(
            section_id="SEC-1",
            title="Executive Summary",
            topic="EXECUTIVE_SUMMARY",
            section_type=SectionType.EXECUTIVE_SUMMARY.value,
            order_index=1,
            evidence_ids=["EV-101"],
            content_text="Synthesized analytical executive summary text with grounded metrics."
        )
        sec_dict = sec.to_dict()
        self.assertIn("content_text", sec_dict)
        self.assertEqual(sec_dict["content_text"], "Synthesized analytical executive summary text with grounded metrics.")

        restored = PlannedSection.from_dict(sec_dict)
        self.assertEqual(restored.content_text, sec.content_text)
        self.assertEqual(restored.section_id, "SEC-1")

    @patch('backend.services.report_generator_service.planner_service.get_plan')
    @patch('backend.services.report_generator_service.evidence_store.query_evidence')
    @patch('backend.services.report_generator_service.long_document_builder.build_markdown')
    @patch('backend.services.report_generator_service.store_save_report')
    def test_markdown_compilation_zero_ai_calls_with_skip_flag(
        self,
        mock_save_report,
        mock_build_md,
        mock_query_evidence,
        mock_get_plan
    ):
        """Verify COMPILE_MARKDOWN_ARTIFACT performs ZERO AI/Ollama calls when skip_ai_synthesis=True."""
        plan_dict = {
            "plan_id": "plan_test_a1",
            "job_id": self.job_id,
            "owner_id": self.owner_id,
            "title": "Deterministic Audit Dossier",
            "version": 1,
            "status": "ready_for_generation",
            "sections": [
                {
                    "section_id": "SEC-1",
                    "title": "Executive Summary",
                    "topic": "EXECUTIVE_SUMMARY",
                    "section_type": "executive_summary",
                    "order_index": 1,
                    "content_text": "Grounded executive synthesis text.",
                    "evidence_ids": ["EV-1"]
                }
            ]
        }
        mock_get_plan.return_value = plan_dict
        mock_query_evidence.return_value = {"items": [{"evidence_id": "EV-1", "content_text": "Raw coal: 500 MT"}]}
        mock_build_md.return_value = "outputs/reports/Report_test_a1.md"

        # Patch ai_inference_service to ensure it is NEVER called
        with patch('backend.services.ai_inference_service.ai_inference_service.generate_job_reasoning') as mock_ai:
            result = report_generator_service.generate_report(
                job_id=self.job_id,
                owner_id=self.owner_id,
                plan_id="plan_test_a1",
                formats=["markdown"],
                skip_ai_synthesis=True
            )
            # Verify AI reasoning was NOT called
            mock_ai.assert_not_called()
            self.assertTrue(result.get("success"))
            self.assertEqual(result.get("md_path"), "outputs/reports/Report_test_a1.md")
            mock_build_md.assert_called_once()

    @patch('backend.services.agent.agent_tool_registry.planner_service.generate_plan')
    def test_create_plan_tool_passes_use_ai_false(self, mock_gen_plan):
        """Verify create_plan tool handler sets use_ai=False to eliminate redundant planner AI refinement."""
        mock_gen_plan.return_value = {"success": True, "plan_id": "plan_test_a4", "status": "draft"}

        res = execute_tool(
            name="create_plan",
            args={"title": "Institutional Coal Audit", "custom_instruction": "Strict review"},
            owner_id=self.owner_id,
            task_id=self.job_id
        )
        mock_gen_plan.assert_called_once_with(
            job_id=self.job_id,
            owner_id=self.owner_id,
            title="Institutional Coal Audit",
            use_ai=False,
            custom_instruction="Strict review"
        )
        self.assertTrue(res.get("result", {}).get("success"))

    def test_section_specific_bounded_context_selection(self):
        """Verify build_section_specific_context filters by section topic and bounds payload without corpus dumping."""
        evidence_items = [
            {
                "evidence_id": "EV-01",
                "classification": "FACT",
                "content_text": "Production reached 2.4 MT in FY24.",
                "provenance": {"filename": "production_log.pdf"},
                "topic": "COAL_PRODUCTION"
            },
            {
                "evidence_id": "EV-02",
                "classification": "STATUTORY_FACT",
                "content_text": "DGMS safety clearance renewed on 15 March.",
                "provenance": {"filename": "dgms_notice.pdf"},
                "topic": "STATUTORY_COMPLIANCE"
            },
            {
                "evidence_id": "EV-03",
                "classification": "CALCULATED_VALUE",
                "content_text": "Overburden ratio calculated at 3.2 m3/t.",
                "provenance": {"filename": "overburden_calc.xlsx"},
                "topic": "TABULAR_AUDIT"
            }
        ]

        # 1. Executive Summary Section
        sec_exec = PlannedSection(
            section_id="SEC-1",
            title="Executive Summary & Analytical Synthesis",
            topic="EXECUTIVE_SUMMARY",
            section_type=SectionType.EXECUTIVE_SUMMARY.value,
            order_index=1,
            evidence_ids=["EV-01"]
        )
        ctx_exec = self.coordinator.build_section_specific_context(
            section=sec_exec,
            evidence_items=evidence_items,
            chunk_summaries=["Key fact: Production steady at 2.4 MT."]
        )
        self.assertIn("Operational Highlights", ctx_exec)
        self.assertIn("[Evidence EV-01", ctx_exec)
        # Should not include EV-02 or EV-03
        self.assertNotIn("[Evidence EV-02", ctx_exec)
        self.assertNotIn("[Evidence EV-03", ctx_exec)

        # 2. Topic Analysis Section (Coal Production)
        sec_topic = PlannedSection(
            section_id="SEC-2",
            title="Coal Production Audit",
            topic="COAL_PRODUCTION",
            section_type=SectionType.TOPIC_ANALYSIS.value,
            order_index=2,
            evidence_ids=["EV-01"]
        )
        ctx_topic = self.coordinator.build_section_specific_context(
            section=sec_topic,
            evidence_items=evidence_items
        )
        self.assertIn("[Evidence EV-01", ctx_topic)
        self.assertIn("production_log.pdf", ctx_topic)
        self.assertNotIn("[Evidence EV-02", ctx_topic)
        self.assertNotIn("[Evidence EV-03", ctx_topic)

        # 3. Statutory Compliance Section
        sec_comp = PlannedSection(
            section_id="SEC-3",
            title="Statutory Directives & DGMS Compliance",
            topic="STATUTORY_COMPLIANCE",
            section_type=SectionType.STATUTORY_COMPLIANCE.value,
            order_index=3,
            evidence_ids=["EV-02"]
        )
        ctx_comp = self.coordinator.build_section_specific_context(
            section=sec_comp,
            evidence_items=evidence_items,
            conflicts=[{"field": "safety_clearance", "description": "Date conflict between notice and ledger", "severity": "HIGH"}]
        )
        self.assertIn("[Evidence EV-02", ctx_comp)
        self.assertIn("dgms_notice.pdf", ctx_comp)
        self.assertIn("Discrepancies & Priority Conflicts", ctx_comp)
        self.assertIn("Date conflict", ctx_comp)
        self.assertNotIn("[Evidence EV-01", ctx_comp)

        # 4. Tabular Audit Section
        sec_tab = PlannedSection(
            section_id="SEC-4",
            title="Quantitative Data Ledger",
            topic="TABULAR_AUDIT",
            section_type=SectionType.TABULAR_AUDIT.value,
            order_index=4,
            evidence_ids=["EV-03"]
        )
        ctx_tab = self.coordinator.build_section_specific_context(
            section=sec_tab,
            evidence_items=evidence_items,
            charts=[{"chart_id": "CH-1", "config": {"title": "Overburden Ratio Chart"}, "calculation": {"aggregation_formula": "Weighted Average"}}]
        )
        self.assertIn("[Evidence EV-03", ctx_tab)
        self.assertIn("CALCULATED_VALUE", ctx_tab)
        self.assertNotIn("[Evidence EV-01", ctx_tab)
        self.assertNotIn("[Evidence EV-02", ctx_tab)


if __name__ == "__main__":
    unittest.main()
