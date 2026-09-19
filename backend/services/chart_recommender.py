"""
MineIntel Phase 5: Chart Recommendation Engine

Combines deterministic rule-based analysis with optional Phase 3 AI reasoning (Qwen3-8B).
Recommends optimal chart types, titles, and visual emphasis for structured evidence tables.
CRITICAL CONSTRAINT: AI is strictly restricted to schema/metadata advice.
Zero AI-invented numerical values are permitted in charts.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from backend.services.ai_inference_service import ai_inference_service
from backend.services.chart_detector import chart_detector
from backend.services.chart_models import ColumnAnalysis, TableCandidate

logger = logging.getLogger("mineintel.chart_recommender")


class ChartRecommender:
    """Provides chart type and styling recommendations."""

    @classmethod
    def recommend(
        cls,
        table: TableCandidate,
        use_ai: bool = False,
        owner_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates chart recommendations for a detected table candidate.
        Returns deterministic advice, optionally enriched with Phase 3 Qwen3-8B suggestions.
        """
        heuristic_types = chart_detector.recommend_chart_types_for_table(table.columns, table.row_count)
        primary_chart_type = heuristic_types[0] if heuristic_types else "bar"

        # Default rule-based titles
        time_col = table.detected_time_column
        metric_cols = table.detected_metric_columns
        metric_str = ", ".join(metric_cols[:2]) if metric_cols else "Operational Metric"

        if time_col:
            default_title = f"{metric_str.title()} Trend over {time_col.title()}"
        else:
            cat_col = table.detected_category_columns[0] if table.detected_category_columns else "Category"
            default_title = f"{metric_str.title()} by {cat_col.title()}"

        recommendation = {
            "recommended_chart_type": primary_chart_type,
            "alternative_chart_types": heuristic_types[1:] if len(heuristic_types) > 1 else [],
            "suggested_title": default_title,
            "suggested_x_axis": time_col or (table.detected_category_columns[0] if table.detected_category_columns else None),
            "suggested_y_axes": metric_cols[:3],
            "ai_enriched": False,
            "rationale": f"Selected {primary_chart_type.upper()} based on {len(table.columns)} columns ({len(metric_cols)} metrics, {1 if time_col else 0} time dimensions)."
        }

        # Optionally consult Phase 3 Local AI (Qwen3-8B) for executive title/narrative advice ONLY
        if use_ai and owner_id:
            try:
                # Provide only column names, row counts, and data types (NEVER send raw numbers for AI to alter)
                schema_prompt = (
                    f"You are a mining operations reporting assistant. Given this dataset schema:\n"
                    f"Filename: {table.filename}\n"
                    f"Rows: {table.row_count}\n"
                    f"Columns: {', '.join(c.name + ' (' + c.dimension_type + ')' for c in table.columns)}\n"
                    f"Recommend a professional executive chart title and brief 1-sentence analytical caption.\n"
                    f"Do NOT invent or alter any numbers. Respond with a JSON object: {{\"title\": \"...\", \"caption\": \"...\"}}"
                )
                ai_resp = ai_inference_service.registry.get_provider().generate(
                    prompt=schema_prompt,
                    system_prompt="You are a data visualization advisor for coal mining operations. Respond in valid JSON.",
                    temperature=0.2,
                    max_tokens=200
                )
                if ai_resp and ai_resp.text:
                    # Clean json from response
                    text = ai_resp.text.strip()
                    if "{" in text and "}" in text:
                        json_str = text[text.find("{"):text.rfind("}") + 1]
                        parsed = json.loads(json_str)
                        if parsed.get("title"):
                            recommendation["suggested_title"] = parsed["title"]
                        if parsed.get("caption"):
                            recommendation["ai_caption"] = parsed["caption"]
                        recommendation["ai_enriched"] = True
                        recommendation["ai_model"] = ai_resp.model
            except Exception as e:
                logger.info(f"AI recommendation bypassed or unavailable, using deterministic rule: {e}")

        return recommendation


chart_recommender = ChartRecommender()
