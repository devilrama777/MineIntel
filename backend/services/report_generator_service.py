"""
MineIntel Phase 7: Long-Document Report Generation Service Orchestrator

Consumes the persisted Phase 6 Report Plan and executes full multi-format document generation:
- Pulls verified structured evidence (Phase 2), intelligence dossiers (Phase 4), and charts (Phase 5)
- Renders scalable Flowable-based PDFs with NumberedReportCanvas (accurate two-pass page numbers)
- Compiles corresponding DOCX and Markdown exports
- Stores report metadata, artifact paths, and status in Neon / Local store
- Enforces strict sovereign user ownership and isolation
"""

import logging
import time
from typing import Any, Dict, List, Optional

from backend.services import chart_store, evidence_store
from backend.services.long_document_builder import long_document_builder
from backend.services.planner_models import ReportPlan
from backend.services.planner_service import planner_service
from backend.services.report_generator_models import (
    GeneratedReportArtifact,
    ReportGenerationStatus,
)
from backend.services.report_generator_store import (
    get_report as store_get_report,
    list_reports_for_job as store_list_reports,
    save_report as store_save_report,
)

logger = logging.getLogger("mineintel.report_generator_service")


class ReportGeneratorService:
    """Orchestrates document generation from Phase 6 Report Plans."""

    def generate_report(
        self,
        job_id: str,
        owner_id: str,
        plan_id: Optional[str] = None,
        formats: Optional[List[str]] = None,
        title_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end report generation based on an active or specified Report Plan.
        """
        if not formats:
            formats = ["pdf"]
        normalized_formats = [f.lower().strip() for f in formats]

        # 1. Fetch Plan
        plan_data: Optional[Dict[str, Any]] = None
        if plan_id:
            plan_data = planner_service.get_plan(plan_id, owner_id=owner_id)
        else:
            plan_data = planner_service.get_active_plan(job_id, owner_id=owner_id)

        if not plan_data:
            return {
                "success": False,
                "error": f"No valid Report Plan found for job '{job_id}'. Please create a plan first using Phase 6 planner."
            }

        plan = ReportPlan.from_dict(plan_data) if isinstance(plan_data, dict) else plan_data
        if title_override:
            plan.title = title_override

        # 2. Fetch Evidence items
        query_res = evidence_store.query_evidence(job_id=job_id, owner_id=owner_id, limit=5000)
        evidence_items = query_res.get("items", []) if isinstance(query_res, dict) else query_res

        # 3. Fetch Charts
        charts = chart_store.list_charts_for_job(job_id=job_id, owner_id=owner_id)

        now_ms = int(time.time() * 1000)
        report_id = f"rep_{job_id[:8]}_{now_ms}"

        # Initialize tracking artifact
        artifact = GeneratedReportArtifact(
            report_id=report_id,
            plan_id=plan.plan_id,
            job_id=job_id,
            owner_id=owner_id,
            title=plan.title,
            subtitle=plan.subtitle,
            status=ReportGenerationStatus.GENERATING.value,
            total_sections=len(plan.sections),
            total_evidence_cited=plan.total_evidence_referenced,
            total_charts_embedded=plan.total_charts_referenced,
            created_at=now_ms,
            metadata={
                "formats_requested": normalized_formats,
                "plan_version": plan.version,
                "sufficiency_score": plan.evidence_sufficiency_score
            }
        )
        store_save_report(artifact.to_dict())

        try:
            # 4. Generate Primary PDF
            pdf_path, page_count = long_document_builder.build_pdf(
                plan=plan,
                evidence_items=evidence_items,
                charts=charts,
                output_filename=f"Report_{job_id[:8]}_{report_id[-6:]}.pdf"
            )
            artifact.pdf_path = pdf_path
            artifact.page_count = page_count

            # 5. Generate Word DOCX if requested
            if "docx" in normalized_formats or "word" in normalized_formats:
                docx_path = long_document_builder.build_docx(
                    plan=plan,
                    evidence_items=evidence_items,
                    charts=charts,
                    output_filename=f"Report_{job_id[:8]}_{report_id[-6:]}.docx"
                )
                artifact.docx_path = docx_path

            # 6. Generate Markdown if requested
            if "md" in normalized_formats or "markdown" in normalized_formats:
                md_path = long_document_builder.build_markdown(
                    plan=plan,
                    evidence_items=evidence_items,
                    charts=charts,
                    output_filename=f"Report_{job_id[:8]}_{report_id[-6:]}.md"
                )
                artifact.md_path = md_path

            artifact.status = ReportGenerationStatus.COMPLETED.value
            artifact.completed_at = int(time.time() * 1000)
            store_save_report(artifact.to_dict())

            try:
                from backend.services.report_editor_service import report_editor_service
                report_editor_service.initialize_report_revision(
                    report_dict=artifact.to_dict(),
                    plan_dict=plan.to_dict(),
                    evidence_items=evidence_items,
                    charts=charts
                )
            except Exception as rev_err:
                logger.warning(f"Could not auto-initialize v1 revision for {report_id}: {rev_err}")

            logger.info(f"Report generation complete: {report_id} ({page_count} pages)")
            return {
                "success": True,
                "report_id": report_id,
                "status": artifact.status,
                "page_count": artifact.page_count,
                "pdf_path": artifact.pdf_path,
                "docx_path": artifact.docx_path,
                "md_path": artifact.md_path,
                "report": artifact.to_dict()
            }

        except Exception as e:
            logger.error(f"Report generation failed for {report_id}: {e}", exc_info=True)
            artifact.status = ReportGenerationStatus.FAILED.value
            artifact.error = str(e)
            artifact.completed_at = int(time.time() * 1000)
            store_save_report(artifact.to_dict())
            return {
                "success": False,
                "report_id": report_id,
                "status": artifact.status,
                "error": str(e)
            }

    def get_report(self, report_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves generated report metadata enforcing user ownership."""
        return store_get_report(report_id=report_id, owner_id=owner_id)

    def list_reports(self, job_id: str, owner_id: str) -> List[Dict[str, Any]]:
        """Lists generated reports for a job enforcing user ownership."""
        return store_list_reports(job_id=job_id, owner_id=owner_id)


report_generator_service = ReportGeneratorService()
