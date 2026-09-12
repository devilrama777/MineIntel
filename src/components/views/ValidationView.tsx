import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Search,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { ValidationIssueItem, ValidationCategory } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface ValidationViewProps {
  issues: ValidationIssueItem[];
  onNavigateToElement: (sectionId: string, blockId?: string) => void;
  onResolveIssue: (issueId: string) => void;
}

export const ValidationView: React.FC<ValidationViewProps> = ({
  issues,
  onNavigateToElement,
  onResolveIssue,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerifyingSuite, setIsVerifyingSuite] = useState(false);

  const categories: (ValidationCategory | 'All')[] = [
    'All',
    'Numerical',
    'Temporal',
    'Source/provenance',
    'Structure',
    'Content',
    'Tables',
    'Images',
    'Links',
    'Layout',
  ];

  const filteredIssues = issues.filter((issue) => {
    const secTitle = issue.sectionTitle || issue.targetSectionTitle || '';
    const matchesCategory =
      selectedCategory === 'All' || issue.category === selectedCategory;
    const matchesSeverity =
      severityFilter === 'All' || issue.severity === severityFilter;
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      secTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSeverity && matchesSearch;
  });

  const highSeverityCount = issues.filter((i) => i.severity === 'high').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const passCount = issues.filter((i) => i.severity === 'pass').length;

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#233145] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Pre-Flight Statutory Quality Assurance & Verification Center
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Multi-pass deterministic arithmetic checks, cross-ledger timeline reconciliation, and citation provenance validation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsVerifyingSuite(true);
              setTimeout(() => setIsVerifyingSuite(false), 900);
            }}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-mono text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>{isVerifyingSuite ? 'Validating Assertions...' : 'Run Full Diagnostic Suite'}</span>
          </button>
        </div>
      </div>

      {/* Severity Metric Strips */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111722] border border-rose-900/50 p-3 rounded-md flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-rose-400 uppercase">High Priority Conflicts</div>
            <div className="text-xl font-bold font-mono text-rose-300">{highSeverityCount}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-rose-400" />
        </div>

        <div className="bg-[#111722] border border-amber-900/50 p-3 rounded-md flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-amber-400 uppercase">Advisory Warnings</div>
            <div className="text-xl font-bold font-mono text-amber-300">{warningCount}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>

        <div className="bg-[#111722] border border-emerald-900/50 p-3 rounded-md flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-emerald-400 uppercase">Passed Verifications</div>
            <div className="text-xl font-bold font-mono text-emerald-300">{passCount}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-[#111722] border border-[#1e2a3b] p-2 rounded-md">
        <span className="text-[11px] font-mono text-slate-400 px-2">Category:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Issues Table */}
      <div className="flex-1 bg-[#111722] border border-[#1e2a3b] rounded-md overflow-hidden flex flex-col">
        <div className="px-4 py-2.5 bg-[#141d2b] border-b border-[#1e2a3b] text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Validation Diagnostic Ledger ({filteredIssues.length} entries)</span>
          <span>Click any issue to navigate directly to document block</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#182333]">
          {filteredIssues.map((issue) => {
            const secId = issue.sectionId || issue.targetSectionId || 'sec-4-1';
            const blkId = issue.blockId || issue.targetBlockId;
            const secTitle = issue.sectionTitle || issue.targetSectionTitle || 'Section 4.1';
            const reco = issue.suggestion || issue.suggestedAction;

            return (
              <div
                key={issue.id}
                onClick={() => onNavigateToElement(secId, blkId)}
                className="p-4 hover:bg-[#141c2a] transition cursor-pointer flex items-start justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={issue.severity} size="sm" />
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-950/40 border border-blue-900/60 px-1.5 py-0.2 rounded">
                      {issue.category}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-100 font-mono">
                      {issue.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {issue.description}
                  </p>

                  {reco && (
                    <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-800/40 p-2 rounded">
                      Recommended Resolution: {reco}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-1">
                    <span>Target Section: <strong className="text-slate-300">{secTitle}</strong></span>
                    {blkId && <span>Block: <strong className="text-blue-400">{blkId}</strong></span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-center">
                  {issue.severity !== 'pass' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolveIssue(issue.id);
                      }}
                      className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded font-mono transition"
                    >
                      Mark Resolved
                    </button>
                  )}
                  <button
                    type="button"
                    className="px-3 py-1 bg-blue-600 group-hover:bg-blue-500 text-white rounded font-mono text-xs font-semibold transition flex items-center gap-1"
                  >
                    <span>Jump to Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
