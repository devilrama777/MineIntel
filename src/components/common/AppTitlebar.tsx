import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  Minus,
  Square,
  X,
  HardDrive,
  Database,
  Radio,
  Monitor,
  ChevronDown,
  ChevronRight,
  Search,
  FileText,
  FolderOpen,
  Download,
  Terminal,
  Info,
  Maximize2,
  RefreshCw,
  Sparkles,
  Layers,
  FilePlus,
  HelpCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { AppView, DesktopPlatform, DesktopSystemInfo } from '../../types';
import { desktopBridge } from '../../services/desktopBridge';
import { useTheme } from '../../context/ThemeContext';

interface AppTitlebarProps {
  currentPlatform: DesktopPlatform;
  onChangePlatform: (platform: DesktopPlatform) => void;
  activeReportTitle?: string;
  isAirgapped?: boolean;
  onNavigate: (view: AppView) => void;
  onOpenAudit: () => void;
  onOpenAbout: () => void;
  currentView?: AppView;
  onOpenCommandPalette?: () => void;
  onRefreshData?: () => void;
}

const getViewTitle = (view?: AppView): string => {
  switch (view) {
    case 'dashboard':
      return 'Executive Operations Dashboard';
    case 'new-report':
      return 'New Report Generation Wizard';
    case 'data-sources':
      return 'Local Data Repository & Ingestion';
    case 'processing-jobs':
      return 'Extraction, OCR & Embedding Queue';
    case 'evidence-search':
      return 'Evidence Retrieval & Discovery';
    case 'report-planner':
      return 'Report Structure Planner';
    case 'report-editor':
      return 'Report Editor & AI Workspace';
    case 'asset-manager':
      return 'Asset & Figure Library';
    case 'validation':
      return 'Data Consistency & Validation';
    case 'preview':
      return 'PDF Report Proofing & Preview';
    case 'export':
      return 'Statutory Compiler & Export';
    case 'security-audit':
      return 'Airgap Security & Audit Ledger';
    case 'settings':
      return 'Inference Engine Configuration';
    default:
      return 'Executive Operations Dashboard';
  }
};

export const AppTitlebar: React.FC<AppTitlebarProps> = ({
  currentPlatform,
  onChangePlatform,
  activeReportTitle,
  isAirgapped = true,
  onNavigate,
  onOpenAudit,
  onOpenAbout,
  currentView = 'dashboard',
  onOpenCommandPalette,
  onRefreshData,
}) => {
  const { theme, toggleTheme, isLight } = useTheme();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMinimize = () => {
    desktopBridge.minimizeWindow();
  };

  const handleToggleMaximize = () => {
    const state = desktopBridge.toggleMaximize();
    setIsMaximized(state);
  };

  const handleClose = () => {
    const closed = desktopBridge.closeWindow();
    if (!closed) {
      alert('MineIntel Desktop: Window minimized to background system tray. The local AI daemon continues operating airgapped.');
    }
  };

  const isMac = currentPlatform === 'macos';
  const isWin = currentPlatform === 'windows';
  const isLinux = currentPlatform === 'linux';

  const shortcutKey = isMac ? '⌘' : 'Ctrl+';

  return (
    <header
      data-tauri-drag-region
      className={`h-11 w-full border-b flex items-center justify-between px-3 text-xs select-none z-50 shrink-0 relative transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#090d15] border-[#1b2535] text-slate-200'
      }`}
    >
      {/* Left: Branding & Desktop Menu */}
      <div className="flex items-center gap-3">
        {/* Brand Icon & Name: Custom MineIntel Logo */}
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-xs shrink-0 overflow-hidden border ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-slate-900 border-[#233145]'
            }`}
          >
            <img src="/logo.png" alt="MineIntel" className="w-5 h-5 object-contain" />
          </div>
          <div className="flex flex-col justify-center leading-none">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-extrabold tracking-wide text-[12px] ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                MineIntel
              </span>
              <span
                className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold ${
                  isLight
                    ? 'text-blue-700 bg-blue-50 border border-blue-200'
                    : 'text-blue-400 bg-blue-950/70 border border-blue-800/60'
                }`}
              >
                DESKTOP
              </span>
            </div>
            <span
              className={`text-[9px] font-medium tracking-tight pt-0.5 ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              AI Powered Report Generator Program
            </span>
          </div>
        </div>

        <div className={`h-4 w-px ${isLight ? 'bg-slate-200' : 'bg-[#233145]'}`} />

        {/* Desktop Application Menu Bar (File, Edit, View, Platform, Help) */}
        <div ref={menuBarRef} className="hidden md:flex items-center gap-0.5 text-[11px]">
          {/* File Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                activeMenu === 'file'
                  ? isLight
                    ? 'bg-slate-100 text-blue-600 font-semibold'
                    : 'bg-slate-800 text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div
                className={`absolute left-0 top-full mt-1 w-56 border rounded-lg shadow-xl py-1 z-50 font-mono text-xs ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-700 shadow-slate-200/50'
                    : 'bg-[#111722] border-[#233145] text-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('new-report');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>New Report Wizard</span>
                  </span>
                  <span className="text-[10px] opacity-70">{shortcutKey}N</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('data-sources');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Ingest Data Source...</span>
                  </span>
                  <span className="text-[10px] opacity-70">{shortcutKey}O</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('export');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Statutory PDF...</span>
                  </span>
                  <span className="text-[10px] opacity-70">{shortcutKey}E</span>
                </button>
                <div className={`h-px my-1 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-600 hover:text-white flex items-center justify-between text-rose-500 cursor-pointer"
                >
                  <span>Exit Desktop Program</span>
                  <span className="text-[10px]">{shortcutKey}Q</span>
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                activeMenu === 'edit'
                  ? isLight
                    ? 'bg-slate-100 text-blue-600 font-semibold'
                    : 'bg-slate-800 text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              Edit
            </button>
            {activeMenu === 'edit' && (
              <div
                className={`absolute left-0 top-full mt-1 w-52 border rounded-lg shadow-xl py-1 z-50 font-mono text-xs ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-700 shadow-slate-200/50'
                    : 'bg-[#111722] border-[#233145] text-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('evidence-search');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <span>Search Evidence Index</span>
                  <span className="text-[10px] opacity-70">{shortcutKey}F</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('report-editor');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <span>Active Report Editor</span>
                  <span className="text-[10px] opacity-70">{shortcutKey}T</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('validation');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <span>Consistency Gate</span>
                  <span className="text-[10px] opacity-70">{shortcutKey}G</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                activeMenu === 'view'
                  ? isLight
                    ? 'bg-slate-100 text-blue-600 font-semibold'
                    : 'bg-slate-800 text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              View
            </button>
            {activeMenu === 'view' && (
              <div
                className={`absolute left-0 top-full mt-1 w-52 border rounded-lg shadow-xl py-1 z-50 font-mono text-xs ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-700 shadow-slate-200/50'
                    : 'bg-[#111722] border-[#233145] text-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('dashboard');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  Executive Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('report-planner');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  Report Structure Planner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('preview');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  Proofing Preview (PDF)
                </button>
                <div className={`h-px my-1 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />
                <button
                  type="button"
                  onClick={() => {
                    desktopBridge.toggleFullscreen();
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <span>Toggle Fullscreen</span>
                  <span className="text-[10px] opacity-70">F11</span>
                </button>
              </div>
            )}
          </div>

          {/* OS Platform Switcher Menu (Linux / macOS / Windows) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'platform' ? null : 'platform')}
              className={`px-2 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                activeMenu === 'platform'
                  ? isLight
                    ? 'bg-slate-100 text-blue-600 font-semibold'
                    : 'bg-slate-800 text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Monitor className="w-3 h-3 text-emerald-500" />
              <span>OS: {currentPlatform === 'linux' ? 'Linux' : currentPlatform === 'macos' ? 'macOS' : 'Windows'}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {activeMenu === 'platform' && (
              <div
                className={`absolute left-0 top-full mt-1 w-64 border rounded-lg shadow-xl py-1 z-50 font-mono text-xs ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-700 shadow-slate-200/50'
                    : 'bg-[#111722] border-[#233145] text-slate-200'
                }`}
              >
                <div
                  className={`px-3 py-1 text-[10px] uppercase tracking-wider border-b ${
                    isLight ? 'text-slate-400 border-slate-100' : 'text-slate-400 border-slate-800'
                  }`}
                >
                  Target Desktop Environment
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onChangePlatform('linux');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between cursor-pointer ${
                    isLinux
                      ? isLight ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-blue-900/40 text-blue-300 font-bold'
                      : isLight ? 'hover:bg-slate-50' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <div>
                    <div>🐧 Linux (Ubuntu / RHEL / Debian)</div>
                    <div className="text-[10px] opacity-70">POSIX sockets, /opt/mineintel, GTK</div>
                  </div>
                  {isLinux && <span className="text-emerald-500 text-xs">Active</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangePlatform('macos');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between cursor-pointer ${
                    isMac
                      ? isLight ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-blue-900/40 text-blue-300 font-bold'
                      : isLight ? 'hover:bg-slate-50' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <div>
                    <div>🍎 macOS (Apple Silicon / Intel)</div>
                    <div className="text-[10px] opacity-70">Cocoa titlebar, ~/Library/Application Support</div>
                  </div>
                  {isMac && <span className="text-emerald-500 text-xs">Active</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangePlatform('windows');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between cursor-pointer ${
                    isWin
                      ? isLight ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-blue-900/40 text-blue-300 font-bold'
                      : isLight ? 'hover:bg-slate-50' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <div>
                    <div>🪟 Windows (11 / 10 Enterprise)</div>
                    <div className="text-[10px] opacity-70">WinUI controls, C:\ProgramData\MineIntel</div>
                  </div>
                  {isWin && <span className="text-emerald-500 text-xs">Active</span>}
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                activeMenu === 'help'
                  ? isLight
                    ? 'bg-slate-100 text-blue-600 font-semibold'
                    : 'bg-slate-800 text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              Help
            </button>
            {activeMenu === 'help' && (
              <div
                className={`absolute left-0 top-full mt-1 w-56 border rounded-lg shadow-xl py-1 z-50 font-mono text-xs ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-700 shadow-slate-200/50'
                    : 'bg-[#111722] border-[#233145] text-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onOpenAudit();
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verify Airgap Security</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('settings');
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-blue-500" />
                  <span>Local Daemon IPC Test</span>
                </button>
                <div className={`h-px my-1 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />
                <button
                  type="button"
                  onClick={() => {
                    onOpenAbout();
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>About MineIntel Desktop...</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Merged View Title & Global Command Search */}
      <div className="flex items-center gap-2.5 flex-1 max-w-xl justify-center px-2">
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border truncate ${
            isLight
              ? 'bg-slate-100 border-slate-200 text-slate-700'
              : 'bg-[#121824] border-[#223145] text-slate-300'
          }`}
        >
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`hover:underline cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            MineIntel
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-semibold truncate text-blue-500">
            {activeReportTitle && currentView === 'report-editor' ? activeReportTitle : getViewTitle(currentView)}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-md transition cursor-pointer border text-xs max-w-xs w-full ${
            isLight
              ? 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200 shadow-2xs'
              : 'bg-[#111722] hover:bg-[#162030] text-slate-400 border-slate-700/80'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs truncate">Search evidence or actions...</span>
          <kbd
            className={`ml-auto inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
              isLight
                ? 'bg-slate-100 text-slate-500 border-slate-200'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {shortcutKey}K
          </kbd>
        </button>
      </div>

      {/* Right: Refresh + Light/Dark Switcher + AIRGAPPED NODE (NO LOCAL MODEL NAME) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onRefreshData?.()}
          className={`p-1.5 rounded-md border transition cursor-pointer ${
            isLight
              ? 'text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-200 shadow-2xs'
              : 'text-slate-400 hover:text-slate-200 bg-[#121824] hover:bg-slate-800 border-[#223145]'
          }`}
          title="Refresh Local Daemons & Index Cache"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {isLight ? (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenAudit}
          className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-md border transition cursor-pointer ${
            isLight
              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
              : 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-800/40'
          }`}
          title="Airgap Hardware Integrity Active"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-semibold hidden sm:inline">AIRGAPPED NODE</span>
        </button>
      </div>
    </header>
  );
};
