import React from 'react';
import {
  FilePlus2,
  FolderArchive,
  Database,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  FileText,
  Layers,
  Search,
  Sparkles,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  AppView,
  ReportItem,
  DataSourceItem,
  ProcessingJobItem,
  SystemHealthComponent,
  ValidationIssueItem,
} from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { TrendsAndAnalytics } from '../dashboard/TrendsAndAnalytics';
import { useTheme } from '../../context/ThemeContext';

interface DashboardViewProps {
  reports: ReportItem[];
  dataSources: DataSourceItem[];
  jobs: ProcessingJobItem[];
  healthComponents: SystemHealthComponent[];
  validationIssues: ValidationIssueItem[];
  onNavigate: (view: AppView) => void;
  onSelectReport: (reportId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  dataSources,
  jobs,
  healthComponents,
  validationIssues,
  onNavigate,
  onSelectReport,
}) => {
  const { isLight } = useTheme();
  const activeReport = reports[0];
  const pendingIssues = validationIssues.filter((v) => v.severity !== 'pass');
  const totalPages = dataSources.reduce((acc, d) => acc + (d.pages || 0), 0);
  const totalChunksIndexed = dataSources.reduce(
    (acc, d) => acc + (d.extractedTablesCount || 0) * 8 + (d.pages || 1) * 4,
    0
  );
  const readyCount = reports.filter(
    (r) => r.status === 'Ready for Export' || r.status === 'Validated'
  ).length;
  const inProgressCount = reports.length - readyCount;

  return (
    <div
      className={`min-h-full p-5 sm:p-7 space-y-7 transition-colors duration-200 ${
        isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#0a0d14] text-slate-100'
      }`}
    >
      {/* 1. Header Banner: Clean, Executive, Uncluttered */}
      <div
        className={`border rounded-xl p-5 sm:p-6 transition-all duration-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isLight
            ? 'bg-white border-slate-200 shadow-slate-100'
            : 'bg-[#111722] border-[#1e2a3b]'
        }`}
      >
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-md font-semibold ${
                isLight
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-blue-950/60 text-blue-400 border border-blue-800/60'
              }`}
            >
              Enterprise Intelligence
            </span>
            <span
              className={`px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-md font-semibold ${
                isLight
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
              }`}
            >
              Airgap Secured
            </span>
          </div>

          <h1
            className={`text-xl sm:text-2xl font-black tracking-tight ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            Operations & Statutory Filing Workspace
          </h1>

          <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Cross-platform desktop engine for autonomous institutional reports, DGMS safety validation, hybrid vector provenance, and deterministic executive compilation.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => onNavigate('evidence-search')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer flex items-center gap-2 ${
              isLight
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-blue-500" />
            <span>Search Evidence</span>
          </button>
          <button
            type="button"
            id="btn-create-new-report"
            onClick={() => onNavigate('new-report')}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-sm hover:shadow cursor-pointer flex items-center gap-2"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Create New Report</span>
          </button>
        </div>
      </div>

      {/* 2. Key Operational Metrics Strip (Systematically Arranged) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div
          className={`p-4 rounded-xl border transition-all ${
            isLight
              ? 'bg-white border-slate-200 shadow-xs hover:border-blue-300'
              : 'bg-[#111722] border-[#1e2a3b] hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span
              className={`font-mono text-[11px] uppercase tracking-wider font-semibold ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Active Filings
            </span>
            <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono tracking-tight ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {reports.length}
          </div>
          <div className="text-[11px] text-emerald-500 font-mono mt-1 flex items-center gap-1 font-semibold">
            <span>● {readyCount} verified</span>
            <span className="text-slate-400 font-normal">• {inProgressCount} in progress</span>
          </div>
        </div>

        <div
          id="card-ingested-sources"
          onClick={() => onNavigate('processing-jobs')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            isLight
              ? 'bg-white border-slate-200 shadow-xs hover:border-indigo-300'
              : 'bg-[#111722] border-[#1e2a3b] hover:border-slate-700'
          }`}
          title="View Ingested Sources and Processing Queue"
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span
              className={`font-mono text-[11px] uppercase tracking-wider font-semibold ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Ingested Sources
            </span>
            <div className="w-7 h-7 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <FolderArchive className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono tracking-tight ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {dataSources.length}
          </div>
          <div
            className={`text-[11px] font-mono mt-1 ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {totalPages} total pages • Normalized
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border transition-all ${
            isLight
              ? 'bg-white border-slate-200 shadow-xs hover:border-amber-300'
              : 'bg-[#111722] border-[#1e2a3b] hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span
              className={`font-mono text-[11px] uppercase tracking-wider font-semibold ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Evidence Chunks
            </span>
            <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Database className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono tracking-tight ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {totalChunksIndexed.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-500 font-mono mt-1 font-semibold">
            Structured & Tabular Ingestion
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border transition-all ${
            isLight
              ? 'bg-white border-slate-200 shadow-xs hover:border-rose-300'
              : 'bg-[#111722] border-[#1e2a3b] hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span
              className={`font-mono text-[11px] uppercase tracking-wider font-semibold ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Integrity Gate
            </span>
            <div className="w-7 h-7 rounded-md bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono tracking-tight flex items-baseline gap-2 ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            <span>{pendingIssues.length}</span>
            <span className="text-xs font-normal text-slate-400">pending review</span>
          </div>
          <div className="text-[11px] text-rose-500 font-mono mt-1 font-semibold">
            {pendingIssues.length > 0 ? `${pendingIssues.length} items flagged` : 'Deterministic 100% Match'}
          </div>
        </div>
      </div>

      {/* 3. Dedicated Section: "Trends & Analytics" (Animated Vertical Graphs & Curves) */}
      <TrendsAndAnalytics dataSources={dataSources} reports={reports} />

      {/* 4. Active Filings & System Pipelines (Organized Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Institutional Reports in Progress */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Active Institutional Reports
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('new-report')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono flex items-center gap-1 cursor-pointer"
            >
              <span>+ New Report</span>
            </button>
          </div>

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div
                className={`border border-dashed rounded-xl p-8 text-center ${
                  isLight ? 'border-slate-300 bg-slate-50/50' : 'border-slate-800 bg-[#111722]/50'
                }`}
              >
                <Layers className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
                <p className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  No Institutional Reports Yet
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Create a new institutional filing or import data sources to begin automated drafting.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('new-report')}
                  className="mt-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  + Create New Report
                </button>
              </div>
            ) : (
              reports.map((report) => {
                const isPrimary = report.id === activeReport?.id;
                return (
                  <div
                    key={report.id}
                    className={`border rounded-xl p-4 sm:p-5 transition-all duration-200 ${
                      isPrimary
                        ? isLight
                          ? 'border-blue-300 bg-blue-50/40 shadow-xs'
                          : 'border-blue-500/40 bg-[#131b29] shadow-sm'
                        : isLight
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-[#1e2a3b] bg-[#111722] hover:border-slate-700'
                    }`}
                  >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3
                          className={`text-sm sm:text-base font-bold truncate ${
                            isLight ? 'text-slate-900' : 'text-slate-100'
                          }`}
                        >
                          {report.name}
                        </h3>
                        <StatusBadge status={report.status} size="sm" />
                      </div>

                      <p
                        className={`text-xs line-clamp-2 leading-relaxed ${
                          isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        {report.description}
                      </p>

                      <div
                        className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono pt-1 ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        <span>
                          Period:{' '}
                          <strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>
                            {report.reportingPeriod}
                          </strong>
                        </span>
                        <span>
                          Sections:{' '}
                          <strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>
                            {report.sectionsCount}
                          </strong>
                        </span>
                        <span>
                          Linked Sources:{' '}
                          <strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>
                            {report.sourcesLinkedCount} files
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Report Score & Action Buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <div
                          className={`text-[10px] font-mono uppercase ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          Integrity Score
                        </div>
                        <div className="text-base font-black font-mono text-emerald-500">
                          {report.validationScore}%
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectReport(report.id);
                            onNavigate('report-planner');
                          }}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition cursor-pointer ${
                            isLight
                              ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                        >
                          Outline
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectReport(report.id);
                            onNavigate('report-editor');
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <span>Open Editor</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* Right 1 Col: System Health & Security Architecture */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              Engine Health Matrix
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className={`text-xs font-mono hover:underline cursor-pointer ${
                isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daemon Config
            </button>
          </div>

          <div
            className={`border rounded-xl divide-y overflow-hidden ${
              isLight
                ? 'bg-white border-slate-200 divide-slate-100'
                : 'bg-[#111722] border-[#1e2a3b] divide-[#1c2636]'
            }`}
          >
            {healthComponents.slice(0, 4).map((comp) => (
              <div
                key={comp.id}
                className={`p-3.5 transition-colors ${
                  isLight ? 'hover:bg-slate-50' : 'hover:bg-[#141b27]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span
                      className={`text-xs font-bold ${
                        isLight ? 'text-slate-800' : 'text-slate-200'
                      }`}
                    >
                      {comp.name}
                    </span>
                  </div>
                  <StatusBadge status={comp.status} size="sm" />
                </div>
                <div
                  className={`text-[11px] font-mono mb-1 truncate ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Engine: {comp.engine}
                </div>
                <div
                  className={`text-[11px] leading-snug ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {comp.detail}
                </div>
                <div
                  className={`mt-2 flex items-center justify-between text-[10px] font-mono px-2 py-1 rounded border ${
                    isLight
                      ? 'bg-slate-50 text-slate-600 border-slate-200'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800'
                  }`}
                >
                  <span>{comp.device || 'Host Native'}</span>
                  <span className="text-emerald-500 font-semibold">{comp.latency || 'Ready'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Airgap Security Notice Card */}
          <div
            className={`border rounded-xl p-4 space-y-2 text-xs ${
              isLight
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Airgap Security Compliance</span>
            </div>
            <p
              className={`text-[11px] leading-relaxed font-mono ${
                isLight ? 'text-emerald-800' : 'text-emerald-400/80'
              }`}
            >
              Inbound and outbound network sockets are strictly isolated. All OCR passes, BGE-M3 embeddings, and model inferences execute in-process on host RAM/VRAM.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('security-audit')}
              className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 hover:underline block pt-1 cursor-pointer"
            >
              Inspect Tamper-Proof Audit Ledger →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
