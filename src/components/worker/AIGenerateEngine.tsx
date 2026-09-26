import React, { useState } from 'react';
import { 
  Search, 
  Wand2, 
  X, 
  CheckCircle2, 
  Zap, 
  ArrowRight,
  FileCheck
} from 'lucide-react';
import { MineIntelLogo } from './MineIntelLogo';

export interface PromptTemplate {
  id: string;
  label: string;
  prompt: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'exec',
    label: '🎯 High-Level Executive Summary',
    prompt: 'Synthesize a high-level executive briefing focusing on strategic risks, strategic revenue impact, and actionable recommendations.',
  },
  {
    id: 'kpi',
    label: '📈 EBITDA & Financial KPI Audit',
    prompt: 'Perform an in-depth Financial Audit analyzing EBITDA margin shifts, OpEx line items, and capital expenditure forecasts.',
  },
  {
    id: 'tech',
    label: '🔬 Technical Architecture Deep-Dive',
    prompt: 'Execute a Technical Deep-Dive examining system bottlenecks, infrastructure constraints, security vectors, and scalability roadmaps.',
  },
  {
    id: 'action',
    label: '⚡ Immediate Strategic Action Plan',
    prompt: 'Deliver a concise Action Plan with bulleted core takeaways, KPI deviations, immediate 30-60-90 day milestones, and resource needs.',
  },
  {
    id: 'governance',
    label: '📋 Governance & Regulatory Audit',
    prompt: 'Conduct a comprehensive governance audit cross-referencing industry standards, statutory disclosures, and compliance checkpoints.',
  }
];

interface AIGenerateEngineProps {
  fileName?: string;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  isProcessing: boolean;
  onFocusFileSelection?: () => void;
}

export const AIGenerateEngine: React.FC<AIGenerateEngineProps> = ({
  fileName = '',
  customPrompt,
  onCustomPromptChange,
  onGenerate,
  canGenerate,
  isProcessing,
  onFocusFileSelection,
}) => {
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptGeneratedSuccess, setPromptGeneratedSuccess] = useState(false);

  // AI Auto Prompt Generator function
  const handleAutoGeneratePrompt = () => {
    const lowerName = fileName.toLowerCase();
    let selectedPrompt = '';

    if (lowerName.includes('financ') || lowerName.includes('kpi') || lowerName.includes('q3') || lowerName.includes('audit')) {
      selectedPrompt = 'Extract an exhaustive financial audit analyzing quarterly revenue growth, EBITDA margin trends, OpEx variances, and cash flow projections.';
    } else if (lowerName.includes('risk') || lowerName.includes('secur') || lowerName.includes('incident') || lowerName.includes('hazard')) {
      selectedPrompt = 'Perform a thorough risk and compliance assessment detailing high-impact vulnerability vectors, regulatory checkpoints, and rapid remediation protocols.';
    } else if (lowerName.includes('tech') || lowerName.includes('architect') || lowerName.includes('system') || lowerName.includes('spec')) {
      selectedPrompt = 'Execute a deep technical synthesis evaluating architectural bottlenecks, multi-system interoperability, failover safeguards, and long-term scalability.';
    } else {
      const randomIndex = Math.floor(Math.random() * PROMPT_TEMPLATES.length);
      selectedPrompt = PROMPT_TEMPLATES[randomIndex].prompt;
    }

    onCustomPromptChange(selectedPrompt);
    setPromptGeneratedSuccess(true);
  };

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-neutral-50/80 dark:bg-[#071326]/80 border border-blue-200/80 dark:border-blue-900/50 shadow-inner">
      {/* Engine Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => document.getElementById('input-ai-prompt-engine')?.focus()}
            className="p-1.5 rounded-xl bg-white text-blue-600 border border-neutral-300/90 shadow-2xs hover:border-blue-500 hover:bg-neutral-50 dark:bg-blue-600 dark:text-white dark:border-transparent dark:hover:bg-blue-500 transition-all flex items-center justify-center cursor-pointer active:scale-95"
            title="Focus AI prompt search"
            aria-label="Focus AI prompt search"
          >
            <Search className="w-4.5 h-4.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-outfit text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white tracking-tight">
                AI Auto Prompt Generator &amp; Search Engine
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                MineIntel Neural
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-blue-200/70 mt-0.5">
              Type your custom objective, or click Auto-Generate for high-precision executive instructions
            </p>
          </div>
        </div>

        {/* Quick Auto Prompt Generator Button */}
        <button
          id="btn-auto-generate-prompt"
          type="button"
          onClick={handleAutoGeneratePrompt}
          disabled={isProcessing || isGeneratingPrompt}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 cursor-pointer active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 border border-blue-400/30"
        >
          <Wand2 className={`w-4 h-4 ${isGeneratingPrompt ? 'animate-spin text-white' : 'text-amber-300'}`} />
          <span>{isGeneratingPrompt ? 'Synthesizing...' : '✨ Auto-Generate Prompt'}</span>
        </button>
      </div>

      {/* The Search Bar Engine Container */}
      <div className="relative mb-3.5">
        <div className="relative flex items-center rounded-2xl border-2 border-neutral-300 dark:border-blue-900/60 bg-white dark:bg-[#070e1c] focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all shadow-xs overflow-hidden">
          <div className="pl-4 pr-2 flex items-center gap-1.5 text-neutral-400 dark:text-blue-400">
            <Search className="w-5 h-5" />
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 h-2 bg-blue-500 animate-pulse rounded-full" />
              <span className="w-0.5 h-3 bg-amber-400 animate-pulse rounded-full" />
              <span className="w-0.5 h-1.5 bg-sky-400 animate-pulse rounded-full" />
            </div>
          </div>

          <input
            id="input-ai-prompt-engine"
            type="text"
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            placeholder="Search or enter analytical instructions (e.g., 'Summarize key risk points and EBITDA impact')..."
            disabled={isProcessing}
            className="w-full py-3.5 sm:py-4 pr-10 text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 bg-transparent focus:outline-none"
          />

          {customPrompt && (
            <button
              type="button"
              onClick={() => onCustomPromptChange('')}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white mr-2 transition-colors cursor-pointer"
              title="Clear prompt"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {promptGeneratedSuccess && (
          <div className="absolute right-3 -bottom-6 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Executive prompt synthesized &amp; applied!</span>
          </div>
        )}
      </div>

      {/* Quick-Select Smart Prompt Tags */}
      <div className="pt-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-blue-300/70 mb-2 font-outfit">
          <Zap className="w-3 h-3 text-amber-500" />
          <span>Instant Executive Prompt Templates:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROMPT_TEMPLATES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onCustomPromptChange(item.prompt)}
              disabled={isProcessing}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all text-left cursor-pointer ${
                customPrompt === item.prompt
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-[#0b162a] border-neutral-200 dark:border-blue-900/40 text-neutral-700 dark:text-blue-200 hover:border-blue-400 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Document Indicator & Primary Action Button: Generate Executive Report */}
      <div className="mt-6 pt-5 border-t border-neutral-200/80 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-neutral-500 dark:text-blue-200/70">
          {canGenerate ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> 
              <span>Active Target: <strong className="text-neutral-800 dark:text-white">{fileName}</strong> — Ready for AI synthesis</span>
            </span>
          ) : (
            <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-neutral-400" />
              <span>Select a document from the repository above to generate a report</span>
            </span>
          )}
        </div>

        <button
          id="btn-generate-report"
          type="button"
          onClick={canGenerate ? onGenerate : onFocusFileSelection}
          disabled={isProcessing}
          className={`group relative overflow-hidden flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm sm:text-base font-extrabold transition-all duration-300 cursor-pointer text-white bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-700 border border-blue-400/30 hover:border-blue-300/60 shadow-xl shadow-blue-900/40 hover:shadow-2xl hover:shadow-blue-600/50 hover:scale-[1.015] active:scale-[0.98] ${
            isProcessing ? 'cursor-wait opacity-90' : ''
          }`}
        >
          <span className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-t-2xl pointer-events-none" />
          <span className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
          <span className="absolute -top-5 left-1/4 w-36 h-14 bg-sky-400/20 blur-md rounded-full pointer-events-none" />
          <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shine-sweep pointer-events-none" />
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
          <span className="relative z-10 flex items-center gap-3">
            <MineIntelLogo variant="icon-only" size={24} />
            <span className="tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {isProcessing ? 'Synthesizing Report...' : 'Generate Executive Report'}
            </span>
            <ArrowRight className="w-5 h-5 text-white transition-transform group-hover:translate-x-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
          </span>
        </button>
      </div>
    </div>
  );
};
