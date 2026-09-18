import React from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  Cpu,
  SearchCode,
  GitFork,
  FileEdit,
  Image as ImageIcon,
  ShieldAlert,
  FileCheck2,
  FileUp,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { AppView } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  isCollapsed?: boolean;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  badgeCounts?: {
    jobsRunning?: number;
    validationIssues?: number;
    dataSourcesCount?: number;
  };
  unresolvedIssuesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isCollapsed: propIsCollapsed,
  collapsed: propCollapsed,
  onToggleCollapse,
  badgeCounts,
  unresolvedIssuesCount = 0,
}) => {
  const { isLight } = useTheme();
  const { user, logout } = useAuth();
  const initials = user?.display_name
    ? user.display_name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'MI';

  const isCollapsed = propIsCollapsed ?? propCollapsed ?? false;
  const safeBadgeCounts = {
    jobsRunning: badgeCounts?.jobsRunning ?? 0,
    validationIssues: badgeCounts?.validationIssues ?? unresolvedIssuesCount,
    dataSourcesCount: badgeCounts?.dataSourcesCount ?? 0,
  };

  const navItems: Array<{
    id: AppView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
    section?: 'PRIMARY' | 'WORKFLOW' | 'ASSURANCE' | 'SYSTEM';
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'PRIMARY' },
    { id: 'new-report', label: 'New Report', icon: FilePlus2, section: 'PRIMARY' },
    
    // Core Document Production Pipeline
    { id: 'processing-jobs', label: 'Processing Jobs', icon: Cpu, section: 'WORKFLOW' },
    { id: 'evidence-search', label: 'Evidence Search', icon: SearchCode, section: 'WORKFLOW' },
    { id: 'report-planner', label: 'Report Planner', icon: GitFork, section: 'WORKFLOW' },
    { id: 'report-editor', label: 'Report Editor', icon: FileEdit, section: 'WORKFLOW' },
    { id: 'asset-manager', label: 'Asset Manager', icon: ImageIcon, section: 'WORKFLOW' },
    
    // Quality & Output
    { id: 'validation', label: 'Validation', icon: ShieldAlert, badge: safeBadgeCounts.validationIssues > 0 ? safeBadgeCounts.validationIssues : undefined, badgeColor: isLight ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-amber-400 bg-amber-950/60 border-amber-800', section: 'ASSURANCE' },
    { id: 'preview', label: 'Preview', icon: FileCheck2, section: 'ASSURANCE' },
    { id: 'export', label: 'Export', icon: FileUp, section: 'ASSURANCE' },

    // Governance & Config
    { id: 'security-audit', label: 'Security & Audit', icon: ShieldCheck, section: 'SYSTEM' },
  ];

  return (
    <aside
      className={`border-r flex flex-col h-full transition-all duration-200 select-none shrink-0 ${
        isCollapsed ? 'w-14' : 'w-60'
      } ${
        isLight
          ? 'bg-white border-slate-200 text-slate-700'
          : 'bg-[#0d121a] border-[#1e293b] text-slate-300'
      }`}
    >
      {/* Top Header: MineIntel Brand (Aligns with AppTitlebar) */}
      <div
        className={`h-11 border-b flex items-center px-3 gap-2.5 shrink-0 select-none ${
          isLight ? 'border-slate-200 bg-white' : 'border-[#1e293b] bg-[#090d15]'
        } ${isCollapsed ? 'justify-center px-0' : ''}`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-xs shrink-0 overflow-hidden border ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-900 border-[#233145]'
          }`}
        >
          <img src="/logo.png" alt="MineIntel" className="w-5 h-5 object-contain" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col justify-center leading-none min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-extrabold tracking-wide text-[12px] truncate ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                MineIntel
              </span>
              <span
                className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold shrink-0 ${
                  isLight
                    ? 'text-blue-700 bg-blue-50 border border-blue-200'
                    : 'text-blue-400 bg-blue-950/70 border border-blue-800/60'
                }`}
              >
                DESKTOP
              </span>
            </div>
            <span
              className={`text-[9px] font-medium tracking-tight pt-0.5 truncate ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Report Generator
            </span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-2.5 px-1.5 space-y-0.5">
        {navItems.map((item, idx) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          
          const showSectionLabel =
            !isCollapsed &&
            (idx === 0 || navItems[idx - 1].section !== item.section);

          return (
            <React.Fragment key={item.id}>
              {showSectionLabel && (
                <div
                  className={`px-2 pt-3 pb-1 text-[10px] font-mono tracking-wider font-semibold ${
                    isLight ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {item.section}
                </div>
              )}
              <button
                type="button"
                id={`nav-${item.id}`}
                onClick={() => onNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? isLight
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs font-semibold'
                      : 'bg-blue-600/20 text-blue-300 border border-blue-600/40 shadow-xs font-semibold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                } ${isCollapsed ? 'justify-center px-0 py-2' : ''}`}
              >
                <Icon
                  className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${
                    isActive
                      ? isLight ? 'text-blue-600' : 'text-blue-400'
                      : isLight ? 'text-slate-400' : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!isCollapsed && item.badge !== undefined && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded border ${
                      item.badgeColor || (isLight ? 'text-slate-500 bg-slate-100 border-slate-200' : 'text-slate-400 bg-slate-800/80 border-slate-700')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Bottom Section: Settings + User Profile + Collapse Toggle */}
      <div
        className={`p-2 border-t space-y-1.5 shrink-0 transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#111722] border-[#1e293b]'
        }`}
      >
        {/* Settings Button */}
        <button
          type="button"
          id="nav-settings"
          onClick={() => onNavigate('settings')}
          title={isCollapsed ? 'Settings' : undefined}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            currentView === 'settings'
              ? isLight
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs font-semibold'
                : 'bg-blue-600/20 text-blue-300 border border-blue-600/40 shadow-xs font-semibold'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
          } ${isCollapsed ? 'justify-center px-0 py-2' : ''}`}
        >
          <Settings
            className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${
              currentView === 'settings'
                ? isLight ? 'text-blue-600' : 'text-blue-400'
                : isLight ? 'text-slate-400' : 'text-slate-400'
            }`}
          />
          {!isCollapsed && (
            <span className="truncate flex-1 text-left">Settings</span>
          )}
        </button>

        {/* User Profile / Account Option */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1 pt-1 border-t border-slate-700/40">
            <button
              type="button"
              id="user-profile-collapsed"
              onClick={() => onNavigate('settings')}
              title={`Profile: ${user?.display_name || 'Authenticated User'}`}
              className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold border transition cursor-pointer ${
                isLight
                  ? 'bg-blue-100 border-blue-200 text-blue-700 hover:bg-blue-200'
                  : 'bg-blue-950/60 border-blue-800/60 text-blue-300 hover:bg-blue-900/80'
              }`}
            >
              {initials}
            </button>
            <button
              type="button"
              id="btn-logout-collapsed"
              onClick={() => logout()}
              title="Sign Out (Clear Session)"
              className={`p-1.5 rounded transition cursor-pointer ${
                isLight
                  ? 'hover:bg-slate-200 text-slate-500 hover:text-rose-600'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-rose-400'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            className={`pt-2 border-t flex items-center gap-2 px-1 ${
              isLight ? 'border-slate-200' : 'border-slate-800/60'
            }`}
          >
            <button
              type="button"
              id="user-profile-expanded"
              onClick={() => onNavigate('settings')}
              title="View & Edit Profile"
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold border shrink-0 transition ${
                  isLight
                    ? 'bg-blue-100 border-blue-200 text-blue-700 group-hover:bg-blue-200'
                    : 'bg-blue-950/60 border-blue-800/60 text-blue-300 group-hover:bg-blue-900/80'
                }`}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-[11px] font-semibold truncate transition ${
                    isLight ? 'text-slate-800 group-hover:text-blue-600' : 'text-slate-200 group-hover:text-blue-300'
                  }`}
                  title={user?.display_name || 'Authenticated User'}
                >
                  {user?.display_name || 'Authenticated User'}
                </div>
                <div
                  className={`text-[10px] font-mono truncate ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {user?.role ? user.role.toUpperCase() : 'ANALYST'} • Airgap
                </div>
              </div>
            </button>
            <button
              type="button"
              id="btn-logout"
              onClick={() => logout()}
              title="Sign Out (Clear Session)"
              className={`p-1.5 rounded transition cursor-pointer shrink-0 ${
                isLight
                  ? 'hover:bg-slate-200 text-slate-500 hover:text-rose-600'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-rose-400'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-full flex items-center justify-center gap-2 py-1 text-xs rounded transition cursor-pointer ${
            isLight
              ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title={isCollapsed ? 'Expand Sidebar (Ctrl+\\)' : 'Collapse Sidebar (Ctrl+\\)'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px] font-mono">Collapse Menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
