"""
MineIntel Phase 7: Long-Document Report Generation Models

Defines typed schemas for:
- Report generation lifecycle and status tracking
- Report generation metadata, section counts, page counts, and artifact paths
- Multi-format document references (PDF, DOCX, Markdown)
"""

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ReportGenerationStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class GeneratedReportArtifact:
    report_id: str
    plan_id: str
    job_id: str
    owner_id: str
    title: str
    subtitle: Optional[str] = None
    status: str = ReportGenerationStatus.PENDING.value
    page_count: int = 0
    total_sections: int = 0
    total_evidence_cited: int = 0
    total_charts_embedded: int = 0
    total_tables_embedded: int = 0
    pdf_path: str = ""
    docx_path: Optional[str] = None
    md_path: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: int = 0
    completed_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
