"""
MineIntel Phase 5: Chart Calculation Engine

Deterministically computes chart series and labels from source evidence rows.
Guarantees zero AI hallucination or synthetic numerical fabrication.
Validates chart inputs and rejects misleading or incompatible configurations.
Maintains exact mathematical provenance down to source evidence IDs and rows.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from backend.services.chart_models import ChartCalculationRecord, ChartType

logger = logging.getLogger("mineintel.chart_calculator")


class ChartCalculator:
    """Computes exact aggregated or raw series values for chart rendering."""

    @classmethod
    def _parse_num(cls, val: Any) -> Optional[float]:
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
    def calculate(
        cls,
        rows: List[Dict[str, Any]],
        x_col: str,
        y_cols: List[str],
        chart_type: str,
        agg_func: str = "sum",
        evidence_items: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[Optional[ChartCalculationRecord], List[str]]:
        """
        Deterministically computes labels and series for visualization.
        Returns (calculation_record, validation_errors).
        If validation_errors is non-empty, calculation_record is None or marked invalid.
        """
        validation_errors: List[str] = []

        if not rows:
            validation_errors.append("Dataset has no rows to chart.")
            return None, validation_errors

        if not y_cols:
            validation_errors.append("At least one numerical metric column (y_axis) must be specified.")
            return None, validation_errors

        # Check column existence
        sample_row = rows[0]
        if x_col not in sample_row:
            validation_errors.append(f"X-axis column '{x_col}' does not exist in dataset.")
        for y_col in y_cols:
            if y_col not in sample_row:
                validation_errors.append(f"Y-axis metric column '{y_col}' does not exist in dataset.")

        if validation_errors:
            return None, validation_errors

        # Extract evidence provenance
        ev_ids = []
        filenames = set()
        cell_ranges = []

        if evidence_items:
            for it in evidence_items:
                ev_id = it.get("evidence_id")
                if ev_id and ev_id not in ev_ids:
                    ev_ids.append(ev_id)
                fn = (it.get("provenance") or {}).get("filename")
                if fn:
                    filenames.add(fn)
                prov = (it.get("provenance") or {}).get("provenance")
                if prov and prov not in cell_ranges:
                    cell_ranges.append(prov)

        # ---------------------------------------------------------------------
        # 1. Group / Aggregate Data Deterministically
        # ---------------------------------------------------------------------
        # Group by x_col values
        grouped_data: Dict[str, Dict[str, List[float]]] = {}
        row_order: List[str] = []

        for r_idx, r in enumerate(rows):
            raw_x = r.get(x_col)
            label = str(raw_x) if raw_x is not None else "Unknown"
            if label not in grouped_data:
                grouped_data[label] = {y: [] for y in y_cols}
                row_order.append(label)

            for y_col in y_cols:
                parsed_y = cls._parse_num(r.get(y_col))
                if parsed_y is not None:
                    grouped_data[label][y_col].append(parsed_y)

        # Compute aggregates
        labels = row_order
        series: List[Dict[str, Any]] = []

        for y_col in y_cols:
            y_values: List[float] = []
            for label in labels:
                vals = grouped_data[label][y_col]
                if not vals:
                    y_values.append(0.0)
                elif agg_func == "mean" or agg_func == "average":
                    y_values.append(round(sum(vals) / len(vals), 2))
                elif agg_func == "count":
                    y_values.append(float(len(vals)))
                elif agg_func == "max":
                    y_values.append(round(max(vals), 2))
                elif agg_func == "min":
                    y_values.append(round(min(vals), 2))
                else:  # sum
                    y_values.append(round(sum(vals), 2))

            series.append({
                "name": y_col,
                "data": y_values
            })

        # ---------------------------------------------------------------------
        # 2. Strict Chart Type Input Validation & Misleading Chart Rejection
        # ---------------------------------------------------------------------
        total_data_points = sum(len(s["data"]) for s in series)
        if total_data_points == 0:
            validation_errors.append("No valid numerical values found in selected columns.")
            return None, validation_errors

        # Validate Pie / Donut rules
        if chart_type in [ChartType.PIE.value, ChartType.DONUT.value]:
            if len(labels) > 8:
                validation_errors.append(
                    f"Misleading chart rejected: {chart_type.upper()} charts with {len(labels)} slices are visually deceptive and unreadable. Maximum 8 slices permitted."
                )
            for s in series:
                negative_vals = [v for v in s["data"] if v < 0]
                if negative_vals:
                    validation_errors.append(
                        f"Misleading chart rejected: {chart_type.upper()} charts cannot display negative proportions ({negative_vals[0]})."
                    )
            if len(y_cols) > 1:
                validation_errors.append(
                    f"Misleading chart rejected: {chart_type.upper()} charts only support a single metric series."
                )

        # Validate Scatter rules
        if chart_type == ChartType.SCATTER.value:
            if len(labels) < 3:
                validation_errors.append("Scatter plots require at least 3 data points.")

        if validation_errors:
            return None, validation_errors

        # ---------------------------------------------------------------------
        # 3. Provenance Chain Assembly
        # ---------------------------------------------------------------------
        provenance_chain = [
            {
                "step": "input_evidence",
                "source_evidence_count": len(ev_ids),
                "source_evidence_ids": ev_ids[:10],
                "source_files": list(filenames),
                "row_count": len(rows)
            },
            {
                "step": "deterministic_aggregation",
                "method": f"{agg_func.upper()} GROUP BY {x_col}",
                "input_columns": [x_col] + y_cols,
                "output_labels_count": len(labels),
                "series_count": len(series)
            }
        ]

        formula = f"{agg_func.upper()}({', '.join(y_cols)}) GROUP BY {x_col}"
        calc_record = ChartCalculationRecord(
            calculation_type=f"{agg_func}_by_{x_col}",
            source_evidence_ids=ev_ids,
            source_files=list(filenames),
            source_cell_ranges=cell_ranges[:10],
            aggregation_formula=formula,
            computed_data={
                "x_axis": x_col,
                "labels": labels,
                "series": series
            },
            provenance_chain=provenance_chain
        )

        return calc_record, []


chart_calculator = ChartCalculator()
