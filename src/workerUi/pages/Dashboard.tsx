import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  FilePlus,
  Eye,
  Download,
  Trash2,
  Activity,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { ReportItem } from '../types';

// Animated Counter component (animates 0 -> target over 1.2s)
const AnimatedCounter: React.FC<{ value: number; padZero?: boolean }> = ({ value, padZero }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1200;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutCubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * value));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(step);
  }, [value]);

  const formatted = padZero && displayValue < 10 ? `0${displayValue}` : `${displayValue}`;
  return <span>{formatted}</span>;
};

// Sparkline SVG with path-draw animation
const AnimatedSparkline: React.FC<{ variant?: 'cyan' | 'amber' }> = ({ variant = 'cyan' }) => {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDrawn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const strokeColor = variant === 'amber' ? '#FFA726' : '#00D9FF';
  const fillGradientId = variant === 'amber' ? 'amberSparkGrad' : 'cyanSparkGrad';

  return (
    <div className="w-full h-12 overflow-hidden mt-2">
      <svg className="w-full h-full" viewBox="0 0 160 40" preserveAspectRatio="none">
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <polygon
          points="0,38 0,25 24,18 48,28 72,14 96,22 120,8 144,12 160,4 160,38"
          fill={`url(#${fillGradientId})`}
          className="transition-opacity duration-1000"
          style={{ opacity: drawn ? 1 : 0 }}
        />
        {/* Animated Line */}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points="0,25 24,18 48,28 72,14 96,22 120,8 144,12 160,4"
          style={{
            strokeDasharray: 200,
            strokeDashoffset: drawn ? 0 : 200,
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
    </div>
  );
};

// Inspection trend chart mock data for Seam XIV
const telemetryTrendData = [
  { day: '23 Sep', compliance: 94, stability: 92 },
  { day: '24 Sep', compliance: 95, stability: 91 },
  { day: '25 Sep', compliance: 92, stability: 95 },
  { day: '26 Sep', compliance: 96, stability: 94 },
  { day: '27 Sep', compliance: 98, stability: 97 },
  { day: '28 Sep', compliance: 97, stability: 96 },
  { day: '29 Sep', compliance: 99, stability: 98 },
];

export const Dashboard: React.FC = () => {
  const { user, reports, tickerItems, deleteReport } = useApp();
  const navigate = useNavigate();
  const [activeKebabId, setActiveKebabId] = useState<string | null>(null);

  const firstName = user.name.split(' ')[0] || 'Jordan';

  // Last 5 reports
  const recentReports = reports.slice(0, 5);

  const handleRowClick = (id: string) => {
    navigate(`/worker/preview/${id}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* HERO SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white">
              Welcome back, {firstName}
            </h2>
            {/* Amber pulsing dot 8px next to greeting */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFA726] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFA726]" />
            </span>
          </div>
          <p className="text-xs sm:text-[15px] text-slate-400 mt-1 font-normal">
            Your operational intelligence is ready
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/worker/new-report')}
            className="w-full sm:w-auto btn-action shine-sweep flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-[#00D9FF] to-blue-600 text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(0,217,255,0.25)]"
          >
            <FilePlus className="w-4 h-4 stroke-[2.5]" />
            <span>Generate New Report</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* KPI ROW — responsive grid (1 col mobile, 2 tablet, 3 desktop) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: REPORTS THIS MONTH */}
        <div className="mine-card mine-card-hover p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              REPORTS THIS MONTH
            </span>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              ▲ 12%
            </span>
          </div>

          <div className="mt-3 sm:mt-4 mb-1">
            <div className="font-mono text-3xl sm:text-[40px] font-semibold tracking-tight text-white leading-none">
              <AnimatedCounter value={24} padZero={false} />
            </div>
            <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <span>Operational dossiers filed</span>
            </div>
          </div>

          <AnimatedSparkline variant="cyan" />
        </div>

        {/* Card 2: PENDING APPROVAL */}
        <div className="mine-card mine-card-hover p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              PENDING APPROVAL
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FFA726]/10 border border-[#FFA726]/20">
              <span className="w-2 h-2 rounded-full bg-[#FFA726] animate-pulse" />
              <span className="font-mono text-xs font-semibold text-[#FFA726]">Action Req</span>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 mb-1">
            <div className="font-mono text-3xl sm:text-[40px] font-semibold tracking-tight text-[#FFA726] leading-none">
              <AnimatedCounter value={6} padZero={true} />
            </div>
            <div className="text-xs text-slate-400 mt-1.5">
              <span>Awaiting DGMS & Director review</span>
            </div>
          </div>

          <AnimatedSparkline variant="amber" />
        </div>

        {/* Card 3: APPROVED */}
        <div className="mine-card mine-card-hover p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden sm:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              APPROVED
            </span>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              ▲ 8%
            </span>
          </div>

          <div className="mt-3 sm:mt-4 mb-1">
            <div className="font-mono text-3xl sm:text-[40px] font-semibold tracking-tight text-white leading-none">
              <AnimatedCounter value={18} padZero={false} />
            </div>
            <div className="text-xs text-slate-400 mt-1.5">
              <span>Officially cleared & sealed</span>
            </div>
          </div>

          <AnimatedSparkline variant="cyan" />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* LIVE ACTIVITY TICKER: Horizontal marquee with backdrop-blur */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl bg-[rgba(15,23,42,0.6)] backdrop-blur-xl border border-[#00D9FF]/15 py-3 px-5 overflow-hidden flex items-center shadow-lg">
        {/* Amber vertical bar 3px pulsing */}
        <div className="w-[3px] h-6 rounded-full bg-[#FFA726] animate-pulse shrink-0 mr-4 shadow-[0_0_8px_#FFA726]" />

        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-4 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#00D9FF]" />
          <span>LIVE ACTIVITY:</span>
        </div>

        {/* Ticker cycling track */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
            {tickerItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                {item.iconType === 'check' && (
                  <span className="text-emerald-400 font-bold">✓</span>
                )}
                {item.iconType === 'bolt' && (
                  <span className="text-[#FFA726] font-bold">⚡</span>
                )}
                {item.iconType === 'bell' && (
                  <span className="text-[#00D9FF] font-bold">🔔</span>
                )}
                <span className="text-slate-200">{item.text}</span>
                <span className="text-slate-500">·</span>
                <span className="text-cyan-300 font-semibold">{item.timeAgo}</span>
                {idx < tickerItems.length - 1 && (
                  <span className="text-slate-700 ml-6">|</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* OPERATIONAL TELEMETRY CHART SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mine-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              FIELD STABILITY & COMPLIANCE INDEX
            </div>
            <h3 className="text-base font-semibold text-white mt-1">
              7-Day North Ridge Telemetry Analysis
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#00D9FF]" />
              <span className="text-slate-300">DGMS Compliance (%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#FFA726]" />
              <span className="text-slate-300">Slope Stability Index (%)</span>
            </div>
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={telemetryTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorStability" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFA726" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FFA726" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,217,255,0.1)' }}
              />
              <YAxis
                domain={[85, 100]}
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,217,255,0.1)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15,23,42,0.92)',
                  borderColor: 'rgba(0,217,255,0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono',
                }}
              />
              <Area
                type="monotone"
                dataKey="compliance"
                stroke="#00D9FF"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompliance)"
                animationDuration={1500}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="stability"
                stroke="#FFA726"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorStability)"
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RECENT REPORTS TABLE (last 5) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mine-card overflow-hidden">
        {/* Table Title Bar */}
        <div className="p-6 border-b border-[#00D9FF]/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              RECENT SUBMISSIONS
            </span>
            <h3 className="text-base font-semibold text-white mt-0.5">
              Latest Operational Dossiers
            </h3>
          </div>
          <button
            onClick={() => navigate('/worker/my-reports')}
            className="btn-action flex items-center gap-1.5 text-xs font-semibold text-[#00D9FF] hover:text-cyan-300 transition-colors"
          >
            <span>View All Records ({reports.length})</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile View (<640px) */}
        <div className="sm:hidden divide-y divide-[#00D9FF]/[0.08]">
          {recentReports.map((report) => (
            <div
              key={report.id}
              onClick={() => handleRowClick(report.id)}
              className="p-3.5 space-y-2.5 hover:bg-[rgba(0,217,255,0.04)] cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate max-w-[200px]">
                      {report.title}
                    </div>
                    <div className="font-mono text-[10px] text-cyan-400/90">{report.id}</div>
                  </div>
                </div>
                <div className="shrink-0">
                  {report.status === 'Approved' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Approved
                    </span>
                  )}
                  {report.status === 'Pending' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                  {report.status === 'Rejected' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 border border-red-500/30 text-red-400">
                      <XCircle className="w-3 h-3" /> Rejected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span>{report.category}</span>
                <span>{report.createdAt}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop/Tablet Table content */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-[rgba(0,217,255,0.05)] border-b border-[#00D9FF]/10 text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                <th className="py-3 px-6">REPORT TITLE & ID</th>
                <th className="py-3 px-6">CREATED DATE</th>
                <th className="py-3 px-6">CATEGORY</th>
                <th className="py-3 px-6">STATUS</th>
                <th className="py-3 px-6 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#00D9FF]/[0.07]">
              {recentReports.map((report, idx) => (
                <motion.tr
                  key={report.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  onClick={() => handleRowClick(report.id)}
                  className="h-[72px] hover:bg-[rgba(0,217,255,0.04)] cursor-pointer transition-colors group"
                >
                  {/* Column 1: icon + title + ID */}
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 group-hover:border-[#00D9FF]/40 flex items-center justify-center shrink-0 transition-colors">
                        <FileText className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white group-hover:text-[#00D9FF] transition-colors truncate max-w-[280px] lg:max-w-md">
                          {report.title}
                        </div>
                        <div className="font-mono text-xs text-slate-400 mt-0.5">
                          {report.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Created Date */}
                  <td className="py-3 px-6">
                    <span className="font-mono text-xs text-slate-300">
                      {report.createdAt}
                    </span>
                  </td>

                  {/* Column 3: Category */}
                  <td className="py-3 px-6">
                    <span className="text-xs text-slate-300 font-medium">
                      {report.category}
                    </span>
                  </td>

                  {/* Column 4: Status Pill */}
                  <td className="py-3 px-6">
                    {report.status === 'Approved' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                        Approved
                      </span>
                    )}
                    {report.status === 'Pending' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        Pending
                      </span>
                    )}
                    {report.status === 'Rejected' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400">
                        <XCircle className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                    )}
                  </td>

                  {/* Column 5: Kebab Menu */}
                  <td className="py-3 px-6 text-right relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() =>
                        setActiveKebabId((prev) => (prev === report.id ? null : report.id))
                      }
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Popover options */}
                    {activeKebabId === report.id && (
                      <div className="absolute right-6 top-14 w-44 rounded-xl bg-slate-900 border border-[#00D9FF]/20 shadow-xl z-30 p-1.5 text-left animate-in fade-in duration-150">
                        <button
                          onClick={() => {
                            setActiveKebabId(null);
                            navigate(`/worker/preview/${report.id}`);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-cyan-950/40 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>View Dossier</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveKebabId(null);
                            navigate(`/worker/export/${report.id}`);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-cyan-950/40 rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-[#FFA726]" />
                          <span>Official Export</span>
                        </button>
                        <div className="my-1 border-t border-slate-800" />
                        <button
                          onClick={() => {
                            setActiveKebabId(null);
                            deleteReport(report.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Report</span>
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
