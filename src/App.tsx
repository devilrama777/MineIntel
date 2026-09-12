import React, { useState, useEffect, useCallback } from 'react';
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
import { DataSourcesView } from './components/views/DataSourcesView';
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
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

function DesktopAppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<DesktopPlatform>(desktopBridge.getPlatform());
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  // Core desktop state
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('rep-001');
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

  const handleAddSource = async (fileData: Partial<DataSourceItem>) => {
    const doc = await desktopService.addDataSource(fileData);
    setDataSources((prev) => [doc, ...prev]);
    const updatedJobs = await desktopService.getProcessingJobs();
    setJobs(updatedJobs);
  };

  const handleRemoveSource = async (id: string) => {
    await desktopService.removeDataSource(id);
    setDataSources((prev) => prev.filter((d) => d.id !== id));
  };

  const handleReprocessSource = async (id: string) => {
    await desktopService.reprocessDataSource(id);
    const updatedDocs = await desktopService.getDataSources();
    setDataSources(updatedDocs);
    const updatedJobs = await desktopService.getProcessingJobs();
    setJobs(updatedJobs);
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

  const activeReport =
    reports.find((r) => r.id === selectedReportId) || reports[0] || {
      id: 'rep-001',
      name: 'Consolidated Operational Review (Q4 FY26 Pre-Filing)',
      organization: 'MineIntel / Corporate Planning & Operations',
      reportingPeriod: 'January 1, 2026 – March 31, 2026',
      description: 'Quarterly institutional synthesis',
      createdAt: '2026-03-01 09:00',
      lastModified: '2026-03-06 14:22',
      status: 'In Progress',
      sectionsCount: 7,
      wordCount: 14850,
      sourcesLinkedCount: 5,
      validationScore: 94,
      selectedModel: 'openrouter/free',
    };

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100 font-sans select-none antialiased">
      {/* 1. Cross-Platform Desktop Titlebar (Linux / macOS / Windows) */}
      <div className="no-print">
        <AppTitlebar
          currentPlatform={currentPlatform}
          onChangePlatform={(p) => {
            setCurrentPlatform(p);
            desktopBridge.setPlatform(p);
          }}
          activeReportTitle={activeReport.name}
          isAirgapped={true}
          onNavigate={handleNavigate}
          onOpenAudit={() => setActiveView('security-audit')}
          onOpenAbout={() => setAboutModalOpen(true)}
          currentView={activeView}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onRefreshData={refreshAllData}
        />
      </div>

      {/* 2. Main Shell Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="no-print flex h-full">
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

        {/* Workspace Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d121c]">
          {/* View Dispatcher */}
          <main className="flex-1 flex overflow-hidden">
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
                onCreateReport={handleCreateReport}
                onCancel={() => handleNavigate('dashboard')}
              />
            )}

            {activeView === 'data-sources' && (
              <DataSourcesView
                dataSources={dataSources}
                onAddSource={handleAddSource}
                onRemoveSource={handleRemoveSource}
                onReprocessSource={handleReprocessSource}
                onViewSource={handleInspectDataSource}
              />
            )}

            {activeView === 'processing-jobs' && (
              <ProcessingJobsView
                jobs={jobs}
                onUpdateJobStatus={handleUpdateJobStatus}
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

            {activeView === 'report-editor' && (
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
                sections={sections}
                blocks={blocks}
                onNavigateToExport={() => handleNavigate('export')}
              />
            )}

            {activeView === 'export' && (
              <ExportView
                report={activeReport}
                validationIssues={validationIssues}
                onOpenPreview={() => handleNavigate('preview')}
                onOpenEditor={() => handleNavigate('report-editor')}
              />
            )}

            {activeView === 'security-audit' && (
              <SecurityAuditView auditLogs={auditLogs} />
            )}

            {activeView === 'settings' && (
              <SettingsView healthComponents={healthComponents} />
            )}
          </main>
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

      {/* Desktop Taskbar / Status Bar */}
      <DesktopStatusBar
        currentPlatform={currentPlatform}
        onChangePlatform={(p) => {
          setCurrentPlatform(p);
          desktopBridge.setPlatform(p);
        }}
        onOpenAudit={() => setActiveView('security-audit')}
        onOpenSettings={() => setActiveView('settings')}
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
