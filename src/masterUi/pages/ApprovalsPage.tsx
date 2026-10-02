import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  AlertTriangle,
  RefreshCw,
  X,
  ChevronRight,
  Eye,
  Loader2,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { getApiBaseUrl } from '../../shared/services/config';
import { authService } from '../../shared/services/authService';

const API_BASE = getApiBaseUrl();

const fetchReportContent = async (taskId: string) => {
  try {
    // Try report directly
    let res = await fetch(`${API_BASE}/api/reports/${taskId}`, {
      headers: { ...authService.getAuthHeader() },
    });
    if (res.ok) {
      return await res.json();
    }
    // Fall back to job history endpoint
    res = await fetch(`${API_BASE}/api/reports/job/${taskId}/history`, {
      headers: { ...authService.getAuthHeader() },
    });
    if (res.ok) {
      const data = await res.json();
      const reports = data.reports || [];
      if (reports.length > 0) {
        const newest = reports[0];
        // Fetch full markdown
        const mdRes = await fetch(
          `${API_BASE}/api/reports/${newest.report_id}/download?format=md`,
          { headers: { ...authService.getAuthHeader() } }
        );
        const md = mdRes.ok ? await mdRes.text() : '';
        return {
          report_id: newest.report_id,
          metadata: newest,
          raw_markdown: md,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
};

interface PendingTask {
  task_id: string;
  owner_id: string;
  status: string;
  created_at: number;
  submitted_for_review_at?: number | null;
  updated_at?: number;
  structured_state?: {
    template_name?: string;
    template_id?: string;
    [key: string]: any;
  };
  instruction?: string;
}

export const ApprovalsPage: React.FC = () => {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<PendingTask | null>(null);

  // Drawer state
  const [reportMarkdown, setReportMarkdown] = useState<string>('');
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchPendingTasks = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/agent/tasks/pending-review`, {
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server responded with ${res.status}`);
      }
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pending reviews');
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingTasks();
    const interval = setInterval(() => {
      fetchPendingTasks(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchPendingTasks]);

  // Load report markdown when a task is selected
  useEffect(() => {
    if (!selectedTask) {
      setReportMarkdown('');
      setRejectReason('');
      setIsRejecting(false);
      setActionError(null);
      return;
    }

    const loadReportContent = async () => {
      setIsReportLoading(true);
      setActionError(null);
      try {
        const data = await fetchReportContent(selectedTask.task_id);
        if (!data) {
          throw new Error('Report document not found or still compiling');
        }
        const md = data.content || data.reportMarkdown || data.final_report || data.raw_markdown || '';
        setReportMarkdown(md || 'No markdown content available for this report.');
      } catch (err: any) {
        setReportMarkdown(`*Note: Could not retrieve rendered markdown (${err.message}). The task metadata can still be reviewed.*`);
      } finally {
        setIsReportLoading(false);
      }
    };

    loadReportContent();
  }, [selectedTask]);

  const handleApprove = async (taskId: string) => {
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/api/agent/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to approve task');
      }
      setSelectedTask(null);
      await fetchPendingTasks();
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve task');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReject = async (taskId: string) => {
    if (rejectReason.trim().length < 10) {
      setActionError('Rejection reason must be at least 10 characters long.');
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/api/agent/tasks/${taskId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to reject task');
      }
      setSelectedTask(null);
      await fetchPendingTasks();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject task');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const formatTimestamp = (ts?: number | null) => {
    if (!ts) return 'Pending Review';
    const date = new Date(ts);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-[#00D9FF]" />
              Regulatory Approvals
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
              {tasks.length} Pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review and officially sign off or reject statutory dossiers submitted by field workers.
          </p>
        </div>

        <button
          onClick={() => fetchPendingTasks()}
          disabled={isLoading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 hover:text-white transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00D9FF]' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading && tasks.length === 0 ? (
        <div className="mine-card p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin mb-3" />
          <p className="text-xs font-mono text-slate-400">Loading pending reviews from sovereign agent store...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="mine-card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-white">No pending approvals</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            All submitted field dossiers and statutory filings have been reviewed. New submissions will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="mine-card overflow-hidden border border-slate-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Report Dossier</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4">Submission Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {tasks.map((task) => {
                  const title =
                    task.structured_state?.template_name ||
                    task.instruction ||
                    `Task #${task.task_id.slice(0, 12)}`;
                  const isCurrent = selectedTask?.task_id === task.task_id;

                  return (
                    <tr
                      key={task.task_id}
                      onClick={() => setSelectedTask(task)}
                      className={`hover:bg-[#00D9FF]/5 transition-colors cursor-pointer group ${
                        isCurrent ? 'bg-[#00D9FF]/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-[#00D9FF] shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-[#00D9FF] transition-colors">
                              {title}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                              ID: {task.task_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{task.owner_id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatTimestamp(task.submitted_for_review_at || task.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          PENDING REVIEW
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-[#00D9FF] hover:text-slate-950 text-cyan-300 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side Drawer for Review */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-[#070b14] border-l border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#00D9FF] mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>STATUTORY AUDIT REVIEW</span>
                </div>
                <h3 className="text-base font-bold text-white truncate max-w-md">
                  {selectedTask.structured_state?.template_name || selectedTask.instruction || 'Dossier Review'}
                </h3>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Author: <span className="text-slate-200">{selectedTask.owner_id}</span> · Ref: {selectedTask.task_id}
                </div>
              </div>

              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Error Banner */}
            {actionError && (
              <div className="p-3 mx-5 mt-4 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Drawer Body (Markdown Preview) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isReportLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="w-7 h-7 text-[#00D9FF] animate-spin mb-2" />
                  <span className="text-xs font-mono">Loading report document...</span>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none text-slate-200 font-sans leading-relaxed">
                  <Markdown>{reportMarkdown}</Markdown>
                </div>
              )}
            </div>

            {/* Rejection input when toggled */}
            {isRejecting && (
              <div className="p-5 border-t border-slate-800/80 bg-red-950/20 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-red-300">
                  <span>Enter Rejection Reason (Mandatory, min 10 characters):</span>
                  <button
                    onClick={() => {
                      setIsRejecting(false);
                      setRejectReason('');
                      setActionError(null);
                    }}
                    className="text-slate-400 hover:text-white text-[11px] underline"
                  >
                    Cancel
                  </button>
                </div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this report fails statutory criteria or requires revision..."
                  rows={3}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-red-800/60 font-sans text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleReject(selectedTask.task_id)}
                    disabled={isSubmittingAction || rejectReason.trim().length < 10}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {isSubmittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}

            {/* Drawer Footer Actions */}
            {!isRejecting && (
              <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
                <button
                  onClick={() => setIsRejecting(true)}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-800/50 hover:bg-rose-900/60 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  Reject with Reason
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTask(null)}
                    disabled={isSubmittingAction}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleApprove(selectedTask.task_id)}
                    disabled={isSubmittingAction}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-slate-950 transition-colors inline-flex items-center gap-2 shadow-[0_0_15px_rgba(0,217,255,0.3)] cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAction ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-slate-950" />
                    )}
                    Approve Dossier
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
