import { 
  FilePlus2, 
  Database, 
  Eye, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Settings as SettingsIcon,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ActiveView } from './types';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewReport: () => void;
  onSelectDataSource: () => void;
  onPreview: () => void;
  onExport: () => void;
  onNavigateSettings?: () => void;
  onNavigateProfile?: () => void;
  activeView: ActiveView;
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
  onNavigateSettings,
  onNavigateProfile,
  activeView,
  hasReport,
  hasDataSource,
  dataSourceName,
}) => {
  const { user, logout } = useAuth();
  const displayName = user?.display_name || user?.username || 'Officer';
  const roleName = user?.role || 'Operational Auditor';
  const avatarLetter = (displayName[0] || 'O').toUpperCase();
  return (
    <aside
      className={`relative flex flex-col h-full border-r transition-all duration-300 z-30 shrink-0 select-none ${
        isCollapsed ? 'w-18' : 'w-64'
      } bg-white/95 dark:bg-[#091222]/95 backdrop-blur-md border-blue-900/20 dark:border-blue-500/20 shadow-xs`}
      aria-label="Application Sidebar"
    >
      {/* Sidebar Header & Toggle */}
      <div className="h-18 px-3.5 flex items-center justify-between border-b border-blue-900/15 dark:border-blue-500/15 shrink-0">
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
          } ${
            activeView === 'editor' && !hasReport
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400 dark:ring-blue-400/80 border border-blue-400/40'
              : 'bg-blue-600/10 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white border border-blue-200/60 dark:border-blue-800/60 shadow-xs'
          } active:scale-98`}
          title="New Report"
        >
          <FilePlus2 className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
            activeView === 'editor' && !hasReport ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-white'
          }`} />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="truncate">New Report</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md transition-colors ${
                activeView === 'editor' && !hasReport
                  ? 'bg-white/25 text-white'
                  : 'bg-blue-600/20 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 group-hover:bg-white/20 group-hover:text-white'
              }`}>
                {activeView === 'editor' && !hasReport ? 'Active' : 'Start'}
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
            activeView === 'datasource'
              ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-500/60 shadow-xs ring-1 ring-blue-400/40'
              : 'text-neutral-700 dark:text-blue-100 hover:bg-neutral-100 dark:hover:bg-blue-950/40 border-transparent'
          }`}
          title="Data Source (Upload / Change Document)"
        >
          <div className="relative flex-shrink-0">
            <Database className={`w-5 h-5 group-hover:scale-105 transition-transform ${
              activeView === 'datasource' ? 'text-blue-600 dark:text-blue-400' : 'text-blue-600 dark:text-blue-400'
            }`} />
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
              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-100 border-indigo-300 dark:border-indigo-500/60 shadow-xs ring-1 ring-indigo-400/40'
              : 'text-neutral-700 dark:text-blue-100 hover:bg-neutral-100 dark:hover:bg-blue-950/40 border-transparent'
          }`}
          title="Preview File (Open PDF Slide Form)"
        >
          <div className="relative flex-shrink-0">
            <Eye className={`w-5 h-5 group-hover:scale-105 transition-transform ${
              activeView === 'preview' ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-600 dark:text-indigo-400'
            }`} />
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
              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-500/60 shadow-xs ring-1 ring-emerald-400/40'
              : 'text-neutral-700 dark:text-blue-100 hover:bg-neutral-100 dark:hover:bg-blue-950/40 border-transparent'
          }`}
          title="Export Document (PDF / DOCX)"
        >
          <Download className={`w-5 h-5 flex-shrink-0 group-hover:scale-105 transition-transform ${
            activeView === 'export' ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'
          }`} />
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

      {/* Bottom Pinned Section: Settings & Profile/User Menu */}
      <div className="p-3 border-t border-blue-900/15 dark:border-blue-500/15 space-y-2 shrink-0 bg-white/50 dark:bg-[#070e1c]/50">
        {/* 5. Settings Button */}
        <button
          id="btn-sidebar-settings"
          type="button"
          onClick={onNavigateSettings || onNavigateProfile}
          className={`w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 cursor-pointer text-left border ${
            isCollapsed ? 'justify-center px-2' : ''
          } ${
            activeView === 'settings'
              ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-500/60 shadow-xs ring-1 ring-blue-400/40'
              : 'text-neutral-700 dark:text-blue-100 hover:bg-neutral-100 dark:hover:bg-blue-950/40 border-transparent'
          }`}
          title="Settings & System Configuration"
        >
          <SettingsIcon className={`w-4 h-4 group-hover:rotate-45 transition-transform ${
            activeView === 'settings' ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500 dark:text-blue-400'
          }`} />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <span className="truncate font-semibold">Settings</span>
            </div>
          )}
        </button>

        {/* 6. Profile / User Option Card */}
        <div
          id="sidebar-user-card"
          onClick={onNavigateProfile}
          className={`group flex items-center gap-2.5 p-2 rounded-xl border transition cursor-pointer ${
            isCollapsed ? 'justify-center p-1.5' : ''
          } ${
            activeView === 'profile'
              ? 'border-blue-400 dark:border-blue-500/80 bg-blue-50 dark:bg-blue-950/60 ring-1 ring-blue-400/40 shadow-xs'
              : 'border-neutral-200/80 dark:border-blue-900/50 bg-neutral-50 dark:bg-[#0b162a] hover:border-blue-500/40'
          }`}
          title={`Signed in as ${displayName}`}
        >
          <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs shrink-0 shadow-xs">
            {avatarLetter}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white dark:border-[#0b162a] rounded-full" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                {displayName}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-blue-300/70 font-mono truncate">
                {roleName}
              </div>
            </div>
          )}
          {!isCollapsed && (
            <button
              id="btn-sidebar-logout"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }}
              className="p-1 rounded-lg text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-neutral-200/60 dark:hover:bg-rose-950/40 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
