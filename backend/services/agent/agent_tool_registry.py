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


class ToolExecutionError(Exception):
    """Base class for tool execution failures."""
    def __init__(self, message: str, tool_name: str, retryable: bool = False, code: str = "TOOL_EXECUTION_ERROR"):
        super().__init__(message)
        self.message = message
        self.tool_name = tool_name
        self.retryable = retryable
        self.code = code


class RetryableToolError(ToolExecutionError):
    """Tool failure that is transient and can be retried within bounded limits."""
    def __init__(self, message: str, tool_name: str, code: str = "RETRYABLE_TOOL_ERROR"):
        super().__init__(message, tool_name=tool_name, retryable=True, code=code)


class FatalToolError(ToolExecutionError):
    """Tool failure that is fatal and must transition task immediately to FAILED."""
    def __init__(self, message: str, tool_name: str, code: str = "FATAL_TOOL_ERROR"):
        super().__init__(message, tool_name=tool_name, retryable=False, code=code)


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


def execute_tool(name: str, args: Dict[str, Any], owner_id: str, task_id: str) -> Dict[str, Any]:
    """
    Executes a deterministic tool for the given owner and task.
    Propagates typed exceptions (RetryableToolError / FatalToolError) on failure
    so coordinator can manage state transitions and retries rather than swallowing errors.
    """
    tool = get_tool(name)
    if not tool:
        raise FatalToolError(f"Tool '{name}' not found in registry.", tool_name=name, code="TOOL_NOT_FOUND")

    try:
        logger.info(f"Executing tool {name} for owner {owner_id}, task {task_id}")
        result = tool.handler(owner_id=owner_id, task_id=task_id, **args)
        if isinstance(result, dict) and result.get("success") is False:
            err_msg = result.get("error", "Tool execution failed")
            err_lower = err_msg.lower()
            is_transient = "timeout" in err_lower or "busy" in err_lower or "connection" in err_lower
            if is_transient:
                raise RetryableToolError(err_msg, tool_name=name)
            raise FatalToolError(err_msg, tool_name=name)
        return {"status": "success", "result": result}
    except ToolExecutionError:
        raise
    except Exception as e:
        logger.error(f"Error executing tool {name}: {str(e)}")
        err_lower = str(e).lower()
        is_transient = "timeout" in err_lower or "connection" in err_lower or "rate limit" in err_lower
        if is_transient:
            raise RetryableToolError(str(e), tool_name=name)
        raise FatalToolError(str(e), tool_name=name)


# -----------------------------------------------------------------------------
# Tool Handlers Wrapping Existing Services
# -----------------------------------------------------------------------------

def _handle_query_evidence(owner_id: str, task_id: str, search: str = None, layer: str = None, limit: int = 10) -> Any:
    return query_evidence(
        job_id=task_id, 
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

def _handle_get_intelligence(owner_id: str, task_id: str) -> Any:
    dossier = intelligence_service.get_dossier(job_id=task_id, owner_id=owner_id)
    if not dossier:
        dossier = intelligence_service.organize_job_evidence(job_id=task_id, owner_id=owner_id)
    conflicts = intelligence_service.get_conflicts(job_id=task_id, owner_id=owner_id)
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

def _handle_detect_charts(owner_id: str, task_id: str, text: str = "") -> Any:
    if text:
        return chart_service.detect_charts_in_text(text=text, owner_id=owner_id, job_id=task_id, metadata={})
    return chart_service.detect_tables(job_id=task_id, owner_id=owner_id)

register_tool(Tool(
    name="detect_charts",
    description="Analyze text or structured evidence to identify potential charts that could be rendered.",
    input_schema={
        "type": "object",
        "properties": {
            "text": {"type": "string", "description": "Optional text or markdown content to analyze."}
        }
    },
    output_schema={"type": "object"},
    handler=_handle_detect_charts
))

def _handle_render_chart(owner_id: str, task_id: str, chart_type: str, data: Dict[str, Any], title: str = "") -> Any:
    return chart_service.generate_chart(
        chart_type=chart_type, 
        data=data, 
        owner_id=owner_id, 
        job_id=task_id, 
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

def _handle_create_plan(owner_id: str, task_id: str, title: str, custom_instruction: str = "") -> Any:
    return planner_service.generate_plan(
        job_id=task_id,
        owner_id=owner_id,
        title=title,
        use_ai=False,
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

def _handle_validate_plan(owner_id: str, task_id: str, plan_id: str) -> Any:
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

def _handle_generate_report(owner_id: str, task_id: str, plan_id: str, title_override: str = None, formats: List[str] = None) -> Any:
    # Phase 1 Approved Rule: Markdown-only during active AI workflow. PDF/DOCX generated only on explicit export.
    selected_formats = formats if formats else ["markdown"]
    result = report_generator_service.generate_report(
        job_id=task_id,
        owner_id=owner_id,
        plan_id=plan_id,
        formats=selected_formats,
        title_override=title_override,
        skip_ai_synthesis=True
    )
    if not result.get("success"):
        return result

    return {
        "success": True,
        "report_id": result.get("report_id"),
        "status": result.get("status"),
        "artifacts": {
            "pdf": result.get("pdf_path"),
            "docx": result.get("docx_path"),
            "md": result.get("md_path")
        },
        "page_count": result.get("page_count")
    }

register_tool(Tool(
    name="generate_report",
    description="Compile the final report using the validated plan.",
    input_schema={
        "type": "object",
        "properties": {
            "plan_id": {"type": "string"},
            "title_override": {"type": "string"},
            "formats": {"type": "array", "items": {"type": "string"}}
        },
        "required": ["plan_id"]
    },
    output_schema={"type": "object"},
    handler=_handle_generate_report
))

def _handle_verify_math(owner_id: str, task_id: str, expression: str) -> Any:
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
