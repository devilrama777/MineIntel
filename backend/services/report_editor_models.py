"""
MineIntel Phase 8: Report Editor & Versioning Models

Defines typed schemas for:
- Editable report sections with diff tracking and immutable provenance links
- Report revision states: ORIGINAL (immutable baseline), DRAFT_EDIT, APPROVED, FINALIZED
- Version history audit trails linking edited versions back to Phase 6 plans and Phase 2 evidence
"""

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ReportState(str, Enum):
    ORIGINAL = "original"       # Version 1 baseline snapshot from AI/Planner
    DRAFT_EDIT = "draft_edit"   # Revision with user edits in progress
    APPROVED = "approved"       # Formally approved by authorized auditor
    FINALIZED = "finalized"     # Locked production version


@dataclass
class SectionContent:
    section_id: str
    title: str
    topic: str
    section_type: str = "topic_analysis"
    order_index: int = 1
    content_text: str = ""
    original_content_text: str = ""
    evidence_ids: List[str] = field(default_factory=list)
    chart_ids: List[str] = field(default_factory=list)
    table_ids: List[str] = field(default_factory=list)
    provenance_citations: List[Dict[str, Any]] = field(default_factory=list)
    user_modified: bool = False
    modified_at: Optional[int] = None
    subsections: List["SectionContent"] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "section_id": self.section_id,
            "title": self.title,
            "topic": self.topic,
            "section_type": self.section_type,
            "order_index": self.order_index,
            "content_text": self.content_text,
            "original_content_text": self.original_content_text,
            "evidence_ids": self.evidence_ids,
            "chart_ids": self.chart_ids,
            "table_ids": self.table_ids,
            "provenance_citations": self.provenance_citations,
            "user_modified": self.user_modified,
            "modified_at": self.modified_at,
            "subsections": [
                s.to_dict() if isinstance(s, SectionContent) else s
                for s in self.subsections
            ]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SectionContent":
        subs = [
            SectionContent.from_dict(s) if isinstance(s, dict) else s
            for s in data.get("subsections", [])
        ]
        return cls(
            section_id=data.get("section_id", ""),
            title=data.get("title", ""),
            topic=data.get("topic", ""),
            section_type=data.get("section_type", "topic_analysis"),
            order_index=int(data.get("order_index", 1)),
            content_text=data.get("content_text", ""),
            original_content_text=data.get("original_content_text", ""),
            evidence_ids=data.get("evidence_ids", []),
            chart_ids=data.get("chart_ids", []),
            table_ids=data.get("table_ids", []),
            provenance_citations=data.get("provenance_citations", []),
            user_modified=bool(data.get("user_modified", False)),
            modified_at=data.get("modified_at"),
            subsections=subs
        )


@dataclass
class ReportRevision:
    revision_id: str
    report_id: str
    job_id: str
    plan_id: str
    owner_id: str
    version: int
    state: str
    title: str
    subtitle: Optional[str] = None
    sections: List[SectionContent] = field(default_factory=list)
    change_summary: str = ""
    modified_sections: List[str] = field(default_factory=list)
    approved_by: Optional[str] = None
    approved_at: Optional[int] = None
    finalized_by: Optional[str] = None
    finalized_at: Optional[int] = None
    parent_version: Optional[int] = None
    pdf_path: Optional[str] = None
    docx_path: Optional[str] = None
    md_path: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: int = 0
    updated_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "revision_id": self.revision_id,
            "report_id": self.report_id,
            "job_id": self.job_id,
            "plan_id": self.plan_id,
            "owner_id": self.owner_id,
            "version": self.version,
            "state": self.state,
            "title": self.title,
            "subtitle": self.subtitle,
            "sections": [
                s.to_dict() if isinstance(s, SectionContent) else s
                for s in self.sections
            ],
            "change_summary": self.change_summary,
            "modified_sections": self.modified_sections,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "finalized_by": self.finalized_by,
            "finalized_at": self.finalized_at,
            "parent_version": self.parent_version,
            "pdf_path": self.pdf_path,
            "docx_path": self.docx_path,
            "md_path": self.md_path,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ReportRevision":
        secs = [
            SectionContent.from_dict(s) if isinstance(s, dict) else s
            for s in data.get("sections", [])
        ]
        return cls(
            revision_id=data.get("revision_id", ""),
            report_id=data.get("report_id", ""),
            job_id=data.get("job_id", ""),
            plan_id=data.get("plan_id", ""),
            owner_id=data.get("owner_id", ""),
            version=int(data.get("version", 1)),
            state=data.get("state", ReportState.ORIGINAL.value),
            title=data.get("title", ""),
            subtitle=data.get("subtitle"),
            sections=secs,
            change_summary=data.get("change_summary", ""),
            modified_sections=data.get("modified_sections", []),
            approved_by=data.get("approved_by"),
            approved_at=data.get("approved_at"),
            finalized_by=data.get("finalized_by"),
            finalized_at=data.get("finalized_at"),
            parent_version=data.get("parent_version"),
            pdf_path=data.get("pdf_path"),
            docx_path=data.get("docx_path"),
            md_path=data.get("md_path"),
            metadata=data.get("metadata", {}),
            created_at=int(data.get("created_at", 0)),
            updated_at=int(data.get("updated_at", 0))
        )
