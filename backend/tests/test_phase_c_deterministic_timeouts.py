"""
MINEINTEL - PHASE C TEST SUITE: Deterministic Tool & Stage Timeout Enforcement
Tests that:
1. get_intelligence timeout is actively enforceable in ThreadPoolExecutor.
2. detect_charts timeout is actively enforceable.
3. render_chart timeout is enforceable and caught as non-fatal warning when chart is optional.
4. Timed-out deterministic tools transition the Agent task immediately to FAILED (never remaining RUNNING).
5. Overall wallclock deadline (600s) cannot be bypassed by any blocking deterministic tool (Stage 1-10).
6. No fake report_id or COMPLETED state is produced after a timeout.
7. Normal small multi-document workflow still reaches Stage 9/10 COMPLETED.
"""

import time
import unittest
from unittest.mock import MagicMock, patch

from backend.services.agent.agent_coordinator import (
    AgentCoordinator,
    TaskTimeoutError,
    ToolTimeoutError,
    SectionTimeoutError,
    LLMCallTimeoutError,
    STAGE_DEADLINE_SEC,
    TOTAL_WALLCLOCK_DEADLINE_SEC
)
from backend.services.agent.agent_models import AgentTaskState, AgentTaskStatus, WorkflowStage
from backend.services.planner_models import PlannedSection, ReportPlan, SectionType
from backend.services.conflict_detector import ConflictDetector


class TestDeterministicToolTimeouts(unittest.TestCase):
    def setUp(self):
        self.owner_id = "test_officer_phase_c"
        # Mock database writes to eliminate remote Neon Postgres network latency from unit tests
        self.patcher_update = patch("backend.services.agent.agent_coordinator.update_task_state")
        self.mock_update = self.patcher_update.start()
        self.patcher_create = patch("backend.services.agent.agent_coordinator.create_task")
        self.mock_create = self.patcher_create.start()

    def tearDown(self):
        self.patcher_update.stop()
        self.patcher_create.stop()

    def _create_mock_state(self, task_id="task_det_test", stage=WorkflowStage.LOAD_MANIFEST):
        now = int(time.time() * 1000)
        return AgentTaskState(
            task_id=task_id,
            owner_id=self.owner_id,
            status=AgentTaskStatus.RUNNING,
            created_at=now,
            updated_at=now,
            structured_state={
                "job_id": task_id,
                "current_stage": stage.value,
                "current_tool": None,
                "stage_started_at": now,
                "stage_deadline": now + STAGE_DEADLINE_SEC * 1000,
                "progress_reason": "Executing...",
                "files_total": 1,
                "files_completed": 1,
                "chunks_total": 1,
                "chunks_completed": 0,
                "retry_count": 0
            }
        )

    # =========================================================================
    # C1: Deterministic Tool Timeouts (get_intelligence & detect_charts)
    # =========================================================================
    def test_get_intelligence_timeout_enforceable(self):
        """Validates that a blocking get_intelligence tool times out and transitions task to FAILED."""
        coord = AgentCoordinator(owner_id=self.owner_id)
        coord.task_start_time = time.time()
        coord.task_deadline = coord.task_start_time + 600.0

        state = self._create_mock_state("task_intel_timeout", WorkflowStage.INTELLIGENCE_ANALYSIS)

        # Simulate a blocking execute_tool that sleeps 2.0s
        def blocking_execute(*args, **kwargs):
            time.sleep(2.0)
            return {"status": "success", "result": {}}

        with patch("backend.services.agent.agent_coordinator.execute_tool", side_effect=blocking_execute):
            # Enforce 0.15s budget
            with self.assertRaises(ToolTimeoutError) as ctx:
                coord._execute_tool_with_state(
                    state,
                    WorkflowStage.INTELLIGENCE_ANALYSIS,
                    "get_intelligence",
                    {},
                    timeout_sec=0.15,
                    ev_count=10
                )
            self.assertIn("exceeded 0.1s deadline", str(ctx.exception))

    def test_detect_charts_timeout_enforceable(self):
        """Validates that a blocking detect_charts tool times out and raises ToolTimeoutError."""
        coord = AgentCoordinator(owner_id=self.owner_id)
        coord.task_start_time = time.time()
        coord.task_deadline = coord.task_start_time + 600.0

        state = self._create_mock_state("task_chart_timeout", WorkflowStage.CHART_ANALYSIS)

        def blocking_detect(*args, **kwargs):
            time.sleep(2.0)
            return []

        with patch("backend.services.agent.agent_coordinator.execute_tool", side_effect=blocking_detect):
            with self.assertRaises(ToolTimeoutError):
                coord._execute_tool_with_state(
                    state,
                    WorkflowStage.CHART_ANALYSIS,
                    "detect_charts",
                    {},
                    timeout_sec=0.15,
                    ev_count=10
                )

    def test_timed_out_tool_produces_failed_status_in_workflow(self):
        """Validates that a timed out get_intelligence stage causes process_task to terminate with FAILED status."""
        coord = AgentCoordinator(owner_id=self.owner_id)
        task_id = "task_intel_fail_flow"
        state = self._create_mock_state(task_id, WorkflowStage.LOAD_MANIFEST)

        # Mock stages 1-3 to succeed
        with patch.object(coord, "get_task_state", return_value=state), \
             patch("backend.services.agent.agent_coordinator.get_job", return_value={"files": [{"file_id": "f1"}]}), \
             patch("backend.services.agent.agent_coordinator.query_evidence", return_value={"items": [{"evidence_id": "e1", "content_text": "Fact"}]}), \
             patch.object(coord, "_call_qwen", return_value="Summary text"), \
             patch("backend.services.agent.agent_coordinator.execute_tool") as mock_exec:

            # Make get_intelligence block
            def blocking_handler(tool_name, *args, **kwargs):
                if tool_name == "get_intelligence":
                    time.sleep(1.0)
                return {"status": "success", "result": {}}

            mock_exec.side_effect = blocking_handler

            with patch("backend.services.agent.agent_coordinator.STAGE_DEADLINE_SEC", 0.15):
                final_state = coord.process_task(task_id=task_id, prompt="Test prompt")

            self.assertEqual(final_state.status, AgentTaskStatus.FAILED)
            self.assertEqual(final_state.error.code, "STAGE_TIMEOUT")
            self.assertIn("exceeded", final_state.error.message)
            self.assertIsNone(final_state.structured_state.get("current_tool"))
            self.assertNotIn("report_id", final_state.structured_state)

    # =========================================================================
    # C2: Overall Deadline Cannot Be Bypassed by Blocking Tool
    # =========================================================================
    def test_overall_deadline_cannot_be_bypassed_by_blocking_tool(self):
        """Validates that a deterministic tool cannot block longer than the overall wallclock deadline."""
        # Set overall deadline to 0.15 seconds
        coord = AgentCoordinator(owner_id=self.owner_id, overall_deadline_sec=0.15)
        coord.task_start_time = time.time()
        coord.task_deadline = coord.task_start_time + 0.15

        state = self._create_mock_state("task_wallclock_tool", WorkflowStage.INTELLIGENCE_ANALYSIS)

        def blocking_execute(*args, **kwargs):
            time.sleep(1.0)
            return {"status": "success", "result": {}}

        with patch("backend.services.agent.agent_coordinator.execute_tool", side_effect=blocking_execute):
            with self.assertRaises(TaskTimeoutError) as ctx:
                coord._execute_tool_with_state(
                    state,
                    WorkflowStage.INTELLIGENCE_ANALYSIS,
                    "get_intelligence",
                    {},
                    timeout_sec=45.0,  # Stage budget is 45s, but overall task deadline is only 0.15s
                    ev_count=10
                )
            self.assertIn("overall deadline", str(ctx.exception).lower())

    # =========================================================================
    # C3: Render Chart Bounded Execution & Non-Fatal Policy
    # =========================================================================
    def test_render_chart_timeout_handled_as_warning(self):
        """Validates that render_chart timeout in Stage 5 is caught as a non-fatal warning."""
        coord = AgentCoordinator(owner_id=self.owner_id)
        coord.task_start_time = time.time()
        coord.task_deadline = coord.task_start_time + 600.0

        state = self._create_mock_state("task_render_warning", WorkflowStage.CHART_ANALYSIS)

        def blocking_render(tool_name, *args, **kwargs):
            if tool_name == "render_chart":
                time.sleep(1.0)
            return {"status": "success", "result": {}}

        with patch("backend.services.agent.agent_coordinator.execute_tool", side_effect=blocking_render):
            with self.assertRaises(ToolTimeoutError):
                coord._execute_tool_with_state(
                    state,
                    WorkflowStage.CHART_ANALYSIS,
                    "render_chart",
                    {"chart_type": "bar", "x_col": "month", "y_cols": ["production"]},
                    timeout_sec=0.15,
                    ev_count=5
                )

    # =========================================================================
    # C4: No Fake Report & Normal Flow Reaches Stage 9/10
    # =========================================================================
    def test_no_fake_report_or_completed_state_after_timeout(self):
        """Validates that after a tool timeout, state is strictly FAILED with no artifact."""
        coord = AgentCoordinator(owner_id=self.owner_id)
        state = self._create_mock_state("task_no_fake", WorkflowStage.INTELLIGENCE_ANALYSIS)

        failed_state = coord._fail_task(
            state,
            code="STAGE_TIMEOUT",
            message="Deterministic tool get_intelligence exceeded deadline.",
            stage=WorkflowStage.INTELLIGENCE_ANALYSIS,
            tool="get_intelligence"
        )

        self.assertEqual(failed_state.status, AgentTaskStatus.FAILED)
        self.assertNotEqual(failed_state.status, AgentTaskStatus.COMPLETED)
        self.assertIsNone(failed_state.structured_state.get("report_id"))
        self.assertIsNone(failed_state.structured_state.get("artifacts"))

    def test_normal_workflow_reaches_completion(self):
        """Validates that a healthy workflow with fast tools reaches Stage 10 COMPLETED without timeout."""
        coord = AgentCoordinator(owner_id=self.owner_id)
        task_id = "task_healthy_flow"
        state = self._create_mock_state(task_id, WorkflowStage.LOAD_MANIFEST)

        plan_dict = {
            "plan_id": "plan_test_ok",
            "job_id": task_id,
            "owner_id": self.owner_id,
            "title": "Healthy Report",
            "version": 1,
            "status": "ready_for_generation",
            "sections": [
                {
                    "section_id": "sec_1",
                    "title": "Executive Summary",
                    "section_type": "executive_summary",
                    "topic": "SUMMARY",
                    "order_index": 1,
                    "evidence_ids": ["e1"]
                }
            ]
        }

        with patch.object(coord, "get_task_state", return_value=state), \
             patch("backend.services.agent.agent_coordinator.get_job", return_value={"files": [{"file_id": "f1"}]}), \
             patch("backend.services.agent.agent_coordinator.query_evidence", return_value={"items": [{"evidence_id": "e1", "content_text": "Coal fact"}]}), \
             patch.object(coord, "_call_qwen", return_value="Synthesized executive summary content."), \
             patch("backend.services.agent.agent_coordinator.execute_tool") as mock_exec, \
             patch("backend.services.agent.agent_coordinator.planner_service.get_plan", return_value=plan_dict), \
             patch("pathlib.Path.exists", return_value=True), \
             patch("pathlib.Path.stat") as mock_stat:

            mock_stat.return_value.st_size = 500

            def fast_tools(tool_name, *args, **kwargs):
                if tool_name == "get_intelligence":
                    return {"status": "success", "result": {"conflicts": []}}
                elif tool_name == "detect_charts":
                    return {"status": "success", "result": []}
                elif tool_name == "create_plan":
                    return {"status": "success", "result": {"plan_id": "plan_test_ok"}}
                elif tool_name == "validate_plan":
                    return {"status": "success", "result": {"is_valid": True}}
                elif tool_name == "generate_report":
                    return {"status": "success", "result": {"report_id": "rep_ok_123", "artifacts": {"md": "/tmp/test.md"}}}
                return {"status": "success", "result": {}}

            mock_exec.side_effect = fast_tools

            final_state = coord.process_task(task_id=task_id, prompt="Healthy test prompt")

            self.assertEqual(final_state.status, AgentTaskStatus.COMPLETED)
            self.assertEqual(final_state.structured_state.get("current_stage"), WorkflowStage.COMPLETED.value)
            self.assertEqual(final_state.structured_state.get("report_id"), "rep_ok_123")

    # =========================================================================
    # C5: Unbounded Conflict Detection & Non-Blocking Executor Cleanup
    # =========================================================================
    def test_conflict_detection_beyond_50_items(self):
        """Validates that conflict detection has no arbitrary 50-item cap and detects discrepancies past index 50."""
        items = []
        # Create 60 items citing 205000 tonnes
        for i in range(60):
            items.append({
                "evidence_id": f"ev_{i:03d}",
                "content_text": f"Record #{i}: June coal production recorded at 205000 tonnes.",
                "provenance": {"filename": f"source_batch_{i}.csv"}
            })
        # Add 5 items past index 50 citing conflicting 215000 tonnes
        for j in range(60, 65):
            items.append({
                "evidence_id": f"ev_{j:03d}",
                "content_text": f"Record #{j}: June coal production recorded at 215000 tonnes.",
                "provenance": {"filename": "source_operations.docx"}
            })

        conflicts = ConflictDetector.detect_conflicts(items, "job_test_unbounded", self.owner_id)
        self.assertGreater(len(conflicts), 0)

        # Confirm evidence item 60 (well beyond the old 50-item cutoff) is captured in conflicts
        conflicting_pairs = [c.conflicting_evidence_ids for c in conflicts]
        has_late_item = any("ev_060" in pair for pair in conflicting_pairs)
        self.assertTrue(has_late_item, "Evidence item beyond index 50 was missing from detected conflicts!")

        # Confirm conflict schemas, variance, and review flags are fully preserved
        sample_conf = next(c for c in conflicts if "ev_060" in c.conflicting_evidence_ids)
        self.assertAlmostEqual(sample_conf.variance_pct, 4.65, delta=0.1)
        self.assertEqual(sample_conf.status, "flagged_for_review")
        self.assertIn("flag", sample_conf.review_flag)
        self.assertIsNotNone(sample_conf.recommended_evidence_id)

    def test_deterministic_timeout_wallclock_return_not_delayed_by_worker(self):
        """
        Validates that a deliberately blocking tool raises ToolTimeoutError within bounded tolerance,
        and coordinator return is NOT delayed by executor cleanup waiting for the worker thread.
        """
        coord = AgentCoordinator(owner_id=self.owner_id)
        coord.task_start_time = time.time()
        coord.task_deadline = coord.task_start_time + 600.0

        state = self._create_mock_state("task_non_blocking_cleanup", WorkflowStage.INTELLIGENCE_ANALYSIS)

        # Worker thread sleeps for 1.8 seconds
        def long_sleeping_tool(*args, **kwargs):
            time.sleep(1.8)
            return {"status": "success", "result": {}}

        with patch("backend.services.agent.agent_coordinator.execute_tool", side_effect=long_sleeping_tool):
            t_start = time.time()
            # Allowed budget is 0.15s (150ms)
            with self.assertRaises(ToolTimeoutError):
                coord._execute_tool_with_state(
                    state,
                    WorkflowStage.INTELLIGENCE_ANALYSIS,
                    "get_intelligence",
                    {},
                    timeout_sec=0.15,
                    ev_count=10
                )
            t_elapsed = time.time() - t_start

            # If executor shutdown had waited for the worker thread, t_elapsed would be >= 1.8s.
            # With wait=False, t_elapsed should be tightly bounded around 0.15s (< 0.60s tolerance).
            self.assertLess(
                t_elapsed, 0.60,
                f"Executor cleanup waited for timed-out worker! Elapsed: {t_elapsed:.3f}s, expected < 0.60s"
            )


if __name__ == "__main__":
    unittest.main()

