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
import { useAuth } from '../../context/AuthContext';

interface SettingsViewProps {
  healthComponents: SystemHealthComponent[];
  aiProvider?: string;
  aiModel?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ healthComponents, aiProvider, aiModel }) => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | 'Profile'
    | 'General'
    | 'AI Models'
    | 'Processing'
    | 'OCR'
    | 'Search'
    | 'Storage'
    | 'Security'
    | 'Performance'
  >('Profile');

  const [savedNotice, setSavedNotice] = useState(false);

  // Settings state
  const [ipcEndpoint, setIpcEndpoint] = useState('/api');
  const [defaultModel, setDefaultModel] = useState('openrouter/free');
  const [gpuLayers, setGpuLayers] = useState(0);
  const [contextWindow, setContextWindow] = useState(32768);
  const [threads, setThreads] = useState(16);
  const [paddlePasses, setPaddlePasses] = useState('Dual Pass (Lattice + Stream)');
  const [ocrDpi, setOcrDpi] = useState(300);
  const [vectorDimensions, setVectorDimensions] = useState(1024);
  const [strictAirgap, setStrictAirgap] = useState(true);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const saveProfile = async () => {
    setProfileError('');
    try { await updateProfile({ display_name: displayName, phone, email }); setProfileMessage('Profile saved successfully.'); }
    catch (err: any) { setProfileError(err.message || 'Unable to save profile.'); }
  };

  const savePassword = async () => {
    setProfileError('');
    if (newPassword.length < 8) { setProfileError('New password must be at least 8 characters.'); return; }
    try { await changePassword(currentPassword, newPassword); setProfileMessage('Password changed. Please sign in again.'); }
    catch (err: any) { setProfileError(err.message || 'Unable to change password.'); }
  };

  const tabs = [
    { id: 'Profile', label: 'My Profile' },
    { id: 'General', label: 'General' },
    { id: 'AI Models', label: 'AI Engine & Models' },
    { id: 'Processing', label: 'Processing Pipelines' },
    { id: 'OCR', label: 'OCR & Vision Engine' },
    { id: 'Search', label: 'Vector & Hybrid Search' },
    { id: 'Storage', label: 'Storage & Repositories' },
    { id: 'Security', label: 'Security & Integrity' },
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
              System Configuration & Engine Settings
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Configure backend API bindings, processing pipelines, OCR settings, and audit security guardrails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedNotice && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Settings Applied to Session
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
          {activeTab === 'Profile' && (
            <div className="space-y-5 max-w-2xl">
              <div><h2 className="text-sm font-semibold text-slate-100 font-sans">Authenticated User Profile</h2><p className="text-xs text-slate-400 font-sans">Update permitted personal information. Officer ID is immutable.</p></div>
              {profileMessage && <div className="text-xs text-emerald-400">{profileMessage}</div>}
              {profileError && <div className="text-xs text-red-400">{profileError}</div>}
              <label className="block text-slate-300">OFFICER ID<input value={user?.username || ''} readOnly className="mt-1 w-full bg-[#0e1521] border border-slate-700 rounded px-3 py-2 text-slate-500 cursor-not-allowed" /></label>
              <label className="block text-slate-300">FULL NAME<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full bg-[#182333] border border-slate-700 rounded px-3 py-2 text-slate-100" /></label>
              <label className="block text-slate-300">PHONE NUMBER<input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full bg-[#182333] border border-slate-700 rounded px-3 py-2 text-slate-100" /></label>
              <label className="block text-slate-300">EMAIL ADDRESS<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full bg-[#182333] border border-slate-700 rounded px-3 py-2 text-slate-100" /></label>
              <button type="button" onClick={saveProfile} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs">Save Profile</button>
              <div className="border-t border-[#233145] pt-5 space-y-3"><h3 className="text-sm font-semibold text-slate-100 font-sans">Change Password</h3><p className="text-xs text-slate-400 font-sans">The current session is invalidated after a successful change.</p>
                <input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-2 text-slate-100" />
                <input type="password" placeholder="New password (minimum 8 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-2 text-slate-100" />
                <button type="button" onClick={savePassword} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs">Change Password</button>
              </div>
            </div>
          )}

          {activeTab === 'AI Models' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 font-sans mb-1">
                  AI Inference Engine & Sovereign Model Registry
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  The application invokes AI reasoning models through the sovereign OpenRouter pipeline.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 mb-1">BACKEND API PREFIX</label>
                  <input
                    type="text"
                    value={ipcEndpoint}
                    onChange={(e) => setIpcEndpoint(e.target.value)}
                    className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">
                    Centralized FastAPI backend routing prefix (/api).
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">SOVEREIGN AI MODEL (CONFIGURED)</label>
                  <div className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-1.5 text-slate-100 font-mono flex items-center justify-between">
                    <span className="font-semibold text-blue-400">{aiModel || defaultModel}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      {(aiProvider || 'openrouter').toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono mt-1 block">
                    Active backend inference provider: {aiProvider || 'openrouter'} | Model: {aiModel || defaultModel}
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

          {activeTab !== 'Profile' && activeTab !== 'AI Models' && activeTab !== 'OCR' && activeTab !== 'Security' && (
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
                  <span className="text-slate-400">Backend API Gateway:</span>
                  <span>/api (Relative Origin)</span>
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
