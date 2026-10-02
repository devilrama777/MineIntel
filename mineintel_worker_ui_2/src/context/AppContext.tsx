import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  ReportItem,
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
  ingestFile: (file: File) => Promise<void>;
  deleteFile: (id: string) => void;
  startGeneratingReport: () => void;
  cancelProcessing: () => void;
  deleteReport: (id: string) => void;
  updateReportMarkdown: (id: string, newMarkdown: string) => void;
  updateProfile: (updated: Partial<UserProfile>) => void;
  changePassword: (currentPass: string, newPass: string) => boolean;
  logoutAllDevices: () => void;
  toggleAiMode: () => void;
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
  const [reports, setReports] = useState<ReportItem[]>(initialReports);
  const [files, setFiles] = useState<FileSourceItem[]>(initialFiles);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(['src-01', 'src-02', 'src-03']);
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

  const ingestFile = async (file: File) => {
    console.log('POST /api/ingest/upload', { name: file.name, size: file.size, type: file.type });
    const ext = file.name.split('.').pop()?.toUpperCase() || 'TXT';
    let fileType: FileSourceItem['type'] = 'TXT';
    if (['PDF'].includes(ext)) fileType = 'PDF';
    else if (['XLSX', 'XLS'].includes(ext)) fileType = 'XLSX';
    else if (['CSV'].includes(ext)) fileType = 'CSV';
    else if (['DOCX', 'DOC'].includes(ext)) fileType = 'DOCX';
    else if (['PNG'].includes(ext)) fileType = 'PNG';
    else if (['JPG', 'JPEG'].includes(ext)) fileType = 'JPG';

    const sizeInMB = file.size / (1024 * 1024);
    const sizeStr = sizeInMB >= 1 ? `${sizeInMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;

    const now = new Date();
    const dateStr = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newSource: FileSourceItem = {
      id: `src-${Date.now().toString().slice(-4)}`,
      name: file.name,
      type: fileType,
      size: sizeStr,
      bytes: file.size,
      uploadedAt: dateStr,
      status: 'Ingested',
      tags: ['Operational', 'Direct-Ingest'],
    };

    setFiles((prev) => [newSource, ...prev]);
    setSelectedFileIds((prev) => [newSource.id, ...prev]);
    showToast('File Ingested', `${file.name} successfully registered to local workspace.`, 'success');
  };

  const deleteFile = (id: string) => {
    console.log(`DELETE /api/ingest/files/${id}`);
    const file = files.find((f) => f.id === id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedFileIds((prev) => prev.filter((item) => item !== id));
    showToast('Source Removed', `${file?.name || 'File'} removed from repository.`, 'info');
  };

  const startGeneratingReport = () => {
    console.log('POST /api/generate-report', {
      sourceIds: selectedFileIds,
      templateId: selectedTemplateId,
      officerId: user.officerId,
      timestamp: new Date().toISOString(),
    });

    const newReportId = `RPT-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(reports.length + 1).padStart(3, '0')}`;
    setTargetReportId(newReportId);
    setIsProcessing(true);
    setProgress(0);
    setStageIndex(1);
    setStageName(STAGES[0].name);
    setSubStatus(STAGES[0].subStatuses[0]);
    setElapsedSeconds(0);

    // Elapsed timer
    const startSec = Date.now();
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startSec) / 1000));
    }, 1000);

    // Sub-status cycle every 2s
    let subIdx = 0;
    subStatusTimerRef.current = window.setInterval(() => {
      subIdx++;
      setStageIndex((currentStage) => {
        const stageObj = STAGES[currentStage - 1] || STAGES[0];
        const statusItem = stageObj.subStatuses[subIdx % stageObj.subStatuses.length];
        setSubStatus(statusItem);
        return currentStage;
      });
    }, 2000);

    // Progress step simulation (advances to 100% over ~7 seconds)
    const intervalTime = 70;
    processingTimerRef.current = window.setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          if (processingTimerRef.current) clearInterval(processingTimerRef.current);
          return 100;
        }
        const increment = old < 30 ? 2.5 : old < 70 ? 1.5 : old < 90 ? 1.2 : 0.8;
        const next = Math.min(100, Math.round((old + increment) * 10) / 10);

        // Update stage based on progress
        const stageNum = next < 20 ? 1 : next < 45 ? 2 : next < 70 ? 3 : next < 90 ? 4 : 5;
        setStageIndex(stageNum);
        setStageName(STAGES[stageNum - 1].name);

        return next;
      });
    }, intervalTime);
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

  // When progress reaches 100, finalize new report creation using selected template
  useEffect(() => {
    if (progress >= 100 && isProcessing && targetReportId) {
      if (processingTimerRef.current) clearInterval(processingTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      if (subStatusTimerRef.current) clearInterval(subStatusTimerRef.current);

      const now = new Date();
      const dateStr = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const selectedSources = files.filter((f) => selectedFileIds.includes(f.id));
      const sourceNames = selectedSources.map((s) => s.name).join(', ') || 'Operational Telemetry';

      const activeTmpl =
        CIL_REPORT_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
        CIL_REPORT_TEMPLATES[0];

      const generatedMarkdown = activeTmpl.markdownTemplate({
        id: targetReportId,
        officerName: user.name,
        officerId: user.officerId,
        region: user.region,
        dateStr,
        sourcesText: sourceNames,
      });

      let reportCategory: ReportItem['category'] = 'Safety Audit';
      if (activeTmpl.category === 'Mining Operations') reportCategory = 'Geotechnical';
      else if (activeTmpl.category === 'Production & Dispatch') reportCategory = 'Production';
      else if (activeTmpl.category === 'Quality & Beneficiation') reportCategory = 'Production';
      else if (activeTmpl.category === 'Asset & Fleet') reportCategory = 'Maintenance';
      else if (activeTmpl.category === 'Safety & Statutory') reportCategory = 'Safety Audit';
      else if (activeTmpl.category === 'Financial & Capex') reportCategory = 'DGMS Compliance';
      else if (activeTmpl.category === 'Project & Planning') reportCategory = 'Geotechnical';
      else if (activeTmpl.category === 'Workforce & HR') reportCategory = 'Safety Audit';

      const newReport: ReportItem = {
        id: targetReportId,
        title: `${activeTmpl.name} - ${user.region}`,
        category: reportCategory,
        status: 'Pending',
        createdAt: dateStr,
        timestamp: now.toISOString(),
        summary: `Official ${activeTmpl.annexure} filing (${activeTmpl.relevance}) compiled from ${selectedFileIds.length} ingested telemetry assets (${sourceNames}).`,
        sourcesCount: selectedFileIds.length,
        wordCount: 1680,
        pagesCount: 8,
        author: user.name,
        fileSizeEstimate: '2.5 MB',
        markdownContent: generatedMarkdown,
      };

      setReports((prev) => [newReport, ...prev]);
    }
  }, [progress, isProcessing, targetReportId]);

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

  const updateProfile = (updated: Partial<UserProfile>) => {
    console.log('PATCH /api/auth/profile', updated);
    setUser((prev) => ({ ...prev, ...updated }));
    showToast('Profile Updated', 'Officer credentials and details saved.', 'success');
  };

  const changePassword = (currentPass: string, newPass: string) => {
    console.log('POST /api/auth/password', { officerId: user.officerId });
    if (!currentPass || !newPass) {
      showToast('Validation Error', 'Please supply both current and new password.', 'error');
      return false;
    }
    if (newPass.length < 8) {
      showToast('Weak Password', 'New password must have at least 8 characters.', 'error');
      return false;
    }
    showToast('Password Changed', 'Security credentials updated for active session.', 'success');
    return true;
  };

  const logoutAllDevices = () => {
    console.log('POST /api/auth/logout', { officerId: user.officerId, scope: 'all_devices' });
    showToast('Sessions Terminated', 'All active tokens across officer devices revoked.', 'warning');
  };

  const toggleAiMode = () => {
    const nextMode = settings.aiMode === 'online' ? 'offline' : 'online';
    console.log('POST /api/settings/ai-mode', { mode: nextMode });
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
