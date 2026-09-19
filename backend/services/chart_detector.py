"""
MineIntel Phase 5: Chart Detection Engine

Scans Phase 2 structured evidence items to detect chartable tabular datasets.
Analyzes columns, datatypes, temporal dimensions, cardinality, and numerical distributions.
Recommends compatible chart types deterministically based on data characteristics.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from backend.services.chart_models import (
    ChartDimensionType,
    ChartType,
    ColumnAnalysis,
    TableCandidate,
)

logger = logging.getLogger("mineintel.chart_detector")

DATE_COL_KEYWORDS = {"date", "time", "month", "year", "quarter", "reporting_date", "day", "period", "timestamp"}
METRIC_COL_KEYWORDS = {
    "production", "dispatch", "tonnage", "output", "overburden", "cost", "revenue",
    "ash", "moisture", "stripping_ratio", "headcount", "manpower", "gcv", "expenditure", "rate"
}


class ChartDetector:
    """Detects tabular evidence structures and analyzes column dimensions."""

    @classmethod
    def _is_numeric_val(cls, val: Any) -> bool:
        if val is None or val == "":
            return False
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            return True
        if isinstance(val, str):
            clean = val.replace(",", "").strip()
            # If formatted like 450.5 or -12.3
            try:
                float(clean)
                return True
            except ValueError:
                return False
        return False

    @classmethod
    def _to_float(cls, val: Any) -> Optional[float]:
        if val is None or val == "":
            return None
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            return float(val)
        if isinstance(val, str):
            clean = val.replace(",", "").strip()
            try:
                return float(clean)
            except ValueError:
                return None
        return None

    @classmethod
    def _is_date_col_name(cls, col_name: str) -> bool:
        col_lower = col_name.lower().replace("_", " ").strip()
        for kw in DATE_COL_KEYWORDS:
            if re.search(rf"\b{kw}\b", col_lower):
                return True
        return False

    @classmethod
    def analyze_columns(cls, rows: List[Dict[str, Any]]) -> List[ColumnAnalysis]:
        """Analyzes columns across tabular rows."""
        if not rows:
            return []

        # Collect all column names
        all_cols = []
        for r in rows:
            for k in r.keys():
                if k not in all_cols and not k.startswith("_"):
                    all_cols.append(k)

        analyses: List[ColumnAnalysis] = []

        for col in all_cols:
            values = [r.get(col) for r in rows if r.get(col) is not None]
            null_count = len(rows) - len(values)
            unique_vals = set(str(v) for v in values)
            unique_count = len(unique_vals)

            # Check if temporal
            is_date_name = cls._is_date_col_name(col)
            numeric_vals = [cls._to_float(v) for v in values if cls._is_numeric_val(v)]

            if is_date_name:
                dim_type = ChartDimensionType.TEMPORAL.value
                analyses.append(ColumnAnalysis(
                    name=col,
                    dimension_type=dim_type,
                    unique_count=unique_count,
                    null_count=null_count,
                    sample_values=list(values[:5]),
                    is_time_series=True
                ))
            elif len(numeric_vals) >= max(1, int(len(values) * 0.7)):
                dim_type = ChartDimensionType.NUMERIC.value
                min_v = min(numeric_vals) if numeric_vals else None
                max_v = max(numeric_vals) if numeric_vals else None
                analyses.append(ColumnAnalysis(
                    name=col,
                    dimension_type=dim_type,
                    unique_count=unique_count,
                    null_count=null_count,
                    sample_values=list(values[:5]),
                    min_value=min_v,
                    max_value=max_v
                ))
            else:
                dim_type = ChartDimensionType.CATEGORICAL.value
                analyses.append(ColumnAnalysis(
                    name=col,
                    dimension_type=dim_type,
                    unique_count=unique_count,
                    null_count=null_count,
                    sample_values=list(values[:5])
                ))

        return analyses

    @classmethod
    def recommend_chart_types_for_table(cls, columns: List[ColumnAnalysis], row_count: int) -> List[str]:
        """Deterministically evaluates compatible chart types based on table dimensions."""
        time_cols = [c for c in columns if c.dimension_type == ChartDimensionType.TEMPORAL.value or c.is_time_series]
        metric_cols = [c for c in columns if c.dimension_type == ChartDimensionType.NUMERIC.value]
        category_cols = [c for c in columns if c.dimension_type == ChartDimensionType.CATEGORICAL.value]

        recommended: List[str] = []

        if not metric_cols:
            return recommended

        # 1. Time Series / Line / Area
        if time_cols and metric_cols:
            recommended.append(ChartType.TIME_SERIES.value)
            recommended.append(ChartType.LINE.value)
            recommended.append(ChartType.AREA.value)

        # 2. Categorical Bar / Grouped Bar / Stacked Bar
        if category_cols and metric_cols:
            primary_cat = category_cols[0]
            # Valid for bar chart if cardinality is reasonable (2 to 30 items)
            if 2 <= primary_cat.unique_count <= 30:
                recommended.append(ChartType.BAR.value)

                # If multiple metrics or a secondary category
                if len(metric_cols) >= 2 or len(category_cols) >= 2:
                    recommended.append(ChartType.GROUPED_BAR.value)
                    recommended.append(ChartType.STACKED_BAR.value)

            # Pie / Donut strictly if low cardinality (2 to 7 items) and all values non-negative
            if 2 <= primary_cat.unique_count <= 7:
                all_non_negative = True
                for m in metric_cols:
                    if m.min_value is not None and m.min_value < 0:
                        all_non_negative = False
                        break
                if all_non_negative:
                    recommended.append(ChartType.PIE.value)
                    recommended.append(ChartType.DONUT.value)

        # 3. Scatter Plot (at least 2 continuous numeric metrics)
        if len(metric_cols) >= 2 and row_count >= 3:
            recommended.append(ChartType.SCATTER.value)

        # 4. Fallback single-dimension bar if rows > 1 and metric exists
        if not recommended and metric_cols and row_count > 1:
            recommended.append(ChartType.BAR.value)

        return list(dict.fromkeys(recommended))

    @classmethod
    def detect_table_candidates(cls, evidence_items: List[Dict[str, Any]]) -> List[TableCandidate]:
        """
        Groups evidence items by source file / table and extracts candidate tables with column analyses.
        """
        file_groups: Dict[str, List[Dict[str, Any]]] = {}

        for it in evidence_items:
            # Look for row-level facts or tabular content_json
            content_json = it.get("content_json") or {}
            source_type = (it.get("provenance") or {}).get("source_type", "")
            file_id = it.get("file_id", "unknown_file")

            if isinstance(content_json, dict) and len(content_json) >= 2 and source_type in ["csv", "xlsx", "table"]:
                file_groups.setdefault(file_id, []).append(it)

        candidates: List[TableCandidate] = []

        for file_id, items in file_groups.items():
            first_item = items[0]
            filename = (first_item.get("provenance") or {}).get("filename", f"dataset_{file_id}.csv")
            rows = [it.get("content_json", {}) for it in items if isinstance(it.get("content_json"), dict)]

            if not rows:
                continue

            columns = cls.analyze_columns(rows)
            time_cols = [c.name for c in columns if c.dimension_type == ChartDimensionType.TEMPORAL.value or c.is_time_series]
            metric_cols = [c.name for c in columns if c.dimension_type == ChartDimensionType.NUMERIC.value]
            category_cols = [c.name for c in columns if c.dimension_type == ChartDimensionType.CATEGORICAL.value]

            recommended_types = cls.recommend_chart_types_for_table(columns, len(rows))

            table_id = f"TBL-{file_id[:8]}"
            candidate = TableCandidate(
                table_id=table_id,
                evidence_id=first_item.get("evidence_id", ""),
                file_id=file_id,
                filename=filename,
                row_count=len(rows),
                columns=columns,
                detected_time_column=time_cols[0] if time_cols else None,
                detected_metric_columns=metric_cols,
                detected_category_columns=category_cols,
                recommended_chart_types=recommended_types
            )
            candidates.append(candidate)

        return candidates


chart_detector = ChartDetector()
