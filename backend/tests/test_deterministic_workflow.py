import os
import sys
import time
import unittest
from unittest.mock import patch, MagicMock

# Add the project root to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.services.agent.agent_coordinator import (
    AgentCoordinator,
    MAX_CHUNK_CHARS,
    MAX_EVIDENCE_ITEMS_PER_PROMPT,
    PENDING_STARTUP_DEADLINE_SEC,
    STAGE_DEADLINE_SEC,
    SECTION_WRITING_TIMEOUT_SEC,
    MAX_TRANSIENT_RETRIES
)
from backend.services.agent.agent_models import AgentTaskState, AgentTaskStatus, WorkflowStage, StructuredError
from backend.services.agent.agent_tool_registry import FatalToolError, RetryableToolError


class TestDeterministicWorkflowEngine(unittest.TestCase):

    def setUp(self):
        self.owner_id = "test_officer_007"
        self.coordinator = AgentCoordinator(owner_id=self.owner_id)

    @patch('backend.services.agent.agent_coordinator.create_task')
    def test_initialize_task(self, mock_create):
        """Verify task initialization creates a valid PENDING state with startup deadline."""
        state = self.coordinator.initialize_task(task_id="job_test_101")
        self.assertEqual(state.status, AgentTaskStatus.PENDING)
        self.assertEqual(state.owner_id, self.owner_id)
        self.assertEqual(state.task_id, "job_test_101")
        self.assertEqual(state.structured_state["current_stage"], WorkflowStage.LOAD_MANIFEST.value)
        self.assertIsNone(state.structured_state["current_tool"])
        self.assertGreater(state.structured_state["stage_deadline"], state.created_at)
        mock_create.assert_called_once()

    @patch('backend.services.agent.agent_coordinator.update_task_state')
    def test_set_stage_pre_persistence(self, mock_update):
        """Verify current_stage and current_tool are persisted BEFORE operation."""
        state = AgentTaskState(
            task_id="job_test_102",
            owner_id=self.owner_id,
            status=AgentTaskStatus.RUNNING,
            structured_state={}
        )
        self.coordinator._set_stage(
            state,
            stage=WorkflowStage.EVIDENCE_ANALYSIS,
            timeout_sec=45,
            tool="query_evidence",
            progress_reason="Querying structured evidence items..."
        )
        self.assertEqual(state.structured_state["current_stage"], WorkflowStage.EVIDENCE_ANALYSIS.value)
        self.assertEqual(state.structured_state["current_tool"], "query_evidence")
        self.assertEqual(state.structured_state["progress_reason"], "Querying structured evidence items...")
        self.assertIsNotNone(state.heartbeat_at)
        mock_update.assert_called_once()

    @patch('backend.services.agent.agent_coordinator.update_task_state')
    def test_fail_task_structured_error(self, mock_update):
        """Verify _fail_task creates a StructuredError and immediate FAILED transition."""
        state = AgentTaskState(
            task_id="job_test_103",
            owner_id=self.owner_id,
            status=AgentTaskStatus.RUNNING,
            structured_state={}
        )
        failed_state = self.coordinator._fail_task(
            state,
            code="EVIDENCE_EMPTY",
            message="No structured evidence found for job.",
            stage=WorkflowStage.EVIDENCE_ANALYSIS,
            tool="query_evidence",
            retryable=False
        )
        self.assertEqual(failed_state.status, AgentTaskStatus.FAILED)
        self.assertIsNotNone(failed_state.error)
        self.assertEqual(failed_state.error.code, "EVIDENCE_EMPTY")
        self.assertEqual(failed_state.error.stage, WorkflowStage.EVIDENCE_ANALYSIS.value)
        self.assertFalse(failed_state.error.retryable)
        self.assertIsNone(failed_state.structured_state["current_tool"])
        mock_update.assert_called_once()

    def test_bounded_evidence_chunking(self):
        """Verify large evidence chunks do not exceed approved bounds."""
        # 12 items of 1000 characters each
        items = [{"id": f"ev_{i}", "content_text": "A" * 1000} for i in range(12)]
        prompt_str = self.coordinator.prepare_bounded_evidence_context(items)
        # Bounded by MAX_EVIDENCE_ITEMS_PER_PROMPT (5 items)
        self.assertLessEqual(len(prompt_str), MAX_CHUNK_CHARS)
        # Verify deterministic ordering and chunk limits
        for i in range(MAX_EVIDENCE_ITEMS_PER_PROMPT):
            self.assertIn(f"[Evidence ev_{i}", prompt_str)
        # Item 5 and beyond should not be in the prompt
        self.assertNotIn("[Evidence ev_5", prompt_str)

    @patch('backend.services.agent.agent_coordinator.get_task')
    @patch('backend.services.agent.agent_coordinator.update_task_state')
    @patch('backend.services.agent.agent_coordinator.execute_tool')
    @patch('backend.services.agent.agent_coordinator.get_job')
    @patch('backend.services.agent.agent_coordinator.query_evidence')
    @patch('backend.services.agent.agent_coordinator.planner_service.get_plan')
    @patch('backend.services.agent.agent_coordinator.save_plan')
    @patch('backend.services.agent.agent_coordinator.ai_inference_service._get_provider')
    @patch('backend.services.agent.agent_coordinator.Path.exists')
    @patch('backend.services.agent.agent_coordinator.Path.stat')
    def test_full_deterministic_pipeline_success(
        self,
        mock_stat,
        mock_exists,
        mock_get_provider,
        mock_save_plan,
        mock_get_plan,
        mock_query_evidence,
        mock_get_job,
        mock_execute_tool,
        mock_update,
        mock_get_task
    ):
        """Verify end-to-end execution of all 10 stages transitioning cleanly to COMPLETED."""
        job_id = "job_full_test"
        now = int(time.time() * 1000)

        initial_state = AgentTaskState(
            task_id=job_id,
            owner_id=self.owner_id,
            status=AgentTaskStatus.PENDING,
            created_at=now,
            updated_at=now,
            structured_state={
                "job_id": job_id,
                "current_stage": WorkflowStage.LOAD_MANIFEST.value,
                "stage_started_at": now,
                "stage_deadline": now + 30000
            }
        )
        mock_get_task.return_value = initial_state.model_dump()

        # Mock ingestion job and manifest
        mock_get_job.return_value = {
            "job_id": job_id,
            "owner_id": self.owner_id,
            "status": "COMPLETED",
            "files": [{"filename": "sample_mine_audit.pdf", "size": 1024}]
        }

        # Mock query_evidence
        mock_query_evidence.return_value = {
            "items": [
                {"evidence_id": "ev_01", "content_text": "Production volume: 1.2M MT", "page_number": 1, "topic": "production"}
            ],
            "total_count": 1
        }

        # Mock planner
        mock_get_plan.return_value = {
            "plan_id": "plan_001",
            "title": "Comprehensive Mining Audit",
            "sections": [
                {"section_id": "sec_01", "title": "Executive Summary", "topic": "production", "evidence_ids": ["ev_01"]}
            ]
        }

        # Mock tools
        def fake_tool_executor(tool_name, params, owner_id, *args, **kwargs):
            if tool_name == "query_evidence":
                return {
                    "job_id": job_id,
                    "items": [
                        {"evidence_id": "ev_01", "content_text": "Production volume: 1.2M MT", "page_number": 1, "topic": "production"}
                    ],
                    "total_count": 1
                }
            elif tool_name == "get_intelligence":
                return {"job_id": job_id, "anomalies": [], "state_aggregates": {}}
            elif tool_name == "detect_charts":
                return {"job_id": job_id, "charts": [{"chart_id": "ch_01", "chart_type": "bar", "title": "Production By Month"}]}
            elif tool_name == "create_plan":
                return {
                    "job_id": job_id,
                    "plan": {
                        "plan_id": "plan_001",
                        "title": "Comprehensive Mining Audit",
                        "sections": [
                            {"section_id": "sec_01", "title": "Executive Summary", "topic": "production", "evidence_ids": ["ev_01"]}
                        ]
                    }
                }
            elif tool_name == "validate_plan":
                return {"plan_id": "plan_001", "is_valid": True, "issues": []}
            elif tool_name == "generate_report":
                return {
                    "report_id": "rep_test_001",
                    "status": "COMPLETED",
                    "md_path": "outputs/reports/rep_test_001.md",
                    "artifacts": {"md": "outputs/reports/rep_test_001.md"}
                }
            return {}

        mock_execute_tool.side_effect = fake_tool_executor

        # Mock Ollama Qwen provider
        mock_provider = MagicMock()
        mock_resp = MagicMock()
        mock_resp.success = True
        mock_resp.text = "Executive synthesis for production metrics."
        mock_provider.generate.return_value = mock_resp
        mock_get_provider.return_value = mock_provider

        # Mock file existence on disk
        mock_exists.return_value = True
        stat_mock = MagicMock()
        stat_mock.st_size = 500
        mock_stat.return_value = stat_mock

        final_state = self.coordinator.process_task(job_id, "Synthesize complete audit report")

        self.assertEqual(final_state.status, AgentTaskStatus.COMPLETED)
        self.assertEqual(final_state.structured_state["current_stage"], WorkflowStage.COMPLETED.value)
        self.assertIsNone(final_state.structured_state["current_tool"])
        self.assertEqual(final_state.structured_state["report_id"], "rep_test_001")
        self.assertIn("md", final_state.structured_state["artifacts"])
        self.assertIsNone(final_state.error)

    @patch('backend.services.agent.agent_coordinator.get_task')
    @patch('backend.services.agent.agent_coordinator.update_task_state')
    def test_startup_deadline_watchdog(self, mock_update, mock_get_task):
        """Verify startup watchdog transitions stuck PENDING tasks to FAILED."""
        job_id = "job_stuck_pending"
        stale_time = int((time.time() - 35) * 1000) # 35s ago

        stuck_state = AgentTaskState(
            task_id=job_id,
            owner_id=self.owner_id,
            status=AgentTaskStatus.PENDING,
            created_at=stale_time,
            updated_at=stale_time,
            structured_state={
                "job_id": job_id,
                "current_stage": WorkflowStage.LOAD_MANIFEST.value,
                "stage_started_at": stale_time,
                "stage_deadline": stale_time + 30000
            }
        )
        mock_get_task.return_value = stuck_state.model_dump()

        failed_state = self.coordinator.process_task(job_id, "Test")
        self.assertEqual(failed_state.status, AgentTaskStatus.FAILED)
        self.assertEqual(failed_state.error.code, "STARTUP_TIMEOUT")
        self.assertIn("startup deadline", failed_state.error.message.lower())


if __name__ == "__main__":
    unittest.main()
