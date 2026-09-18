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
  AlertCircle
} from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

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
  const [activeFileId, setActiveFileId] = useState<string | null>('init-doc-1');

  // Uploaded Files in Data Source Repository (displayed in New Report)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDataSourceFile[]>(() => {
    try {
      const saved = localStorage.getItem('uploaded_source_files');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Seed initial files for demonstration
    return [
      {
        id: 'init-doc-1',
        name: 'Q3_Financial_Performance_Audit.pdf',
        type: 'application/pdf',
        size: 2450000,
        uploadedAt: '10:30 AM, Today',
        rawText: 'Q3 Financial Performance and Corporate Growth Audit. Revenue grew 18.4% YoY to $42.6M. Operating expenses optimized by 8.2%. EBITDA margins expanded to 24.2%. Primary drivers include high enterprise client retention and cloud workload migration. Working capital remains strong with $18.4M in cash reserves.',
      },
      {
        id: 'init-doc-2',
        name: 'Infrastructure_Security_Compliance_2025.pdf',
        type: 'application/pdf',
        size: 1820000,
        uploadedAt: '09:15 AM, Today',
        rawText: 'Zero-trust enterprise network architecture compliance assessment. Key audit findings focus on multi-region failover automation, IAM key rotation schedules, automated SIEM anomaly detection, and ISO 27001 / SOC2 Type II certification standards across all distributed nodes.',
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('uploaded_source_files', JSON.stringify(uploadedFiles));
    } catch (e) {
      console.error('Failed to persist uploaded files:', e);
    }
  }, [uploadedFiles]);

  // Set default active file on first load if available
  useEffect(() => {
    if (uploadedFiles.length > 0 && !fileName) {
      const first = uploadedFiles[0];
      setFileName(first.name);
      setFileType(first.type);
      setFileSize(first.size);
      setFileBase64(first.fileBase64 || '');
      setRawText(first.rawText || '');
      setActiveFileId(first.id);
    }
  }, []);

  // Configuration State
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [depth, setDepth] = useState<ReportDepth>('standard');
  const [tone, setTone] = useState<ReportTone>('analytical');
  const [customFocus, setCustomFocus] = useState<string>('');

  // Execution & Output State
  const [activeView, setActiveView] = useState<ActiveView>('editor');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
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

  // Handle file selection in Data Source Upload Document & Ingest
  const handleFileSelected = (file: File) => {
    setFileName(file.name);
    setFileType(file.type || 'application/octet-stream');
    setFileSize(file.size);
    setErrorMessage(null);

    const reader = new FileReader();

    if (file.type.includes('pdf') || file.type.includes('image')) {
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
        };
        setUploadedFiles((prev) => [newDoc, ...prev.filter((f) => f.name !== file.name)]);
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
        };
        setUploadedFiles((prev) => [newDoc, ...prev.filter((f) => f.name !== file.name)]);
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
  const executeReportGeneration = async (targetFile?: {
    name: string;
    type: string;
    fileBase64?: string;
    rawText?: string;
  }) => {
    const finalName = targetFile?.name ?? fileName;
    const finalType = targetFile?.type ?? fileType ?? 'text/plain';
    const finalBase64 = targetFile ? targetFile.fileBase64 : fileBase64;
    const finalRawText = targetFile ? targetFile.rawText : rawText;

    if (!finalBase64 && (!finalRawText || finalRawText.trim().length === 0)) {
      setErrorMessage('Please upload a document or enter source text to analyze.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const token = authService.getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileName: finalName,
          fileType: finalType || 'text/plain',
          fileBase64: finalBase64 || undefined,
          rawText: finalRawText || undefined,
          reportType,
          depth,
          tone,
          customFocus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();

      const newReport: GeneratedReport = {
        id: data.job_id || `rpt-${Date.now().toString(36)}`,
        jobId: data.job_id,
        fileName: finalName || 'Direct Text Input',
        fileType: finalType,
        reportMarkdown: data.reportMarkdown,
        metadata: data.metadata,
        customFocus,
      };

      setCurrentReport(newReport);
      setActiveView('preview');
      setReportsHistory((prev) => [newReport, ...prev.slice(0, 19)]); // keep last 20
      showToast('Executive report synthesized successfully! Viewing in Preview.');
    } catch (err: any) {
      console.error('Report synthesis failed:', err);
      setErrorMessage(err.message || 'Failed to synthesize document into report. Please check API credentials.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateReport = async () => {
    await executeReportGeneration();
  };

  // Real backend document export downloader
  const handleDownloadExport = async (format: 'pdf' | 'docx') => {
    try {
      showToast(`Generating and downloading ${format.toUpperCase()} report...`);
      const targetJobId = currentReport?.jobId || (currentReport?.id?.startsWith('job_') ? currentReport.id : '');
      let downloadUrl = `/api/reports/download/${format}`;
      if (targetJobId) {
        downloadUrl += `?job_id=${encodeURIComponent(targetJobId)}`;
      }
      const token = authService.getToken();
      const response = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      let resToUse = response;
      if (!response.ok) {
        const altResp = await fetch(`/api/export/${format}${targetJobId ? `?job_id=${encodeURIComponent(targetJobId)}` : ''}`);
        if (!altResp.ok) {
          throw new Error(`Export download returned ${response.status}`);
        }
        resToUse = altResp;
      }

      const blob = await resToUse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = (fileName || currentReport?.fileName || 'Ministry_of_Coal_Report').replace(/\.[^/.]+$/, '');
      a.download = `${baseName}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(`${format.toUpperCase()} document downloaded successfully!`);
    } catch (err: any) {
      console.error('Export download failed:', err);
      showToast(`Export failed: ${err.message || 'Could not download report'}`);
    }
  };

  const handleGenerateReportForFile = async (fileItem: UploadedDataSourceFile) => {
    handleSelectUploadedFile(fileItem);
    await executeReportGeneration({
      name: fileItem.name,
      type: fileItem.type,
      fileBase64: fileItem.fileBase64,
      rawText: fileItem.rawText,
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setActiveView('editor');
    setIsMobileSidebarOpen(false);
    showToast('Ready to create a new report! Upload a document to begin.');
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
      } else {
        handleSelectSample(SAMPLE_DOCUMENTS[0]);
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
      } else {
        handleSelectSample(SAMPLE_DOCUMENTS[0]);
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

  const canGenerate = Boolean(fileBase64 || rawText.trim().length > 0);

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
          hasDataSource={Boolean(fileName || rawText.trim().length > 0)}
          dataSourceName={fileName}
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
              hasDataSource={Boolean(fileName || rawText.trim().length > 0)}
              dataSourceName={fileName}
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
        <main id="main-content-scroll" className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full">
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
            /* VIEW 2: PREVIEW PAGE VIEW (Untouched, rendered directly in app) */
            <PdfSlidePreviewView
              fileName={fileName || currentReport?.fileName || (uploadedFiles[0]?.name ?? SAMPLE_DOCUMENTS[0].fileName)}
              fileType={fileType || 'application/pdf'}
              fileSize={fileSize}
              rawText={rawText || currentReport?.reportMarkdown || (uploadedFiles[0]?.rawText ?? SAMPLE_DOCUMENTS[0].content)}
              currentReport={currentReport}
              onJumpToExport={() => {
                setActiveView('export');
                scrollToTop();
              }}
              onUpdateRawText={(updatedText) => setRawText(updatedText)}
            />
          ) : activeView === 'export' ? (
            /* VIEW 3: EXPORT SECTION (Untouched, PDF and DOCX options, nothing selected by default) */
            <ExportSection
              fileName={fileName || currentReport?.fileName || (uploadedFiles[0]?.name ?? SAMPLE_DOCUMENTS[0].fileName)}
              fileSize={fileSize}
              totalSlides={6}
              onBackToPreview={() => {
                setActiveView('preview');
                scrollToTop();
              }}
              onDownload={handleDownloadExport}
            />
          ) : activeView === 'datasource' ? (
            /* VIEW 4: DATA SOURCE SECTION (New Ingestion View) */
            <DataSourceView
              fileName={fileName}
              fileType={fileType}
              fileSize={fileSize}
              customPrompt={customFocus}
              onCustomPromptChange={setCustomFocus}
              onFileSelected={handleFileSelected}
              onClearFile={handleClearFile}
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

              {/* Source Documents Repository from Data Source */}
              <div className="w-full">
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
                  fileName={fileName}
                  customPrompt={customFocus}
                  onCustomPromptChange={setCustomFocus}
                  onGenerate={handleGenerateReport}
                  canGenerate={canGenerate}
                  isProcessing={isProcessing}
                  onFocusFileSelection={() => {
                    if (uploadedFiles.length > 0) {
                      handleSelectUploadedFile(uploadedFiles[0]);
                    } else {
                      handleSelectDataSource();
                    }
                  }}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Active Processing Overlay with animated funnel & MineIntel logo */}
      {isProcessing && (
        <ProcessingOverlay
          fileName={fileName}
          isDark={isDark}
          onCancel={() => setIsProcessing(false)}
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
