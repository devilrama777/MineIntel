"""
MineIntel Phase 4: Intelligence & Organization Layer Models

Provides typed schemas for:
- Topic-first evidence categorization
- Adaptive chronology (day, week, month, quarter, year, undated)
- Multi-tier duplicate detection without deleting source items
- Discrepancy & conflict intelligence with source-priority ranking
- Audit review flags with exact provenance citations
- Deduplicated downstream evidence dossier
"""
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class TopicCategory(str, Enum):
    PRODUCTION_DISPATCH = "PRODUCTION_DISPATCH"
    SAFETY_ENVIRONMENTAL = "SAFETY_ENVIRONMENTAL"
    GEOLOGICAL_RESERVES = "GEOLOGICAL_RESERVES"
    FINANCIAL_OPERATIONAL = "FINANCIAL_OPERATIONAL"
    EQUIPMENT_INFRASTRUCTURE = "EQUIPMENT_INFRASTRUCTURE"
    STATUTORY_COMPLIANCE = "STATUTORY_COMPLIANCE"
    GENERAL = "GENERAL"


class ChronologyGranularity(str, Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    UNDATED = "undated"


class ConflictType(str, Enum):
    NUMERICAL_VARIANCE = "NUMERICAL_VARIANCE"
    FACTUAL_CONTRADICTION = "FACTUAL_CONTRADICTION"
    STATUTORY_DIVERGENCE = "STATUTORY_DIVERGENCE"
    TEMPORAL_MISMATCH = "TEMPORAL_MISMATCH"


class ConflictSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SourcePriority(int, Enum):
    """Authority weighting for resolving conflicts and duplicate primary selection."""
    AUDITED_CALCULATION = 100    # CSV / XLSX calculated values
    STATUTORY_REGULATORY_PDF = 90 # Official DGMS / MoC signed orders
    OPERATIONAL_LOG_CSV = 80     # Raw CSV daily telemetry
    NARRATIVE_DOCX = 60          # Word memos / reports
    IMAGE_EVIDENCE = 50          # Photographs / visual evidence
    AI_DERIVATION = 20           # AI analysis / captions


@dataclass
class TemporalEntity:
    raw_text: str
    normalized_date: Optional[str] = None  # ISO format YYYY-MM-DD
    granularity: str = ChronologyGranularity.UNDATED.value
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None
    quarter: Optional[str] = None  # e.g. "Q1", "Q2", "Q3", "Q4"
    fiscal_year: Optional[str] = None  # e.g. "FY2023-24"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DuplicateCluster:
    cluster_id: str
    primary_evidence_id: str
    duplicate_evidence_ids: List[str]
    similarity_score: float
    match_type: str  # "exact_hash", "normalized_text", "tabular_row"
    created_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class EvidenceConflict:
    conflict_id: str
    job_id: str
    owner_id: str
    conflict_type: str  # ConflictType enum
    severity: str       # ConflictSeverity enum
    topic: str          # TopicCategory enum
    entity_or_metric: str
    conflicting_evidence_ids: List[str]
    evidence_values: List[Dict[str, Any]]  # [{"evidence_id": ..., "value": ..., "source": ..., "priority": ...}]
    variance_pct: Optional[float] = None
    recommended_evidence_id: Optional[str] = None
    recommended_value: Optional[Any] = None
    resolution_rationale: Optional[str] = None
    status: str = "flagged_for_review"  # "flagged_for_review", "resolved"
    review_flag: Dict[str, Any] = field(default_factory=dict)
    created_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class OrganizedEvidenceDossier:
    job_id: str
    owner_id: str
    total_source_items: int
    deduplicated_items_count: int
    duplicate_clusters: List[Dict[str, Any]]
    topics: Dict[str, List[str]]  # Topic -> List of evidence IDs
    chronological_timeline: List[Dict[str, Any]]  # Sorted buckets with evidence IDs
    conflicts: List[Dict[str, Any]]
    deduplicated_evidence_items: List[Dict[str, Any]]
    created_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
