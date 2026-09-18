import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, Loader2, Plus } from 'lucide-react';
import { ReportItem } from '../../types';
import { getApiBaseUrl } from '../../services/config';

interface ExportViewProps {
  report?: ReportItem;
  onOpenPreview: () => void;
  onCreateNewReport: () => void;
}

const API_BASE = getApiBaseUrl();
type ExportFormat = 'pdf' | 'word';

export const ExportView: React.FC<ExportViewProps> = ({ report, onOpenPreview, onCreateNewReport }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [download, setDownload] = useState<{ url: string; filename: string } | null>(null);

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0d121c] p-6">
        <div className="max-w-md text-center border border-[#233145] bg-[#111722] rounded-lg p-8 shadow-xl">
          <FileText className="w-10 h-10 mx-auto text-slate-500 mb-4" />
          <h1 className="text-lg font-bold text-slate-100">No Report Available</h1>
          <p className="text-sm text-slate-400 mt-2">Generate a report before choosing an export format.</p>
          <button type="button" onClick={onCreateNewReport} className="mt-6 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Create New Report</button>
        </div>
      </div>
    );
  }

  const handleRunExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setDownload(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/reports/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportFormat,
          report_title: report.name,
          job_id: report.id,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== 'success' || !data.download_url) {
        throw new Error(data.message || data.detail || `Export failed (${response.status})`);
      }
      setDownload({ url: `${API_BASE}${data.download_url}`, filename: data.filename });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'The report could not be exported.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatLabel = exportFormat === 'pdf' ? 'PDF' : 'DOCX';
  return (
    <div className="min-h-full p-6 max-w-4xl mx-auto space-y-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="border-b border-[#233145] pb-5">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider"><Download className="w-4 h-4" /> Final report</div>
          <h1 className="text-xl font-bold text-slate-100 mt-2">{report.name}</h1>
          <p className="text-sm text-slate-400 mt-1">Your generated report is ready to export.</p>
        </div>

        <section className="bg-[#111722] border border-[#1e2a3b] rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100">1. Choose format</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {([['pdf', 'PDF', 'Best for official sharing and printing.'], ['word', 'DOCX', 'Editable Microsoft Word document.']] as const).map(([value, label, description]) => (
              <button key={value} type="button" onClick={() => setExportFormat(value)} className={`text-left rounded-lg border p-4 transition ${exportFormat === value ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500' : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/50'}`}>
                <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-blue-400" /><span className="font-bold text-slate-100">{label}</span>{exportFormat === value && <span className="ml-auto text-[10px] text-blue-300 font-mono">SELECTED</span>}</div>
                <p className="text-xs text-slate-400 mt-2">{description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-[#111722] border border-[#1e2a3b] rounded-lg p-5">
          <h2 className="text-sm font-bold text-slate-100">2. Export</h2>
          <p className="text-xs text-slate-400 mt-2">The generated artifact will be downloaded through your browser.</p>
          <button type="button" onClick={handleRunExport} disabled={isExporting} className="mt-4 px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm inline-flex items-center gap-2">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? `Exporting ${formatLabel}…` : `Export ${formatLabel}`}
          </button>
        </section>

        {exportError && <div className="border border-red-800 bg-red-950/40 rounded-lg p-4 text-sm text-red-200 flex gap-3"><AlertTriangle className="w-5 h-5 text-red-400 shrink-0" /><div><strong>Export failed</strong><p className="mt-1">{exportError}</p></div></div>}
        {download && <div className="border border-emerald-700 bg-emerald-950/30 rounded-lg p-5"><div className="flex items-center gap-2 text-emerald-300 font-bold"><CheckCircle2 className="w-5 h-5" /> Report exported successfully.</div><a href={download.url} download={download.filename} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"><Download className="w-4 h-4" /> Download Report</a><button type="button" onClick={() => setDownload(null)} className="ml-3 text-xs text-slate-300 underline">Export Another Format</button></div>}

        <div className="flex justify-between"><button type="button" onClick={onOpenPreview} className="text-xs text-blue-300 hover:text-blue-200 underline">Back to Preview</button></div>
      </div>
    </div>
  );
};
