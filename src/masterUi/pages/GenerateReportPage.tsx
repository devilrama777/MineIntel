import React, { useState } from 'react';
import {
  FileText,
  Zap,
  Download,
  Save,
  CheckCircle2,
  Calendar,
  MapPin,
  Layers,
  Sparkles,
  TrendingUp,
  Printer,
  Building2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { MINES_DATA, TOPICS_DATA, EMERGING_ALERTS_DATA, AI_INSIGHTS_DATA } from '../data/miningData';

export const GenerateReportPage: React.FC = () => {
  const [reportType, setReportType] = useState('Geological & Statutory Audit');
  const [targetMine, setTargetMine] = useState('Gevra Expansion Mega OCP');
  const [fiscalYear, setFiscalYear] = useState('2025-26');
  const [dateRange, setDateRange] = useState('Q4 (Jan–Mar 2026)');

  // Checkboxes
  const [includeInsights, setIncludeInsights] = useState(true);
  const [includeEmerging, setIncludeEmerging] = useState(true);
  const [includeTrends, setIncludeTrends] = useState(true);
  const [includeRelatedDocs, setIncludeRelatedDocs] = useState(true);

  // Live generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const selectedMineObj = MINES_DATA.find((m) => m.name === targetMine) || MINES_DATA[0];

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setIsSaved(false);
    setTimeout(() => {
      setIsGenerating(false);
    }, 700);
  };

  const handleDownload = () => {
    window.print();
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
              Statutory Synthesis &amp; Compilation Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Generate Intelligence Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Synthesize an AI-grounded geological assessment, topic trajectory analysis, and safety audit report.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0d1424] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
          >
            <Save className="h-4 w-4 text-cyan-400" /> {isSaved ? 'Saved to Enclave!' : 'Save Report'}
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-md shadow-amber-500/20"
          >
            <Download className="h-4 w-4" /> Export Document (PDF)
          </button>
        </div>
      </div>

      {/* Main Grid: Form on Left (4 cols), Live Preview Panel on Right (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" /> Report Parameters
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure parameters to tailor the statutory analysis.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
              >
                <option value="Geological & Statutory Audit">Geological &amp; Statutory Audit</option>
                <option value="Hydrogeological Survey & Risk Assessment">Hydrogeological Survey &amp; Risk Assessment</option>
                <option value="Slope Stability & Strata Engineering Review">Slope Stability &amp; Strata Engineering Review</option>
                <option value="Executive Production & Safety Scorecard">Executive Production &amp; Safety Scorecard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Target Colliery
              </label>
              <select
                value={targetMine}
                onChange={(e) => setTargetMine(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
              >
                {MINES_DATA.map((m) => (
                  <option key={m.id} value={m.name}>{m.name} ({m.subsidiary})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Audit Fiscal Year
                </label>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                >
                  <option value="2025-26">FY 2025–26 (Active)</option>
                  <option value="2024-25">FY 2024–25</option>
                  <option value="2023-24">FY 2023–24</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Audit Period Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                >
                  <option value="Q4 (Jan–Mar 2026)">Q4 (Jan–Mar 2026)</option>
                  <option value="Annual Cumulative">Annual Cumulative</option>
                  <option value="Trailing 24-Month">Trailing 24-Month</option>
                </select>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Intelligence Modules to Include:
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInsights}
                  onChange={(e) => setIncludeInsights(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30"
                />
                <span className="font-medium">Include AI Topic Insights</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEmerging}
                  onChange={(e) => setIncludeEmerging(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30"
                />
                <span className="font-medium">Include Emerging Topic Velocity Alerts</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTrends}
                  onChange={(e) => setIncludeTrends(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30"
                />
                <span className="font-medium">Include Multi-Year Trend Analysis (2020–2026)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRelatedDocs}
                  onChange={(e) => setIncludeRelatedDocs(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30"
                />
                <span className="font-medium">Include Cited Statutory Source Documents</span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition disabled:opacity-50"
              >
                {isGenerating ? (
                  <span>Synthesizing Corpus Evidence...</span>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Generate Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Document Preview (Resembling Professional Mining/Geological Report) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-700/80 bg-slate-950 p-8 shadow-2xl space-y-8 text-slate-200 font-sans print:bg-white print:text-slate-950">
          {/* Document Masthead */}
          <div className="border-b-2 border-amber-500/80 pb-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-amber-400 uppercase tracking-widest">
                CENTRAL MINE PLANNING &amp; DESIGN INSTITUTE (CMPDI)
              </span>
              <span className="font-mono">SECURITY: CONFIDENTIAL // OFFICIAL AUDIT</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              {reportType}
            </h2>
            <div className="text-sm font-semibold text-amber-300 mt-1">
              Colliery Site: {selectedMineObj.name} ({selectedMineObj.subsidiary})
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
              <span>Fiscal Window: {fiscalYear}</span>
              <span>Audit Period: {dateRange}</span>
              <span>Generated: {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          {/* 1. Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              1. EXECUTIVE SUMMARY &amp; STATUTORY CLEARANCE
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              This automated intelligence synthesis aggregates verified geological filings, strata radar displacement telemetry, and hydrogeological core logs for <strong>{selectedMineObj.name}</strong>. The operation achieved an estimated run-rate capacity of <strong>{selectedMineObj.annualCapacityMT} MT</strong> under standard DGMS compliance norms. Overall semantic coherence for this audit sequence is verified at <strong>88.4%</strong>.
            </p>
          </div>

          {/* 2. Top Topics */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              2. IDENTIFIED TOPICAL CLUSTERS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TOPICS_DATA.slice(0, 4).map((top, idx) => (
                <div key={idx} className="rounded-lg border border-slate-800 bg-[#0c1424] p-3 text-xs">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>{top.name}</span>
                    <span className="text-cyan-400 font-mono">{top.coherenceScore}%</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Keywords: {top.keywords.slice(0, 3).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. AI Insights (if checked) */}
          {includeInsights && (
            <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> 3. AI MINING INTELLIGENCE SYNTHESIS
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                "{AI_INSIGHTS_DATA[0].headline}"
              </p>
              <div className="text-[11px] text-slate-400 border-t border-slate-800/60 pt-2 mt-2">
                Operational Directive: Perimeter radial depressurization and sump pumping capacity upgrades recommended prior to upcoming monsoon bench advances.
              </div>
            </div>
          )}

          {/* 4. Emerging Topics (if checked) */}
          {includeEmerging && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> 4. EMERGING TOPIC VELOCITY BENCHMARKS
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101726] text-slate-300 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Hazard Topic</th>
                      <th className="px-3 py-2 font-semibold">Growth Metric</th>
                      <th className="px-3 py-2 font-semibold">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-[#080d17] text-slate-300">
                    {EMERGING_ALERTS_DATA.slice(0, 3).map((alt, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium text-white">{alt.topic}</td>
                        <td className="px-3 py-2 font-mono text-emerald-400 font-bold">+{alt.growthPercent}%</td>
                        <td className="px-3 py-2">
                          <span className="rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold px-1.5 py-0.2">
                            {alt.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Trend Analysis Summary (if checked) */}
          {includeTrends && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> 5. MULTI-YEAR GEOLOGICAL TREND TRAJECTORY (2020–2026)
              </h3>
              <div className="rounded-lg border border-slate-800 bg-[#080d17] p-3 text-xs flex flex-wrap gap-4 text-slate-300">
                <div>
                  <span className="text-slate-400">Coal Quality:</span>{' '}
                  <span className="text-amber-400 font-bold font-mono">310 pts (+14%)</span>
                </div>
                <div>
                  <span className="text-slate-400">Mine Safety:</span>{' '}
                  <span className="text-emerald-400 font-bold font-mono">290 pts (+18%)</span>
                </div>
                <div>
                  <span className="text-slate-400">Water Management:</span>{' '}
                  <span className="text-blue-400 font-bold font-mono">270 pts (+43%)</span>
                </div>
                <div>
                  <span className="text-slate-400">Exploration:</span>{' '}
                  <span className="text-cyan-400 font-bold font-mono">195 pts (+12%)</span>
                </div>
              </div>
            </div>
          )}

          {/* Statutory Sign-off */}
          <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              <div className="font-bold text-white">Inspecting Official: Inspector R. Sharma</div>
              <div className="text-[11px] text-slate-500">Chief Mining Geologist • CMPDI Regional Directorate</div>
            </div>
            <div className="text-right font-mono text-[11px] text-amber-400">
              SHA-256 Seal: 98a1-c04f-772a-44e0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
