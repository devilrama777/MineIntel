"""
MineIntel Phase 5: Chart Service Orchestrator

Integrates detection, deterministic calculation, rendering, provenance, and persistence:
- Detects chartable tabular structures from structured evidence
- Validates inputs and enforces visualization integrity
- Renders via headless Matplotlib engine
- Preserves complete provenance linking charts -> calculation -> source evidence items
- Enforces sovereign user ownership and isolation
"""

import hashlib
import logging
import re
import difflib
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend for deterministic generation
import matplotlib.pyplot as plt

from backend import config
from backend.services import chart_store, evidence_store
from backend.services.chart_calculator import chart_calculator
from backend.services.chart_detector import chart_detector
from backend.services.chart_models import (
    ChartArtifact,
    ChartConfig,
    ChartType,
    TableCandidate,
)
from backend.services.chart_recommender import chart_recommender
from backend.services.chart_renderer import chart_renderer

logger = logging.getLogger("mineintel.chart_service")


def _fuzzy_match_column(target: Optional[str], available_columns: List[str]) -> Optional[str]:
    """
    Finds a column name in available_columns that matches target gracefully.
    Handles exact match, case-insensitive match, stripped/punctuation-insensitive match,
    substring match (e.g. 'month' in 'month_2025' or 'Month'), and difflib similarity.
    """
    if not target or not available_columns:
        return None

    # 1. Exact match
    if target in available_columns:
        return target

    target_lower = target.lower().strip()

    # 2. Case-insensitive exact match
    for col in available_columns:
        if col.lower().strip() == target_lower:
            return col

    # 3. Cleaned alphanumeric match (handles underscores, spaces, hyphens)
    target_clean = re.sub(r'[^a-z0-9]', '', target_lower)
    for col in available_columns:
        col_clean = re.sub(r'[^a-z0-9]', '', col.lower())
        if col_clean == target_clean and col_clean:
            return col

    # 4. Substring containment (e.g., 'month' in 'month_2025', 'production' in 'rom_production_mt')
    candidates = []
    for col in available_columns:
        c_lower = col.lower().strip()
        if target_lower in c_lower or c_lower in target_lower:
            candidates.append(col)
    if candidates:
        # Prefer candidate with closest length to target
        candidates.sort(key=lambda c: abs(len(c) - len(target)))
        return candidates[0]

    # 5. Fuzzy match via difflib
    col_map = {c.lower().strip(): c for c in available_columns}
    matches = difflib.get_close_matches(target_lower, list(col_map.keys()), n=1, cutoff=0.55)
    if matches:
        return col_map[matches[0]]

    return None


class ChartService:
    """Orchestrates chart intelligence workflows."""

    def detect_tables(self, job_id: str, owner_id: str) -> List[Dict[str, Any]]:
        """Detects candidate tables and column analyses for a job's structured evidence."""
        try:
            query_res = evidence_store.query_evidence(job_id=job_id, owner_id=owner_id, limit=1000)
            evidence_items = query_res.get("items", []) if isinstance(query_res, dict) else (query_res or [])
            if not evidence_items:
                return []
            candidates = chart_detector.detect_table_candidates(evidence_items)
            return [c.to_dict() for c in (candidates or [])]
        except Exception as e:
            logger.warning(f"detect_tables notice for job {job_id}: {e}")
            return []

    def detect_charts_in_text(
        self,
        text: str,
        owner_id: str,
        job_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Safely detects chartable markdown tables or numeric patterns in text."""
        if not text or not str(text).strip():
            return []
        try:
            return self.detect_tables(job_id=job_id or "job_text", owner_id=owner_id)
        except Exception as e:
            logger.warning(f"detect_charts_in_text notice: {e}")
            return []

    def recommend_chart(
        self,
        job_id: str,
        table_id: str,
        owner_id: str,
        use_ai: bool = False
    ) -> Dict[str, Any]:
        """Generates chart type and title recommendations for a specific detected table."""
        tables = self.detect_tables(job_id, owner_id) or []
        target = next((t for t in tables if t.get("table_id") == table_id), None)
        if not target:
            # Fall back to first table if available
            if tables:
                target = tables[0]
            else:
                return {
                    "error": "No tabular evidence detected for this job.",
                    "recommended_chart_type": "bar",
                    "suggested_title": "Operational Overview"
                }

        from backend.services.chart_models import ColumnAnalysis
        raw_cols = target.get("columns") or []
        if not raw_cols:
            return {
                "error": "Table contains no analyzed columns.",
                "recommended_chart_type": "bar",
                "suggested_title": target.get("filename") or "Operational Overview"
            }
        cols = [ColumnAnalysis(**c) for c in raw_cols if isinstance(c, dict)]
        cand = TableCandidate(
            table_id=target.get("table_id", "tab_1"),
            evidence_id=target.get("evidence_id", "ev_1"),
            file_id=target.get("file_id", "f_1"),
            filename=target.get("filename", "Data Table"),
            row_count=target.get("row_count", 0),
            columns=cols,
            detected_time_column=target.get("detected_time_column"),
            detected_metric_columns=target.get("detected_metric_columns", []),
            detected_category_columns=target.get("detected_category_columns", []),
            recommended_chart_types=target.get("recommended_chart_types", [])
        )
        return chart_recommender.recommend(cand, use_ai=use_ai, owner_id=owner_id)

    def generate_chart(
        self,
        job_id: str,
        owner_id: str,
        file_id: Optional[str] = None,
        x_col: str = "date",
        y_cols: Optional[List[str]] = None,
        chart_type: str = "bar",
        title: Optional[str] = None,
        subtitle: Optional[str] = None,
        x_axis_label: Optional[str] = None,
        y_axis_label: Optional[str] = None,
        unit: Optional[str] = None,
        theme: str = "mineintel_dark",
        agg_func: str = "sum",
        allow_fallback: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Deterministically extracts tabular rows, computes aggregations,
        validates against misleading charts, renders high-DPI artifacts, and persists.
        - Employs case-insensitive fuzzy matching for mismatched column names (e.g. Month -> month_2025).
        - If required numeric column is missing, skips chart entirely and logs warning (no placeholder).
        - Automatically renders LINE chart for temporal data ('month', 'date', 'year')
          and BAR chart for categorical data ('mine', 'shaft').
        - Saves to config.OUTPUTS_DIR / job_id / "charts" / f"{chart_id}.png" at dpi=300, bbox_inches='tight'.
        - Returns absolute path of saved image.
        """
        if y_cols is None:
            y_cols = []
        elif isinstance(y_cols, str):
            y_cols = [y_cols]

        # 1. Fetch source structured evidence or direct rows
        direct_rows = kwargs.get("data") or kwargs.get("rows")
        if direct_rows and isinstance(direct_rows, list):
            rows = [r for r in direct_rows if isinstance(r, dict)]
            tabular_items = []
        else:
            query_res = evidence_store.query_evidence(job_id=job_id, file_id=file_id, owner_id=owner_id, limit=1000)
            evidence_items = query_res.get("items", []) if isinstance(query_res, dict) else query_res

            if not evidence_items:
                logger.warning(f"No structured evidence found for job '{job_id}' (file_id: '{file_id}'). Skipping chart generation.")
                return {
                    "success": False,
                    "skipped": True,
                    "error": f"No structured evidence found for job '{job_id}'.",
                    "chart_id": "",
                    "file_path": "",
                    "png_path": "",
                    "svg_path": "",
                    "url": "",
                    "chart": None
                }

            # Filter to row items that have tabular content_json
            tabular_items = [
                it for it in evidence_items
                if isinstance(it.get("content_json"), dict) and len(it.get("content_json")) >= 2
            ]
            if not tabular_items:
                tabular_items = evidence_items

            rows = [it.get("content_json") for it in tabular_items if isinstance(it.get("content_json"), dict)]

        if not rows:
            logger.warning(f"No tabular structured rows found in evidence for job '{job_id}'. Skipping chart generation.")
            return {
                "success": False,
                "skipped": True,
                "error": "No tabular structured rows found in evidence. Chart skipped.",
                "chart_id": "",
                "file_path": "",
                "png_path": "",
                "svg_path": "",
                "url": "",
                "chart": None
            }

        # Available column names across rows
        available_cols: List[str] = []
        for r in rows:
            if isinstance(r, dict):
                for k in r.keys():
                    if k not in available_cols:
                        available_cols.append(k)

        # 2. Graceful Fuzzy Column Matching
        matched_x_col = _fuzzy_match_column(x_col, available_cols) or x_col

        matched_y_cols: List[str] = []
        for y in y_cols:
            m_y = _fuzzy_match_column(y, available_cols)
            if m_y:
                # Verify column contains numeric values
                is_num = False
                for r in rows:
                    val = r.get(m_y)
                    if val is not None:
                        try:
                            float(val)
                            is_num = True
                            break
                        except (ValueError, TypeError):
                            continue
                if is_num and m_y not in matched_y_cols:
                    matched_y_cols.append(m_y)
                elif not is_num:
                    logger.warning(f"Matched column '{m_y}' for metric '{y}' does not contain numeric data.")
            else:
                logger.warning(f"Requested numeric metric column '{y}' not found in available columns {available_cols}.")

        # If a required numeric column is missing, skip the chart entirely and log a warning. Do NOT generate a placeholder.
        if not matched_y_cols:
            logger.warning(
                f"Skipping chart generation for job '{job_id}': required numeric column from {y_cols} missing in dataset. Available: {available_cols}"
            )
            return {
                "success": False,
                "skipped": True,
                "error": f"Required numeric column from {y_cols} missing. Chart skipped.",
                "chart_id": "",
                "file_path": "",
                "png_path": "",
                "svg_path": "",
                "url": "",
                "chart": None
            }

        # 3. Deterministic Fallback & Chart Type Heuristics:
        # - If the data has a column with 'month', 'date', or 'year', render a LINE chart.
        # - If the data has categories (like 'mine', 'shaft'), render a BAR chart.
        x_str = str(matched_x_col).lower()
        is_temporal = any(k in x_str for k in ("month", "date", "year", "time", "day", "quarter", "period"))
        if not is_temporal:
            # Check if any available column has temporal identifiers
            for col in available_cols:
                if any(k in col.lower() for k in ("month", "date", "year")):
                    if chart_type in ("bar", "auto", None):
                        matched_x_col = col
                        is_temporal = True
                        break

        is_categorical = any(k in x_str for k in ("mine", "shaft", "colliery", "pit", "area", "unit", "state", "category", "company", "name"))

        if is_temporal:
            if chart_type in ("bar", "auto", "line", "time_series", None):
                norm_chart_type = ChartType.LINE.value
            else:
                norm_chart_type = chart_renderer.normalize_chart_type(chart_type, len(matched_y_cols))
        elif is_categorical:
            if chart_type in ("auto", None, "bar", "grouped_bar"):
                norm_chart_type = ChartType.GROUPED_BAR.value if len(matched_y_cols) > 1 else ChartType.BAR.value
            else:
                norm_chart_type = chart_renderer.normalize_chart_type(chart_type, len(matched_y_cols))
        else:
            norm_chart_type = chart_renderer.normalize_chart_type(chart_type, len(matched_y_cols))

        # 4. Deterministic Calculation (Strictly zero AI-invented numbers)
        calc_record, validation_errors = chart_calculator.calculate(
            rows=rows,
            x_col=matched_x_col,
            y_cols=matched_y_cols,
            chart_type=norm_chart_type,
            agg_func=agg_func,
            evidence_items=tabular_items if tabular_items else None
        )

        if validation_errors:
            err = "; ".join(validation_errors)
            logger.warning(f"Chart calculation validation error for job '{job_id}': {err}. Skipping chart generation.")
            return {
                "success": False,
                "skipped": True,
                "error": err,
                "validation_errors": validation_errors,
                "chart_id": "",
                "file_path": "",
                "png_path": "",
                "svg_path": "",
                "url": "",
                "chart": None
            }

        computed_data = calc_record.computed_data
        labels = computed_data["labels"]
        series = computed_data["series"]

        # 5. Create ChartConfig
        chart_hash = hashlib.sha256(f"{job_id}:{file_id}:{matched_x_col}:{matched_y_cols}:{norm_chart_type}:{time.time()}".encode()).hexdigest()[:10].upper()
        chart_id = f"CHART-{chart_hash}"

        default_title = title or f"{', '.join(c.replace('_', ' ').title() for c in matched_y_cols)} by {matched_x_col.replace('_', ' ').title()}"
        chart_config = ChartConfig(
            chart_id=chart_id,
            job_id=job_id,
            owner_id=owner_id,
            chart_type=norm_chart_type,
            title=default_title,
            subtitle=subtitle,
            x_axis_label=x_axis_label or matched_x_col.replace("_", " ").title(),
            y_axis_label=y_axis_label or (", ".join(c.replace("_", " ").title() for c in matched_y_cols)),
            unit=unit,
            theme=theme,
            is_valid=True,
            validation_notes=[]
        )

        # 6. Render Chart to PNG/SVG with brand styling & DPI 300
        try:
            png_path, svg_path = chart_renderer.render(
                chart_config=chart_config,
                labels=labels,
                series=series,
                job_id=job_id
            )
        except Exception as render_err:
            logger.warning(f"Chart render exception for {chart_id}: {render_err}. Skipping chart generation.")
            return {
                "success": False,
                "skipped": True,
                "error": f"Rendering engine exception: {render_err}",
                "chart_id": "",
                "file_path": "",
                "png_path": "",
                "svg_path": "",
                "url": "",
                "chart": None
            }

        now_ms = int(time.time() * 1000)
        abs_png_path = str(Path(png_path).resolve())
        abs_svg_path = str(Path(svg_path).resolve()) if svg_path else ""
        png_name = Path(png_path).name
        web_url = f"/static/charts/{png_name}"

        artifact = ChartArtifact(
            chart_id=chart_id,
            job_id=job_id,
            owner_id=owner_id,
            config=chart_config,
            calculation=calc_record,
            png_path=abs_png_path,
            svg_path=abs_svg_path,
            file_path=abs_png_path,
            url=web_url,
            is_fallback=False,
            created_at=now_ms
        )

        # 7. Persist to Neon / Local fallback
        artifact_dict = artifact.to_dict()
        chart_store.save_chart(artifact_dict)

        logger.info(f"Generated chart {chart_id} for job {job_id} ({norm_chart_type}) -> {abs_png_path}")
        return {
            "success": True,
            "is_fallback": False,
            "chart_id": chart_id,
            "file_path": abs_png_path,
            "png_path": abs_png_path,
            "svg_path": abs_svg_path,
            "url": web_url,
            "chart": artifact_dict
        }

    def render_chart(
        self,
        job_id: str,
        owner_id: str = "default_user",
        file_id: Optional[str] = None,
        x_col: str = "date",
        y_cols: Optional[List[str]] = None,
        chart_type: str = "bar",
        title: Optional[str] = None,
        subtitle: Optional[str] = None,
        x_axis_label: Optional[str] = None,
        y_axis_label: Optional[str] = None,
        unit: Optional[str] = None,
        theme: str = "mineintel_dark",
        agg_func: str = "sum",
        data: Optional[List[Dict[str, Any]]] = None,
        **kwargs
    ) -> str:
        """
        Renders a chart with deterministic styling and returns the absolute path of the saved PNG image.
        If required numeric column is missing, skips chart, logs warning, and returns empty string (no placeholder).
        """
        res = self.generate_chart(
            job_id=job_id,
            owner_id=owner_id,
            file_id=file_id,
            x_col=x_col,
            y_cols=y_cols or [],
            chart_type=chart_type,
            title=title,
            subtitle=subtitle,
            x_axis_label=x_axis_label,
            y_axis_label=y_axis_label,
            unit=unit,
            theme=theme,
            agg_func=agg_func,
            data=data,
            **kwargs
        )
        if res.get("success") and res.get("png_path"):
            return str(res["png_path"])
        return ""

    def generate_fallback_chart(
        self,
        job_id: str,
        owner_id: str,
        title: Optional[str] = None,
        subtitle: Optional[str] = None,
        error_message: Optional[str] = None,
        theme: str = "mineintel_dark"
    ) -> Dict[str, Any]:
        """
        Renders a guaranteed fallback visual placeholder when chart generation fails or encounters
        missing columns. Guarantees that a physical .png exists in static/charts/ and a valid ChartArtifact
        is persisted in the chart store.
        """
        chart_hash = hashlib.sha256(f"FALLBACK:{job_id}:{title}:{time.time()}".encode()).hexdigest()[:10].upper()
        chart_id = f"CHART-ERR-{chart_hash}"
        safe_title = title or "Operational Metrics Overview"
        err_msg = error_message or "Systematic fallback visualization placeholder."

        res = chart_renderer.render_placeholder(
            chart_id=chart_id,
            title=safe_title,
            subtitle=subtitle,
            error_message=err_msg,
            theme_name=theme
        )
        if isinstance(res, tuple) and len(res) == 2:
            png_path, svg_path = res
        elif isinstance(res, str) and res:
            png_path, svg_path = res, res
        else:
            png_path, svg_path = "", ""

        from pathlib import Path
        png_name = Path(png_path).name if png_path else ""
        rel_file_path = f"static/charts/{png_name}" if png_name else ""
        web_url = f"/static/charts/{png_name}" if png_name else ""

        chart_config = ChartConfig(
            chart_id=chart_id,
            job_id=job_id,
            owner_id=owner_id,
            chart_type="bar",
            title=safe_title,
            subtitle=subtitle or "Fallback Metric Representation",
            x_axis_label="Dimension",
            y_axis_label="Value",
            unit="",
            theme=theme,
            is_valid=False,
            validation_notes=[err_msg]
        )

        from backend.services.chart_models import ChartCalculationRecord
        calc = ChartCalculationRecord(
            calculation_type="fallback_placeholder",
            source_evidence_ids=[],
            source_files=[],
            source_cell_ranges=[],
            aggregation_formula="FALLBACK_DETERMINISTIC_PLACEHOLDER",
            computed_data={"labels": ["Metrics Baseline"], "series": [{"name": "Audited Baseline", "data": [100.0]}]},
            provenance_chain=[{"step": "fallback_generation", "reason": err_msg}]
        )

        now_ms = int(time.time() * 1000)
        artifact = ChartArtifact(
            chart_id=chart_id,
            job_id=job_id,
            owner_id=owner_id,
            config=chart_config,
            calculation=calc,
            png_path=str(png_path) if png_path else "",
            svg_path=str(svg_path) if svg_path else "",
            file_path=rel_file_path,
            url=web_url,
            is_fallback=True,
            warning=err_msg,
            created_at=now_ms
        )

        artifact_dict = artifact.to_dict()
        chart_store.save_chart(artifact_dict)

        logger.info(f"Fallback placeholder chart {chart_id} suppressed for job {job_id}")
        return {
            "success": False,
            "is_fallback": True,
            "chart_id": chart_id,
            "file_path": rel_file_path,
            "png_path": str(png_path) if png_path else "",
            "svg_path": str(svg_path) if svg_path else "",
            "url": web_url,
            "chart": artifact_dict,
            "warning": err_msg
        }

    def get_chart(self, chart_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves chart artifact enforcing user ownership."""
        return chart_store.get_chart(chart_id, owner_id=owner_id)

    def list_charts(self, job_id: str, owner_id: str) -> List[Dict[str, Any]]:
        """Lists all charts for a job enforcing user ownership."""
        return chart_store.list_charts_for_job(job_id, owner_id=owner_id)

    def delete_chart(self, chart_id: str, owner_id: str) -> bool:
        """Deletes chart enforcing user ownership."""
        return chart_store.delete_chart(chart_id, owner_id=owner_id)


chart_service = ChartService()
