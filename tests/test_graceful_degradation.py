import asyncio
import os
import sys
import unittest
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.services.agent.agent_coordinator import AgentCoordinator
from backend.services.agent.agent_models import AgentTaskStatus, WorkflowStage
from backend.services.planner_models import PlannedSection, ReportPlan, SectionType
from backend.services.document_generator import DocumentGenerator
from backend.services.chart_service import chart_service
from backend.services.agent.agent_store import get_task


class TestGracefulDegradation(unittest.TestCase):

    def test_document_generator_nonetype_safety(self):
        """Audit DocumentGenerator for NoneType and empty data handling."""
        doc_gen = DocumentGenerator()
        self.assertEqual(doc_gen.format_chart_markdown(None), "")
        self.assertEqual(doc_gen.format_chart_markdown({}), "")
        self.assertEqual(doc_gen.format_chart_markdown({"url": None}), "")
        self.assertEqual(doc_gen.format_chart_markdown(""), "")
        self.assertEqual(doc_gen.format_chart_markdown("   "), "")

        # _get_table_rows with empty metrics
        rows = doc_gen._get_table_rows({})
        self.assertIsInstance(rows, list)
        self.assertTrue(len(rows) > 0)

        # compile_dossier_pdf with None parameters
        pdf_res = doc_gen.compile_dossier_pdf(report_markdown="", job_id="test_safe_pdf", document_title="Test Title")
        self.assertTrue(pdf_res is None or hasattr(pdf_res, "exists"))

        # generate_all_packages NoneType safety
        pkg_res = doc_gen.generate_all_packages(job_id="test_pkg_safe", summary_text="Safe test summary")
        self.assertTrue(pkg_res.get("success"))
        self.assertIn("files", pkg_res)

    def test_chart_service_nonetype_safety(self):
        """Audit ChartService for NoneType and empty data handling."""
        res1 = chart_service.detect_tables("nonexistent_job_12345", "test_owner")
        self.assertEqual(res1, [])

        res2 = chart_service.detect_charts_in_text("", "test_owner")
        self.assertEqual(res2, [])

        res3 = chart_service.detect_charts_in_text(None, "test_owner")
        self.assertEqual(res3, [])

        res4 = chart_service.recommend_chart("nonexistent_job_12345", "tab_none", "test_owner")
        self.assertIsInstance(res4, dict)
        self.assertIn("error", res4)

    def test_write_section_async_graceful_degradation(self):
        """Verify _write_section_async catches section failures and sets fallback marker without crashing."""
        coordinator = AgentCoordinator(owner_id="test_degradation_owner")
        state = coordinator.initialize_task()

        section = PlannedSection(
            section_id="SEC-TEST",
            title="Strategic Financial Outlook",
            topic="FINANCIAL_OUTLOOK",
            section_type=SectionType.GENERAL_NARRATIVE.value,
            order_index=1
        )

        # Simulate exception inside _call_qwen to ensure _write_section_async catches and handles it
        def broken_call_qwen(*args, **kwargs):
            raise RuntimeError("Simulated Qwen API Connection Failure")

        coordinator._call_qwen = broken_call_qwen

        async def run_section_test():
            sem = asyncio.Semaphore(1)
            result = await coordinator._write_section_async(
                section=section,
                evidence_items=[],
                chunk_summaries=[],
                conflicts=[],
                charts=[],
                state=state,
                stage=WorkflowStage.WRITING,
                semaphore=sem,
                plan_title="Test Plan"
            )
            return result

        result = asyncio.run(run_section_test())
        self.assertEqual(result, "⚠️ [Section Generation Failed: Error encountered during synthesis]")
        self.assertIn(section.title, state.structured_state.get("completed_sections", []))
        self.assertNotIn(section.title, state.structured_state.get("active_sections", []))

    def test_end_to_end_graceful_completion_with_failed_section(self):
        """Verify report completes (COMPLETED, 100%) even when a section fails."""
        coordinator = AgentCoordinator(owner_id="test_degradation_owner")
        raw_text = "Coal India Q3 Operational Overview: Production reached 185.2 MT, exceeding dispatch target of 170.5 MT."

        # Mock _call_qwen such that section 1 succeeds, section 2 fails
        call_count = [0]
        def partial_failure_qwen(prompt, **kwargs):
            call_count[0] += 1
            if "Section: 'Operational Performance & Key Metrics'" in prompt:
                raise RuntimeError("Simulated transient timeout in section 2")
            return f"Board-level strategic synthesis for call {call_count[0]}: operational targets met."

        coordinator._call_qwen = partial_failure_qwen

        task_id = "test_degrad_task_001"
        state = coordinator.run(
            task_id=task_id,
            prompt="Executive Board Summary on Production",
            raw_text=raw_text
        )

        self.assertEqual(state.status, AgentTaskStatus.COMPLETED)
        self.assertEqual(state.structured_state.get("current_stage"), WorkflowStage.COMPLETED.value)
        self.assertTrue(state.structured_state.get("sections_completed", 0) >= 1)

        # Verify markdown artifact exists and is non-empty
        from backend import config
        final_md = config.OUTPUTS_DIR / task_id / "04_final_systematic_report.md"
        self.assertTrue(final_md.exists())
        content = final_md.read_text(encoding="utf-8")
        self.assertIn("Executive", content)
        self.assertIn("⚠️ [Section Generation Failed: Error encountered during synthesis]", content)


if __name__ == "__main__":
    unittest.main()
