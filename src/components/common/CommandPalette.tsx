import React, { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  FolderArchive,
  ShieldCheck,
  Cpu,
  ArrowRight,
  X,
  FilePlus,
  GitFork,
  CheckCircle2,
} from 'lucide-react';
import { AppView, DataSourceItem, ReportItem } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  reports: ReportItem[];
  dataSources: DataSourceItem[];
  onSelectReport?: (reportId: string) => void;
  onSelectDataSource?: (doc: DataSourceItem) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  reports,
  dataSources,
  onSelectReport,
  onSelectDataSource,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle or open
        if (isOpen) onClose();
        else {
          // Open handled by parent, but if already mounted
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allCommands: Array<{ id: AppView; label: string; icon: any; category: string }> = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: ArrowRight, category: 'Navigation' },
    { id: 'new-report', label: 'Create New Report (Wizard)', icon: FilePlus, category: 'Actions' },
    { id: 'evidence-search', label: 'Open Evidence Search Workspace', icon: Search, category: 'Navigation' },
    { id: 'report-editor', label: 'Open Active Report Editor', icon: FileText, category: 'Navigation' },
    { id: 'report-planner', label: 'Inspect Report Structure Plan', icon: GitFork, category: 'Navigation' },
    { id: 'validation', label: 'Run Full Validation Audit', icon: CheckCircle2, category: 'Actions' },
    { id: 'data-sources', label: 'Manage Local Data Repositories', icon: FolderArchive, category: 'Navigation' },
    { id: 'processing-jobs', label: 'Inspect Background OCR/Embedding Jobs', icon: Cpu, category: 'Navigation' },
    { id: 'security-audit', label: 'Review Tamper-Proof Audit Log', icon: ShieldCheck, category: 'Security' },
  ];

  const filteredViews = allCommands.filter((v) => v.label.toLowerCase().includes(query.toLowerCase()));

  const matchedDocs = dataSources
    .filter((d) => d.filename.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 4);

  const matchedReports = reports
    .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-[#141b26] border border-slate-700/80 rounded-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-[#0f1520]">
          <Search className="w-4 h-4 text-blue-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, document name, or section keyword..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3 text-xs">
          {/* Quick Actions */}
          <div>
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              System Operations
            </div>
            <div className="space-y-0.5">
              {filteredViews.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-blue-600/20 hover:text-blue-200 text-slate-300 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Matched Documents */}
          {matchedDocs.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Data Sources & Ingested Files
              </div>
              <div className="space-y-0.5">
                {matchedDocs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onNavigate('data-sources');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800 text-slate-300 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderArchive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate font-mono">{doc.filename}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {doc.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Reports */}
          {matchedReports.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Corporate Reports
              </div>
              <div className="space-y-0.5">
                {matchedReports.map((rep) => (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => {
                      if (onSelectReport) onSelectReport(rep.id);
                      onNavigate('report-editor');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800 text-slate-300 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate font-medium">{rep.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                      {rep.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#0d1219] border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Use ↑↓ to navigate • Enter to select</span>
          <span>ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
};
