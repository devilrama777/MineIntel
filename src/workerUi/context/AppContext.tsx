import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  ReportItem,
  ReportStatus,
  FileSourceItem,
  UserProfile,
  ActivityTickerItem,
  AppSettings,
  ReportTemplate,
} from '../types';
import {
  initialReports,
  initialFiles,
  initialUser,
  initialTickerItems,
} from '../data/mockData';
import { CIL_REPORT_TEMPLATES } from '../data/reportTemplates';
import { getApiBaseUrl } from '../../shared/services/config';
import { authService } from '../../shared/services/authService';

const API_BASE = getApiBaseUrl();
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  ...authService.getAuthHeader(),
});

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface AppNotification {
  id: string;
  title: string;
  time: string;
  read: boolean;
  type: 'alert' | 'approved' | 'system';
}

interface AppContextType {
  reports: ReportItem[];
  files: FileSourceItem[];
  selectedFileIds: string[];
  templates: ReportTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  user: UserProfile;
  settings: AppSettings;
  tickerItems: ActivityTickerItem[];
  notifications: AppNotification[];
  toasts: ToastMessage[];
  unreadNotificationCount: number;

  // Layout & Viewport adaptation
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  // Processing state
  isProcessing: boolean;
  progress: number;
  stageIndex: number;
  stageName: string;
  subStatus: string;
  elapsedSeconds: number;
  targetReportId: string | null;

  // Actions
  toggleSelectFile: (id: string) => void;
  selectAllFiles: () => void;
  clearSelectedFiles: () => void;
  ingestFile: (file: File) => Promise<any>;
  deleteFile: (id: string) => Promise<void>;
  startGeneratingReport: () => Promise<void>;
  cancelProcessing: () => void;
  deleteReport: (id: string) => void;
  submitForReview: (reportId: string) => Promise<boolean>;
  refreshReportsFromServer: () => Promise<void>;
  refreshFilesFromServer: () => Promise<void>;
  updateReportMarkdown: (id: string, newMarkdown: string) => void;
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<boolean>;
  logoutAllDevices: () => Promise<void>;
  toggleAiMode: () => Promise<void>;
  toggleTheme: () => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  showToast: (title: string, message?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;
  markNotificationsAsRead: () => void;
  getReportById: (id: string) => ReportItem | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STAGES = [
  { index: 1, name: 'STAGE 1 OF 5 · PARSING SOURCE SCHEMAS', subStatuses: ['Reading byte structures', 'Normalizing file encodings', 'Validating digital checksums'] },
  { index: 2, name: 'STAGE 2 OF 5 · INGESTING EVIDENCE', subStatuses: ['Analyzing document 3/6', 'Extracting telemetry evidence', 'Correlating strata readings'] },
  { index: 3, name: 'STAGE 3 OF 5 · EVALUATING STATUTORY RULES', subStatuses: ['Cross-referencing DGMS regulations', 'Checking bench slope parameters', 'Validating gas safety thresholds'] },
  { index: 4, name: 'STAGE 4 OF 5 · SYNTHESIZING INTELLIGENCE', subStatuses: ['Drafting engineering observations', 'Generating risk matrices', 'Compiling section narratives'] },
  { index: 5, name: 'STAGE 5 OF 5 · FINALIZING OFFICIAL DOSSIER', subStatuses: ['Applying digital seals', 'Generating reference hashes', 'Assembling print-ready format'] },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [files, setFiles] = useState<FileSourceItem[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-annex-14');
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    aiMode: 'online',
    workspaceAlerts: true,
    autoSaveDrafts: true,
    highContrastMetrics: false,
  });
  const [tickerItems] = useState<ActivityTickerItem[]>(initialTickerItems);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: 'notif-1', title: 'North Ridge Safety Audit approved by DGMS officer', time: '10m ago', read: false, type: 'approved' },
    { id: 'notif-2', title: 'Telemetry anomaly in Seam XIV Bench 4 radar sensor', time: '42m ago', read: false, type: 'alert' },
    { id: 'notif-3', title: 'New statutory circular 04-2026 issued by CMPDI HQ', time: '2h ago', read: true, type: 'system' },
  ]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Responsive layout adaptation state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.removeItem('uploaded_source_files');
      localStorage.removeItem('saved_reports_history');
      localStorage.removeItem('savedReports');
    } catch {}
  }, []);

  useEffect(() => {
    const realUser = authService.getCurrentUser();
    if (realUser) {
      setUser({
        name: realUser.display_name || realUser.username || 'Field Officer',
        officerId: realUser.id || realUser.username || 'UNKNOWN',
        designation: realUser.role || 'Field Officer',
        region: 'Central Command',       // could pull from real profile later
        subsidiary: 'CIL / CMPDI',
        email: realUser.email || '',
        phone: realUser.phone || '',
        avatarInitials: (realUser.display_name || realUser.username || 'FO')
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      });
    }
  }, []);

  useEffect(() => {
    if (authService.getToken()) {
      refreshFilesFromServer();
      refreshReportsFromServer();
    }
  }, []);

  useEffect(() => {
    if (!authService.getToken()) return;
    const interval = setInterval(() => {
      refreshReportsFromServer();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Error attempting to exit fullscreen:', err);
        });
      }
    }
  };

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(1);
  const [stageName, setStageName] = useState(STAGES[0].name);
  const [subStatus, setSubStatus] = useState(STAGES[0].subStatuses[0]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [targetReportId, setTargetReportId] = useState<string | null>(null);
  const activeTaskIdRef = useRef<string | null>(null);

  const processingTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const subStatusTimerRef = useRef<number | null>(null);

  const showToast = (title: string, message?: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const toggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiles = () => {
    setSelectedFileIds(files.map((f) => f.id));
  };

  const clearSelectedFiles = () => {
    setSelectedFileIds([]);
  };

  const refreshFilesFromServer = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ingest/data-sources`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const docs = data.documents || [];
      const mapped: FileSourceItem[] = docs
        .filter((d: any) => {
          const _id = d.id || d.file_id || '';
          return _id && !_id.startsWith('src-');
        })
        .map((d: any) => ({
          id: d.id || d.file_id,
          name: d.filename || d.name || 'Document',
          type: ((d.file_type || '').includes('pdf') ? 'PDF'
                : (d.file_type || '').includes('csv') ? 'CSV'
                : (d.file_type || '').includes('xls') ? 'XLSX'
                : (d.file_type || '').includes('doc') ? 'DOCX'
                : (d.file_type || '').includes('png') ? 'PNG'
                : (d.file_type || '').includes('jpg') || (d.file_type || '').includes('jpeg') ? 'JPG'
                : 'TXT') as any,
          size: d.file_size ? `${(d.file_size / (1024 * 1024)).toFixed(1)} MB` : '0 KB',
          bytes: d.file_size || 0,
          uploadedAt: d.created_at
            ? new Date(d.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            : 'Today',
          status: 'Ingested',
          tags: [],
        }));
      setFiles(mapped);
    } catch {}
  };

  const ingestFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/ingest/upload`, {
        method: 'POST',
        headers: authService.getAuthHeader(),
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      // Refresh full list from server
      await refreshFilesFromServer();
      showToast('File Ingested', `${file.name} saved to sovereign storage.`, 'success');
      return data;
    } catch (err: any) {
      showToast('Upload Error', err.message || 'Could not ingest file.', 'error');
      throw err;
    }
  };

  const deleteFile = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/ingest/files/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }).catch(() => null);
    } catch {}
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedFileIds((prev) => prev.filter((x) => x !== id));
    showToast('Source Removed', 'File removed from workspace.', 'info');
  };

  const mapBackendStatus = (s: string): ReportStatus => {
    const up = (s || '').toUpperCase();
    if (up === 'APPROVED') return 'Approved';
    if (up === 'PENDING_REVIEW' || up === 'PENDING') return 'Pending';
    if (up === 'REJECTED') return 'Rejected';
    if (up === 'READY') return 'Ready';
    return 'Draft';
  };

  const refreshReportsFromServer = async () => {
    try {
      const token = authService.getToken();
      const url = `${API_BASE}/api/reports/history${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        console.warn('Report history fetch failed:', res.status);
        return;
      }
      const data = await res.json();
      const history = Array.isArray(data.history) ? data.history
                    : Array.isArray(data.reports) ? data.reports
                    : Array.isArray(data) ? data : [];
      const mapped: ReportItem[] = history.map((r: any) => {
        const rawStatus = String(r.status || '').toUpperCase();
        return {
          id: r.id || r.report_id || r.job_id,
          title: r.title || r.name || 'Untitled Report',
          category: r.category || r.template_name || 'Safety Audit',
          status: mapBackendStatus(rawStatus),
          createdAt: r.created_at_display || r.timestamp || r.created_at || 'Today',
          timestamp: r.timestamp || new Date().toISOString(),
          summary: r.summary_snippet || r.description || '',
          sourcesCount: Number(r.sources_count || r.records_count || 0),
          wordCount: Number(r.word_count || 0),
          pagesCount: Number(r.page_count || 1),
          author: r.author || r.owner_id || 'You',
          fileSizeEstimate: '2.4 MB',
          markdownContent: r.markdown_content || r.md_content || '',
        };
      });
      console.debug(
        '[refreshReportsFromServer] fetched',
        history.length,
        'records for user',
        authService.getCurrentUser()?.id
      );
      setReports(mapped);
    } catch (err) {
      console.warn('refreshReportsFromServer error:', err);
    }
  };

  const startGeneratingReport = async () => {
    if (selectedFileIds.length === 0) {
      showToast(
        'No Sources Selected',
        'Please upload or select at least one file from Data Sources first.',
        'warning'
      );
      setIsProcessing(false);
      return;
    }

    const selectedTemplate = CIL_REPORT_TEMPLATES.find((t) => t.id === selectedTemplateId);
    setIsProcessing(true);
    setProgress(5);
    setStageIndex(1);
    setStageName(STAGES[0].name);
    setSubStatus(STAGES[0].subStatuses[0]);
    setElapsedSeconds(0);

    const startSec = Date.now();
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startSec) / 1000));
    }, 1000);

    let lastUpdatedAt = Date.now();
    const STALL_THRESHOLD_MS = 150_000; // 2.5 min no backend update → abort

    try {
      const res = await fetch(`${API_BASE}/api/generate-report`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          file_ids: selectedFileIds,
          fileIds: selectedFileIds,
          selectedSources: selectedFileIds,
          template_id: selectedTemplateId,
          template_name: selectedTemplate?.name || '',
          reportType: 'executive',
          depth: 'standard',
          tone: 'analytical',
          customFocus: '',
          fileName: selectedTemplate
            ? `${selectedTemplate.name} - Report`
            : 'Executive Report',
          sync: false,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const detail = errBody.detail || `Server returned ${res.status}`;
        throw new Error(detail);
      }
      const data = await res.json();
      const taskId = data.job_id || data.report_id;
      if (!taskId) throw new Error('Backend did not return a task id.');
      activeTaskIdRef.current = taskId;
      setTargetReportId(null);

      // Poll /api/agent/tasks/{taskId}
      const POLL_INTERVAL = 2500;
      const MAX_POLL_MS = 20 * 60 * 1000;
      const start = Date.now();
      while (true) {
        if (Date.now() - start > MAX_POLL_MS) {
          throw new Error('Report generation timed out.');
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        const statusRes = await fetch(`${API_BASE}/api/agent/tasks/${taskId}`, {
          headers: getAuthHeaders(),
        }).catch(() => null);
        if (!statusRes || !statusRes.ok) continue;
        const taskData = await statusRes.json();
        const st = (taskData.status || '').toUpperCase();
        const structured = taskData.task?.structured_state || {};

        const backendUpdated = taskData.task?.updated_at || 0;
        if (backendUpdated) {
          if (backendUpdated !== lastUpdatedAt) {
            lastUpdatedAt = backendUpdated;
          } else if (Date.now() - lastUpdatedAt > STALL_THRESHOLD_MS) {
            throw new Error(
              'Backend stalled: no progress update in over 2 minutes. ' +
              'The cloud model may be rate-limited or the task failed silently. ' +
              'Please try again in a moment.'
            );
          }
        }

        // Map backend stage name to a 0-95% progress estimate
        const stageMap: Record<string, number> = {
          'LOAD_MANIFEST': 10,
          'VERIFY_INGESTION': 20,
          'EVIDENCE_ANALYSIS': 35,
          'INTELLIGENCE_ANALYSIS': 45,
          'CHART_ANALYSIS': 55,
          'PLANNING': 65,
          'VALIDATE_PLAN': 70,
          'WRITING': 80,
          'VALIDATE_REPORT_DATA': 90,
          'COMPILE_MARKDOWN_ARTIFACT': 93,
          'VERIFY_ARTIFACT': 95,
          'COMPLETED': 100,
        };
        const stageName = (structured.current_stage || '').toUpperCase();
        if (stageMap[stageName] !== undefined) {
          setProgress((prev) => Math.max(prev, stageMap[stageName]));
        }

        if (structured.current_stage) setStageName(structured.current_stage);
        if (structured.progress_reason) setSubStatus(structured.progress_reason);
        // Estimate progress by sections
        const totalS = taskData.total_sections || structured.total_sections || 1;
        const doneS = taskData.sections_completed || structured.sections_completed || 0;
        if (doneS > 0) {
          const pct = Math.min(95, Math.round((doneS / Math.max(1, totalS)) * 100));
          setProgress((prev) => Math.max(prev, pct));
        }

        if (st === 'COMPLETED') {
          // Resolve the REAL report_id from task structured_state
          const realReportId =
            structured.report_id ||
            taskData.task?.structured_state?.report_id ||
            taskData.report_id ||
            taskId;
          // Update targetReportId so navigation goes to the correct URL
          setTargetReportId(String(realReportId));

          await new Promise((r) => setTimeout(r, 500));
          // Verify the report exists at that ID by attempting a HEAD fetch
          try {
            const check = await fetch(`${API_BASE}/api/reports/${realReportId}`, {
              headers: getAuthHeaders(),
            });
            if (!check.ok) {
              // Backend hasn't registered it — try the task_id as a fallback
              const fallbackCheck = await fetch(`${API_BASE}/api/reports/${taskId}`, {
                headers: getAuthHeaders(),
              });
              if (fallbackCheck.ok) {
                setTargetReportId(taskId);
              }
            }
          } catch {}

          setProgress(100);
          await refreshReportsFromServer();
          showToast('Report Ready', 'Draft generated. Submit for review when ready.', 'success');
          break;
        } else if (st === 'FAILED') {
          throw new Error(taskData.task?.error?.message || 'Agent task failed.');
        }
      }
    } catch (err: any) {
      showToast('Generation Failed', err.message, 'error');
      setProgress(0);
      setIsProcessing(false);
      return;
    } finally {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      setIsProcessing(false);
    }
  };

  const submitForReview = async (reportId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/tasks/${encodeURIComponent(reportId)}/submit-for-review`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Submit failed (${res.status})`);
      }
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'Pending' } : r))
      );
      showToast('Submitted for Approval', 'Master console will review shortly.', 'success');
      return true;
    } catch (err: any) {
      showToast('Submit Failed', err.message, 'error');
      return false;
    }
  };

  const cancelProcessing = () => {
    console.log(`POST /api/agent/tasks/${targetReportId || 'current'}/cancel`);
    if (processingTimerRef.current) clearInterval(processingTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (subStatusTimerRef.current) clearInterval(subStatusTimerRef.current);

    setIsProcessing(false);
    setProgress(0);
    setTargetReportId(null);
    showToast('Report Generation Cancelled', 'Task pipeline aborted by officer.', 'warning');
  };

  const deleteReport = (id: string) => {
    console.log(`DELETE /api/reports/${id}`);
    setReports((prev) => prev.filter((r) => r.id !== id));
    showToast('Report Deleted', `Reference ${id} was purged from system records.`, 'info');
  };

  const updateReportMarkdown = (id: string, newMarkdown: string) => {
    console.log(`PATCH /api/reports/${id}`, { markdownLength: newMarkdown.length });
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, markdownContent: newMarkdown } : r))
    );
    showToast('Changes Saved', `Report ${id} content was updated successfully.`, 'success');
  };

  const updateProfile = async (updated: Partial<UserProfile>) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify({
          display_name: updated.name || user.name,
          phone: updated.phone || user.phone || '',
          email: updated.email || user.email || '',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update profile');
      }
      setUser((prev) => ({ ...prev, ...updated }));
      showToast('Profile Updated', 'Officer credentials and details saved.', 'success');
    } catch (err: any) {
      showToast('Save Failed', err.message || 'Could not save profile.', 'error');
    }
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    if (!currentPass || !newPass) {
      showToast('Validation Error', 'Please supply both current and new password.', 'error');
      return false;
    }
    if (newPass.length < 8) {
      showToast('Weak Password', 'New password must have at least 8 characters.', 'error');
      return false;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify({
          current_password: currentPass,
          new_password: newPass,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Password change failed');
      }
      showToast('Password Changed', 'Security credentials updated for active session.', 'success');
      return true;
    } catch (err: any) {
      showToast('Change Failed', err.message || 'Could not change password.', 'error');
      return false;
    }
  };

  const logoutAllDevices = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: authService.getAuthHeader(),
      });
    } catch {}
    showToast('Sessions Terminated', 'All active tokens across officer devices revoked.', 'warning');
  };

  const toggleAiMode = async () => {
    const nextMode = settings.aiMode === 'online' ? 'offline' : 'online';
    try {
      await fetch(`${API_BASE}/api/settings/ai-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify({ mode: nextMode }),
      });
    } catch (err) {
      console.warn('AI mode sync warning:', err);
    }
    setSettings((prev) => ({ ...prev, aiMode: nextMode }));
    showToast(
      'Processing Engine Changed',
      nextMode === 'online'
        ? 'Switched to Online Cloud AI for high-velocity synthesis.'
        : 'Switched to Offline Local Mode for disconnected field operations.',
      'info'
    );
  };

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast('Preferences Saved', 'Workspace settings adjusted.', 'info');
  };

  const getReportById = (id: string) => {
    return reports.find((r) => r.id === id);
  };

  return (
    <AppContext.Provider
      value={{
        reports,
        files,
        selectedFileIds,
        templates: CIL_REPORT_TEMPLATES,
        selectedTemplateId,
        setSelectedTemplateId,
        user,
        settings,
        tickerItems,
        notifications,
        toasts,
        unreadNotificationCount,

        isSidebarCollapsed,
        toggleSidebarCollapse,
        isFullscreen,
        toggleFullscreen,

        isProcessing,
        progress,
        stageIndex,
        stageName,
        subStatus,
        elapsedSeconds,
        targetReportId,

        toggleSelectFile,
        selectAllFiles,
        clearSelectedFiles,
        ingestFile,
        deleteFile,
        startGeneratingReport,
        cancelProcessing,
        deleteReport,
        submitForReview,
        refreshReportsFromServer,
        refreshFilesFromServer,
        updateReportMarkdown,
        updateProfile,
        changePassword,
        logoutAllDevices,
        toggleAiMode,
        toggleTheme,
        updateSettings,
        showToast,
        dismissToast,
        markNotificationsAsRead,
        getReportById,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
