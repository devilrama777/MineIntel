import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  User,
  Shield,
  Settings,
  HelpCircle,
  LogOut,
  Download,
  ArrowLeftRight,
  Command,
  FileText,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Keyboard,
} from 'lucide-react';
import { EMERGING_ALERTS_DATA, REPORTS_DATA, MINES_DATA } from '../../data/miningData';
import { useAuth } from '../../../shared/context/AuthContext';
import { authService } from '../../../shared/services/authService';

interface TopbarProps {
  sidebarCollapsed: boolean;
  onOpenReportModal?: (reportId: string) => void;
  onOpenKeyboardGuide?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  sidebarCollapsed,
  onOpenReportModal,
  onOpenKeyboardGuide,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExportArchive = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,ID,Title,Mine,Type,Year,Coherence\n' +
      REPORTS_DATA.map((r) => `"${r.id}","${r.title}","${r.mineName}","${r.reportType}",${r.year},${r.coherenceIndex}%`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'CIL_CMPDI_Executive_Corpus_Archive.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    }
    localStorage.removeItem('mineintel_active_session_token');
    localStorage.removeItem('mineintel_active_user_profile');
    sessionStorage.removeItem('mineintel_active_session_token');
    sessionStorage.removeItem('mineintel_active_user_profile');
    window.location.href = '/';
  };


  return (
    <header
      className={`fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-[#151f32] bg-[#070b14]/95 px-4 sm:px-6 backdrop-blur-md transition-all duration-300 ${
        sidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* Left: Breadcrumbs & Executive Title */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Link to="/master/dashboard" className="hover:text-cyan-400 transition">
            MineIntel
          </Link>
          <span className="text-slate-600">/</span>
          <span className="hover:text-slate-200">Overview</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200 font-semibold">Central Dashboard</span>
        </div>
        <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight mt-0.5">
          Executive Oversight Console
        </h1>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Status indicator: CIL / CMPDI HQ */}
        <div className="hidden xl:flex items-center gap-1 text-[11px] font-mono text-cyan-400 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span>CIL / CMPDI HQ</span>
        </div>

        {/* Ctrl+/ Search trigger */}
        <div ref={searchRef} className="relative">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-1.5 rounded-xl border border-[#1f2d47] bg-[#0c1322] px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition"
            title="Search command / Quick find (Ctrl+/)"
          >
            <Keyboard className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono text-[11px] text-slate-300 font-medium">Ctrl+/</span>
          </button>

          {/* Quick Search Modal/Dropdown */}
          {searchOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-700/80 bg-[#0d1424] shadow-2xl overflow-hidden z-50 p-3 animate-fadeIn">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mines, statutory filings, topics..."
                className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
              />
              <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-slate-800 text-xs">
                {REPORTS_DATA.filter((r) =>
                  !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.mineName.toLowerCase().includes(searchQuery.toLowerCase())
                ).slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      onOpenReportModal?.(r.id);
                      setSearchOpen(false);
                    }}
                    className="p-2 hover:bg-slate-800/60 rounded-lg cursor-pointer transition"
                  >
                    <div className="font-semibold text-white truncate">{r.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{r.mineName} • {r.reportType}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Export Archive Button */}
        <button
          type="button"
          onClick={handleExportArchive}
          className="hidden md:flex items-center gap-1.5 rounded-xl border border-[#1f2d47] bg-[#0c1322] hover:bg-[#121c33] px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition shadow-sm"
          title="Export CSV Archive of all statutory filings"
        >
          <Download className="h-3.5 w-3.5 text-cyan-400" />
          <span>Export Archive</span>
        </button>

        {/* Worker Portal Button */}
        <button
          type="button"
          onClick={() => navigate('/master/mine-explorer')}
          className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#1f2d47] bg-[#0c1322] hover:bg-[#121c33] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition shadow-sm"
          title="Open Worker & Colliery Telemetry Portal"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" />
          <span>Worker Portal</span>
        </button>

        {/* Notifications Bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#1f2d47] bg-[#0c1322] text-slate-300 hover:border-slate-600 hover:text-white transition"
            title="Pending notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute 1.5 top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-700/80 bg-[#0d1424] shadow-2xl overflow-hidden z-50 p-3 animate-fadeIn text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Operational Alerts
                </span>
                <span className="text-[10px] text-amber-400 font-mono">21 Pending</span>
              </div>
              <div className="space-y-2">
                {EMERGING_ALERTS_DATA.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate('/master/alerts');
                    }}
                    className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 transition cursor-pointer border border-slate-800"
                  >
                    <div className="font-semibold text-white">{a.topic}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{a.affectedMinesCount} Mines Affected • +{a.growthPercent}% growth</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 rounded-2xl border border-[#1f2d47] bg-[#0c1322] hover:bg-[#121c33] p-1.5 sm:pr-3 transition text-left cursor-pointer"
          >
            {/* Cyan SK Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00d2ff] text-slate-950 font-black text-xs shrink-0 shadow-sm shadow-cyan-500/20">
              SK
            </div>

            {/* User Name & Details */}
            <div className="hidden md:block leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-tight">
                  Sunil Kumar (Senior Officer)
                </span>
                <span className="rounded bg-cyan-950/80 px-1 py-0.2 text-[9px] font-mono font-bold text-cyan-400 border border-cyan-500/40">
                  MASTER-001
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Coal Operations &amp; Oversight
              </div>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Profile Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-700/80 bg-[#0d1424] shadow-2xl overflow-hidden z-50 p-2 animate-fadeIn text-xs space-y-1">
              <div className="p-2.5 border-b border-slate-800">
                <div className="font-bold text-white">Sunil Kumar</div>
                <div className="text-[11px] text-cyan-400 font-mono mt-0.5">MASTER-001 · Senior Officer</div>
                <div className="text-[10px] text-slate-400">Coal Operations &amp; DGMS Oversight</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/master/settings');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Profile &amp; Role</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/master/settings');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>Enclave Preferences</span>
              </button>
              <div className="border-t border-slate-800 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Lock Workstation</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
