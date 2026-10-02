import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  TrendingUp,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Calendar,
  Sparkles,
  Info,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  MULTI_YEAR_TOPIC_TRENDS,
  TOPICS_DATA,
  REPORTS_DATA,
  MINES_DATA,
  MiningReport,
  TopicItem,
} from '../data/miningData';

interface OutletContextType {
  onOpenReport: (report: MiningReport) => void;
  onOpenTopic: (topic: TopicItem) => void;
}

export const TrendAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { onOpenReport, onOpenTopic } = useOutletContext<OutletContextType>();

  const [selectedMine, setSelectedMine] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [chartMode, setChartMode] = useState<'line' | 'area'>('line');
  const [selectedTopicHighlight, setSelectedTopicHighlight] = useState<string>('Water Management');

  // Topic Growth Leaders
  const topicGrowthLeaders = [
    { name: 'Water Ingress', growth: '+43%', status: 'Surging Inundation Concerns', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { name: 'Slope Stability', growth: '+31%', status: 'Deep Highwall Bench Fatigue', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { name: 'AI Exploration', growth: '+27%', status: '3D Seismic & Borehole Machine Learning', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { name: 'Carbon Emission', growth: '+18%', status: 'Scope-1 FMC Electrification Audits', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  ];

  // Most active vs declining topics
  const activeTopics = [
    { name: 'Mine Safety & Hazards', mentions: 248, yoy: '+2.5%', category: 'Safety' },
    { name: 'Coal Seam Characterization', mentions: 238, yoy: '+1.7%', category: 'Reserves' },
    { name: 'Heavy Mechanization', mentions: 220, yoy: '+2.3%', category: 'HEMM' },
    { name: 'Ground & Highwall Slope', mentions: 205, yoy: '+6.8%', category: 'Strata' },
  ];

  const decliningTopics = [
    { name: 'Manual Pillar Splitting', mentions: 24, yoy: '-28.4%', reason: 'Phased out by continuous miners' },
    { name: 'Unmonitored Haulage Dumping', mentions: 32, yoy: '-19.2%', reason: 'Replaced by FMC conveyor silos' },
    { name: 'Open Cast Flare Venting', mentions: 18, yoy: '-14.5%', reason: 'Captured via CBM degasification' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
              Longitudinal NLP Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Topic Trends Over Time
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track multi-year semantic shifts, velocity spikes, and emerging hazards across CIL/CMPDI filings (2020–2026).
          </p>
        </div>

        {/* Chart View Switcher */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-[#0d1424] p-1">
          <button
            onClick={() => setChartMode('line')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              chartMode === 'line'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Multi-Line View
          </button>
          <button
            onClick={() => setChartMode('area')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              chartMode === 'area'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cumulative Stacked
          </button>
        </div>
      </div>

      {/* Topic Growth Cards Section */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" /> Topic Growth Highlights (2024–2026 Velocity)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topicGrowthLeaders.map((lead, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedTopicHighlight(lead.name)}
              className={`rounded-2xl border p-5 bg-[#0d1424] hover:border-slate-700 transition cursor-pointer relative overflow-hidden group ${
                selectedTopicHighlight === lead.name ? 'ring-2 ring-amber-500/40 border-amber-500/50' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                  {lead.name}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-xs font-mono font-extrabold border ${lead.bg} ${lead.color}`}>
                  {lead.growth}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                {lead.status}
              </p>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-2">
                <span>Multi-period Surge</span>
                <span className="text-amber-400 font-semibold group-hover:underline flex items-center gap-0.5">
                  Analyze →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Interactive Recharts Graph */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white">
              7-Year Longitudinal Frequency Matrix (2020–2026)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Annual mention count across verified technical reports, safety circulars, and core drill logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedMine}
              onChange={(e) => setSelectedMine(e.target.value)}
              className="rounded-xl border border-slate-700 bg-[#121c33] px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="ALL">All Collieries Aggregate</option>
              {MINES_DATA.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'line' ? (
              <LineChart data={MULTI_YEAR_TOPIC_TRENDS} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="Water Management" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="Ground Stability" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Coal Quality" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Mine Safety" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Exploration" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Environment" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : (
              <AreaChart data={MULTI_YEAR_TOPIC_TRENDS} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Water Management" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                <Area type="monotone" dataKey="Ground Stability" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                <Area type="monotone" dataKey="Coal Quality" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                <Area type="monotone" dataKey="Mine Safety" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Area type="monotone" dataKey="Exploration" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lower Grid: Most Active vs Declining Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Active Topics */}
        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-400" /> Most Active Corpus Topics
            </h3>
            <span className="text-xs text-slate-500 font-mono">FY 2025–26</span>
          </div>

          <div className="space-y-3">
            {activeTopics.map((top, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#080d17] hover:border-slate-700 transition"
              >
                <div>
                  <div className="text-xs font-bold text-white">{top.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{top.category} Category</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-white">{top.mentions} Reports</div>
                  <div className="text-[11px] font-mono text-emerald-400">{top.yoy} YoY</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Declining / Sunsetting Topics */}
        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-rose-400" /> Declining / Modernized Topics
            </h3>
            <span className="text-xs text-slate-500 font-mono">Legacy Techniques</span>
          </div>

          <div className="space-y-3">
            {decliningTopics.map((top, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#080d17] hover:border-slate-700 transition"
              >
                <div>
                  <div className="text-xs font-bold text-white">{top.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{top.reason}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-400">{top.mentions} Reports</div>
                  <div className="text-[11px] font-mono text-rose-400">{top.yoy} YoY</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
