import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Download, 
  Printer, 
  FileText, 
  Layers, 
  FileSpreadsheet, 
  Sparkles, 
  Eye, 
  Grid, 
  ScrollText, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GeneratedReport } from './types';
import { MineIntelLogo } from './MineIntelLogo';

interface PdfSlidePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileType: string;
  fileSize?: number;
  fileBase64?: string;
  rawText?: string;
  currentReport?: GeneratedReport | null;
  onGenerateReportRequest?: () => void;
}

export const PdfSlidePreviewModal: React.FC<PdfSlidePreviewModalProps> = ({
  isOpen,
  onClose,
  fileName,
  fileType,
  fileSize,
  fileBase64,
  rawText = '',
  currentReport,
  onGenerateReportRequest
}) => {
  // Active Tab: 'source' (the uploaded file/PDF) or 'report' (synthesized executive report)
  const [activeTab, setActiveTab] = useState<'source' | 'report'>('source');
  // View mode: 'slides' (deck / paginated A4 slides) or 'scroll' (continuous document) or 'embed' (native PDF iframe)
  const isNativePdf = Boolean(fileBase64 && (fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')));
  const [viewMode, setViewMode] = useState<'slides' | 'scroll' | 'embed'>(
    isNativePdf ? 'embed' : 'slides'
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // If activeTab switches to 'report' and there is a report, default to 'slides'
  useEffect(() => {
    if (activeTab === 'report') {
      if (viewMode === 'embed') setViewMode('slides');
    } else if (activeTab === 'source' && isNativePdf) {
      setViewMode('embed');
    }
  }, [activeTab, isNativePdf]);

  // When opening, reset to slide 0 if not set
  useEffect(() => {
    if (isOpen) {
      setCurrentSlideIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard navigation for slides
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, currentSlideIndex]);

  // Parse active content into discrete slides for presentation
  const textContent = useMemo(() => {
    if (activeTab === 'report' && currentReport) {
      return currentReport.reportMarkdown;
    }
    return rawText;
  }, [activeTab, currentReport, rawText]);

  // Split markdown into logical slide pages
  const slides = useMemo(() => {
    if (!textContent || textContent.trim().length === 0) {
      return [
        {
          id: 1,
          title: fileName || 'Uploaded Document',
          subtitle: 'Executive Ingestion Preview',
          content: isNativePdf
            ? 'Interactive PDF detected. Toggle to "Native PDF Embed" to inspect page layout and embedded figures.'
            : 'No textual preview available. Please upload a PDF, DOCX, or text file.'
        }
      ];
    }

    // Split by major Markdown headings (# or ##) or numbered sections
    const rawSections = textContent.split(/(?=\n#{1,2}\s+|\n[0-9]+\.\s+[A-Z\s]{4,})/g);
    const parsedSlides = rawSections
      .map((sec, idx) => {
        const trimmed = sec.trim();
        if (!trimmed) return null;

        // Extract title from first line
        const lines = trimmed.split('\n');
        const firstLine = lines[0].replace(/^#+\s*/, '').replace(/^[0-9]+\.\s*/, '').trim();
        const body = lines.slice(1).join('\n').trim();

        return {
          id: idx + 1,
          title: firstLine || `Section ${idx + 1}`,
          subtitle: idx === 0 ? 'Document Overview & Executive Synthesis' : `Detailed Analysis Part ${idx}`,
          content: body || trimmed
        };
      })
      .filter(Boolean) as { id: number; title: string; subtitle: string; content: string }[];

    if (parsedSlides.length === 0) {
      return [
        {
          id: 1,
          title: fileName || 'Document',
          subtitle: 'Content Overview',
          content: textContent
        }
      ];
    }

    return parsedSlides;
  }, [textContent, fileName, isNativePdf]);

  const totalSlides = slides.length;

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 15, 160));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 15, 70));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handleDownload = () => {
    if (activeTab === 'source' && isNativePdf && fileBase64) {
      const link = document.createElement('a');
      link.href = fileBase64;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(fileName || 'document').replace(/\.[^/.]+$/, '')}_preview.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const currentSlide = slides[currentSlideIndex] || slides[0];

  return (
    <div 
      id="pdf-slide-preview-overlay"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-xs transition-opacity duration-300"
    >
      {/* Slide-in Form Panel / Drawer */}
      <div 
        ref={containerRef}
        id="pdf-slide-preview-panel"
        className={`relative flex flex-col h-full bg-[#f8fafc] dark:bg-[#070e1c] border-l border-blue-900/20 dark:border-blue-500/20 shadow-2xl transition-all duration-300 transform translate-x-0 ${
          isFullscreen 
            ? 'w-full' 
            : 'w-full lg:w-[92vw] xl:w-[88vw] 2xl:w-[82vw]'
        }`}
      >
        {/* ===================================================================== */}
        {/* 1. TOP HEADER TOOLBAR                                                 */}
        {/* ===================================================================== */}
        <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-neutral-200/80 dark:border-blue-900/50 bg-white/95 dark:bg-[#0b162a]/95 backdrop-blur-md z-20">
          {/* Left: Document Info & Tab Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex-shrink-0 shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>

            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="font-outfit font-extrabold text-sm sm:text-base text-neutral-900 dark:text-white truncate">
                  {fileName || 'Document Preview'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex-shrink-0">
                  {isNativePdf ? 'PDF Slide Form' : 'Document Slides'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-blue-200/70">
                {fileSize && <span>{(fileSize / 1024).toFixed(0)} KB</span>}
                {fileSize && <span>•</span>}
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> High-Resolution PDF Presentation
                </span>
              </div>
            </div>

            {/* Document / Report Tab toggle if report exists */}
            {currentReport && (
              <div className="hidden sm:flex items-center bg-neutral-100 dark:bg-blue-950/60 p-1 rounded-xl border border-neutral-200 dark:border-blue-900/50 ml-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('source');
                    setCurrentSlideIndex(0);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'source'
                      ? 'bg-white dark:bg-blue-600 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  Source File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('report');
                    setCurrentSlideIndex(0);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'report'
                      ? 'bg-white dark:bg-blue-600 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300" />
                  Executive Report
                </button>
              </div>
            )}
          </div>

          {/* Right: Slide Controls & Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Mode Selector */}
            <div className="flex items-center bg-neutral-100 dark:bg-blue-950/60 p-0.5 sm:p-1 rounded-xl border border-neutral-200 dark:border-blue-900/50">
              <button
                type="button"
                onClick={() => setViewMode('slides')}
                className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'slides'
                    ? 'bg-white dark:bg-blue-600 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
                title="Slide Presentation Mode"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Slide Form</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('scroll')}
                className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'scroll'
                    ? 'bg-white dark:bg-blue-600 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
                title="Continuous Document Scroll"
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Document</span>
              </button>

              {isNativePdf && activeTab === 'source' && (
                <button
                  type="button"
                  onClick={() => setViewMode('embed')}
                  className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'embed'
                      ? 'bg-white dark:bg-blue-600 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                  title="Native Interactive PDF"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">PDF Embed</span>
                </button>
              )}
            </div>

            {/* Slide Navigation Widget (in Slide Mode) */}
            {viewMode === 'slides' && (
              <div className="flex items-center bg-neutral-100 dark:bg-blue-950/60 rounded-xl px-1 py-0.5 border border-neutral-200 dark:border-blue-900/50">
                <button
                  id="btn-slide-prev"
                  type="button"
                  onClick={handlePrevSlide}
                  disabled={currentSlideIndex === 0}
                  className="p-1 rounded-lg text-neutral-600 dark:text-blue-200 hover:bg-neutral-200 dark:hover:bg-blue-900/60 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  title="Previous Slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono text-xs font-bold text-neutral-800 dark:text-blue-100">
                  {currentSlideIndex + 1} / {totalSlides}
                </span>
                <button
                  id="btn-slide-next"
                  type="button"
                  onClick={handleNextSlide}
                  disabled={currentSlideIndex >= totalSlides - 1}
                  className="p-1 rounded-lg text-neutral-600 dark:text-blue-200 hover:bg-neutral-200 dark:hover:bg-blue-900/60 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  title="Next Slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            {viewMode !== 'embed' && (
              <div className="hidden lg:flex items-center bg-neutral-100 dark:bg-blue-950/60 rounded-xl px-1 py-0.5 border border-neutral-200 dark:border-blue-900/50">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 rounded-lg text-neutral-600 dark:text-blue-200 hover:bg-neutral-200 dark:hover:bg-blue-900/60 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-1.5 text-[11px] font-mono font-bold text-neutral-700 dark:text-blue-200"
                  title="Reset Zoom"
                >
                  {zoomLevel}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 rounded-lg text-neutral-600 dark:text-blue-200 hover:bg-neutral-200 dark:hover:bg-blue-900/60 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Thumbnail Toggle (in Slide mode) */}
            {viewMode === 'slides' && totalSlides > 1 && (
              <button
                type="button"
                onClick={() => setShowThumbnails((prev) => !prev)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer hidden md:flex items-center justify-center ${
                  showThumbnails
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-blue-900/50 hover:bg-neutral-100 dark:hover:bg-blue-950/40'
                }`}
                title="Toggle Slide Deck Thumbnails"
              >
                <Grid className="w-4 h-4" />
              </button>
            )}

            {/* Print & Download */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white border border-neutral-200 dark:border-blue-900/50 hover:bg-neutral-100 dark:hover:bg-blue-950/40 transition-colors cursor-pointer hidden sm:flex"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white border border-neutral-200 dark:border-blue-900/50 hover:bg-neutral-100 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white border border-neutral-200 dark:border-blue-900/50 hover:bg-neutral-100 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              id="btn-close-pdf-preview"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-600 hover:text-rose-600 dark:text-neutral-300 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-neutral-200 dark:border-blue-900/50 transition-colors cursor-pointer ml-1"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ===================================================================== */}
        {/* 2. MAIN PREVIEW STAGE WITH SLIDE DRAWER / DECK                         */}
        {/* ===================================================================== */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left: Optional Slide Thumbnails Drawer (Presentation Grid) */}
          {viewMode === 'slides' && showThumbnails && totalSlides > 1 && (
            <aside className="w-48 sm:w-56 flex-shrink-0 border-r border-neutral-200/80 dark:border-blue-900/40 bg-neutral-100/70 dark:bg-[#060c18] overflow-y-auto p-3.5 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-blue-300/60 px-1">
                Slide Outline ({totalSlides})
              </div>
              {slides.map((slide, idx) => {
                const isActive = idx === currentSlideIndex;
                return (
                  <div
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`group cursor-pointer p-2.5 rounded-xl border transition-all duration-150 ${
                      isActive
                        ? 'border-blue-500 bg-white dark:bg-blue-950/70 ring-2 ring-blue-500/30 shadow-sm'
                        : 'border-neutral-200 dark:border-blue-900/30 bg-white/70 dark:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 dark:text-blue-300/60 mb-1">
                      <span>SLIDE {idx + 1}</span>
                      {isActive && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <div className="font-semibold text-xs text-neutral-800 dark:text-white line-clamp-2 leading-tight">
                      {slide.title}
                    </div>
                  </div>
                );
              })}
            </aside>
          )}

          {/* Center Canvas: PDF Slide Form Viewport */}
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-neutral-200/50 dark:bg-[#030712]/80">
            
            {/* View Mode 1: Native Embedded PDF (if PDF base64 available) */}
            {viewMode === 'embed' && isNativePdf && fileBase64 ? (
              <div className="w-full h-full rounded-2xl overflow-hidden border border-neutral-300 dark:border-blue-900/60 shadow-xl bg-white dark:bg-[#0a1220]">
                <iframe
                  src={`${fileBase64}#toolbar=1&navpanes=1`}
                  title={fileName || 'PDF Document'}
                  className="w-full h-full border-0"
                />
              </div>
            ) : viewMode === 'scroll' ? (
              /* View Mode 2: Continuous Document Flow */
              <div 
                className="w-full max-w-4xl bg-white dark:bg-[#0b162a] rounded-2xl border border-neutral-200 dark:border-blue-900/50 shadow-xl p-8 sm:p-12 transition-all my-auto"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              >
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-blue-900/40 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <MineIntelLogo size={24} />
                    <span className="text-xs font-bold text-neutral-400 dark:text-blue-300/70">
                      Document Continuous Inspection
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-neutral-400">
                    {fileName}
                  </span>
                </div>
                <div className="prose dark:prose-invert max-w-none text-neutral-800 dark:text-blue-100 text-sm sm:text-base leading-relaxed">
                  <ReactMarkdown>{textContent}</ReactMarkdown>
                </div>
              </div>
            ) : (
              /* View Mode 3: Executive PDF Slide Deck Presentation Form */
              <div 
                className="w-full max-w-4xl transition-transform duration-200 my-auto"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
              >
                {/* Authentic Slide Sheet (16:10 ratio, clean executive styling) */}
                <div className="relative aspect-[16/10] w-full bg-white dark:bg-[#0b162a] rounded-2xl border border-neutral-200/90 dark:border-blue-500/25 shadow-2xl overflow-hidden flex flex-col p-6 sm:p-8 lg:p-10">
                  
                  {/* Top Slide Header Banner */}
                  <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-blue-900/40 pb-4 mb-5 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                      <MineIntelLogo size={24} />
                      <div className="h-4 w-px bg-neutral-300 dark:bg-blue-900/60" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-blue-300/80">
                        {fileName || 'Executive Document'}
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

                  {/* Slide Body Content */}
                  <div className="flex-1 overflow-y-auto pr-2 text-neutral-700 dark:text-blue-100 text-xs sm:text-sm sm:leading-relaxed font-normal">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{currentSlide.content}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Bottom Slide Footer */}
                  <div className="flex items-center justify-between border-t border-neutral-200/80 dark:border-blue-900/40 pt-3 mt-4 text-[11px] text-neutral-400 dark:text-blue-300/60 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">MineIntel Autonomous Synthesizer</span>
                      <span>•</span>
                      <span>Strictly Confidential</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span>Page {currentSlideIndex + 1}</span>
                    </div>
                  </div>
                </div>

                {/* Floating Quick Slide Navigation Bar below the sheet */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    disabled={currentSlideIndex === 0}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-[#0b162a] border border-neutral-200 dark:border-blue-900/50 text-neutral-700 dark:text-blue-200 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-blue-900/40 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous Slide
                  </button>

                  <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0b162a] border border-neutral-200 dark:border-blue-900/50 text-xs font-mono font-bold text-neutral-700 dark:text-blue-200 shadow-sm">
                    {currentSlideIndex + 1} / {totalSlides}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextSlide}
                    disabled={currentSlideIndex >= totalSlides - 1}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-[#0b162a] border border-neutral-200 dark:border-blue-900/50 text-neutral-700 dark:text-blue-200 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-blue-900/40 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    Next Slide <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* ===================================================================== */}
        {/* 3. BOTTOM QUICK ACTION BANNER (GENERATE OR CLOSE)                     */}
        {/* ===================================================================== */}
        <footer className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-neutral-200/80 dark:border-blue-900/50 bg-white dark:bg-[#0b162a] text-xs">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-blue-300/70">
            <span>Use Left/Right arrow keys to switch slides • Esc to exit</span>
          </div>

          <div className="flex items-center gap-3">
            {onGenerateReportRequest && !currentReport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGenerateReportRequest();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Executive Report
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-blue-900/50 text-neutral-700 dark:text-neutral-200 font-bold hover:bg-neutral-100 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
            >
              Close Slide View
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
