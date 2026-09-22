import logging
import uuid
import json
from typing import List, Optional, Dict, Any

from backend.services.agent.agent_models import AgentTaskState, AgentTaskStatus
from backend.services.agent.agent_store import get_agent_state, save_agent_state
from backend.services.ai_inference_service import ai_inference_service
from backend.services.agent.agent_tool_registry import get_all_tool_schemas, execute_tool

logger = logging.getLogger("mineintel.agent_coordinator")

class AgentCoordinator:
    """
    Orchestration layer for the MineIntel Agent.
    Coordinates between the human request, existing AI inference layer,
    and deterministic MineIntel services (tools).
    """

    def __init__(self, owner_id: str):
        """
        Initializes the coordinator.
        The owner_id is strictly required to enforce isolation at the agent level.
        """
        if not owner_id:
            raise ValueError("owner_id is strictly required for AgentCoordinator isolation.")
        self.owner_id = owner_id

    def initialize_task(self, job_id: Optional[str] = None) -> AgentTaskState:
        """Initializes a new task state."""
        if not job_id:
            job_id = str(uuid.uuid4())
            
        state = AgentTaskState(
            job_id=job_id,
            owner_id=self.owner_id,
            status=AgentTaskStatus.PENDING
        )
        save_agent_state(state.dict())
        return state

    def get_task_state(self, job_id: str) -> Optional[AgentTaskState]:
        """Retrieves an existing task state, strictly checking owner_id."""
        state_dict = get_agent_state(job_id, self.owner_id)
        if state_dict:
            return AgentTaskState(**state_dict)
        return None

    def _build_system_prompt(self) -> str:
        tools = get_all_tool_schemas()
        return f"""You are the MineIntel Agent, a strict reasoning engine.
You have access to the following deterministic tools:
{json.dumps(tools, indent=2)}

You must respond in valid JSON matching one of these two structures:

To call a tool:
{{
  "action": "tool_call",
  "tool_name": "<name_of_tool>",
  "args": {{...}},
  "reasoning": "Why you are calling this tool"
}}

To complete the task:
{{
  "action": "completed",
  "result": "<final answer or summary>",
  "reasoning": "Why the task is complete"
}}

CONFLICT POLICY:
- If you detect conflicting information, document both sources in your output.
- NEVER silently choose a value. NEVER invent a resolution.
"""

    def process_task(self, job_id: str, prompt: str, images: Optional[List[str]] = None) -> AgentTaskState:
        """
        Main execution loop.
        Phase 2: Full orchestration with tool calls and retries.
        """
        state = self.get_task_state(job_id)
        if not state:
            logger.error(f"Task {job_id} not found for owner {self.owner_id}")
            raise ValueError("Task not found or unauthorized.")

        if state.status in [AgentTaskStatus.COMPLETED, AgentTaskStatus.FAILED]:
            logger.info(f"Task {job_id} is already in terminal state: {state.status}")
            return state

        state.status = AgentTaskStatus.RUNNING
        save_agent_state(state.dict())
        
        logger.info(f"Agent Coordinator: starting execution for job {job_id}")
        
        system_instruction = self._build_system_prompt()
        max_retries = 3
        retry_count = 0
        
        # We loop up to 10 iterations to prevent infinite loops
        max_iterations = 10
        iterations = 0
        
        while state.status == AgentTaskStatus.RUNNING and iterations < max_iterations:
            iterations += 1
            
            # Construct the prompt history
            history_text = "\n".join([json.dumps(h) for h in state.execution_history])
            full_prompt = f"Objective: {prompt}\n\nHistory:\n{history_text}\n\nRespond with JSON."
            
            try:
                # Use the existing AI inference provider registry via AIInferenceService
                provider = ai_inference_service._get_provider()
                from backend.services.ai_providers.base import AIRequest
                req = AIRequest(
                    prompt=full_prompt,
                    system_instruction=system_instruction,
                    temperature=0.1,
                    job_id=job_id,
                    owner_id=self.owner_id,
                    images=images if images else []
                )
                
                if images and iterations == 1: # Only send images on the first prompt to avoid overloading context
                    resp = provider.generate_multimodal(req)
                else:
                    req.images = [] # Clear images for subsequent calls
                    resp = provider.generate(req)
                    
                if not resp.success:
                    raise Exception(f"AI Provider failed: {resp.error}")
                
                # Parse JSON
                try:
                    raw_text = resp.text.strip()
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    elif raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    decision = json.loads(raw_text.strip())
                except json.JSONDecodeError:
                    raise ValueError(f"AI did not return valid JSON. Raw output: {resp.text}")

                action = decision.get("action")
                reasoning = decision.get("reasoning", "")
                
                state.execution_history.append({"role": "agent", "content": decision})
                save_agent_state(state.dict())

                if action == "tool_call":
                    tool_name = decision.get("tool_name")
                    args = decision.get("args", {})
                    
                    logger.info(f"Agent executing tool {tool_name}")
                    result = execute_tool(tool_name, args, self.owner_id, job_id)
                    
                    state.execution_history.append({"role": "tool", "tool_name": tool_name, "result": result})
                    save_agent_state(state.dict())
                    # State remains RUNNING to loop again
                    retry_count = 0 # reset retries on successful loop iteration
                    
                elif action == "completed":
                    state.status = AgentTaskStatus.COMPLETED
                    state.structured_state["final_result"] = decision.get("result")
                    save_agent_state(state.dict())
                    break
                else:
                    raise ValueError(f"Unknown action: {action}")

            except Exception as e:
                logger.warning(f"Error during agent loop: {str(e)}")
                state.status = AgentTaskStatus.RETRYING
                state.execution_history.append({"role": "system", "error": str(e)})
                save_agent_state(state.dict())
                retry_count += 1
                if retry_count >= max_retries:
                    logger.error(f"Max retries reached for task {job_id}")
                    state.status = AgentTaskStatus.FAILED
                    save_agent_state(state.dict())
                    break
                else:
                    # Transition back to RUNNING to retry parsing/prompting
                    state.status = AgentTaskStatus.RUNNING

        if iterations >= max_iterations and state.status == AgentTaskStatus.RUNNING:
            logger.error(f"Max iterations reached for task {job_id}")
            state.status = AgentTaskStatus.FAILED
            state.execution_history.append({"role": "system", "error": "Max agent iterations reached."})
            save_agent_state(state.dict())
            
        return state
