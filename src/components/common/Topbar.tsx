import React from 'react';
import {
  ChevronRight,
  Search,
  Cpu,
  RefreshCw,
  FolderOpen,
  Sparkles,
  Command,
} from 'lucide-react';
import { AppView, ReportItem } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface TopbarProps {
  currentView: AppView;
  activeReport: ReportItem | undefined;
  onOpenCommandPalette: () => void;
  onRefreshData?: () => void;
  onOpenNewReport?: () => void;
  onNavigate: (view: AppView) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentView,
  activeReport,
  onOpenCommandPalette,
  onRefreshData,
  onOpenNewReport,
  onNavigate,
}) => {
  const { isLight } = useTheme();

  const getViewTitle = (view: AppView): string => {
    switch (view) {
      case 'dashboard':
        return 'Executive Operations Dashboard';
      case 'new-report':
        return 'New Report Generation Wizard';
      case 'processing-jobs':
        return 'Extraction, OCR & Embedding Queue';
      case 'evidence-search':
        return 'Evidence Retrieval & Provenance Discovery';
      case 'report-planner':
        return 'Dynamic Report Structure Planner';
      case 'report-editor':
        return 'Enterprise Report Editor & AI Agent Workspace';
      case 'asset-manager':
        return 'Corporate Graphic & Image Asset Library';
      case 'validation':
        return 'Data Consistency & Numerical Validation Center';
      case 'preview':
        return 'Final PDF Report Proofing & Preview';
      case 'export':
        return 'Statutory Report Compiler & Export';
      case 'security-audit':
        return 'Airgap Security & Tamper-Evident Audit Ledger';
      case 'settings':
        return 'Local Subprocess & Inference Engine Configuration';
      default:
        return 'Workspace';
    }
  };

  return (
    <div
      className={`h-11 border-b flex items-center justify-between px-4 text-xs select-none shrink-0 transition-colors ${
        isLight
          ? 'bg-slate-50 border-slate-200 text-slate-700'
          : 'bg-[#101622] border-[#1c2636] text-slate-200'
      }`}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className={`font-medium transition cursor-pointer ${
            isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          MineIntel
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

        {activeReport && currentView !== 'dashboard' && (
          <>
            <button
              type="button"
              onClick={() => onNavigate('report-editor')}
              className={`transition font-mono truncate max-w-[220px] cursor-pointer ${
                isLight ? 'text-slate-700 hover:text-blue-600' : 'text-slate-300 hover:text-white'
              }`}
              title={activeReport.name}
            >
              {activeReport.name}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </>
        )}

        <span
          className={`font-semibold truncate ${
            isLight ? 'text-slate-900' : 'text-slate-100'
          }`}
        >
          {getViewTitle(currentView)}
        </span>
      </div>

      {/* Right: Quick Tools */}
      <div className="flex items-center gap-3">
        {/* Command Search Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={`flex items-center gap-2 px-2.5 py-1 rounded transition cursor-pointer border ${
            isLight
              ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 shadow-xs'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Search evidence or actions...</span>
          <kbd
            className={`inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded border ${
              isLight
                ? 'bg-slate-100 text-slate-500 border-slate-200'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>

        {/* Local AI Model Indicator */}
        <div
          className={`hidden lg:flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono border ${
            isLight
              ? 'bg-white border-slate-200 text-slate-600 shadow-xs'
              : 'bg-[#141c2a] border-[#233247] text-slate-300'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-slate-400">AI Model:</span>
          <span
            className={`font-semibold ${
              isLight ? 'text-blue-700' : 'text-blue-300'
            }`}
          >
            {activeReport?.selectedModel || 'openrouter/free'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Local Server Ready" />
        </div>

        {/* Refresh Subprocess Cache */}
        <button
          type="button"
          onClick={() => onRefreshData?.()}
          className={`p-1.5 rounded transition cursor-pointer ${
            isLight
              ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Refresh Local Daemons & Index Cache"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
