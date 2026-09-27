import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Image as ImageIcon,
  X,
  FileText,
  FileCheck,
  Trash2,
  HardDrive,
  Clock,
  CheckCircle2,
  ArrowRight,
  Plus
} from 'lucide-react';
import { UploadZone } from './UploadZone';
import { SampleDocument, UploadedDataSourceFile } from './types';
import { reportService } from '../../services/reportService';

interface DataSourceViewProps {
  fileName: string;
  fileType: string;
  fileSize?: number;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  onFileSelected: (file: File) => void;
  onClearFile: () => void;
  stagedFiles?: UploadedDataSourceFile[];
  onFilesSelected?: (files: File[]) => void;
  onRemoveStagedFile?: (fileId: string) => void;
  onClearStagedFiles?: () => void;
  onSelectSample?: (sample: SampleDocument) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  isProcessing: boolean;
  isDark?: boolean;
  uploadedFiles?: UploadedDataSourceFile[];
  onDeleteUploadedFile?: (fileId: string) => void;
  onNavigateToNewReport?: () => void;
}

export const DataSourceView: React.FC<DataSourceViewProps> = ({
  fileName,
  fileType,
  fileSize,
  customPrompt,
  onCustomPromptChange,
  onFileSelected,
  onClearFile,
  stagedFiles,
  onFilesSelected,
  onRemoveStagedFile,
  onClearStagedFiles,
  onSelectSample,
  onGenerate,
  canGenerate,
  isProcessing,
  uploadedFiles = [],
  onDeleteUploadedFile,
  onNavigateToNewReport,
}) => {
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [persistentFiles, setPersistentFiles] = useState<UploadedDataSourceFile[]>(uploadedFiles);

  // Task 1: Fetch persistent Data Sources from SQLite backend on mount
  useEffect(() => {
    let isMounted = true;
    reportService.getDataSources().then((sources) => {
      if (!isMounted) return;
      if (sources && sources.length > 0) {
        const mapped: UploadedDataSourceFile[] = sources.map((s: any) => ({
          id: s.id || s.file_id,
          name: s.name || s.filename || 'Document',
          filename: s.filename || s.name || 'Document',
          type: s.type || s.file_type || 'application/pdf',
          size: s.size ?? s.sizeBytes ?? s.file_size ?? 0,
          sizeBytes: s.sizeBytes ?? s.size ?? s.file_size ?? 0,
          uploadedAt: s.uploadedAt || s.dateModified || 'Today',
          dateModified: s.dateModified || s.uploadedAt || 'Today',
        }));
        setPersistentFiles(mapped);
      }
    }).catch((err) => {
      console.error('Failed to retrieve persistent data sources in DataSourceView:', err);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      setPersistentFiles(uploadedFiles);
    }
  }, [uploadedFiles]);

  const activeFiles = uploadedFiles && uploadedFiles.length > 0 ? uploadedFiles : persistentFiles;

  const handleDeleteFile = (fileId: string) => {
    setPersistentFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (onDeleteUploadedFile) {
      onDeleteUploadedFile(fileId);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileBadge = (name?: string, type?: string) => {
    const safeName = name || '';
    const safeType = (type || '').toLowerCase();
    const ext = safeName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || safeType.includes('pdf')) {
      return { label: 'PDF', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-900/60' };
    }
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls' || safeType.includes('spreadsheet') || safeType.includes('csv')) {
      return { label: ext === 'csv' ? 'CSV' : 'SHEET', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900/60' };
    }
    if (ext === 'doc' || ext === 'docx' || safeType.includes('word')) {
      return { label: 'DOCX', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-900/60' };
    }
    return { label: ext.toUpperCase() || 'TXT', bg: 'bg-neutral-100 text-neutral-800 dark:bg-blue-950/80 dark:text-blue-300 border-neutral-300 dark:border-blue-900/60' };
  };

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
              <div className="flex items-center gap-2.5">
                <h1 className="font-outfit text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                  Data Source
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  {activeFiles.length} {activeFiles.length === 1 ? 'File' : 'Files'} Ingested
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70 mt-0.5">
                Upload and ingest your documents to synthesize executive intelligence reports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeFiles.length > 0 && onNavigateToNewReport && (
            <button
              type="button"
              onClick={onNavigateToNewReport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Go to New Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Reference Screenshot Button */}
          <button
            type="button"
            onClick={() => setShowScreenshotModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-neutral-700 dark:text-blue-300 border border-neutral-200 dark:border-blue-900/60 transition-all cursor-pointer shadow-2xs"
            title="View reference screenshot"
          >
            <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Architecture</span>
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
          stagedFiles={stagedFiles}
          onFilesSelected={onFilesSelected}
          onRemoveStagedFile={onRemoveStagedFile}
          onClearStagedFiles={onClearStagedFiles}
          onSelectSample={onSelectSample}
          onGenerate={onGenerate}
          canGenerate={canGenerate}
          isProcessing={isProcessing}
          showAutoPrompt={false}
          showGenerateButton={false}
        />
      </div>

      {/* Data Source Ingested Files List */}
      <div className="w-full p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0b162a] border border-blue-900/20 dark:border-blue-500/20 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-blue-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-outfit text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white">
                Data Source Ingested Files ({activeFiles.length})
              </h3>
              <p className="text-xs text-neutral-500 dark:text-blue-200/70">
                All documents currently active in sovereign storage and available for report synthesis.
              </p>
            </div>
          </div>
        </div>

        {activeFiles.length === 0 ? (
          <div className="p-8 rounded-2xl bg-neutral-50/50 dark:bg-[#070e1c]/40 border border-dashed border-neutral-200 dark:border-blue-900/40 text-center flex flex-col items-center justify-center">
            <FileText className="w-10 h-10 text-neutral-400 dark:text-blue-400/60 mb-2" />
            <p className="font-bold text-sm text-neutral-700 dark:text-neutral-300">
              No files in Data Source yet
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
              Use the upload area above to ingest PDF, CSV, Excel, or DOCX files. They will immediately appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeFiles.map((file) => {
              const fileName = file.name || (file as any).filename || 'Document';
              const fileType = file.type || (file as any).file_type || 'application/pdf';
              const fileSize = file.size ?? (file as any).sizeBytes ?? (file as any).file_size ?? 0;
              const fileDate = file.uploadedAt || (file as any).dateModified || 'Today';
              const badge = getFileBadge(fileName, fileType);
              return (
                <div
                  key={file.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-neutral-200/90 dark:border-blue-900/40 bg-neutral-50/60 dark:bg-[#070e1c]/60 hover:border-blue-400/60 dark:hover:border-blue-700/60 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex-shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate" title={fileName}>
                          {fileName}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-blue-300/70 mt-1">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
                          {formatFileSize(fileSize)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          {fileDate}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ingested
                        </span>
                      </div>
                    </div>
                  </div>

                  {(onDeleteUploadedFile || handleDeleteFile) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={isProcessing}
                      className="self-end sm:self-center p-2 rounded-xl text-neutral-400 hover:text-rose-600 dark:text-neutral-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Remove file from Data Source"
                      aria-label="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
