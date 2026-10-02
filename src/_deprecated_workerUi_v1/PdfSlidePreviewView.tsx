import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Edit3, 
  Save, 
  X, 
  Check, 
  ShieldCheck,
  Sparkles,
  FileCode,
  Layers,
  ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GeneratedReport } from './types';
import { MineIntelLogo } from './MineIntelLogo';

interface SlideItem {
  id: number;
  title: string;
  subtitle: string;
  content: string;
}

interface PdfSlidePreviewViewProps {
  fileName: string;
  fileType?: string;
  fileSize?: number;
  rawText?: string;
  currentReport?: GeneratedReport | null;
  onJumpToExport: () => void;
  onUpdateRawText?: (updatedText: string) => void;
  onFinalExportPdf?: () => void;
}

export const PdfSlidePreviewView: React.FC<PdfSlidePreviewViewProps> = ({
  fileName,
  fileSize,
  rawText = '',
  currentReport,
  onJumpToExport,
  onUpdateRawText,
  onFinalExportPdf,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Preview must show the generated MineIntel report, not the uploaded source document
  const hasReport = Boolean(currentReport && currentReport.reportMarkdown && currentReport.reportMarkdown.trim().length > 0);

  const initialContent = useMemo(() => {
    if (currentReport?.reportMarkdown) {
      return currentReport.reportMarkdown;
    }
    return '';
  }, [currentReport]);

  // Split content into discrete slides
  const parsedSlides = useMemo(() => {
    if (!hasReport || !initialContent || initialContent.trim().length === 0) {
      return [
        {
          id: 1,
          title: 'Executive Intelligence Report',
          subtitle: 'No Report Generated Yet',
          content: 'No executive report has been generated yet for this session.\n\nPlease navigate to **Data Source**, upload or stage your documents, and click **"Generate Intelligence Report"** to synthesize your executive report.'
        }
      ];
    }

    const rawSections = initialContent.split(/(?=\n#{1,2}\s+|\n[0-9]+\.\s+[A-Z\s]{4,})/g);
    const result = rawSections
      .map((sec, idx) => {
        const trimmed = sec.trim();
        if (!trimmed) return null;

        const lines = trimmed.split('\n');
        const firstLine = lines[0].replace(/^#+\s*/, '').replace(/^[0-9]+\.\s*/, '').trim();
        const body = lines.slice(1).join('\n').trim();

        return {
          id: idx + 1,
          title: firstLine || `Section ${idx + 1}`,
          subtitle: idx === 0 ? 'Executive Synthesis & Intelligence Brief' : `Strategic Insights & Analysis Part ${idx}`,
          content: body || trimmed
        };
      })
      .filter(Boolean) as SlideItem[];

    return result.length > 0
      ? result
      : [
          {
            id: 1,
            title: currentReport?.fileName || fileName || 'Executive Report',
            subtitle: 'Overview',
            content: initialContent
          }
        ];
  }, [initialContent, hasReport, currentReport, fileName]);

  // Slides state so edits can be applied in real-time
  const [slides, setSlides] = useState<SlideItem[]>(parsedSlides);

  // Keep slides synchronized if source document changes
  useEffect(() => {
    setSlides(parsedSlides);
  }, [parsedSlides]);

  // =====================================================================
  // EDIT PDF & MARKDOWN STATE & HANDLERS
  // =====================================================================
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<'slide' | 'full'>('slide');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSubtitle, setEditSubtitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editFullMarkdown, setEditFullMarkdown] = useState<string>('');
  const [editSavedToast, setEditSavedToast] = useState<string | null>(null);

  const currentSlide = slides[currentSlideIndex] || slides[0];

  // When opening edit mode, populate fields from current slide and full markdown
  const handleOpenEdit = () => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }
    setEditTitle(currentSlide.title);
    setEditSubtitle(currentSlide.subtitle || '');
    setEditContent(currentSlide.content);
    setEditFullMarkdown(currentReport?.reportMarkdown || initialContent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editMode === 'full') {
      if (onUpdateRawText) {
        onUpdateRawText(editFullMarkdown);
      }
      setIsEditing(false);
      setEditSavedToast('Full Markdown document updated successfully!');
      setTimeout(() => setEditSavedToast(null), 3000);
      return;
    }

    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex] = {
      ...currentSlide,
      title: editTitle,
      subtitle: editSubtitle,
      content: editContent
    };
    setSlides(updatedSlides);
    setIsEditing(false);

    // Reconstruct full text so parent state can stay synchronized
    const fullRebuilt = updatedSlides
      .map((s) => `# ${s.title}\n${s.subtitle ? `> ${s.subtitle}\n\n` : ''}${s.content}`)
      .join('\n\n');

    if (onUpdateRawText) {
      onUpdateRawText(fullRebuilt);
    }

    setEditSavedToast(`Saved changes to Slide ${currentSlideIndex + 1}`);
    setTimeout(() => setEditSavedToast(null), 3000);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const totalSlides = slides.length;

  const handleNextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
      setIsEditing(false);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
      setIsEditing(false);
    }
  };

  // Keyboard navigation for presentation slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, totalSlides, isEditing]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div id="pdf-preview-page" className="w-full flex flex-col space-y-4 animate-fade-in">
      
      {/* Toast Notification when slide is edited */}
      {editSavedToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{editSavedToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setEditSavedToast(null)}
            className="p-1 rounded-lg hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0b162a] border border-neutral-200/80 dark:border-blue-900/50 shadow-xs">
        
        {/* Left: Document Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                AI Synthesized Report
              </span>
              <h1 className="font-outfit text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate">
                {currentReport?.fileName || fileName || 'Executive Report'}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-blue-300/70 mt-0.5">
              <span>{totalSlides} {totalSlides === 1 ? 'Slide' : 'Slides'}</span>
              {fileSize && <span>•</span>}
              {fileSize && <span>{formatFileSize(fileSize)}</span>}
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Ready for Export
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* BUTTON 1: EDIT PDF / MARKDOWN */}
          <button
            id="btn-edit-pdf"
            type="button"
            disabled={!hasReport}
            onClick={handleOpenEdit}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all duration-200 flex items-center gap-2 shadow-xs active:scale-95 ${
              !hasReport
                ? 'opacity-40 cursor-not-allowed bg-neutral-100 dark:bg-blue-950/20 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-blue-900/30'
                : isEditing
                ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-amber-500/20 cursor-pointer'
                : 'bg-white dark:bg-blue-950/40 border-neutral-300 dark:border-blue-800 text-neutral-700 dark:text-blue-200 hover:bg-neutral-100 dark:hover:bg-blue-900/60 cursor-pointer'
            }`}
            title={hasReport ? "Edit the Markdown content" : "Generate a report first to edit"}
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? 'Editing Mode Active' : 'Edit Markdown'}</span>
          </button>

          {/* BUTTON 2: FINAL EXPORT (PDF) */}
          <button
            id="btn-final-export-pdf"
            type="button"
            disabled={!hasReport}
            onClick={onFinalExportPdf || onJumpToExport}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center gap-2 active:scale-95 ${
              !hasReport
                ? 'opacity-40 cursor-not-allowed bg-neutral-200 dark:bg-neutral-800 text-neutral-500 border border-neutral-300 dark:border-neutral-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 cursor-pointer'
            }`}
            title={hasReport ? "Export final edited Markdown as PDF" : "Generate a report first to export"}
          >
            <Download className="w-4 h-4" />
            <span>Final Export (PDF)</span>
          </button>

          {/* BUTTON 3: MORE EXPORT OPTIONS */}
          <button
            id="btn-preview-download-export"
            type="button"
            disabled={!hasReport}
            onClick={onJumpToExport}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-neutral-700 dark:text-blue-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-neutral-200 dark:border-blue-900/60 transition-all cursor-pointer"
            title="More Export Options"
          >
            <span>Options</span>
          </button>

        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN STAGE: LEFT OUTLINE + RIGHT SLIDE CANVAS                          */}
      {/* ===================================================================== */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[580px]">
        
        {/* Left: Slide Outline Deck */}
        <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 rounded-2xl bg-white dark:bg-[#0b162a] border border-neutral-200/80 dark:border-blue-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80 dark:border-blue-900/40 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-blue-300/70">
            <span>Slide Outline ({totalSlides})</span>
            <span className="font-mono text-xs">{currentSlideIndex + 1} / {totalSlides}</span>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {slides.map((slide, idx) => {
              const isActive = idx === currentSlideIndex;
              return (
                <div
                  key={slide.id}
                  id={`outline-slide-${idx + 1}`}
                  onClick={() => {
                    setCurrentSlideIndex(idx);
                    setIsEditing(false);
                  }}
                  className={`group cursor-pointer p-3 rounded-xl border transition-all duration-150 ${
                    isActive
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/70 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-neutral-200 dark:border-blue-900/40 bg-neutral-50/50 dark:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 dark:text-blue-300/60 mb-1">
                    <span>SLIDE {idx + 1}</span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <div className="font-semibold text-xs text-neutral-900 dark:text-white line-clamp-2 leading-tight">
                    {slide.title}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center/Right: Slide Presentation Viewport */}
        <main className="flex-1 flex flex-col justify-between rounded-2xl bg-neutral-100/70 dark:bg-[#060c18] border border-neutral-200/80 dark:border-blue-900/50 p-4 sm:p-6 lg:p-8 overflow-hidden">
          
          {/* SLIDE CARD */}
          <div className="w-full max-w-4xl mx-auto my-auto">
            <div className="relative aspect-[16/10] w-full bg-white dark:bg-[#0b162a] rounded-2xl border border-neutral-200/90 dark:border-blue-500/25 shadow-xl overflow-hidden flex flex-col p-6 sm:p-8 lg:p-10">
              
              {/* Slide Top Banner */}
              <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-blue-900/40 pb-4 mb-5 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <MineIntelLogo size={24} />
                  <div className="h-4 w-px bg-neutral-300 dark:bg-blue-900/60" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-blue-300/80">
                    {currentReport?.fileName || fileName || 'Executive Report'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-neutral-100 dark:bg-blue-950 text-neutral-600 dark:text-blue-300 border border-neutral-200 dark:border-blue-900/50">
                    Confidential
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-400 dark:text-neutral-500">
                    SLIDE {currentSlideIndex + 1} OF {totalSlides}
                  </span>
                </div>
              </div>

              {/* Slide Content: Either Display or Editing Mode */}
              {isEditing ? (
                /* INLINE SLIDE & MARKDOWN EDITOR */
                <div className="flex-1 flex flex-col space-y-3 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-blue-900/40">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditMode('slide')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          editMode === 'slide'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-neutral-100 dark:bg-blue-950/60 text-neutral-600 dark:text-blue-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" /> Slide {currentSlideIndex + 1}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditMode('full')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          editMode === 'full'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-neutral-100 dark:bg-blue-950/60 text-neutral-600 dark:text-blue-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5" /> Full Markdown
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-blue-900/40 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Save {editMode === 'full' ? 'Markdown' : 'Slide'}
                      </button>
                    </div>
                  </div>

                  {editMode === 'slide' ? (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-500 dark:text-blue-300 mb-1">
                          Slide Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-neutral-50 dark:bg-blue-950/60 border border-neutral-300 dark:border-blue-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-neutral-500 dark:text-blue-300 mb-1">
                          Slide Subtitle
                        </label>
                        <input
                          type="text"
                          value={editSubtitle}
                          onChange={(e) => setEditSubtitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-neutral-50 dark:bg-blue-950/60 border border-neutral-300 dark:border-blue-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex-1 flex flex-col min-h-[140px]">
                        <label className="block text-[11px] font-bold text-neutral-500 dark:text-blue-300 mb-1">
                          Slide Body Content (Markdown supported)
                        </label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={6}
                          className="w-full flex-1 px-3 py-2 rounded-xl text-xs font-mono bg-neutral-50 dark:bg-blue-950/60 border border-neutral-300 dark:border-blue-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-[220px]">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-neutral-500 dark:text-blue-300">
                          Complete Report Markdown (Full Document)
                        </label>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {editFullMarkdown.length} characters
                        </span>
                      </div>
                      <textarea
                        value={editFullMarkdown}
                        onChange={(e) => setEditFullMarkdown(e.target.value)}
                        rows={12}
                        className="w-full flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-neutral-50 dark:bg-blue-950/60 border border-neutral-300 dark:border-blue-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed resize-y"
                        placeholder="# Report Title..."
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* NORMAL DISPLAY MODE */
                <>
                  {/* Slide Title & Subtitle */}
                  <div className="mb-4 flex-shrink-0">
                    <h2 className="font-outfit text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight leading-tight">
                      {currentSlide.title}
                    </h2>
                    {currentSlide.subtitle && (
                      <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                        {currentSlide.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Slide Markdown Content */}
                  <div className="flex-1 overflow-y-auto pr-2 text-neutral-700 dark:text-blue-100 text-xs sm:text-sm sm:leading-relaxed font-normal">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{currentSlide.content}</ReactMarkdown>
                    </div>
                  </div>
                </>
              )}

              {/* Slide Bottom Footer */}
              <div className="flex items-center justify-between border-t border-neutral-200/80 dark:border-blue-900/40 pt-3 mt-4 text-[11px] text-neutral-400 dark:text-blue-300/60 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">MineIntel Autonomous Synthesizer</span>
                  <span>•</span>
                  <span>Strictly Confidential</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <span>Page {currentSlideIndex + 1}</span>
                  <span>/</span>
                  <span>{totalSlides}</span>
                </div>
              </div>

            </div>
          </div>

          {/* SLIDE DECK NAVIGATION BAR */}
          <div className="flex items-center justify-between mt-4 px-2">
            <button
              type="button"
              id="btn-prev-slide"
              onClick={handlePrevSlide}
              disabled={currentSlideIndex === 0}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-[#0b162a] border border-neutral-200 dark:border-blue-900/50 text-neutral-700 dark:text-blue-200 hover:bg-neutral-100 dark:hover:bg-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {/* Slide dots indicator */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentSlideIndex(idx);
                    setIsEditing(false);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentSlideIndex 
                      ? 'w-6 bg-blue-600 dark:bg-blue-400' 
                      : 'w-2 bg-neutral-300 dark:bg-blue-950 hover:bg-neutral-400'
                  }`}
                  aria-label={`Jump to slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              id="btn-next-slide"
              onClick={handleNextSlide}
              disabled={currentSlideIndex === totalSlides - 1}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-[#0b162a] border border-neutral-200 dark:border-blue-900/50 text-neutral-700 dark:text-blue-200 hover:bg-neutral-100 dark:hover:bg-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </main>
      </div>

    </div>
  );
};
