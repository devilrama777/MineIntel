import asyncio
import os
import sys
import time
import unittest
from unittest.mock import MagicMock, patch

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.services.agent.agent_coordinator import AgentCoordinator
from backend.services.agent.agent_models import AgentTaskState, AgentTaskStatus, WorkflowStage
from backend.services.planner_models import PlannedSection, ReportPlan, SectionType


class TestParallelSectionWriting(unittest.TestCase):

    def setUp(self):
        self.coordinator = AgentCoordinator(owner_id="officer_parallel_test")
        self.state = AgentTaskState(
            task_id="job_parallel_001",
            owner_id="officer_parallel_test",
            status=AgentTaskStatus.RUNNING,
            current_stage=WorkflowStage.WRITING,
            structured_state={"sections_completed": 0, "sections_total": 5}
        )
        self.patcher = patch('backend.services.agent.agent_coordinator.update_task_state')
        self.mock_update = self.patcher.start()

    def tearDown(self):
        self.patcher.stop()

    def test_write_section_async_success(self):
        """Verify _write_section_async runs non-blockingly, respects semaphore, and updates state."""
        section = PlannedSection(
            section_id="sec_1",
            title="Executive Summary",
            topic="Overview",
            section_type=SectionType.EXECUTIVE_SUMMARY.value,
            order_index=0
        )
        semaphore = asyncio.Semaphore(3)
        state_lock = asyncio.Lock()
        completed_tracker = [0]

        with patch.object(self.coordinator, '_call_qwen', return_value="Analytical executive summary text.") as mock_call:
            result = asyncio.run(
                self.coordinator._write_section_async(
                    section=section,
                    evidence_items=[],
                    chunk_summaries=[],
                    conflicts=[],
                    charts=[],
                    state=self.state,
                    stage=WorkflowStage.WRITING,
                    semaphore=semaphore,
                    plan_title="Annual Mine Audit",
                    state_lock=state_lock,
                    completed_tracker=completed_tracker
                )
            )

            mock_call.assert_called_once()
            self.assertIn("Analytical executive summary text.", result)
            self.assertEqual(completed_tracker[0], 1)
            self.assertEqual(self.state.structured_state["sections_completed"], 1)

    def test_write_section_async_error_resilience(self):
        """Verify error resilience: _call_qwen failure does not raise, but marks Generation Failed."""
        section = PlannedSection(
            section_id="sec_fail",
            title="Risk Factors",
            topic="Operational risks",
            section_type=SectionType.TOPIC_ANALYSIS.value,
            order_index=1
        )
        semaphore = asyncio.Semaphore(3)
        state_lock = asyncio.Lock()
        completed_tracker = [0]

        with patch.object(self.coordinator, '_call_qwen', side_effect=RuntimeError("Ollama connection reset")):
            result = asyncio.run(
                self.coordinator._write_section_async(
                    section=section,
                    evidence_items=[],
                    chunk_summaries=[],
                    conflicts=[],
                    charts=[],
                    state=self.state,
                    stage=WorkflowStage.WRITING,
                    semaphore=semaphore,
                    plan_title="Annual Mine Audit",
                    state_lock=state_lock,
                    completed_tracker=completed_tracker
                )
            )

            self.assertIn("Generation Failed", result)
            self.assertIn("Risk Factors", result)
            self.assertEqual(completed_tracker[0], 1)
            self.assertEqual(self.state.structured_state["sections_completed"], 1)

    @patch('backend.services.agent.agent_coordinator.get_task')
    @patch('backend.services.agent.agent_coordinator.get_job')
    @patch('backend.services.agent.agent_coordinator.query_evidence')
    @patch('backend.services.agent.agent_coordinator.planner_service.get_plan')
    @patch('backend.services.agent.agent_coordinator.save_plan')
    @patch('backend.services.agent.agent_coordinator.execute_tool')
    @patch('backend.services.agent.agent_coordinator.Path.exists')
    @patch('backend.services.agent.agent_coordinator.Path.stat')
    def test_stage_7_parallel_execution_and_deterministic_order(
        self, mock_stat, mock_exists, mock_tool, mock_save_plan,
        mock_get_plan, mock_query_ev, mock_get_job, mock_get
    ):
        """Verify STAGE 7 executes sections in parallel, preserves order, and tolerates individual section failures."""
        sections = [
            {"section_id": "sec_0", "title": "01. Introduction", "topic": "Intro", "section_type": "executive_summary", "order_index": 0},
            {"section_id": "sec_1", "title": "02. Production Analytics", "topic": "Prod", "section_type": "topic_analysis", "order_index": 1},
            {"section_id": "sec_2", "title": "03. Equipment Reliability", "topic": "Equip", "section_type": "topic_analysis", "order_index": 2},
            {"section_id": "sec_3", "title": "04. Safety Audit", "topic": "Safety", "section_type": "statutory_compliance", "order_index": 3},
            {"section_id": "sec_4", "title": "05. Recommendations", "topic": "Rec", "section_type": "topic_analysis", "order_index": 4},
        ]
        plan_dict = {
            "plan_id": "plan_par_101",
            "title": "Coal Output Review 2026",
            "sections": sections
        }

        mock_get_job.return_value = {"job_id": "job_parallel_001", "owner_id": "officer_parallel_test", "status": "COMPLETED", "files": []}
        mock_query_ev.return_value = {"items": [{"evidence_id": "ev_1", "content_text": "Production hit 12.4 MT."}], "total_count": 1}
        mock_get_plan.return_value = plan_dict
        mock_exists.return_value = True
        stat_mock = MagicMock()
        stat_mock.st_size = 500
        mock_stat.return_value = stat_mock
        mock_tool.return_value = {"plan_id": "plan_par_101", "report_id": "rep_par_101", "is_valid": True, "artifacts": {"md": "outputs/reports/rep_par_101.md"}}
        mock_get.return_value = self.state.model_dump()

        active_calls = 0
        max_concurrent_seen = 0

        def mock_call_qwen(prompt, **kwargs):
            nonlocal active_calls, max_concurrent_seen
            active_calls += 1
            if active_calls > max_concurrent_seen:
                max_concurrent_seen = active_calls

            # Simulate Ollama generation duration (0.20s per section)
            time.sleep(0.20)
            active_calls -= 1

            if "03. Equipment Reliability" in prompt:
                # Intentionally trigger an error for section 3 to test error resilience
                raise RuntimeError("Simulated transient socket timeout in Ollama")

            for s in sections:
                if s["title"] in prompt:
                    return f"Generated analytical content for {s['title']} [EV-001]."
            return "Generated section content [EV-001]."

        with patch.object(self.coordinator, '_call_qwen', side_effect=mock_call_qwen):
            start_time = time.time()
            final_state = self.coordinator.process_task("job_parallel_001", "Generate Annual Mining Intelligence Report")
            elapsed_parallel = time.time() - start_time

            # Verify task completed
            self.assertEqual(final_state.status, AgentTaskStatus.COMPLETED)

            # Retrieve saved plan passed to save_plan
            saved_plan_dict = mock_save_plan.call_args[0][0]
            saved_sections = saved_plan_dict["sections"]

            # 1. Deterministic Order Verification
            for idx, expected in enumerate(sections):
                self.assertEqual(saved_sections[idx]["title"], expected["title"], f"Section order mismatch at index {idx}")

            # 2. Content correctness and Error Resilience Verification
            self.assertIn("01. Introduction", saved_sections[0]["content_text"])
            self.assertIn("02. Production Analytics", saved_sections[1]["content_text"])
            # Section 3 should have failed gracefully without crashing the whole report
            self.assertIn("Generation Failed", saved_sections[2]["content_text"])
            self.assertIn("04. Safety Audit", saved_sections[3]["content_text"])
            self.assertIn("05. Recommendations", saved_sections[4]["content_text"])

            # 3. Concurrency Verification: max concurrent calls should have been > 1 (bounded by semaphore=4)
            self.assertGreater(max_concurrent_seen, 1, "Calls were not executed concurrently!")
            self.assertLessEqual(max_concurrent_seen, 4, "Calls exceeded semaphore bound!")

    def test_latency_comparison_benchmark(self):
        """Benchmark comparing sequential section generation vs parallel section generation."""
        sections = [
            PlannedSection(section_id=f"sec_{i}", title=f"Section {i}", topic=f"Topic {i}", section_type=SectionType.TOPIC_ANALYSIS.value, order_index=i)
            for i in range(5)
        ]

        section_latency = 0.25  # Simulated 250ms per LLM call

        def mock_qwen_call(prompt, **kwargs):
            time.sleep(section_latency)
            return f"Synthesized analytical section text: {prompt[:30]}"

        # 1. Simulate Sequential Writing (old baseline)
        seq_start = time.time()
        seq_results = []
        for sec in sections:
            with patch.object(self.coordinator, '_call_qwen', side_effect=mock_qwen_call):
                res = self.coordinator._call_qwen(
                    prompt=f"Write section {sec.title}",
                    system_instruction="sys",
                    state=self.state,
                    stage=WorkflowStage.WRITING
                )
                seq_results.append(res)
        seq_elapsed = time.time() - seq_start

        # 2. Parallel Writing (new pipeline)
        par_start = time.time()
        semaphore = asyncio.Semaphore(4)
        state_lock = asyncio.Lock()
        completed_tracker = [0]

        async def _run_par():
            tasks = [
                self.coordinator._write_section_async(
                    section=sec,
                    evidence_items=[],
                    chunk_summaries=[],
                    conflicts=[],
                    charts=[],
                    state=self.state,
                    stage=WorkflowStage.WRITING,
                    semaphore=semaphore,
                    plan_title="Benchmark Report",
                    state_lock=state_lock,
                    completed_tracker=completed_tracker
                )
                for sec in sections
            ]
            return await asyncio.gather(*tasks)

        with patch.object(self.coordinator, '_call_qwen', side_effect=mock_qwen_call):
            par_results = asyncio.run(_run_par())
        par_elapsed = time.time() - par_start

        speedup = seq_elapsed / par_elapsed if par_elapsed > 0 else 1.0

        print(f"\n==================================================")
        print(f"       PARALLEL SECTION WRITING BENCHMARK")
        print(f"==================================================")
        print(f"Sections Count:            {len(sections)}")
        print(f"Sequential Time (Previous): {seq_elapsed:.3f}s")
        print(f"Parallel Time (New):        {par_elapsed:.3f}s")
        print(f"Speedup Factor:            {speedup:.2f}x faster")
        print(f"==================================================\n")

        self.assertEqual(len(par_results), len(sections))
        self.assertLess(par_elapsed, seq_elapsed, "Parallel execution was not faster than sequential!")
        self.assertGreaterEqual(speedup, 1.8, "Speedup factor was below expected concurrency gains!")

    def test_active_and_completed_sections_tracking(self):
        """Verify active_sections is populated during execution and transferred to completed_sections on finish."""
        section = PlannedSection(
            section_id="sec_track",
            title="03. Mine Safety Analysis",
            topic="Safety stats",
            section_type=SectionType.TOPIC_ANALYSIS.value,
            order_index=0
        )
        semaphore = asyncio.Semaphore(1)
        state_lock = asyncio.Lock()
        completed_tracker = [0]
        seen_active = []

        def mock_call_qwen(prompt, **kwargs):
            # Inspect active_sections while inside the call
            seen_active.extend(list(self.state.structured_state.get("active_sections", [])))
            return "Safety analysis completed."

        with patch.object(self.coordinator, '_call_qwen', side_effect=mock_call_qwen):
            result = asyncio.run(
                self.coordinator._write_section_async(
                    section=section,
                    evidence_items=[],
                    chunk_summaries=[],
                    conflicts=[],
                    charts=[],
                    state=self.state,
                    stage=WorkflowStage.WRITING,
                    semaphore=semaphore,
                    plan_title="Annual Mine Audit",
                    state_lock=state_lock,
                    completed_tracker=completed_tracker
                )
            )

            # While executing, section title was in active_sections
            self.assertIn("03. Mine Safety Analysis", seen_active)
            # After execution, section title was removed from active_sections
            self.assertNotIn("03. Mine Safety Analysis", self.state.structured_state["active_sections"])
            # And added to completed_sections
            self.assertIn("03. Mine Safety Analysis", self.state.structured_state["completed_sections"])
            self.assertEqual(self.state.structured_state["sections_completed"], 1)

    def test_task_status_endpoint_returns_granular_progress(self):
        """Verify get_agent_task_status endpoint returns granular section progress fields."""
        from backend.routers.agent import get_agent_task_status

        self.state.structured_state["sections_completed"] = 3
        self.state.structured_state["total_sections"] = 10
        self.state.structured_state["active_sections"] = ["04. Safety Audit", "05. Environmental Clearance"]
        self.state.structured_state["completed_sections"] = ["01. Intro", "02. Production", "03. Geology"]

        with patch.object(AgentCoordinator, 'get_task_state', return_value=self.state):
            resp = get_agent_task_status(
                task_id=self.state.task_id,
                auth={"officer_id": "officer_parallel_test"}
            )

            self.assertTrue(resp["success"])
            self.assertEqual(resp["sections_completed"], 3)
            self.assertEqual(resp["total_sections"], 10)
            self.assertEqual(resp["active_sections"], ["04. Safety Audit", "05. Environmental Clearance"])
            self.assertEqual(resp["completed_sections"], ["01. Intro", "02. Production", "03. Geology"])
            self.assertEqual(resp["task"]["structured_state"]["sections_completed"], 3)


if __name__ == "__main__":
    unittest.main()
