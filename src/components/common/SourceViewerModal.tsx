import React, { useState } from 'react';
import {
  X,
  FileText,
  Table,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Copy,
  Check,
  Search,
  ExternalLink,
  BarChart3,
  Terminal,
} from 'lucide-react';
import { EvidenceItem } from '../../types';
import { StatusBadge } from './StatusBadge';

interface SourceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence?: EvidenceItem | null;
  documentName?: string;
  sourcePath?: string;
  pageOrSheet?: string;
  highlightBbox?: { x: number; y: number; width: number; height: number };
  cellRange?: string;
  rawSnippet?: string;
}

export const SourceViewerModal: React.FC<SourceViewerModalProps> = ({
  isOpen,
  onClose,
  evidence: initialEvidence,
  documentName,
  sourcePath,
  pageOrSheet,
  highlightBbox,
  cellRange,
  rawSnippet,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [copied, setCopied] = useState(false);

  const effectiveEvidence: EvidenceItem | null = initialEvidence || (documentName ? {
    id: 'ev-modal-preview',
    documentId: 'doc-preview',
    documentName: documentName || 'Document Preview',
    documentType: (sourcePath?.endsWith('.xlsx') || sourcePath?.endsWith('.csv') ? 'XLSX' : 'PDF') as any,
    sourceLocation: pageOrSheet || 'Page 1',
    extractionMethod: 'Native Parser',
    confidence: 98,
    relevantText: rawSnippet || 'No snippet preview available.',
    metadata: {
      year: new Date().getFullYear(),
      organizationUnit: 'Central Coalfields Limited',
      date: new Date().toISOString().slice(0, 10),
      authorOrSource: sourcePath || 'Local Archive',
    },
    bbox: highlightBbox,
    spreadsheetName: cellRange ? pageOrSheet : undefined,
    cellRange: cellRange,
  } : null);

  if (!isOpen || !effectiveEvidence) return null;
  const evidence = effectiveEvidence;

  const isSpreadsheet =
    evidence.documentType === 'XLSX' ||
    evidence.documentType === 'CSV' ||
    Boolean(evidence.spreadsheetName);

  const handleCopyText = () => {
    navigator.clipboard.writeText(evidence.relevantText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-6">
      <div className="w-full max-w-5xl h-[85vh] bg-[#121824] border border-slate-700/90 rounded shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0d131d]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-400">
              {isSpreadsheet ? <Table className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-100 font-mono truncate max-w-md">
                  {evidence.documentName}
                </span>
                <StatusBadge status={evidence.documentType} size="sm" />
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                  {evidence.confidence}% CONFIDENCE
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Provenance: {evidence.sourceLocation} • Method: {evidence.extractionMethod}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Passage'}</span>
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body: Split between Inspector and Metadata Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Visual Source Canvas */}
          <div className="flex-1 flex flex-col bg-[#0b0f17] border-r border-slate-800 overflow-hidden">
            {/* Viewer Controls */}
            <div className="px-4 py-2 bg-[#0f1420] border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-mono text-[11px] text-slate-400">Target Region:</span>
                <span className="font-mono text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/60">
                  {isSpreadsheet
                    ? `Sheet [${evidence.sheetName || 'Summary'}] • Range [${evidence.cellRange || 'G27:G31'}]`
                    : `Page ${evidence.page || 1} • Bounding Box [45, 310, 520, 140]`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                  className="p-1 text-slate-400 hover:text-slate-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] text-slate-400 w-12 text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                  className="p-1 text-slate-400 hover:text-slate-200"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Simulated Document / Spreadsheet Canvas */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
              {(() => {
                const docName = (evidence.documentName || '').toLowerCase();
                const isBorehole = docName.includes('borehole') || docName.includes('drill') || (isSpreadsheet && !docName.includes('financial'));
                const isMiningChart = docName.includes('chart') || docName.endsWith('.png') || docName.endsWith('.jpg');
                const isLabAssay = docName.includes('laboratory') || docName.includes('quality') || docName.includes('assay');
                const isFieldNotes = docName.includes('field') || docName.includes('observation') || docName.includes('notes');
                const isReadme = docName.includes('readme') || docName.endsWith('.txt');

                if (isBorehole) {
                  return (
                    <div
                      className="bg-[#141c2b] border border-slate-700 rounded shadow-2xl overflow-hidden transition-all duration-200 max-w-4xl w-full"
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                    >
                      <div className="px-4 py-2.5 bg-[#101724] border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-200 font-semibold flex items-center gap-2">
                          <Table className="w-3.5 h-3.5 text-blue-400" />
                          Dataset: {evidence.documentName} &gt; Core_Lithology_Assay
                        </span>
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Intercept active on: {evidence.cellRange || 'C12:G18'}
                        </span>
                      </div>
                      <table className="w-full text-xs font-mono border-collapse">
                        <thead>
                          <tr className="bg-[#1a2333] text-slate-400 border-b border-slate-700">
                            <th className="px-3 py-2 border-r border-slate-700 text-center">#</th>
                            <th className="px-3 py-2 border-r border-slate-700 text-left">Borehole ID</th>
                            <th className="px-3 py-2 border-r border-slate-700 text-left">Target Seam</th>
                            <th className="px-3 py-2 border-r border-slate-700 text-right">From (m)</th>
                            <th className="px-3 py-2 border-r border-slate-700 text-right">To (m)</th>
                            <th className="px-3 py-2 border-r border-slate-700 text-right">Thickness (m)</th>
                            <th className="px-3 py-2 border-r border-slate-700 text-right">Ash (%)</th>
                            <th className="px-3 py-2 border-r border-slate-700 text-right">Moisture (%)</th>
                            <th className="px-4 py-2 text-right bg-blue-950/60 text-blue-200 border-l border-blue-700">
                              GCV (kcal/kg)
                            </th>
                            <th className="px-3 py-2 text-center">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          <tr className="hover:bg-slate-800/40 text-slate-300">
                            <td className="px-3 py-2 border-r border-slate-800 text-center text-slate-400 bg-slate-900/40">1</td>
                            <td className="px-3 py-2 border-r border-slate-800 font-semibold text-white">BH-2026-01</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-amber-300">Seam I</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">28.4</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">33.6</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right font-semibold">5.2</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">22.1%</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">5.4%</td>
                            <td className="px-4 py-2 text-right font-semibold bg-blue-950/80 text-blue-300 border-l-2 border-blue-500">5,680</td>
                            <td className="px-3 py-2 text-center text-emerald-400">G7</td>
                          </tr>
                          <tr className="hover:bg-slate-800/40 text-slate-300">
                            <td className="px-3 py-2 border-r border-slate-800 text-center text-slate-400 bg-slate-900/40">2</td>
                            <td className="px-3 py-2 border-r border-slate-800 font-semibold text-white">BH-2026-02</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-amber-300">Seam I</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">31.0</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">36.8</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right font-semibold">5.8</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">21.4%</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">5.2%</td>
                            <td className="px-4 py-2 text-right font-semibold bg-blue-950/80 text-blue-300 border-l-2 border-blue-500">5,740</td>
                            <td className="px-3 py-2 text-center text-emerald-400">G7</td>
                          </tr>
                          <tr className="hover:bg-slate-800/40 text-slate-300 bg-blue-950/30">
                            <td className="px-3 py-2 border-r border-slate-800 text-center text-slate-400 bg-slate-900/40">3</td>
                            <td className="px-3 py-2 border-r border-slate-800 font-semibold text-blue-300">BH-2026-04</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-emerald-300 font-bold">Seam II (Prime)</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right font-bold text-white">45.2</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right font-bold text-white">54.8</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right font-bold text-emerald-400">9.6</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right font-bold text-emerald-300">18.4%</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">4.8%</td>
                            <td className="px-4 py-2 text-right font-bold bg-blue-900/80 text-white border-l-2 border-blue-400">6,120</td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-300 bg-emerald-950/60 rounded">G4</td>
                          </tr>
                          <tr className="hover:bg-slate-800/40 text-slate-300">
                            <td className="px-3 py-2 border-r border-slate-800 text-center text-slate-400 bg-slate-900/40">4</td>
                            <td className="px-3 py-2 border-r border-slate-800 font-semibold text-white">BH-2026-05</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-amber-300">Seam III</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">78.5</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">84.1</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right font-semibold">5.6</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">26.8%</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">6.1%</td>
                            <td className="px-4 py-2 text-right font-semibold bg-blue-950/80 text-blue-300 border-l-2 border-blue-500">5,150</td>
                            <td className="px-3 py-2 text-center text-amber-400">G9</td>
                          </tr>
                          <tr className="bg-blue-950/40 text-slate-100 font-bold border-t-2 border-blue-500">
                            <td className="px-3 py-2 border-r border-slate-800 text-center text-slate-400 bg-slate-900/40">Σ</td>
                            <td className="px-3 py-2 border-r border-slate-800">CUMULATIVE</td>
                            <td className="px-3 py-2 border-r border-slate-800">All Seams</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">28.4</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">84.1</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right text-emerald-400 font-bold">26.2 m</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">22.2%</td>
                            <td className="px-3 py-2 border-r border-slate-800 text-right">5.4%</td>
                            <td className="px-4 py-2 text-right text-emerald-400 bg-emerald-950/40 border-2 border-emerald-500 font-bold">5,672</td>
                            <td className="px-3 py-2 text-center text-emerald-300">Proved</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="px-4 py-2 bg-[#0e141f] text-[11px] font-mono text-slate-400 border-t border-slate-800 flex justify-between">
                        <span>Parser: Native CSV Lattice • Precision: 0.01m • Total Cores Logged: 120m</span>
                        <span className="text-blue-300">Verified by Competent Person</span>
                      </div>
                    </div>
                  );
                }

                if (isMiningChart) {
                  return (
                    <div
                      className="bg-[#0f1522] border border-slate-700 rounded-lg p-6 shadow-2xl max-w-3xl w-full text-slate-200 transition-all duration-200"
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                        <div>
                          <div className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-400" />
                            FIGURE 1.1: MINE PRODUCTION & STRIPPING RATIO TELEMETRY
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Target vs Actual Dispatch Off-take (Q4 FY26 Monthly Aggregate)
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/60 border border-blue-800/60 text-blue-300">
                          Raster Asset • 2400 × 1200 px (300 DPI)
                        </span>
                      </div>

                      {/* SVG Visual Mining Chart */}
                      <div className="bg-[#090d16] p-4 rounded border border-slate-800 relative">
                        <svg viewBox="0 0 650 260" className="w-full h-64 overflow-visible">
                          {/* Grid Lines */}
                          <line x1="60" y1="30" x2="620" y2="30" stroke="#1f293d" strokeDasharray="4 4" />
                          <line x1="60" y1="80" x2="620" y2="80" stroke="#1f293d" strokeDasharray="4 4" />
                          <line x1="60" y1="130" x2="620" y2="130" stroke="#1f293d" strokeDasharray="4 4" />
                          <line x1="60" y1="180" x2="620" y2="180" stroke="#1f293d" strokeDasharray="4 4" />
                          <line x1="60" y1="220" x2="620" y2="220" stroke="#334155" strokeWidth="2" />

                          {/* Y-Axis Labels */}
                          <text x="50" y="35" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">300k</text>
                          <text x="50" y="85" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">225k</text>
                          <text x="50" y="135" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">150k</text>
                          <text x="50" y="185" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">75k</text>
                          <text x="50" y="224" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">0 MT</text>

                          {/* Bars (ROM Coal MT) */}
                          <rect x="110" y="70" width="55" height="150" fill="#2563eb" rx="3" opacity="0.85" />
                          <rect x="230" y="62" width="55" height="158" fill="#2563eb" rx="3" opacity="0.85" />
                          <rect x="350" y="55" width="55" height="165" fill="#2563eb" rx="3" opacity="0.85" />
                          <rect x="470" y="48" width="55" height="172" fill="#3b82f6" rx="3" />

                          {/* Stripping Ratio Curve */}
                          <path
                            d="M 137 110 Q 257 100 377 92 T 497 82"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                          />
                          <circle cx="137" cy="110" r="5" fill="#10b981" />
                          <circle cx="257" cy="100" r="5" fill="#10b981" />
                          <circle cx="377" cy="92" r="5" fill="#10b981" />
                          <circle cx="497" cy="82" r="5" fill="#34d399" stroke="#fff" strokeWidth="2" />

                          {/* Callout Marker */}
                          <rect x="440" y="20" width="115" height="40" rx="4" fill="#1e293b" stroke="#3b82f6" />
                          <text x="497" y="36" fill="#93c5fd" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                            245,000 MT/mo
                          </text>
                          <text x="497" y="50" fill="#34d399" fontSize="9" fontFamily="monospace" textAnchor="middle">
                            SR: 2.78 m3/MT
                          </text>

                          {/* X-Axis Labels */}
                          <text x="137" y="240" fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">Dec '25</text>
                          <text x="257" y="240" fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">Jan '26</text>
                          <text x="377" y="240" fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">Feb '26</text>
                          <text x="497" y="240" fill="#60a5fa" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">Mar '26 (Actual)</text>
                        </svg>

                        {/* Chart Legend */}
                        <div className="flex items-center justify-center gap-6 mt-3 text-xs font-mono">
                          <span className="flex items-center gap-1.5 text-blue-300">
                            <span className="w-3 h-3 bg-blue-500 rounded-xs inline-block" />
                            ROM Coal Production (MT/mo)
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-300">
                            <span className="w-3 h-1 bg-emerald-400 inline-block" />
                            Stripping Ratio (m3/MT)
                          </span>
                        </div>
                      </div>

                      {/* OCR & Telemetry Box */}
                      <div className="mt-4 p-3 bg-[#131b27] border border-slate-800 rounded font-mono text-[11px] space-y-1">
                        <div className="text-slate-400">OCR Extracted Caption & Bounds:</div>
                        <div className="text-blue-300">"{evidence.relevantText}"</div>
                      </div>
                    </div>
                  );
                }

                if (isLabAssay) {
                  return (
                    <div
                      className="w-[560px] min-h-[660px] bg-slate-50 text-slate-900 p-8 shadow-2xl rounded border border-slate-300 relative transition-all duration-200"
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                    >
                      <div className="border-b-2 border-slate-800 pb-3 mb-4 flex justify-between items-start">
                        <div>
                          <div className="text-xs font-bold text-blue-900 font-mono tracking-wider">
                            CENTRAL TESTING LABORATORY • NABL ACCREDITED
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono">
                            Certificate of Analysis # CTL/2026/0488 • IS 1350 (Part I-IV)
                          </div>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                          NABL ACCREDITED LAB
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mb-1 font-mono">
                        PROXIMATE & ULTIMATE COAL QUALITY ASSAY REPORT
                      </h3>
                      <div className="text-[10px] text-slate-600 font-mono mb-4">
                        Block: ML-492 • Composite Sample: BH-2026 Core Suite • Tested: March 4, 2026
                      </div>

                      {/* Proximate Table */}
                      <table className="w-full text-[11px] font-mono border border-slate-300 border-collapse mb-4">
                        <thead>
                          <tr className="bg-slate-200 text-slate-800 border-b border-slate-300 font-bold">
                            <th className="p-2 text-left border-r border-slate-300">Analysis Parameter</th>
                            <th className="p-2 text-right border-r border-slate-300">Measured Value</th>
                            <th className="p-2 text-left border-r border-slate-300">Standard Test Method</th>
                            <th className="p-2 text-center">Grade / Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="p-1.5 border-r border-slate-300 font-medium">Total Moisture</td>
                            <td className="p-1.5 border-r border-slate-300 text-right font-bold">6.8%</td>
                            <td className="p-1.5 border-r border-slate-300">IS 1350 (Part I)</td>
                            <td className="p-1.5 text-center text-emerald-700 font-bold">Pass (&lt; 10%)</td>
                          </tr>
                          <tr className="bg-blue-50/50">
                            <td className="p-1.5 border-r border-slate-300 font-medium">Ash Content (air-dried)</td>
                            <td className="p-1.5 border-r border-slate-300 text-right font-bold text-blue-900">24.2%</td>
                            <td className="p-1.5 border-r border-slate-300">IS 1350 (Part I)</td>
                            <td className="p-1.5 text-center text-blue-800 font-bold">Grade G8 Range</td>
                          </tr>
                          <tr>
                            <td className="p-1.5 border-r border-slate-300 font-medium">Volatile Matter</td>
                            <td className="p-1.5 border-r border-slate-300 text-right font-bold">28.5%</td>
                            <td className="p-1.5 border-r border-slate-300">IS 1350 (Part I)</td>
                            <td className="p-1.5 text-center text-emerald-700">Pass (25-32%)</td>
                          </tr>
                          <tr>
                            <td className="p-1.5 border-r border-slate-300 font-medium">Fixed Carbon</td>
                            <td className="p-1.5 border-r border-slate-300 text-right font-bold">40.5%</td>
                            <td className="p-1.5 border-r border-slate-300">By difference</td>
                            <td className="p-1.5 text-center text-emerald-700">Pass (&gt; 38%)</td>
                          </tr>
                          <tr className="bg-emerald-50">
                            <td className="p-1.5 border-r border-slate-300 font-bold text-slate-900">Gross Calorific Value (GCV)</td>
                            <td className="p-1.5 border-r border-slate-300 text-right font-bold text-emerald-800 text-xs">5,420 kcal/kg</td>
                            <td className="p-1.5 border-r border-slate-300">Bomb Calorimeter</td>
                            <td className="p-1.5 text-center font-bold text-emerald-800">Grade G8 Verified</td>
                          </tr>
                          <tr>
                            <td className="p-1.5 border-r border-slate-300 font-medium">Total Sulfur</td>
                            <td className="p-1.5 border-r border-slate-300 text-right font-bold">0.48%</td>
                            <td className="p-1.5 border-r border-slate-300">Eschka Method</td>
                            <td className="p-1.5 text-center text-emerald-700">Low Sulfur (&lt; 0.8%)</td>
                          </tr>
                          <tr>
                            <td className="p-1.5 border-r border-slate-300 font-medium">Ash Fusion Temp (IDT)</td>
                            <td className="p-1.5 border-r border-slate-300 text-right font-bold">1,380°C</td>
                            <td className="p-1.5 border-r border-slate-300">IS 1350 (Part II)</td>
                            <td className="p-1.5 text-center text-emerald-700">High Refractory</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Highlighted Bounding Box */}
                      <div className="p-3 bg-blue-100/90 border-2 border-blue-600 rounded relative my-3">
                        <div className="absolute -top-2.5 left-2 bg-blue-600 text-white font-mono text-[9px] px-1.5 py-0.2 rounded font-bold">
                          EXTRACTED PASSAGE [CONFIDENCE: {evidence.confidence}%]
                        </div>
                        <p className="text-[11px] text-blue-950 font-medium leading-relaxed">
                          "{evidence.relevantText}"
                        </p>
                      </div>

                      <div className="absolute bottom-6 left-8 right-8 border-t border-slate-300 pt-2 flex justify-between text-[9px] font-mono text-slate-500">
                        <span>CERTIFICATION REF: CTL/2026/0488</span>
                        <span>OFFICIALLY SEALED & VERIFIED</span>
                      </div>
                    </div>
                  );
                }

                if (isFieldNotes) {
                  return (
                    <div
                      className="w-[560px] min-h-[640px] bg-amber-50/40 text-slate-900 p-8 shadow-2xl rounded border border-amber-200 relative transition-all duration-200"
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                    >
                      <div className="border-b-2 border-amber-800/30 pb-3 mb-4 flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-950 font-mono tracking-widest uppercase">
                          FIELD GEOTECHNICAL & STRUCTURAL OBSERVATION NOTEBOOK
                        </span>
                        <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          Docx Document
                        </span>
                      </div>

                      <div className="space-y-3 font-mono text-xs">
                        <div className="p-3 bg-white/80 rounded border border-amber-200/80 space-y-1">
                          <div className="font-bold text-slate-800">Inspection Station: Pit Highwall Bench #4 (RL 42m)</div>
                          <div className="text-slate-600 text-[11px]">Inspecting Geologist: Sr. Geotechnical Specialist • Date: March 5, 2026</div>
                        </div>

                        <div className="p-3 bg-white/80 rounded border border-amber-200/80 space-y-2 text-[11px] text-slate-700 leading-relaxed">
                          <div>
                            <strong className="text-slate-900">1. Strata & Rock Competence:</strong> Sandstone overburden is massive and competent with average joint spacing of 0.8m to 1.2m. Rock Mass Rating (RMR) evaluated at 68 (Class II, Good Rock).
                          </div>
                          <div>
                            <strong className="text-slate-900">2. Hydrogeology & Ingress:</strong> Minor localized groundwater dampness at 42m RL elevation. No active high-volume water seepage observed.
                          </div>
                          <div>
                            <strong className="text-slate-900">3. Slope Stability Analysis:</strong> Calculated Factor of Safety (FoS) is 1.42 under dry condition and 1.31 under hydrostatic saturation, fully complying with DGMS Circular 02 guidelines.
                          </div>
                        </div>

                        {/* Extracted Passage */}
                        <div className="p-3 bg-blue-100/90 border-2 border-blue-600 rounded relative my-3">
                          <div className="absolute -top-2.5 left-2 bg-blue-600 text-white font-mono text-[9px] px-1.5 py-0.2 rounded font-bold">
                            EXTRACTED PASSAGE [CONFIDENCE: {evidence.confidence}%]
                          </div>
                          <p className="text-[11px] text-blue-950 font-medium leading-relaxed">
                            "{evidence.relevantText}"
                          </p>
                        </div>
                      </div>

                      <div className="absolute bottom-6 left-8 right-8 border-t border-amber-300 pt-2 flex justify-between text-[9px] font-mono text-slate-500">
                        <span>FIELD NOTE ID: FN-2026-03</span>
                        <span>GEOTECHNICAL SIGN-OFF COMPLETE</span>
                      </div>
                    </div>
                  );
                }

                if (isReadme) {
                  return (
                    <div
                      className="w-[580px] min-h-[480px] bg-[#090d14] text-slate-200 p-6 shadow-2xl rounded-lg border border-slate-800 font-mono text-xs transition-all duration-200"
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                    >
                      <div className="border-b border-slate-800 pb-2 mb-3 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="text-blue-400 flex items-center gap-1.5 font-bold">
                          <Terminal className="w-3.5 h-3.5" /> {evidence.documentName}
                        </span>
                        <span>ASCII Text / UTF-8</span>
                      </div>

                      <div className="p-4 bg-[#05080e] rounded border border-slate-800/80 space-y-2 text-[11px] leading-relaxed text-slate-300 select-text">
                        <div className="text-emerald-400 font-bold"># MINEINTEL EXPLORATION CORPUS METADATA (BLOCK ML-492)</div>
                        <div>================================================================</div>
                        <div>* Coordinate Datum: WGS84 (UTM Zone 45N)</div>
                        <div>* Grid Boundaries: Northing 2634100m - 2638500m | Easting 432100m - 437400m</div>
                        <div>* Concession Area: 24.8 sq km (Allotted under statutory mineral lease)</div>
                        <div>* Quality Standard: CIL/CMPDI Standard Exploration Guidelines (2024 Rev)</div>
                        <div>* Attached Core Holes: BH-2026-01 through BH-2026-05</div>
                        <div>* Quality Assays: Certified proximate/ultimate composite analysis</div>
                        <div>================================================================</div>
                        <div className="text-blue-300 mt-2">
                          [EXTRACTED SPECIFICATION]: {evidence.relevantText}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-between text-[10px] text-slate-500">
                        <span>SHA-256 Checksum: Verified</span>
                        <span>Local Airgap Ingestion Active</span>
                      </div>
                    </div>
                  );
                }

                // Default Fallback Viewer
                return (
                  <div
                    className="w-[540px] min-h-[600px] bg-slate-100 text-slate-900 p-8 shadow-2xl rounded border border-slate-300 relative transition-all duration-200"
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                  >
                    <div className="border-b border-slate-300 pb-3 mb-4 flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                      <span>{evidence.documentName}</span>
                      <span>PAGE {evidence.page || 1}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mb-2 font-mono">
                      {evidence.sectionName || 'Document Content Preview'}
                    </h3>

                    <div className="p-3 bg-blue-100/90 border-2 border-blue-600 rounded relative shadow-xs my-4">
                      <div className="absolute -top-2.5 left-2 bg-blue-600 text-white font-mono text-[9px] px-1.5 py-0.2 rounded font-bold">
                        EXTRACTED PASSAGE [CONFIDENCE: {evidence.confidence}%]
                      </div>
                      <p className="text-[11px] text-blue-950 font-medium leading-relaxed font-mono">
                        "{evidence.relevantText}"
                      </p>
                    </div>

                    <div className="absolute bottom-6 left-8 right-8 border-t border-slate-300 pt-2 flex justify-between text-[9px] font-mono text-slate-400">
                      <span>VERIFICATION ID: {evidence.id}</span>
                      <span>PARSED BY LOCAL INFERENCE ENGINE</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Sidebar: Evidence Provenance & Audit Info */}
          <div className="w-80 bg-[#101520] flex flex-col overflow-y-auto p-4 space-y-4 text-xs">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                Document Metadata
              </div>
              <div className="bg-[#141b26] border border-slate-800 rounded p-3 space-y-2 font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">Filename</div>
                  <div className="text-slate-200 truncate">{evidence.documentName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Org Unit</div>
                  <div className="text-slate-300">{evidence.metadata.organizationUnit}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-slate-400">Record Date</div>
                    <div className="text-slate-300">{evidence.metadata.date}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Year / Period</div>
                    <div className="text-slate-300">{evidence.metadata.year} {evidence.metadata.month || ''}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Author / Source</div>
                  <div className="text-slate-300">{evidence.metadata.authorOrSource}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                Extraction Provenance
              </div>
              <div className="bg-[#141b26] border border-slate-800 rounded p-3 space-y-2 font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">Subprocess Pipeline</div>
                  <div className="text-slate-200">{evidence.extractionMethod}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Confidence Score</div>
                  <div className="text-emerald-400 font-bold">{evidence.confidence}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Source Location String</div>
                  <div className="text-slate-300 break-all">{evidence.sourceLocation}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                Integrity & Compliance
              </div>
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded text-[11px] text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Provenance Cryptographically Verified</span>
                </div>
                <p className="text-[10px] text-emerald-400/80 font-mono">
                  Origin file checksum matches local workspace partition snapshot. Zero cloud telemetry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
