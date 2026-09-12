import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Eye,
  Search,
  HardDrive,
  Shield,
  Zap,
  Layers,
  FileCode,
  Sliders,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { SystemHealthComponent } from '../../types';

interface SettingsViewProps {
  healthComponents: SystemHealthComponent[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ healthComponents }) => {
  const [activeTab, setActiveTab] = useState<
    | 'General'
    | 'AI Models'
    | 'Processing'
    | 'OCR'
    | 'Search'
    | 'Storage'
    | 'Security'
    | 'Performance'
  >('AI Models');

  const [savedNotice, setSavedNotice] = useState(false);

  // Settings mock state
  const [ipcEndpoint, setIpcEndpoint] = useState('http://127.0.0.1:8000');
  const [defaultModel, setDefaultModel] = useState('openrouter/free');
  const [gpuLayers, setGpuLayers] = useState(0);
  const [contextWindow, setContextWindow] = useState(32768);
  const [threads, setThreads] = useState(16);
  const [paddlePasses, setPaddlePasses] = useState('Dual Pass (Lattice + Stream)');
  const [ocrDpi, setOcrDpi] = useState(300);
  const [vectorDimensions, setVectorDimensions] = useState(1024);
  const [strictAirgap, setStrictAirgap] = useState(true);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const tabs = [
    { id: 'General', label: 'General' },
    { id: 'AI Models', label: 'AI Models (Local LLM)' },
    { id: 'Processing', label: 'Processing Pipelines' },
    { id: 'OCR', label: 'OCR & Vision Engine' },
    { id: 'Search', label: 'Vector & Hybrid Search' },
    { id: 'Storage', label: 'Local NVMe Storage' },
    { id: 'Security', label: 'Airgap & Security' },
    { id: 'Performance', label: 'Hardware Acceleration' },
  ] as const;

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#233145] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Local System Configuration & Engine Settings
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Configure local IPC bindings, hardware acceleration parameters, OCR pipelines, and airgap firewall rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedNotice && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Settings Applied to Local Daemon
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded font-mono text-xs transition cursor-pointer shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Main Settings Split: Left Tabs, Right Form */}
      <div className="flex-1 flex gap-5 overflow-hidden">
        {/* Left Vertical Tabs */}
        <div className="w-64 bg-[#111722] border border-[#1e2a3b] rounded-md overflow-hidden flex flex-col shrink-0 select-none">
          <div className="p-3 bg-[#141d2b] border-b border-[#1e2a3b] text-[10px] font-mono uppercase tracking-wider text-slate-400">
            CONFIGURATION SECTORS
          </div>
          <div className="p-2 space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Configuration Forms */}
        <div className="flex-1 bg-[#111722] border border-[#1e2a3b] rounded-md p-6 overflow-y-auto space-y-6 font-mono text-xs">
          {activeTab === 'AI Models' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 font-sans mb-1">
                  Local AI Inference Engine & Model Registry
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  The local application invokes LLMs directly via local UNIX socket or HTTP loopback (Tauri IPC).
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 mb-1">LOCAL IPC ENDPOINT</label>
                  <input
                    type="text"
                    value={ipcEndpoint}
                    onChange={(e) => setIpcEndpoint(e.target.value)}
                    className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">
                    Backend service endpoint (Loopback secure).
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">SOVEREIGN AI MODEL (ENFORCED)</label>
                  <select
                    value={defaultModel}
                    disabled
                    className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-1.5 text-slate-100 opacity-90 cursor-not-allowed"
                  >
                    <option value="openrouter/free">openrouter/free (Single Production Model)</option>
                  </select>
                  <span className="text-[10px] text-blue-400 font-mono mt-1 block">
                    Strict single-model architecture enforced: OpenRouter (openrouter/free).
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 mb-1">GPU OFFLOAD LAYERS: {gpuLayers}</label>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={gpuLayers}
                      onChange={(e) => setGpuLayers(parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="text-[10px] text-slate-400">NVIDIA CUDA GPU 0 offload depth</div>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">CONTEXT LENGTH (TOKENS)</label>
                    <input
                      type="number"
                      value={contextWindow}
                      onChange={(e) => setContextWindow(parseInt(e.target.value))}
                      className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'OCR' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 font-sans mb-1">
                  OCR Engine & Computer Vision Pipelines
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  Dual-pass text recognition with table boundary reconstruction for scanned records.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 mb-1">TABLE EXTRACTION RECONSTRUCTION</label>
                  <select
                    value={paddlePasses}
                    onChange={(e) => setPaddlePasses(e.target.value)}
                    className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                  >
                    <option value="Dual Pass (Lattice + Stream)">Dual Pass (Lattice Strict + Stream Heuristic)</option>
                    <option value="Lattice Only">Lattice Only (Explicit Table Grid Borders)</option>
                    <option value="Stream Only">Stream Only (Border-Free Financial Ledgers)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">OCR PRE-PROCESSING RESOLUTION (DPI): {ocrDpi}</label>
                  <input
                    type="range"
                    min="150"
                    max="600"
                    step="50"
                    value={ocrDpi}
                    onChange={(e) => setOcrDpi(parseInt(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="text-[10px] text-slate-400">Higher DPI improves OCR on scanned field inspection forms</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 font-sans mb-1">
                  Airgap Enforcement & System Guardrails
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  Verify network containment parameters and credential storage isolation.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-[#162030] border border-slate-700 rounded cursor-pointer">
                  <div>
                    <div className="font-semibold text-slate-200">Enforce Hard Airgap Firewall</div>
                    <div className="text-[11px] text-slate-400 font-sans">Drop all outbound WAN sockets at kernel level</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={strictAirgap}
                    onChange={(e) => setStrictAirgap(e.target.checked)}
                    className="rounded border-slate-600 text-blue-600"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-[#162030] border border-slate-700 rounded cursor-pointer">
                  <div>
                    <div className="font-semibold text-slate-200">Cryptographic Audit Ledger Signing</div>
                    <div className="text-[11px] text-slate-400 font-sans">Sign all user modifications with SHA-256 HMAC</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="rounded border-slate-600 text-emerald-600"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab !== 'AI Models' && activeTab !== 'OCR' && activeTab !== 'Security' && (
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-sm font-semibold text-slate-100 font-sans mb-1">
                {activeTab} Configurations
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Operating parameters calibrated for MineIntel high-concurrency desktop nodes (Linux, macOS, Windows).
              </p>

              <div className="p-4 bg-[#141d2b] border border-slate-800 rounded space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subsystem State:</span>
                  <span className="text-emerald-400 font-bold">Optimal / Online</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Local Daemon Host:</span>
                  <span>127.0.0.1:8000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Process Affinity:</span>
                  <span>Direct NVMe I/O + GPU Direct RDMA</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
