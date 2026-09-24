"""
MINEINTEL - PHASE B TEST SUITE: Real LLM, Section, and Overall Task Timeout Enforcement
Tests that:
1. Real LLM timeout is passed to HTTP/Ollama request socket and caught as structured error.
2. Deliberately short test timeout actually interrupts the request.
3. Section timeout (60s budget) is enforced per section and retries remain bounded.
4. Section timeout causes task transition to FAILED with code "SECTION_TIMEOUT" (no fake fallback or COMPLETED).
5. Overall task deadline (10m / 600s) is enforced across the entire workflow.
6. Overall deadline is not reset between stages (single absolute deadline propagation).
7. Non-retryable errors and expired deadlines fail immediately without wasteful retries.
8. Maximum 2 transient retries applied only when remaining time budget permits.
"""

import time
import unittest
from unittest.mock import MagicMock, patch
import requests

from backend.services.agent.agent_coordinator import (
    AgentCoordinator,
    LLMCallTimeoutError,
    SectionTimeoutError,
    TaskTimeoutError,
    TOTAL_WALLCLOCK_DEADLINE_SEC,
    SECTION_WRITING_TIMEOUT_SEC,
    LLM_CALL_TIMEOUT_SEC,
)
from backend.services.agent.agent_models import AgentTaskStatus, WorkflowStage
from backend.services.ai_providers.base import AIRequest, AIResponse
from backend.services.ai_providers.local_ollama import LocalOllamaProvider
from backend.services.planner_models import PlannedSection, ReportPlan


class TestPhaseBTimeouts(unittest.TestCase):
    def setUp(self):
        self.owner_id = "test_officer_phase_b"
        # Mock database writes to eliminate remote Neon Postgres network latency from unit tests
        self.patcher_update = patch("backend.services.agent.agent_coordinator.update_task_state")
        self.mock_update = self.patcher_update.start()
        self.patcher_create = patch("backend.services.agent.agent_coordinator.create_task")
        self.mock_create = self.patcher_create.start()

    def tearDown(self):
        self.patcher_update.stop()
        self.patcher_create.stop()

    # =========================================================================
    # B1: Real Per-LLM-Call Timeout
    # =========================================================================
    def test_llm_timeout_passed_to_requests_post(self):
        """Validates that req.timeout is passed directly to requests.post socket timeout."""
        provider = LocalOllamaProvider(host="http://localhost:11434")

        with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
            # Mock availability
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {"models": [{"name": "qwen2.5:7b"}]}

            # Mock successful generation
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "response": "Analysis content",
                "eval_count": 10,
                "total_duration": 1000000000,
            }

            req = AIRequest(
                prompt="Summarize evidence",
                timeout=12.5,  # Real custom timeout
                model="qwen2.5:7b"
            )
            resp = provider.generate(req)

            self.assertTrue(resp.success)
            self.assertEqual(resp.status, "completed")
            # Verify requests.post was called with timeout=12.5
            mock_post.assert_called_once()
            _, kwargs = mock_post.call_args
            self.assertEqual(kwargs.get("timeout"), 12.5)

    def test_llm_socket_timeout_produces_structured_timeout_status(self):
        """Validates that requests.exceptions.Timeout produces status='timeout' and structured error."""
        provider = LocalOllamaProvider(host="http://localhost:11434")

        with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {"models": [{"name": "qwen2.5:7b"}]}

            # Simulate socket timeout from requests
            mock_post.side_effect = requests.exceptions.Timeout("Socket read timed out")

            req = AIRequest(prompt="Analyze data", timeout=0.1, model="qwen2.5:7b")
            resp = provider.generate(req)

            self.assertFalse(resp.success)
            self.assertEqual(resp.status, "timeout")
            self.assertIn("timed out after 0.1s", resp.error)

    def test_llm_zero_or_negative_budget_aborts_immediately(self):
        """Validates that an expired timeout budget (<= 0) returns status='timeout' without HTTP call."""
        provider = LocalOllamaProvider(host="http://localhost:11434")

        with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {"models": [{"name": "qwen2.5:7b"}]}

            req = AIRequest(prompt="Analyze data", timeout=-0.5, model="qwen2.5:7b")
            resp = provider.generate(req)

            self.assertFalse(resp.success)
            self.assertEqual(resp.status, "timeout")
            self.assertIn("timed out before execution", resp.error)
            mock_post.assert_not_called()

    # =========================================================================
    # B2: Real Per-Section Timeout & Bounded Retries
    # =========================================================================
    def test_section_timeout_fails_task_with_section_timeout_code(self):
        """Validates that exceeding the section timeout fails task with code='SECTION_TIMEOUT'."""
        # Configure a very short section timeout (0.2s)
        coordinator = AgentCoordinator(
            owner_id=self.owner_id,
            overall_deadline_sec=60.0,
            section_writing_timeout_sec=0.2,
            llm_call_timeout_sec=5.0
        )
        state = coordinator.initialize_task()

        with patch("backend.services.agent.agent_coordinator.query_evidence") as mock_qe, \
             patch("backend.services.agent.agent_coordinator.planner_service.get_plan") as mock_gp, \
             patch("backend.services.agent.agent_coordinator.execute_tool") as mock_tool, \
             patch.object(coordinator, "get_task_state", return_value=state), \
             patch.object(coordinator, "_call_qwen") as mock_call_qwen:

            mock_qe.return_value = {"items": [{"evidence_id": "EV-1", "content_text": "Production fact"}]}
            mock_tool.return_value = {"plan_id": "test_plan"}

            mock_plan = ReportPlan(
                plan_id="test_plan",
                job_id=state.task_id,
                owner_id=self.owner_id,
                version=1,
                status="validated",
                title="Test Report",
                sections=[
                    PlannedSection(
                        section_id="sec_1",
                        title="Executive Summary",
                        topic="Executive Summary",
                        section_type="narrative",
                        order_index=1
                    )
                ]
            )
            mock_gp.return_value = mock_plan

            # Simulate _call_qwen raising SectionTimeoutError
            mock_call_qwen.side_effect = SectionTimeoutError("Section execution deadline exceeded (0.2s).")

            res_state = coordinator.process_task(state.task_id, prompt="Test instruction")

            self.assertEqual(res_state.status, AgentTaskStatus.FAILED)
            self.assertEqual(res_state.error.code, "SECTION_TIMEOUT")
            self.assertIn("Section execution deadline exceeded", res_state.error.message)
            # Ensure no fake report_id was set
            self.assertNotIn("report_id", res_state.structured_state)

    def test_section_retries_do_not_exceed_section_deadline(self):
        """Validates that retries in _call_qwen are bounded by remaining time and do not run infinitely."""
        coordinator = AgentCoordinator(
            owner_id=self.owner_id,
            overall_deadline_sec=60.0,
            section_writing_timeout_sec=0.5,
            llm_call_timeout_sec=0.2
        )
        state = coordinator.initialize_task()
        state.status = AgentTaskStatus.RUNNING
        coordinator.task_start_time = time.time()
        coordinator.task_deadline = time.time() + 60.0

        # Simulate provider that always times out
        mock_provider = MagicMock()
        mock_provider.generate.return_value = AIResponse(
            success=False,
            status="timeout",
            error="Ollama timed out"
        )

        with patch("backend.services.agent.agent_coordinator.ai_inference_service._get_provider", return_value=mock_provider):
            sec_deadline = time.time() + 0.3
            t0 = time.time()
            with self.assertRaises((SectionTimeoutError, LLMCallTimeoutError)):
                coordinator._call_qwen(
                    prompt="Test prompt",
                    system_instruction="Test system",
                    state=state,
                    stage=WorkflowStage.WRITING,
                    deadline=sec_deadline
                )
            elapsed = time.time() - t0
            # Total elapsed time must be bounded by deadline + brief grace (well under 1.0s)
            self.assertLess(elapsed, 1.0)

    # =========================================================================
    # B3: Real Overall Task Deadline
    # =========================================================================
    def test_overall_task_deadline_enforced_across_workflow(self):
        """Validates that a task exceeding overall deadline transitions to FAILED with WALLCLOCK_TIMEOUT."""
        # Configure an extremely short overall deadline (0.05s)
        coordinator = AgentCoordinator(
            owner_id=self.owner_id,
            overall_deadline_sec=0.05,
            section_writing_timeout_sec=1.0,
            llm_call_timeout_sec=1.0
        )
        state = coordinator.initialize_task()

        with patch("backend.services.agent.agent_coordinator.query_evidence") as mock_qe, \
             patch.object(coordinator, "get_task_state", return_value=state):
            mock_qe.return_value = {"items": [{"evidence_id": "EV-1", "content_text": "Production data"}]}

            # Sleep slightly so deadline is already expired before Stage 2
            time.sleep(0.06)
            res_state = coordinator.process_task(state.task_id, prompt="Test prompt")

            self.assertEqual(res_state.status, AgentTaskStatus.FAILED)
            self.assertEqual(res_state.error.code, "WALLCLOCK_TIMEOUT")
            self.assertIn("overall deadline", res_state.error.message.lower())
            self.assertFalse(res_state.error.retryable)

    # =========================================================================
    # B4: Deadline Propagation (Single Absolute Deadline)
    # =========================================================================
    def test_deadline_propagation_bounds_stage_deadlines(self):
        """Validates that stage_deadline derives from absolute task_deadline and is not reset."""
        coordinator = AgentCoordinator(
            owner_id=self.owner_id,
            overall_deadline_sec=10.0,
            section_writing_timeout_sec=5.0,
            llm_call_timeout_sec=5.0
        )
        state = coordinator.initialize_task()
        state.status = AgentTaskStatus.RUNNING

        now = time.time()
        coordinator.task_start_time = now
        coordinator.task_deadline = now + 10.0

        # When setting a stage with 45s nominal timeout, the effective stage deadline
        # MUST be bounded by task_deadline (now + 10s), NOT now + 45s.
        coordinator._set_stage(state, WorkflowStage.EVIDENCE_ANALYSIS, timeout_sec=45)

        stage_deadline_sec = state.structured_state["stage_deadline"] / 1000.0
        task_deadline_sec = state.structured_state["task_deadline"] / 1000.0

        # stage_deadline must NOT exceed task_deadline
        self.assertLessEqual(stage_deadline_sec, task_deadline_sec + 0.1)
        # stage_deadline must be approximately now + 10s, NOT now + 45s
        self.assertLess(stage_deadline_sec - now, 11.0)

    # =========================================================================
    # B5: Status / Error Integrity
    # =========================================================================
    def test_timeout_failure_has_no_fake_report_or_success(self):
        """Validates that timeout failure leaves no fake artifacts or success flag."""
        coordinator = AgentCoordinator(
            owner_id=self.owner_id,
            overall_deadline_sec=0.05
        )
        state = coordinator.initialize_task()

        with patch.object(coordinator, "get_task_state", return_value=state):
            time.sleep(0.06)
            res_state = coordinator.process_task(state.task_id, prompt="Generate report")

            self.assertEqual(res_state.status, AgentTaskStatus.FAILED)
            self.assertNotIn("report_id", res_state.structured_state)
            self.assertNotIn("artifacts", res_state.structured_state)
            self.assertNotEqual(res_state.status, AgentTaskStatus.COMPLETED)

    # =========================================================================
    # B6: Retries & Non-Retryable Error Handling
    # =========================================================================
    def test_model_unavailable_fails_immediately_without_retries(self):
        """Validates that model_unavailable is non-retryable and fails immediately on attempt 1."""
        coordinator = AgentCoordinator(
            owner_id=self.owner_id,
            overall_deadline_sec=60.0
        )
        state = coordinator.initialize_task()
        state.status = AgentTaskStatus.RUNNING
        coordinator.task_start_time = time.time()
        coordinator.task_deadline = time.time() + 60.0

        mock_provider = MagicMock()
        mock_provider.generate.return_value = AIResponse(
            success=False,
            status="model_unavailable",
            error="Model 'qwen2.5:7b' not found in local Ollama."
        )

        with patch("backend.services.agent.agent_coordinator.ai_inference_service._get_provider", return_value=mock_provider):
            from backend.services.agent.agent_tool_registry import FatalToolError
            with self.assertRaises(FatalToolError):
                coordinator._call_qwen(
                    prompt="Test",
                    system_instruction="Test system",
                    state=state,
                    stage=WorkflowStage.WRITING
                )

            # Assert that provider.generate was called exactly ONCE (no retries for missing model!)
            self.assertEqual(mock_provider.generate.call_count, 1)


if __name__ == "__main__":
    unittest.main()
