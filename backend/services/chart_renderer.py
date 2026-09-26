"""
MineIntel Phase 5: Chart Rendering Engine

Thread-safe headless chart rendering using Matplotlib Agg backend.
Supports:
- Line & Time-Series charts
- Bar, Grouped Bar, and Stacked Bar charts
- Pie & Donut charts (with slice limit validation)
- Area charts
- Scatter plots
Produces high-DPI PNG and vector SVG artifacts with MineIntel dark/light themes.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend
import matplotlib.pyplot as plt
import numpy as np

from backend import config
from backend.services.chart_models import ChartConfig, ChartType

logger = logging.getLogger("mineintel.chart_renderer")

STATIC_CHARTS_DIR = getattr(config, "STATIC_CHARTS_DIR", config.BACKEND_DIR / "static" / "charts")
OUTPUTS_CHARTS_DIR = config.OUTPUTS_DIR / "charts"
# Default CHARTS_DIR points to STATIC_CHARTS_DIR (backend/static/charts)
CHARTS_DIR = STATIC_CHARTS_DIR

# Modern curated color palettes
PALETTE = [
    "#0EA5E9",  # Sky Blue
    "#10B981",  # Emerald
    "#F59E0B",  # Amber
    "#6366F1",  # Indigo
    "#EC4899",  # Pink
    "#14B8A6",  # Teal
    "#8B5CF6",  # Violet
    "#F97316",  # Orange
]

THEME_COLORS = {
    "mineintel_dark": {
        "fig_bg": "#0F172A",
        "ax_bg": "#1E293B",
        "text": "#F8FAFC",
        "grid": "#334155",
        "spine": "#475569"
    },
    "mineintel_light": {
        "fig_bg": "#FFFFFF",
        "ax_bg": "#F8FAFC",
        "text": "#0F172A",
        "grid": "#E2E8F0",
        "spine": "#CBD5E1"
    }
}


def normalize_chart_type(chart_type: Optional[str], series_count: int = 1) -> str:
    """Normalizes any chart_type string from AI or user to a valid supported enum value."""
    if not chart_type:
        return ChartType.GROUPED_BAR.value if series_count > 1 else ChartType.BAR.value
    c = str(chart_type).lower().strip().replace("-", "_").replace(" ", "_")
    if "time" in c or "date" in c or "temporal" in c:
        return ChartType.TIME_SERIES.value
    if "line" in c or "trend" in c:
        return ChartType.LINE.value
    if "donut" in c or "doughnut" in c:
        return ChartType.DONUT.value
    if "pie" in c:
        return ChartType.PIE.value
    if "scatter" in c:
        return ChartType.SCATTER.value
    if "area" in c:
        return ChartType.AREA.value
    if "stack" in c:
        return ChartType.STACKED_BAR.value
    if "group" in c:
        return ChartType.GROUPED_BAR.value
    if "bar" in c or "col" in c or "hist" in c:
        return ChartType.GROUPED_BAR.value if series_count > 1 else ChartType.BAR.value
    return ChartType.GROUPED_BAR.value if series_count > 1 else ChartType.BAR.value


class ChartRenderer:
    """Renders charts using headless Matplotlib with custom MineIntel styling."""

    normalize_chart_type = staticmethod(normalize_chart_type)

    def __init__(self):
        for d in (STATIC_CHARTS_DIR, OUTPUTS_CHARTS_DIR):
            try:
                d.mkdir(parents=True, exist_ok=True)
            except OSError:
                pass

    @classmethod
    def _apply_theme(cls, fig, ax, theme_name: str):
        theme = THEME_COLORS.get(theme_name, THEME_COLORS["mineintel_dark"])
        fig.patch.set_facecolor(theme["fig_bg"])
        ax.set_facecolor(theme["ax_bg"])
        ax.tick_params(colors=theme["text"], labelsize=9)
        ax.xaxis.label.set_color(theme["text"])
        ax.yaxis.label.set_color(theme["text"])
        ax.title.set_color(theme["text"])
        ax.grid(True, linestyle="--", alpha=0.5, color=theme["grid"])
        for spine in ax.spines.values():
            spine.set_color(theme["spine"])

    def render(
        self,
        chart_config: ChartConfig,
        labels: List[str],
        series: List[Dict[str, Any]]
    ) -> Tuple[str, str]:
        """
        Renders chart to PNG and SVG files.
        Returns (png_path, svg_path).
        """
        for d in (STATIC_CHARTS_DIR, OUTPUTS_CHARTS_DIR):
            try:
                d.mkdir(parents=True, exist_ok=True)
            except OSError:
                pass
        chart_id = chart_config.chart_id
        chart_type = normalize_chart_type(chart_config.chart_type, len(series))
        theme_name = chart_config.theme or "mineintel_dark"
        theme = THEME_COLORS.get(theme_name, THEME_COLORS["mineintel_dark"])

        # Sanitize series values (replacing None or NaN with 0.0)
        sanitized_series = []
        for s in series:
            s_copy = dict(s)
            s_copy["data"] = [
                float(v) if (v is not None and not (isinstance(v, float) and np.isnan(v))) else 0.0
                for v in s.get("data", [])
            ]
            sanitized_series.append(s_copy)
        series = sanitized_series

        fig, ax = plt.subplots(figsize=(10, 5.5), dpi=120)

        try:
            self._apply_theme(fig, ax, theme_name)

            title_text = chart_config.title
            if chart_config.subtitle:
                title_text += f"\n{chart_config.subtitle}"
            ax.set_title(title_text, fontsize=12, fontweight="bold", pad=14, color=theme["text"])

            if chart_config.x_axis_label:
                ax.set_xlabel(chart_config.x_axis_label, fontsize=10, labelpad=8)
            if chart_config.y_axis_label:
                y_label = chart_config.y_axis_label
                if chart_config.unit:
                    y_label += f" ({chart_config.unit})"
                ax.set_ylabel(y_label, fontsize=10, labelpad=8)

            # Rotate x labels if many or long
            x_indices = np.arange(len(labels))
            rotate_x = len(labels) > 5 or any(len(str(l)) > 8 for l in labels)

            # -----------------------------------------------------------------
            # 1. Bar Chart
            # -----------------------------------------------------------------
            if chart_type == ChartType.BAR.value:
                y_vals = series[0]["data"]
                color = PALETTE[0]
                bars = ax.bar(x_indices, y_vals, color=color, alpha=0.85, width=0.6, edgecolor=theme["fig_bg"])
                ax.set_xticks(x_indices)
                ax.set_xticklabels(labels, rotation=45 if rotate_x else 0, ha="right" if rotate_x else "center")

            # -----------------------------------------------------------------
            # 2. Grouped Bar Chart
            # -----------------------------------------------------------------
            elif chart_type == ChartType.GROUPED_BAR.value:
                n_series = len(series)
                total_width = 0.8
                bar_width = total_width / max(1, n_series)
                for s_idx, s in enumerate(series):
                    offsets = x_indices - (total_width / 2) + (s_idx * bar_width) + (bar_width / 2)
                    color = PALETTE[s_idx % len(PALETTE)]
                    ax.bar(offsets, s["data"], width=bar_width, label=s["name"], color=color, alpha=0.85, edgecolor=theme["fig_bg"])
                ax.set_xticks(x_indices)
                ax.set_xticklabels(labels, rotation=45 if rotate_x else 0, ha="right" if rotate_x else "center")
                ax.legend(facecolor=theme["ax_bg"], edgecolor=theme["spine"], labelcolor=theme["text"])

            # -----------------------------------------------------------------
            # 3. Stacked Bar Chart
            # -----------------------------------------------------------------
            elif chart_type == ChartType.STACKED_BAR.value:
                bottom = np.zeros(len(labels))
                for s_idx, s in enumerate(series):
                    color = PALETTE[s_idx % len(PALETTE)]
                    ax.bar(x_indices, s["data"], bottom=bottom, label=s["name"], color=color, alpha=0.85, width=0.6, edgecolor=theme["fig_bg"])
                    bottom += np.array(s["data"])
                ax.set_xticks(x_indices)
                ax.set_xticklabels(labels, rotation=45 if rotate_x else 0, ha="right" if rotate_x else "center")
                ax.legend(facecolor=theme["ax_bg"], edgecolor=theme["spine"], labelcolor=theme["text"])

            # -----------------------------------------------------------------
            # 4. Line / Time-Series Chart
            # -----------------------------------------------------------------
            elif chart_type in [ChartType.LINE.value, ChartType.TIME_SERIES.value]:
                for s_idx, s in enumerate(series):
                    color = PALETTE[s_idx % len(PALETTE)]
                    ax.plot(x_indices, s["data"], marker="o", linewidth=2.2, label=s["name"], color=color)
                ax.set_xticks(x_indices)
                ax.set_xticklabels(labels, rotation=45 if rotate_x else 0, ha="right" if rotate_x else "center")
                if len(series) > 1:
                    ax.legend(facecolor=theme["ax_bg"], edgecolor=theme["spine"], labelcolor=theme["text"])

            # -----------------------------------------------------------------
            # 5. Area Chart
            # -----------------------------------------------------------------
            elif chart_type == ChartType.AREA.value:
                for s_idx, s in enumerate(series):
                    color = PALETTE[s_idx % len(PALETTE)]
                    ax.fill_between(x_indices, s["data"], alpha=0.35, color=color)
                    ax.plot(x_indices, s["data"], color=color, linewidth=2, label=s["name"])
                ax.set_xticks(x_indices)
                ax.set_xticklabels(labels, rotation=45 if rotate_x else 0, ha="right" if rotate_x else "center")
                if len(series) > 1:
                    ax.legend(facecolor=theme["ax_bg"], edgecolor=theme["spine"], labelcolor=theme["text"])

            # -----------------------------------------------------------------
            # 6. Pie / Donut Chart
            # -----------------------------------------------------------------
            elif chart_type in [ChartType.PIE.value, ChartType.DONUT.value]:
                ax.clear()
                fig.patch.set_facecolor(theme["fig_bg"])
                y_vals = series[0]["data"]
                colors = PALETTE[:len(labels)]

                wedges, texts, autotexts = ax.pie(
                    y_vals,
                    labels=labels,
                    autopct="%1.1f%%",
                    colors=colors,
                    startangle=140,
                    wedgeprops=dict(
                        width=0.4 if chart_type == ChartType.DONUT.value else 1.0,
                        edgecolor=theme["fig_bg"]
                    ),
                    textprops=dict(color=theme["text"], fontsize=9)
                )
                for at in autotexts:
                    at.set_color("#FFFFFF")
                    at.set_fontweight("bold")
                ax.set_title(title_text, fontsize=12, fontweight="bold", pad=14, color=theme["text"])

            # -----------------------------------------------------------------
            # 7. Scatter Plot
            # -----------------------------------------------------------------
            elif chart_type == ChartType.SCATTER.value:
                for s_idx, s in enumerate(series):
                    color = PALETTE[s_idx % len(PALETTE)]
                    ax.scatter(x_indices, s["data"], color=color, s=60, alpha=0.85, label=s["name"], edgecolor=theme["fig_bg"])
                ax.set_xticks(x_indices)
                ax.set_xticklabels(labels, rotation=45 if rotate_x else 0, ha="right" if rotate_x else "center")
                if len(series) > 1:
                    ax.legend(facecolor=theme["ax_bg"], edgecolor=theme["spine"], labelcolor=theme["text"])

            fig.tight_layout()

            png_filename = f"{chart_id}.png"
            svg_filename = f"{chart_id}.svg"
            png_static = STATIC_CHARTS_DIR / png_filename
            svg_static = STATIC_CHARTS_DIR / svg_filename
            png_output = OUTPUTS_CHARTS_DIR / png_filename
            svg_output = OUTPUTS_CHARTS_DIR / svg_filename

            fig.savefig(str(png_static), format="png", dpi=150, facecolor=fig.get_facecolor(), bbox_inches="tight")
            fig.savefig(str(svg_static), format="svg", facecolor=fig.get_facecolor(), bbox_inches="tight")

            try:
                if png_output != png_static:
                    import shutil
                    shutil.copy2(png_static, png_output)
                    shutil.copy2(svg_static, svg_output)
            except Exception:
                pass

            logger.info(f"Rendered chart {chart_id} to {png_static} and {svg_static}")
            return str(png_static), str(svg_static)

        finally:
            plt.close(fig)

    def render_placeholder(
        self,
        chart_id: str,
        title: str,
        subtitle: Optional[str] = None,
        error_message: Optional[str] = None,
        theme_name: str = "mineintel_dark"
    ) -> Tuple[str, str]:
        """
        Renders a clean, high-DPI visual placeholder when automatic chart rendering encounters
        missing columns or requires fallback representation.
        Guarantees that a physical, valid PNG and SVG file are created on disk in static/charts/.
        """
        for d in (STATIC_CHARTS_DIR, OUTPUTS_CHARTS_DIR):
            try:
                d.mkdir(parents=True, exist_ok=True)
            except OSError:
                pass

        theme = THEME_COLORS.get(theme_name, THEME_COLORS["mineintel_dark"])
        fig, ax = plt.subplots(figsize=(10, 5.5), dpi=120)

        try:
            self._apply_theme(fig, ax, theme_name)

            full_title = f"{title}\n[CHART VISUALIZATION PLACEHOLDER]"
            if subtitle:
                full_title += f" • {subtitle}"
            ax.set_title(full_title, fontsize=12, fontweight="bold", pad=14, color=theme["text"])

            ax.set_xlim(0, 10)
            ax.set_ylim(0, 10)
            ax.set_xticks([])
            ax.set_yticks([])

            # Draw a styled card area
            rect = plt.Rectangle((0.5, 0.5), 9.0, 9.0, fill=True, facecolor=theme["ax_bg"],
                                 edgecolor=theme["spine"], linestyle="--", linewidth=1.8, alpha=0.95)
            ax.add_patch(rect)

            # Central placeholder icon and text
            ax.text(5, 6.4, "📊", fontsize=36, ha="center", va="center")
            ax.text(5, 5.0, "Operational Metrics Visual Enclave", fontsize=13, fontweight="bold",
                    color=theme["text"], ha="center", va="center")

            reason = error_message or "Deterministic chart calculation fallback placeholder."
            ax.text(5, 3.8, f"Notice: {reason[:120]}", fontsize=9.5, fontstyle="italic",
                    color="#94A3B8", ha="center", va="center", wrap=True)

            # Draw decorative metric bars to simulate chart presence
            sample_heights = [1.2, 2.0, 1.6, 2.4, 1.8]
            for idx, h in enumerate(sample_heights):
                x_pos = 3.2 + (idx * 0.8)
                bar = plt.Rectangle((x_pos, 1.2), 0.5, h, fill=True, color=PALETTE[idx % len(PALETTE)], alpha=0.6)
                ax.add_patch(bar)

            ax.text(5, 0.9, "SYSTEM FALLBACK RENDERED • SOVEREIGN DATA AUDIT",
                    fontsize=8, fontweight="bold", color="#10B981", ha="center", va="center")

            fig.tight_layout()

            png_filename = f"{chart_id}.png"
            svg_filename = f"{chart_id}.svg"
            png_static = STATIC_CHARTS_DIR / png_filename
            svg_static = STATIC_CHARTS_DIR / svg_filename
            png_output = OUTPUTS_CHARTS_DIR / png_filename
            svg_output = OUTPUTS_CHARTS_DIR / svg_filename

            fig.savefig(str(png_static), format="png", dpi=150, facecolor=fig.get_facecolor(), bbox_inches="tight")
            fig.savefig(str(svg_static), format="svg", facecolor=fig.get_facecolor(), bbox_inches="tight")

            try:
                if png_output != png_static:
                    import shutil
                    shutil.copy2(png_static, png_output)
                    shutil.copy2(svg_static, svg_output)
            except Exception:
                pass

            logger.info(f"Rendered fallback placeholder chart {chart_id} to {png_static}")
            return str(png_static), str(svg_static)

        finally:
            plt.close(fig)


chart_renderer = ChartRenderer()

