import React from 'react';
import {
  X,
  Monitor,
  ShieldCheck,
  Cpu,
  HardDrive,
  Terminal,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { DesktopPlatform } from '../../types';
import { desktopBridge } from '../../services/desktopBridge';

interface AboutDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlatform: DesktopPlatform;
  onChangePlatform: (platform: DesktopPlatform) => void;
}

export const AboutDesktopModal: React.FC<AboutDesktopModalProps> = ({
  isOpen,
  onClose,
  currentPlatform,
  onChangePlatform,
}) => {
  if (!isOpen) return null;

  const sysInfo = desktopBridge.getSystemInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#0f1520] border border-[#233145] w-full max-w-lg rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b0f17] border-b border-[#1b2535] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 border border-[#233145] rounded-lg flex items-center justify-center p-1 shadow-md">
              <img src="/logo.png" alt="MineIntel" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                MineIntel
                <span className="text-[10px] font-mono font-semibold text-blue-400 bg-blue-950/70 border border-blue-800/60 px-2 py-0.5 rounded">
                  Desktop v2.5.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                AI Powered Report Generator Program
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-[#131b28] border border-[#233247] rounded space-y-2">
            <div className="text-slate-200 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Airgapped Cross-Platform Desktop Architecture</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              MineIntel is an airgapped, high-throughput desktop application engineered specifically for Linux, macOS, and Windows workstations. It executes large-scale mining operational and statutory report generation entirely on-premise using local AI models without external cloud connectivity.
            </p>
          </div>

          {/* OS Platform Switcher */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Active Desktop Environment:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onChangePlatform('linux')}
                className={`px-3 py-2 border rounded flex flex-col items-center gap-1 transition cursor-pointer ${
                  currentPlatform === 'linux'
                    ? 'border-blue-500 bg-blue-950/50 text-blue-300 font-bold'
                    : 'border-slate-800 bg-[#121824] text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-base">🐧</span>
                <span>Linux</span>
                <span className="text-[9px] text-slate-400">Ubuntu/RHEL</span>
              </button>

              <button
                type="button"
                onClick={() => onChangePlatform('macos')}
                className={`px-3 py-2 border rounded flex flex-col items-center gap-1 transition cursor-pointer ${
                  currentPlatform === 'macos'
                    ? 'border-blue-500 bg-blue-950/50 text-blue-300 font-bold'
                    : 'border-slate-800 bg-[#121824] text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-base">🍎</span>
                <span>macOS</span>
                <span className="text-[9px] text-slate-400">Apple Silicon</span>
              </button>

              <button
                type="button"
                onClick={() => onChangePlatform('windows')}
                className={`px-3 py-2 border rounded flex flex-col items-center gap-1 transition cursor-pointer ${
                  currentPlatform === 'windows'
                    ? 'border-blue-500 bg-blue-950/50 text-blue-300 font-bold'
                    : 'border-slate-800 bg-[#121824] text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-base">🪟</span>
                <span>Windows</span>
                <span className="text-[9px] text-slate-400">Win 11 x64</span>
              </button>
            </div>
          </div>

          {/* Desktop Subsystem Specifications */}
          <div className="border border-[#1e2a3c] rounded bg-[#0b1018] p-3 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between py-0.5 border-b border-slate-800/80">
              <span className="text-slate-400">Host OS:</span>
              <span className="text-slate-200">{sysInfo.osName}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/80">
              <span className="text-slate-400">Kernel:</span>
              <span className="text-slate-200">{sysInfo.kernelVersion}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/80">
              <span className="text-slate-400">Desktop Shell:</span>
              <span className="text-slate-200">Tauri 2.0 / Rust (Webview2 / WebKitGTK)</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/80">
              <span className="text-slate-400">Local AI IPC:</span>
              <span className="text-blue-400">{sysInfo.localDaemonUrl}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-400">Repository Path:</span>
              <span className="text-slate-300 truncate max-w-[280px]">{desktopBridge.getRootDataPath()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b0f17] border-t border-[#1b2535] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Certified Airgap Zero-Exfiltration Node</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded transition text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
