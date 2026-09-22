import React, { useRef, useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  FileCheck, 
  X, 
  Sparkles, 
  AlertCircle,
  FileSpreadsheet,
  Search,
  Wand2,
  ArrowRight,
  Zap,
  CheckCircle2,
  Compass,
  FileBox,
  Calendar,
  Clock,
  Eye
} from 'lucide-react';
import { SampleDocument, UploadedDataSourceFile } from './types';
import { MineIntelLogo } from './MineIntelLogo';

interface UploadZoneProps {
  fileName: string;
  fileType: string;
  fileSize?: number;
  stagedFiles?: UploadedDataSourceFile[];
  onFilesSelected?: (files: File[]) => void;
  onRemoveStagedFile?: (fileId: string) => void;
  onClearStagedFiles?: () => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  onFileSelected: (file: File) => void;
  onClearFile: () => void;
  onSelectSample?: (sample: SampleDocument) => void;
  onGenerate: () => void;
  onPreviewFile?: () => void;
  canGenerate: boolean;
  isProcessing: boolean;
  showAutoPrompt?: boolean;
  showGenerateButton?: boolean;
}

// Preset intelligent prompts for the AI search engine
const PROMPT_TEMPLATES = [
  {
    id: 'exec',
    label: '📊 Executive Briefing & ROI',
    prompt: 'Synthesize key executive findings, strategic growth trajectories, and highlight high-priority leadership decision items.',
  },
  {
    id: 'risk',
    label: '⚠️ Risk & Compliance Matrix',
    prompt: 'Extract an exhaustive Risk & Compliance Matrix detailing operational vulnerabilities, likelihood ratings, and remediation timelines.',
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

export const UploadZone: React.FC<UploadZoneProps> = ({
  fileName,
  fileType,
  fileSize,
  stagedFiles = [],
  onFilesSelected,
  onRemoveStagedFile,
  onClearStagedFiles,
  customPrompt,
  onCustomPromptChange,
  onFileSelected,
  onClearFile,
  onSelectSample,
  onGenerate,
  onPreviewFile,
  canGenerate,
  isProcessing,
  showAutoPrompt = true,
  showGenerateButton = true,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptGeneratedSuccess, setPromptGeneratedSuccess] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragError(null);

    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      validateAndUploadFiles(droppedFiles);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      validateAndUploadFiles(selected);
      e.target.value = '';
    }
  };

  const validateAndUploadFiles = (files: File[]) => {
    const validFiles: File[] = [];
    for (const f of files) {
      if (f.size > 50 * 1024 * 1024) {
        setDragError(`File "${f.name}" exceeds 50MB limit. Please upload a smaller document.`);
        return;
      }
      validFiles.push(f);
    }
    setDragError(null);
    if (onFilesSelected) {
      onFilesSelected(validFiles);
    } else if (validFiles.length > 0) {
      onFileSelected(validFiles[0]);
    }
  };

  // AI Auto Prompt Generator function
  const handleAutoGeneratePrompt = () => {
    setIsGeneratingPrompt(true);
    setPromptGeneratedSuccess(false);

    setTimeout(() => {
      // Pick dynamic context-aware prompt based on filename or cycle through advanced presets
      const lowerName = fileName.toLowerCase();
      let selectedPrompt = '';

      if (lowerName.includes('financ') || lowerName.includes('kpi') || lowerName.includes('q3') || lowerName.includes('audit')) {
        selectedPrompt = 'Extract an exhaustive financial audit analyzing quarterly revenue growth, EBITDA margin trends, OpEx variances, and cash flow projections.';
      } else if (lowerName.includes('risk') || lowerName.includes('secur') || lowerName.includes('incident') || lowerName.includes('hazard')) {
        selectedPrompt = 'Perform a thorough risk and compliance assessment detailing high-impact vulnerability vectors, regulatory checkpoints, and rapid remediation protocols.';
      } else if (lowerName.includes('tech') || lowerName.includes('architect') || lowerName.includes('system') || lowerName.includes('spec')) {
        selectedPrompt = 'Execute a deep technical synthesis evaluating architectural bottlenecks, multi-system interoperability, failover safeguards, and long-term scalability.';
      } else {
        // Pick an alternating high-power executive prompt
        const randomIndex = Math.floor(Math.random() * PROMPT_TEMPLATES.length);
        selectedPrompt = PROMPT_TEMPLATES[randomIndex].prompt;
      }

      onCustomPromptChange(selectedPrompt);
      setIsGeneratingPrompt(false);
      setPromptGeneratedSuccess(true);

      setTimeout(() => setPromptGeneratedSuccess(false), 2400);
    }, 450);
  };

  const isPdf = fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const hasFiles = (stagedFiles && stagedFiles.length > 0) || Boolean(fileName);

  return (
    <div id="upload-dropzone" className="w-full bg-white dark:bg-[#0b162a] rounded-3xl border border-blue-900/20 dark:border-blue-500/20 shadow-md transition-all p-6 sm:p-8 lg:p-10">
      
      {/* Top Header: Upload Document Title & Quick Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-blue-900/40 pb-5 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-outfit text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              Upload Document &amp; Ingest
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70">
              Provide mixed evidence files (PDF, Scanned PDF, DOCX, CSV/XLSX, Images) for unified multi-file synthesis
            </p>
          </div>
        </div>

        {hasFiles && (
          <button
            id="btn-clear-document"
            type="button"
            onClick={onClearStagedFiles || onClearFile}
            disabled={isProcessing}
            className="self-start sm:self-auto text-xs sm:text-sm font-semibold text-neutral-500 hover:text-rose-500 dark:text-neutral-400 dark:hover:text-rose-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-blue-900/50 hover:border-rose-300 dark:hover:border-rose-900 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. EXPANDED LARGE UPLOAD DOCUMENT BLOCK                                   */}
      {/* ========================================================================= */}
      <div className="mb-8">
        {stagedFiles && stagedFiles.length > 0 ? (
          /* Multi-File Staged Files Card */
          <div className="flex flex-col gap-4 p-5 sm:p-6 rounded-2xl border-2 border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/40 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200 dark:border-blue-900/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-outfit font-extrabold text-base sm:text-lg text-neutral-900 dark:text-white">
                  Staged Source Documents ({stagedFiles.length})
                </span>
                <span className="text-[11px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300">
                  Multi-File Job
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-blue-400 dark:border-blue-700 bg-white dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-800/60 transition cursor-pointer disabled:opacity-50"
                >
                  + Add More Files
                </button>
                <button
                  type="button"
                  onClick={onClearStagedFiles || onClearFile}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {stagedFiles.map((sf, idx) => {
                const isItemPdf = sf.type?.includes('pdf') || sf.name.toLowerCase().endsWith('.pdf');
                const isSpreadsheet = sf.type?.includes('sheet') || sf.type?.includes('csv') || sf.name.toLowerCase().endsWith('.csv') || sf.name.toLowerCase().endsWith('.xlsx') || sf.name.toLowerCase().endsWith('.xls');
                return (
                  <div key={sf.id || idx} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/80 dark:bg-[#0c1729] border border-blue-200 dark:border-blue-900/60 shadow-xs">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white flex-shrink-0">
                        {isItemPdf ? <FileText className="w-5 h-5" /> : isSpreadsheet ? <FileSpreadsheet className="w-5 h-5" /> : <FileBox className="w-5 h-5" />}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {sf.name}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-blue-300/70 flex items-center gap-2">
                          <span>{formatFileSize(sf.size)}</span>
                          <span>•</span>
                          <span className="text-emerald-500 font-semibold flex items-center gap-1">
                            <FileCheck className="w-3 h-3" /> Ready
                          </span>
                        </div>
                      </div>
                    </div>
                    {onRemoveStagedFile && (
                      <button
                        type="button"
                        onClick={() => onRemoveStagedFile(sf.id)}
                        disabled={isProcessing}
                        className="p-1 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
                        title="Remove this file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : fileName ? (
          /* High-Profile Selected File Card */
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-5 sm:p-6 rounded-2xl border-2 border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/40 shadow-sm">
            <div className="flex items-center gap-4.5 overflow-hidden">
              <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex-shrink-0 shadow-lg shadow-blue-500/25">
                {isPdf ? (
                  <FileText className="w-7 h-7 sm:w-8 sm:h-8" />
                ) : (
                  <FileSpreadsheet className="w-7 h-7 sm:w-8 sm:h-8" />
                )}
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2.5">
                  <span className="font-outfit font-extrabold text-base sm:text-lg text-neutral-900 dark:text-white truncate">
                    {fileName}
                  </span>
                  <span className="text-[11px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300">
                    {isPdf ? 'PDF' : 'DOC'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3.5 mt-2 text-xs sm:text-sm font-medium text-neutral-500 dark:text-blue-200/70">
                  <span className="font-mono">{formatFileSize(fileSize)}</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
                    <FileCheck className="w-4 h-4" /> Ready for AI Synthesis
                  </span>
                  <span>•</span>
                  <span className="text-neutral-400 dark:text-neutral-500">Multi-Page Ingestion Active</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-shrink-0">
              {onPreviewFile && (
                <button
                  id="btn-preview-file"
                  type="button"
                  onClick={onPreviewFile}
                  className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  title="Open interactive PDF slide preview"
                >
                  <Eye className="w-4 h-4" />
                  Preview PDF Slides
                </button>
              )}
              <button
                id="btn-replace-file"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border border-neutral-300 dark:border-blue-800 hover:bg-white dark:hover:bg-blue-900/60 text-neutral-700 dark:text-neutral-200 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                Change File
              </button>
            </div>
          </div>
        ) : (
          /* Large, Spacious Executive Dropzone */
          <div
            id="dropzone-area"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group cursor-pointer relative flex flex-col items-center justify-center p-10 sm:p-14 lg:p-16 rounded-3xl border-2 border-dashed transition-all duration-200 ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 scale-[0.99] ring-4 ring-blue-500/20'
                : 'border-neutral-300 dark:border-blue-900/50 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
            }`}
          >
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 mb-5 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-md shadow-blue-500/15">
              <UploadCloud className="w-10 h-10" />
            </div>

            <h3 className="font-outfit text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-center">
              Drag &amp; drop multiple documents here
            </h3>
            <p className="text-xs sm:text-base text-neutral-500 dark:text-neutral-400 mt-1.5 text-center max-w-md">
              High-speed multi-modal parsing for PDF, DOCX, CSV, XLSX, and image files (up to 50MB per file)
            </p>

            <div className="mt-6 inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold bg-neutral-900 text-white dark:bg-blue-600 dark:text-white shadow-md group-hover:bg-blue-600 dark:group-hover:bg-blue-500 transition-all duration-200">
              <UploadCloud className="w-4.5 h-4.5" />
              <span>Browse Computer Files</span>
            </div>

            {/* Live System Date & Time Display */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="mt-6 pt-5 border-t border-neutral-200/70 dark:border-blue-900/40 w-full max-w-xl"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-neutral-600 dark:text-blue-200/80">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#071326] border border-neutral-200/90 dark:border-blue-900/60 shadow-2xs font-semibold text-neutral-800 dark:text-blue-100">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>
                    {currentDateTime.toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#071326] border border-neutral-200/90 dark:border-blue-900/60 shadow-2xs font-mono font-bold text-neutral-900 dark:text-white">
                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>
                    {currentDateTime.toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80">
                    LIVE
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <input
          id="file-upload-input"
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.txt,.tsv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*,text/plain"
          onChange={handleFileChange}
          className="hidden"
        />

        {dragError && (
          <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm font-medium text-rose-500 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{dragError}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* AI POWERED AUTO PROMPT GENERATOR SEARCH ENGINE                            */}
      {/* ========================================================================= */}
      {showAutoPrompt ? (
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
                  className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white mr-2 transition-colors"
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
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all text-left ${
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

          {/* Primary Action Button: Generate Executive Report */}
          {showGenerateButton && (
            <div className="mt-6 pt-5 border-t border-neutral-200/80 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-neutral-500 dark:text-blue-200/70">
                {canGenerate ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Ready to generate executive report with active prompt
                  </span>
                ) : (
                  <span>Upload a PDF or document above to begin synthesis</span>
                )}
              </div>

              <button
                id="btn-generate-report"
                type="button"
                onClick={canGenerate ? onGenerate : () => fileInputRef.current?.click()}
                disabled={isProcessing}
                className={`group relative overflow-hidden flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm sm:text-base font-extrabold transition-all duration-300 cursor-pointer text-white bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-700 border border-blue-400/30 hover:border-blue-300/60 shadow-xl shadow-blue-900/40 hover:shadow-2xl hover:shadow-blue-600/50 hover:scale-[1.015] active:scale-[0.98] ${
                  isProcessing ? 'cursor-wait opacity-90' : ''
                }`}
              >
                {/* Dark glass specular top reflection */}
                <span className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-t-2xl pointer-events-none" />

                {/* Bottom ambient deep shadow ridge for optical 3D depth */}
                <span className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />

                {/* Glowing deep-blue focal gleam spot */}
                <span className="absolute -top-5 left-1/4 w-36 h-14 bg-sky-400/20 blur-md rounded-full pointer-events-none" />

                {/* Continuous refined dark-metallic shine sweep */}
                <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shine-sweep pointer-events-none" />

                {/* Hover shimmer gleam */}
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

                {/* Button Inner Content */}
                <span className="relative z-10 flex items-center gap-3">
                  <MineIntelLogo variant="icon-only" size={24} />
                  <span className="tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{isProcessing ? 'Synthesizing Report...' : 'Generate Executive Report'}</span>
                  <ArrowRight className="w-5 h-5 text-white transition-transform group-hover:translate-x-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* When showAutoPrompt is false (Data Source view) */
        canGenerate ? (
          <div className="p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Document Ingested into Repository
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  {fileName} • Ingested and stored. This file is now available in New Report.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 self-start sm:self-auto">
              Ingested &amp; Ready
            </span>
          </div>
        ) : null
      )}
    </div>
  );
};
