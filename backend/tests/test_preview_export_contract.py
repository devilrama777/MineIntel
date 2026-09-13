from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
APP = (ROOT / "src/App.tsx").read_text(encoding="utf-8")
PREVIEW = (ROOT / "src/components/views/ReportPreviewView.tsx").read_text(encoding="utf-8")
EXPORT = (ROOT / "src/components/views/ExportView.tsx").read_text(encoding="utf-8")
SERVICE = (ROOT / "src/services/reportService.ts").read_text(encoding="utf-8")


class TestPreviewExportContract(unittest.TestCase):
    def test_no_fabricated_active_report_fallback(self):
        self.assertIn("const activeReport = reports.find((r) => r.id === selectedReportId) || reports[0];", APP)
        self.assertIn('title="No Report Available"', PREVIEW)
        self.assertIn("Generate a report before choosing an export format.", EXPORT)
        self.assertIn("onCreateNewReport", PREVIEW)
        self.assertIn("onCreateNewReport", EXPORT)

    def test_preview_loads_real_artifact(self):
        self.assertIn("/api/reports/${encodeURIComponent(report.id)}", PREVIEW)
        self.assertIn("data.final_report", PREVIEW)
        self.assertNotIn("totalPages = 4", PREVIEW)
        self.assertNotIn("42.6 MT", PREVIEW)

    def test_export_is_browser_download_only_and_uses_report_id(self):
        self.assertIn("job_id: report.id", EXPORT)
        self.assertIn("formatLabel = exportFormat === 'pdf' ? 'PDF' : 'DOCX'", EXPORT)
        self.assertIn("Export ${formatLabel}", EXPORT)
        self.assertIn("download={download.filename}", EXPORT)
        for forbidden in ("C:\\\\Users", "Desktop", "Documents", "Downloads", "Browse Other", "savedPath", "open-file"):
            self.assertNotIn(forbidden, EXPORT)

    def test_history_mapping_does_not_invent_report_metrics(self):
        self.assertIn("sectionsCount: r.sections_count || 0", SERVICE)
        self.assertIn("wordCount: r.word_count || 0", SERVICE)
        self.assertIn("sourcesLinkedCount: r.sources_count || 0", SERVICE)
        self.assertIn("validationScore: r.validation_score || 0", SERVICE)


if __name__ == "__main__":
    unittest.main()
