import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add the project root to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.services.agent.agent_coordinator import AgentCoordinator
from backend.services.agent.agent_models import AgentTaskState, AgentTaskStatus

class TestAgentLifecycle(unittest.TestCase):

    @patch('backend.services.agent.agent_coordinator.get_task')
    @patch('backend.services.agent.agent_coordinator.update_task_state')
    @patch('backend.services.agent.agent_coordinator.create_task')
    def test_lifecycle_and_owner_isolation(self, mock_create, mock_update, mock_get):
        # 1. Initialize Task with Owner 1
        coordinator1 = AgentCoordinator(owner_id="officer_1")
        
        # Simulate that get_task returns None initially
        mock_get.return_value = None
        
        state1 = coordinator1.initialize_task(task_id="job_001")
        self.assertEqual(state1.status, AgentTaskStatus.PENDING)
        self.assertEqual(state1.owner_id, "officer_1")
        self.assertEqual(state1.task_id, "job_001")
        mock_create.assert_called_with(state1.model_dump())
        
        # 2. Try to get task with Owner 2 (Isolation Test)
        coordinator2 = AgentCoordinator(owner_id="officer_2")
        # In actual implementation, agent_store.get_task filters by owner_id.
        # We simulate the DB returning None for a mismatched owner.
        mock_get.return_value = None
        state2 = coordinator2.get_task_state("job_001")
        self.assertIsNone(state2, "Owner 2 should not be able to access Owner 1's task")

        # 3. Simulate process_task transitioning the task to COMPLETED
        with patch('backend.services.agent.agent_coordinator.get_job') as mock_get_job, \
             patch('backend.services.agent.agent_coordinator.query_evidence') as mock_query_ev, \
             patch('backend.services.agent.agent_coordinator.planner_service.get_plan') as mock_get_plan, \
             patch('backend.services.agent.agent_coordinator.save_plan') as mock_save_plan, \
             patch('backend.services.agent.agent_coordinator.execute_tool') as mock_exec_tool, \
             patch('backend.services.agent.agent_coordinator.Path.exists') as mock_exists, \
             patch('backend.services.agent.agent_coordinator.Path.stat') as mock_stat, \
             patch('backend.services.agent.agent_coordinator.ai_inference_service._get_provider') as mock_get_provider:

            mock_get_job.return_value = {"job_id": "job_001", "owner_id": "officer_1", "status": "COMPLETED", "files": []}
            mock_query_ev.return_value = {"items": [{"evidence_id": "ev_1", "content_text": "text"}], "total_count": 1}
            mock_get_plan.return_value = {"plan_id": "p1", "title": "Audit", "sections": [{"section_id": "s1", "title": "Summary", "evidence_ids": ["ev_1"]}]}
            mock_exec_tool.return_value = {"plan_id": "p1", "report_id": "rep_001", "is_valid": True, "artifacts": {"md": "outputs/reports/rep_001.md"}}
            mock_exists.return_value = True
            stat_mock = MagicMock()
            stat_mock.st_size = 100
            mock_stat.return_value = stat_mock

            mock_provider = MagicMock()
            mock_resp = MagicMock()
            mock_resp.success = True
            mock_resp.text = "Executive section text."
            mock_provider.generate.return_value = mock_resp
            mock_get_provider.return_value = mock_provider
            
            mock_get.return_value = state1.model_dump()
            
            final_res = coordinator1.process_task("job_001", "Synthesize report")
            self.assertEqual(final_res.status, AgentTaskStatus.COMPLETED)
            self.assertEqual(final_res.structured_state["current_stage"], "COMPLETED")

if __name__ == "__main__":
    unittest.main()
