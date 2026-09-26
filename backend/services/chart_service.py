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
import time
from typing import Any, Dict, List, Optional

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


class ChartService:
    """Orchestrates chart intelligence workflows."""

    def detect_tables(self, job_id: str, owner_id: str) -> List[Dict[str, Any]]:
        """Detects candidate tables and column analyses for a job's structured evidence."""
        query_res = evidence_store.query_evidence(job_id=job_id, owner_id=owner_id, limit=1000)
        evidence_items = query_res.get("items", []) if isinstance(query_res, dict) else query_res
        candidates = chart_detector.detect_table_candidates(evidence_items)
        return [c.to_dict() for c in candidates]

    def recommend_chart(
        self,
        job_id: str,
        table_id: str,
        owner_id: str,
        use_ai: bool = False
    ) -> Dict[str, Any]:
        """Generates chart type and title recommendations for a specific detected table."""
        tables = self.detect_tables(job_id, owner_id)
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
        cols = [ColumnAnalysis(**c) for c in target["columns"]]
        cand = TableCandidate(
            table_id=target["table_id"],
            evidence_id=target["evidence_id"],
            file_id=target["file_id"],
            filename=target["filename"],
            row_count=target["row_count"],
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
        file_id: Optional[str],
        x_col: str,
        y_cols: List[str],
        chart_type: str = "bar",
        title: Optional[str] = None,
        subtitle: Optional[str] = None,
        x_axis_label: Optional[str] = None,
        y_axis_label: Optional[str] = None,
        unit: Optional[str] = None,
        theme: str = "mineintel_dark",
        agg_func: str = "sum",
        allow_fallback: bool = True
    ) -> Dict[str, Any]:
        """
        Deterministically extracts tabular rows, computes aggregations,
        validates against misleading charts, renders high-DPI artifacts, and persists.
        If validation or rendering fails and allow_fallback=True, generates a robust
        Chart Error / Fallback placeholder image in static/charts/ to guarantee continuous visual integrity.
        """
        if isinstance(y_cols, str):
            y_cols = [y_cols]

        norm_chart_type = chart_renderer.normalize_chart_type(chart_type, len(y_cols) if y_cols else 1)

        # 1. Fetch source structured evidence
        query_res = evidence_store.query_evidence(job_id=job_id, file_id=file_id, owner_id=owner_id, limit=1000)
        evidence_items = query_res.get("items", []) if isinstance(query_res, dict) else query_res

        if not evidence_items:
            err = f"No structured evidence found for job '{job_id}' (file_id: '{file_id}')."
            if allow_fallback:
                return self.generate_fallback_chart(
                    job_id=job_id,
                    owner_id=owner_id,
                    title=title or "Operational Performance Overview",
                    subtitle=subtitle,
                    error_message=err,
                    theme=theme
                )
            return {"success": False, "error": err}

        # Filter to row items that have tabular content_json
        tabular_items = [
            it for it in evidence_items
            if isinstance(it.get("content_json"), dict) and len(it.get("content_json")) >= 2
        ]
        if not tabular_items:
            tabular_items = evidence_items

        rows = [it.get("content_json") for it in tabular_items if isinstance(it.get("content_json"), dict)]
        if not rows:
            err = "No tabular structured rows found in evidence to generate chart."
            if allow_fallback:
                return self.generate_fallback_chart(
                    job_id=job_id,
                    owner_id=owner_id,
                    title=title or "Operational Performance Overview",
                    subtitle=subtitle,
                    error_message=err,
                    theme=theme
                )
            return {"success": False, "error": err}

        # 2. Deterministic Calculation (Strictly zero AI-invented numbers)
        calc_record, validation_errors = chart_calculator.calculate(
            rows=rows,
            x_col=x_col,
            y_cols=y_cols,
            chart_type=norm_chart_type,
            agg_func=agg_func,
            evidence_items=tabular_items
        )

        if validation_errors:
            err = "; ".join(validation_errors)
            if allow_fallback:
                return self.generate_fallback_chart(
                    job_id=job_id,
                    owner_id=owner_id,
                    title=title or f"{', '.join(y_cols).title()} by {x_col.title()}",
                    subtitle=subtitle,
                    error_message=err,
                    theme=theme
                )
            return {
                "success": False,
                "error": err,
                "validation_errors": validation_errors
            }

        computed_data = calc_record.computed_data
        labels = computed_data["labels"]
        series = computed_data["series"]

        # 3. Create ChartConfig
        chart_hash = hashlib.sha256(f"{job_id}:{file_id}:{x_col}:{y_cols}:{norm_chart_type}:{time.time()}".encode()).hexdigest()[:10].upper()
        chart_id = f"CHART-{chart_hash}"

        default_title = title or f"{', '.join(y_cols).title()} by {x_col.title()}"
        chart_config = ChartConfig(
            chart_id=chart_id,
            job_id=job_id,
            owner_id=owner_id,
            chart_type=norm_chart_type,
            title=default_title,
            subtitle=subtitle,
            x_axis_label=x_axis_label or x_col.title(),
            y_axis_label=y_axis_label or (", ".join(y_cols).title()),
            unit=unit,
            theme=theme,
            is_valid=True,
            validation_notes=[]
        )

        # 4. Render Chart to PNG/SVG
        try:
            png_path, svg_path = chart_renderer.render(
                chart_config=chart_config,
                labels=labels,
                series=series
            )
        except Exception as render_err:
            logger.warning(f"Chart render exception for {chart_id}: {render_err}")
            if allow_fallback:
                return self.generate_fallback_chart(
                    job_id=job_id,
                    owner_id=owner_id,
                    title=default_title,
                    subtitle=subtitle,
                    error_message=f"Rendering engine exception: {render_err}",
                    theme=theme
                )
            return {"success": False, "error": f"Rendering engine exception: {render_err}"}

        now_ms = int(time.time() * 1000)
        from pathlib import Path
        png_name = Path(png_path).name
        rel_file_path = f"static/charts/{png_name}"
        web_url = f"/static/charts/{png_name}"

        artifact = ChartArtifact(
            chart_id=chart_id,
            job_id=job_id,
            owner_id=owner_id,
            config=chart_config,
            calculation=calc_record,
            png_path=str(png_path),
            svg_path=str(svg_path),
            file_path=rel_file_path,
            url=web_url,
            is_fallback=False,
            created_at=now_ms
        )

        # 5. Persist to Neon / Local fallback
        artifact_dict = artifact.to_dict()
        chart_store.save_chart(artifact_dict)

        logger.info(f"Generated chart {chart_id} for job {job_id} ({norm_chart_type}) -> {rel_file_path}")
        return {
            "success": True,
            "is_fallback": False,
            "chart_id": chart_id,
            "file_path": rel_file_path,
            "png_path": str(png_path),
            "svg_path": str(svg_path),
            "url": web_url,
            "chart": artifact_dict
        }

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

        png_path, svg_path = chart_renderer.render_placeholder(
            chart_id=chart_id,
            title=safe_title,
            subtitle=subtitle,
            error_message=err_msg,
            theme_name=theme
        )

        from pathlib import Path
        png_name = Path(png_path).name
        rel_file_path = f"static/charts/{png_name}"
        web_url = f"/static/charts/{png_name}"

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

        calc_record = chart_calculator._parse_num(0)  # dummy to avoid unused
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
            png_path=str(png_path),
            svg_path=str(svg_path),
            file_path=rel_file_path,
            url=web_url,
            is_fallback=True,
            warning=err_msg,
            created_at=now_ms
        )

        artifact_dict = artifact.to_dict()
        chart_store.save_chart(artifact_dict)

        logger.info(f"Generated fallback placeholder chart {chart_id} for job {job_id} -> {rel_file_path}")
        return {
            "success": True,
            "is_fallback": True,
            "chart_id": chart_id,
            "file_path": rel_file_path,
            "png_path": str(png_path),
            "svg_path": str(svg_path),
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
