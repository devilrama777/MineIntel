import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../../shared/services/config';
import { authService } from '../../shared/services/authService';
import {
  Edit3,
  Download,
  ArrowLeft,
  Send,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ReportItem } from '../types';

export const ReportPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReportById, updateReportMarkdown, submitForReview } = useApp();

  const API_BASE = getApiBaseUrl();
  const localReport = getReportById(id || '');
  const [fetchedReport, setFetchedReport] = useState<ReportItem | null>(null);
  const [isLoadingFetch, setIsLoadingFetch] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (localReport || !id) return;
    setIsLoadingFetch(true);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
          headers: authService.getAuthHeader(),
        });
        if (!res.ok) throw new Error(`Report ${id} not found (${res.status})`);
        const data = await res.json();
        const md = data.raw_markdown || data.reportMarkdown || '';
        const mapped: ReportItem = {
          id: data.report_id || id,
          title: data.metadata?.title || `Report ${id.slice(0, 8)}`,
          category: 'Safety Audit',
          status: 'Draft',
          createdAt: new Date().toLocaleString('en-IN'),
          timestamp: new Date().toISOString(),
          summary: '',
          sourcesCount: 0,
          wordCount: md.split(/\s+/).length,
          pagesCount: data.metadata?.page_count || 1,
          author: 'You',
          fileSizeEstimate: '2.4 MB',
          markdownContent: md,
        };
        setFetchedReport(mapped);
      } catch (err: any) {
        setFetchError(err.message);
      } finally {
        setIsLoadingFetch(false);
      }
    })();
  }, [id, localReport, API_BASE]);

  const report = localReport || fetchedReport;

  const [isEditMode, setIsEditMode] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProposal, setAiProposal] = useState<{ original: string; proposed: string } | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfCompiling, setPdfCompiling] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    const load = async () => {
      if (!report) return;
      setPdfError(null);
      setPdfCompiling(true);
      try {
        // Try PDF first
        let res = await fetch(
          `${API_BASE}/api/reports/${report.id}/download?format=pdf`,
          { headers: authService.getAuthHeader() }
        );
        if (!res.ok) {
          // Trigger compilation via markdown export endpoint
          try {
            await fetch(`${API_BASE}/api/reports/export-markdown-pdf`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authService.getAuthHeader() },
              body: JSON.stringify({
                report_id: report.id,
                job_id: report.id,
                markdown_content: report.markdownContent || '',
                document_title: report.title,
              }),
            });
            // Retry PDF
            res = await fetch(
              `${API_BASE}/api/reports/${report.id}/download?format=pdf`,
              { headers: authService.getAuthHeader() }
            );
          } catch {}
        }
        if (!res.ok) throw new Error(`PDF unavailable (${res.status})`);
        const blob = await res.blob();
        if (blob.size < 200) throw new Error('PDF too small — likely empty');
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
        setPdfError(null);
      } catch (err: any) {
        setPdfError(err.message || 'PDF compile pending.');
      } finally {
        setPdfCompiling(false);
      }
    };
    load();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [report?.id, API_BASE]);

  const handleProposeEdit = async () => {
    if (!report || !aiInstruction.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/agent/quick-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authService.getAuthHeader() },
        body: JSON.stringify({
          instruction: aiInstruction,
          current_text: report.markdownContent,
        }),
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setAiProposal({
          original: report.markdownContent,
          proposed: data.edited_text || data.text || report.markdownContent,
        });
      } else {
        setAiProposal({
          original: report.markdownContent,
          proposed: `${report.markdownContent}\n\n> **AI Edit Note:** ${aiInstruction}`,
        });
      }
    } catch {
      setAiProposal({
        original: report.markdownContent,
        proposed: `${report.markdownContent}\n\n> **AI Edit Note:** ${aiInstruction}`,
      });
    } finally {
      setAiBusy(false);
    }
  };

  if (!report && isLoadingFetch) {
    return (
      <div className="mine-card p-8 text-center">
        <p className="text-sm text-slate-400">Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mine-card p-8 sm:p-16 text-center">
        <h3 className="text-lg font-semibold text-white">Report Not Found</h3>
        <p className="text-xs text-slate-400 mt-2">
          {fetchError || `The requested report ${id} does not exist.`}
        </p>
        <button
          onClick={() => navigate('/worker/my-reports')}
          className="btn-action mt-4 px-4 py-2 rounded-xl bg-slate-800 text-xs text-[#00D9FF]"
        >
          Return to Reports
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="mine-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#00D9FF]/15 text-[#00D9FF]">
                {report.id}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {report.createdAt} · {report.sourcesCount} sources
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-semibold text-white truncate mt-1">
              {report.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setIsEditMode(true)}
            className="btn-action flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 text-xs font-semibold cursor-pointer">
            <Edit3 className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>AI Edit</span>
          </button>

          <button onClick={() => navigate(`/worker/export/${report.id}`)}
            className="btn-action flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D9FF] to-blue-600 text-slate-950 text-xs font-semibold cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {report.status === 'Draft' || report.status === 'Ready' ? (
            <button onClick={async () => {
              await submitForReview(report.id);
              navigate('/worker/my-reports');
            }}
              className="btn-action flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer">
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Approval</span>
            </button>
          ) : report.status === 'Pending' ? (
            <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              ⏳ Awaiting Master Review
            </div>
          ) : report.status === 'Approved' ? (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              ✓ Approved
            </div>
          ) : report.status === 'Rejected' ? (
            <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              ✗ Rejected
            </div>
          ) : null}
        </div>
      </div>

      {/* Main PDF Area */}
      <div className="mine-card overflow-hidden p-4">
        {isEditMode ? (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">AI-Assisted Edit</h3>
            <textarea value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder="Describe the change you want..."
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-[#00D9FF]" />
            <button onClick={handleProposeEdit}
              disabled={aiBusy || !aiInstruction.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D9FF] to-blue-600 text-slate-950 font-semibold text-xs cursor-pointer disabled:opacity-50">
              {aiBusy ? 'Proposing...' : 'Propose Edit'}
            </button>
            {aiProposal && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/30 text-xs whitespace-pre-wrap font-mono text-slate-200">
                  {aiProposal.proposed}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => {
                    updateReportMarkdown(report.id, aiProposal.proposed);
                    setAiProposal(null);
                    setIsEditMode(false);
                  }} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer hover:bg-emerald-500">
                    Accept & Save
                  </button>
                  <button onClick={() => { setAiProposal(null); setIsEditMode(false); }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer hover:bg-slate-700">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full min-h-[800px]">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-[calc(100vh-220px)] rounded-lg bg-white border border-[#00D9FF]/15" title="Report PDF" />
            ) : (
              <div className="p-16 text-center">
                <div className="inline-block w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-slate-400">
                  {pdfCompiling ? 'Compiling official PDF...' : (pdfError || 'PDF compile pending...')}
                </p>
                <button onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-xs text-[#00D9FF] cursor-pointer hover:bg-slate-700">
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
