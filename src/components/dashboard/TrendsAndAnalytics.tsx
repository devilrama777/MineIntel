import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ShieldCheck,
  Zap,
  Filter,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SubsidiaryData {
  name: string;
  fullName: string;
  actualMT: number;
  targetMT: number;
  growth: number;
  safetyScore: number;
  machineryAvailability: number;
  color: string;
}

const SUBSIDIARY_METRICS: SubsidiaryData[] = [
  {
    name: 'MCL',
    fullName: 'Mahanadi Coalfields Limited',
    actualMT: 78.6,
    targetMT: 74.2,
    growth: 5.9,
    safetyScore: 99.1,
    machineryAvailability: 88.4,
    color: '#3b82f6',
  },
  {
    name: 'SECL',
    fullName: 'South Eastern Coalfields Limited',
    actualMT: 71.4,
    targetMT: 68.0,
    growth: 5.0,
    safetyScore: 98.7,
    machineryAvailability: 86.2,
    color: '#0ea5e9',
  },
  {
    name: 'NCL',
    fullName: 'Northern Coalfields Limited',
    actualMT: 51.2,
    targetMT: 49.5,
    growth: 3.4,
    safetyScore: 99.4,
    machineryAvailability: 91.0,
    color: '#10b981',
  },
  {
    name: 'CCL',
    fullName: 'Central Coalfields Limited',
    actualMT: 33.1,
    targetMT: 34.0,
    growth: -2.6,
    safetyScore: 97.8,
    machineryAvailability: 81.5,
    color: '#f59e0b',
  },
  {
    name: 'WCL',
    fullName: 'Western Coalfields Limited',
    actualMT: 25.4,
    targetMT: 24.8,
    growth: 2.4,
    safetyScore: 98.2,
    machineryAvailability: 84.7,
    color: '#8b5cf6',
  },
  {
    name: 'BCCL',
    fullName: 'Bharat Coking Coal Limited',
    actualMT: 17.9,
    targetMT: 18.2,
    growth: -1.6,
    safetyScore: 96.9,
    machineryAvailability: 79.8,
    color: '#ec4899',
  },
  {
    name: 'ECL',
    fullName: 'Eastern Coalfields Limited',
    actualMT: 15.1,
    targetMT: 14.5,
    growth: 4.1,
    safetyScore: 97.4,
    machineryAvailability: 82.1,
    color: '#06b6d4',
  },
];

const MONTHLY_TREND = [
  { month: 'Oct 25', production: 27.2, dispatch: 26.8 },
  { month: 'Nov 25', production: 28.5, dispatch: 28.1 },
  { month: 'Dec 25', production: 30.1, dispatch: 29.9 },
  { month: 'Jan 26', production: 31.8, dispatch: 31.2 },
  { month: 'Feb 26', production: 32.4, dispatch: 32.0 },
  { month: 'Mar 26', production: 34.7, dispatch: 34.3 },
];

export const TrendsAndAnalytics: React.FC = () => {
  const { isLight } = useTheme();
  const [activeMetric, setActiveMetric] = useState<'dispatch' | 'safety' | 'machinery'>('dispatch');
  const [activeViewMode, setActiveViewMode] = useState<'vertical' | 'trend'>('vertical');
  const [hoveredBar, setHoveredBar] = useState<SubsidiaryData | null>(null);

  const maxVal = Math.max(...SUBSIDIARY_METRICS.map((s) => s.actualMT * 1.15));

  return (
    <section className="space-y-4">
      {/* Section Header with badge and animation indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${
              isLight
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-blue-950/60 text-blue-400 border border-blue-800/60'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                className={`text-base font-bold tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                Trends & Analytics
              </h2>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono rounded-full font-semibold flex items-center gap-1.5 ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Dispatches
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              High-resolution vertical telemetry across subsidiaries, quarterly targets, and DGMS compliance
            </p>
          </div>
        </div>

        {/* View Switchers & Metric Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex items-center rounded-lg p-1 border text-xs ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#121927] border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveViewMode('vertical')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'vertical'
                  ? isLight
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'bg-blue-600 text-white shadow-xs font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Vertical Graphs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('trend')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'trend'
                  ? isLight
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'bg-blue-600 text-white shadow-xs font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>6-Month Curve</span>
            </button>
          </div>

          <div
            className={`flex items-center rounded-lg p-1 border text-xs ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#121927] border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveMetric('dispatch')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                activeMetric === 'dispatch'
                  ? isLight
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'bg-blue-600 text-white shadow-xs font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dispatch (MT)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('safety')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                activeMetric === 'safety'
                  ? isLight
                    ? 'bg-white text-emerald-600 shadow-xs font-semibold'
                    : 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Safety %
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('machinery')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                activeMetric === 'machinery'
                  ? isLight
                    ? 'bg-white text-purple-600 shadow-xs font-semibold'
                    : 'bg-purple-600 text-white shadow-xs font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Machinery %
            </button>
          </div>
        </div>
      </div>

      {/* Main Graphs Box */}
      <div
        className={`border rounded-xl p-5 transition-all shadow-xs relative overflow-hidden ${
          isLight
            ? 'bg-white border-slate-200 shadow-slate-100'
            : 'bg-[#101622] border-[#1f2b3e]'
        }`}
      >
        <AnimatePresence mode="wait">
          {activeViewMode === 'vertical' ? (
            /* Vertical Bar Graphs Section with Smooth Motion Animations */
            <motion.div
              key="vertical-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Legend & Summary Subhead */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="w-3 h-3 rounded bg-blue-500" />
                    <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                      {activeMetric === 'dispatch'
                        ? 'Actual Raw Coal Offtake'
                        : activeMetric === 'safety'
                        ? 'DGMS Audit Score'
                        : 'HEMM Excavator Availability'}
                    </span>
                  </div>
                  {activeMetric === 'dispatch' && (
                    <div className="flex items-center gap-1.5 font-medium text-slate-400">
                      <span className="w-3 h-3 rounded border border-dashed border-slate-400 bg-slate-200/50 dark:bg-slate-800" />
                      <span>Statutory Quota Target</span>
                    </div>
                  )}
                </div>

                <div
                  className={`text-[11px] font-mono ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Hover over bars for regional breakdown
                </div>
              </div>

              {/* The Vertical Bar Chart Canvas */}
              <div className="pt-4 pb-2">
                <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 md:gap-6 px-2 sm:px-6 relative">
                  {/* Subtle Horizontal Reference Gridlines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                    <div className="border-b border-dashed border-slate-300 dark:border-slate-800 w-full" />
                    <div className="border-b border-dashed border-slate-300 dark:border-slate-800 w-full" />
                    <div className="border-b border-dashed border-slate-300 dark:border-slate-800 w-full" />
                    <div className="border-b border-dashed border-slate-300 dark:border-slate-800 w-full" />
                  </div>

                  {SUBSIDIARY_METRICS.map((sub, idx) => {
                    let val = sub.actualMT;
                    let target = sub.targetMT;
                    let displaySuffix = ' MT';
                    let percentage = (sub.actualMT / maxVal) * 100;
                    let targetPercentage = (sub.targetMT / maxVal) * 100;

                    if (activeMetric === 'safety') {
                      val = sub.safetyScore;
                      target = 98.0;
                      displaySuffix = '%';
                      percentage = ((sub.safetyScore - 90) / 10) * 100;
                      targetPercentage = 80;
                    } else if (activeMetric === 'machinery') {
                      val = sub.machineryAvailability;
                      target = 85.0;
                      displaySuffix = '%';
                      percentage = ((sub.machineryAvailability - 70) / 30) * 100;
                      targetPercentage = 50;
                    }

                    const isHovered = hoveredBar?.name === sub.name;

                    return (
                      <div
                        key={sub.name}
                        onMouseEnter={() => setHoveredBar(sub)}
                        onMouseLeave={() => setHoveredBar(null)}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer z-10"
                      >
                        {/* Tooltip on Hover */}
                        <AnimatePresence>
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: -10 }}
                              exit={{ opacity: 0, scale: 0.9, y: 5 }}
                              transition={{ duration: 0.15 }}
                              className={`absolute -top-28 z-30 p-2.5 rounded-lg shadow-xl border w-44 pointer-events-none text-left ${
                                isLight
                                  ? 'bg-slate-900 text-white border-slate-700'
                                  : 'bg-slate-950 text-white border-blue-500/50 shadow-blue-950/50'
                              }`}
                            >
                              <div className="text-[11px] font-bold text-blue-400">{sub.fullName}</div>
                              <div className="text-xs font-mono font-bold mt-1">
                                Value: {val}
                                {displaySuffix}
                              </div>
                              <div className="text-[10px] text-slate-300 flex items-center justify-between mt-1">
                                <span>Target: {target}{displaySuffix}</span>
                                <span className={sub.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {sub.growth >= 0 ? `+${sub.growth}%` : `${sub.growth}%`}
                                </span>
                              </div>
                              <div className="text-[9px] text-slate-400 mt-1 pt-1 border-t border-slate-800">
                                HEMM Uptime: {sub.machineryAvailability}%
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Top metric tag above bar */}
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 + 0.2 }}
                          className={`text-[11px] font-mono font-bold mb-1.5 transition-transform group-hover:scale-110 ${
                            isHovered
                              ? 'text-blue-500'
                              : isLight
                              ? 'text-slate-700'
                              : 'text-slate-300'
                          }`}
                        >
                          {val}
                          <span className="text-[9px] font-normal opacity-75">{displaySuffix}</span>
                        </motion.div>

                        {/* Bars Container */}
                        <div className="w-full max-w-[48px] h-full flex items-end justify-center gap-1">
                          {/* Target Reference Bar (Dashed/faint) */}
                          {activeMetric === 'dispatch' && (
                            <div
                              className="w-1.5 sm:w-2 bg-slate-300 dark:bg-slate-800/80 rounded-t-sm relative transition-all"
                              style={{ height: `${targetPercentage}%` }}
                              title={`Target: ${target} MT`}
                            />
                          )}

                          {/* Actual Bar with Rising Animation */}
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${percentage}%` }}
                            transition={{
                              duration: 0.7,
                              delay: idx * 0.07,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className={`w-full rounded-t-md relative overflow-hidden transition-all duration-200 ${
                              isHovered ? 'brightness-110 shadow-lg' : ''
                            }`}
                            style={{
                              background:
                                activeMetric === 'dispatch'
                                  ? `linear-gradient(180deg, ${sub.color} 0%, ${sub.color}cc 100%)`
                                  : activeMetric === 'safety'
                                  ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                                  : 'linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)',
                            }}
                          >
                            {/* Subtle inner light streak */}
                            <div className="absolute inset-x-0 top-0 h-1 bg-white/40" />
                          </motion.div>
                        </div>

                        {/* Subsidiary Code Label */}
                        <div className="mt-2.5 text-center">
                          <div
                            className={`text-xs font-mono font-bold tracking-tight ${
                              isHovered
                                ? 'text-blue-600 dark:text-blue-400'
                                : isLight
                                ? 'text-slate-800'
                                : 'text-slate-200'
                            }`}
                          >
                            {sub.name}
                          </div>
                          <div
                            className={`text-[10px] font-mono flex items-center justify-center gap-0.5 ${
                              sub.growth >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {sub.growth >= 0 ? (
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            ) : (
                              <ArrowDownRight className="w-2.5 h-2.5" />
                            )}
                            <span>{Math.abs(sub.growth)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            /* Monthly 6-Month Progression Area Curve */
            <motion.div
              key="trend-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between text-xs pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-blue-500 flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-blue-500 rounded" />
                    Dispatch Volume (Million Tonnes)
                  </span>
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-400 rounded" />
                    Pithead Production
                  </span>
                </div>
                <div
                  className={`text-[11px] font-mono ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Steady +14.2% acceleration into Q4 statutory closing
                </div>
              </div>

              {/* Animated SVG Curve */}
              <div className="h-64 pt-4 px-4 flex flex-col justify-end relative">
                <svg className="w-full h-48 overflow-visible" viewBox="0 0 600 160">
                  <defs>
                    <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  <line x1="0" y1="40" x2="600" y2="40" stroke={isLight ? '#e2e8f0' : '#1e293b'} strokeDasharray="4 4" />
                  <line x1="0" y1="80" x2="600" y2="80" stroke={isLight ? '#e2e8f0' : '#1e293b'} strokeDasharray="4 4" />
                  <line x1="0" y1="120" x2="600" y2="120" stroke={isLight ? '#e2e8f0' : '#1e293b'} strokeDasharray="4 4" />

                  {/* Area fill path */}
                  <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.2, ease: 'easeInOut' }}
                    d="M 50 135 C 150 115, 250 90, 350 65 C 450 45, 550 20, 550 20 L 550 160 L 50 160 Z"
                    fill="url(#curveGradient)"
                  />

                  {/* Dispatch curve stroke */}
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.4, ease: 'easeInOut' }}
                    d="M 50 135 C 150 115, 250 90, 350 65 C 450 45, 550 20, 550 20"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Data Points on Curve */}
                  {MONTHLY_TREND.map((pt, i) => {
                    const x = 50 + i * 100;
                    // approximate y matching curve
                    const yValues = [135, 115, 90, 65, 45, 20];
                    const y = yValues[i];

                    return (
                      <g key={pt.month}>
                        <motion.circle
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
                          cx={x}
                          cy={y}
                          r="6"
                          fill={isLight ? '#ffffff' : '#0f172a'}
                          stroke="#3b82f6"
                          strokeWidth="3"
                          className="cursor-pointer hover:r-8 transition-all"
                        />
                        <text
                          x={x}
                          y={y - 12}
                          textAnchor="middle"
                          fill={isLight ? '#1e293b' : '#94a3b8'}
                          fontSize="11"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {pt.dispatch}
                        </text>
                        <text
                          x={x}
                          y="155"
                          textAnchor="middle"
                          fill={isLight ? '#64748b' : '#64748b'}
                          fontSize="11"
                          fontFamily="monospace"
                        >
                          {pt.month}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Fast Metrics Ribbon */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 mt-2 border-t ${
            isLight ? 'border-slate-100' : 'border-slate-800/80'
          }`}
        >
          <div
            className={`p-3 rounded-lg border flex items-center gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141d2c] border-slate-800'
            }`}
          >
            <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Overall Quota Realization
              </div>
              <div className="text-sm font-bold font-mono text-emerald-500 flex items-center gap-1">
                <span>102.4%</span>
                <span className="text-[10px] font-normal text-slate-400">(+1.8 MT surplus)</span>
              </div>
            </div>
          </div>

          <div
            className={`p-3 rounded-lg border flex items-center gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141d2c] border-slate-800'
            }`}
          >
            <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                DGMS Statutory Compliance
              </div>
              <div className="text-sm font-bold font-mono text-emerald-500 flex items-center gap-1">
                <span>98.6%</span>
                <span className="text-[10px] font-normal text-slate-400">(Zero critical flags)</span>
              </div>
            </div>
          </div>

          <div
            className={`p-3 rounded-lg border flex items-center gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141d2c] border-slate-800'
            }`}
          >
            <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Audited Pithead Realization
              </div>
              <div className="text-sm font-bold font-mono text-blue-500 flex items-center gap-1">
                <span>₹1,642.50 / MT</span>
                <span className="text-[10px] font-normal text-slate-400">(Audited ledger)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
