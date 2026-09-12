import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Edit3,
  Check,
  X,
  Plus,
  Table as TableIcon,
  BarChart3,
  FileCheck,
  Quote,
  ShieldCheck,
  RotateCcw,
  Info,
  Maximize2,
  Copy,
} from 'lucide-react';
import {
  ReportItem,
  ReportSectionNode,
  EditorBlock,
  AIEditProposal,
  EvidenceItem,
} from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface ReportEditorViewProps {
  report: ReportItem;
  sections: ReportSectionNode[];
  initialSectionId?: string;
  blocks: EditorBlock[];
  evidenceList?: EvidenceItem[];
  onUpdateBlock: (block: EditorBlock) => void;
  onApplyAIProposal: (proposal: AIEditProposal) => void;
  onTriggerAIAgent: (params: {
    reportId: string;
    sectionId: string;
    selectedBlockId: string;
    instruction: string;
  }) => Promise<AIEditProposal>;
  onInspectEvidence: (evidence: EvidenceItem) => void;
}

export const ReportEditorView: React.FC<ReportEditorViewProps> = ({
  report,
  sections,
  initialSectionId = 'sec-5',
  blocks,
  evidenceList = [],
  onUpdateBlock,
  onApplyAIProposal,
  onTriggerAIAgent,
  onInspectEvidence,
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    if (initialSectionId && sections.some((s) => s.id === initialSectionId)) {
      return initialSectionId;
    }
    return sections[0]?.id || 'sec-5';
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string>(() => {
    const currentSecId =
      initialSectionId && sections.some((s) => s.id === initialSectionId)
        ? initialSectionId
        : sections[0]?.id || 'sec-5';
    const secBlocks = blocks.filter((b) => b.sectionId === currentSecId);
    const firstP = secBlocks.find((b) => b.type === 'paragraph');
    return firstP?.id || secBlocks[0]?.id || blocks[0]?.id || 'blk-502';
  });

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');

  // AI Agent Panel state
  const [agentPrompt, setAgentPrompt] = useState('Verify numerical figures against live source file');
  const [isAgentSearching, setIsAgentSearching] = useState(false);
  const [activeProposal, setActiveProposal] = useState<AIEditProposal | null>(null);
  const proposalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeProposal && proposalRef.current) {
      proposalRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeProposal]);

  const [agentHistory, setAgentHistory] = useState<string[]>([
    'Local inference agent online on 127.0.0.1:8765. Contextual evidence binding active.',
  ]);

  const activeSectionBlocks = blocks.filter((b) => b.sectionId === activeSectionId);

  const handleSelectSection = (secId: string) => {
    setActiveSectionId(secId);
    const secBlocks = blocks.filter((b) => b.sectionId === secId);
    const firstP = secBlocks.find((b) => b.type === 'paragraph') || secBlocks[0];
    if (firstP) {
      setSelectedBlockId(firstP.id);
    }
  };

  // Helper to find title of active section
  const findSectionTitle = (nodes: ReportSectionNode[], id: string): string => {
    for (const node of nodes) {
      if (node.id === id) return node.title;
      if (node.children) {
        const found = findSectionTitle(node.children, id);
        if (found) return found;
      }
    }
    return sections[0]?.title || '5.0 Mine Production, Overburden & Stripping Efficiency';
  };

  const currentSectionTitle = findSectionTitle(sections, activeSectionId);

  // Identify active selected block and its linked live source file
  const activeBlock = blocks.find((b) => b.id === selectedBlockId) || activeSectionBlocks[0];
  const liveFileName = activeBlock?.evidenceRef?.documentName || 'mining_data_chart.png';
  const liveLocation = activeBlock?.evidenceRef?.location || 'Figure 1.1: Production Trend';

  // Trigger contextual AI Action
  const handleExecuteAIAgent = async (customPrompt?: string) => {
    const promptToUse = customPrompt || agentPrompt;
    if (!promptToUse.trim()) return;

    setIsAgentSearching(true);
    setAgentHistory((prev) => [
      ...prev,
      `USER: "${promptToUse}"`,
      `AGENT: Searching local evidence index across ${liveFileName}...`,
    ]);

    try {
      const proposal = await onTriggerAIAgent({
        reportId: report.id,
        sectionId: activeSectionId,
        selectedBlockId,
        instruction: promptToUse,
      });

      setActiveProposal(proposal);
      setAgentHistory((prev) => [
        ...prev,
        `AGENT: Evidence grounded in ${proposal.searchedEvidence?.sourceFile || liveFileName} (${proposal.searchedEvidence?.rangeOrSection || liveLocation}). Formulating delta analysis.`,
      ]);
    } finally {
      setIsAgentSearching(false);
    }
  };

  const handleAcceptProposal = () => {
    if (!activeProposal) return;
    const sourceDoc = activeProposal.searchedEvidence?.sourceFile || liveFileName;
    onApplyAIProposal(activeProposal);
    setActiveProposal(null);
    setAgentHistory((prev) => [
      ...prev,
      `SYSTEM: Proposal accepted. Block [${selectedBlockId}] updated with verified data from ${sourceDoc}.`,
    ]);
  };

  const handleRejectProposal = () => {
    setActiveProposal(null);
    setAgentHistory((prev) => [
      ...prev,
      `SYSTEM: Proposal rejected by user. Report draft left unchanged.`,
    ]);
  };

  const handleStartEdit = (block: EditorBlock) => {
    setEditingBlockId(block.id);
    setEditingContent(block.content || '');
  };

  const handleSaveEdit = (block: EditorBlock) => {
    onUpdateBlock({
      ...block,
      content: editingContent,
    });
    setEditingBlockId(null);
  };

  const quickActionChips = [
    'Verify numerical figures against live source file',
    'Improve formal institutional tone',
    'Summarize paragraph for executive brief',
    'Cross-reference claims with source evidence',
    'Check parameter compliance against statutory limits',
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ========================================================= */}
      {/* LEFT PANEL: Report Structure / Navigation Outline */}
      {/* ========================================================= */}
      <div className="w-64 bg-[#0e141f] border-r border-[#1c2636] flex flex-col select-none shrink-0">
        <div className="p-3 border-b border-[#1c2636] bg-[#111824]">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Active Document Outline
          </div>
          <div className="text-xs font-semibold text-slate-200 truncate">
            {report.name}
          </div>
        </div>

        {/* Section List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sections.map((ch) => (
            <div key={ch.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleSelectSection(ch.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition flex items-center justify-between ${
                  activeSectionId === ch.id
                    ? 'bg-blue-600/20 text-blue-200 border border-blue-600/40 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate pr-1">{ch.title}</span>
                <StatusBadge status={ch.status} size="sm" dot={false} />
              </button>

              {ch.children && (
                <div className="pl-3 space-y-0.5 border-l border-slate-800 ml-2">
                  {ch.children.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSelectSection(sub.id)}
                      className={`w-full text-left px-2 py-1 rounded text-[11px] transition flex items-center justify-between ${
                        activeSectionId === sub.id
                          ? 'bg-blue-600/20 text-blue-200 border border-blue-600/40 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="truncate pr-1">{sub.title}</span>
                      <StatusBadge status={sub.status} size="sm" dot={false} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Outline Footer Stats */}
        <div className="p-2.5 bg-[#111722] border-t border-[#1c2636] text-[11px] font-mono text-slate-400 flex justify-between">
          <span>Words: 14,850</span>
          <span className="text-emerald-400">92% Verified</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CENTER PANEL: Document Editor Workspace */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col bg-[#0b0f17] overflow-hidden">
        {/* Editor Toolbar */}
        <div className="h-10 bg-[#121926] border-b border-[#1c2636] flex items-center justify-between px-4 text-xs select-none">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-400 text-[11px]">Active Section:</span>
            <span className="font-semibold text-slate-200 truncate max-w-md">
              {currentSectionTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              Selection: <strong className="text-blue-400">{selectedBlockId}</strong>
            </span>
            <div className="h-3 w-px bg-slate-800" />
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
              AUTO-PERSISTED LOCAL
            </span>
          </div>
        </div>

        {/* Document Editor Page Simulation */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-[#0d121c]">
          <div className="w-full max-w-4xl bg-[#141b27] border border-[#222e40] rounded shadow-xl p-8 space-y-5 text-slate-200">
            {activeSectionBlocks.map((block) => {
              const isSelected = selectedBlockId === block.id;
              const isEditing = editingBlockId === block.id;

              return (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`relative p-3 rounded transition group ${
                    isSelected
                      ? 'ring-1 ring-blue-500/80 bg-[#182333]/80'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  {/* Selection Indicator & Quick Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 bg-[#101722] border border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(block);
                      }}
                      className="text-slate-400 hover:text-white"
                      title="Edit Text"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <span className="text-slate-400">|</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBlockId(block.id);
                        handleExecuteAIAgent('Verify this figure against source');
                      }}
                      className="text-blue-400 hover:text-blue-200 flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>AI Verify</span>
                    </button>
                  </div>

                  {/* Heading Render */}
                  {block.type === 'heading' && (
                    <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight">
                      {block.content}
                    </h2>
                  )}

                  {/* Callout Render */}
                  {block.type === 'callout' && (
                    <div className="p-3 bg-amber-950/20 border-l-2 border-amber-500 text-amber-200/90 text-xs leading-relaxed font-mono">
                      {block.content}
                    </div>
                  )}

                  {/* Paragraph Render */}
                  {block.type === 'paragraph' && (
                    <div className="text-xs leading-relaxed font-sans">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            rows={4}
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full bg-[#101724] border border-blue-500 rounded p-2 text-xs text-white focus:outline-none"
                          />
                          <div className="flex justify-end gap-2 font-mono text-[11px]">
                            <button
                              type="button"
                              onClick={() => setEditingBlockId(null)}
                              className="px-2 py-1 bg-slate-800 text-slate-300 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(block)}
                              className="px-2 py-1 bg-blue-600 text-white rounded font-semibold"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span>{block.content}</span>

                          {/* Citation Badge */}
                          {block.evidenceRef && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                const docName = block.evidenceRef!.documentName;
                                const evMatch = evidenceList.find(
                                  (ev) =>
                                    (block.citationId && ev.id === block.citationId) ||
                                    ev.documentName.toLowerCase() === docName.toLowerCase()
                                );
                                if (evMatch) {
                                  onInspectEvidence(evMatch);
                                } else {
                                  const docExt = docName.toLowerCase().split('.').pop() || '';
                                  const docType =
                                    docExt === 'csv'
                                      ? 'CSV'
                                      : docExt === 'pdf'
                                      ? 'PDF'
                                      : docExt === 'png' || docExt === 'jpg'
                                      ? 'Images'
                                      : docExt === 'docx'
                                      ? 'DOCX'
                                      : 'TXT';

                                  onInspectEvidence({
                                    id: block.citationId || `ev-${block.id}`,
                                    documentId: `doc-${block.id}`,
                                    documentName: docName,
                                    documentType: docType as any,
                                    page: 1,
                                    sourceLocation: block.evidenceRef!.location,
                                    extractionMethod: docType === 'Images' ? 'Vector Embedding Match' : 'Native Parser',
                                    confidence: 99.2,
                                    relevantText: block.content || '',
                                    metadata: {
                                      year: 2026,
                                      organizationUnit: 'Operations & Exploration Telemetry',
                                      date: '2026-03-05',
                                      authorOrSource: 'Autonomous Extraction Pipeline',
                                    },
                                    bbox: { x: 30, y: 80, width: 500, height: 250 },
                                  });
                                }
                              }}
                              className={`ml-2 inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded border cursor-pointer ${
                                block.evidenceRef.verified
                                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60'
                                  : 'text-amber-400 bg-amber-950/40 border-amber-800/60 animate-pulse'
                              }`}
                              title="Click to view exact source spreadsheet/PDF"
                            >
                              <FileCheck className="w-3 h-3" />
                              <span>
                                [SRC: {block.evidenceRef.documentName.split('.')[0]} #{block.evidenceRef.location}]
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Formatted Table Render */}
                  {block.type === 'table' && block.tableData && (
                    <div className="space-y-1.5 my-3">
                      {block.caption && (
                        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                          {block.caption}
                        </div>
                      )}
                      <div className="border border-slate-700/80 rounded overflow-hidden">
                        <table className="w-full text-xs font-mono border-collapse">
                          <thead>
                            <tr className="bg-[#1a2333] text-slate-300 border-b border-slate-700">
                              {block.tableData.headers.map((h, i) => (
                                <th key={i} className="py-2 px-3 text-left border-r border-slate-800 last:border-0">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 bg-[#141b27]">
                            {block.tableData.rows.map((row, rI) => (
                              <tr
                                key={rI}
                                className={rI === block.tableData!.rows.length - 1 ? 'font-bold bg-blue-950/30' : 'hover:bg-slate-800/40'}
                              >
                                {row.map((cell, cI) => (
                                  <td
                                    key={cI}
                                    className={`py-2 px-3 border-r border-slate-800 last:border-0 ${
                                      cI >= 1 ? 'text-right' : ''
                                    }`}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Visual Chart Render */}
                  {block.type === 'chart' && block.chartConfig && (
                    <div className="p-4 bg-[#111722] border border-slate-800 rounded space-y-3 my-3">
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {block.chartConfig.title}
                      </div>
                      <div className="space-y-2 font-mono text-xs">
                        {block.chartConfig.data.map((item, idx) => {
                          const maxVal = 2200;
                          const pct = (item.value / maxVal) * 100;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-300">{item.label}</span>
                                <span className="text-blue-300 font-bold">₹{item.value} Cr</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {block.caption && (
                        <div className="text-[10px] font-mono text-slate-400 italic">
                          {block.caption}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT PANEL: Contextual AI Agent + Evidence Panel */}
      {/* ========================================================= */}
      <div className="w-[420px] bg-[#111722] border-l border-[#1c2636] flex flex-col select-none shrink-0">
        {/* Panel Header */}
        <div className="p-3.5 bg-[#141d2b] border-b border-[#1c2636] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Contextual AI Agent & Evidence
            </h3>
          </div>
          <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 border border-blue-800/60 px-1.5 py-0.2 rounded">
            LOCAL AIRGAP
          </span>
        </div>

        {/* Agent Context Bar */}
        <div className="px-3.5 py-2 bg-[#101622] border-b border-[#1c2636] text-[10px] font-mono text-slate-400 space-y-0.5">
          <div>Report: <strong className="text-slate-200">{report.name}</strong></div>
          <div>Section: <strong className="text-blue-300">{currentSectionTitle}</strong></div>
          <div>Focus Block: <strong className="text-emerald-400">{selectedBlockId}</strong></div>
        </div>

        {/* History / Terminal Feed */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
          {/* Activity Log stream */}
          <div className="space-y-1.5 font-mono text-[11px]">
            {agentHistory.map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded leading-relaxed break-words ${
                  item.startsWith('USER:')
                    ? 'bg-blue-950/40 border border-blue-800/40 text-blue-200'
                    : item.startsWith('AGENT:')
                    ? 'bg-slate-900/60 border border-slate-800 text-slate-300'
                    : 'bg-emerald-950/20 border border-emerald-800/40 text-emerald-300'
                }`}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Concrete Proposal Card if ready */}
          {activeProposal && (
            <div
              ref={proposalRef}
              className="bg-[#141d2b] border-2 border-blue-500 rounded-md p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150 scroll-mt-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-blue-400 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5" />
                  EVIDENCE-GROUNDED REVISION PROPOSAL
                </span>
                <span className="font-mono text-emerald-400 text-xs font-bold">
                  {activeProposal.confidenceScore}% Confidence
                </span>
              </div>

              {/* Found Evidence Box */}
              {activeProposal.searchedEvidence && (
                <div className="bg-slate-900/90 border border-slate-700/80 rounded p-2.5 font-mono text-[11px] space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase">
                    Evidence Grounded in Live Source File
                  </div>
                  <div className="text-slate-200 font-bold truncate">
                    {activeProposal.searchedEvidence.sourceFile}
                  </div>
                  <div className="text-blue-300 truncate">
                    {activeProposal.searchedEvidence.sheetOrPage ? `${activeProposal.searchedEvidence.sheetOrPage} • ` : ''}
                    {activeProposal.searchedEvidence.rangeOrSection}
                  </div>
                </div>
              )}

              {/* Numerical Delta Comparison */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 bg-rose-950/20 border border-rose-800/50 rounded overflow-hidden">
                  <div className="text-[10px] text-rose-400 uppercase">Original Text / Value</div>
                  <div className="text-rose-200 font-bold line-through break-words">
                    {activeProposal.originalValue}
                  </div>
                </div>
                <div className="p-2 bg-emerald-950/20 border border-emerald-800/50 rounded overflow-hidden">
                  <div className="text-[10px] text-emerald-400 uppercase">Revised / Verified Value</div>
                  <div className="text-emerald-300 font-bold break-words">
                    {activeProposal.verifiedValue}
                  </div>
                </div>
              </div>

              {/* Delta description */}
              <div className="text-[11px] text-amber-300/90 font-mono bg-amber-950/20 border border-amber-800/40 p-2 rounded">
                Difference: {activeProposal.differenceAnalysis}
              </div>

              {/* Proposed Replacement Text */}
              <div className="space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Proposed Revision</div>
                <div className="p-2.5 bg-[#0e141f] border border-slate-800 rounded text-slate-200 text-xs font-sans leading-relaxed">
                  "{activeProposal.proposedText}"
                </div>
              </div>

              {/* Consequential Action Buttons */}
              <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
                <button
                  type="button"
                  id="btn-accept-proposal"
                  onClick={handleAcceptProposal}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept Change</span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectProposal}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Contextual Action Chips */}
        <div className="p-2.5 bg-[#101724] border-t border-[#1c2636] space-y-1.5">
          <div className="text-[10px] font-mono text-slate-400 uppercase">
            Suggested Verification Prompts
          </div>
          <div className="flex flex-wrap gap-1">
            {quickActionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setAgentPrompt(chip);
                  handleExecuteAIAgent(chip);
                }}
                className="text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 transition truncate max-w-full cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#131b28] border-t border-[#1c2636]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteAIAgent();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              placeholder="Ask contextual agent to verify, rewrite, or cross-check..."
              className="flex-1 bg-[#0b0e14] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="submit"
              disabled={isAgentSearching}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded transition flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAgentSearching ? 'Searching...' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
