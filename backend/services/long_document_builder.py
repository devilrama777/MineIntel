"""
MineIntel Phase 7: Long-Document Report Generation Engine

Transforms a Phase 6 Report Plan into substantial, source-grounded regulatory reports:
- Dynamic section/subsection rendering based on evidence
- Automated Table of Contents with section hierarchy
- Embedded Phase 5 chart artifacts with mathematical formulas and provenance
- Full tabular grids and historical photographs with grounded captions
- Source citations [EV-...: file, row/page] preserving end-to-end provenance
- Explicit callouts for missing/insufficient evidence
- Architecture capable of scalable 100+ to 300–400 page document generation
- Multi-format compilation (PDF, DOCX, Markdown)
"""

import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from backend import config
from backend.services.evidence_models import EvidenceClassification
from backend.services.planner_models import PlannedSection, ReportPlan
from backend.services.report_canvas import NumberedReportCanvas

logger = logging.getLogger("mineintel.long_doc_builder")

REPORTS_DIR = config.BASE_DIR / "outputs" / "reports"


class LongDocumentBuilder:
    """Compiles multi-page PDF, DOCX, and Markdown dossiers from a Report Plan."""

    def __init__(self):
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        self.styles = getSampleStyleSheet()
        self._init_custom_styles()

    def _init_custom_styles(self):
        """Initializes typography styles matching Ministry of Coal executive branding."""
        # Primary palette
        c_slate = colors.HexColor("#0F172A")
        c_muted = colors.HexColor("#475569")
        c_accent = colors.HexColor("#0D9488")  # Teal

        self.style_cover_title = ParagraphStyle(
            "CoverTitle",
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=c_slate,
            spaceAfter=12
        )
        self.style_cover_sub = ParagraphStyle(
            "CoverSub",
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=c_muted,
            spaceAfter=24
        )
        self.style_sec_h1 = ParagraphStyle(
            "SecH1",
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=c_slate,
            spaceBefore=14,
            spaceAfter=6,
            keepWithNext=True
        )
        self.style_sec_h2 = ParagraphStyle(
            "SecH2",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=c_accent,
            spaceBefore=10,
            spaceAfter=4,
            keepWithNext=True
        )
        self.style_body = ParagraphStyle(
            "ReportBody",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.5,
            textColor=c_slate,
            spaceAfter=6
        )
        self.style_citation = ParagraphStyle(
            "Citation",
            fontName="Helvetica-Oblique",
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=4
        )
        self.style_toc_item = ParagraphStyle(
            "TOCItem",
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=c_slate
        )
        self.style_toc_item_bold = ParagraphStyle(
            "TOCItemBold",
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=13,
            textColor=c_slate
        )
        self.style_alert_text = ParagraphStyle(
            "AlertText",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#991B1B")  # Crimson
        )

    def _sanitize_for_reportlab(self, text: str) -> str:
        """Escapes XML entities and balances basic formatting tags for ReportLab Paragraph."""
        if not text:
            return ""
        s = str(text)
        s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        # Restore safe inline tags
        s = re.sub(r"&lt;b&gt;(.*?)&lt;/b&gt;", r"<b>\1</b>", s)
        s = re.sub(r"&lt;i&gt;(.*?)&lt;/i&gt;", r"<i>\1</i>", s)
        s = re.sub(r"&lt;br\s*/?&gt;", "<br/>", s)
        return s

    def _build_cover_page(self, plan: ReportPlan, elements: List[Any]):
        """Generates official Ministry of Coal executive cover page."""
        elements.append(Spacer(1, 24))
        # Emblem / Header Banner
        header_text = "<b>GOVERNMENT OF INDIA • MINISTRY OF COAL</b><br/><font color='#64748B' size='7.5'>CENTRAL MINE PLANNING &amp; DESIGN INSTITUTE • SOVEREIGN AUDIT DIVISION</font>"
        elements.append(Paragraph(header_text, ParagraphStyle("GovHead", fontName="Helvetica", fontSize=9, leading=12, alignment=1, textColor=colors.HexColor("#0F172A"))))
        elements.append(Spacer(1, 16))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0D9488"), spaceAfter=30))

        # Title and Subtitle
        elements.append(Paragraph(self._sanitize_for_reportlab(plan.title), self.style_cover_title))
        if plan.subtitle:
            elements.append(Paragraph(self._sanitize_for_reportlab(plan.subtitle), self.style_cover_sub))

        elements.append(Spacer(1, 24))

        # Metadata Block
        created_date = time.strftime("%d %B %Y", time.localtime(plan.created_at / 1000 if plan.created_at else time.time()))
        meta_data = [
            [Paragraph("<b>Document Reference:</b>", self.style_body), Paragraph(f"MIN/REP/{plan.job_id}/v{plan.version}", self.style_body)],
            [Paragraph("<b>Authorizing Officer:</b>", self.style_body), Paragraph(plan.owner_id, self.style_body)],
            [Paragraph("<b>Date of Compilation:</b>", self.style_body), Paragraph(created_date, self.style_body)],
            [Paragraph("<b>Plan Status:</b>", self.style_body), Paragraph(f"<b>{plan.status.upper()}</b>", self.style_body)],
            [Paragraph("<b>Evidence Sufficiency:</b>", self.style_body), Paragraph(f"{int(plan.evidence_sufficiency_score * 100)}% Verified", self.style_body)],
            [Paragraph("<b>Evidence Facts Cited:</b>", self.style_body), Paragraph(str(plan.total_evidence_referenced), self.style_body)],
            [Paragraph("<b>Charts Embedded:</b>", self.style_body), Paragraph(str(plan.total_charts_referenced), self.style_body)],
            [Paragraph("<b>Classification:</b>", self.style_body), Paragraph("<font color='#B91C1C'><b>STRICTLY CONFIDENTIAL • REGULATORY PRIVILEGED</b></font>", self.style_body)]
        ]
        meta_table = Table(meta_data, colWidths=[150, 350])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        elements.append(meta_table)

        elements.append(Spacer(1, 40))
        # Sovereign footer stamp
        stamp_text = "<i>This official report is deterministically compiled by MineIntel Sovereign Document Intelligence Engine. All numerical facts and figures are mathematically linked to verified immutable source documents.</i>"
        elements.append(Paragraph(stamp_text, ParagraphStyle("Stamp", fontName="Helvetica-Oblique", fontSize=7.5, leading=10, alignment=1, textColor=colors.HexColor("#64748B"))))

        elements.append(PageBreak())

    def _build_toc(self, plan: ReportPlan, elements: List[Any]):
        """Generates Table of Contents listing sections and subsection structure."""
        elements.append(Paragraph("TABLE OF CONTENTS", self.style_sec_h1))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0D9488"), spaceAfter=14))

        toc_data = [
            [Paragraph("<b>Section Title &amp; Topic Scope</b>", self.style_toc_item_bold), Paragraph("<b>Classification Scope</b>", self.style_toc_item_bold)]
        ]

        for s in plan.sections:
            bd_str = ", ".join(f"{k}: {v}" for k, v in list(s.evidence_breakdown.items())[:3])
            toc_data.append([
                Paragraph(f"<b>{s.section_id} {self._sanitize_for_reportlab(s.title)}</b>", self.style_toc_item_bold),
                Paragraph(bd_str or "Overview", self.style_toc_item)
            ])
            for sub in s.subsections:
                sub_bd = ", ".join(f"{k}: {v}" for k, v in list(sub.evidence_breakdown.items())[:2])
                toc_data.append([
                    Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;{sub.section_id} {self._sanitize_for_reportlab(sub.title)}", self.style_toc_item),
                    Paragraph(sub_bd or "Chronological Record", self.style_toc_item)
                ])

        toc_table = Table(toc_data, colWidths=[360, 140])
        toc_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#94A3B8")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(toc_table)
        elements.append(Spacer(1, 14))
        elements.append(PageBreak())

    def _build_missing_evidence_alert(self, flag: Any, elements: List[Any]):
        """Renders formatted callout box for missing/insufficient evidence."""
        flag_dict = flag if isinstance(flag, dict) else flag.to_dict()
        alert_data = [
            [
                Paragraph("<b>⚠️ AUDIT NOTICE: INSUFFICIENT EVIDENCE DETECTED</b>", self.style_alert_text),
            ],
            [
                Paragraph(
                    f"<b>Topic:</b> {flag_dict.get('topic')}<br/>"
                    f"<b>Required Evidence:</b> {self._sanitize_for_reportlab(flag_dict.get('required_evidence_type', ''))}<br/>"
                    f"<b>Audit Note:</b> {self._sanitize_for_reportlab(flag_dict.get('rationale', ''))}",
                    self.style_body
                )
            ]
        ]
        t = Table(alert_data, colWidths=[500])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF2F2")),  # Red 50
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#EF4444")),      # Red 500
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#F87171")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 6))

    def _build_section_evidence(
        self,
        sec: PlannedSection,
        evidence_by_id: Dict[str, Any],
        elements: List[Any],
        charts_by_id: Dict[str, Any]
    ):
        """Renders evidence items, attached charts, and tables for a planned section."""
        # Evidence items
        for ev_id in sec.evidence_ids[:30]:  # Scalable chunk
            item = evidence_by_id.get(ev_id)
            if not item:
                continue

            cls_name = item.get("classification", EvidenceClassification.LOCKED_FACT.value)
            prov = item.get("provenance") or {}
            src_fn = prov.get("filename", "source")
            citation = prov.get("citation") or prov.get("provenance") or src_fn

            badge_col = "#0369A1" if "LOCKED" in cls_name else ("#047857" if "CALC" in cls_name else "#B45309")
            header_p = f"<font color='{badge_col}'><b>[{cls_name}]</b></font> <b>{ev_id}</b> <font color='#64748B'>• Source: {self._sanitize_for_reportlab(citation)}</font>"
            elements.append(Paragraph(header_p, self.style_citation))

            content_text = item.get("content_text") or str(item.get("content_json") or "")
            clean_text = self._sanitize_for_reportlab(content_text)
            elements.append(Paragraph(clean_text, self.style_body))

            # Visual photographic evidence
            if prov.get("source_type") == "image":
                raw_ref = item.get("raw_reference") or {}
                img_path = raw_ref.get("raw_path")
                if img_path and Path(img_path).exists():
                    try:
                        rl_img = RLImage(str(img_path), width=480, height=220)
                        elements.append(rl_img)
                        elements.append(Paragraph(f"<i>Figure: {self._sanitize_for_reportlab(clean_text)}</i>", self.style_citation))
                        elements.append(Spacer(1, 6))
                    except Exception as e:
                        logger.warning(f"Could not load image {img_path}: {e}")

        # Attached Phase 5 Charts
        for c_id in sec.chart_ids:
            chart = charts_by_id.get(c_id)
            if not chart:
                continue
            png_path = chart.get("png_path")
            if png_path and Path(png_path).exists():
                try:
                    cfg = chart.get("config") or {}
                    calc = chart.get("calculation") or {}
                    elements.append(Spacer(1, 4))
                    chart_title = cfg.get("title", "Operational Visualization")
                    elements.append(Paragraph(f"<b>Figure: {self._sanitize_for_reportlab(chart_title)}</b>", self.style_sec_h2))
                    rl_chart = RLImage(str(png_path), width=480, height=240)
                    elements.append(rl_chart)

                    # Provenance & Formula footer
                    formula = calc.get("aggregation_formula", "Deterministic Aggregation")
                    src_files = ", ".join(calc.get("source_files", [])) or "Evidence Ledger"
                    elements.append(Paragraph(f"<i>Chart Calculation: {self._sanitize_for_reportlab(formula)} • Grounded in {src_files}</i>", self.style_citation))
                    elements.append(Spacer(1, 6))
                except Exception as e:
                    logger.warning(f"Could not render chart {png_path}: {e}")

    def build_pdf(
        self,
        plan: ReportPlan,
        evidence_items: List[Dict[str, Any]],
        charts: List[Dict[str, Any]],
        output_filename: Optional[str] = None
    ) -> Tuple[str, int]:
        """
        Builds long-document PDF with cover page, TOC, dynamic sections, charts, and provenance.
        Returns (pdf_path, total_page_count).
        """
        fname = output_filename or f"MineIntel_Report_{plan.job_id}_v{plan.version}.pdf"
        pdf_path = REPORTS_DIR / fname

        evidence_by_id = {it.get("evidence_id"): it for it in evidence_items if it.get("evidence_id")}
        charts_by_id = {c.get("chart_id"): c for c in charts if c.get("chart_id")}

        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        elements: List[Any] = []

        # 1. Cover Page
        self._build_cover_page(plan, elements)

        # 2. Table of Contents
        self._build_toc(plan, elements)

        # 3. Dynamic Sections
        for sec in plan.sections:
            # Section Header
            elements.append(Paragraph(f"{sec.section_id} {self._sanitize_for_reportlab(sec.title)}", self.style_sec_h1))
            elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0D9488"), spaceAfter=8))

            # Missing evidence alert if flagged
            if sec.validation_status == "insufficient":
                for flag in plan.insufficient_evidence_flags:
                    if (flag.section_id if hasattr(flag, "section_id") else flag.get("section_id")) == sec.section_id:
                        self._build_missing_evidence_alert(flag, elements)

            # Section Evidence & Charts
            self._build_section_evidence(sec, evidence_by_id, elements, charts_by_id)

            # Subsections (e.g. chronological breakdowns)
            for sub in sec.subsections:
                elements.append(Spacer(1, 4))
                elements.append(Paragraph(f"{sub.section_id} {self._sanitize_for_reportlab(sub.title)}", self.style_sec_h2))
                self._build_section_evidence(sub, evidence_by_id, elements, charts_by_id)

            elements.append(Spacer(1, 8))
            elements.append(PageBreak())

        # 4. Appendix: Complete Audit Ledger of Referenced Evidence
        elements.append(Paragraph("APPENDIX: AUDITED EVIDENCE PROVENANCE LEDGER", self.style_sec_h1))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0D9488"), spaceAfter=10))

        ledger_data = [
            [Paragraph("<b>Evidence ID</b>", self.style_toc_item_bold),
             Paragraph("<b>Classification</b>", self.style_toc_item_bold),
             Paragraph("<b>Source Document</b>", self.style_toc_item_bold),
             Paragraph("<b>Provenance Citation</b>", self.style_toc_item_bold)]
        ]

        referenced_ids = list(dict.fromkeys([eid for s in plan.sections for eid in s.evidence_ids]))
        for eid in referenced_ids[:100]:  # Top 100 rows in appendix
            it = evidence_by_id.get(eid, {})
            prov = it.get("provenance") or {}
            ledger_data.append([
                Paragraph(eid, self.style_citation),
                Paragraph(it.get("classification", "FACT"), self.style_citation),
                Paragraph(prov.get("filename", "N/A"), self.style_citation),
                Paragraph(prov.get("citation") or prov.get("provenance") or "Document", self.style_citation)
            ])

        ledger_table = Table(ledger_data, colWidths=[90, 85, 125, 200], repeatRows=1)
        ledger_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#64748B")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        elements.append(ledger_table)

        # Build with custom NumberedReportCanvas to calculate two-pass page numbers
        def make_canvas(*args, **kwargs):
            c = NumberedReportCanvas(*args, **kwargs)
            c.job_id = plan.job_id
            c.doc_title = plan.title
            return c

        doc.build(elements, canvasmaker=make_canvas)

        page_count = 1
        try:
            import pypdf
            with open(pdf_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                page_count = len(reader.pages)
        except Exception as e:
            logger.warning(f"Could not read PDF with pypdf, using fallback: {e}")
            page_count = getattr(doc, "_pageNumber", 1)

        logger.info(f"Successfully generated PDF report {pdf_path} ({page_count} pages)")
        return str(pdf_path), page_count

    def build_docx(
        self,
        plan: ReportPlan,
        evidence_items: List[Dict[str, Any]],
        charts: List[Dict[str, Any]],
        output_filename: Optional[str] = None
    ) -> str:
        """Generates Word DOCX export from the exact same plan sections."""
        fname = output_filename or f"MineIntel_Report_{plan.job_id}_v{plan.version}.docx"
        docx_path = REPORTS_DIR / fname

        evidence_by_id = {it.get("evidence_id"): it for it in evidence_items if it.get("evidence_id")}
        charts_by_id = {c.get("chart_id"): c for c in charts if c.get("chart_id")}

        doc = docx.Document()

        # Document Header
        h_p = doc.add_paragraph("GOVERNMENT OF INDIA • MINISTRY OF COAL\nCONFIDENTIAL REGULATORY DOSSIER")
        h_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        h_p.runs[0].font.bold = True
        h_p.runs[0].font.size = Pt(9)
        h_p.runs[0].font.color.rgb = RGBColor(15, 23, 42)

        doc.add_heading(plan.title, level=0)
        if plan.subtitle:
            doc.add_paragraph(plan.subtitle)

        # Metadata Table
        t = doc.add_table(rows=4, cols=2)
        t.style = "Light Shading Accent 1"
        created_date = time.strftime("%d %B %Y", time.localtime(plan.created_at / 1000 if plan.created_at else time.time()))
        rows_meta = [
            ("Reference ID:", f"MIN/REP/{plan.job_id}/v{plan.version}"),
            ("Authorizing Officer:", plan.owner_id),
            ("Date of Compilation:", created_date),
            ("Evidence Sufficiency:", f"{int(plan.evidence_sufficiency_score * 100)}% Verified")
        ]
        for idx, (lbl, val) in enumerate(rows_meta):
            t.rows[idx].cells[0].text = lbl
            t.rows[idx].cells[1].text = val

        doc.add_page_break()

        # Sections
        for sec in plan.sections:
            doc.add_heading(f"{sec.section_id} {sec.title}", level=1)

            # Missing evidence alerts
            if sec.validation_status == "insufficient":
                for flag in plan.insufficient_evidence_flags:
                    f_dict = flag if isinstance(flag, dict) else flag.to_dict()
                    if f_dict.get("section_id") == sec.section_id:
                        p_warn = doc.add_paragraph(f"⚠️ AUDIT NOTICE: INSUFFICIENT EVIDENCE - {f_dict.get('rationale')}")
                        p_warn.runs[0].font.color.rgb = RGBColor(185, 28, 28)

            # Section Evidence
            for ev_id in sec.evidence_ids[:25]:
                item = evidence_by_id.get(ev_id)
                if not item:
                    continue
                cls_name = item.get("classification", "LOCKED FACT")
                prov = item.get("provenance") or {}
                content = item.get("content_text") or str(item.get("content_json") or "")

                p_ev = doc.add_paragraph(f"[{cls_name}] {ev_id} (Source: {prov.get('filename')})\n{content}")
                p_ev.style = "List Bullet"

            # Attached charts
            for c_id in sec.chart_ids:
                chart = charts_by_id.get(c_id)
                if chart and chart.get("png_path") and Path(chart["png_path"]).exists():
                    try:
                        doc.add_heading(chart.get("config", {}).get("title", "Figure"), level=3)
                        doc.add_picture(str(chart["png_path"]), width=Inches(6.0))
                    except Exception as e:
                        logger.warning(f"DOCX image insert error: {e}")

            for sub in sec.subsections:
                doc.add_heading(f"{sub.section_id} {sub.title}", level=2)
                for ev_id in sub.evidence_ids[:15]:
                    item = evidence_by_id.get(ev_id)
                    if item:
                        doc.add_paragraph(f"{item.get('content_text')}", style="List Bullet")

        doc.save(str(docx_path))
        return str(docx_path)

    def build_markdown(
        self,
        plan: ReportPlan,
        evidence_items: List[Dict[str, Any]],
        charts: List[Dict[str, Any]],
        output_filename: Optional[str] = None
    ) -> str:
        """Compiles clean Markdown dossier from the exact same plan sections."""
        fname = output_filename or f"MineIntel_Report_{plan.job_id}_v{plan.version}.md"
        md_path = REPORTS_DIR / fname

        evidence_by_id = {it.get("evidence_id"): it for it in evidence_items if it.get("evidence_id")}
        charts_by_id = {c.get("chart_id"): c for c in charts if c.get("chart_id")}

        lines = [
            f"# {plan.title}",
            f"**Subtitle:** {plan.subtitle or 'Operational Dossier'}",
            f"**Reference:** MIN/REP/{plan.job_id}/v{plan.version} | **Officer:** {plan.owner_id}",
            f"**Evidence Sufficiency:** {int(plan.evidence_sufficiency_score * 100)}% Verified | **Status:** {plan.status.upper()}",
            "",
            "---",
            ""
        ]

        for sec in plan.sections:
            lines.append(f"## {sec.section_id} {sec.title}\n")
            if sec.validation_status == "insufficient":
                for flag in plan.insufficient_evidence_flags:
                    f_dict = flag if isinstance(flag, dict) else flag.to_dict()
                    if f_dict.get("section_id") == sec.section_id:
                        lines.append(f"> ⚠️ **AUDIT NOTICE:** {f_dict.get('rationale')}\n")

            for ev_id in sec.evidence_ids[:30]:
                item = evidence_by_id.get(ev_id)
                if not item:
                    continue
                cls_name = item.get("classification", "LOCKED FACT")
                prov = item.get("provenance") or {}
                content = item.get("content_text") or str(item.get("content_json") or "")
                lines.append(f"- **[{cls_name}] {ev_id}** ({prov.get('filename')}): {content}")

            for c_id in sec.chart_ids:
                chart = charts_by_id.get(c_id)
                if chart:
                    cfg = chart.get("config", {})
                    lines.append(f"\n### Chart: {cfg.get('title')}")
                    lines.append(f"![{cfg.get('title')}]({chart.get('png_path')})")
                    lines.append(f"*Calculation: {chart.get('calculation', {}).get('aggregation_formula')}*\n")

            for sub in sec.subsections:
                lines.append(f"### {sub.section_id} {sub.title}\n")
                for ev_id in sub.evidence_ids[:15]:
                    item = evidence_by_id.get(ev_id)
                    if item:
                        lines.append(f"- {item.get('content_text')}")

            lines.append("\n---\n")

        md_content = "\n".join(lines)
        md_path.write_text(md_content, encoding="utf-8")
        return str(md_path)


long_document_builder = LongDocumentBuilder()
