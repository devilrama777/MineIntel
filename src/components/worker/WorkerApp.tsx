import React, { useState, useEffect } from 'react';
import { 
  Header 
} from './Header';
import { 
  ProcessingOverlay 
} from './ProcessingOverlay';
import { 
  ReportViewer 
} from './ReportViewer';
import { 
  ReportHistoryDrawer 
} from './ReportHistoryDrawer';
import { 
  MineIntelLogo 
} from './MineIntelLogo';
import { 
  IntelligenceVisualCore 
} from './IntelligenceVisualCore';
import { 
  Sidebar 
} from './Sidebar';
import { 
  PdfSlidePreviewView 
} from './PdfSlidePreviewView';
import { 
  ExportSection 
} from './ExportSection';
import { 
  DataSourceView 
} from './DataSourceView';
import { 
  UploadedFilesList 
} from './UploadedFilesList';
import { 
  AIGenerateEngine 
} from './AIGenerateEngine';
import { 
  AuthenticatedUserProfileView 
} from './AuthenticatedUserProfileView';
import { 
  SettingsView 
} from '../views/SettingsView';
import { 
  SAMPLE_DOCUMENTS 
} from './sampleDocuments';
import { 
  GeneratedReport, 
  ReportType, 
  ReportDepth, 
  ReportTone, 
  SampleDocument,
  ActiveView,
  UploadedDataSourceFile
} from './types';
import { 
  Sparkles, 
  FileText, 
  ShieldCheck, 
  Zap, 
  AlertCircle,
  CheckCircle2,
  Layers,
  FileCheck
} from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { desktopService } from '../../services/reportService';

function ensureFileObject(item: { name: string; type?: string; file?: File; fileBase64?: string; rawText?: string }): File {
  if (item.file instanceof File) {
    return item.file;
  }
  if (item.fileBase64 && item.fileBase64.startsWith('data:')) {
    const arr = item.fileBase64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || item.type || 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], item.name, { type: mime });
  }
  const content = item.rawText || '';
  return new File([content], item.name.endsWith('.md') || item.name.endsWith('.txt') ? item.name : `${item.name}.txt`, {
    type: item.type || 'text/plain',
  });
}

export function WorkerApp() {
  const { user, logout } = useAuth();
  // Theme State
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      const body = document.body;
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
        body.classList.add('dark');
        body.classList.remove('light');
        localStorage.setItem('theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
        body.classList.remove('dark');
        body.classList.add('light');
        localStorage.setItem('theme', 'light');
      }
    } catch (e) {
      console.error('Theme sync error:', e);
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Document & File State
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // Uploaded Files in Data Source Repository (displayed in New Report)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDataSourceFile[]>(() => {
    try {
      const saved = localStorage.getItem('uploaded_source_files');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Real user files only; zero synthetic demonstration documents
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('uploaded_source_files', JSON.stringify(uploadedFiles));
    } catch (e) {
      console.error('Failed to persist uploaded files:', e);
    }
  }, [uploadedFiles]);

  // Initial workspace starts clean with no pre-selected documents

  // Configuration State
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [depth, setDepth] = useState<ReportDepth>('standard');
  const [tone, setTone] = useState<ReportTone>('analytical');
  const [customFocus, setCustomFocus] = useState<string>('');

  // Execution & Output State
  const [activeView, setActiveView] = useState<ActiveView>('editor');
  const [taskStatus, setTaskStatus] = useState<'IDLE' | 'PENDING' | 'RUNNING' | 'AWAITING_INPUT' | 'VALIDATING' | 'RETRYING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const isProcessing = taskStatus !== 'IDLE' && taskStatus !== 'COMPLETED' && taskStatus !== 'FAILED';
  const [sectionsCompleted, setSectionsCompleted] = useState<number>(0);
  const [totalSections, setTotalSections] = useState<number>(0);
  const [activeSections, setActiveSections] = useState<string[]>([]);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);

  // History Drawer State
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Saved Reports History
  const [reportsHistory, setReportsHistory] = useState<GeneratedReport[]>(() => {
    try {
      const saved = localStorage.getItem('saved_reports_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('saved_reports_history', JSON.stringify(reportsHistory));
    } catch (e) {
      console.error('Failed to persist reports history:', e);
    }
  }, [reportsHistory]);

  // Staged files for multi-file upload in Data Source
  const [stagedFiles, setStagedFiles] = useState<UploadedDataSourceFile[]>([]);

  // Multi-document selection in New Report repository (starts empty)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [currentTool, setCurrentTool] = useState<string>('');
  const [currentStage, setCurrentStage] = useState<string>('');
  const [progressReason, setProgressReason] = useState<string>('');

  useEffect(() => {
    setSelectedFileIds((prev) => prev.filter((id) => uploadedFiles.some((f) => f.id === id)));
  }, [uploadedFiles]);

  const toggleSelectFile = (fileId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSelectAllFiles = () => {
    setSelectedFileIds(uploadedFiles.map((f) => f.id));
  };

  const handleClearFileSelection = () => {
    setSelectedFileIds([]);
  };

  const handleGenerateSelectedReports = async () => {
    const selected = uploadedFiles.filter((f) => selectedFileIds.includes(f.id));
    if (selected.length === 0) {
      setErrorMessage('Please select at least one document to generate a report.');
      return;
    }
    await executeReportGeneration({ selectedDocs: selected });
  };

  const handleGenerateAllReports = async () => {
    if (uploadedFiles.length === 0) {
      setErrorMessage('No documents available in repository to generate a report.');
      return;
    }
    await executeReportGeneration({ selectedDocs: uploadedFiles });
  };

  // Handle multiple files selection in Data Source Upload Document & Ingest
  const handleFilesSelected = (files: File[]) => {
    setErrorMessage(null);
    files.forEach((file) => {
      const isBinary = file.type.includes('pdf') || 
                       file.type.includes('image') || 
                       file.name.endsWith('.docx') || 
                       file.name.endsWith('.xlsx') || 
                       file.name.endsWith('.xls') || 
                       file.name.endsWith('.doc');

      const reader = new FileReader();
      if (isBinary) {
        reader.onload = () => {
          const result = reader.result as string;
          const newDoc: UploadedDataSourceFile = {
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
            fileBase64: result,
            file,
          };
          setStagedFiles((prev) => [...prev.filter((f) => f.name !== file.name), newDoc]);
          setUploadedFiles((prev) => [newDoc, ...prev.filter((f) => f.name !== file.name)]);
          setFileName((prev) => prev || file.name);
          setFileType((prev) => prev || file.type || 'application/octet-stream');
          setFileSize((prev) => prev ?? file.size);
          setFileBase64((prev) => prev || result);
          setActiveFileId(newDoc.id);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const text = reader.result as string;
          const newDoc: UploadedDataSourceFile = {
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: file.type || 'text/plain',
            size: file.size,
            uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
            rawText: text,
            file,
          };
          setStagedFiles((prev) => [...prev.filter((f) => f.name !== file.name), newDoc]);
          setUploadedFiles((prev) => [newDoc, ...prev.filter((f) => f.name !== file.name)]);
          setFileName((prev) => prev || file.name);
          setFileType((prev) => prev || file.type || 'text/plain');
          setFileSize((prev) => prev ?? file.size);
          setRawText((prev) => prev || text);
          setActiveFileId(newDoc.id);
        };
        reader.readAsText(file);
      }
    });
    showToast(`${files.length} document${files.length > 1 ? 's' : ''} staged for ingestion!`);
  };

  const handleRemoveStagedFile = (fileId: string) => {
    setStagedFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== fileId);
      if (filtered.length === 0) {
        setFileName('');
        setFileType('');
        setFileSize(undefined);
        setFileBase64('');
        setRawText('');
        setActiveFileId(null);
      } else if (activeFileId === fileId) {
        const next = filtered[0];
        setFileName(next.name);
        setFileType(next.type);
        setFileSize(next.size);
        setFileBase64(next.fileBase64 || '');
        setRawText(next.rawText || '');
        setActiveFileId(next.id);
      }
      return filtered;
    });
  };

  const handleClearStagedFiles = () => {
    setStagedFiles([]);
    setFileName('');
    setFileType('');
    setFileSize(undefined);
    setFileBase64('');
    setRawText('');
    setActiveFileId(null);
    setErrorMessage(null);
  };

  // Handle file selection in Data Source Upload Document & Ingest (single file)
  const handleFileSelected = (file: File) => {
    setFileName(file.name);
    setFileType(file.type || 'application/octet-stream');
    setFileSize(file.size);
    setErrorMessage(null);

    const reader = new FileReader();

    if (file.type.includes('pdf') || file.type.includes('image') || file.name.endsWith('.docx') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.doc')) {
      reader.onload = () => {
        const result = reader.result as string;
        setFileBase64(result);
        setRawText('');

        const newDoc: UploadedDataSourceFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: file.type || 'application/pdf',
          size: file.size,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
          fileBase64: result,
          file,
        };
        setUploadedFiles((prev) => [newDoc, ...prev.filter((f) => f.name !== file.name)]);
        setStagedFiles([newDoc]);
        setActiveFileId(newDoc.id);
        showToast(`Document "${file.name}" ingested and added to repository!`);
      };
      reader.readAsDataURL(file);
    } else {
      // Text, Markdown, CSV
      reader.onload = () => {
        const text = reader.result as string;
        setRawText(text);
        setFileBase64('');

        const newDoc: UploadedDataSourceFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
          rawText: text,
          file,
        };
        setUploadedFiles((prev) => [newDoc, ...prev.filter((f) => f.name !== file.name)]);
        setStagedFiles([newDoc]);
        setActiveFileId(newDoc.id);
        showToast(`Document "${file.name}" ingested and added to repository!`);
      };
      reader.readAsText(file);
    }
  };

  const handleClearFile = () => {
    setFileName('');
    setFileType('');
    setFileSize(undefined);
    setFileBase64('');
    setRawText('');
    setStagedFiles([]);
    setActiveFileId(null);
    setErrorMessage(null);
  };

  const handleSelectSample = (sample: SampleDocument) => {
    setFileName(sample.fileName);
    setFileType('application/pdf');
    setFileSize(sample.content.length * 2);
    setRawText(sample.content);
    setFileBase64('');
    setErrorMessage(null);

    const sampleDoc: UploadedDataSourceFile = {
      id: `sample-${sample.id}`,
      name: sample.fileName,
      type: 'application/pdf',
      size: sample.content.length * 2,
      uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
      rawText: sample.content,
    };
    setUploadedFiles((prev) => [sampleDoc, ...prev.filter((f) => f.name !== sample.fileName)]);
    setActiveFileId(sampleDoc.id);

    // Auto-prime tailored executive prompt into the AI prompt generator
    if (sample.category.toLowerCase().includes('finan')) {
      setCustomFocus('Extract an exhaustive financial audit analyzing quarterly revenue growth, EBITDA margin trends, OpEx variances, and cash flow projections.');
    } else if (sample.category.toLowerCase().includes('tech') || sample.category.toLowerCase().includes('eng')) {
      setCustomFocus('Execute a deep technical synthesis evaluating architectural bottlenecks, multi-system interoperability, failover safeguards, and latency SLAs.');
    } else if (sample.category.toLowerCase().includes('bio') || sample.category.toLowerCase().includes('health')) {
      setCustomFocus('Synthesize clinical efficacy endpoints, adverse event safety profiles, placebo variance, and regulatory approval pathways.');
    } else {
      setCustomFocus('Perform a thorough risk and compliance assessment detailing high-impact vulnerability vectors, regulatory checkpoints, and rapid remediation protocols.');
    }
    showToast(`Sample document "${sample.fileName}" ingested and added to repository!`);
  };

  // Manage uploaded files in repository
  const handleSelectUploadedFile = (fileItem: UploadedDataSourceFile) => {
    setFileName(fileItem.name);
    setFileType(fileItem.type);
    setFileSize(fileItem.size);
    setFileBase64(fileItem.fileBase64 || '');
    setRawText(fileItem.rawText || '');
    setActiveFileId(fileItem.id);
  };

  const handleDeleteUploadedFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (activeFileId === fileId) {
      handleClearFile();
    }
    showToast('Document removed from repository.');
  };

  // Core Report Generation
  const executeReportGeneration = async (options?: {
    targetFile?: {
      name: string;
      type: string;
      fileBase64?: string;
      rawText?: string;
      file?: File;
    };
    selectedDocs?: UploadedDataSourceFile[];
  }) => {
    let filesToProcess: File[] = [];
    let reportTitle = '';

    if (options?.targetFile) {
      // 1. Single document passed explicitly (e.g. from table row action)
      filesToProcess = [ensureFileObject(options.targetFile)];
      reportTitle = `Executive Audit: ${options.targetFile.name}`;
    } else if (options?.selectedDocs && options.selectedDocs.length > 0) {
      // 2. Specific multi-document set passed explicitly
      filesToProcess = options.selectedDocs.map(ensureFileObject);
      reportTitle = filesToProcess.length === 1
        ? `Executive Audit: ${options.selectedDocs[0].name}`
        : `Multi-Source Dossier (${filesToProcess.length} Ingested Documents)`;
    } else if (selectedFileIds.length > 0) {
      // 3. User selected documents from multi-select checkboxes
      const selected = uploadedFiles.filter((f) => selectedFileIds.includes(f.id));
      if (selected.length > 0) {
        filesToProcess = selected.map(ensureFileObject);
        reportTitle = filesToProcess.length === 1
          ? `Executive Audit: ${selected[0].name}`
          : `Multi-Source Dossier (${filesToProcess.length} Ingested Documents)`;
      }
    } else if (stagedFiles.length > 0) {
      filesToProcess = stagedFiles.map(ensureFileObject);
      reportTitle = stagedFiles.length === 1
        ? `Executive Audit: ${stagedFiles[0].name}`
        : `Multi-Source Dossier (${stagedFiles.length} Ingested Documents)`;
    } else if (activeFileId) {
      const active = uploadedFiles.find((f) => f.id === activeFileId);
      if (active) {
        filesToProcess = [ensureFileObject(active)];
        reportTitle = `Executive Audit: ${active.name}`;
      }
    } else if (fileBase64 || (rawText && rawText.trim().length > 0)) {
      filesToProcess = [ensureFileObject({
        name: fileName || 'Direct Text Input',
        type: fileType || 'text/plain',
        fileBase64: fileBase64 || undefined,
        rawText: rawText || undefined,
      })];
      reportTitle = `Executive Audit: ${fileName || 'Direct Text Input'}`;
    }

    if (filesToProcess.length === 0) {
      setErrorMessage('Please upload or select at least one document to analyze.');
      return;
    }

    setTaskStatus('PENDING');
    setCurrentTool('');
    setCurrentStage('');
    setProgressReason('');
    setSectionsCompleted(0);
    setTotalSections(0);
    setActiveSections([]);
    setCompletedSections([]);
    setErrorMessage(null);

    try {
      // Execute the sovereign pipeline via Agent Task Orchestration
      const result = await desktopService.runPipelineWithFiles(
        filesToProcess,
        customFocus,
        reportTitle,
        (status, detail) => {
          setTaskStatus(status);
          if (detail?.currentTool !== undefined) {
            setCurrentTool(detail.currentTool || '');
          }
          if (detail?.currentStage !== undefined) {
            setCurrentStage(detail.currentStage || '');
          }
          if (detail?.progressReason !== undefined) {
            setProgressReason(detail.progressReason || '');
          }
          if (detail?.sections_completed !== undefined) {
            setSectionsCompleted(detail.sections_completed);
          }
          if (detail?.total_sections !== undefined) {
            setTotalSections(detail.total_sections);
          }
          if (detail?.active_sections !== undefined) {
            setActiveSections(detail.active_sections);
          }
          if (detail?.completed_sections !== undefined) {
            setCompletedSections(detail.completed_sections);
          }
        }
      );

      const newReport: GeneratedReport = {
        id: result.report_id || result.job_id,
        jobId: result.job_id,
        reportId: result.report_id,
        fileName: reportTitle,
        fileType: 'application/pdf',
        reportMarkdown: result.markdown_content,
        metadata: result.metadata,
        customFocus,
      };

      setCurrentReport(newReport);
      setActiveView('preview');
      setReportsHistory((prev) => [newReport, ...prev.slice(0, 19)]); // keep last 20
      showToast('Executive report synthesized successfully! Viewing in Preview.');
      scrollToTop();
    } catch (err: any) {
      console.error('Report synthesis failed:', err);
      setErrorMessage(err.message || 'Failed to synthesize document into report. Please check API credentials.');
      setTaskStatus('FAILED');
    } finally {
      if (taskStatus !== 'FAILED') {
        setTaskStatus('IDLE');
      }
    }
  };

  const handleGenerateReport = async () => {
    await executeReportGeneration();
  };

  // Real backend report artifact downloader
  const handleDownloadExport = async (format: 'pdf' | 'docx') => {
    try {
      showToast(`Retrieving generated ${format.toUpperCase()} report...`);
      const targetReportId = currentReport?.reportId || (currentReport?.id && !currentReport.id.startsWith('job_') ? currentReport.id : '');
      const targetJobId = currentReport?.jobId || (currentReport?.id?.startsWith('job_') ? currentReport.id : '');

      if (!targetReportId && !targetJobId) {
        throw new Error('No generated report artifact found to download.');
      }

      const blob = await desktopService.downloadReportArtifact(targetReportId, targetJobId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = (currentReport?.fileName || fileName || 'MineIntel_Executive_Report')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^\w\-]+/g, '_');
      a.download = `${baseName}_Report.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(`${format.toUpperCase()} report downloaded successfully!`);
    } catch (err: any) {
      console.error('Export download failed:', err);
      showToast(`Download error: ${err.message || 'Could not download report'}`);
      throw err;
    }
  };

  const handleGenerateReportForFile = async (fileItem: UploadedDataSourceFile) => {
    handleSelectUploadedFile(fileItem);
    await executeReportGeneration({
      targetFile: {
        name: fileItem.name,
        type: fileItem.type,
        fileBase64: fileItem.fileBase64,
        rawText: fileItem.rawText,
        file: fileItem.file,
      },
    });
  };

  const handleDeleteReport = (id: string) => {
    setReportsHistory((prev) => prev.filter((r) => r.id !== id));
    if (currentReport?.id === id) {
      setCurrentReport(null);
      setActiveView('editor');
    }
  };

  const handleClearAllHistory = () => {
    setReportsHistory([]);
  };

  // Sidebar Controls & Actions
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSelectDashboard = () => {
    setActiveView('editor');
    setIsMobileSidebarOpen(false);
    scrollToTop();
  };

  const scrollToTop = () => {
    const mainEl = document.getElementById('main-content-scroll');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNewReport = () => {
    setCurrentReport(null);
    handleClearFile();
    setCustomFocus('');
    setSelectedFileIds([]);
    setTaskStatus('IDLE');
    setCurrentTool('');
    setErrorMessage(null);
    setActiveView('editor');
    setIsMobileSidebarOpen(false);
    showToast('Ready to create a new report! Select documents from the repository below.');
    scrollToTop();
  };

  const handleSelectDataSource = () => {
    setActiveView('datasource');
    setIsMobileSidebarOpen(false);
    scrollToTop();
  };

  const handlePreviewReport = () => {
    setIsMobileSidebarOpen(false);
    if (!fileName && rawText.trim().length === 0 && !fileBase64 && !currentReport) {
      if (uploadedFiles.length > 0) {
        handleSelectUploadedFile(uploadedFiles[0]);
      }
    }
    setActiveView('preview');
    scrollToTop();
  };

  const handleExportReport = () => {
    setIsMobileSidebarOpen(false);
    if (!fileName && rawText.trim().length === 0 && !fileBase64 && !currentReport) {
      if (uploadedFiles.length > 0) {
        handleSelectUploadedFile(uploadedFiles[0]);
      }
    }
    setActiveView('export');
    scrollToTop();
  };

  const handleSelectSettings = () => {
    setActiveView('settings');
    setIsMobileSidebarOpen(false);
    scrollToTop();
  };

  const handleSelectProfile = () => {
    setActiveView('profile');
    setIsMobileSidebarOpen(false);
    scrollToTop();
  };

  const canGenerate = Boolean(
    selectedFileIds.length > 0 ||
    stagedFiles.length > 0 ||
    Boolean(activeFileId) ||
    Boolean(fileName && (fileBase64 || rawText.trim().length > 0))
  );

  const activeTargetName = selectedFileIds.length > 1
    ? `${selectedFileIds.length} Selected Documents`
    : (selectedFileIds.length === 1
        ? (uploadedFiles.find((f) => f.id === selectedFileIds[0])?.name || fileName)
        : (fileName || (activeFileId ? uploadedFiles.find((f) => f.id === activeFileId)?.name : '')));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f8ff] dark:bg-[#070e1c] text-neutral-900 dark:text-neutral-50 transition-colors duration-200">
      {/* 1. Full-Height Left Sidebar (Extends from top of application viewport to bottom) */}
      <div className="hidden lg:flex h-screen shrink-0 z-30">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onNewReport={handleNewReport}
          onSelectDataSource={handleSelectDataSource}
          onPreview={handlePreviewReport}
          onExport={handleExportReport}
          onNavigateSettings={handleSelectSettings}
          onNavigateProfile={handleSelectProfile}
          activeView={activeView}
          hasReport={Boolean(currentReport || reportsHistory.length > 0)}
          hasDataSource={Boolean(stagedFiles.length > 0 || fileName || rawText.trim().length > 0)}
          dataSourceName={stagedFiles.length > 1 ? `${stagedFiles.length} files selected` : (stagedFiles[0]?.name || fileName)}
        />
      </div>

      {/* Mobile Slide-over Drawer for Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[80vw] h-full shadow-2xl">
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
              onNewReport={handleNewReport}
              onSelectDataSource={handleSelectDataSource}
              onPreview={handlePreviewReport}
              onExport={handleExportReport}
              onNavigateSettings={() => {
                handleSelectSettings();
                setIsMobileSidebarOpen(false);
              }}
              onNavigateProfile={() => {
                handleSelectProfile();
                setIsMobileSidebarOpen(false);
              }}
              activeView={activeView}
              hasReport={Boolean(currentReport || reportsHistory.length > 0)}
              hasDataSource={Boolean(stagedFiles.length > 0 || fileName || rawText.trim().length > 0)}
              dataSourceName={stagedFiles.length > 1 ? `${stagedFiles.length} files selected` : (stagedFiles[0]?.name || fileName)}
            />
          </div>
        </div>
      )}

      {/* 2. Main Shell Layout (Header at Top + Vertical Scrollable Main Canvas Below) */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Pinned Top Navigation beside Sidebar */}
        <div className="shrink-0 z-20">
          <Header
            isDark={isDark}
            onToggleTheme={handleToggleTheme}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onNavigateProfile={handleSelectProfile}
            historyCount={reportsHistory.length}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          />
        </div>

        {/* Natural Vertical Scrollable Main Content Container */}
        <main id="main-content-scroll" className="flex-1 overflow-y-auto min-h-0 w-full">
          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full">
          {/* Toast feedback banner */}
          {toastMessage && (
            <div className="mb-6 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/95 dark:bg-blue-950/70 text-blue-900 dark:text-blue-100 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-300 font-bold text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Error notification banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-600 hover:text-rose-800 dark:text-rose-400 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* VIEW 1: SETTINGS VIEW */}
          {activeView === 'settings' ? (
            <div className="space-y-6">
              <SettingsView healthComponents={[]} />
            </div>
          ) : activeView === 'preview' ? (
            /* VIEW 2: PREVIEW PAGE VIEW (Shows generated report artifact) */
            <PdfSlidePreviewView
              fileName={currentReport?.fileName || fileName || ''}
              fileType={currentReport?.fileType || fileType || 'application/pdf'}
              fileSize={fileSize}
              rawText={currentReport?.reportMarkdown || ''}
              currentReport={currentReport}
              onJumpToExport={() => {
                setActiveView('export');
                scrollToTop();
              }}
              onUpdateRawText={(updatedText) => {
                if (currentReport) {
                  setCurrentReport({
                    ...currentReport,
                    reportMarkdown: updatedText,
                  });
                }
              }}
            />
          ) : activeView === 'export' ? (
            /* VIEW 3: EXPORT SECTION (PDF and DOCX options) */
            <ExportSection
              fileName={currentReport?.fileName || fileName || uploadedFiles[0]?.name || ''}
              fileSize={fileSize}
              totalSlides={6}
              onBackToPreview={() => {
                setActiveView('preview');
                scrollToTop();
              }}
              onDownload={handleDownloadExport}
            />
          ) : activeView === 'datasource' ? (
            /* VIEW 4: DATA SOURCE SECTION (Multi-file Ingestion View) */
            <DataSourceView
              fileName={fileName}
              fileType={fileType}
              fileSize={fileSize}
              customPrompt={customFocus}
              onCustomPromptChange={setCustomFocus}
              onFileSelected={handleFileSelected}
              onClearFile={handleClearFile}
              stagedFiles={stagedFiles}
              onFilesSelected={handleFilesSelected}
              onRemoveStagedFile={handleRemoveStagedFile}
              onClearStagedFiles={handleClearStagedFiles}
              onSelectSample={handleSelectSample}
              onGenerate={handleGenerateReport}
              canGenerate={canGenerate}
              isProcessing={isProcessing}
              isDark={isDark}
            />
          ) : activeView === 'profile' ? (
            /* VIEW 5: AUTHENTICATED USER PROFILE */
            <AuthenticatedUserProfileView
              onBack={() => {
                setActiveView('editor');
                scrollToTop();
              }}
            />
          ) : currentReport ? (
            /* VIEW 6: REPORT VIEWER */
            <ReportViewer
              report={currentReport}
              onReset={() => {
                setCurrentReport(null);
                setActiveView('editor');
                scrollToTop();
              }}
              onOpenSlidePreview={() => {
                setActiveView('preview');
                scrollToTop();
              }}
            />
          ) : (
            /* VIEW 6: NEW REPORT SECTION (Source Documents Repository + AI Auto Prompt Engine) */
            <div className="space-y-6">
              {/* Hero Dashboard Banner with MineIntel Logo, Heading, and Unique Visual Core Animation */}
              <div className="relative rounded-3xl border border-blue-900/20 dark:border-blue-500/20 bg-white dark:bg-[#0b162a] shadow-md overflow-hidden p-6 sm:p-8 lg:p-9 transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8 relative z-10">
                  {/* Left Side: Headline & Capabilities (7 cols) */}
                  <div className="lg:col-span-7 max-w-2xl">
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight">
                      AI Powered Report Generator Program
                    </h1>

                    <p className="mt-2.5 text-sm sm:text-base text-neutral-600 dark:text-blue-200/80 leading-relaxed font-medium">
                      Transform raw PDF documents, spreadsheets, or operational notes into structured executive intelligence reports with tailored depth and strategic insights.
                    </p>

                    {/* Key feature pills with MineIntel blue & gold accents */}
                    <div className="flex flex-wrap items-center gap-3 mt-5 pt-1">
                      <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-blue-200">
                        <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
                        <span>Multi-Page PDF Parsing</span>
                      </div>
                      <span className="text-neutral-300 dark:text-blue-800">•</span>
                      <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-blue-200">
                        <Zap className="w-4.5 h-4.5 text-amber-500" />
                        <span>Strategic Risk Matrices</span>
                      </div>
                      <span className="text-neutral-300 dark:text-blue-800">•</span>
                      <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-blue-200">
                        <FileText className="w-4.5 h-4.5 text-blue-500" />
                        <span>Instant Markdown &amp; PDF Export</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Unique & Attractive Animated Intelligence Core (5 cols) */}
                  <div className="lg:col-span-5 flex items-center justify-center w-full">
                    <IntelligenceVisualCore isDark={isDark} />
                  </div>
                </div>
              </div>

              {/* Multi-Document Selection & Batch Synthesis Panel */}
              {uploadedFiles.length > 0 && (
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0b162a] border border-blue-900/20 dark:border-blue-500/20 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-outfit text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white">
                            Multi-Document Report Synthesis
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            {selectedFileIds.length} of {uploadedFiles.length} Selected
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-blue-200/70 mt-0.5">
                          Select multiple ingested documents to generate a single unified executive intelligence dossier with the Agent.
                        </p>
                      </div>
                    </div>

                    {/* Quick selection actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllFiles}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-neutral-800 dark:text-blue-200 border border-neutral-200 dark:border-blue-900/60 transition-all cursor-pointer"
                      >
                        Select All ({uploadedFiles.length})
                      </button>
                      {selectedFileIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearFileSelection}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-500 hover:text-neutral-700 dark:text-blue-300/70 dark:hover:text-blue-200 transition-all cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-select Document Checkbox Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {uploadedFiles.map((doc) => {
                      const isSelected = selectedFileIds.includes(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 ring-1 ring-blue-500/40 text-blue-900 dark:text-blue-100'
                              : 'border-neutral-200 dark:border-blue-900/30 hover:border-neutral-300 dark:hover:border-blue-800/50 bg-neutral-50/40 dark:bg-[#070e1c]/40 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectFile(doc.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-neutral-300 dark:border-blue-800 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate" title={doc.name}>
                              {doc.name}
                            </p>
                            <p className="text-[11px] text-neutral-400 dark:text-blue-300/60 truncate">
                              {doc.type.includes('pdf') ? 'PDF' : doc.name.split('.').pop()?.toUpperCase() || 'DOC'} • {doc.uploadedAt || 'Ingested'}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                        </label>
                      );
                    })}
                  </div>

                  {/* Synthesis Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100 dark:border-blue-900/40">
                    <button
                      type="button"
                      id="btn-generate-selected-reports"
                      onClick={() => handleGenerateSelectedReports()}
                      disabled={isProcessing || selectedFileIds.length === 0}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        Generate Report from Selected Documents ({selectedFileIds.length})
                      </span>
                    </button>

                    <button
                      type="button"
                      id="btn-generate-all-reports"
                      onClick={() => handleGenerateAllReports()}
                      disabled={isProcessing || uploadedFiles.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-neutral-800 dark:text-blue-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-blue-950/70 dark:hover:bg-blue-900/70 border border-neutral-200 dark:border-blue-900/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <FileCheck className="w-4 h-4 text-emerald-500" />
                      <span>
                        Generate Report from All Ingested Documents ({uploadedFiles.length})
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Source Documents Repository from Data Source */}
              <div id="uploaded-repository-container" className="w-full">
                <UploadedFilesList
                  files={uploadedFiles}
                  activeFileId={activeFileId}
                  isProcessing={isProcessing}
                  onSelectFile={handleSelectUploadedFile}
                  onGenerateReportForFile={handleGenerateReportForFile}
                  onDeleteFile={handleDeleteUploadedFile}
                  onGoToDataSource={handleSelectDataSource}
                />
              </div>

              {/* AI Auto Prompt Generator & Search Engine */}
              <div className="w-full">
                <AIGenerateEngine
                  fileName={activeTargetName}
                  customPrompt={customFocus}
                  onCustomPromptChange={setCustomFocus}
                  onGenerate={handleGenerateReport}
                  canGenerate={canGenerate}
                  isProcessing={isProcessing}
                  onFocusFileSelection={() => {
                    if (uploadedFiles.length > 0) {
                      showToast('Please select one or more documents from the repository above.');
                      const repoEl = document.getElementById('uploaded-repository-container');
                      if (repoEl) {
                        repoEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    } else {
                      handleSelectDataSource();
                    }
                  }}
                />
              </div>
            </div>
          )}
          </div>
        </main>
      </div>

      {/* Active Processing Overlay with real Agent status */}
      {isProcessing && (
        <ProcessingOverlay
          fileName={
            activeTargetName || (uploadedFiles.length > 1 ? `${uploadedFiles.length} Ingested Documents` : 'Source Document')
          }
          isDark={isDark}
          onCancel={() => setTaskStatus('IDLE')}
          agentStatus={taskStatus}
          currentTool={currentTool}
          currentStage={currentStage}
          progressReason={progressReason}
          statusMessage={errorMessage || undefined}
          sections_completed={sectionsCompleted}
          total_sections={totalSections}
          active_sections={activeSections}
          completed_sections={completedSections}
        />
      )}

      {/* Slide-over Report History Drawer */}
      <ReportHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        reports={reportsHistory}
        onSelectReport={(rpt) => {
          setCurrentReport(rpt);
          setActiveView('preview');
          setIsHistoryOpen(false);
        }}
        onDeleteReport={handleDeleteReport}
        onClearAll={handleClearAllHistory}
      />
    </div>
  );
}
