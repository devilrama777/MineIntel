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

CHARTS_DIR = config.OUTPUTS_DIR / "charts"

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


class ChartRenderer:
    """Renders charts using headless Matplotlib with custom MineIntel styling."""

    def __init__(self):
        try:
            CHARTS_DIR.mkdir(parents=True, exist_ok=True)
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
        try:
            CHARTS_DIR.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass
        chart_id = chart_config.chart_id
        chart_type = chart_config.chart_type
        theme_name = chart_config.theme or "mineintel_dark"
        theme = THEME_COLORS.get(theme_name, THEME_COLORS["mineintel_dark"])

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
            png_path = CHARTS_DIR / png_filename
            svg_path = CHARTS_DIR / svg_filename

            fig.savefig(str(png_path), format="png", dpi=150, facecolor=fig.get_facecolor(), bbox_inches="tight")
            fig.savefig(str(svg_path), format="svg", facecolor=fig.get_facecolor(), bbox_inches="tight")

            logger.info(f"Rendered chart {chart_id} to {png_path} and {svg_path}")
            return str(png_path), str(svg_path)

        finally:
            plt.close(fig)


chart_renderer = ChartRenderer()
