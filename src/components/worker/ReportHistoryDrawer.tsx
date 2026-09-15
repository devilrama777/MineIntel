import React from 'react';
import { 
  X, 
  Trash2, 
  FileText, 
  Clock, 
  Layers
} from 'lucide-react';
import { GeneratedReport } from './types';

interface ReportHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reports: GeneratedReport[];
  onSelectReport: (report: GeneratedReport) => void;
  onDeleteReport: (id: string) => void;
  onClearAll: () => void;
}

export const ReportHistoryDrawer: React.FC<ReportHistoryDrawerProps> = ({
  isOpen,
  onClose,
  reports,
  onSelectReport,
  onDeleteReport,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#040813]/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md h-full bg-white dark:bg-[#0b162a] border-l border-neutral-200 dark:border-blue-900/50 shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4.5 border-b border-neutral-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-[#070e1c]/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">
              Report History ({reports.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {reports.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-semibold text-neutral-400 hover:text-rose-500 transition-colors px-2 py-1 cursor-pointer"
                title="Clear all reports"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-blue-950/60 transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-neutral-400 dark:text-blue-300/50">
              <Layers className="w-12 h-12 mb-2 stroke-1 text-neutral-300 dark:text-blue-800" />
              <p className="text-sm font-bold text-neutral-700 dark:text-blue-100">No reports generated yet</p>
              <p className="text-xs text-neutral-400 dark:text-blue-300/60 mt-1 max-w-xs">
                Upload a document or pick a sample above to generate your first executive report with MineIntel.
              </p>
            </div>
          ) : (
            reports.map((rpt) => (
              <div
                key={rpt.id}
                className="group relative p-4 rounded-2xl border border-neutral-200 dark:border-blue-900/40 hover:border-blue-500 dark:hover:border-blue-400 bg-neutral-50/60 hover:bg-blue-50/40 dark:bg-[#0d1c33]/50 dark:hover:bg-blue-950/60 transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div 
                  onClick={() => {
                    onSelectReport(rpt);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {rpt.metadata.title}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 flex-shrink-0">
                      {rpt.metadata.reportType}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-blue-200/70 line-clamp-1 mb-2.5">
                    Source: {rpt.fileName || 'Direct Text Input'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-blue-300/70 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>{new Date(rpt.metadata.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(rpt.metadata.generatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                    <span>{rpt.metadata.wordCount.toLocaleString()} words</span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteReport(rpt.id);
                  }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg transition-all"
                  title="Delete from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
