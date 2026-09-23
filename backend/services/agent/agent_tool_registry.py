import json
import logging
from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.services.evidence_store import query_evidence
from backend.services.intelligence_service import intelligence_service
from backend.services.chart_service import chart_service
from backend.services.planner_service import planner_service
from backend.services.report_generator_service import report_generator_service
from backend.services.math_engine import safe_eval_expr

logger = logging.getLogger("mineintel.agent_tool_registry")


class Tool(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    handler: Callable


_REGISTRY: Dict[str, Tool] = {}


def register_tool(tool: Tool):
    _REGISTRY[tool.name] = tool


def get_tool(name: str) -> Optional[Tool]:
    return _REGISTRY.get(name)


def get_all_tool_schemas() -> List[Dict[str, Any]]:
    return [
        {
            "name": t.name,
            "description": t.description,
            "input_schema": t.input_schema,
            "output_schema": t.output_schema
        }
        for t in _REGISTRY.values()
    ]


def execute_tool(
    name: str,
    args: Dict[str, Any],
    owner_id: str,
    job_id: str,
) -> Dict[str, Any]:
    """
    Execute a registered MineIntel tool.

    Tool failures are raised so the AgentCoordinator can perform
    bounded retry handling. A failed tool must never be reported
    as a successful execution.
    """

    tool = get_tool(name)

    if not tool:
        raise ValueError(
            f"Tool '{name}' not found in registry."
        )

    if not owner_id:
        raise ValueError(
            "owner_id is required for tool execution."
        )

    if not job_id:
        raise ValueError(
            "job_id is required for tool execution."
        )

    if not isinstance(args, dict):
        raise ValueError(
            "Tool arguments must be a JSON object."
        )

    try:
        logger.info(
            "Executing tool %s for owner %s, job %s",
            name,
            owner_id,
            job_id,
        )

        result = tool.handler(
            owner_id=owner_id,
            job_id=job_id,
            **args,
        )

        return {
            "status": "success",
            "result": result,
        }

    except Exception as exc:
        logger.error(
            "Tool %s failed for job %s: %s",
            name,
            job_id,
            exc,
            exc_info=True,
        )

        # IMPORTANT:
        # Do not convert failures into successful-looking results.
        # The coordinator must receive the exception so it can
        # transition to RETRYING and eventually FAILED.
        raise RuntimeError(
            f"Tool '{name}' execution failed: {exc}"
        ) from exc

# -----------------------------------------------------------------------------
# Tool Handlers Wrapping Existing Services
# -----------------------------------------------------------------------------

def _handle_query_evidence(owner_id: str, job_id: str, search: str = None, layer: str = None, limit: int = 10) -> Any:
    return query_evidence(
        job_id=job_id, 
        owner_id=owner_id, 
        search=search, 
        layer=layer, 
        limit=limit
    )

register_tool(Tool(
    name="query_evidence",
    description="Query structured evidence extracted from the user's files.",
    input_schema={
        "type": "object",
        "properties": {
            "search": {"type": "string", "description": "Text search query"},
            "layer": {"type": "string", "description": "Layer to query, e.g., 'primary', 'secondary'"},
            "limit": {"type": "integer", "description": "Max results to return"}
        }
    },
    output_schema={"type": "object"},
    handler=_handle_query_evidence
))

def _handle_get_intelligence(owner_id: str, job_id: str) -> Any:
    dossier = intelligence_service.get_dossier(job_id=job_id, owner_id=owner_id)
    conflicts = intelligence_service.get_conflicts(job_id=job_id, owner_id=owner_id)
    return {
        "dossier": dossier,
        "conflicts": conflicts
    }

register_tool(Tool(
    name="get_intelligence",
    description="Retrieve the intelligence dossier and evidence conflicts for the current job.",
    input_schema={"type": "object", "properties": {}},
    output_schema={"type": "object"},
    handler=_handle_get_intelligence
))

def _handle_detect_charts(owner_id: str, job_id: str, text: str) -> Any:
    return chart_service.detect_charts_in_text(text=text, owner_id=owner_id, job_id=job_id, metadata={})

register_tool(Tool(
    name="detect_charts",
    description="Analyze text to identify potential charts that could be rendered.",
    input_schema={
        "type": "object",
        "properties": {
            "text": {"type": "string", "description": "The text or markdown content to analyze."}
        },
        "required": ["text"]
    },
    output_schema={"type": "object"},
    handler=_handle_detect_charts
))

def _handle_render_chart(owner_id: str, job_id: str, chart_type: str, data: Dict[str, Any], title: str = "") -> Any:
    return chart_service.generate_chart(
        chart_type=chart_type, 
        data=data, 
        owner_id=owner_id, 
        job_id=job_id, 
        title=title, 
        metadata={}
    )

register_tool(Tool(
    name="render_chart",
    description="Render a specific chart using the provided JSON data.",
    input_schema={
        "type": "object",
        "properties": {
            "chart_type": {"type": "string", "description": "e.g., 'bar', 'line', 'pie'"},
            "data": {"type": "object", "description": "Chart data matching MineIntel schema"},
            "title": {"type": "string", "description": "Title of the chart"}
        },
        "required": ["chart_type", "data"]
    },
    output_schema={"type": "object"},
    handler=_handle_render_chart
))

def _handle_create_plan(owner_id: str, job_id: str, title: str, custom_instruction: str = "") -> Any:
    return planner_service.generate_plan(
        job_id=job_id,
        owner_id=owner_id,
        title=title,
        use_ai=True,
        custom_instruction=custom_instruction
    )

register_tool(Tool(
    name="create_plan",
    description="Generate a new report structure/plan.",
    input_schema={
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "custom_instruction": {"type": "string"}
        },
        "required": ["title"]
    },
    output_schema={"type": "object"},
    handler=_handle_create_plan
))

def _handle_validate_plan(owner_id: str, job_id: str, plan_id: str) -> Any:
    return planner_service.validate_plan(plan_id=plan_id, owner_id=owner_id)

register_tool(Tool(
    name="validate_plan",
    description="Validate an existing plan for structural integrity and missing evidence.",
    input_schema={
        "type": "object",
        "properties": {
            "plan_id": {"type": "string"}
        },
        "required": ["plan_id"]
    },
    output_schema={"type": "object"},
    handler=_handle_validate_plan
))

def _handle_generate_report(owner_id: str, job_id: str, plan_id: str, title_override: str = None) -> Any:
    return report_generator_service.generate_report(
        job_id=job_id,
        owner_id=owner_id,
        plan_id=plan_id,
        formats=["markdown"],
        title_override=title_override
    )

register_tool(Tool(
    name="generate_report",
    description="Compile the final report using the validated plan.",
    input_schema={
        "type": "object",
        "properties": {
            "plan_id": {"type": "string"},
            "title_override": {"type": "string"}
        },
        "required": ["plan_id"]
    },
    output_schema={"type": "object"},
    handler=_handle_generate_report
))

def _handle_verify_math(owner_id: str, job_id: str, expression: str) -> Any:
    try:
        val = safe_eval_expr(expression)
        return {"result": val, "expression": expression}
    except Exception as e:
        return {"error": str(e), "expression": expression}

register_tool(Tool(
    name="verify_math",
    description="Safely evaluate a mathematical expression to verify numerical claims.",
    input_schema={
        "type": "object",
        "properties": {
            "expression": {"type": "string", "description": "Math expression (e.g., '150.5 + 42.1')"}
        },
        "required": ["expression"]
    },
    output_schema={"type": "object"},
    handler=_handle_verify_math
))
