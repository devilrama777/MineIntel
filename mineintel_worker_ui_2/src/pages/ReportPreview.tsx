import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import {
  Edit3,
  Download,
  ArrowLeft,
  Save,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  List,
  ChevronRight,
  ShieldAlert,
  Menu,
  Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ReportPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReportById, updateReportMarkdown } = useApp();

  const report = getReportById(id || '');

  const [isEditMode, setIsEditMode] = useState(false);
  const [editableMarkdown, setEditableMarkdown] = useState('');
  const [outlineWidth, setOutlineWidth] = useState(280);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [mobileViewTab, setMobileViewTab] = useState<'content' | 'outline'>('content');
  const [isOutlineVisible, setIsOutlineVisible] = useState(true);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (report) {
      setEditableMarkdown(report.markdownContent);
    }
  }, [report]);

  // Extract sections from markdown (headings like ## 1. Executive Summary)
  const sections = useMemo(() => {
    if (!editableMarkdown) return [];
    const lines = editableMarkdown.split('\n');
    const result: { id: string; title: string; level: number }[] = [];

    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].trim();
        const sectionId = rawTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        result.push({ id: sectionId, title: rawTitle, level });
      }
    });

    return result;
  }, [editableMarkdown]);

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const headings = contentRef.current.querySelectorAll('h1, h2, h3');
      let currentActive = '';
      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 160) {
          currentActive = heading.id;
        }
      });
      if (currentActive) {
        setActiveSectionId(currentActive);
      } else if (sections.length > 0) {
        setActiveSectionId(sections[0].id);
      }
    };

    const container = contentRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [sections]);

  // Draggable divider handler
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = Math.max(200, Math.min(450, e.clientX - 260));
      setOutlineWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const scrollToSection = (sectionId: string) => {
    setMobileViewTab('content');
    setTimeout(() => {
      if (!contentRef.current) return;
      const el = contentRef.current.querySelector(`#${sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSectionId(sectionId);
      }
    }, 50);
  };

  const handleSaveEdit = () => {
    if (report) {
      updateReportMarkdown(report.id, editableMarkdown);
      setIsEditMode(false);
    }
  };

  if (!report) {
    return (
      <div className="mine-card p-8 sm:p-16 text-center">
        <h3 className="text-lg font-semibold text-white">Report Not Found</h3>
        <p className="text-xs text-slate-400 mt-2">
          The requested intelligence reference {id} does not exist in local cache.
        </p>
        <button
          onClick={() => navigate('/worker/my-reports')}
          className="btn-action mt-4 px-4 py-2 rounded-xl bg-slate-800 text-xs text-[#00D9FF]"
        >
          Return to Reports
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300 select-text">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* HEADER: report title + [Edit] [Export] buttons right */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mine-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#00D9FF]/40 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30">
                {report.id}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {report.createdAt} · {report.sourcesCount} sources
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-semibold text-white tracking-tight mt-1 truncate">
              {report.title}
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile view toggle for small screens */}
          <div className="lg:hidden flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl mr-1">
            <button
              onClick={() => setMobileViewTab('content')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                mobileViewTab === 'content'
                  ? 'bg-[#00D9FF]/20 text-[#00D9FF]'
                  : 'text-slate-400'
              }`}
            >
              Document
            </button>
            <button
              onClick={() => setMobileViewTab('outline')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                mobileViewTab === 'outline'
                  ? 'bg-[#00D9FF]/20 text-[#00D9FF]'
                  : 'text-slate-400'
              }`}
            >
              Outline ({sections.length})
            </button>
          </div>

          {/* Desktop outline toggle */}
          <button
            onClick={() => setIsOutlineVisible(!isOutlineVisible)}
            className="hidden lg:flex btn-action items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-[#00D9FF]/40 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
            title={isOutlineVisible ? 'Hide Outline (Maximize Reading Area)' : 'Show Outline'}
          >
            <List className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isOutlineVisible ? 'Hide Outline' : 'Show Outline'}</span>
          </button>

          {isEditMode ? (
            <button
              onClick={handleSaveEdit}
              className="btn-action flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditMode(true)}
              className="btn-action flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-[#00D9FF]/40 text-slate-200 font-semibold text-xs transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span>Edit</span>
            </button>
          )}

          <button
            onClick={() => navigate(`/worker/export/${report.id}`)}
            className="btn-action shine-sweep flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-[#00D9FF] to-blue-600 text-slate-950 font-semibold text-xs shadow-[0_0_15px_rgba(0,217,255,0.25)] hover:brightness-110"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RESPONSIVE LAYOUT (Split on lg, adaptive on mobile)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mine-card flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-230px)] min-h-[480px] overflow-hidden relative">
        {/* Left: Outline panel (always full width on mobile when selected, desktop on left) */}
        <div
          style={{ width: undefined }}
          className={`lg:shrink-0 border-b lg:border-b-0 lg:border-r border-[#00D9FF]/12 flex flex-col justify-between bg-slate-950/40 ${
            mobileViewTab === 'outline' ? 'flex w-full' : isOutlineVisible ? 'hidden lg:flex' : 'hidden'
          }`}
          // desktop width applied via style below
        >
          <div
            style={{ width: `${outlineWidth}px` }}
            className="hidden lg:flex flex-col h-full justify-between"
          >
            {/* Outline Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
              <List className="w-4 h-4 text-[#00D9FF]" />
              <span>DOSSIER OUTLINE</span>
            </div>

            {/* Section List with scroll-spy */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sections.map((sec) => {
                const isActive = activeSectionId === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full relative text-left py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-between group cursor-pointer ${
                      isActive
                        ? 'bg-[rgba(0,217,255,0.08)] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                    style={{
                      paddingLeft: sec.level === 3 ? '22px' : '12px',
                    }}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#00D9FF] shadow-[0_0_8px_#00D9FF]" />
                    )}

                    <span className="truncate pr-2">{sec.title.replace(/^#+\s*/, '')}</span>

                    <ChevronRight
                      className={`w-3 h-3 shrink-0 transition-opacity ${
                        isActive ? 'text-[#00D9FF] opacity-100' : 'opacity-0 group-hover:opacity-60'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Outline Footer Meta */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Status:</span>
              <span
                className={`font-semibold ${
                  report.status === 'Approved'
                    ? 'text-emerald-400'
                    : report.status === 'Pending'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {report.status}
              </span>
            </div>
          </div>

          {/* Mobile version of outline */}
          <div className="lg:hidden w-full p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
            <div className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase mb-2">
              SELECT SECTION TO NAVIGATE:
            </div>
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className="w-full text-left py-2.5 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-[#00D9FF]/40 text-xs text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
              >
                <span className="truncate pr-2">{sec.title.replace(/^#+\s*/, '')}</span>
                <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* DRAGGABLE DIVIDER (Desktop only when outline is visible) */}
        {isOutlineVisible && (
          <div
            onMouseDown={handleMouseDown}
            className={`hidden lg:flex w-1.5 cursor-col-resize hover:bg-[#00D9FF]/50 transition-colors items-center justify-center shrink-0 z-10 ${
              isDragging ? 'bg-[#00D9FF] shadow-[0_0_10px_#00D9FF]' : 'bg-slate-800/60'
            }`}
            title="Drag to resize outline"
          >
            <div className="w-0.5 h-8 rounded-full bg-slate-600" />
          </div>
        )}

        {/* Right: Report content with CONFIDENTIAL watermark */}
        <div
          ref={contentRef}
          className={`flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 relative bg-[#060a14]/60 w-full min-w-0 ${
            mobileViewTab === 'outline' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* CONFIDENTIAL Watermark */}
          <div
            className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='400' viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='200' y='200' fill='%23ffffff' font-family='sans-serif' font-weight='800' font-size='32' opacity='0.04' text-anchor='middle' transform='rotate(-45 200 200)'%3ECONFIDENTIAL · CIL%3C/text%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />

          <div className="relative z-10 max-w-4xl mx-auto w-full">
            {isEditMode ? (
              /* Edit Mode: Live Markdown Textarea */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800 gap-1">
                  <span>MARKDOWN SOURCE EDITOR</span>
                  <span>Headers (#), tables (|), code blocks (```)</span>
                </div>
                <textarea
                  value={editableMarkdown}
                  onChange={(e) => setEditableMarkdown(e.target.value)}
                  rows={26}
                  className="w-full p-4 rounded-xl bg-slate-950/90 border border-[#00D9FF]/30 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-[#00D9FF] resize-none"
                />
              </div>
            ) : (
              /* Read Mode: react-markdown rendered */
              <article className="prose prose-invert max-w-none break-words">
                <Markdown
                  components={{
                    h1: ({ children }) => {
                      const text = String(children);
                      const secId = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                      return (
                        <h1
                          id={secId}
                          className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 pb-2 border-b border-[#00D9FF]/20"
                        >
                          {children}
                        </h1>
                      );
                    },
                    h2: ({ children }) => {
                      const text = String(children);
                      const secId = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                      return (
                        <h2
                          id={secId}
                          className="text-base sm:text-lg md:text-xl font-semibold text-cyan-300 mt-8 mb-3 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
                          {children}
                        </h2>
                      );
                    },
                    h3: ({ children }) => {
                      const text = String(children);
                      const secId = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                      return (
                        <h3 id={secId} className="text-sm sm:text-base font-semibold text-slate-200 mt-6 mb-2">
                          {children}
                        </h3>
                      );
                    },
                    p: ({ children }) => (
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4">{children}</p>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-6 rounded-xl border border-[#00D9FF]/15 bg-slate-950/60 max-w-full">
                        <table className="w-full text-left text-xs min-w-[500px]">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-[rgba(0,217,255,0.08)] border-b border-[#00D9FF]/15 font-mono text-[11px] text-cyan-300 font-semibold">
                        {children}
                      </thead>
                    ),
                    th: ({ children }) => <th className="p-2.5 sm:p-3">{children}</th>,
                    td: ({ children }) => (
                      <td className="p-2.5 sm:p-3 border-b border-slate-800/60 font-mono text-slate-300">
                        {children}
                      </td>
                    ),
                    code: ({ children }) => (
                      <code className="font-mono text-[11px] sm:text-xs bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-cyan-300">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="font-mono text-[11px] sm:text-xs bg-slate-950 border border-[#00D9FF]/20 p-3 sm:p-4 rounded-xl overflow-x-auto text-cyan-200 my-4 shadow-inner max-w-full">
                        {children}
                      </pre>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 my-3 pl-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 my-3 pl-2">
                        {children}
                      </ol>
                    ),
                    hr: () => <hr className="border-[#00D9FF]/15 my-6" />,
                  }}
                >
                  {editableMarkdown}
                </Markdown>

                {/* Footer per page: "Page 3 of 12" */}
                <div className="mt-12 sm:mt-16 pt-6 border-t border-slate-800/80 text-center font-mono text-xs text-gray-500">
                  Page 3 of 12 · Ministry of Coal / Coal India Limited CMPDI Field Verification
                </div>
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
