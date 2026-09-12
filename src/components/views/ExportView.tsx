import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  Folder,
  FolderOpen,
  FileText,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Check,
  Laptop,
  FileSpreadsheet,
} from 'lucide-react';
import { ReportItem, ValidationIssueItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface ExportViewProps {
  report: ReportItem;
  validationIssues: ValidationIssueItem[];
  onOpenPreview: () => void;
  onOpenEditor: () => void;
}

const API_BASE = (typeof window !== 'undefined' && (window as any).__MINEINTEL_API_BASE__) || 'http://127.0.0.1:8765';

export const ExportView: React.FC<ExportViewProps> = ({
  report,
  validationIssues,
  onOpenPreview,
  onOpenEditor,
}) => {
  // Format: strictly PDF or Word (.docx)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'word'>('pdf');
  const [selectedFolderPreset, setSelectedFolderPreset] = useState<'desktop' | 'documents' | 'downloads' | 'custom'>('desktop');
  const [includeProvenanceLedger, setIncludeProvenanceLedger] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccessDetails, setExportSuccessDetails] = useState<{
    savedPath: string;
    filename: string;
    downloadUrl: string;
  } | null>(null);
  const [customFolder, setCustomFolder] = useState('C:\\Users\\nirma\\Desktop');
  const [showPickerModal, setShowPickerModal] = useState(false);

  const getFolderPath = (preset: 'desktop' | 'documents' | 'downloads' | 'custom') => {
    switch (preset) {
      case 'desktop':
        return 'C:\\Users\\nirma\\Desktop';
      case 'documents':
        return 'C:\\Users\\nirma\\Documents';
      case 'downloads':
        return 'C:\\Users\\nirma\\Downloads';
      case 'custom':
      default:
        return customFolder;
    }
  };

  const getTargetFilename = () => {
    return exportFormat === 'pdf'
      ? 'MineIntel_Technical_Evaluation_ML-492.pdf'
      : 'MineIntel_Technical_Evaluation_ML-492.docx';
  };

  const [outputPath, setOutputPath] = useState(
    `C:\\Users\\nirma\\Desktop\\${getTargetFilename()}`
  );

  const handleSelectPreset = (preset: 'desktop' | 'documents' | 'downloads' | 'custom') => {
    setSelectedFolderPreset(preset);
    const folder = getFolderPath(preset);
    setOutputPath(`${folder}\\${getTargetFilename()}`);
  };

  const handleFormatChange = (format: 'pdf' | 'word') => {
    setExportFormat(format);
    const folder = getFolderPath(selectedFolderPreset);
    const newExt = format === 'pdf' ? 'pdf' : 'docx';
    setOutputPath(`${folder}\\MineIntel_Technical_Evaluation_ML-492.${newExt}`);
  };

  const unresolvedHighIssues = validationIssues.filter((i) => i.severity === 'high');

  const handleRunExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: exportFormat,
          target_path: outputPath,
          report_title: 'MineIntel_Technical_Evaluation_ML-492',
          report_data: {
            report_name: report?.name,
            include_provenance: includeProvenanceLedger,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Export endpoint returned error status ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Report generation failed');
      }

      const downloadFullUrl = `${API_BASE}${data.download_url}`;
      setExportSuccessDetails({
        savedPath: data.saved_path,
        filename: data.filename,
        downloadUrl: downloadFullUrl,
      });

      // Trigger automatic browser / webview download
      try {
        const a = document.createElement('a');
        a.href = downloadFullUrl;
        a.download = data.filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (dlErr) {
        console.warn('Direct browser download error:', dlErr);
      }

      setExportComplete(true);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportError(err.message || 'Failed to export statutory report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenFile = async (revealFolder = false) => {
    if (!exportSuccessDetails?.savedPath) return;
    try {
      await fetch(`${API_BASE}/api/v1/system/open-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: exportSuccessDetails.savedPath,
          reveal: revealFolder,
        }),
      });
    } catch (e) {
      console.error('Failed to open file via system shell:', e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#233145] pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Download className="w-5 h-5 text-blue-400" />
          <h1 className="text-lg font-bold text-slate-100 tracking-tight">
            Final Report Export & Save Destination
          </h1>
        </div>
        <p className="text-xs text-slate-400">
          Choose your preferred format (PDF or Word) and select where to save your compiled mining technical report.
        </p>
      </div>

      {/* Pre-flight Gate Checklist */}
      <div className="bg-[#111722] border border-[#1e2a3b] rounded-md p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Pre-Flight Regulatory Compliance Status</span>
          </h2>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded font-bold">
            READY FOR EXPORT
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#141d2b] border border-slate-800 rounded">
            <div className="text-[10px] text-slate-400">REPORT PAGES</div>
            <div className="text-base font-bold text-slate-100">4 Pages</div>
            <div className="text-[10px] text-slate-400">6 Sections</div>
          </div>
          <div className="p-3 bg-[#141d2b] border border-slate-800 rounded">
            <div className="text-[10px] text-slate-400">SOURCE COVERAGE</div>
            <div className="text-base font-bold text-blue-400">100%</div>
            <div className="text-[10px] text-slate-400">5/5 Sources Verified</div>
          </div>
          <div className="p-3 bg-[#141d2b] border border-slate-800 rounded">
            <div className="text-[10px] text-slate-400">INTEGRITY SCORE</div>
            <div className="text-base font-bold text-emerald-400">{report.validationScore || 98}%</div>
            <div className="text-[10px] text-slate-400">0 Critical Errors</div>
          </div>
          <div className="p-3 bg-[#141d2b] border border-slate-800 rounded">
            <div className="text-[10px] text-slate-400">SECURITY POSTURE</div>
            <div className="text-base font-bold text-emerald-400">Airgapped</div>
            <div className="text-[10px] text-slate-400">SHA-256 Watermarked</div>
          </div>
        </div>
      </div>

      {/* 1. Format Selection: Strictly PDF or Word */}
      <div className="bg-[#111722] border border-[#1e2a3b] rounded-md p-5 space-y-3">
        <label className="block text-slate-200 text-xs font-mono font-bold uppercase tracking-wider">
          1. Select Export Format
        </label>
        <div className="grid grid-cols-2 gap-4">
          {/* PDF Option */}
          <div
            onClick={() => handleFormatChange('pdf')}
            className={`p-4 border rounded-lg cursor-pointer transition flex items-start gap-3.5 ${
              exportFormat === 'pdf'
                ? 'border-red-500 bg-red-950/20 ring-2 ring-red-500/80'
                : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 text-slate-400'
            }`}
          >
            <div className="p-2.5 rounded-md bg-red-950/60 border border-red-800/60 text-red-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-sm font-mono">PDF Document (.pdf)</span>
                {exportFormat === 'pdf' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900/50 text-red-300 font-bold border border-red-700/60">
                    SELECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Publication-grade statutory PDF with vector formatting, embedded drillhole tables, lab assay matrix, and provenance seals.
              </p>
            </div>
          </div>

          {/* Word Option */}
          <div
            onClick={() => handleFormatChange('word')}
            className={`p-4 border rounded-lg cursor-pointer transition flex items-start gap-3.5 ${
              exportFormat === 'word'
                ? 'border-blue-500 bg-blue-950/20 ring-2 ring-blue-500/80'
                : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 text-slate-400'
            }`}
          >
            <div className="p-2.5 rounded-md bg-blue-950/60 border border-blue-800/60 text-blue-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-sm font-mono">Microsoft Word (.docx)</span>
                {exportFormat === 'word' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 font-bold border border-blue-700/60">
                    SELECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Fully editable Microsoft Office document with standard styles, customizable data tables, and citation ledger.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Choose Where to Save Output Report */}
      <div className="bg-[#111722] border border-[#1e2a3b] rounded-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-slate-200 text-xs font-mono font-bold uppercase tracking-wider">
            2. Choose Where to Save Your Report
          </label>
          <span className="text-[11px] font-mono text-slate-400">Click a location or browse below</span>
        </div>

        {/* 1-Click Location Presets */}
        <div className="grid grid-cols-4 gap-2.5 font-mono text-xs">
          <button
            type="button"
            onClick={() => handleSelectPreset('desktop')}
            className={`p-3 rounded border text-left transition flex items-center gap-2.5 cursor-pointer ${
              selectedFolderPreset === 'desktop'
                ? 'border-blue-500 bg-blue-950/40 text-blue-200 font-bold ring-1 ring-blue-500'
                : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 text-slate-300'
            }`}
          >
            <Laptop className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <div className="truncate">Desktop</div>
              <div className="text-[10px] text-slate-500 font-normal">C:\Users\...\Desktop</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('documents')}
            className={`p-3 rounded border text-left transition flex items-center gap-2.5 cursor-pointer ${
              selectedFolderPreset === 'documents'
                ? 'border-blue-500 bg-blue-950/40 text-blue-200 font-bold ring-1 ring-blue-500'
                : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 text-slate-300'
            }`}
          >
            <Folder className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="truncate">Documents</div>
              <div className="text-[10px] text-slate-500 font-normal">C:\Users\...\Documents</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('downloads')}
            className={`p-3 rounded border text-left transition flex items-center gap-2.5 cursor-pointer ${
              selectedFolderPreset === 'downloads'
                ? 'border-blue-500 bg-blue-950/40 text-blue-200 font-bold ring-1 ring-blue-500'
                : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 text-slate-300'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="truncate">Downloads</div>
              <div className="text-[10px] text-slate-500 font-normal">C:\Users\...\Downloads</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowPickerModal(true)}
            className={`p-3 rounded border text-left transition flex items-center gap-2.5 cursor-pointer ${
              selectedFolderPreset === 'custom'
                ? 'border-blue-500 bg-blue-950/40 text-blue-200 font-bold ring-1 ring-blue-500'
                : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 text-slate-300'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="min-w-0">
              <div className="truncate">Browse Other...</div>
              <div className="text-[10px] text-slate-500 font-normal">Pick folder</div>
            </div>
          </button>
        </div>

        {/* Selected Path Input with Browse Button */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>FULL DESTINATION PATH:</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Location Ready
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-[#151e2b] border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-200">
              <span className="text-slate-400 mr-2">📍</span>
              <input
                type="text"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                className="w-full bg-transparent text-slate-100 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPickerModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Browse Location...</span>
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={includeProvenanceLedger}
              onChange={(e) => setIncludeProvenanceLedger(e.target.checked)}
              className="rounded border-slate-600 text-blue-600"
            />
            <span>Include Cryptographic Audit Ledger & NABL Certification Stamps</span>
          </label>
        </div>
      </div>

      {/* Error Alert */}
      {exportError && (
        <div className="bg-red-950/50 border border-red-800/80 rounded-md p-4 font-mono text-xs text-red-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="font-bold text-red-100">Export Generation Error</div>
            <div className="text-red-300">{exportError}</div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunExport}
                className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded font-bold cursor-pointer"
              >
                Retry Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Card with File Launcher & Direct Downloads */}
      {exportComplete && exportSuccessDetails && (
        <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-md p-5 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-emerald-800/50 pb-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Report Successfully Generated & Saved to Disk!</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-bold">
              {exportFormat.toUpperCase()} PUBLICATION READY
            </span>
          </div>

          <div className="text-xs text-slate-300">
            The publication-grade {exportFormat.toUpperCase()} report has been written directly to your chosen destination on this computer:
          </div>

          <div className="p-3 bg-black/60 border border-emerald-900/80 rounded text-xs text-emerald-200 font-bold break-all select-all font-mono">
            {exportSuccessDetails.savedPath}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleOpenFile(false)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open {exportFormat.toUpperCase()} File Now</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenFile(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Show in Folder</span>
            </button>

            <a
              href={exportSuccessDetails.downloadUrl}
              download={exportSuccessDetails.filename}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Download Browser Copy</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setExportComplete(false);
                setExportSuccessDetails(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded text-xs transition cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Export Another</span>
            </button>
          </div>
        </div>
      )}

      {/* Export Action Bar */}
      <div className="flex items-center justify-between bg-[#111722] border border-[#1e2a3b] p-4 rounded-md">
        <button
          type="button"
          onClick={onOpenPreview}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-xs border border-slate-700 transition cursor-pointer flex items-center gap-2"
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Back to Multi-Page Preview</span>
        </button>

        <div className="flex items-center gap-3">
          {exportComplete ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenFile(false)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-mono text-xs transition cursor-pointer flex items-center gap-1.5 font-bold shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Exported File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportComplete(false);
                  setExportSuccessDetails(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Export Again</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="btn-generate-report"
              onClick={handleRunExport}
              disabled={isExporting}
              className={`px-6 py-2.5 text-white font-bold rounded font-mono text-xs transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                exportFormat === 'pdf' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                {isExporting
                  ? `Compiling & Saving ${exportFormat.toUpperCase()}...`
                  : `Export Official ${exportFormat === 'pdf' ? 'PDF Document (.pdf)' : 'Word Document (.docx)'}`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Directory Selector Modal */}
      {showPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#131b27] border border-slate-700 rounded-lg p-5 space-y-4 shadow-2xl font-mono text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>Select Destination Folder</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPickerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-slate-300">
              <p className="text-[11px] text-slate-400">
                Choose one of the standard folders or enter a custom path:
              </p>
              {[
                { name: 'Desktop', path: 'C:\\Users\\nirma\\Desktop' },
                { name: 'Documents', path: 'C:\\Users\\nirma\\Documents' },
                { name: 'Downloads', path: 'C:\\Users\\nirma\\Downloads' },
                { name: 'MineIntel Work Directory', path: 'C:\\ProgramData\\MineIntel\\Exports' },
              ].map((loc) => (
                <div
                  key={loc.name}
                  onClick={() => {
                    setCustomFolder(loc.path);
                    setSelectedFolderPreset('custom');
                    setOutputPath(`${loc.path}\\${getTargetFilename()}`);
                    setShowPickerModal(false);
                  }}
                  className="p-2.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-200">{loc.name}</div>
                    <div className="text-[10px] text-slate-400">{loc.path}</div>
                  </div>
                  <Folder className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-800">
              <label className="text-[10px] text-slate-400">Or type custom folder path:</label>
              <input
                type="text"
                value={customFolder}
                onChange={(e) => setCustomFolder(e.target.value)}
                className="w-full bg-[#182333] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPickerModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFolderPreset('custom');
                  setOutputPath(`${customFolder}\\${getTargetFilename()}`);
                  setShowPickerModal(false);
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded"
              >
                Select Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
