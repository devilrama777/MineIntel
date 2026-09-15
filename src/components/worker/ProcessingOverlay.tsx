import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  XCircle,
  Layers,
  Cpu,
  FileCheck,
  Binary
} from 'lucide-react';
import { FunnelVisual } from './FunnelVisual';
import { MineIntelLogo } from './MineIntelLogo';

interface ProcessingOverlayProps {
  fileName: string;
  isDark: boolean;
  onCancel: () => void;
}

const STAGES = [
  {
    id: 0,
    label: 'Document Ingestion & Parsing',
    detail: 'Extracting semantic structure, tables, and data points...',
    icon: Binary,
  },
  {
    id: 1,
    label: 'Entities & Metrics Scan',
    detail: 'Auditing key performance metrics, dates, and disclosures...',
    icon: Cpu,
  },
  {
    id: 2,
    label: 'Intelligence Synthesis',
    detail: 'Compressing raw document noise into core findings...',
    icon: Layers,
  },
  {
    id: 3,
    label: 'Strategic Risk & Matrix Distillation',
    detail: 'Formulating executive recommendations and takeaways...',
    icon: Sparkles,
  },
  {
    id: 4,
    label: 'Final Report Assembly',
    detail: 'Structuring executive briefing, charts, and audit summary...',
    icon: FileCheck,
  },
];

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  fileName,
  isDark,
  onCancel,
}) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Advance stages smoothly over time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const stageTimer = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 2800);

    return () => {
      clearInterval(timer);
      clearInterval(stageTimer);
    };
  }, []);

  const progressPercent = Math.min(95, Math.round(((currentStage + 1) / STAGES.length) * 90 + (elapsedSeconds % 5) * 1.5));

  return (
    <div
      id="processing-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#040813]/85 backdrop-blur-xl animate-fade-in"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0b162a] rounded-3xl border border-blue-200 dark:border-blue-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        {/* Top Header Bar with MineIntel Logo */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-200/80 dark:border-blue-900/50 bg-blue-50/60 dark:bg-[#070e1c]/80">
          <div className="flex items-center gap-3">
            <MineIntelLogo variant="icon-only" size={36} showGlow={true} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  Mine<span className="text-amber-500">Intel</span>
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                  AI Powered Report Generator
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-mono text-neutral-500 dark:text-blue-200/70">
              Elapsed: {elapsedSeconds}s
            </span>
            <button
              id="btn-cancel-processing"
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-blue-950/60 transition-colors"
              title="Cancel Generation"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Funnel Animation Canvas */}
        <div className="relative w-full h-72 sm:h-84 bg-[#050b17] flex items-center justify-center overflow-hidden">
          <FunnelVisual
            isProcessing={true}
            stageIndex={currentStage}
            stageName={STAGES[currentStage].label}
            stageDetail={STAGES[currentStage].detail}
            isDark={true}
          />
        </div>

        {/* Progress Stages & Feedback Bottom Area */}
        <div className="p-6 overflow-y-auto">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-200">
              <span className="truncate pr-2">
                Analyzing document: <strong className="text-blue-600 dark:text-blue-400">{fileName || 'Provided Source'}</strong>
              </span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-neutral-100 dark:bg-[#070e1c] overflow-hidden p-0.5 border border-neutral-200/80 dark:border-blue-900/40">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-amber-400 rounded-full transition-all duration-500 ease-out shadow-xs"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stepper list */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {STAGES.map((stg, idx) => {
              const isDone = idx < currentStage;
              const isCurrent = idx === currentStage;
              const Icon = stg.icon;

              return (
                <div
                  key={stg.id}
                  className={`p-3 rounded-xl border transition-all duration-200 ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500/30 shadow-xs'
                      : isDone
                      ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-neutral-200 dark:border-blue-900/30 opacity-50 bg-neutral-50/30 dark:bg-[#070e1c]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 dark:text-blue-300/60">
                      Step 0{idx + 1}
                    </span>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4 text-neutral-400 dark:text-blue-400/50" />
                    )}
                  </div>
                  <h4 className={`text-xs font-bold line-clamp-1 ${
                    isCurrent
                      ? 'text-blue-700 dark:text-blue-300'
                      : isDone
                      ? 'text-neutral-800 dark:text-neutral-200'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}>
                    {stg.label}
                  </h4>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
