import React, { useState } from 'react';
import { 
  Database, 
  Image as ImageIcon,
  X
} from 'lucide-react';
import { UploadZone } from './UploadZone';
import { SampleDocument } from './types';

interface DataSourceViewProps {
  fileName: string;
  fileType: string;
  fileSize?: number;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  onFileSelected: (file: File) => void;
  onClearFile: () => void;
  onSelectSample?: (sample: SampleDocument) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  isProcessing: boolean;
  isDark: boolean;
}

export const DataSourceView: React.FC<DataSourceViewProps> = ({
  fileName,
  fileType,
  fileSize,
  customPrompt,
  onCustomPromptChange,
  onFileSelected,
  onClearFile,
  onSelectSample,
  onGenerate,
  canGenerate,
  isProcessing,
}) => {
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header: Clean Data Source Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-blue-900/40">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 shadow-xs">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-outfit text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                Data Source
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70 mt-0.5">
                Upload and ingest your documents to synthesize executive intelligence reports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Reference Screenshot Button */}
          <button
            type="button"
            onClick={() => setShowScreenshotModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-neutral-700 dark:text-blue-300 border border-neutral-200 dark:border-blue-900/60 transition-all cursor-pointer shadow-2xs"
            title="View reference screenshot"
          >
            <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>View Architecture Screenshot</span>
          </button>
        </div>
      </div>

      {/* Upload Document & Ingest without auto prompt / without generate button in Data Source */}
      <div className="w-full">
        <UploadZone
          fileName={fileName}
          fileType={fileType}
          fileSize={fileSize}
          customPrompt={customPrompt}
          onCustomPromptChange={onCustomPromptChange}
          onFileSelected={onFileSelected}
          onClearFile={onClearFile}
          onSelectSample={onSelectSample}
          onGenerate={onGenerate}
          canGenerate={canGenerate}
          isProcessing={isProcessing}
          showAutoPrompt={false}
          showGenerateButton={false}
        />
      </div>

      {/* Screenshot Reference Modal */}
      {showScreenshotModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowScreenshotModal(false)}
        >
          <div 
            className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden border border-blue-500/40 bg-[#070e1c] text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0c1628] border-b border-blue-900/60">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="font-mono text-xs text-blue-300 font-bold">
                  Reference Architecture: Background Processing Pipeline &amp; Job Daemon
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowScreenshotModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-neutral-300">
              <div className="p-4 rounded-2xl bg-[#0a1528] border border-blue-900/50">
                <p className="text-sm font-semibold text-white mb-2">
                  Architecture Reference Note:
                </p>
                <p className="text-neutral-400 leading-relaxed">
                  Per instructions, the background processing pipeline daemon and worker queue UI have been removed from the live Data Source view to keep document uploading and ingestion fast, simple, and uncluttered.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0a1528] border border-blue-900/50 space-y-2">
                <div className="font-mono text-[11px] text-blue-400 font-bold">
                  URL Reference: https://sih-ps-2-test-1.vercel.app
                </div>
                <div className="font-mono text-[11px] text-neutral-400">
                  Target Component: Sovereign Enclave &amp; Document Ingestion Engine
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-[#0c1628] border-t border-blue-900/60 flex justify-end">
              <button
                type="button"
                onClick={() => setShowScreenshotModal(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
