"""
MineIntel Phase 8: Report Editor & Versioning Service Orchestrator

Coordinates editing, revision management, and approval workflows:
- Preserves the original AI-generated report as an immutable Version 1 baseline
- Creates revision versions for every meaningful user edit (v2, v3, etc.)
- Tracks state transitions: ORIGINAL -> DRAFT_EDIT -> APPROVED -> FINALIZED
- Maintains end-to-end evidence/provenance references through all revisions
- Computes audit diffs tracking which sections were modified by users
- Supports restoring previous versions and official auditor approval
- Recompiles multi-format exports consistent with approved state
- Enforces strict Phase 0 user ownership and isolation
"""

import copy
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from backend.services import (
    chart_store,
    evidence_store,
    planner_store,
    report_generator_store,
)
from backend.services.long_document_builder import long_document_builder
from backend.services.planner_models import ReportPlan
from backend.services.planner_service import planner_service
from backend.services.report_editor_models import (
    ReportRevision,
    ReportState,
    SectionContent,
)
from backend.services.report_editor_store import (
    get_approved_revision as store_get_approved,
    get_latest_revision as store_get_latest,
    get_revision as store_get_revision,
    list_revisions as store_list_revisions,
    save_revision as store_save_revision,
)

logger = logging.getLogger("mineintel.report_editor_service")


class ReportEditorService:
    """Orchestrates report revisions, editing, and approval."""

    def initialize_report_revision(
        self,
        report_dict: Dict[str, Any],
        plan_dict: Optional[Dict[str, Any]] = None,
        evidence_items: Optional[List[Dict[str, Any]]] = None,
        charts: Optional[List[Dict[str, Any]]] = None
    ) -> ReportRevision:
        """
        Initializes Version 1 (ORIGINAL) immutable snapshot for a generated report.
        """
        report_id = report_dict["report_id"]
        owner_id = report_dict["owner_id"]

        # If v1 already exists, return it
        existing_v1 = store_get_revision(report_id, version=1, owner_id=owner_id)
        if existing_v1:
            return ReportRevision.from_dict(existing_v1)

        # Load plan if not provided
        if not plan_dict:
            plan_dict = planner_service.get_plan(report_dict["plan_id"], owner_id=owner_id)
        if not plan_dict:
            raise ValueError(f"Cannot initialize revision: plan '{report_dict.get('plan_id')}' not found.")

        # Load evidence items if not provided
        if evidence_items is None:
            query_res = evidence_store.query_evidence(job_id=report_dict["job_id"], owner_id=owner_id, limit=5000)
            evidence_items = query_res.get("items", []) if isinstance(query_res, dict) else query_res

        evidence_by_id = {it.get("evidence_id"): it for it in evidence_items if it.get("evidence_id")}

        # Build SectionContent list from plan sections
        plan_sections = plan_dict.get("sections", [])
        sections_content: List[SectionContent] = []

        for p_sec in plan_sections:
            eids = p_sec.get("evidence_ids", [])
            snippets = [
                evidence_by_id[eid].get("content_text", "")
                for eid in eids if eid in evidence_by_id and evidence_by_id[eid].get("content_text")
            ]
            narrative = "\n\n".join(snippets) or f"Detailed audit analysis for {p_sec.get('title')}."

            # Subsections
            sub_list: List[SectionContent] = []
            for p_sub in p_sec.get("subsections", []):
                sub_eids = p_sub.get("evidence_ids", [])
                sub_snippets = [
                    evidence_by_id[eid].get("content_text", "")
                    for eid in sub_eids if eid in evidence_by_id and evidence_by_id[eid].get("content_text")
                ]
                sub_narrative = "\n\n".join(sub_snippets) or f"Chronological records for {p_sub.get('title')}."
                sub_list.append(SectionContent(
                    section_id=p_sub.get("section_id", ""),
                    title=p_sub.get("title", ""),
                    topic=p_sub.get("topic", ""),
                    section_type=p_sub.get("section_type", "topic_analysis"),
                    order_index=int(p_sub.get("order_index", 1)),
                    content_text=sub_narrative,
                    original_content_text=sub_narrative,
                    evidence_ids=sub_eids,
                    chart_ids=p_sub.get("chart_ids", []),
                    table_ids=p_sub.get("table_ids", []),
                    provenance_citations=p_sub.get("provenance_citations", []),
                    user_modified=False
                ))

            sections_content.append(SectionContent(
                section_id=p_sec.get("section_id", ""),
                title=p_sec.get("title", ""),
                topic=p_sec.get("topic", ""),
                section_type=p_sec.get("section_type", "topic_analysis"),
                order_index=int(p_sec.get("order_index", 1)),
                content_text=narrative,
                original_content_text=narrative,
                evidence_ids=eids,
                chart_ids=p_sec.get("chart_ids", []),
                table_ids=p_sec.get("table_ids", []),
                provenance_citations=p_sec.get("provenance_citations", []),
                user_modified=False,
                subsections=sub_list
            ))

        now_ms = int(time.time() * 1000)
        v1 = ReportRevision(
            revision_id=f"rev_{report_id}_v1",
            report_id=report_id,
            job_id=report_dict["job_id"],
            plan_id=report_dict["plan_id"],
            owner_id=owner_id,
            version=1,
            state=ReportState.ORIGINAL.value,
            title=report_dict.get("title", plan_dict.get("title", "Report")),
            subtitle=report_dict.get("subtitle", plan_dict.get("subtitle")),
            sections=sections_content,
            change_summary="Original AI-generated baseline dossier",
            modified_sections=[],
            pdf_path=report_dict.get("pdf_path"),
            docx_path=report_dict.get("docx_path"),
            md_path=report_dict.get("md_path"),
            created_at=report_dict.get("created_at") or now_ms,
            updated_at=report_dict.get("completed_at") or now_ms
        )

        store_save_revision(v1.to_dict())
        logger.info(f"Initialized Version 1 baseline revision for report {report_id}")
        return v1

    def _ensure_baseline_exists(self, report_id: str, owner_id: str) -> Optional[ReportRevision]:
        """Ensures at least Version 1 exists for the given report."""
        latest_dict = store_get_latest(report_id, owner_id=owner_id)
        if latest_dict:
            return ReportRevision.from_dict(latest_dict)

        # Fallback to report_generator_store
        rep_dict = report_generator_store.get_report(report_id, owner_id=owner_id)
        if not rep_dict:
            return None

        return self.initialize_report_revision(rep_dict)

    def get_revision(self, report_id: str, version: int, owner_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves specific report revision enforcing user ownership."""
        self._ensure_baseline_exists(report_id, owner_id)
        return store_get_revision(report_id=report_id, version=version, owner_id=owner_id)

    def get_latest_revision(self, report_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves newest revision for a report."""
        self._ensure_baseline_exists(report_id, owner_id)
        return store_get_latest(report_id=report_id, owner_id=owner_id)

    def get_approved_revision(self, report_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves approved/finalized revision if one exists."""
        self._ensure_baseline_exists(report_id, owner_id)
        return store_get_approved(report_id=report_id, owner_id=owner_id)

    def list_revisions(self, report_id: str, owner_id: str) -> List[Dict[str, Any]]:
        """Lists all revisions for a report in ascending version order."""
        self._ensure_baseline_exists(report_id, owner_id)
        return store_list_revisions(report_id=report_id, owner_id=owner_id)

    def edit_section(
        self,
        report_id: str,
        owner_id: str,
        section_id: str,
        new_title: Optional[str] = None,
        new_content: Optional[str] = None,
        change_summary: str = ""
    ) -> Dict[str, Any]:
        """
        Applies a user edit to a specific section or subsection:
        - Creates a new revision version (preserving prior versions immutably)
        - Flags section with user_modified=True and records diff
        - Preserves evidence/provenance links
        - Recompiles PDF, DOCX, and Markdown artifacts
        """
        latest_rev = self._ensure_baseline_exists(report_id, owner_id)
        if not latest_rev:
            return {"success": False, "error": f"Report '{report_id}' not found or access forbidden."}

        if latest_rev.state == ReportState.FINALIZED.value:
            return {"success": False, "error": f"Cannot edit report '{report_id}': version {latest_rev.version} is FINALIZED and locked."}

        # Deep-copy sections
        new_sections: List[SectionContent] = [
            SectionContent.from_dict(s.to_dict()) for s in latest_rev.sections
        ]

        found = False
        now_ms = int(time.time() * 1000)

        # Search top-level sections
        for sec in new_sections:
            if sec.section_id == section_id:
                if new_title is not None:
                    sec.title = new_title
                if new_content is not None:
                    sec.content_text = new_content
                sec.user_modified = True
                sec.modified_at = now_ms
                found = True
                break

            # Search subsections
            for sub in sec.subsections:
                if sub.section_id == section_id:
                    if new_title is not None:
                        sub.title = new_title
                    if new_content is not None:
                        sub.content_text = new_content
                    sub.user_modified = True
                    sub.modified_at = now_ms
                    found = True
                    break
            if found:
                break

        if not found:
            return {"success": False, "error": f"Section '{section_id}' not found in report '{report_id}'."}

        new_ver = latest_rev.version + 1
        mod_set = set(latest_rev.modified_sections)
        mod_set.add(section_id)

        new_rev = ReportRevision(
            revision_id=f"rev_{report_id}_v{new_ver}_{now_ms}",
            report_id=report_id,
            job_id=latest_rev.job_id,
            plan_id=latest_rev.plan_id,
            owner_id=owner_id,
            version=new_ver,
            state=ReportState.DRAFT_EDIT.value,
            title=latest_rev.title,
            subtitle=latest_rev.subtitle,
            sections=new_sections,
            change_summary=change_summary or f"Auditor revised section {section_id}",
            modified_sections=sorted(list(mod_set)),
            parent_version=latest_rev.version,
            created_at=now_ms,
            updated_at=now_ms
        )

        # Recompile artifact exports
        self._recompile_revision_artifacts(new_rev, owner_id)
        store_save_revision(new_rev.to_dict())

        logger.info(f"Created revision v{new_ver} for report {report_id} (edited section {section_id})")
        return {
            "success": True,
            "revision_id": new_rev.revision_id,
            "version": new_rev.version,
            "state": new_rev.state,
            "modified_sections": new_rev.modified_sections,
            "revision": new_rev.to_dict()
        }

    def edit_report(
        self,
        report_id: str,
        owner_id: str,
        title: Optional[str] = None,
        subtitle: Optional[str] = None,
        section_updates: Optional[List[Dict[str, Any]]] = None,
        change_summary: str = ""
    ) -> Dict[str, Any]:
        """
        Batch edits report metadata and multiple sections:
        - Increments version number
        - Preserves immutable prior revisions
        - Recompiles document artifacts
        """
        latest_rev = self._ensure_baseline_exists(report_id, owner_id)
        if not latest_rev:
            return {"success": False, "error": f"Report '{report_id}' not found or access forbidden."}

        if latest_rev.state == ReportState.FINALIZED.value:
            return {"success": False, "error": f"Cannot edit report '{report_id}': version {latest_rev.version} is FINALIZED and locked."}

        new_sections: List[SectionContent] = [
            SectionContent.from_dict(s.to_dict()) for s in latest_rev.sections
        ]

        now_ms = int(time.time() * 1000)
        mod_set = set(latest_rev.modified_sections)

        if section_updates:
            for upd in section_updates:
                sec_id = upd.get("section_id")
                if not sec_id:
                    continue
                found = False
                for sec in new_sections:
                    if sec.section_id == sec_id:
                        if "title" in upd:
                            sec.title = upd["title"]
                        if "content_text" in upd:
                            sec.content_text = upd["content_text"]
                        sec.user_modified = True
                        sec.modified_at = now_ms
                        mod_set.add(sec_id)
                        found = True
                        break
                    for sub in sec.subsections:
                        if sub.section_id == sec_id:
                            if "title" in upd:
                                sub.title = upd["title"]
                            if "content_text" in upd:
                                sub.content_text = upd["content_text"]
                            sub.user_modified = True
                            sub.modified_at = now_ms
                            mod_set.add(sec_id)
                            found = True
                            break
                    if found:
                        break

        new_ver = latest_rev.version + 1
        new_rev = ReportRevision(
            revision_id=f"rev_{report_id}_v{new_ver}_{now_ms}",
            report_id=report_id,
            job_id=latest_rev.job_id,
            plan_id=latest_rev.plan_id,
            owner_id=owner_id,
            version=new_ver,
            state=ReportState.DRAFT_EDIT.value,
            title=title or latest_rev.title,
            subtitle=subtitle if subtitle is not None else latest_rev.subtitle,
            sections=new_sections,
            change_summary=change_summary or "Batch user revisions applied",
            modified_sections=sorted(list(mod_set)),
            parent_version=latest_rev.version,
            created_at=now_ms,
            updated_at=now_ms
        )

        self._recompile_revision_artifacts(new_rev, owner_id)
        store_save_revision(new_rev.to_dict())

        return {
            "success": True,
            "revision_id": new_rev.revision_id,
            "version": new_rev.version,
            "state": new_rev.state,
            "modified_sections": new_rev.modified_sections,
            "revision": new_rev.to_dict()
        }

    def restore_revision(
        self,
        report_id: str,
        target_version: int,
        owner_id: str
    ) -> Dict[str, Any]:
        """
        Restores content from a historical revision as a new version.
        Guarantees that history is never rewritten or deleted.
        """
        latest_rev = self._ensure_baseline_exists(report_id, owner_id)
        if not latest_rev:
            return {"success": False, "error": f"Report '{report_id}' not found or access forbidden."}

        target_dict = store_get_revision(report_id=report_id, version=target_version, owner_id=owner_id)
        if not target_dict:
            return {"success": False, "error": f"Target revision v{target_version} not found for report '{report_id}'."}

        target_rev = ReportRevision.from_dict(target_dict)
        now_ms = int(time.time() * 1000)
        new_ver = latest_rev.version + 1

        restored_sections = [
            SectionContent.from_dict(s.to_dict()) for s in target_rev.sections
        ]

        new_rev = ReportRevision(
            revision_id=f"rev_{report_id}_v{new_ver}_{now_ms}",
            report_id=report_id,
            job_id=latest_rev.job_id,
            plan_id=latest_rev.plan_id,
            owner_id=owner_id,
            version=new_ver,
            state=ReportState.DRAFT_EDIT.value,
            title=target_rev.title,
            subtitle=target_rev.subtitle,
            sections=restored_sections,
            change_summary=f"Restored content from revision version {target_version}",
            modified_sections=target_rev.modified_sections,
            parent_version=target_version,
            created_at=now_ms,
            updated_at=now_ms
        )

        self._recompile_revision_artifacts(new_rev, owner_id)
        store_save_revision(new_rev.to_dict())

        logger.info(f"Restored report {report_id} to v{new_ver} from v{target_version}")
        return {
            "success": True,
            "revision_id": new_rev.revision_id,
            "version": new_rev.version,
            "restored_from_version": target_version,
            "revision": new_rev.to_dict()
        }

    def approve_report(
        self,
        report_id: str,
        owner_id: str,
        version: Optional[int] = None,
        approving_officer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Formally marks a revision version as APPROVED by an authorized officer:
        - Locks in approval metadata and timestamp
        - Recompiles official export with approval header
        """
        self._ensure_baseline_exists(report_id, owner_id)
        target_dict = (
            store_get_revision(report_id, version, owner_id=owner_id)
            if version
            else store_get_latest(report_id, owner_id=owner_id)
        )
        if not target_dict:
            return {"success": False, "error": f"Revision not found for report '{report_id}'."}

        target_rev = ReportRevision.from_dict(target_dict)
        now_ms = int(time.time() * 1000)

        target_rev.state = ReportState.APPROVED.value
        target_rev.approved_by = approving_officer or owner_id
        target_rev.approved_at = now_ms
        target_rev.updated_at = now_ms

        self._recompile_revision_artifacts(target_rev, owner_id)
        store_save_revision(target_rev.to_dict())

        # Sync with parent report artifact
        rep_dict = report_generator_store.get_report(report_id, owner_id=owner_id)
        if rep_dict:
            rep_dict.setdefault("metadata", {})
            rep_dict["metadata"]["approved_version"] = target_rev.version
            rep_dict["pdf_path"] = target_rev.pdf_path
            rep_dict["docx_path"] = target_rev.docx_path
            rep_dict["md_path"] = target_rev.md_path
            report_generator_store.save_report(rep_dict)

        logger.info(f"Approved report {report_id} version {target_rev.version} by {target_rev.approved_by}")
        return {
            "success": True,
            "report_id": report_id,
            "version": target_rev.version,
            "state": target_rev.state,
            "approved_by": target_rev.approved_by,
            "approved_at": target_rev.approved_at,
            "revision": target_rev.to_dict()
        }

    def finalize_report(
        self,
        report_id: str,
        owner_id: str,
        version: Optional[int] = None,
        finalizing_officer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Marks a revision as FINALIZED, locking it against any further in-place modifications.
        """
        self._ensure_baseline_exists(report_id, owner_id)
        target_dict = (
            store_get_revision(report_id, version, owner_id=owner_id)
            if version
            else store_get_latest(report_id, owner_id=owner_id)
        )
        if not target_dict:
            return {"success": False, "error": f"Revision not found for report '{report_id}'."}

        target_rev = ReportRevision.from_dict(target_dict)
        now_ms = int(time.time() * 1000)

        target_rev.state = ReportState.FINALIZED.value
        target_rev.finalized_by = finalizing_officer or owner_id
        target_rev.finalized_at = now_ms
        target_rev.updated_at = now_ms

        self._recompile_revision_artifacts(target_rev, owner_id)
        store_save_revision(target_rev.to_dict())

        return {
            "success": True,
            "report_id": report_id,
            "version": target_rev.version,
            "state": target_rev.state,
            "finalized_by": target_rev.finalized_by,
            "finalized_at": target_rev.finalized_at,
            "revision": target_rev.to_dict()
        }

    def get_active_export_path(
        self,
        report_id: str,
        format_type: str,
        owner_id: str
    ) -> Optional[str]:
        """
        Retrieves the artifact path consistent with the APPROVED version (or latest if none approved).
        """
        self._ensure_baseline_exists(report_id, owner_id)
        approved_dict = store_get_approved(report_id, owner_id=owner_id)
        active_dict = approved_dict or store_get_latest(report_id, owner_id=owner_id)

        fmt = format_type.lower().strip()
        if not active_dict:
            rep = report_generator_store.get_report(report_id, owner_id=owner_id)
            if not rep:
                return None
            if fmt == "pdf":
                return rep.get("pdf_path")
            elif fmt in ("docx", "word"):
                return rep.get("docx_path")
            elif fmt in ("md", "markdown"):
                return rep.get("md_path")
            return None

        rev = ReportRevision.from_dict(active_dict)
        if fmt == "pdf":
            return rev.pdf_path
        elif fmt in ("docx", "word"):
            return rev.docx_path
        elif fmt in ("md", "markdown"):
            return rev.md_path
        return None

    def _recompile_revision_artifacts(self, revision: ReportRevision, owner_id: str) -> None:
        """Internal helper that renders PDF, DOCX, and Markdown for a revision."""
        # 1. Fetch structured evidence items
        query_res = evidence_store.query_evidence(job_id=revision.job_id, owner_id=owner_id, limit=5000)
        evidence_items = query_res.get("items", []) if isinstance(query_res, dict) else query_res

        # 2. Fetch charts
        charts = chart_store.list_charts_for_job(job_id=revision.job_id, owner_id=owner_id)

        # 3. Compile PDF
        pdf_path, _ = long_document_builder.build_pdf_from_revision(
            revision=revision,
            evidence_items=evidence_items,
            charts=charts
        )
        revision.pdf_path = pdf_path

        # 4. Compile DOCX
        docx_path = long_document_builder.build_docx_from_revision(
            revision=revision,
            evidence_items=evidence_items,
            charts=charts
        )
        revision.docx_path = docx_path

        # 5. Compile Markdown
        md_path = long_document_builder.build_markdown_from_revision(
            revision=revision,
            evidence_items=evidence_items,
            charts=charts
        )
        revision.md_path = md_path


report_editor_service = ReportEditorService()
