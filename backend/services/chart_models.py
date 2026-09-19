"""
MineIntel Phase 5: Chart Intelligence & Visualization Models

Defines typed schemas for:
- Supported chart types and dimensions
- Tabular evidence column and relationship analysis
- Deterministic calculation records and mathematical provenance
- Chart configuration and artifact metadata
"""

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ChartType(str, Enum):
    LINE = "line"
    BAR = "bar"
    GROUPED_BAR = "grouped_bar"
    STACKED_BAR = "stacked_bar"
    PIE = "pie"
    DONUT = "donut"
    AREA = "area"
    SCATTER = "scatter"
    TIME_SERIES = "time_series"


class ChartDimensionType(str, Enum):
    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    TEMPORAL = "temporal"


@dataclass
class ColumnAnalysis:
    name: str
    dimension_type: str  # ChartDimensionType
    unique_count: int
    null_count: int
    sample_values: List[Any] = field(default_factory=list)
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    is_time_series: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TableCandidate:
    table_id: str
    evidence_id: str
    file_id: str
    filename: str
    row_count: int
    columns: List[ColumnAnalysis]
    detected_time_column: Optional[str] = None
    detected_metric_columns: List[str] = field(default_factory=list)
    detected_category_columns: List[str] = field(default_factory=list)
    recommended_chart_types: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "table_id": self.table_id,
            "evidence_id": self.evidence_id,
            "file_id": self.file_id,
            "filename": self.filename,
            "row_count": self.row_count,
            "columns": [c.to_dict() for c in self.columns],
            "detected_time_column": self.detected_time_column,
            "detected_metric_columns": self.detected_metric_columns,
            "detected_category_columns": self.detected_category_columns,
            "recommended_chart_types": self.recommended_chart_types
        }


@dataclass
class ChartCalculationRecord:
    calculation_type: str  # "direct", "sum_by_category", "mean_by_category", "time_aggregate"
    source_evidence_ids: List[str]
    source_files: List[str]
    source_cell_ranges: List[str]
    aggregation_formula: str
    computed_data: Dict[str, Any]  # {"labels": [...], "series": [{"name": ..., "data": [...]}]}
    provenance_chain: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ChartConfig:
    chart_id: str
    job_id: str
    owner_id: str
    chart_type: str  # ChartType
    title: str
    subtitle: Optional[str] = None
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None
    unit: Optional[str] = None
    theme: str = "mineintel_dark"  # "mineintel_dark" or "mineintel_light"
    is_valid: bool = True
    validation_notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ChartArtifact:
    chart_id: str
    job_id: str
    owner_id: str
    config: ChartConfig
    calculation: ChartCalculationRecord
    png_path: str
    svg_path: Optional[str] = None
    ai_recommendation: Optional[Dict[str, Any]] = None
    created_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chart_id": self.chart_id,
            "job_id": self.job_id,
            "owner_id": self.owner_id,
            "config": self.config.to_dict() if isinstance(self.config, ChartConfig) else self.config,
            "calculation": self.calculation.to_dict() if isinstance(self.calculation, ChartCalculationRecord) else self.calculation,
            "png_path": self.png_path,
            "svg_path": self.svg_path,
            "ai_recommendation": self.ai_recommendation,
            "created_at": self.created_at
        }
