import json
from typing import Any, Dict


SUPPORTED_ACTIONS = {
    "call_tool",
    "synthesize_text",
    "request_clarification",
    "declare_complete",
}


class AgentValidationError(ValueError):
    """Raised when an Agent/Qwen response violates the structured contract."""


def parse_and_validate_model_response(raw_text: str) -> Dict[str, Any]:
    """
    Parse and validate the strict Qwen Agent response contract.

    Raw model reasoning is never accepted as a required field.
    """

    if not isinstance(raw_text, str) or not raw_text.strip():
        raise AgentValidationError("Model response is empty.")

    text = raw_text.strip()

    # Accept fenced JSON but validate the resulting JSON object.
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise AgentValidationError(
            f"Model response is not valid JSON: {exc}"
        ) from exc

    if not isinstance(payload, dict):
        raise AgentValidationError(
            "Model response must be a JSON object."
        )

    status = payload.get("status")
    if status != "IN_PROGRESS":
        raise AgentValidationError(
            "Model response status must be 'IN_PROGRESS'."
        )

    selected_action = payload.get("selected_action")

    if not isinstance(selected_action, dict):
        raise AgentValidationError(
            "'selected_action' must be an object."
        )

    tool = selected_action.get("tool")
    parameters = selected_action.get("parameters", {})

    if not isinstance(tool, str) or not tool.strip():
        raise AgentValidationError(
            "'selected_action.tool' must be a non-empty string."
        )

    if not isinstance(parameters, dict):
        raise AgentValidationError(
            "'selected_action.parameters' must be an object."
        )

    if tool not in SUPPORTED_ACTIONS:
        raise AgentValidationError(
            f"Unsupported agent action: {tool}"
        )

    concise_rationale = payload.get("concise_rationale", "")

    if not isinstance(concise_rationale, str):
        raise AgentValidationError(
            "'concise_rationale' must be a string."
        )

    completion_signal = payload.get("completion_signal")

    if not isinstance(completion_signal, bool):
        raise AgentValidationError(
            "'completion_signal' must be a boolean."
        )

    # Explicitly reject legacy/raw reasoning fields.
    forbidden_fields = {
        "reasoning",
        "thought_process",
        "chain_of_thought",
        "analysis",
    }

    forbidden_present = forbidden_fields.intersection(payload.keys())

    if forbidden_present:
        raise AgentValidationError(
            "Model response contains forbidden reasoning fields: "
            + ", ".join(sorted(forbidden_present))
        )

    return {
        "status": status,
        "selected_action": {
            "tool": tool,
            "parameters": parameters,
        },
        "concise_rationale": concise_rationale,
        "completion_signal": completion_signal,
    }
