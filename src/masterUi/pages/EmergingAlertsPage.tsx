import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  Filter,
  ShieldAlert,
  MapPin,
  FileText,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  EMERGING_ALERTS_DATA,
  MINES_DATA,
  REPORTS_DATA,
  EmergingAlert,
  MiningReport,
  TopicItem,
} from '../data/miningData';

interface OutletContextType {
  onOpenReport: (report: MiningReport) => void;
  onOpenTopic: (topic: TopicItem) => void;
  onOpenTopicByName: (name: string) => void;
}

export const EmergingAlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { onOpenReport, onOpenTopicByName } = useOutletContext<OutletContextType>();

  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [mineFilter, setMineFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected alert for modal investigation
  const [investigatingAlert, setInvestigatingAlert] = useState<EmergingAlert | null>(null);

  const filteredAlerts = EMERGING_ALERTS_DATA.filter((alt) => {
    if (severityFilter !== 'ALL' && alt.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && alt.status !== statusFilter) return false;
    if (mineFilter !== 'ALL' && !alt.affectedMines.some((m) => m.toLowerCase().includes(mineFilter.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-400">
              Real-Time Anomalous Hazard Velocity
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Emerging Topic Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Automated alerts triggered when topic mention acceleration exceeds statutory threshold benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-xs font-bold text-rose-400">
            {EMERGING_ALERTS_DATA.filter((a) => a.severity === 'HIGH').length} High Priority Alerts
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-4 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          <Filter className="h-3.5 w-3.5 text-amber-400" /> Alert Criteria Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Alert Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="ALL">All Severities (High, Medium, Low)</option>
              <option value="HIGH">HIGH Priority Only</option>
              <option value="MEDIUM">MEDIUM Priority</option>
              <option value="LOW">LOW Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Affected Colliery</label>
            <select
              value={mineFilter}
              onChange={(e) => setMineFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="ALL">All Active Collieries</option>
              {MINES_DATA.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Investigation Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="ALL">All Investigation States</option>
              <option value="Active">Active (Unresolved)</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert Cards List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-2xl border p-6 bg-[#0d1424] shadow-lg transition flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-slate-700 ${
              alert.severity === 'HIGH' ? 'border-rose-500/30' : alert.severity === 'MEDIUM' ? 'border-amber-500/30' : 'border-slate-800'
            }`}
          >
            {/* Left Content */}
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                    alert.severity === 'HIGH'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : alert.severity === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {alert.severity} SEVERITY
                </span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/20">
                  +{alert.growthPercent}% Velocity Spike
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Detected: {alert.detectedDate}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                {alert.topic}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {alert.triggerDescription}
              </p>

              {/* Badges: Affected Mines & Report Count */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-400" />
                  <span>Affected Mines: <strong className="text-white">{alert.affectedMinesCount} Collieries</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Filing Records: <strong className="text-white">{alert.reportsCount} Reports</strong></span>
                </div>
                <div>
                  <span className="text-slate-500">Risk Profile: </span>
                  <span className="text-amber-300 font-medium">{alert.primaryRisk}</span>
                </div>
              </div>
            </div>

            {/* Right Action Button */}
            <div className="shrink-0 flex items-center gap-3">
              <button
                onClick={() => setInvestigatingAlert(alert)}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-md ${
                  alert.severity === 'HIGH'
                    ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20'
                    : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
                }`}
              >
                <span>Investigate</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Investigation Modal */}
      {investigatingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-[#0d1424] text-slate-100 shadow-2xl overflow-hidden my-8">
            <div className="flex items-start justify-between border-b border-slate-800 bg-[#121c33] p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-0.5 uppercase border border-rose-500/30">
                      {investigatingAlert.severity} PRIORITY INVESTIGATION
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Detected on {investigatingAlert.detectedDate}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {investigatingAlert.topic}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setInvestigatingAlert(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-4.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                  NLP Velocity Anomaly Trigger
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {investigatingAlert.triggerDescription}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Recommended Statutory &amp; Engineering Intervention
                </h4>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-200">
                  {investigatingAlert.recommendedAction}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Affected Collieries &amp; Subsidiaries ({investigatingAlert.affectedMines.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {investigatingAlert.affectedMines.map((m, idx) => (
                    <span key={idx} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-amber-400" /> {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Underlying Evidence</div>
                  <div className="text-sm font-bold text-white font-mono">{investigatingAlert.reportsCount} Technical Reports Processed</div>
                </div>
                <button
                  onClick={() => {
                    const topicName = investigatingAlert.topic;
                    setInvestigatingAlert(null);
                    onOpenTopicByName(topicName);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
                >
                  <span>Explore Full Topic Drilldown</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800 bg-[#0a101f] px-6 py-4 flex justify-end">
              <button
                onClick={() => setInvestigatingAlert(null)}
                className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                Close Investigation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
