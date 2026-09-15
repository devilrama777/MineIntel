import React from 'react';
import { 
  Trash2, 
  ArrowRight, 
  Database, 
  Plus, 
  FileCheck,
  CheckCircle2,
  Clock,
  HardDrive,
  FileText
} from 'lucide-react';
import { UploadedDataSourceFile } from './types';
import { MineIntelLogo } from './MineIntelLogo';

interface UploadedFilesListProps {
  files: UploadedDataSourceFile[];
  activeFileId: string | null;
  isProcessing: boolean;
  onSelectFile: (file: UploadedDataSourceFile) => void;
  onGenerateReportForFile: (file: UploadedDataSourceFile) => void;
  onDeleteFile: (fileId: string) => void;
  onGoToDataSource: () => void;
}

export const UploadedFilesList: React.FC<UploadedFilesListProps> = ({
  files,
  activeFileId,
  isProcessing,
  onSelectFile,
  onGenerateReportForFile,
  onDeleteFile,
  onGoToDataSource,
}) => {
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileBadge = (name: string, type: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || type.includes('pdf')) {
      return { label: 'PDF', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-900/60' };
    }
    if (ext === 'csv' || ext === 'xlsx' || type.includes('spreadsheet')) {
      return { label: 'SHEET', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900/60' };
    }
    if (ext === 'doc' || ext === 'docx') {
      return { label: 'DOCX', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-900/60' };
    }
    return { label: ext.toUpperCase() || 'TXT', bg: 'bg-neutral-100 text-neutral-800 dark:bg-blue-950/80 dark:text-blue-300 border-neutral-300 dark:border-blue-900/60' };
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-3xl bg-white dark:bg-[#0b162a] border border-blue-900/20 dark:border-blue-500/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-outfit text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white tracking-tight">
                Source Documents Repository
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                {files.length} {files.length === 1 ? 'Document' : 'Documents'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-blue-200/70 mt-0.5">
              Documents uploaded in Data Source. Click Generate Report on any document to synthesize.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToDataSource}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-neutral-800 dark:text-blue-200 border border-neutral-200 dark:border-blue-900/60 transition-all cursor-pointer shadow-2xs"
        >
          <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Ingest More in Data Source</span>
        </button>
      </div>

      {/* Files List or Empty State */}
      {files.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#0b162a] border border-blue-900/20 dark:border-blue-500/20 shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
            <Database className="w-8 h-8" />
          </div>
          <h3 className="font-outfit text-lg font-extrabold text-neutral-900 dark:text-white mb-2">
            No Documents Ingested Yet
          </h3>
          <p className="text-sm text-neutral-500 dark:text-blue-200/70 max-w-md mx-auto mb-6">
            Upload your source documents, PDF audits, or select sample files in the Data Source section. Once ingested, they will automatically appear here.
          </p>
          <button
            type="button"
            onClick={onGoToDataSource}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Go to Data Source to Upload Document</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => {
            const badge = getFileBadge(file.name, file.type);
            const isCurrentActive = activeFileId === file.id;
            const isCurrentlyProcessingThis = isProcessing && isCurrentActive;

            return (
              <div
                key={file.id}
                className={`group p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0b162a] border transition-all duration-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCurrentActive 
                    ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 shadow-md' 
                    : 'border-blue-900/20 dark:border-blue-500/20 hover:border-blue-400/50 dark:hover:border-blue-500/50'
                }`}
              >
                {/* File Information */}
                <div 
                  className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelectFile(file)}
                >
                  <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex-shrink-0">
                    <FileCheck className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <h4 
                        className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white truncate"
                        title={file.name}
                      >
                        {file.name}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-blue-300/70 font-medium">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
                        {formatFileSize(file.size)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        {file.uploadedAt}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ingested
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions: Generate Report & Remove */}
                <div className="flex items-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-blue-900/40 justify-end flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onGenerateReportForFile(file)}
                    disabled={isProcessing}
                    className={`group/btn relative overflow-hidden flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white transition-all duration-200 cursor-pointer shadow-md shadow-blue-900/20 hover:shadow-blue-600/30 ${
                      isCurrentlyProcessingThis
                        ? 'bg-blue-700 cursor-wait opacity-90'
                        : 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <MineIntelLogo variant="icon-only" size={18} />
                    <span>
                      {isCurrentlyProcessingThis ? 'Synthesizing...' : 'Generate Report'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white transition-transform group-hover/btn:translate-x-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteFile(file.id)}
                    disabled={isProcessing}
                    className="p-2.5 rounded-xl text-neutral-400 hover:text-rose-600 dark:text-neutral-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Remove document from repository"
                    aria-label="Remove document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
