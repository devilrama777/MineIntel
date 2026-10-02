"""
MineIntel Autonomous Agent Router (/api/agent)
Orchestrates autonomous multi-stage document intelligence agent tasks,
including background task scheduling, status reporting, and startup watchdog checks.
"""
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.services.agent import agent_store
from backend.services.agent.agent_store import list_tasks, get_active_task_for_job
from backend.services.agent.agent_coordinator import AgentCoordinator
from backend.services.agent.agent_models import AgentTaskStatus, WorkflowStage
from backend.routers.auth import require_auth

router = APIRouter(prefix="/api/agent", tags=["agent"])


class AgentTaskRequest(BaseModel):
    task_id: str
    instruction: Optional[str] = None


class RejectTaskRequest(BaseModel):
    reason: str = Field(..., min_length=10, description="Detailed explanation of reason for rejection (minimum 10 characters).")


class ResubmitTaskRequest(BaseModel):
    feedback_acknowledged: Optional[str] = None


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


@router.get("/tasks/pending-review")
def get_pending_review_tasks(
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Lists all tasks awaiting review that were not created by this senior officer."""
    if auth.get("role") != "Senior Officer":
        raise HTTPException(
            status_code=403,
            detail="Access denied: Senior Officer role required to view pending reviews."
        )
    reviewer_id = auth["officer_id"]
    tasks = agent_store.list_pending_reviews(reviewer_id=reviewer_id)
    return {
        "success": True,
        "tasks": tasks,
        "count": len(tasks)
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


@router.post("/tasks/{task_id}/approve")
def approve_agent_task(
    task_id: str,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Approves an agent task in PENDING_REVIEW state (Senior Officer only, creator cannot approve)."""
    if auth.get("role") != "Senior Officer":
        raise HTTPException(
            status_code=403,
            detail="Access denied: Senior Officer role required to approve tasks."
        )
    reviewer_id = auth["officer_id"]
    coordinator = AgentCoordinator(owner_id=reviewer_id)
    try:
        updated_state = coordinator.approve_task(task_id=task_id, reviewer_id=reviewer_id)
        return {
            "success": True,
            "task_id": updated_state.task_id,
            "status": updated_state.status.value,
            "reviewed_by": updated_state.reviewed_by,
            "reviewed_at": updated_state.reviewed_at
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve task: {e}")


@router.post("/tasks/{task_id}/reject")
def reject_agent_task(
    task_id: str,
    req: RejectTaskRequest,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Rejects an agent task in PENDING_REVIEW state with a reason (Senior Officer only)."""
    if auth.get("role") != "Senior Officer":
        raise HTTPException(
            status_code=403,
            detail="Access denied: Senior Officer role required to reject tasks."
        )
    reviewer_id = auth["officer_id"]
    coordinator = AgentCoordinator(owner_id=reviewer_id)
    try:
        updated_state = coordinator.reject_task(
            task_id=task_id,
            reviewer_id=reviewer_id,
            reason=req.reason
        )
        return {
            "success": True,
            "task_id": updated_state.task_id,
            "status": updated_state.status.value,
            "rejection_reason": updated_state.rejection_reason
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject task: {e}")


@router.post("/tasks/{task_id}/resubmit")
def resubmit_agent_task(
    task_id: str,
    background_tasks: BackgroundTasks,
    req: Optional[ResubmitTaskRequest] = None,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Resubmits a rejected task for re-synthesis at the WRITING stage."""
    officer_id = auth["officer_id"]
    task_data = agent_store.get_task_any_owner(task_id)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found.")

    creator = task_data.get("created_by") or task_data.get("owner_id")
    if auth.get("role") != "Senior Officer" and creator != officer_id:
        raise HTTPException(status_code=403, detail="Only the task creator or a Senior Officer may resubmit.")

    coordinator = AgentCoordinator(owner_id=task_data["owner_id"])
    try:
        feedback = req.feedback_acknowledged if req else None
        resubmitted_state = coordinator.resubmit_rejected_task(task_id=task_id, reviewer_feedback=feedback)
        background_tasks.add_task(
            coordinator.process_task,
            resubmitted_state.task_id,
            "Re-synthesizing report based on feedback."
        )
        return {
            "success": True,
            "task_id": resubmitted_state.task_id,
            "status": resubmitted_state.status.value,
            "message": "Task resubmitted for re-synthesis"
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resubmit task: {e}")


from backend.services.agent.agent_store import get_task_any_owner, update_task_state
from backend.services.agent.agent_models import AgentTaskState, AgentTaskStatus

@router.post("/tasks/{task_id}/submit-for-review")
def submit_task_for_review(
    task_id: str,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Worker explicitly submits a completed task for master review.
    Only the task creator can submit their own task."""
    raw = get_task_any_owner(task_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Task not found.")
    state = AgentTaskState(**raw)
    if state.owner_id != auth["officer_id"]:
        raise HTTPException(status_code=403, detail="Not your task.")
    if state.status != AgentTaskStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Only COMPLETED tasks can be submitted. Current: {state.status.value}"
        )
    import time as _t
    now = int(_t.time() * 1000)
    state.status = AgentTaskStatus.PENDING_REVIEW
    state.submitted_for_review_at = now
    state.updated_at = now
    state.execution_history.append({
        "role": "system", "event": "SUBMITTED_FOR_REVIEW",
        "by": auth["officer_id"], "timestamp": now
    })
    update_task_state(state.model_dump())
    return {"success": True, "task_id": task_id, "status": "PENDING_REVIEW"}

