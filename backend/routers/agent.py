"""
MineIntel Autonomous Agent Router (/api/agent)
Orchestrates autonomous multi-stage document intelligence agent tasks,
including background task scheduling, status reporting, and startup watchdog checks.
"""
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from backend.services.agent.agent_store import list_tasks, get_active_task_for_job
from backend.services.agent.agent_coordinator import AgentCoordinator
from backend.services.agent.agent_models import AgentTaskStatus, WorkflowStage
from backend.routers.auth import require_auth

router = APIRouter(prefix="/api/agent", tags=["agent"])


class AgentTaskRequest(BaseModel):
    task_id: str
    instruction: Optional[str] = None


@router.post("/tasks", status_code=201)
def create_agent_task(
    req: AgentTaskRequest,
    background_tasks: BackgroundTasks,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Creates a new autonomous Agent Task and runs it in the background."""
    owner_id = auth["officer_id"]
    # Check for existing active task for this job to prevent duplicate execution
    active_task = get_active_task_for_job(owner_id=owner_id, job_id=req.task_id)
    if active_task:
        return {
            "success": True,
            "task_id": active_task["task_id"],
            "status": active_task["status"],
            "message": "Existing active agent task returned."
        }

    # Owner ID is injected directly from the authenticated session.
    coordinator = AgentCoordinator(owner_id=owner_id)
    state = coordinator.initialize_task(task_id=req.task_id)

    background_tasks.add_task(
        coordinator.process_task,
        state.task_id,
        req.instruction or "Synthesize a comprehensive report based on the provided evidence."
    )

    return {
        "success": True,
        "task_id": state.task_id,
        "status": state.status.value,
        "message": "Agent task started successfully."
    }


@router.get("/tasks")
def get_agent_tasks(
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Lists all Agent Tasks for the authenticated owner."""
    owner_id = auth["officer_id"]
    tasks = list_tasks(owner_id)
    return {
        "success": True,
        "tasks": tasks
    }


@router.get("/tasks/{task_id}")
def get_agent_task_status(
    task_id: str,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Retrieves full details of an Agent Task with startup watchdog check."""
    coordinator = AgentCoordinator(owner_id=auth["officer_id"])
    state = coordinator.get_task_state(task_id)
    if not state:
        raise HTTPException(status_code=404, detail="Agent task not found.")

    # Startup watchdog: check if stuck in PENDING beyond 30 seconds
    now = int(time.time() * 1000)
    if state.status == AgentTaskStatus.PENDING and (now - state.created_at) > 30000:
        state = coordinator._fail_task(
            state,
            code="STARTUP_TIMEOUT",
            message=f"Agent task remained in PENDING state longer than the 30-second startup deadline (elapsed {int((now - state.created_at)/1000)}s). Background worker may have terminated or hung.",
            stage=WorkflowStage.LOAD_MANIFEST,
            retryable=False
        )

    structured = state.structured_state or {}
    sections_completed = int(structured.get("sections_completed", 0))
    total_sections = int(structured.get("total_sections") or structured.get("sections_total", 0))
    active_sections = list(structured.get("active_sections", []))
    completed_sections = list(structured.get("completed_sections", []))

    return {
        "success": True,
        "task_id": task_id,
        "status": state.status.value,
        "sections_completed": sections_completed,
        "total_sections": total_sections,
        "active_sections": active_sections,
        "completed_sections": completed_sections,
        "task": state.model_dump()
    }
