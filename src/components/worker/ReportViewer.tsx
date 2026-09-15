import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Download, 
  Copy, 
  Check, 
  Printer, 
  FileText, 
  Clock, 
  BarChart3, 
  Sparkles, 
  Layers, 
  RotateCcw,
  BookOpen,
  Calendar
} from 'lucide-react';
import { GeneratedReport } from './types';
import { MineIntelLogo } from './MineIntelLogo';

interface ReportViewerProps {
  report: GeneratedReport;
  onReset: () => void;
  onOpenSlidePreview?: () => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ report, onReset, onOpenSlidePreview }) => {
  const [activeView, setActiveView] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.reportMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([report.reportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (report.metadata.title || 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.href = url;
    link.download = `${safeTitle}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([report.reportMarkdown], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (report.metadata.title || 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.href = url;
    link.download = `${safeTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(report.metadata.generatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in print:p-0">
      {/* Top Action Toolbar (Hidden during Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4.5 rounded-2xl bg-white dark:bg-[#0b162a] border border-blue-900/20 dark:border-blue-500/20 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <button
            id="btn-view-formatted"
            type="button"
            onClick={() => setActiveView('formatted')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeView === 'formatted'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-blue-200/80 hover:bg-neutral-100 dark:hover:bg-blue-950/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Executive Document View
          </button>
          <button
            id="btn-view-raw"
            type="button"
            onClick={() => setActiveView('raw')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeView === 'raw'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-blue-200/80 hover:bg-neutral-100 dark:hover:bg-blue-950/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            Raw Markdown
          </button>
          {onOpenSlidePreview && (
            <button
              id="btn-view-pdf-slides"
              type="button"
              onClick={onOpenSlidePreview}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer shadow-2xs"
              title="Open report in interactive PDF slide form"
            >
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              PDF Slide Form
            </button>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            id="btn-copy-report"
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-neutral-300 dark:border-blue-900/60 bg-white dark:bg-[#0d1c33] text-neutral-700 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-950/80 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            id="btn-download-md"
            type="button"
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-neutral-300 dark:border-blue-900/60 bg-white dark:bg-[#0d1c33] text-neutral-700 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-950/80 transition-colors"
            title="Download .md file"
          >
            <Download className="w-4 h-4" />
            <span>.MD</span>
          </button>

          <button
            id="btn-download-txt"
            type="button"
            onClick={handleDownloadTxt}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-neutral-300 dark:border-blue-900/60 bg-white dark:bg-[#0d1c33] text-neutral-700 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-950/80 transition-colors"
            title="Download text file"
          >
            <Download className="w-4 h-4" />
            <span>.TXT</span>
          </button>

          <button
            id="btn-print-pdf"
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-neutral-900 text-white dark:bg-blue-600 dark:text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors shadow-xs"
            title="Print or Save to PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>

          <button
            id="btn-generate-another"
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-blue-300 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Report</span>
          </button>
        </div>
      </div>

      {/* Metadata & Key Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b162a] border border-neutral-200/90 dark:border-blue-900/40 shadow-xs">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Reading Time</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
            ~{report.metadata.readingTimeMinutes} min
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b162a] border border-neutral-200/90 dark:border-blue-900/40 shadow-xs">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70 mb-1">
            <BarChart3 className="w-4 h-4 text-sky-500" />
            <span>Synthesis Volume</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
            {report.metadata.wordCount.toLocaleString()} words
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b162a] border border-neutral-200/90 dark:border-blue-900/40 shadow-xs">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70 mb-1">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>Format & Tone</span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white capitalize truncate">
            {report.metadata.reportType} ({report.metadata.tone})
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b162a] border border-neutral-200/90 dark:border-blue-900/40 shadow-xs">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70 mb-1">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>Date & Time</span>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate" title={new Date(report.metadata.generatedAt).toLocaleString()}>
            {formattedDate}
          </div>
        </div>
      </div>

      {/* Main Report Body Container */}
      <div className="w-full bg-white dark:bg-[#0b162a] rounded-3xl border border-neutral-200/90 dark:border-blue-900/40 shadow-md overflow-hidden print:border-none print:shadow-none">
        {/* Document Header Masthead */}
        <div className="p-6 sm:p-9 border-b border-neutral-100 dark:border-blue-900/40 bg-gradient-to-b from-blue-50/50 to-white dark:from-[#070e1c] dark:to-[#0b162a]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2">
              <MineIntelLogo variant="icon-only" size={26} />
              <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/80">
                Executive Synthesis
              </span>
            </div>
            <span className="text-xs text-neutral-500 dark:text-blue-300/60 font-mono">
              Ref: {report.id}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-2.5">
            {report.metadata.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70 font-medium">
            <span>
              Source: <strong className="text-neutral-800 dark:text-white">{report.fileName || 'Provided Document'}</strong>
            </span>
            <span>•</span>
            <span>Generated via MineIntel Intelligence Engine</span>
            {report.customFocus && (
              <>
                <span>•</span>
                <span>Focus: <em className="text-blue-600 dark:text-blue-400 font-semibold">"{report.customFocus}"</em></span>
              </>
            )}
          </div>
        </div>

        {/* View content */}
        {activeView === 'formatted' ? (
          <div className="p-6 sm:p-10">
            <div className="report-markdown-content max-w-none prose prose-neutral dark:prose-invert">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mt-6 mb-4 border-b border-neutral-200 dark:border-blue-900/40 pb-2">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mt-8 mb-3 flex items-center gap-2.5">
                      <span className="w-2 h-6 bg-blue-600 rounded-full inline-block" />
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base sm:text-lg font-bold text-neutral-800 dark:text-neutral-200 mt-6 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm sm:text-base leading-relaxed text-neutral-700 dark:text-neutral-300 mb-4 font-normal">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-neutral-700 dark:text-neutral-300 mb-4">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 space-y-1.5 text-sm sm:text-base text-neutral-700 dark:text-neutral-300 mb-4">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-5 p-4.5 rounded-2xl border-l-4 border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-neutral-800 dark:text-neutral-200 font-medium">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6 rounded-2xl border border-neutral-200 dark:border-blue-900/50 shadow-xs">
                      <table className="min-w-full divide-y divide-neutral-200 dark:divide-blue-900/50 text-left text-xs sm:text-sm">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-neutral-100 dark:bg-[#070e1c] font-bold text-neutral-900 dark:text-white">
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-neutral-100 dark:divide-blue-900/30 bg-white dark:bg-[#0b162a]">
                      {children}
                    </tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-colors">
                      {children}
                    </tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-4.5 py-3 font-bold text-neutral-900 dark:text-white">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4.5 py-3 text-neutral-700 dark:text-neutral-300">
                      {children}
                    </td>
                  ),
                  code: ({ children }) => (
                    <code className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      {children}
                    </code>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold text-neutral-900 dark:text-white">
                      {children}
                    </strong>
                  ),
                }}
              >
                {report.reportMarkdown}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <textarea
              readOnly
              value={report.reportMarkdown}
              rows={28}
              className="w-full font-mono text-xs sm:text-sm p-4.5 rounded-2xl border border-neutral-200 dark:border-blue-900/50 bg-neutral-50 dark:bg-[#070e1c] text-neutral-800 dark:text-neutral-200 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {/* Report Footer / Signature */}
        <div className="px-6 sm:px-8 py-5 border-t border-neutral-100 dark:border-blue-900/40 bg-neutral-50/50 dark:bg-[#070e1c]/60 flex flex-wrap items-center justify-between text-xs sm:text-sm text-neutral-500 dark:text-blue-200/70 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Verified Intelligence Report • MineIntel Engine</span>
          </div>
          <div className="font-mono text-xs text-neutral-600 dark:text-neutral-300 font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Generated: {new Date(report.metadata.generatedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
