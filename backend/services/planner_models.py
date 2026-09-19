"""
MineIntel Phase 6: Report Planner Models

Defines typed schemas for:
- Dynamic section and subsection planning
- Topic-first and chronological section organization
- Evidence allocation and classification tracking
- Chart and table attachments with source provenance
- Evidence sufficiency validation and missing evidence flags
- Machine-readable reproducible report plans with versioning
"""

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class SectionType(str, Enum):
    EXECUTIVE_SUMMARY = "executive_summary"
    TOPIC_ANALYSIS = "topic_analysis"
    CHRONOLOGY_BREAKDOWN = "chronology_breakdown"
    TABULAR_AUDIT = "tabular_audit"
    CHART_VISUALIZATION = "chart_visualization"
    STATUTORY_COMPLIANCE = "statutory_compliance"


class PlanStatus(str, Enum):
    DRAFT = "draft"
    VALIDATED = "validated"
    READY_FOR_GENERATION = "ready_for_generation"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


@dataclass
class MissingEvidenceFlag:
    flag_id: str
    section_id: str
    topic: str
    required_evidence_type: str
    severity: str = "warning"  # "critical", "warning", "info"
    rationale: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PlannedSection:
    section_id: str
    title: str
    topic: str
    section_type: str
    order_index: int
    dependencies: List[str] = field(default_factory=list)
    subsections: List["PlannedSection"] = field(default_factory=list)
    evidence_ids: List[str] = field(default_factory=list)
    evidence_breakdown: Dict[str, int] = field(default_factory=dict)
    chart_ids: List[str] = field(default_factory=list)
    table_ids: List[str] = field(default_factory=list)
    provenance_citations: List[Dict[str, Any]] = field(default_factory=list)
    chronology_period: Optional[str] = None
    validation_status: str = "supported"  # "supported", "insufficient", "flagged"
    validation_notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "section_id": self.section_id,
            "title": self.title,
            "topic": self.topic,
            "section_type": self.section_type,
            "order_index": self.order_index,
            "dependencies": self.dependencies,
            "subsections": [s.to_dict() if isinstance(s, PlannedSection) else s for s in self.subsections],
            "evidence_ids": self.evidence_ids,
            "evidence_breakdown": self.evidence_breakdown,
            "chart_ids": self.chart_ids,
            "table_ids": self.table_ids,
            "provenance_citations": self.provenance_citations,
            "chronology_period": self.chronology_period,
            "validation_status": self.validation_status,
            "validation_notes": self.validation_notes
        }


@dataclass
class ReportPlan:
    plan_id: str
    job_id: str
    owner_id: str
    version: int
    status: str
    title: str
    subtitle: Optional[str] = None
    sections: List[PlannedSection] = field(default_factory=list)
    total_evidence_referenced: int = 0
    total_charts_referenced: int = 0
    evidence_sufficiency_score: float = 1.0
    insufficient_evidence_flags: List[MissingEvidenceFlag] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: int = 0
    updated_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plan_id": self.plan_id,
            "job_id": self.job_id,
            "owner_id": self.owner_id,
            "version": self.version,
            "status": self.status,
            "title": self.title,
            "subtitle": self.subtitle,
            "sections": [s.to_dict() if isinstance(s, PlannedSection) else s for s in self.sections],
            "total_evidence_referenced": self.total_evidence_referenced,
            "total_charts_referenced": self.total_charts_referenced,
            "evidence_sufficiency_score": self.evidence_sufficiency_score,
            "insufficient_evidence_flags": [
                f.to_dict() if isinstance(f, MissingEvidenceFlag) else f
                for f in self.insufficient_evidence_flags
            ],
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
