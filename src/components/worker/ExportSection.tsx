import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  FileCode,
  Layers,
  FileCheck
} from 'lucide-react';
import { MineIntelLogo } from './MineIntelLogo';

interface ExportSectionProps {
  fileName: string;
  fileSize?: number;
  totalSlides?: number;
  onBackToPreview: () => void;
  onDownload?: (format: 'pdf' | 'docx') => void;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  fileName,
  fileSize,
  totalSlides = 6,
  onBackToPreview,
  onDownload
}) => {
  // CRITICAL REQUIREMENT: "dont make anything default i will add all the backend stuff"
  // So selectedFormat is strictly null initially (no format pre-selected)
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx' | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportCompleteMsg, setExportCompleteMsg] = useState<string | null>(null);

  const handleExecuteDownload = () => {
    if (!selectedFormat) return;

    setIsExporting(true);
    setExportCompleteMsg(null);

    // Call optional callback so the user can easily plug in backend logic
    if (onDownload) {
      onDownload(selectedFormat);
    }

    // Provide clean UI confirmation
    setTimeout(() => {
      setIsExporting(false);
      const ext = selectedFormat.toUpperCase();
      setExportCompleteMsg(`Ready for download: ${fileName.replace(/\.[^/.]+$/, '')}.${selectedFormat} (${ext})`);
    }, 600);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Navigation & Back Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          id="btn-back-to-preview"
          type="button"
          onClick={onBackToPreview}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-neutral-700 dark:text-blue-200 bg-white dark:bg-[#0b162a] border border-neutral-200 dark:border-blue-900/50 hover:bg-neutral-100 dark:hover:bg-blue-900/40 shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Preview
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-blue-300/70">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Export Center • Ready for Backend Integration</span>
        </div>
      </div>

      {/* Main Export Card */}
      <div className="rounded-3xl border border-neutral-200/80 dark:border-blue-500/20 bg-white dark:bg-[#0b162a] shadow-xl p-6 sm:p-8 lg:p-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-blue-900/50 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <MineIntelLogo size={26} />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Document Export System
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              Export Document
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-blue-200/70">
              Select your desired download format below. Choose between PDF and DOCX formats.
            </p>
          </div>

          {/* Current Document Pill */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-blue-950/50 border border-neutral-200 dark:border-blue-900/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[200px]">
                {fileName || 'Document.pdf'}
              </div>
              <div className="text-[11px] text-neutral-400 dark:text-blue-300/60 flex items-center gap-2">
                <span>{totalSlides} Slides / Sections</span>
                {fileSize && <span>• {(fileSize / 1024).toFixed(0)} KB</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Format Selection Section */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-blue-300/80">
              Choose Download Format (Nothing selected by default)
            </label>
            <span className="text-xs text-neutral-400">
              {selectedFormat ? `Selected: ${selectedFormat.toUpperCase()}` : 'Please select an option'}
            </span>
          </div>

          {/* Two Options: PDF and DOCX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* OPTION 1: PDF */}
            <div
              id="export-option-pdf"
              onClick={() => setSelectedFormat('pdf')}
              className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 flex flex-col justify-between ${
                selectedFormat === 'pdf'
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 shadow-lg ring-2 ring-blue-500/20'
                  : 'border-neutral-200 dark:border-blue-900/40 bg-neutral-50/50 dark:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedFormat === 'pdf'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  }`}>
                    <FileCode className="w-6 h-6" />
                  </div>

                  {/* Radio / Check Circle */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedFormat === 'pdf'
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500 text-white'
                      : 'border-neutral-300 dark:border-neutral-600'
                  }`}>
                    {selectedFormat === 'pdf' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <h3 className="font-outfit text-lg font-bold text-neutral-900 dark:text-white">
                    PDF Document
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                    .pdf
                  </span>
                </div>

                <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-blue-200/80 leading-relaxed">
                  Export high-fidelity presentation slides with vector styling, fixed slide proportions, executive branding, and board-ready layouts.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-200/80 dark:border-blue-900/40 flex items-center justify-between text-xs text-neutral-500 dark:text-blue-300/70">
                <span>Standard Adobe PDF</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">Presentation Ready</span>
              </div>
            </div>

            {/* OPTION 2: DOCX */}
            <div
              id="export-option-docx"
              onClick={() => setSelectedFormat('docx')}
              className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 flex flex-col justify-between ${
                selectedFormat === 'docx'
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 shadow-lg ring-2 ring-blue-500/20'
                  : 'border-neutral-200 dark:border-blue-900/40 bg-neutral-50/50 dark:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedFormat === 'docx'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  }`}>
                    <FileCheck className="w-6 h-6" />
                  </div>

                  {/* Radio / Check Circle */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedFormat === 'docx'
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500 text-white'
                      : 'border-neutral-300 dark:border-neutral-600'
                  }`}>
                    {selectedFormat === 'docx' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <h3 className="font-outfit text-lg font-bold text-neutral-900 dark:text-white">
                    Word Document
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    .docx
                  </span>
                </div>

                <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-blue-200/80 leading-relaxed">
                  Export as an editable Microsoft Word document with editable paragraphs, table figures, hierarchical headings, and team collaboration notes.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-200/80 dark:border-blue-900/40 flex items-center justify-between text-xs text-neutral-500 dark:text-blue-300/70">
                <span>Microsoft Word DOCX</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">Fully Editable</span>
              </div>
            </div>

          </div>
        </div>

        {/* Feedback Message */}
        {exportCompleteMsg && (
          <div className="mb-6 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{exportCompleteMsg}</span>
          </div>
        )}

        {/* Download Action Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-neutral-200/80 dark:border-blue-900/50">
          <div className="text-xs text-neutral-500 dark:text-blue-300/70">
            {selectedFormat ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Ready to download as {selectedFormat.toUpperCase()}
              </span>
            ) : (
              <span>Please select either <strong>PDF</strong> or <strong>DOCX</strong> above to enable download</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToPreview}
              className="px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-blue-900/50 text-neutral-700 dark:text-blue-200 font-bold hover:bg-neutral-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer text-sm"
            >
              Cancel
            </button>

            <button
              id="btn-download-selected-format"
              type="button"
              disabled={!selectedFormat || isExporting}
              onClick={handleExecuteDownload}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                selectedFormat
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 active:scale-98'
                  : 'bg-neutral-200 dark:bg-blue-950/40 text-neutral-400 dark:text-neutral-500 cursor-not-allowed shadow-none'
              }`}
            >
              <Download className="w-4 h-4" />
              {isExporting 
                ? 'Preparing Download...' 
                : selectedFormat === 'pdf' 
                ? 'Download PDF (.pdf)' 
                : selectedFormat === 'docx' 
                ? 'Download Word (.docx)' 
                : 'Select Format to Download'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
