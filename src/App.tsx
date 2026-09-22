import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppView,
  ReportItem,
  DataSourceItem,
  ProcessingJobItem,
  EvidenceItem,
  ReportSectionNode,
  EditorBlock,
  AssetRecord,
  ValidationIssueItem,
  AuditLogItem,
  SystemHealthComponent,
  SystemSecurityPosture,
  AIEditProposal,
  DesktopPlatform,
} from './types';
import { desktopService } from './services/reportService';
import { desktopBridge } from './services/desktopBridge';
import { AppTitlebar } from './components/common/AppTitlebar';
import { Sidebar } from './components/common/Sidebar';
import { DesktopStatusBar } from './components/common/DesktopStatusBar';
import { AboutDesktopModal } from './components/common/AboutDesktopModal';
import { CommandPalette } from './components/common/CommandPalette';
import { SourceViewerModal } from './components/common/SourceViewerModal';

// Views
import { DashboardView } from './components/views/DashboardView';
import { NewReportWorkflowView } from './components/views/NewReportWorkflowView';
import { ProcessingJobsView } from './components/views/ProcessingJobsView';
import { EvidenceSearchView } from './components/views/EvidenceSearchView';
import { ReportPlannerView } from './components/views/ReportPlannerView';
import { ReportEditorView } from './components/views/ReportEditorView';
import { AssetManagerView } from './components/views/AssetManagerView';
import { ValidationView } from './components/views/ValidationView';
import { ReportPreviewView } from './components/views/ReportPreviewView';
import { ExportView } from './components/views/ExportView';
import { SecurityAuditView } from './components/views/SecurityAuditView';
import { SettingsView } from './components/views/SettingsView';
import { LoginView } from './components/views/LoginView';
import { WorkerApp } from './components/worker/WorkerApp';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

function DesktopAppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<DesktopPlatform>(desktopBridge.getPlatform());
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  // Core desktop state
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [dataSources, setDataSources] = useState<DataSourceItem[]>([]);
  const [jobs, setJobs] = useState<ProcessingJobItem[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [sections, setSections] = useState<ReportSectionNode[]>([]);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssueItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [healthComponents, setHealthComponents] = useState<SystemHealthComponent[]>([]);
  const [securityPosture, setSecurityPosture] = useState<SystemSecurityPosture | null>(null);

  // Target navigation for Editor view
  const [editorTargetSectionId, setEditorTargetSectionId] = useState<string>('sec-4-1');

  // Source Viewer Modal state
  const [sourceModal, setSourceModal] = useState<{
    isOpen: boolean;
    documentName: string;
    sourcePath: string;
    pageOrSheet: string;
    highlightBbox?: { x: number; y: number; width: number; height: number };
    cellRange?: string;
    rawSnippet?: string;
  }>({
    isOpen: false,
    documentName: '',
    sourcePath: '',
    pageOrSheet: '',
  });

  // Derive active AI provider and model from health components
  const aiComponent = useMemo(
    () => healthComponents.find((c) => c.id === 'srv-ai-inference'),
    [healthComponents]
  );

  const aiModel = useMemo(() => {
    if (aiComponent?.detail) {
      const match = aiComponent.detail.match(/Model:\s*([^|\s]+)/);
      if (match) return match[1];
    }
    return 'openrouter/free';
  }, [aiComponent]);

  const aiProvider = useMemo(() => {
    if (aiComponent?.detail) {
      const match = aiComponent.detail.match(/Provider:\s*([^|\s]+)/);
      if (match) return match[1];
    }
    return 'openrouter';
  }, [aiComponent]);

  // Load and refresh data from local service when authenticated
  const refreshAllData = useCallback(async () => {
    if (!isAuthenticated) {
      setReports([]);
      setDataSources([]);
      setJobs([]);
      setEvidenceList([]);
      setSections([]);
      setBlocks([]);
      setAssets([]);
      setValidationIssues([]);
      setAuditLogs([]);
      return;
    }

    try {
      const [
        reps,
        sources,
        jobList,
        evs,
        secs,
        blks,
        astList,
        vIssues,
        audits,
        health,
        posture,
      ] = await Promise.all([
        desktopService.getReports(),
        desktopService.getDataSources(),
        desktopService.getProcessingJobs(),
        desktopService.searchEvidence(''),
        desktopService.getReportSections(),
        desktopService.getEditorBlocks(),
        desktopService.getAssets(),
        desktopService.getValidationIssues(),
        desktopService.getAuditLogs(),
        desktopService.getSystemHealth(),
        desktopService.getSecurityPosture(),
      ]);

      setReports(reps);
      setDataSources(sources);
      setJobs(jobList);
      setEvidenceList(evs);
      setSections(secs);
      setBlocks(blks);
      setAssets(astList);
      setValidationIssues(vIssues);
      setAuditLogs(audits);
      setHealthComponents(health);
      setSecurityPosture(posture);
    } catch (err) {
      console.error('Failed to load desktop data:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Active real-time background pipeline synchronization
  // Periodically polls processing jobs, data sources, evidence, sections, and editor blocks
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        const [updatedJobs, updatedSources, updatedEvs, updatedSecs, updatedBlks, updatedReps] =
          await Promise.all([
            desktopService.getProcessingJobs(),
            desktopService.getDataSources(),
            desktopService.searchEvidence(''),
            desktopService.getReportSections(),
            desktopService.getEditorBlocks(),
            desktopService.getReports(),
          ]);
        setJobs(updatedJobs);
        setDataSources(updatedSources);
        setEvidenceList(updatedEvs);
        setSections(updatedSecs);
        setBlocks(updatedBlks);
        setReports(updatedReps);
      } catch (err) {
        console.error('Failed to sync pipeline jobs:', err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Global Desktop Keyboard shortcuts: Cmd/Ctrl+K, Cmd/Ctrl+N, Cmd/Ctrl+\, F11
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveView('new-report');
      } else if (isCmdOrCtrl && e.key === '\\') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      } else if (e.key === 'F11') {
        e.preventDefault();
        desktopBridge.toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Desktop window drag-and-drop shield
  // Prevents Chromium / WebView2 from navigating away if files are dropped outside active drop zones
  useEffect(() => {
    const preventWindowFileDrop = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventWindowFileDrop);
    window.addEventListener('drop', preventWindowFileDrop);
    return () => {
      window.removeEventListener('dragover', preventWindowFileDrop);
      window.removeEventListener('drop', preventWindowFileDrop);
    };
  }, []);

  // Handlers
  const handleNavigate = (view: AppView) => {
    setActiveView(view);
  };

  const handleSelectReport = (reportId: string) => {
    setSelectedReportId(reportId);
  };

  const handleCreateReport = async (newReportData: any) => {
    const created = await desktopService.createReport(newReportData);
    setReports((prev) => [created, ...prev]);
    setSelectedReportId(created.id);
    setActiveView('report-planner');
  };

  const handleUploadIngest = async (file: File) => {
    try {
      await desktopService.runPipelineWithFile(file);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to run ingestion pipeline:', err);
    }
  };

  const handleUpdateJobStatus = async (
    id: string,
    status: 'running' | 'paused' | 'completed' | 'failed'
  ) => {
    await desktopService.updateJobStatus(id, status);
    const updatedJobs = await desktopService.getProcessingJobs();
    setJobs(updatedJobs);
  };

  const handleUpdateSections = async (newSecs: ReportSectionNode[]) => {
    await desktopService.updateSections(newSecs);
    setSections(newSecs);
  };

  const handleUpdateBlock = async (updatedBlock: EditorBlock) => {
    await desktopService.updateEditorBlock(updatedBlock);
    setBlocks((prev) =>
      prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b))
    );
  };

  const handleApplyAIProposal = async (proposal: AIEditProposal) => {
    await desktopService.applyAIProposal(proposal);
    const updatedBlocks = await desktopService.getEditorBlocks();
    setBlocks(updatedBlocks);
    const updatedIssues = await desktopService.getValidationIssues();
    setValidationIssues(updatedIssues);
  };

  const handleInspectEvidence = (evidence: EvidenceItem) => {
    setSourceModal({
      isOpen: true,
      documentName: evidence.documentName,
      sourcePath: evidence.sourceLocation,
      pageOrSheet: evidence.sheetName || (evidence.page ? `Page ${evidence.page}` : 'Sheet 1'),
      highlightBbox: evidence.bbox || { x: 45, y: 160, width: 420, height: 85 },
      cellRange: evidence.cellRange,
      rawSnippet: evidence.relevantText,
    });
  };

  const handleInspectDataSource = (doc: DataSourceItem) => {
    setSourceModal({
      isOpen: true,
      documentName: doc.filename,
      sourcePath: doc.sourcePath,
      pageOrSheet: 'Page 1',
      rawSnippet: doc.summary,
    });
  };

  const handleNavigateToElement = (sectionId: string, blockId?: string) => {
    setEditorTargetSectionId(sectionId);
    setActiveView('report-editor');
  };

  const handleResolveValidationIssue = (issueId: string) => {
    setValidationIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, severity: 'pass' } : i))
    );
  };

  const activeReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  const unresolvedIssuesCount = validationIssues.filter(
    (i) => i.severity !== 'pass'
  ).length;

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0e17] text-slate-200 select-none">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-2 mb-3 bg-[#111722] border border-[#233145] shadow-lg animate-pulse">
          <img src="/logo.png" alt="MineIntel" className="w-full h-full object-contain" />
        </div>
        <div className="text-sm font-bold tracking-tight">MineIntel Desktop</div>
        <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
          <span>Starting local airgap engine...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Dual application routing: Worker -> WorkerApp; Senior Officer -> Existing MineIntel
  const isMasterUser = user?.role === 'Senior Officer' || user?.is_master === true;
  if (!isMasterUser) {
    return <WorkerApp />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100 font-sans antialiased">
      {/* 1. Full-Height Sidebar (Extends from top of application viewport to bottom) */}
      <div className="no-print flex h-screen shrink-0 z-20">
        <Sidebar
          currentView={activeView}
          onNavigate={handleNavigate}
          isCollapsed={sidebarCollapsed}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          badgeCounts={{
            jobsRunning: jobs.filter((j) => j.status === 'running').length,
            validationIssues: unresolvedIssuesCount,
            dataSourcesCount: dataSources.length,
          }}
          unresolvedIssuesCount={unresolvedIssuesCount}
        />
      </div>

      {/* 2. Main Shell Layout (Titlebar, Natural Scrollable Content, Status Bar) */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-[#0d121c]">
        {/* Pinned Desktop Titlebar */}
        <div className="no-print shrink-0">
          <AppTitlebar
            currentPlatform={currentPlatform}
            onChangePlatform={(p) => {
              setCurrentPlatform(p);
              desktopBridge.setPlatform(p);
            }}
            activeReportTitle={activeReport?.name}
            isAirgapped={true}
            onNavigate={handleNavigate}
            onOpenAudit={() => setActiveView('security-audit')}
            onOpenAbout={() => setAboutModalOpen(true)}
            currentView={activeView}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onRefreshData={refreshAllData}
            aiProvider={aiProvider}
            aiModel={aiModel}
          />
        </div>

        {/* Natural Scrollable Main Canvas */}
        <main className="flex-1 overflow-y-auto min-h-0 bg-[#0d121c]">
          {activeView === 'dashboard' && (
            <DashboardView
              reports={reports}
              dataSources={dataSources}
              jobs={jobs}
              healthComponents={healthComponents}
              validationIssues={validationIssues}
              onNavigate={handleNavigate}
              onSelectReport={handleSelectReport}
            />
          )}

          {activeView === 'new-report' && (
            <NewReportWorkflowView
              dataSources={dataSources}
              previousReports={reports}
              userName={user?.display_name || user?.username || 'Authorized Officer'}
              onCreateReport={handleCreateReport}
              onCancel={() => handleNavigate('dashboard')}
              aiProvider={aiProvider}
              aiModel={aiModel}
            />
          )}

          {activeView === 'processing-jobs' && (
            <ProcessingJobsView
              jobs={jobs}
              onUpdateJobStatus={handleUpdateJobStatus}
              onUploadIngest={handleUploadIngest}
            />
          )}

          {activeView === 'evidence-search' && (
            <EvidenceSearchView
              evidenceList={evidenceList}
              onInspectSource={handleInspectEvidence}
            />
          )}

          {activeView === 'report-planner' && (
            <ReportPlannerView
              sections={sections}
              onUpdateSections={handleUpdateSections}
              onOpenEditorSection={(secId) => {
                setEditorTargetSectionId(secId);
                handleNavigate('report-editor');
              }}
            />
          )}

          {activeView === 'report-editor' && activeReport && (
            <ReportEditorView
              report={activeReport}
              sections={sections}
              initialSectionId={editorTargetSectionId}
              blocks={blocks}
              evidenceList={evidenceList}
              onUpdateBlock={handleUpdateBlock}
              onApplyAIProposal={handleApplyAIProposal}
              onTriggerAIAgent={desktopService.triggerContextualAIAgent.bind(
                desktopService
              )}
              onInspectEvidence={handleInspectEvidence}
            />
          )}

          {activeView === 'asset-manager' && (
            <AssetManagerView
              assets={assets}
              onInsertAssetToReport={(asset) => {
                alert(`Asset '${asset.filename}' inserted into active draft.`);
                handleNavigate('report-editor');
              }}
            />
          )}

          {activeView === 'validation' && (
            <ValidationView
              issues={validationIssues}
              onNavigateToElement={handleNavigateToElement}
              onResolveIssue={handleResolveValidationIssue}
            />
          )}

          {activeView === 'preview' && (
            <ReportPreviewView
              report={activeReport}
              onNavigateToExport={() => handleNavigate('export')}
              onCreateNewReport={() => handleNavigate('new-report')}
            />
          )}

          {activeView === 'export' && (
            <ExportView
              report={activeReport}
              onOpenPreview={() => handleNavigate('preview')}
              onCreateNewReport={() => handleNavigate('new-report')}
            />
          )}

          {activeView === 'security-audit' && (
            <SecurityAuditView auditLogs={auditLogs} />
          )}

          {activeView === 'settings' && (
            <SettingsView healthComponents={healthComponents} aiProvider={aiProvider} aiModel={aiModel} />
          )}
        </main>

        {/* Pinned Desktop Taskbar / Status Bar */}
        <div className="no-print shrink-0">
          <DesktopStatusBar
            currentPlatform={currentPlatform}
            onChangePlatform={(p) => {
              setCurrentPlatform(p);
              desktopBridge.setPlatform(p);
            }}
            onOpenAudit={() => setActiveView('security-audit')}
            onOpenSettings={() => setActiveView('settings')}
            aiProvider={aiProvider}
            aiModel={aiModel}
          />
        </div>
      </div>

      {/* Global Command Palette Dialog (Cmd+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        dataSources={dataSources}
        reports={reports}
        onSelectDataSource={handleInspectDataSource}
      />

      {/* Source Viewer Modal for Grounded Inspection */}
      <SourceViewerModal
        isOpen={sourceModal.isOpen}
        onClose={() => setSourceModal({ ...sourceModal, isOpen: false })}
        documentName={sourceModal.documentName}
        sourcePath={sourceModal.sourcePath}
        pageOrSheet={sourceModal.pageOrSheet}
        highlightBbox={sourceModal.highlightBbox}
        cellRange={sourceModal.cellRange}
        rawSnippet={sourceModal.rawSnippet}
      />

      {/* About MineIntel Desktop Modal */}
      <AboutDesktopModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        currentPlatform={currentPlatform}
        onChangePlatform={(p) => {
          setCurrentPlatform(p);
          desktopBridge.setPlatform(p);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DesktopAppContent />
    </AuthProvider>
  );
}
