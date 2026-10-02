import React from 'react';
import { motion } from 'motion/react';
import {
  Sun,
  Moon,
  Cloud,
  HardDrive,
  Bell,
  AlertOctagon,
  LogOut,
  Sliders,
  Check,
  Shield,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Settings: React.FC = () => {
  const {
    settings,
    toggleTheme,
    toggleAiMode,
    updateSettings,
    logoutAllDevices,
  } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono font-bold tracking-widest text-[#00D9FF] uppercase">
          WORKSPACE PREFERENCES
        </span>
        <h2 className="text-2xl font-semibold text-white tracking-tight mt-1">
          System Settings & Controls
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure runtime environment parameters for the Coal India field station.
        </p>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: APPEARANCE */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mine-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Appearance & Theme</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Optimize display contrast for low-light underground chambers or outdoor sunlight.
          </p>
        </div>

        {/* Dark/Light toggle with sliding pill */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl relative w-48 shrink-0">
          {/* Sliding Pill */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-[#00D9FF]/25 to-blue-600/25 border border-[#00D9FF]/50 shadow-sm ${
              settings.theme === 'dark' ? 'left-1' : 'left-[calc(50%+2px)]'
            }`}
          />

          <button
            onClick={() => settings.theme !== 'dark' && toggleTheme()}
            className={`flex-1 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 relative z-10 transition-colors ${
              settings.theme === 'dark' ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dark</span>
          </button>

          <button
            onClick={() => settings.theme !== 'light' && toggleTheme()}
            className={`flex-1 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 relative z-10 transition-colors ${
              settings.theme === 'light' ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Light</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: AI MODE */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mine-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="max-w-lg">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">AI Synthesis Mode</h3>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${
                settings.aiMode === 'online'
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}
            >
              {settings.aiMode === 'online' ? 'Cloud Connected' : 'Edge Local'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Online uses cloud AI for faster results; Offline works without internet on local models
          </p>
        </div>

        {/* Online Cloud / Offline Local toggle with sliding pill */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl relative w-60 shrink-0">
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-[#00D9FF]/20 to-blue-600/20 border border-[#00D9FF]/40 ${
              settings.aiMode === 'online' ? 'left-1' : 'left-[calc(50%+2px)]'
            }`}
          />

          <button
            onClick={() => settings.aiMode !== 'online' && toggleAiMode()}
            className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 relative z-10 transition-colors ${
              settings.aiMode === 'online' ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Online Cloud</span>
          </button>

          <button
            onClick={() => settings.aiMode !== 'offline' && toggleAiMode()}
            className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 relative z-10 transition-colors ${
              settings.aiMode === 'offline' ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span>Offline Local</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 3: WORKSPACE ALERTS TOGGLE */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mine-card p-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Workspace Alerts & Push Signals</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Receive high-priority audio & visual notifications when methane or radar thresholds are flagged.
          </p>
        </div>

        <button
          onClick={() =>
            updateSettings({ workspaceAlerts: !settings.workspaceAlerts })
          }
          className={`w-12 h-7 rounded-full p-1 transition-colors relative cursor-pointer ${
            settings.workspaceAlerts ? 'bg-[#00D9FF]' : 'bg-slate-800'
          }`}
        >
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center ${
              settings.workspaceAlerts ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            {settings.workspaceAlerts && (
              <Check className="w-3 h-3 text-[#00D9FF] stroke-[3]" />
            )}
          </motion.div>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DANGER ZONE (red-bordered card): "Logout all devices" button */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 border border-red-500/40 bg-red-950/15 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-300">Danger Zone</h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-md">
                Terminate all active JWT field session tokens across field tablets, station terminals, and mobile devices.
              </p>
            </div>
          </div>

          <button
            onClick={logoutAllDevices}
            className="btn-action flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white text-xs font-semibold transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout all devices</span>
          </button>
        </div>
      </div>
    </div>
  );
};
