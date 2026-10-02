import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  Files,
  Database,
  User,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  CheckCircle2,
  ChevronDown,
  Hexagon,
  Sparkles,
  Menu,
  X,
  Shield,
  Smartphone,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ToastContainer } from '../common/ToastContainer';
import { ProcessingOverlay } from '../processing/ProcessingOverlay';

interface NavItemConfig {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

const workspaceNavItems: NavItemConfig[] = [
  { label: 'Dashboard', path: '/worker/dashboard', icon: LayoutDashboard },
  { label: 'New Report', path: '/worker/new-report', icon: FilePlus },
  { label: 'My Reports', path: '/worker/my-reports', icon: Files },
  { label: 'Data Sources', path: '/worker/data-source', icon: Database },
];

const accountNavItems: NavItemConfig[] = [
  { label: 'Profile', path: '/worker/profile', icon: User },
  { label: 'Settings', path: '/worker/settings', icon: SettingsIcon },
];

export const AppLayout: React.FC = () => {
  const {
    user,
    reports,
    files,
    notifications,
    unreadNotificationCount,
    markNotificationsAsRead,
    showToast,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    isFullscreen,
    toggleFullscreen,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Operational Field Dashboard';
    if (path.includes('/new-report')) return 'New Intelligence Report';
    if (path.includes('/my-reports')) return 'Field Report Repository';
    if (path.includes('/data-source')) return 'Telemetry & Data Sources';
    if (path.includes('/preview')) return 'Report Dossier Preview';
    if (path.includes('/export')) return 'Official Export Dispatch';
    if (path.includes('/profile')) return 'Officer Profile & Credentials';
    if (path.includes('/settings')) return 'System Preferences & Settings';
    return 'Worker Portal';
  };

  const handleLogout = () => {
    console.log('POST /api/auth/logout', { officerId: user.officerId });
    showToast('Session Logged Out', 'Officer credentials cleared. Resumed local sandbox.', 'info');
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/worker/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#050810] bg-mesh-glow relative text-slate-100 flex flex-col lg:flex-row overflow-x-hidden">
      {/* Background SVG Noise Overlay */}
      <div className="bg-noise-overlay fixed inset-0 pointer-events-none z-0" />

      {/* Global Processing Overlay */}
      <ProcessingOverlay />

      {/* Toast Feedback */}
      <ToastContainer />

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SIDEBAR: Responsive drawer (<1024px) / Adaptive rail (>=1024px) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 ${
          isSidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'
        } w-[270px] sm:w-[260px] bg-[rgba(8,13,22,0.96)] lg:bg-[rgba(8,13,22,0.92)] backdrop-blur-2xl border-r border-[#00D9FF]/15 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Logo Zone */}
        <div>
          <div
            className={`h-[72px] flex items-center border-b border-[#00D9FF]/10 transition-all ${
              isSidebarCollapsed
                ? 'px-3 justify-center'
                : 'px-5 sm:px-6 justify-between'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                onClick={() => {
                  if (isSidebarCollapsed) toggleSidebarCollapse();
                }}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9FF]/20 to-slate-900 border border-[#00D9FF]/40 shadow-[0_0_15px_rgba(0,217,255,0.2)] shrink-0 cursor-pointer"
                title={isSidebarCollapsed ? 'Click to expand sidebar' : 'MineIntel'}
              >
                <Hexagon className="w-5 h-5 text-[#00D9FF] stroke-[2.2]" />
                <div className="absolute w-2 h-2 rounded-full bg-[#FFA726] animate-pulse" />
              </div>

              {!isSidebarCollapsed && (
                <div className="min-w-0 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-lg tracking-tight text-white">
                      Mine<span className="text-[#00D9FF]">Intel</span>
                    </span>
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-semibold rounded bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30">
                      CIL
                    </span>
                  </div>
                  <div className="text-[10px] uppercase font-mono font-medium tracking-widest text-slate-400 mt-0.5">
                    WORKER PORTAL
                  </div>
                </div>
              )}
            </div>

            {/* Mobile close button / Desktop collapse trigger */}
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>

              {!isSidebarCollapsed && (
                <button
                  onClick={toggleSidebarCollapse}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Collapse sidebar to maximize screen"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Sections */}
          <nav
            className={`space-y-6 overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-none transition-all ${
              isSidebarCollapsed ? 'p-2' : 'p-4'
            }`}
          >
            {/* Section: WORKSPACE */}
            <div>
              {!isSidebarCollapsed && (
                <div className="px-3 mb-2 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                  WORKSPACE
                </div>
              )}
              <div className="space-y-1">
                {workspaceNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={isSidebarCollapsed ? item.label : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `group relative flex items-center ${
                          isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                        } rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'text-white bg-gradient-to-r from-[#00D9FF]/20 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-[#00D9FF]/[0.06]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Left cyan indicator */}
                          <span
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r bg-[#00D9FF] transition-all duration-200 ${
                              isActive
                                ? 'h-5 opacity-100 shadow-[0_0_8px_#00D9FF]'
                                : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-100'
                            }`}
                          />

                          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                            <Icon
                              className={`w-5 h-5 transition-colors shrink-0 ${
                                isActive
                                  ? 'text-[#00D9FF]'
                                  : 'text-slate-400 group-hover:text-cyan-300'
                              }`}
                            />
                            {!isSidebarCollapsed && <span>{item.label}</span>}
                          </div>

                          {!isSidebarCollapsed && (
                            <>
                              {item.path === '/worker/my-reports' && (
                                <span className="font-mono text-xs text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60">
                                  {reports.length}
                                </span>
                              )}
                              {item.path === '/worker/data-source' && (
                                <span className="font-mono text-xs text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60">
                                  {files.length}
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Section: ACCOUNT */}
            <div>
              {!isSidebarCollapsed && (
                <div className="px-3 mb-2 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                  ACCOUNT
                </div>
              )}
              <div className="space-y-1">
                {accountNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={isSidebarCollapsed ? item.label : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `group relative flex items-center ${
                          isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                        } rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'text-white bg-gradient-to-r from-[#00D9FF]/20 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-[#00D9FF]/[0.06]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r bg-[#00D9FF] transition-all duration-200 ${
                              isActive
                                ? 'h-5 opacity-100 shadow-[0_0_8px_#00D9FF]'
                                : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-100'
                            }`}
                          />
                          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                            <Icon
                              className={`w-5 h-5 transition-colors shrink-0 ${
                                isActive
                                  ? 'text-[#00D9FF]'
                                  : 'text-slate-400 group-hover:text-cyan-300'
                              }`}
                            />
                            {!isSidebarCollapsed && <span>{item.label}</span>}
                          </div>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Bottom: User Profile Card & Expand trigger */}
        <div
          className={`border-t border-[#00D9FF]/10 bg-slate-950/50 shrink-0 transition-all ${
            isSidebarCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3 sm:p-4'
          }`}
        >
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00D9FF] to-[#FFA726] p-[1.5px] cursor-pointer"
                title={`${user.name} (${user.officerId})`}
                onClick={() => navigate('/worker/profile')}
              >
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-mono font-bold text-xs text-white">
                  {user.avatarInitials}
                </div>
              </div>
              <button
                onClick={toggleSidebarCollapse}
                className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors cursor-pointer"
                title="Expand Sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="group relative p-2.5 rounded-xl hover:bg-slate-900/60 border border-transparent hover:border-[#00D9FF]/20 transition-all">
              <div className="flex items-center gap-3">
                {/* Gradient avatar initial circle */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00D9FF] via-cyan-600 to-[#FFA726] p-[1.5px] shadow-[0_0_10px_rgba(0,217,255,0.25)] shrink-0">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-mono font-bold text-xs text-white">
                    {user.avatarInitials}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[11px] font-mono text-[#00D9FF] truncate flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {user.officerId}
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                  {user.region}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-action flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                  title="Sign out of portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN VIEWPORT: Adaptively offsets on desktop (ml-[72px] or ml-[260px]) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className={`flex-1 ${
          isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        } flex flex-col min-h-screen relative z-10 w-full min-w-0 transition-all duration-300`}
      >
        {/* Sticky Topbar 72px */}
        <header className="sticky top-0 h-[72px] bg-[rgba(8,13,22,0.94)] backdrop-blur-2xl border-b border-[#00D9FF]/10 z-30 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
          {/* Topbar Left: Hamburger button (mobile) + Desktop Collapse + Page Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Hamburger trigger for mobile & tablet (<1024px) */}
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-[#00D9FF]/40 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="w-5 h-5 text-cyan-400" />
            </button>

            {/* Desktop collapse trigger (>=1024px) */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex p-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-[#00D9FF]/40 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title={isSidebarCollapsed ? 'Expand sidebar (Full menu)' : 'Collapse sidebar (Wider display)'}
            >
              {isSidebarCollapsed ? (
                <PanelLeft className="w-4 h-4 text-[#00D9FF]" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-semibold text-white tracking-tight truncate">
                {getPageTitle()}
              </h1>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                <span className="text-cyan-400/90 font-medium">CMPDI-HQ</span>
                <span>/</span>
                <span className="truncate">{user.region}</span>
              </div>
            </div>
          </div>

          {/* Topbar Right: Fullscreen Toggle, Draft Report Shortcut, Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Native Fullscreen / Window Maximizer */}
            <button
              onClick={toggleFullscreen}
              className={`btn-action p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
                isFullscreen
                  ? 'border-[#FFA726]/40 bg-[#FFA726]/10 text-[#FFA726] shadow-[0_0_10px_rgba(255,167,38,0.2)]'
                  : 'border-slate-800 bg-slate-900/60 hover:border-[#00D9FF]/30 text-slate-300 hover:text-white'
              }`}
              title={isFullscreen ? 'Exit Fullscreen Mode' : 'Enter Fullscreen Mode (Adapts all content)'}
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Quick action: Generate Report button shortcut */}
            <button
              onClick={() => navigate('/worker/new-report')}
              className="btn-action shine-sweep hidden md:flex items-center gap-2 px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/35 hover:bg-[#00D9FF]/25 shadow-[0_0_12px_rgba(0,217,255,0.15)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Draft Report</span>
            </button>

            {/* Notification Bell with pulse dot */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className="relative p-2 sm:p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-[#00D9FF]/30 text-slate-300 hover:text-white transition-all cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFA726] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFA726]" />
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[rgba(15,23,42,0.98)] border border-[#00D9FF]/25 shadow-2xl backdrop-blur-2xl p-4 z-50 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white tracking-wide">
                        OPERATIONAL ALERTS
                      </span>
                      {unreadNotificationCount > 0 && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFA726]/20 text-[#FFA726] border border-[#FFA726]/30">
                          {unreadNotificationCount} New
                        </span>
                      )}
                    </div>
                    {unreadNotificationCount > 0 && (
                      <button
                        onClick={markNotificationsAsRead}
                        className="text-[11px] text-[#00D9FF] hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>

                  <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          n.read
                            ? 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                            : 'bg-[#00D9FF]/[0.06] border-[#00D9FF]/20 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium leading-snug">{n.title}</p>
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">
                            {n.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 text-center">
                    <span className="text-[11px] text-slate-500 font-mono">
                      CIL Safety Telemetry Stream Active
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 sm:gap-2.5 pl-1.5 sm:pl-2 pr-2 sm:pr-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-[#00D9FF]/30 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00D9FF] to-[#FFA726] p-[1px] shrink-0">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-mono text-[11px] font-bold text-white">
                    {user.avatarInitials}
                  </div>
                </div>
                <span className="hidden sm:inline text-xs font-medium text-slate-200">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[rgba(15,23,42,0.98)] border border-[#00D9FF]/25 shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                    <div className="text-[10px] font-mono text-[#00D9FF]">{user.officerId}</div>
                  </div>

                  <button
                    onClick={() => {
                      navigate('/worker/profile');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-[#00D9FF]/10 transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>Officer Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/worker/settings');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-[#00D9FF]/10 transition-colors text-left"
                  >
                    <SettingsIcon className="w-4 h-4 text-amber-400" />
                    <span>Workspace Settings</span>
                  </button>

                  <div className="my-1 border-t border-slate-800/80" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content Viewport */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 xl:p-8 max-w-[1680px] w-full mx-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
