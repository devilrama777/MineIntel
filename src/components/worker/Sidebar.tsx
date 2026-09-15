import React from 'react';
import { 
  FilePlus2, 
  Database, 
  Eye, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Layers
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewReport: () => void;
  onSelectDataSource: () => void;
  onPreview: () => void;
  onExport: () => void;
  activeView: 'generator' | 'preview' | 'export' | 'report' | 'editor' | 'datasource' | 'profile';
  hasReport: boolean;
  hasDataSource: boolean;
  dataSourceName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onNewReport,
  onSelectDataSource,
  onPreview,
  onExport,
  activeView,
  hasReport,
  hasDataSource,
  dataSourceName,
}) => {
  return (
    <aside
      className={`relative flex flex-col border-r transition-all duration-300 z-30 shrink-0 select-none ${
        isCollapsed ? 'w-18' : 'w-64'
      } bg-white/95 dark:bg-[#091222]/95 backdrop-blur-md border-blue-900/20 dark:border-blue-500/20 shadow-xs`}
      aria-label="Application Sidebar"
    >
      {/* Sidebar Header & Toggle */}
      <div className="h-16 px-3.5 flex items-center justify-between border-b border-blue-900/15 dark:border-blue-500/15">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-blue-300/80">
                Workspace
              </span>
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                Intelligence Tools
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        )}

        <button
          id="btn-sidebar-toggle"
          type="button"
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:text-blue-300 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer ${
            isCollapsed ? 'absolute -right-3 top-5 bg-white dark:bg-[#0b162a] border border-blue-900/20 dark:border-blue-500/30 shadow-sm' : ''
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Action Buttons */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {/* 1. New Report Button */}
        <button
          id="btn-sidebar-new-report"
          type="button"
          onClick={onNewReport}
          className={`w-full group flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer text-left ${
            isCollapsed ? 'justify-center px-2' : ''
          } bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 border border-blue-400/30 active:scale-98`}
          title="New Report"
        >
          <FilePlus2 className="w-5 h-5 flex-shrink-0 text-white group-hover:scale-110 transition-transform" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="truncate">New Report</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-white/20 text-white">
                Start
              </span>
            </div>
          )}
        </button>

        {/* Separator / Category Label */}
        {!isCollapsed && (
          <div className="pt-3 pb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-blue-300/60">
            Navigation & Actions
          </div>
        )}

        {/* 2. Data Source Button */}
        <button
          id="btn-sidebar-data-source"
          type="button"
          onClick={onSelectDataSource}
          className={`w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 cursor-pointer text-left border ${
            isCollapsed ? 'justify-center px-2' : ''
          } ${
            hasDataSource
              ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800/60 shadow-2xs'
              : 'text-neutral-700 dark:text-blue-100 hover:bg-neutral-100 dark:hover:bg-blue-950/40 border-transparent'
          }`}
          title="Data Source (Upload / Change Document)"
        >
          <div className="relative flex-shrink-0">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform" />
            {hasDataSource && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#091222]" />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="truncate">Data Source</span>
                {hasDataSource && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Ready
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-blue-300/70 truncate">
                {hasDataSource ? (dataSourceName || 'Document Loaded') : 'Upload or select'}
              </p>
            </div>
          )}
        </button>

        {/* 3. Preview Button */}
        <button
          id="btn-sidebar-preview"
          type="button"
          onClick={onPreview}
          className={`w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 cursor-pointer text-left border ${
            isCollapsed ? 'justify-center px-2' : ''
          } ${
            activeView === 'preview'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/60 shadow-2xs'
              : 'text-neutral-700 dark:text-blue-100 hover:bg-neutral-100 dark:hover:bg-blue-950/40 border-transparent'
          }`}
          title="Preview File (Open PDF Slide Form)"
        >
          <div className="relative flex-shrink-0">
            <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform" />
            {(hasReport || hasDataSource) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="truncate">Preview</span>
                {(hasReport || hasDataSource) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    PDF Slides
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-blue-300/70 truncate">
                {hasDataSource ? 'Open PDF slide form' : hasReport ? 'View synthesized report' : 'Upload file to preview'}
              </p>
            </div>
          )}
        </button>

        {/* 4. Export Button */}
        <button
          id="btn-sidebar-export"
          type="button"
          onClick={onExport}
          className={`w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 cursor-pointer text-left border ${
            isCollapsed ? 'justify-center px-2' : ''
          } ${
            activeView === 'export'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60 shadow-2xs'
              : 'text-neutral-700 dark:text-blue-100 hover:bg-neutral-100 dark:hover:bg-blue-950/40 border-transparent'
          }`}
          title="Export Document (PDF / DOCX)"
        >
          <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 group-hover:scale-105 transition-transform" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="truncate">Export</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  PDF/DOCX
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-blue-300/70 truncate">
                Choose format & download
              </p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
