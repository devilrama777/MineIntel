import React from 'react';
import { X, BookOpen, ArrowRight, FileText } from 'lucide-react';
import { SAMPLE_DOCUMENTS } from './sampleDocuments';
import { SampleDocument } from './types';

interface SampleDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: SampleDocument) => void;
}

export const SampleDocsModal: React.FC<SampleDocsModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040813]/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#0b162a] rounded-3xl border border-blue-200 dark:border-blue-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-200/80 dark:border-blue-900/50 bg-blue-50/50 dark:bg-[#070e1c]/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white">
              Curated Sample Documents
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-blue-950/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3.5">
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-blue-200/80 mb-2">
            Click any sample document below to load it into MineIntel and test the report generator:
          </p>

          {SAMPLE_DOCUMENTS.map((sample) => (
            <div
              key={sample.id}
              className="p-4 rounded-2xl border border-neutral-200 dark:border-blue-900/40 hover:border-blue-500 dark:hover:border-blue-400 bg-neutral-50/60 hover:bg-blue-50/50 dark:bg-[#0d1c33]/60 dark:hover:bg-blue-950/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900 dark:text-white">
                    {sample.title}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-300">
                    {sample.category}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70 leading-relaxed">
                  {sample.description}
                </p>
                <div className="text-xs font-mono text-neutral-400 dark:text-blue-400/60 flex items-center gap-1.5 pt-0.5">
                  <FileText className="w-3.5 h-3.5" />
                  {sample.fileName}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectSample(sample);
                  onClose();
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-sm transition-all flex-shrink-0 active:scale-95"
              >
                <span>Load Doc</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
