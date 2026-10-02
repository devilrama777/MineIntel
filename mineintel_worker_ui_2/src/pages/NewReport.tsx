import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  Check,
  X,
  FileCheck,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  Layers,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FileType } from '../types';
import { ReportTemplatesSection } from '../components/reports/ReportTemplatesSection';

export const NewReport: React.FC = () => {
  const {
    files,
    selectedFileIds,
    templates,
    selectedTemplateId,
    toggleSelectFile,
    selectAllFiles,
    clearSelectedFiles,
    ingestFile,
    deleteFile,
    startGeneratingReport,
    isSidebarCollapsed,
  } = useApp();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        ingestFile(file);
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        ingestFile(file);
      });
    }
  };

  // Badge colors for file types: PDF=red, XLSX=green, DOCX=blue, CSV=amber, TXT=slate, IMG=purple
  const getBadgeStyle = (type: FileType) => {
    switch (type) {
      case 'PDF':
        return 'bg-red-500/15 border-red-500/30 text-red-400';
      case 'XLSX':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
      case 'DOCX':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
      case 'CSV':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'TXT':
        return 'bg-slate-500/15 border-slate-500/30 text-slate-300';
      case 'PNG':
      case 'JPG':
        return 'bg-purple-500/15 border-purple-500/30 text-purple-400';
      default:
        return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400';
    }
  };

  const selectedCount = selectedFileIds.length;

  return (
    <div className="space-y-12 pb-32 animate-in fade-in duration-300">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* STAGE 1: REPORT TEMPLATES SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <ReportTemplatesSection />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STAGE 2: EVIDENCE INGESTION SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-6 pt-6 border-t border-[#00D9FF]/12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#00D9FF] uppercase">
              STEP 2 · FIELD EVIDENCE INGESTION
            </span>
            <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-white mt-1">
              Select or Upload Source Files
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Correlate shift logs, HEMM sensor spreadsheets, drone highwall surveys, or ventilation data.
            </p>
          </div>

          {/* Action button: select all / clear */}
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllFiles}
              className="btn-action flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-[#00D9FF]/40 transition-all"
            >
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select All</span>
            </button>
            <button
              onClick={clearSelectedFiles}
              className="btn-action flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* DROPZONE (responsive adaptive height) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`min-h-[200px] sm:min-h-[240px] lg:h-[260px] rounded-2xl flex flex-col items-center justify-center text-center p-4 sm:p-8 cursor-pointer transition-all duration-300 relative group overflow-hidden ${
            isDragOver
              ? 'border-2 border-solid border-[#00D9FF] scale-[1.01] shadow-[0_0_30px_rgba(0,217,255,0.35)] bg-slate-900/90'
              : 'border-2 border-dashed border-[#00D9FF]/30 bg-[rgba(15,23,42,0.45)] hover:border-[#00D9FF]/60 hover:bg-[rgba(15,23,42,0.6)] backdrop-blur-xl'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.txt,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Ambient subtle glow inside dropzone */}
          <div className="absolute inset-0 bg-radial from-[#00D9FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* Center: UploadCloud icon with slow pulse animation */}
          <div className="relative mb-3 sm:mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900/90 border border-[#00D9FF]/30 group-hover:border-[#00D9FF] flex items-center justify-center shadow-lg transition-colors">
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-[#00D9FF] animate-pulse stroke-[1.8]" />
            </div>
          </div>

          <h4 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            Drop files to analyze
          </h4>

          <p className="text-xs sm:text-[13px] text-slate-400 mt-1 sm:mt-2 font-mono px-2">
            PDF · XLSX · CSV · DOCX · TXT · PNG · JPG — Max 25 MB each
          </p>

          <div className="mt-3 sm:mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] sm:text-xs text-cyan-300/80">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Click to browse your workstation or drag telemetry files here</span>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* FILE LIST (appears after upload / populated with mock files) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h4 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Available Evidence Assets</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30">
                {files.length} Total
              </span>
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              Check files to include in {activeTemplate?.annexure || 'Report'} Synthesis
            </span>
          </div>

          {files.length === 0 ? (
            /* Empty state */
            <div className="mine-card p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-center mb-4">
                <FileCheck className="w-12 h-12 text-slate-500" />
              </div>
              <h5 className="text-base font-semibold text-white">No Sources Ingested</h5>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Upload your field inspection spreadsheets or logs above to begin evidence compilation.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence>
                {files.map((file) => {
                  const isSelected = selectedFileIds.includes(file.id);
                  return (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`min-h-[64px] rounded-xl py-2.5 px-3 sm:px-5 flex items-center justify-between gap-2.5 transition-all duration-200 group border cursor-pointer ${
                        isSelected
                          ? 'bg-[rgba(15,23,42,0.75)] border-[#00D9FF]/35 shadow-[0_0_15px_rgba(0,217,255,0.08)]'
                          : 'bg-[rgba(15,23,42,0.45)] border-slate-800/80 hover:border-slate-700'
                      }`}
                      onClick={() => toggleSelectFile(file.id)}
                    >
                      {/* Left: Colored type badge + Filename + size/date */}
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <span
                          className={`w-12 sm:w-14 text-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-mono font-bold border uppercase shrink-0 ${getBadgeStyle(
                            file.type
                          )}`}
                        >
                          {file.type}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-medium text-white truncate group-hover:text-cyan-300 transition-colors">
                            {file.name}
                          </div>
                          <div className="font-mono text-[11px] sm:text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span>{file.size}</span>
                            <span>·</span>
                            <span>{file.uploadedAt}</span>
                            {file.tags.length > 0 && (
                              <>
                                <span className="hidden sm:inline-block">·</span>
                                <span className="hidden sm:inline-block text-slate-500 truncate max-w-[200px]">
                                  {file.tags.join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Checkbox & Remove X button */}
                      <div
                        className="flex items-center gap-2 sm:gap-3 shrink-0 ml-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Remove X (fades in on hover / always accessible on mobile) */}
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="opacity-60 sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        {/* Animated Checkbox */}
                        <button
                          onClick={() => toggleSelectFile(file.id)}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#00D9FF] border-[#00D9FF] text-slate-950 shadow-[0_0_8px_#00D9FF]'
                              : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                          }`}
                          title={isSelected ? 'Deselect source' : 'Select source'}
                        >
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </motion.div>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STICKY FOOTER (bottom, backdrop-blur, border-t, responsive offset) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 ${
          isSidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[260px]'
        } right-0 min-h-[68px] sm:min-h-[72px] py-3 sm:py-3.5 bg-[rgba(8,13,22,0.96)] backdrop-blur-2xl border-t border-[#00D9FF]/15 z-30 px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl transition-all duration-300`}
      >
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00D9FF] animate-pulse" />
            <span className="text-xs sm:text-[13px] text-slate-400 font-mono">
              <strong className="text-white font-semibold">{selectedCount}</strong> sources selected
            </span>
          </div>

          {activeTemplate && (
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-slate-400 sm:pl-4 sm:border-l border-slate-800">
              <span className="text-slate-500 hidden sm:inline">Blueprint:</span>
              <span className="text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 truncate max-w-[200px] sm:max-w-xs">
                {activeTemplate.annexure} · {activeTemplate.name}
              </span>
            </div>
          )}
        </div>

        <div className="w-full sm:w-auto">
          <button
            onClick={startGeneratingReport}
            disabled={selectedCount === 0}
            className={`w-full sm:w-auto btn-action shine-sweep px-5 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedCount === 0
                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
                : 'bg-gradient-to-r from-[#00D9FF] to-blue-600 text-slate-950 hover:brightness-110 shadow-[0_0_25px_rgba(0,217,255,0.3)]'
            }`}
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>Generate Report ({selectedCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

