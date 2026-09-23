import json
import logging
import uuid
from typing import Any, Dict, List, Optional

from backend.services.agent.agent_models import (
    AgentTaskState,
    AgentTaskStatus,
)
from backend.services.agent.agent_store import get_agent_store
from backend.services.agent.agent_tool_registry import (
    execute_tool,
    get_all_tool_schemas,
)
from backend.services.agent.agent_validator import (
    AgentValidationError,
    parse_and_validate_model_response,
)
from backend.services.ai_inference_service import ai_inference_service

logger = logging.getLogger("mineintel.agent_coordinator")


class AgentCoordinator:
    """
    Orchestration layer for the MineIntel Agent.

    Coordinates the human request, Qwen inference, and existing
    deterministic MineIntel tools.
    """

    def __init__(self, owner_id: str):
        if not owner_id:
            raise ValueError(
                "owner_id is strictly required for AgentCoordinator isolation."
            )

        self.owner_id = owner_id
        self.store = get_agent_store()

    def initialize_task(
        self,
        job_id: Optional[str] = None,
        instruction: str = "",
    ) -> AgentTaskState:
        """
        Initialize and persist a new Agent task.
        """

        if not job_id:
            job_id = str(uuid.uuid4())

        return self.store.create_task(
            owner_id=self.owner_id,
            job_id=job_id,
            instruction=instruction,
        )

    def get_task_state(self, job_id: str) -> Optional[AgentTaskState]:
        """
        Retrieve task state with owner isolation.
        """

        return self.store.get_task(
            job_id=job_id,
            owner_id=self.owner_id,
        )

    def _build_system_prompt(self) -> str:
        tools = get_all_tool_schemas()

        return f"""
You are the MineIntel Agent orchestration engine.

You do NOT directly manipulate files, databases, reports, or application state.
You may only request execution through registered MineIntel tools.

Available tools:
{json.dumps(tools, indent=2)}

You MUST respond with exactly one JSON object using this structure:

{{
  "status": "IN_PROGRESS",
  "selected_action": {{
    "tool": "tool_name",
    "parameters": {{}}
  }},
  "concise_rationale": "Short explanation of the selected action.",
  "completion_signal": false
}}

Supported selected_action.tool values:

- call_tool
- synthesize_text
- request_clarification
- declare_complete

Rules:

1. Never return raw chain-of-thought.
2. Never use fields named reasoning, thought_process, analysis,
   or chain_of_thought.
3. Use concise_rationale only.
4. Never invent tool capabilities.
5. Never invent source data or numerical values.
6. Conflicting source values must be preserved and flagged.
7. Do not silently resolve conflicting evidence.
8. All application actions must go through registered tools.
"""


    def _save(self, state: AgentTaskState) -> AgentTaskState:
        return self.store.update_task(state)


    def process_task(
        self,
        job_id: str,
        prompt: str,
        images: Optional[List[str]] = None,
    ) -> AgentTaskState:
        """
        Execute the Agent task using a bounded orchestration loop.
        """

        state = self.get_task_state(job_id)

        if not state:
            raise ValueError("Task not found or unauthorized.")

        if state.status in {
            AgentTaskStatus.COMPLETED,
            AgentTaskStatus.FAILED,
        }:
            return state

        state.status = AgentTaskStatus.RUNNING
        self._save(state)

        system_instruction = self._build_system_prompt()

        max_retries = 3
        retry_count = 0
        max_iterations = 10
        iterations = 0

        while (
            state.status == AgentTaskStatus.RUNNING
            and iterations < max_iterations
        ):
            iterations += 1

            history_text = "\n".join(
                json.dumps(event)
                for event in state.execution_history
            )

            full_prompt = (
                f"Objective:\n{prompt}\n\n"
                f"Execution history:\n{history_text}\n\n"
                "Return only the required JSON object."
            )

            try:
                provider = ai_inference_service._get_provider()

                from backend.services.ai_providers.base import AIRequest

                request = AIRequest(
                    prompt=full_prompt,
                    system_instruction=system_instruction,
                    temperature=0.1,
                    job_id=job_id,
                    owner_id=self.owner_id,
                    images=images if images and iterations == 1 else [],
                )

                if images and iterations == 1:
                    response = provider.generate_multimodal(request)
                else:
                    response = provider.generate(request)

                if not response.success:
                    raise RuntimeError(
                        f"AI provider failed: {response.error}"
                    )

                decision = parse_and_validate_model_response(
                    response.text
                )

                action = decision["selected_action"]
                tool = action["tool"]
                parameters = action["parameters"]

                # Persist only safe structured execution data.
                state.execution_history.append(
                    {
                        "type": "agent_decision",
                        "tool": tool,
                        "parameters": parameters,
                        "concise_rationale": decision[
                            "concise_rationale"
                        ],
                        "completion_signal": decision[
                            "completion_signal"
                        ],
                    }
                )

                self._save(state)

                if tool == "call_tool":
                    tool_name = parameters.get("tool_name")
                    tool_parameters = parameters.get("parameters", {})

                    if not isinstance(tool_name, str) or not tool_name:
                        raise AgentValidationError(
                            "call_tool requires parameters.tool_name."
                        )

                    if not isinstance(tool_parameters, dict):
                        raise AgentValidationError(
                            "call_tool parameters.parameters must be an object."
                        )

                    result = execute_tool(
                        tool_name,
                        tool_parameters,
                        self.owner_id,
                        job_id,
                    )

                    state.execution_history.append(
                        {
                            "type": "tool_observation",
                            "tool": tool_name,
                            "result": result,
                        }
                    )

                    self._save(state)

                    retry_count = 0
                    continue

                if tool == "synthesize_text":
                    synthesis = parameters.get("text")

                    if not isinstance(synthesis, str):
                        raise AgentValidationError(
                            "synthesize_text requires parameters.text."
                        )

                    state.structured_state["synthesized_text"] = synthesis
                    state.execution_history.append(
                        {
                            "type": "synthesis",
                            "result": synthesis,
                        }
                    )

                    self._save(state)

                    if decision["completion_signal"]:
                        state.status = AgentTaskStatus.COMPLETED
                        self._save(state)

                    continue

                if tool == "request_clarification":
                    state.status = AgentTaskStatus.AWAITING_INPUT

                    state.structured_state[
                        "clarification_request"
                    ] = parameters.get("question", "")

                    state.execution_history.append(
                        {
                            "type": "clarification_requested",
                            "question": parameters.get("question", ""),
                        }
                    )

                    self._save(state)
                    break

                if tool == "declare_complete":
                    state.status = AgentTaskStatus.COMPLETED

                    state.structured_state["final_result"] = (
                        parameters.get("result", "")
                    )

                    state.execution_history.append(
                        {
                            "type": "completed",
                            "result": parameters.get("result", ""),
                        }
                    )

                    self._save(state)
                    break

                raise AgentValidationError(
                    f"Unsupported validated action: {tool}"
                )

            except Exception as exc:
                logger.warning(
                    "Agent execution error for %s: %s",
                    job_id,
                    exc,
                )

                state.status = AgentTaskStatus.RETRYING

                state.execution_history.append(
                    {
                        "type": "execution_error",
                        "error": str(exc),
                        "retry_count": retry_count + 1,
                    }
                )

                self._save(state)

                retry_count += 1

                if retry_count >= max_retries:
                    state.status = AgentTaskStatus.FAILED

                    state.execution_history.append(
                        {
                            "type": "terminal_error",
                            "error": "Maximum retry count reached.",
                        }
                    )

                    self._save(state)
                    break

                state.status = AgentTaskStatus.RUNNING
                self._save(state)

        if (
            iterations >= max_iterations
            and state.status == AgentTaskStatus.RUNNING
        ):
            state.status = AgentTaskStatus.FAILED

            state.execution_history.append(
                {
                    "type": "terminal_error",
                    "error": "Maximum agent iterations reached.",
                }
            )

            self._save(state)

        return state
