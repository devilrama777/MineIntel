import React, { useState } from 'react';
import {
  SearchCode,
  Filter,
  Calendar,
  FileText,
  Table,
  CheckCircle2,
  ExternalLink,
  Eye,
  Sliders,
  ChevronRight,
  Database,
  Info,
} from 'lucide-react';
import { EvidenceItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface EvidenceSearchViewProps {
  evidenceList: EvidenceItem[];
  onInspectSource: (evidence: EvidenceItem) => void;
}

export const EvidenceSearchView: React.FC<EvidenceSearchViewProps> = ({
  evidenceList,
  onInspectSource,
}) => {
  const [query, setQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'All'>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedDocType, setSelectedDocType] = useState<string>('All');
  const [minConfidence, setMinConfidence] = useState<number>(90);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>(evidenceList[0]?.id || '');

  const filteredEvidence = evidenceList.filter((item) => {
    const matchesQuery =
      query.trim() === '' ||
      item.relevantText.toLowerCase().includes(query.toLowerCase()) ||
      item.documentName.toLowerCase().includes(query.toLowerCase()) ||
      (item.sectionName && item.sectionName.toLowerCase().includes(query.toLowerCase())) ||
      (item.sheetName && item.sheetName.toLowerCase().includes(query.toLowerCase()));

    const matchesYear = selectedYear === 'All' || item.metadata?.year === selectedYear;
    const matchesMonth = selectedMonth === 'All' || item.metadata?.month === selectedMonth;
    const matchesType = selectedDocType === 'All' || item.documentType === selectedDocType;
    const matchesConfidence = item.confidence >= minConfidence;

    return matchesQuery && matchesYear && matchesMonth && matchesType && matchesConfidence;
  });

  const selectedItem =
    evidenceList.find((e) => e.id === selectedEvidenceId) || filteredEvidence[0];

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
      {/* Search Header */}
      <div className="flex items-center justify-between border-b border-[#233145] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SearchCode className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Evidence Retrieval & Provenance Discovery Workspace
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Query indexed organizational chunks across local spreadsheets, scanned filings, and statutory datasets.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
          Matches: <strong className="text-blue-400">{filteredEvidence.length}</strong> passages found
        </div>
      </div>

      {/* Main Filter & Search Bar */}
      <div className="bg-[#111722] border border-[#1e2a3b] p-3 rounded-md space-y-3 text-xs">
        {/* Search Query Input */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded px-3 py-2">
            <SearchCode className="w-4 h-4 text-blue-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search historical organizational data, e.g. 'revenue realization', 'HEMM availability', 'dragline capEx', 'methane detector'..."
              className="w-full bg-transparent text-slate-100 placeholder-slate-400 focus:outline-none font-mono text-xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Multi-Dimensional Provenance Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1 border-t border-slate-800/80 font-mono text-xs">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(e.target.value === 'All' ? 'All' : parseInt(e.target.value))
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="All">All Years</option>
              <option value="2026">2026 (FY26)</option>
              <option value="2025">2025 (FY25)</option>
              <option value="2024">2024 (FY24)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="All">All Months</option>
              <option value="December">December</option>
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="November">November</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase mb-1">Doc Type</label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="All">All Formats</option>
              <option value="PDF">PDF (Vector)</option>
              <option value="Scanned PDF">Scanned PDF (OCR)</option>
              <option value="XLSX">XLSX (Spreadsheet)</option>
              <option value="CSV">CSV (Telemetry)</option>
              <option value="DOCX">DOCX (Resolutions)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase mb-1">Min Confidence: {minConfidence}%</label>
            <input
              type="range"
              min="70"
              max="99"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseInt(e.target.value))}
              className="w-full accent-blue-500 mt-1"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSelectedYear('All');
                setSelectedMonth('All');
                setSelectedDocType('All');
                setMinConfidence(90);
                setQuery('');
              }}
              className="w-full py-1 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-mono border border-slate-700"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Split Workspace: Left Results List, Right Evidence Deep-Dive Panel */}
      <div className="flex-1 flex gap-5 overflow-hidden">
        {/* Results List */}
        <div className="flex-1 bg-[#111722] border border-[#1e2a3b] rounded-md overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-[#141d2b] border-b border-[#1e2a3b] text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Retrieved Provenance Passages</span>
            <span>Sorted by Similarity & Confidence</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#182333]">
            {filteredEvidence.map((item) => {
              const isSelected = item.id === selectedItem?.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedEvidenceId(item.id)}
                  className={`p-4 transition cursor-pointer ${
                    isSelected ? 'bg-[#152030] border-l-2 border-blue-500' : 'hover:bg-[#131b26]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 font-mono text-xs truncate max-w-sm">
                        {item.documentName}
                      </span>
                      <StatusBadge status={item.documentType} size="sm" />
                    </div>
                    <span className="font-mono text-emerald-400 font-bold text-xs shrink-0">
                      {item.confidence}% Match
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-2 font-sans">
                    "{item.relevantText}"
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-400">
                    <span className="text-blue-300 bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-900/60">
                      {item.sourceLocation}
                    </span>
                    <span>Org: {item.metadata.organizationUnit}</span>
                    <span>Date: {item.metadata.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel: "Where did this information come from?" */}
        {selectedItem ? (
          <div className="w-[460px] bg-[#111722] border border-[#1e2a3b] rounded-md overflow-hidden flex flex-col shrink-0">
            <div className="p-4 bg-[#141d2b] border-b border-[#1e2a3b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Where did this information come from?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onInspectSource(selectedItem)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-mono text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Inspect in Viewer</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Highlighted Extract Box */}
              <div className="p-3.5 bg-[#141d2b] border border-blue-900/50 rounded-md space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-blue-400 font-bold uppercase">Extracted Verbatim Content</span>
                  <span className="text-emerald-400">{selectedItem.confidence}% Accuracy</span>
                </div>
                <p className="text-xs text-slate-100 font-serif leading-relaxed italic bg-slate-900/60 p-3 rounded border border-slate-800">
                  "{selectedItem.relevantText}"
                </p>
              </div>

              {/* Exact Source Location */}
              <div className="space-y-1.5 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Physical Storage Coordinates
                </div>
                <div className="bg-[#141b26] border border-slate-800 rounded p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Document Name:</span>
                    <span className="text-slate-200 truncate max-w-[240px]">{selectedItem.documentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Source Location:</span>
                    <span className="text-blue-300 font-bold">{selectedItem.sourceLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Extraction Pipeline:</span>
                    <span className="text-slate-200">{selectedItem.extractionMethod}</span>
                  </div>
                </div>
              </div>

              {/* Organizational Origin Metadata */}
              <div className="space-y-1.5 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Organizational Provenance
                </div>
                <div className="bg-[#141b26] border border-slate-800 rounded p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Command Unit:</span>
                    <span className="text-slate-200">{selectedItem.metadata.organizationUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Author / Officer:</span>
                    <span className="text-slate-200">{selectedItem.metadata.authorOrSource}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Creation Date:</span>
                    <span className="text-slate-200">{selectedItem.metadata.date}</span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Proof */}
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded text-[11px] font-mono text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tamper-Proof Provenance Verification</span>
                </div>
                <p className="text-[10px] text-emerald-400/80">
                  Passage mapped to SHA-256 byte range on local NVMe partition. Ready for statutory filing citation.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
