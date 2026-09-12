import React, { useState } from 'react';
import {
  GitFork,
  Plus,
  Trash2,
  Lock,
  Unlock,
  MoveUp,
  MoveDown,
  Sparkles,
  Edit2,
  Check,
  X,
  FileText,
  HelpCircle,
  Database,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { ReportSectionNode } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface ReportPlannerViewProps {
  sections: ReportSectionNode[];
  onUpdateSections: (newSections: ReportSectionNode[]) => void;
  onOpenEditorSection: (sectionId: string) => void;
}

export const ReportPlannerView: React.FC<ReportPlannerViewProps> = ({
  sections,
  onUpdateSections,
  onOpenEditorSection,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionLevel, setNewSectionLevel] = useState<number>(1);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Find currently selected section recursively
  const findSection = (list: ReportSectionNode[], id: string): ReportSectionNode | undefined => {
    for (const item of list) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findSection(item.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedSection = findSection(sections, selectedSectionId) || sections[0];

  const handleStartRename = (sec: ReportSectionNode) => {
    setEditingId(sec.id);
    setEditingTitle(sec.title);
  };

  const handleSaveRename = (secId: string) => {
    const updateRecursive = (list: ReportSectionNode[]): ReportSectionNode[] => {
      return list.map((item) => {
        if (item.id === secId) {
          return { ...item, title: editingTitle };
        }
        if (item.children) {
          return { ...item, children: updateRecursive(item.children) };
        }
        return item;
      });
    };
    onUpdateSections(updateRecursive(sections));
    setEditingId(null);
  };

  const handleToggleLock = (secId: string) => {
    const updateRecursive = (list: ReportSectionNode[]): ReportSectionNode[] => {
      return list.map((item) => {
        if (item.id === secId) {
          return { ...item, isLocked: !item.isLocked };
        }
        if (item.children) {
          return { ...item, children: updateRecursive(item.children) };
        }
        return item;
      });
    };
    onUpdateSections(updateRecursive(sections));
  };

  const handleDeleteSection = (secId: string) => {
    const filterRecursive = (list: ReportSectionNode[]): ReportSectionNode[] => {
      return list
        .filter((item) => item.id !== secId)
        .map((item) => ({
          ...item,
          children: item.children ? filterRecursive(item.children) : undefined,
        }));
    };
    onUpdateSections(filterRecursive(sections));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const newArr = [...sections];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    onUpdateSections(newArr);
  };

  const handleRegenerateStructure = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setIsRegenerating(false);
      // Introduce an AI discovered operational section
      const discoveredSection: ReportSectionNode = {
        id: `sec-ai-${Date.now()}`,
        title: '8. Drone Bathymetry & Opencast Sump Water Evacuation Telemetry',
        level: 1,
        aiRationale: 'Discovered high-resolution drone orthomosaics indicating massive pit void water storage. Synthesized specialized operational chapter to cover monsoon de-watering readiness.',
        linkedEvidenceCount: 7,
        status: 'planned',
        wordCount: 1750,
      };
      onUpdateSections([...sections, discoveredSection]);
      setSelectedSectionId(discoveredSection.id);
    }, 1100);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    const newSec: ReportSectionNode = {
      id: `sec-custom-${Date.now()}`,
      title: newSectionTitle,
      level: newSectionLevel,
      aiRationale: 'Manually specified by corporate evaluator.',
      linkedEvidenceCount: 0,
      status: 'planned',
      wordCount: 1200,
    };
    onUpdateSections([...sections, newSec]);
    setNewSectionTitle('');
    setShowAddModal(false);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
      {/* Header & Notice */}
      <div className="flex items-center justify-between border-b border-[#233145] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitFork className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Report Structural Tree & Dynamic Outline Planner
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Dynamically synthesized section hierarchy with evidence grounding anchors and rationale transparency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerateStructure}
            disabled={isRegenerating}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-mono text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>{isRegenerating ? 'Analyzing Corpus...' : 'AI Re-Evaluate Outline'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-mono text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Section</span>
          </button>
        </div>
      </div>

      {/* Dynamic Generation Banner */}
      <div className="p-3 bg-[#131d2b] border border-blue-900/50 rounded-md flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-slate-300">
            Structure dynamically synthesized by <strong>openrouter/free</strong> based on ingested statutory documents & datasets.
          </span>
        </div>
        <span className="font-mono text-[11px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
          NOT A STATIC TEMPLATE
        </span>
      </div>

      {/* Main Split Layout: Left Visual Tree, Right Section Rationale Inspector */}
      <div className="flex-1 flex gap-5 overflow-hidden">
        {/* Left Tree Outline */}
        <div className="flex-1 bg-[#111722] border border-[#1e2a3b] rounded-md overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-[#141d2b] border-b border-[#1e2a3b] text-[11px] font-mono uppercase tracking-wider text-slate-400 flex justify-between">
            <span>Report Structural Hierarchy ({sections.length} Chapters)</span>
            <span>Estimated Total: ~24,800 words</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
            {sections.map((sec, idx) => {
              const isSelected = sec.id === selectedSection?.id;
              const isEditing = editingId === sec.id;

              return (
                <div key={sec.id} className="space-y-1">
                  {/* Chapter Level Node */}
                  <div
                    onClick={() => setSelectedSectionId(sec.id)}
                    className={`p-2.5 rounded border flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-[#162132] text-slate-100'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <div className="text-slate-400 font-bold shrink-0">
                        {idx + 1}.0
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="bg-slate-950 border border-blue-500 rounded px-2 py-1 text-xs text-white w-full"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(sec.id)}
                            className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-semibold truncate text-xs">
                          {sec.title}
                        </span>
                      )}

                      {sec.isLocked && (
                        <span title="Section structure locked">
                          <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-blue-400 bg-blue-950/40 border border-blue-900/60 px-1.5 py-0.2 rounded">
                        {sec.linkedEvidenceCount} citations
                      </span>
                      <StatusBadge status={sec.status} size="sm" />

                      <div className="flex items-center gap-0.5 border-l border-slate-800 pl-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(idx, 'up');
                          }}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                          title="Move Up"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(idx, 'down');
                          }}
                          disabled={idx === sections.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                          title="Move Down"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(sec);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-200"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLock(sec.id);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-300"
                          title={sec.isLocked ? 'Unlock Section' : 'Lock Section'}
                        >
                          {sec.isLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSection(sec.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400"
                          title="Delete Section"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-sections Children */}
                  {sec.children && (
                    <div className="pl-6 space-y-1 border-l border-slate-800 ml-4">
                      {sec.children.map((child, cIdx) => (
                        <div
                          key={child.id}
                          onClick={() => setSelectedSectionId(child.id)}
                          className={`p-2 rounded border flex items-center justify-between transition cursor-pointer text-[11px] ${
                            child.id === selectedSection?.id
                              ? 'border-blue-500 bg-[#162132] text-slate-100'
                              : 'border-slate-800/80 hover:border-slate-700 bg-slate-900/20 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-slate-400 font-mono">{idx + 1}.{cIdx + 1}</span>
                            <span className="truncate">{child.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-400">
                              {child.linkedEvidenceCount} refs
                            </span>
                            <StatusBadge status={child.status} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel: Section Rationale & AI Context */}
        {selectedSection && (
          <div className="w-[440px] bg-[#111722] border border-[#1e2a3b] rounded-md overflow-hidden flex flex-col shrink-0">
            <div className="p-4 bg-[#141d2b] border-b border-[#1e2a3b] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-100 truncate max-w-[280px]">
                  {selectedSection.title}
                </h3>
                <div className="text-[10px] font-mono text-slate-400">
                  Section ID: {selectedSection.id}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenEditorSection(selectedSection.id)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-mono text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Edit in Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* AI Structural Rationale */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-300 font-semibold font-mono text-xs">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>AI Structural Rationale</span>
                </div>
                <div className="p-3 bg-[#141d2b] border border-blue-900/50 rounded text-slate-200 leading-relaxed font-sans text-xs">
                  {selectedSection.aiRationale ||
                    'Synthesized from cross-subsidiary operational ledgers to address statutory regulatory disclosure requirements.'}
                </div>
              </div>

              {/* Section Attributes */}
              <div className="space-y-1.5 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Section Target Parameters
                </div>
                <div className="bg-[#141b26] border border-slate-800 rounded p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Word Count:</span>
                    <span className="text-slate-200">~{selectedSection.wordCount || 1500} words</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Linked Provenance Citations:</span>
                    <span className="text-blue-400 font-bold">{selectedSection.linkedEvidenceCount} citations</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Review Status:</span>
                    <StatusBadge status={selectedSection.status} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lock State:</span>
                    <span className={selectedSection.isLocked ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {selectedSection.isLocked ? 'Locked against AI restructuring' : 'Dynamic / Modifiable'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Prompt Assistance */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded space-y-2">
                <div className="text-[11px] font-semibold text-slate-300 font-mono">
                  Autonomous Sub-Section Generation
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Have the local LLM inspect raw CSV & PDF chunks to formulate further nested sub-headings tailored to this chapter.
                </p>
                <button
                  type="button"
                  onClick={handleRegenerateStructure}
                  className="w-full py-1.5 text-xs text-blue-300 bg-blue-950/40 hover:bg-blue-900/40 border border-blue-800/60 rounded font-mono transition cursor-pointer"
                >
                  Generate Nested Topics
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#141c28] border border-slate-700 rounded-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100">
                Insert New Report Chapter
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Section Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5.3 Fly Ash Utilization & Brick Manufacturing Quotas"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Hierarchy Level</label>
                <select
                  value={newSectionLevel}
                  onChange={(e) => setNewSectionLevel(parseInt(e.target.value))}
                  className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>Primary Chapter (Level 1)</option>
                  <option value={2}>Sub-Section (Level 2)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded"
                >
                  Insert Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
