import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  FileText,
  MapPin,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { AI_INSIGHTS_DATA, REPORTS_DATA, AIInsightItem, MiningReport, TopicItem } from '../data/miningData';

interface OutletContextType {
  onOpenReport: (report: MiningReport) => void;
  onOpenTopicByName: (name: string) => void;
}

export const AIInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const { onOpenReport, onOpenTopicByName } = useOutletContext<OutletContextType>();

  const [activeCategory, setActiveCategory] = useState('ALL');

  const categories = Array.from(new Set(AI_INSIGHTS_DATA.map((i) => i.category)));

  const filteredInsights = AI_INSIGHTS_DATA.filter((item) => {
    if (activeCategory !== 'ALL' && item.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-purple-400">
              Autonomous Mining Reasoning Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            AI Mining Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Multi-document synthesis, cross-mine correlation, and strategic engineering recommendations.
          </p>
        </div>

        <div className="flex items-center rounded-xl border border-slate-800 bg-[#0d1424] p-1">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeCategory === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Intelligence ({AI_INSIGHTS_DATA.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Intelligence Cards List */}
      <div className="space-y-6">
        {filteredInsights.map((insight) => (
          <div
            key={insight.id}
            className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0e1628] via-[#0d1424] to-[#090e1a] p-7 shadow-xl space-y-6 hover:border-slate-700 transition"
          >
            {/* Header / Headline */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-md bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/20">
                    {insight.category}
                  </span>
                  <span className="rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/20">
                    +{insight.growthPercent}% Trajectory ({insight.period})
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                  {insight.headline}
                </h2>
                <h3 className="text-sm font-semibold text-amber-300 mt-1">
                  Focus: {insight.title}
                </h3>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => navigate('/generate-report')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition"
                >
                  <Zap className="h-3.5 w-3.5" /> Insert into Report
                </button>
              </div>
            </div>

            {/* Evidence & Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400">Cited Reports</span>
                <div className="text-lg font-bold text-white font-mono mt-0.5">{insight.evidenceReportsCount} Reports</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400">Affected Mines</span>
                <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">{insight.evidenceMinesCount} Collieries</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400">Time Horizon</span>
                <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{insight.period}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400">Synthesis Confidence</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">98.4%</div>
              </div>
            </div>

            {/* Detailed Analysis & Operational Impact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-4 space-y-2">
                <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" /> Deep Causal Analysis
                </h4>
                <p className="text-slate-300 leading-relaxed font-normal">
                  {insight.detailedAnalysis}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-4 space-y-2">
                <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Operational Impact Assessment
                </h4>
                <p className="text-slate-300 leading-relaxed font-normal">
                  {insight.operationalImpact}
                </p>
              </div>
            </div>

            {/* Recommended Intervention */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs">
              <span className="font-bold text-amber-300 uppercase tracking-wider block mb-1">
                Actionable Engineering Recommendation:
              </span>
              <p className="text-slate-200 leading-relaxed">
                {insight.recommendedIntervention}
              </p>
            </div>

            {/* Related Topics & Documents Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/80 pt-4 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-medium">Related Topics:</span>
                {insight.relatedTopics.map((top, idx) => (
                  <button
                    key={idx}
                    onClick={() => onOpenTopicByName(top)}
                    className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:text-amber-300 hover:bg-slate-700 transition"
                  >
                    {top}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-medium">Key Source:</span>
                {insight.relevantDocuments.slice(0, 2).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      const rep = REPORTS_DATA.find((r) => r.id === doc.id);
                      if (rep) onOpenReport(rep);
                      else navigate('/reports');
                    }}
                    className="text-amber-400 hover:underline text-[11px] font-medium flex items-center gap-1"
                  >
                    <span>{doc.mine} ({doc.year})</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
