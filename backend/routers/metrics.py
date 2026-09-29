"""
MineIntel Baseline Metrics Router (/api/metrics)
Endpoints for recording human baselines, computing comparative improvements,
and querying AI performance benchmarks.
"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend.routers.auth import require_auth
from backend.services.metrics_tracker import metrics_tracker

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


class BaselineRecordRequest(BaseModel):
    report_type: str
    manual_minutes: Optional[float] = None
    manual_error_count: Optional[int] = None


@router.post("/baseline/record")
def record_baseline(
    req: BaselineRecordRequest,
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Records a human manual baseline (time in minutes, error count) for a report type."""
    try:
        record = metrics_tracker.record_manual_baseline(
            report_type=req.report_type,
            minutes=req.manual_minutes,
            error_count=req.manual_error_count
        )
        return {
            "success": True,
            "record": record
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record manual baseline: {e}")


@router.get("/baseline")
def list_baselines(
    report_type: Optional[str] = Query(None, description="Optional report type filter"),
    limit: int = Query(100, ge=1, le=500, description="Maximum records to return"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Retrieves baseline and AI telemetry records."""
    try:
        records = metrics_tracker.list_baselines(limit=limit, report_type=report_type)
        return {
            "success": True,
            "records": records,
            "count": len(records)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list baseline records: {e}")


@router.get("/improvement")
def get_improvement(
    report_type: Optional[str] = Query(None, description="Optional report type to compute for"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    """
    Computes quantified improvements:
    - time_reduction_pct: Percentage reduction in hours/minutes
    - accuracy_pct: Average extraction accuracy score
    - automation_pct: Structural automation completeness
    """
    try:
        data = metrics_tracker.compute_improvement(report_type=report_type)
        if report_type:
            return {
                "success": True,
                "improvements": [data],
                **data
            }
        return {
            "success": True,
            **data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute improvement metrics: {e}")


@router.get("/health")
def get_metrics_health(
    auth: Dict[str, Any] = Depends(require_auth)
):
    """Returns the operational status and record counts of the metrics store."""
    try:
        health = metrics_tracker.health_check()
        return {
            "success": True,
            **health
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query metrics health: {e}")
