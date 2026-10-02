import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  TrendingUp,
  AlertTriangle,
  FileText,
  MapPin,
  Sparkles,
  Cpu,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  FilePlus,
  Bookmark,
  Pickaxe,
  Keyboard,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { EMERGING_ALERTS_DATA } from '../../data/miningData';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenKeyboardGuide?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  onOpenKeyboardGuide,
}) => {
  const location = useLocation();
  const [topicsOpen, setTopicsOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(true);

  const activeAlertsCount = EMERGING_ALERTS_DATA.filter((a) => a.severity === 'HIGH').length;

  const navItemClass = (isActive: boolean) =>
    `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10'
        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
    }`;

  const subNavItemClass = (isActive: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
      isActive
        ? 'text-amber-400 font-semibold bg-amber-500/10'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
    }`;

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 flex flex-col border-r border-slate-800/90 bg-[#090e1a] text-slate-200 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20">
              <Pickaxe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-white">
                  Mine<span className="text-amber-400">Intel</span>
                </span>
                <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300 uppercase tracking-widest border border-amber-500/30">
                  CMPDI
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 tracking-tight">
                Smarter Insights. Safer Mines.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <Pickaxe className="h-5 w-5" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {/* Core Intelligence Suite */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Core Intelligence
            </div>
          )}

          {/* Dashboard */}
          <NavLink
            to="/master/dashboard"
            className={({ isActive }) => navItemClass(isActive)}
            title="Dashboard"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          {/* Approvals */}
          <NavLink
            to="/master/approvals"
            className={({ isActive }) => navItemClass(isActive)}
            title="Approvals"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#00D9FF]" />
            {!collapsed && <span>Approvals</span>}
          </NavLink>

          {/* Field Workers */}
          <NavLink
            to="/master/workers"
            className={({ isActive }) => navItemClass(isActive)}
            title="Field Workers"
          >
            <Users className="h-4 w-4 shrink-0 text-cyan-400" />
            {!collapsed && <span>Field Workers</span>}
          </NavLink>

          {/* Topic Intelligence with Submenu */}
          <div>
            {!collapsed ? (
              <>
                <button
                  type="button"
                  onClick={() => setTopicsOpen(!topicsOpen)}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    location.pathname.startsWith('/master/topics')
                      ? 'bg-amber-500/10 text-amber-300'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>Topic Intelligence</span>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      topicsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {topicsOpen && (
                  <div className="ml-5 pl-2 border-l border-slate-800/80 my-1 space-y-1">
                    <NavLink
                      to="/master/topics"
                      end
                      className={({ isActive }) => subNavItemClass(isActive)}
                    >
                      <span>Topic Categories</span>
                    </NavLink>
                    <NavLink
                      to="/master/topics/network"
                      className={({ isActive }) => subNavItemClass(isActive)}
                    >
                      <span className="flex items-center justify-between w-full">
                        Topic Network
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 rounded">Interactive</span>
                      </span>
                    </NavLink>
                    <NavLink
                      to="/master/topics/taxonomy"
                      className={({ isActive }) => subNavItemClass(isActive)}
                    >
                      <span>Topic Taxonomy</span>
                    </NavLink>
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to="/master/topics"
                className={({ isActive }) => navItemClass(isActive)}
                title="Topic Intelligence"
              >
                <Layers className="h-4 w-4 shrink-0 text-amber-400" />
              </NavLink>
            )}
          </div>

          {/* Trend Analysis */}
          <NavLink
            to="/master/trends"
            className={({ isActive }) => navItemClass(isActive)}
            title="Trend Analysis"
          >
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-400" />
            {!collapsed && <span>Trend Analysis</span>}
          </NavLink>

          {/* Emerging Alerts */}
          <NavLink
            to="/master/alerts"
            className={({ isActive }) => navItemClass(isActive)}
            title="Emerging Alerts"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span>Emerging Alerts</span>
                {activeAlertsCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm shadow-rose-500/40 animate-pulse">
                    {activeAlertsCount}
                  </span>
                )}
              </div>
            )}
          </NavLink>

          {/* Reports & Documents with Submenu */}
          <div>
            {!collapsed ? (
              <>
                <button
                  type="button"
                  onClick={() => setReportsOpen(!reportsOpen)}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    location.pathname.startsWith('/master/reports') || location.pathname === '/master/generate-report'
                      ? 'bg-amber-500/10 text-amber-300'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span>Reports &amp; Documents</span>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      reportsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {reportsOpen && (
                  <div className="ml-5 pl-2 border-l border-slate-800/80 my-1 space-y-1">
                    <NavLink
                      to="/master/reports"
                      className={({ isActive }) => subNavItemClass(isActive)}
                    >
                      <span>Corpus Index (1,284)</span>
                    </NavLink>
                    <NavLink
                      to="/master/generate-report"
                      className={({ isActive }) => subNavItemClass(isActive)}
                    >
                      <span className="flex items-center justify-between w-full">
                        Generate Report
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">AI</span>
                      </span>
                    </NavLink>
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to="/master/reports"
                className={({ isActive }) => navItemClass(isActive)}
                title="Reports & Documents"
              >
                <FileText className="h-4 w-4 shrink-0 text-cyan-400" />
              </NavLink>
            )}
          </div>

          {/* Mine Explorer */}
          <NavLink
            to="/master/mine-explorer"
            className={({ isActive }) => navItemClass(isActive)}
            title="Mine Explorer"
          >
            <MapPin className="h-4 w-4 shrink-0 text-amber-400" />
            {!collapsed && <span>Mine Explorer</span>}
          </NavLink>

          {/* AI Mining Intelligence */}
          <NavLink
            to="/master/insights"
            className={({ isActive }) => navItemClass(isActive)}
            title="AI Mining Intelligence"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-purple-400" />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span>AI Insights</span>
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">
                  Active
                </span>
              </div>
            )}
          </NavLink>

          {/* Model & System Health */}
          <NavLink
            to="/master/system"
            className={({ isActive }) => navItemClass(isActive)}
            title="Model & System Health"
          >
            <Cpu className="h-4 w-4 shrink-0 text-cyan-400" />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span>System Health</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Model Active" />
              </div>
            )}
          </NavLink>
        </div>

        {/* Administration & Help */}
        <div className="space-y-1 pt-2 border-t border-slate-800/80">
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              System
            </div>
          )}

          <NavLink
            to="/master/settings"
            className={({ isActive }) => navItemClass(isActive)}
            title="Settings"
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-400" />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          <NavLink
            to="/master/help"
            className={({ isActive }) => navItemClass(isActive)}
            title="Help & Support"
          >
            <HelpCircle className="h-4 w-4 shrink-0 text-slate-400" />
            {!collapsed && <span>Help &amp; Support</span>}
          </NavLink>

          {onOpenKeyboardGuide && !collapsed && (
            <button
              type="button"
              onClick={onOpenKeyboardGuide}
              className="w-full flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 transition"
            >
              <div className="flex items-center gap-3">
                <Keyboard className="h-4 w-4 shrink-0 text-slate-400" />
                <span>Shortcuts</span>
              </div>
              <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] font-mono text-slate-400 border border-slate-700">
                ?
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Footer System Badge */}
      {!collapsed ? (
        <div className="border-t border-slate-800/80 bg-[#070b14] p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-[11px] font-medium text-slate-300 truncate">
              CIL Sovereign Network <span className="text-[10px] text-slate-400">• v3.4</span>
            </div>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 truncate">
            CMPDI Enclave Active (12,420 Docs)
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-800/80 bg-[#070b14] p-3 text-center">
          <div className="mx-auto h-2 w-2 rounded-full bg-emerald-400" title="System Operational" />
        </div>
      )}
    </aside>
  );
};
