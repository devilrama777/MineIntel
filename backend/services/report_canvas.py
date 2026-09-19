"""
MineIntel Phase 7: Dynamic Numbered Report Canvas

Two-pass canvas for ReportLab that dynamically computes total page numbers
and renders running headers and footers across arbitrary document lengths (1 to 400+ pages).
"""

from reportlab.lib import colors
from reportlab.pdfgen import canvas


class NumberedReportCanvas(canvas.Canvas):
    """
    Two-pass canvas that intercepts showPage() to record state,
    calculates total page count, and renders running headers/footers.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.doc_title = "MineIntel Executive Intelligence Dossier"
        self.job_id = "N/A"

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
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#0F172A"))  # Slate 900
        self.drawString(54, 792 - 36, "GOVERNMENT OF INDIA • MINISTRY OF COAL")

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))  # Slate 500
        self.drawRightString(612 - 54, 792 - 36, "CONFIDENTIAL REGULATORY DOSSIER")

        # Header thin dividing line
        self.setStrokeColor(colors.HexColor("#CBD5E1"))  # Slate 300
        self.setLineWidth(0.75)
        self.line(54, 792 - 42, 612 - 54, 792 - 42)
        self.restoreState()

    def _draw_running_footer(self, total_pages: int):
        self.saveState()
        # Footer dividing line
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(54, 46, 612 - 54, 46)

        # Footer Left: Platform & Job ID
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 32, f"MineIntel Sovereign Intelligence Engine • Ref: {self.job_id}")

        # Footer Right: Page X of Y
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#0F172A"))
        self.drawRightString(612 - 54, 32, page_str)
        self.restoreState()
