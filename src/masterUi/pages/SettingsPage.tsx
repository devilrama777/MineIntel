import React, { useState } from 'react';
import {
  Settings,
  User,
  Bell,
  Users,
  Database,
  Sliders,
  CheckCircle2,
  Shield,
  Save,
  Lock,
  Compass,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'team' | 'datasources' | 'preferences'>('profile');

  // Profile Form state
  const [name, setName] = useState('Inspector R. Sharma');
  const [email, setEmail] = useState('r.sharma@cmpdi.co.in');
  const [role, setRole] = useState('Senior Mining Geologist / Operational Auditor');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Notification toggles
  const [notifEmerging, setNotifEmerging] = useState(true);
  const [notifCompletion, setNotifCompletion] = useState(true);
  const [notifRetraining, setNotifRetraining] = useState(true);
  const [notifSystemAlerts, setNotifSystemAlerts] = useState(true);


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Workstation Configuration
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
          Settings &amp; Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your analyst profile, notification triggers, connected CIL data lakes, and security credentials.
        </p>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Configuration saved successfully to local secure enclave partition.</span>
        </div>
      )}

      {/* Settings Tabs & Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Navigation (3 cols) */}
        <div className="md:col-span-3 rounded-2xl border border-slate-800 bg-[#0d1424] p-3 space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === 'profile'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <User className="h-4 w-4" /> Profile &amp; Role
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === 'notifications'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Bell className="h-4 w-4" /> Notifications
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === 'team'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" /> Team &amp; Access
          </button>
          <button
            onClick={() => setActiveTab('datasources')}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === 'datasources'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Database className="h-4 w-4" /> Data Sources
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === 'preferences'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" /> System Preferences
          </button>
        </div>

        {/* Right Content Area (9 cols) */}
        <div className="md:col-span-9 rounded-2xl border border-slate-800 bg-[#0d1424] p-6 sm:p-8 shadow-xl">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white">Analyst Identity &amp; Clearance</h3>
                <p className="text-xs text-slate-400 mt-1">Official credentials recognized by the CIL Statutory System.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Designation &amp; Role
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-md shadow-amber-500/20"
                >
                  <Save className="h-4 w-4" /> Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white">Automated Trigger Notifications</h3>
                <p className="text-xs text-slate-400 mt-1">Configure when MineIntel dispatches push alerts and desktop banners.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-[#080d17]">
                  <div>
                    <div className="text-xs font-bold text-white">Emerging Topic Alerts</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Trigger when a hazard topic velocity increases by &gt;25% in 30 days.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifEmerging}
                    onChange={(e) => setNotifEmerging(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30 h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-[#080d17]">
                  <div>
                    <div className="text-xs font-bold text-white">Report Synthesis Completion</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Notify when autonomous document reasoning finishes.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifCompletion}
                    onChange={(e) => setNotifCompletion(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30 h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-[#080d17]">
                  <div>
                    <div className="text-xs font-bold text-white">Model Retraining Checkpoints</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Receive logs when Sentence-BERT completes monthly training runs.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifRetraining}
                    onChange={(e) => setNotifRetraining(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30 h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-[#080d17]">
                  <div>
                    <div className="text-xs font-bold text-white">DGMS Compliance System Alerts</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Broadcast urgent statutory notices and bench stability warnings.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSystemAlerts}
                    onChange={(e) => setNotifSystemAlerts(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30 h-4 w-4"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Team */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white">CMPDI Enclave Analysts &amp; Access</h3>
                <p className="text-xs text-slate-400 mt-1">Authorized personnel with clearance to view confidential mine filings.</p>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Inspector R. Sharma', role: 'Chief Operational Auditor', clearance: 'Level 4 (Full Enclave)', status: 'Active' },
                  { name: 'Dr. S. K. Mahapatra', role: 'Principal Geologist (SECL)', clearance: 'Level 3 (Regional)', status: 'Active' },
                  { name: 'Er. Ananya Sen', role: 'Senior Hydrogeologist (MCL)', clearance: 'Level 3 (Regional)', status: 'Active' },
                  { name: 'Prof. R. V. Kulkarni', role: 'Geotechnical Consultant', clearance: 'Level 2 (Read-only)', status: 'Active' },
                ].map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-[#080d17] text-xs">
                    <div>
                      <div className="font-bold text-white">{member.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{member.role}</div>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20">
                        {member.clearance}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Data Sources */}
          {activeTab === 'datasources' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white">Connected Ingestion Pipelines</h3>
                <p className="text-xs text-slate-400 mt-1">Sovereign CIL data lakes providing raw exploration logs.</p>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'CMPDI Central Core Sample Repository', status: 'Connected', sync: 'Continuous', count: '14,200 Borings' },
                  { name: 'DGMS Statutory Safety Circulars Data Lake', status: 'Connected', sync: 'Daily Sync', count: '890 Notices' },
                  { name: 'CIL Weighbridge & Rake Freight Feeds', status: 'Connected', sync: 'Real-time Telemetry', count: '372 Rakes/Day' },
                  { name: 'Satellite InSAR Bench Radar Displacement Stream', status: 'Connected', sync: 'Every 6 Hours', count: '8 Opencast Pits' },
                ].map((ds, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-[#080d17] text-xs">
                    <div>
                      <div className="font-bold text-white">{ds.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{ds.sync} • {ds.count}</div>
                    </div>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                      {ds.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Preferences */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white">Interface &amp; Display Preferences</h3>
                <p className="text-xs text-slate-400 mt-1">Configure your personal analytical workstation parameters.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Color Theme</label>
                  <select className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3.5 py-2 text-xs text-white outline-none">
                    <option value="dark">Coal Dark Enclave (Default)</option>
                    <option value="midnight">Deep Midnight Navy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Default Report Export Template</label>
                  <select className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3.5 py-2 text-xs text-white outline-none">
                    <option value="parliamentary">Parliamentary &amp; DGMS Standard</option>
                    <option value="executive">Executive Corporate Brief</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
