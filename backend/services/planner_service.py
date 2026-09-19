"""
MineIntel Phase 6: Report Planner Service Orchestrator

Coordinates the dynamic planning lifecycle:
- Retrieves Phase 2 evidence, Phase 4 dossiers, and Phase 5 charts
- Generates data-driven section/subsection structures with topic & chronology alignment
- Optionally refines titles with Phase 3 Qwen3-8B advisor
- Evaluates evidence sufficiency and manages plan versions
- Persists machine-readable plans in Neon/local store with user ownership isolation
"""

import logging
from typing import Any, Dict, List, Optional

from backend.services import chart_store, evidence_store, planner_store
from backend.services.chart_service import chart_service
from backend.services.intelligence_service import intelligence_service
from backend.services.planner_advisor import planner_advisor
from backend.services.planner_models import PlanStatus, ReportPlan
from backend.services.report_planner import report_planner

logger = logging.getLogger("mineintel.planner_service")


class PlannerService:
    """Orchestrates report planning workflows."""

    def generate_plan(
        self,
        job_id: str,
        owner_id: str,
        title: Optional[str] = None,
        use_ai: bool = False,
        custom_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Builds a reproducible, machine-readable Report Plan for a job.
        Consumes Phase 2 evidence, Phase 4 dossier, and Phase 5 charts.
        """
        # 1. Fetch structured evidence
        query_res = evidence_store.query_evidence(job_id=job_id, owner_id=owner_id, limit=1000)
        evidence_items = query_res.get("items", []) if isinstance(query_res, dict) else query_res

        if not evidence_items:
            return {
                "success": False,
                "error": f"No structured evidence found for job '{job_id}' to generate a report plan."
            }

        # 2. Fetch Phase 4 intelligence dossier (or generate on demand if not yet organized)
        dossier = intelligence_service.get_dossier(job_id=job_id, owner_id=owner_id)
        if not dossier:
            dossier = intelligence_service.organize_job_evidence(job_id=job_id, owner_id=owner_id)

        # 3. Fetch Phase 5 charts & candidate tables
        charts = chart_store.list_charts_for_job(job_id=job_id, owner_id=owner_id)
        tables = chart_service.detect_tables(job_id=job_id, owner_id=owner_id)

        # 4. Calculate next version number
        next_ver = planner_store.get_next_version_number(job_id=job_id, owner_id=owner_id)

        # 5. Execute Report Planning
        plan = report_planner.plan(
            job_id=job_id,
            owner_id=owner_id,
            evidence_items=evidence_items,
            dossier=dossier,
            charts=charts,
            tables=tables,
            title_override=title,
            version=next_ver
        )

        # 6. Optional AI refinement of titles
        if use_ai:
            plan = planner_advisor.refine_plan_with_ai(plan, custom_instruction=custom_instruction)

        # 7. Persist to Neon / Local store
        plan_dict = plan.to_dict()
        planner_store.save_plan(plan_dict)

        logger.info(f"Generated report plan {plan.plan_id} (v{next_ver}) for job {job_id}")
        return {
            "success": True,
            "plan_id": plan.plan_id,
            "version": plan.version,
            "status": plan.status,
            "plan": plan_dict
        }

    def get_plan(self, plan_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves specific report plan enforcing user ownership."""
        return planner_store.get_plan(plan_id, owner_id=owner_id)

    def get_active_plan(self, job_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves newest plan version for a job."""
        return planner_store.get_latest_plan_for_job(job_id, owner_id=owner_id)

    def list_plan_versions(self, job_id: str, owner_id: str) -> List[Dict[str, Any]]:
        """Lists all historical plan versions for a job."""
        return planner_store.list_plan_versions(job_id, owner_id=owner_id)

    def validate_plan(self, plan_id: str, owner_id: str) -> Dict[str, Any]:
        """Validates evidence sufficiency and completeness of an existing plan."""
        plan_dict = self.get_plan(plan_id, owner_id=owner_id)
        if not plan_dict:
            return {"success": False, "error": f"Plan '{plan_id}' not found or access forbidden."}

        sections = plan_dict.get("sections", [])
        total_sec = len(sections)
        supported = sum(1 for s in sections if s.get("validation_status") == "supported")
        score = round(supported / max(1, total_sec), 2)
        missing_flags = plan_dict.get("insufficient_evidence_flags", [])

        status = PlanStatus.READY_FOR_GENERATION.value if score >= 0.75 and not any(f.get("severity") == "critical" for f in missing_flags) else PlanStatus.INSUFFICIENT_EVIDENCE.value
        plan_dict["status"] = status
        plan_dict["evidence_sufficiency_score"] = score
        planner_store.save_plan(plan_dict)

        return {
            "success": True,
            "plan_id": plan_id,
            "status": status,
            "sufficiency_score": score,
            "total_sections": total_sec,
            "supported_sections": supported,
            "missing_evidence_flags": missing_flags
        }


planner_service = PlannerService()
