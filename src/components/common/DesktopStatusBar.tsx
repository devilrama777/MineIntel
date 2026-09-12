import React from 'react';
import {
  Monitor,
  Cpu,
  Database,
  Radio,
  HardDrive,
  ShieldCheck,
  Zap,
  Terminal,
} from 'lucide-react';
import { DesktopPlatform } from '../../types';
import { desktopBridge } from '../../services/desktopBridge';
import { useTheme } from '../../context/ThemeContext';

interface DesktopStatusBarProps {
  currentPlatform: DesktopPlatform;
  onChangePlatform: (platform: DesktopPlatform) => void;
  onOpenAudit: () => void;
  onOpenSettings: () => void;
}

export const DesktopStatusBar: React.FC<DesktopStatusBarProps> = ({
  currentPlatform,
  onChangePlatform,
  onOpenAudit,
  onOpenSettings,
}) => {
  const { isLight } = useTheme();
  const sysInfo = desktopBridge.getSystemInfo();

  return (
    <footer
      className={`h-6 w-full border-t flex items-center justify-between px-3 text-[10px] font-mono select-none shrink-0 z-30 transition-colors ${
        isLight
          ? 'bg-slate-100 border-slate-200 text-slate-600'
          : 'bg-[#070a0f] border-[#1a2332] text-slate-400'
      }`}
    >
      {/* Left: Platform & IPC Connection */}
      <div className="flex items-center gap-3">
        {/* OS Platform indicator */}
        <button
          type="button"
          onClick={() => {
            const next: DesktopPlatform =
              currentPlatform === 'linux' ? 'macos' : currentPlatform === 'macos' ? 'windows' : 'linux';
            onChangePlatform(next);
          }}
          className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition cursor-pointer ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Click to cycle Desktop OS Mode (Linux / macOS / Windows)"
        >
          <Monitor className="w-3 h-3 text-blue-500" />
          <span>
            {currentPlatform === 'linux'
              ? 'Linux (x86_64)'
              : currentPlatform === 'macos'
              ? 'macOS (arm64)'
              : 'Windows 11 (x64)'}
          </span>
        </button>

        {/* Storage path */}
        <span className="hidden lg:inline opacity-70 truncate max-w-[280px]">
          Workspace: {desktopBridge.getRootDataPath()}
        </span>
      </div>

      {/* Middle: Local Encryption & Partition Status */}
      <div className="hidden md:flex items-center gap-4 opacity-80">
        <div className="flex items-center gap-1">
          <HardDrive className="w-2.5 h-2.5 text-blue-500" />
          <span>Local Partition Encrypted</span>
        </div>

        <div className="flex items-center gap-1">
          <Database className="w-2.5 h-2.5 opacity-60" />
          <span>AES-256 GCM</span>
        </div>
      </div>

      {/* Right: Airgap & Security */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenAudit}
          className={`flex items-center gap-1 font-semibold tracking-wide transition cursor-pointer ${
            isLight ? 'text-emerald-700 hover:text-emerald-800' : 'text-emerald-400 hover:text-emerald-300'
          }`}
          title="Airgap Hardware Lockdown Enforced"
        >
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>ZERO CLOUD TELEMETRY</span>
        </button>
      </div>
    </footer>
  );
};
