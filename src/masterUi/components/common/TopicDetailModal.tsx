import React from 'react';
import { X, Layers, TrendingUp, MapPin, Key, FileText, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import { TopicItem, MiningReport, REPORTS_DATA } from '../../data/miningData';

interface TopicDetailModalProps {
  topic: TopicItem | null;
  onClose: () => void;
  onOpenReport: (report: MiningReport) => void;
}

export const TopicDetailModal: React.FC<TopicDetailModalProps> = ({ topic, onClose, onOpenReport }) => {
  if (!topic) return null;

  // Filter relevant documents
  const relatedReports = REPORTS_DATA.filter((r) =>
    r.topics.some((t) => t.toLowerCase().includes(topic.name.toLowerCase()) || topic.name.toLowerCase().includes(t.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-700/80 bg-[#0d1424] text-slate-100 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 bg-[#121c33] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/20">
                  {topic.category}
                </span>
                <span className={`rounded-md px-2.5 py-0.5 text-xs font-semibold border ${
                  topic.status === 'emerging'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {topic.status === 'emerging' ? `Emerging (+${topic.growthPercent}%)` : `Stable (+${topic.growthPercent}%)`}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {topic.name}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {topic.dgmsRelevance}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Key Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-3.5">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Analyzed Documents</span>
              <div className="text-xl font-bold text-white mt-1">{topic.documentsCount} Reports</div>
              <span className="text-[11px] text-emerald-400">Indexed in Corpus</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-3.5">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Affected Collieries</span>
              <div className="text-xl font-bold text-amber-400 mt-1">{topic.affectedMinesCount} Mines</div>
              <span className="text-[11px] text-slate-400">Major CIL Basins</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-3.5">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Coherence Score</span>
              <div className="text-xl font-bold text-cyan-400 mt-1">{topic.coherenceScore}%</div>
              <span className="text-[11px] text-cyan-300">Semantic Cohesion</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-3.5">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Temporal Window</span>
              <div className="text-xl font-bold text-white mt-1">2020–2026</div>
              <span className="text-[11px] text-emerald-400">7-Year Audit Trajectory</span>
            </div>
          </div>

          {/* Topic Summary */}
          <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-4.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
              Topic Summary & Lithological Significance
            </h3>
            <p className="text-sm leading-relaxed text-slate-300">
              {topic.summary}
            </p>
          </div>

          {/* Keywords & Associated Tokens */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-amber-400" /> Extracted NLP Keywords & Term Tokens
            </h3>
            <div className="flex flex-wrap gap-2">
              {topic.keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="rounded-lg border border-slate-700/80 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Affected Mines */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-rose-400" /> Top Operating Mines Affected
            </h3>
            <div className="flex flex-wrap gap-2">
              {topic.topMines.map((m, idx) => (
                <span
                  key={idx}
                  className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 flex items-center gap-1.5"
                >
                  <MapPin className="h-3 w-3" /> {m}
                </span>
              ))}
            </div>
          </div>

          {/* Related Documents Drilldown */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-cyan-400" /> Related Statutory & Geological Documents</span>
              <span className="text-xs text-slate-500 font-mono">{relatedReports.length} Available</span>
            </h3>
            <div className="space-y-2.5">
              {relatedReports.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-6 text-center text-xs text-slate-400">
                  No directly tagged reports in active view. Check the full Reports page.
                </div>
              ) : (
                relatedReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/20">
                          {rep.reportType}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{rep.date}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white">{rep.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{rep.mineName} • Author: {rep.author}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenReport(rep);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#0a101f] px-6 py-4">
          <span className="text-xs text-slate-400">
            Topic Modeling Framework: <span className="font-semibold text-slate-300">MineIntel-BERT-GeoMiner v3.4</span>
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            Close Drill-Down
          </button>
        </div>
      </div>
    </div>
  );
};
