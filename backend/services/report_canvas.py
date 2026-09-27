"""
MineIntel Phase 7: Dynamic Numbered Report Canvas

Two-pass canvas for ReportLab that dynamically computes total page numbers
and renders running headers and footers across arbitrary document lengths (1 to 400+ pages).
"""

import datetime
try:
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas
    CanvasBase = canvas.Canvas if isinstance(canvas.Canvas, type) else object
except Exception:
    CanvasBase = object


class NumberedReportCanvas(CanvasBase):
    """
    Two-pass canvas that intercepts showPage() to record state,
    calculates total page count, and renders professional corporate running headers/footers
    on every page except the cover page.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.doc_title = "Executive Operational Dossier"
        self.job_id = "N/A"
        self.report_date = datetime.date.today().strftime("%B %d, %Y")
        self.org_name = "Ministry of Coal"
        self.margin_left = 36
        self.margin_right = 576

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            # Skip running header/footer on cover page (page 1)
            if self._pageNumber > 1:
                self._draw_running_header()
                self._draw_running_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def _draw_running_header(self):
        self.saveState()
        x_left = getattr(self, "margin_left", 36)
        x_right = getattr(self, "margin_right", 576)

        # Header Left: Corporate Dossier & Organization Name in Navy Blue (#002147)
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#002147"))
        org_title = getattr(self, "org_name", "Ministry of Coal").upper()
        self.drawString(x_left, 792 - 34, f"EXECUTIVE OPERATIONAL DOSSIER  |  {org_title}")

        # Header Right: Strictly Confidential in Slate Grey (#708090)
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#708090"))
        self.drawRightString(x_right, 792 - 34, "STRICTLY CONFIDENTIAL")

        # Header dividing line in Corporate Gold (#D4AF37)
        self.setStrokeColor(colors.HexColor("#D4AF37"))
        self.setLineWidth(1.0)
        self.line(x_left, 792 - 38, x_right, 792 - 38)
        self.restoreState()

    def _draw_running_footer(self, total_pages: int):
        self.saveState()
        x_left = getattr(self, "margin_left", 36)
        x_right = getattr(self, "margin_right", 576)

        # Footer dividing line in Slate Grey (#CBD5E1)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(x_left, 42, x_right, 42)

        # Contents: [Report Title] | [Page X of Y] | [Current Date] | [Confidential]
        clean_title = getattr(self, "doc_title", "Executive Operational Dossier")
        if len(clean_title) > 36:
            clean_title = clean_title[:33] + "..."
        date_str = getattr(self, "report_date", datetime.date.today().strftime("%B %d, %Y"))
        page_str = f"Page {self._pageNumber} of {total_pages}"
        
        # Consistent centered footer containing [Report Title] | [Page X of Y] | [Current Date] | [Confidential]
        footer_line = f"{clean_title} | {page_str} | {date_str} | Confidential"
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#708090"))
        self.drawCentredString((x_left + x_right) / 2.0, 28, footer_line)
        self.restoreState()
