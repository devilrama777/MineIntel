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
    label: 'Report Validation & Verification',
    detail: 'Auditing mathematical consistency and evidence integrity...',
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
      progressPercent = 80;
      displayStageName = 'Section Synthesis & Verification';
      displayStageDetail = progressReason || 'Synthesizing report sections and auditing mathematical consistency...';
    } else if (normalizedStage === 'COMPILE_MARKDOWN_ARTIFACT' || normalizedStage === 'VERIFY_ARTIFACT') {
      stageIndex = 4;
      progressPercent = 92;
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
      progressPercent = 85;
      displayStageDetail = progressReason || 'Agent executing: generate_report — compiling report artifacts...';
    } else {
      stageIndex = 1;
      progressPercent = 45;
      displayStageDetail = progressReason || (currentTool ? `Agent executing tool: ${currentTool}...` : 'Autonomous Agent reasoning over ingested evidence...');
    }
  } else if (normalizedStatus === 'VALIDATING') {
    stageIndex = 3;
    progressPercent = 85;
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
          {/* Progress Bar */}
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
                className={`h-full rounded-full transition-all duration-500 ease-out shadow-xs ${
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
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
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

