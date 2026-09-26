import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  XCircle,
  AlertCircle,
  Layers,
  Cpu,
  FileCheck,
  Binary
} from 'lucide-react';
import { FunnelVisual } from './FunnelVisual';
import { MineIntelLogo } from './MineIntelLogo';

export interface ProcessingOverlayProps {
  fileName: string;
  isDark: boolean;
  onCancel: () => void;
  statusMessage?: string;
  agentStatus?: 'IDLE' | 'PENDING' | 'RUNNING' | 'AWAITING_INPUT' | 'VALIDATING' | 'RETRYING' | 'COMPLETED' | 'FAILED' | string;
  currentTool?: string;
  currentStage?: string;
  progressReason?: string;
  sections_completed?: number;
  total_sections?: number;
  active_sections?: string[];
  completed_sections?: string[];
}

const STAGES = [
  {
    id: 0,
    label: 'Document Ingestion & Preparation',
    detail: 'Extracting semantic structure and verifying ingestion manifest...',
    icon: Binary,
  },
  {
    id: 1,
    label: 'Agent Reasoning & Evidence Scan',
    detail: 'Auditing key performance metrics, dates, and disclosures...',
    icon: Cpu,
  },
  {
    id: 2,
    label: 'Intelligence Synthesis & Planning',
    detail: 'Formulating executive recommendations and section plan...',
    icon: Layers,
  },
  {
    id: 3,
    label: 'Section Synthesis & Verification',
    detail: 'Synthesizing report sections in parallel and verifying math...',
    icon: Sparkles,
  },
  {
    id: 4,
    label: 'Final Report Compilation',
    detail: 'Compiling executive briefing, charts, and final artifacts...',
    icon: FileCheck,
  },
];

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  fileName,
  isDark,
  onCancel,
  statusMessage,
  agentStatus = 'PENDING',
  currentTool,
  currentStage,
  progressReason,
  sections_completed = 0,
  total_sections = 0,
  active_sections = [],
  completed_sections = [],
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Honest elapsed stopwatch (does not advance artificial stages)
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Map real Agent status & deterministic workflow stages without timer-based fake progress
  const normalizedStatus = (agentStatus || 'PENDING').toUpperCase();
  const normalizedStage = (currentStage || '').toUpperCase();

  const sectionsCompleted = sections_completed ?? 0;
  const totalSections = total_sections ?? 0;
  const activeSections = active_sections ?? [];
  const completedSections = completed_sections ?? [];

  // Granular Section Progress: (sections_completed / total_sections) * 100
  const sectionProgressPercent = totalSections > 0
    ? Math.min(100, Math.max(0, Math.round((sectionsCompleted / totalSections) * 100)))
    : 0;

  // Real-time Status Text area builder (e.g., "✅ Executive Summary completed... ⏳ Writing Market Analysis...")
  const buildStatusText = () => {
    const parts: string[] = [];
    if (completedSections.length > 0) {
      const lastCompleted = completedSections[completedSections.length - 1];
      parts.push(`✅ ${lastCompleted} completed`);
    }
    if (activeSections.length > 0) {
      parts.push(`⏳ Writing ${activeSections.join(', ')}...`);
    }
    if (parts.length > 0) {
      return parts.join('... ');
    }
    if (totalSections > 0) {
      if (sectionsCompleted >= totalSections) {
        return `✅ All ${totalSections} sections completed. Compiling final report artifacts...`;
      }
      return `⏳ Initializing parallel section synthesis (${totalSections} sections queued)...`;
    }
    return progressReason || 'Autonomous Agent reasoning over ingested evidence...';
  };
  const statusText = buildStatusText();

  let stageIndex = 0;
  let progressPercent = 10;
  let displayStageName = 'Preparing report';
  let displayStageDetail = progressReason || 'Preparing document set and launching Agent reasoning...';

  if (normalizedStatus === 'PENDING') {
    stageIndex = 0;
    progressPercent = 15;
    displayStageName = 'Preparing report';
    displayStageDetail = progressReason || 'Ingesting document set and initializing Agent task...';
  } else if (normalizedStatus === 'RUNNING') {
    displayStageName = 'Agent processing';

    if (normalizedStage === 'LOAD_MANIFEST' || normalizedStage === 'VERIFY_INGESTION') {
      stageIndex = 0;
      progressPercent = 20;
      displayStageName = 'Ingestion Verification';
      displayStageDetail = progressReason || 'Verifying multi-file manifest and ingestion job integrity...';
    } else if (normalizedStage === 'EVIDENCE_ANALYSIS' || normalizedStage === 'INTELLIGENCE_ANALYSIS') {
      stageIndex = 1;
      progressPercent = 40;
      displayStageName = 'Evidence & Intelligence Analysis';
      displayStageDetail = progressReason || 'Auditing evidence citations, metrics, and variances...';
    } else if (normalizedStage === 'CHART_ANALYSIS' || normalizedStage === 'PLANNING' || normalizedStage === 'VALIDATE_PLAN') {
      stageIndex = 2;
      progressPercent = 60;
      displayStageName = 'Intelligence Synthesis & Planning';
      displayStageDetail = progressReason || 'Formulating comprehensive audit outline and visual chart plan...';
    } else if (normalizedStage === 'WRITING' || normalizedStage === 'VALIDATE_REPORT_DATA') {
      stageIndex = 3;
      // Linear granular jumps as parallel sections finish
      progressPercent = totalSections > 0
        ? Math.min(90, Math.max(55, Math.round(55 + (sectionProgressPercent * 0.35))))
        : 80;
      displayStageName = totalSections > 0
        ? `Parallel Section Writing (${sectionsCompleted}/${totalSections})`
        : 'Section Synthesis & Verification';
      displayStageDetail = statusText;
    } else if (normalizedStage === 'COMPILE_MARKDOWN_ARTIFACT' || normalizedStage === 'VERIFY_ARTIFACT') {
      stageIndex = 4;
      progressPercent = 95;
      displayStageName = 'Markdown Compilation & Artifact Verification';
      displayStageDetail = progressReason || 'Compiling executive Markdown artifact and verifying integrity...';
    } else if (currentTool === 'query_evidence' || currentTool === 'get_intelligence') {
      stageIndex = 1;
      progressPercent = 35;
      displayStageDetail = progressReason || `Agent executing: ${currentTool} — retrieving structured evidence...`;
    } else if (currentTool === 'detect_charts' || currentTool === 'render_chart' || currentTool === 'create_plan') {
      stageIndex = 2;
      progressPercent = 55;
      displayStageDetail = progressReason || `Agent executing: ${currentTool} — formulating intelligence plan...`;
    } else if (currentTool === 'generate_report') {
      stageIndex = 4;
      progressPercent = 90;
      displayStageDetail = progressReason || 'Agent executing: generate_report — compiling report artifacts...';
    } else {
      stageIndex = 1;
      progressPercent = 45;
      displayStageDetail = progressReason || (currentTool ? `Agent executing tool: ${currentTool}...` : 'Autonomous Agent reasoning over ingested evidence...');
    }
  } else if (normalizedStatus === 'VALIDATING') {
    stageIndex = 3;
    progressPercent = 88;
    displayStageName = 'Validating report';
    displayStageDetail = progressReason || (currentTool ? `Validating with ${currentTool}...` : 'Auditing mathematical consistency and section integrity...');
  } else if (normalizedStatus === 'RETRYING') {
    stageIndex = 2;
    progressPercent = 50;
    displayStageName = 'Recovering / retrying';
    displayStageDetail = progressReason || 'Agent encountered a transient discrepancy; executing autonomous recovery retry...';
  } else if (normalizedStatus === 'AWAITING_INPUT') {
    stageIndex = 2;
    progressPercent = 60;
    displayStageName = 'Waiting for required input';
    displayStageDetail = progressReason || 'Agent is awaiting external parameter or input resolution...';
  } else if (normalizedStatus === 'COMPLETED') {
    stageIndex = 4;
    progressPercent = 100;
    displayStageName = 'Report completed';
    displayStageDetail = progressReason || 'Executive report artifacts generated and verified successfully.';
  } else if (normalizedStatus === 'FAILED') {
    stageIndex = 0;
    progressPercent = 0;
    displayStageName = 'Report generation failed';
    displayStageDetail = statusMessage || progressReason || 'Agent execution failed. Please check logs and try again.';
  }

  const isFailed = normalizedStatus === 'FAILED';
  const isCompleted = normalizedStatus === 'COMPLETED';

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
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  isFailed
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    : isCompleted
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }`}>
                  {isFailed ? 'Generation Failed' : isCompleted ? 'Generation Complete' : 'Agent Reasoning Active'}
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
              className="p-2 rounded-xl text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
              title="Cancel Generation"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Funnel Animation Canvas */}
        <div className="relative w-full h-72 sm:h-84 bg-[#050b17] flex items-center justify-center overflow-hidden">
          <FunnelVisual
            isProcessing={!isCompleted && !isFailed}
            stageIndex={stageIndex}
            stageName={displayStageName}
            stageDetail={displayStageDetail}
            isDark={true}
          />
        </div>

        {/* Progress Stages & Feedback Bottom Area */}
        <div className="p-6 overflow-y-auto">
          {/* Granular Section Progress UI for Parallel Writing */}
          {(totalSections > 0 || normalizedStage === 'WRITING') && (
            <div
              id="granular-section-progress-card"
              className="mb-5 p-4.5 rounded-2xl bg-gradient-to-br from-blue-950/70 via-[#071326] to-[#040813] border border-blue-400/50 dark:border-blue-500/40 shadow-xl shadow-blue-950/40"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs sm:text-sm font-extrabold text-neutral-900 dark:text-white">
                    Parallel Section Synthesis: <span className="text-blue-600 dark:text-blue-400 font-mono">Section {sectionsCompleted}/{totalSections} completed</span>
                  </span>
                </div>
                <span className="font-mono font-extrabold text-xs sm:text-sm px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-400/40 shadow-xs">
                  {sectionProgressPercent}%
                </span>
              </div>

              {/* Progress Bar that calculates: (sections_completed / total_sections) * 100 */}
              <div className="w-full h-3.5 rounded-full bg-neutral-200 dark:bg-[#060d1a] overflow-hidden p-0.5 border border-blue-300/70 dark:border-blue-800/70 shadow-inner">
                <div
                  id="section-progress-bar"
                  className="h-full rounded-full transition-all duration-300 ease-out shadow-md bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400"
                  style={{ width: `${sectionProgressPercent}%` }}
                />
              </div>

              {/* Status Text area updating as sections finish (e.g. "✅ Executive Summary completed... ⏳ Writing Market Analysis...") */}
              <div
                id="section-status-text"
                className="mt-3 px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-[#050b17]/95 border border-blue-200/80 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-blue-500 dark:text-blue-400 font-bold shrink-0">Status Text:</span>
                  <span className="text-neutral-900 dark:text-slate-100 font-medium truncate">{statusText}</span>
                </div>
                {activeSections.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-300 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    {activeSections.length} parallel worker{activeSections.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Badges for completed & active sections */}
              {(completedSections.length > 0 || activeSections.length > 0) && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                  {completedSections.map((title) => (
                    <span
                      key={`comp-${title}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60"
                    >
                      <span>✅</span>
                      <span className="truncate max-w-[220px]">{title}</span>
                    </span>
                  ))}
                  {activeSections.map((title) => (
                    <span
                      key={`act-${title}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 animate-pulse"
                    >
                      <span>⏳</span>
                      <span className="truncate max-w-[220px]">{title}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overall Workflow Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-200">
              <span className="truncate pr-2 flex flex-col">
                <span>Analyzing document: <strong className="text-blue-600 dark:text-blue-400">{fileName || 'Provided Source'}</strong></span>
                <span className="text-xs text-neutral-500 dark:text-blue-300/80 mt-1 flex items-center gap-1.5 font-medium">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">Agent Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                    isFailed 
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                      : isCompleted 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {normalizedStatus}
                  </span>
                  {statusMessage && <span className="text-rose-600 dark:text-rose-400 font-normal truncate">• {statusMessage}</span>}
                </span>
              </span>
              <span className={`font-mono font-extrabold ${isFailed ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-neutral-100 dark:bg-[#070e1c] overflow-hidden p-0.5 border border-neutral-200/80 dark:border-blue-900/40">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out shadow-xs ${
                  isFailed
                    ? 'bg-rose-500'
                    : isCompleted
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-blue-600 via-sky-400 to-amber-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stepper list */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {STAGES.map((stg, idx) => {
              const isDone = isCompleted ? true : (isFailed ? false : idx < stageIndex);
              const isCurrent = isFailed ? false : (isCompleted ? idx === 4 : idx === stageIndex);
              const Icon = stg.icon;

              return (
                <div
                  key={stg.id}
                  className={`p-3 rounded-xl border transition-all duration-200 ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500/30 shadow-xs'
                      : isDone
                      ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : isFailed && idx === stageIndex
                      ? 'border-rose-400 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30'
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
                      /* Replace generic spinner with progress indicator during Section Writing */
                      idx === 3 && totalSections > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/80 px-1.5 py-0.2 rounded border border-blue-400/50">
                            {sectionsCompleted}/{totalSections}
                          </span>
                          <div className="w-8 h-1.5 rounded-full bg-blue-200 dark:bg-blue-900/60 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${sectionProgressPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      )
                    ) : isFailed && idx === stageIndex ? (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Icon className="w-4 h-4 text-neutral-400 dark:text-blue-400/50" />
                    )}
                  </div>
                  <h4 className={`text-xs font-bold line-clamp-1 ${
                    isCurrent
                      ? 'text-blue-700 dark:text-blue-300'
                      : isDone
                      ? 'text-neutral-800 dark:text-neutral-200'
                      : isFailed && idx === stageIndex
                      ? 'text-rose-700 dark:text-rose-300'
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

