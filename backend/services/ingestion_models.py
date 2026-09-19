"""
MineIntel Phase 1: Evidence Ingestion Foundation Models

Provides typed models and serialization for:
- Ingestion Jobs (multi-file batch manifests)
- Evidence Files (immutable raw files, SHA-256 hashes, duplicate tracking)
- Provenance References (PDF pages, DOCX paragraphs/tables, XLSX sheets/ranges, image dimensions)
"""
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ProvenanceRecord:
    source_type: str  # "pdf", "scanned_pdf", "docx", "xlsx", "csv", "image"
    provenance: str  # e.g. "Page 1", "Para 4", "Table 2", "Sheet1!A1:D10", "Rows 1-50", "image.png (1920x1080)"
    page: Optional[int] = None
    paragraph_index: Optional[int] = None
    table_index: Optional[int] = None
    sheet: Optional[str] = None
    range: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    dimensions: Optional[List[int]] = None
    snippet: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class EvidenceFileRecord:
    file_id: str
    job_id: str
    owner_id: str
    filename: str
    file_type: str
    file_size: int
    sha256_hash: str
    is_duplicate: bool = False
    duplicate_of_file_id: Optional[str] = None
    status: str = "pending"  # "pending", "processing", "completed", "failed"
    error_message: Optional[str] = None
    raw_path: str = ""
    normalized_path: Optional[str] = None
    provenance: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class IngestionJobRecord:
    job_id: str
    owner_id: str
    status: str = "pending"  # "pending", "processing", "completed", "failed"
    total_files: int = 0
    completed_files: int = 0
    failed_files: int = 0
    created_at: int = 0
    updated_at: int = 0
    manifest_path: str = ""
    files: List[EvidenceFileRecord] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["files"] = [f.to_dict() if hasattr(f, "to_dict") else f for f in self.files]
        return d
