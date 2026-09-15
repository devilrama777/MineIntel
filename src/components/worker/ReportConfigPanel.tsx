import React from 'react';
import { 
  Briefcase, 
  ShieldAlert, 
  Cpu, 
  TrendingUp, 
  FileCheck2, 
  GraduationCap, 
  Sliders, 
  Sparkles, 
  FileText
} from 'lucide-react';
import { ReportType, ReportDepth, ReportTone } from './types';

interface ReportConfigPanelProps {
  reportType: ReportType;
  depth: ReportDepth;
  tone: ReportTone;
  customFocus: string;
  onReportTypeChange: (type: ReportType) => void;
  onDepthChange: (depth: ReportDepth) => void;
  onToneChange: (tone: ReportTone) => void;
  onCustomFocusChange: (focus: string) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  isProcessing: boolean;
}

const REPORT_TYPES: Array<{
  id: ReportType;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'executive',
    title: 'Executive Briefing',
    desc: 'High-level synthesis for leadership decisions',
    icon: Briefcase,
  },
  {
    id: 'strategic',
    title: 'Strategic & Risk Matrix',
    desc: 'SWOT analysis, risk severity & market position',
    icon: ShieldAlert,
  },
  {
    id: 'technical',
    title: 'Technical Deep-Dive',
    desc: 'Architecture, specifications & system benchmarks',
    icon: Cpu,
  },
  {
    id: 'financial',
    title: 'Financial & KPI Audit',
    desc: 'Fiscal metrics, unit economics & revenue trends',
    icon: TrendingUp,
  },
  {
    id: 'brief',
    title: 'One-Page Summary',
    desc: 'Core takeaway bullet points readable in 2 mins',
    icon: FileCheck2,
  },
  {
    id: 'research',
    title: 'Analytical Research',
    desc: 'Evidence-based findings & data conclusions',
    icon: GraduationCap,
  },
];

export const ReportConfigPanel: React.FC<ReportConfigPanelProps> = ({
  reportType,
  depth,
  tone,
  customFocus,
  onReportTypeChange,
  onDepthChange,
  onToneChange,
  onCustomFocusChange,
  onGenerate,
  canGenerate,
  isProcessing,
}) => {
  return (
    <div className="w-full bg-white dark:bg-[#0b162a] rounded-2xl border border-blue-900/20 dark:border-blue-500/20 shadow-sm transition-all p-5 sm:p-6">
      {/* Panel Header */}
      <div className="flex items-center gap-2.5 border-b border-neutral-200/80 dark:border-blue-900/40 pb-3 mb-5">
        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
          <Sliders className="w-4 h-4" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
          Report Configuration
        </h3>
      </div>

      {/* Report Framework Grid */}
      <div className="mb-5">
        <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-blue-100 mb-2.5">
          Report Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORT_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = reportType === type.id;
            return (
              <button
                key={type.id}
                id={`btn-report-type-${type.id}`}
                type="button"
                onClick={() => onReportTypeChange(type.id)}
                disabled={isProcessing}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/60 ring-2 ring-blue-500/30 shadow-xs'
                    : 'border-neutral-200 dark:border-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700 bg-neutral-50/50 dark:bg-[#0d1c33]/70 hover:-translate-y-0.5'
                } disabled:opacity-50`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-200/80 dark:bg-blue-900/40 text-neutral-600 dark:text-blue-300'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-outfit text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate tracking-tight">
                    {type.title}
                  </div>
                  <div className="font-outfit text-xs text-neutral-500 dark:text-blue-200/70 leading-snug mt-0.5 line-clamp-2">
                    {type.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Depth & Tone Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* Depth Selector: concise, standard, comprehensive fully covered without truncation */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-blue-100 mb-2">
            Depth & Completeness
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-100/90 dark:bg-[#070e1c] border border-neutral-200 dark:border-blue-900/40">
            {(['concise', 'standard', 'comprehensive'] as ReportDepth[]).map((d) => (
              <button
                key={d}
                id={`btn-depth-${d}`}
                type="button"
                onClick={() => onDepthChange(d)}
                disabled={isProcessing}
                className={`py-2 px-1 text-[11px] sm:text-xs xl:text-sm font-bold rounded-lg capitalize transition-all duration-150 text-center whitespace-nowrap ${
                  depth === d
                    ? 'bg-white dark:bg-blue-600 text-blue-900 dark:text-white shadow-sm ring-1 ring-blue-500/20'
                    : 'text-neutral-600 dark:text-blue-200/80 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-blue-950/50'
                } disabled:opacity-50`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Tone Selector: executive, analytical, action-oriented (formal removed, no trailing '...') */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-blue-100 mb-2">
            Tone of Voice
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-100/90 dark:bg-[#070e1c] border border-neutral-200 dark:border-blue-900/40">
            {(['executive', 'analytical', 'action-oriented'] as ReportTone[]).map((t) => {
              const label = t === 'action-oriented' ? 'Action' : t === 'analytical' ? 'Analytical' : 'Executive';
              return (
                <button
                  key={t}
                  id={`btn-tone-${t}`}
                  type="button"
                  onClick={() => onToneChange(t)}
                  disabled={isProcessing}
                  className={`py-2 px-1 text-xs sm:text-sm font-bold rounded-lg transition-all duration-150 text-center whitespace-nowrap ${
                    tone === t
                      ? 'bg-white dark:bg-blue-600 text-blue-900 dark:text-white shadow-sm ring-1 ring-blue-500/20'
                      : 'text-neutral-600 dark:text-blue-200/80 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-blue-950/50'
                  } disabled:opacity-50`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Special User Focus (Optional) */}
      <div className="mb-6">
        <label
          htmlFor="input-custom-focus"
          className="block text-xs sm:text-sm font-bold text-neutral-800 dark:text-blue-100 mb-2"
        >
          Special Analytical Focus <span className="text-neutral-400 dark:text-blue-300/60 font-normal">(optional)</span>
        </label>
        <input
          id="input-custom-focus"
          type="text"
          value={customFocus}
          onChange={(e) => onCustomFocusChange(e.target.value)}
          disabled={isProcessing}
          placeholder="e.g. Focus on risks, cost anomalies, unit economics, and action items..."
          className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-blue-900/50 bg-neutral-50 dark:bg-[#070e1c] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-400 dark:placeholder:text-blue-300/40 transition-all"
        />
      </div>

      {/* Action Trigger - "Funnel into executive report" replaced with clean "Generate Executive Report" */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-200/80 dark:border-blue-900/40">
        <div className="text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70 font-medium">
          Multi-format synthesis ready
        </div>

        <button
          id="btn-funnel-generate"
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || isProcessing}
          className={`relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 shadow-xl shadow-blue-900/40 hover:shadow-2xl hover:shadow-blue-600/50 active:scale-95 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-700 text-white border border-blue-400/30 hover:border-blue-300/60 ${
            !canGenerate || isProcessing ? 'opacity-85 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {/* Dark glass specular top reflection */}
          <span className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-t-xl pointer-events-none" />

          {/* Bottom ambient deep shadow ridge for optical 3D depth */}
          <span className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />

          {/* Continuous refined dark-metallic shine sweep */}
          <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shine-sweep pointer-events-none" />

          <span className="relative z-10 flex items-center gap-2.5">
            <FileText className={`w-4.5 h-4.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {isProcessing ? 'Generating Report...' : 'Generate Executive Report'}
            </span>
            <Sparkles className="w-4 h-4 text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
          </span>
        </button>
      </div>
    </div>
  );
};
