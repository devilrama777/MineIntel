"""
MineIntel Phase 2: Structured Evidence Layer Models

Provides typed models, classifications, and representations for:
- Raw -> Processed -> Derived evidence pipeline
- Stable, reproducible evidence IDs
- Granular provenance linking back to PDF pages, XLSX/CSV sheets/cells, DOCX paragraphs/tables, and image assets
- Strict evidence classification:
    * LOCKED FACT
    * CALCULATED VALUE
    * SUMMARIZABLE TEXT
    * AI ANALYSIS
    * AI-GENERATED CAPTION
    * AI INTERPRETATION
"""
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class EvidenceLayer(str, Enum):
    RAW = "raw"
    PROCESSED = "processed"
    DERIVED = "derived"


class EvidenceClassification(str, Enum):
    LOCKED_FACT = "LOCKED FACT"
    CALCULATED_VALUE = "CALCULATED VALUE"
    SUMMARIZABLE_TEXT = "SUMMARIZABLE TEXT"
    AI_ANALYSIS = "AI ANALYSIS"
    AI_GENERATED_CAPTION = "AI-GENERATED CAPTION"
    AI_INTERPRETATION = "AI INTERPRETATION"


@dataclass
class StructuredEvidenceItem:
    evidence_id: str  # Stable, deterministic ID: EVD-{hash[:12]}
    job_id: str
    file_id: str
    owner_id: str
    layer: str  # "raw", "processed", "derived"
    classification: str  # "LOCKED FACT", "CALCULATED VALUE", etc.
    content_text: str  # Human-readable textual representation
    content_json: Dict[str, Any] = field(default_factory=dict)  # Typed / structured data
    raw_reference: Dict[str, Any] = field(default_factory=dict)  # file_id, raw_path, sha256_hash
    provenance: Dict[str, Any] = field(default_factory=dict)  # source_type, citation, page, range, etc.
    derived_from_ids: List[str] = field(default_factory=list)  # Parent evidence IDs if derived
    confidence: float = 1.0  # 1.0 for LOCKED FACT / CALCULATED VALUE, <= 0.95 for AI
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
