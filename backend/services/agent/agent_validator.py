import logging
from typing import Dict, Any, Tuple
from backend.services.agent.agent_tool_registry import get_tool

logger = logging.getLogger("mineintel.agent_validator")

def validate_agent_action(decision: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validates the strict structured output from the Qwen model.
    Enforces the following keys exactly:
    - status (string: RUNNING, COMPLETED, or FAILED)
    - selected_action (dict or null)
    - concise_rationale (string)
    - completion_signal (string or null)
    Returns (is_valid, error_message).
    """
    if not isinstance(decision, dict):
        return False, "decision must be a JSON object"

    # Enforce exact keys
    expected_keys = {"status", "selected_action", "concise_rationale", "completion_signal"}
    missing_keys = expected_keys - decision.keys()
    if missing_keys:
        return False, f"Missing required keys in decision: {missing_keys}"

    status = decision.get("status")
    if status not in ("RUNNING", "COMPLETED", "FAILED"):
        return False, f"Invalid status: {status}. Must be RUNNING, COMPLETED, or FAILED."

    if not isinstance(decision.get("concise_rationale", ""), str):
        return False, "concise_rationale must be a string."

    selected_action = decision.get("selected_action")
    
    if status == "RUNNING":
        if not isinstance(selected_action, dict):
            return False, "selected_action must be a JSON object when status is RUNNING."
            
        tool_name = selected_action.get("tool")
        args = selected_action.get("parameters")

        if not tool_name:
            return False, "Missing tool in selected_action"
        
        if not isinstance(args, dict):
            return False, "parameters must be a JSON object"

        tool = get_tool(tool_name)
        if not tool:
            return False, f"Tool '{tool_name}' is not registered."

        required_args = tool.input_schema.get("required", [])
        for req in required_args:
            if req not in args:
                return False, f"Missing required argument '{req}' for tool '{tool_name}'"
    elif status in ("COMPLETED", "FAILED"):
        # When done, selected_action can be null or empty, completion_signal must be present
        # but type check it if it is present
        if decision.get("completion_signal") is None and status == "COMPLETED":
             return False, "completion_signal must be provided when status is COMPLETED."

    return True, ""
