import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Download,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Layers,
  AlertTriangle,
  Sparkles,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Filter,
  CheckCircle2,
  Network,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  MINES_DATA,
  REPORTS_DATA,
  TOPICS_DATA,
  EMERGING_ALERTS_DATA,
  MiningReport,
  TopicItem,
} from '../data/miningData';

interface OutletContextType {
  onOpenReport: (report: MiningReport) => void;
  onOpenTopic: (topic: TopicItem) => void;
}

// Monthly Production Trend Data (Fiscal 2026: Apr - Sep) matching screenshot
const MONTHLY_PRODUCTION_TREND = [
  { month: 'Apr', actual: 175, target: 165 },
  { month: 'May', actual: 195, target: 180 },
  { month: 'Jun', actual: 190, target: 185 },
  { month: 'Jul', actual: 210, target: 200 },
  { month: 'Aug', actual: 228, target: 215 },
  { month: 'Sep', actual: 252, target: 230 },
];

// Subsidiary Performance Data matching screenshot
const SUBSIDIARY_PERFORMANCE = [
  { code: 'SECL', name: 'South Eastern Coalfields Ltd', score: 95, share: '38.4%', color: 'amber' },
  { code: 'MCL', name: 'Mahanadi Coalfields Ltd', score: 84, share: '26.2%', color: 'cyan' },
  { code: 'WCL', name: 'Western Coalfields Ltd', score: 73, share: '15.8%', color: 'cyan' },
  { code: 'CCL', name: 'Central Coalfields Ltd', score: 62, share: '11.6%', color: 'cyan' },
  { code: 'NCL', name: 'Northern Coalfields Ltd', score: 51, share: '8%', color: 'darkCyan' },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { onOpenReport } = useOutletContext<OutletContextType>();

  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'insights' | 'network'>('overview');
  const [selectedMine, setSelectedMine] = useState('ALL');

  const filteredReports = REPORTS_DATA.filter((r) =>
    selectedMine === 'ALL' || r.mineId === selectedMine
  );

  const handleExportExecutiveReport = () => {
    const text = `COAL INDIA LIMITED - EXECUTIVE OVERSIGHT REPORT
Generated: Wednesday, 30 Sep 2026
Officer: Sunil Kumar (Senior Officer - Coal Operations & Oversight)
Authority: Ministry of Coal · Central Command Oversight

KEY PERFORMANCE HIGHLIGHTS:
- Total Production: 1.42M MT (+12.8% vs Quota Target 1.26M MT · 112.7% attainment)
- Active Collieries: 42 (34 Opencast · 8 Underground · 100% online)
- Pending Approvals: 21 Statutory Action Items (Avg response: 4.6h)
- Approved Reports: 1,284 DGMS Audited & Signed (99.8% compliance index)

SUBSIDIARY BREAKDOWN:
${SUBSIDIARY_PERFORMANCE.map((s) => `- ${s.code} (${s.name}): Score ${s.score}/100 [${s.share} Contribution]`).join('\n')}
`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MineIntel_Executive_Oversight_Brief_2026.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-fadeIn font-sans">
      {/* 1. Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Good afternoon, Sunil Kumar
          </h1>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
            <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Wednesday, 30 Sep 2026 · Ministry of Coal · Central Command Oversight</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Review Pending Approvals Button */}
          <button
            type="button"
            onClick={() => navigate('/alerts')}
            className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-[#121520] hover:bg-[#1a2030] px-4 py-2.5 text-xs font-bold text-amber-400 transition shadow-sm"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Review Pending Approvals (21)</span>
          </button>

          {/* Export Report Button */}
          <button
            type="button"
            onClick={handleExportExecutiveReport}
            className="flex items-center gap-2 rounded-xl bg-[#00d2ff] hover:bg-[#38bdf8] px-4 py-2.5 text-xs font-black text-slate-950 transition shadow-md shadow-cyan-500/20"
          >
            <Download className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Metric / KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL PRODUCTION */}
        <div className="rounded-2xl border border-[#151f32] bg-[#0c1220] p-5 relative overflow-hidden flex flex-col justify-between shadow-xl group hover:border-slate-700 transition">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              TOTAL PRODUCTION
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" /> 12.8%
            </span>
          </div>

          {/* Value + Sparkline */}
          <div className="flex items-center justify-between mt-3 mb-4">
            <div>
              <div className="text-4xl font-extrabold text-white tracking-tight leading-none">
                1.42M
              </div>
              <div className="text-2xl font-bold text-slate-200 mt-1 leading-none">
                MT
              </div>
            </div>

            {/* Glowing Cyan Wave Sparkline */}
            <div className="w-24 h-12 flex items-center justify-end">
              <svg viewBox="0 0 100 45" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="cyanSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00d2ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,38 Q 20,36 35,26 T 65,22 T 100,6"
                  fill="none"
                  stroke="#00d2ff"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <polygon
                  points="0,38 35,26 65,22 100,6 100,45 0,45"
                  fill="url(#cyanSpark)"
                />
              </svg>
            </div>
          </div>

          {/* Footer Row */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
            <span className="text-slate-400">Quota Target: 1.26M MT</span>
            <span className="font-mono font-bold text-cyan-400">112.7%</span>
          </div>
        </div>

        {/* CARD 2: ACTIVE MINES */}
        <div className="rounded-2xl border border-[#151f32] bg-[#0c1220] p-5 relative overflow-hidden flex flex-col justify-between shadow-xl group hover:border-slate-700 transition">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ACTIVE MINES
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 text-xs font-mono font-bold text-amber-400">
              <ArrowUpRight className="h-3.5 w-3.5" /> 4.2%
            </span>
          </div>

          {/* Value + Sparkline */}
          <div className="flex items-center justify-between mt-3 mb-4">
            <div>
              <div className="text-4xl font-extrabold text-white tracking-tight leading-none">
                42
              </div>
            </div>

            {/* Glowing Amber Wave Sparkline */}
            <div className="w-24 h-12 flex items-center justify-end">
              <svg viewBox="0 0 100 45" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="amberSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,38 Q 25,36 45,28 T 75,22 T 100,8"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <polygon
                  points="0,38 45,28 75,22 100,8 100,45 0,45"
                  fill="url(#amberSpark)"
                />
              </svg>
            </div>
          </div>

          {/* Footer Row */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
            <span className="text-slate-400">34 Opencast · 8 Underground</span>
            <span className="text-right leading-none">
              <span className="block font-bold text-amber-400 font-mono text-[11px]">100%</span>
              <span className="text-[10px] text-amber-400 font-medium">online</span>
            </span>
          </div>
        </div>

        {/* CARD 3: PENDING APPROVALS */}
        <div className="rounded-2xl border border-[#151f32] bg-[#0c1220] p-5 relative overflow-hidden flex flex-col justify-between shadow-xl group hover:border-slate-700 transition">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              PENDING APPROVALS
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Action Req.
            </span>
          </div>

          {/* Value + Dashed Indicator */}
          <div className="flex items-center justify-between mt-3 mb-4">
            <div>
              <div className="text-4xl font-extrabold text-amber-400 tracking-tight leading-none font-mono">
                21
              </div>
            </div>

            {/* Amber dashed bar indicator */}
            <div className="w-24 flex items-center justify-end">
              <span className="tracking-widest font-mono text-amber-400 font-bold text-sm">
                ----------
              </span>
            </div>
          </div>

          {/* Footer Row */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
            <span className="text-slate-400">Avg Response: 4.6h</span>
            <button
              onClick={() => navigate('/alerts')}
              className="font-medium text-amber-400 hover:underline cursor-pointer"
            >
              Review queue →
            </button>
          </div>
        </div>

        {/* CARD 4: APPROVED REPORTS */}
        <div className="rounded-2xl border border-[#151f32] bg-[#0c1220] p-5 relative overflow-hidden flex flex-col justify-between shadow-xl group hover:border-slate-700 transition">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              APPROVED REPORTS
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" /> 16.2%
            </span>
          </div>

          {/* Value + Sparkline */}
          <div className="flex items-center justify-between mt-3 mb-4">
            <div>
              <div className="text-4xl font-extrabold text-white tracking-tight leading-none font-mono">
                1,284
              </div>
            </div>

            {/* Glowing Emerald Wave Sparkline */}
            <div className="w-24 h-12 flex items-center justify-end">
              <svg viewBox="0 0 100 45" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="emeraldSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,38 Q 30,34 50,26 T 78,16 T 100,6"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <polygon
                  points="0,38 50,26 78,16 100,6 100,45 0,45"
                  fill="url(#emeraldSpark)"
                />
              </svg>
            </div>
          </div>

          {/* Footer Row */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
            <span className="text-slate-400">DGMS Audited &amp; Signed</span>
            <span className="text-right leading-none">
              <span className="block font-bold text-emerald-400 font-mono text-[11px]">99.8%</span>
              <span className="text-[10px] text-emerald-400 font-medium">compliance</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Middle Grid: Monthly Production Trend & Subsidiary Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (8 cols): Monthly Production Trend */}
        <div className="lg:col-span-8 rounded-2xl border border-[#151f32] bg-[#0c1220] p-6 shadow-xl flex flex-col justify-between">
          <div>
            {/* Header with Title and Pill */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Monthly Production Trend
                </h2>
                <span className="rounded-full border border-cyan-500/40 bg-cyan-950/30 px-3 py-0.5 text-xs font-mono font-bold text-cyan-400">
                  Fiscal 2026 (Apr - Sep)
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Aggregate extraction across all CIL subsidiaries (in thousands of Metric Tonnes)
            </p>

            {/* Custom Legend */}
            <div className="flex items-center gap-5 mt-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#00d2ff]" />
                <span className="text-slate-200 font-medium">Actual Output</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                <span className="text-slate-400 font-medium">Target Baseline</span>
              </div>
            </div>
          </div>

          {/* Recharts Curve Line */}
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_PRODUCTION_TREND} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="#162236" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  domain={[150, 270]}
                  ticks={[150, 180, 210, 240, 270]}
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}k`}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-cyan-500/40 bg-[#09101f] p-3 shadow-xl text-xs font-mono">
                          <div className="text-slate-400 font-bold mb-1">{data.month} 2026</div>
                          <div className="text-cyan-400 font-bold">
                            Actual: {data.actual * 1000} MT
                          </div>
                          <div className="text-slate-400">
                            Target: {data.target * 1000} MT
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Glowing cyan curve with circular dot nodes */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#00d2ff"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#00d2ff', stroke: '#070b14', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#ffffff', stroke: '#00d2ff', strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column (4 cols): Subsidiary Performance */}
        <div className="lg:col-span-4 rounded-2xl border border-[#151f32] bg-[#0c1220] p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Subsidiary Performance
              </h2>
              <button
                type="button"
                onClick={() => navigate('/mine-explorer')}
                className="text-xs font-mono font-semibold text-cyan-400 hover:underline"
              >
                Production Index
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Efficiency score &amp; contribution breakdown across commands
            </p>

            {/* List of 5 Subsidiaries */}
            <div className="space-y-4">
              {SUBSIDIARY_PERFORMANCE.map((sub) => (
                <div key={sub.code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-[13px]">{sub.code}</span>
                      <span className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-[180px]">
                        {sub.name}
                      </span>
                    </div>
                    <div className="font-mono text-right text-xs">
                      <span className="font-bold text-white">{sub.score}</span>{' '}
                      <span className="text-slate-400 font-normal">({sub.share})</span>
                    </div>
                  </div>

                  {/* Horizontal Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        sub.color === 'amber'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                          : sub.color === 'darkCyan'
                          ? 'bg-cyan-700'
                          : 'bg-[#00d2ff]'
                      }`}
                      style={{ width: `${sub.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>5 Operating Commands Active</span>
            <button
              onClick={() => navigate('/mine-explorer')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Full Command Ledger →
            </button>
          </div>
        </div>
      </div>

      {/* 4. Secondary Intelligence & Geological Records Drawer / Tabs */}
      <div className="rounded-2xl border border-[#151f32] bg-[#0c1220] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Corpus Intelligence &amp; DGMS Statutory Filings
            </h3>
          </div>

          {/* Filter by Colliery */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedMine}
              onChange={(e) => setSelectedMine(e.target.value)}
              className="rounded-xl border border-slate-700 bg-[#121c33] px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Active Collieries (8 Pits)</option>
              {MINES_DATA.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.subsidiary})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table of Latest Verified Reports */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121c33] text-slate-300 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Report Title</th>
                <th className="px-4 py-3 font-semibold">Mine / Site</th>
                <th className="px-4 py-3 font-semibold">Classification</th>
                <th className="px-4 py-3 font-semibold">Audit Date</th>
                <th className="px-4 py-3 font-semibold">Neural Coherence</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#080d17] text-slate-300">
              {filteredReports.slice(0, 5).map((report) => (
                <tr key={report.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3 font-medium text-white max-w-xs truncate">
                    <div className="font-semibold">{report.title}</div>
                    <div className="text-[10px] text-slate-500 font-normal truncate">{report.author}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 font-medium text-slate-300">
                      <MapPin className="h-3 w-3 text-cyan-400 shrink-0" /> {report.mineName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
                      {report.reportType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{report.date}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-cyan-400">{report.coherenceIndex}%</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onOpenReport(report)}
                      className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 transition cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" /> Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
