import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, FileText, Loader2, Plus, Printer } from 'lucide-react';
import { ReportItem } from '../../types';
import { getApiBaseUrl } from '../../services/config';

interface ReportPreviewViewProps {
  report?: ReportItem;
  onNavigateToExport: () => void;
  onCreateNewReport: () => void;
}

const API_BASE = getApiBaseUrl();

type PreviewState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; content: string }
  | { status: 'error'; message: string };

export const ReportPreviewView: React.FC<ReportPreviewViewProps> = ({
  report,
  onNavigateToExport,
  onCreateNewReport,
}) => {
  const [state, setState] = useState<PreviewState>({ status: report ? 'loading' : 'empty' });

  useEffect(() => {
    let cancelled = false;
    if (!report) {
      setState({ status: 'empty' });
      return () => {
        cancelled = true;
      };
    }

    setState({ status: 'loading' });
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(report.id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || 'The generated report could not be loaded.');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const content = typeof data.final_report === 'string' ? data.final_report.trim() : '';
        if (!content) {
          setState({ status: 'error', message: 'This report has no generated preview artifact yet.' });
        } else {
          setState({ status: 'ready', content });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ status: 'error', message: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [report]);

  if (state.status === 'empty') {
    return (
      <EmptyPreviewState
        title="No Report Available"
        message="Generate a report to preview it here."
        onCreateNewReport={onCreateNewReport}
      />
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0b0f17] text-slate-300">
        <div className="flex items-center gap-2 text-sm font-mono"><Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Loading generated report…</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <EmptyPreviewState
        title="Preview Unavailable"
        message={state.message}
        onCreateNewReport={onCreateNewReport}
        error
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0f17] p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-[#233145] pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider"><FileText className="w-4 h-4" /> Generated report preview</div>
            <h1 className="text-lg font-bold text-slate-100 truncate mt-1">{report?.name}</h1>
            <p className="text-xs text-slate-400 mt-1">{report?.description || 'Current generated report artifact'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded border border-slate-700 bg-slate-800 text-slate-200 text-xs font-mono flex items-center gap-2"><Printer className="w-3.5 h-3.5" /> Print</button>
            <button type="button" onClick={onNavigateToExport} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Export Report</button>
          </div>
        </div>
        <pre className="whitespace-pre-wrap select-text bg-white text-slate-900 rounded shadow-xl p-8 min-h-[70vh] text-sm leading-relaxed font-sans">{state.content}</pre>
      </div>
    </div>
  );
};

const EmptyPreviewState: React.FC<{
  title: string;
  message: string;
  onCreateNewReport: () => void;
  error?: boolean;
}> = ({ title, message, onCreateNewReport, error = false }) => (
  <div className="flex-1 flex items-center justify-center bg-[#0b0f17] p-6">
    <div className="max-w-md text-center border border-[#233145] bg-[#111722] rounded-lg p-8 shadow-xl">
      {error ? <AlertTriangle className="w-10 h-10 mx-auto text-amber-400 mb-4" /> : <FileText className="w-10 h-10 mx-auto text-slate-500 mb-4" />}
      <h1 className="text-lg font-bold text-slate-100">{title}</h1>
      <p className="text-sm text-slate-400 mt-2">{message}</p>
      <button type="button" onClick={onCreateNewReport} className="mt-6 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Create New Report</button>
    </div>
  </div>
);
