import React from 'react';
import { X, FileText, Download, Calendar, MapPin, Tag, ShieldCheck, Layers, ExternalLink, Printer } from 'lucide-react';
import { MiningReport } from '../../data/miningData';

interface DocumentViewerModalProps {
  report: MiningReport | null;
  onClose: () => void;
  onOpenTopic?: (topicName: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ report, onClose, onOpenTopic }) => {
  if (!report) return null;

  const handleDownload = () => {
    const textContent = `MINING & GEOLOGICAL AUDIT REPORT: ${report.title}
Mine: ${report.mineName} (${report.subsidiary})
Report Type: ${report.reportType}
Date: ${report.date} | Author: ${report.author}
Status: ${report.status} | Coherence Index: ${report.coherenceIndex}%

ABSTRACT:
${report.abstract}

KEY STATUTORY FINDINGS:
${report.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

LITHOLOGICAL / STRATA DATA:
${report.strataData ? report.strataData.map((s) => `- ${s.seam}: Depth ${s.depthMeters}m, Thickness ${s.thicknessMeters}m (Grade ${s.grade})`).join('\n') : 'N/A'}
`;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-700/80 bg-[#0d1424] text-slate-100 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 bg-[#121c33] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/20">
                  {report.reportType}
                </span>
                <span className="rounded-md bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-300 border border-cyan-500/20">
                  {report.subsidiary}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" /> {report.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
                {report.title}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-amber-400" /> {report.mineName}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-500" /> {report.date}</span>
                <span>Author: {report.author}</span>
                <span>Pages: {report.pages} ({report.fileSize})</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Abstract / Executive Summary */}
          <div className="rounded-xl border border-slate-800 bg-[#090f1d] p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
              <Layers className="h-4 w-4" /> Geological Abstract & Executive Summary
            </h3>
            <p className="text-sm leading-relaxed text-slate-300 font-normal">
              {report.abstract}
            </p>
          </div>

          {/* Key Findings */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Key Statutory Findings & Measured Reserves
            </h3>
            <div className="space-y-2.5">
              {report.keyFindings.map((finding, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3.5 text-sm text-slate-200">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                    {idx + 1}
                  </span>
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lithological Strata Table (if present) */}
          {report.strataData && report.strataData.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Identified Seam Strata & Coal Seam Log
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121c33] text-slate-300 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Seam Identification</th>
                      <th className="px-4 py-3 font-semibold">Intersection Depth</th>
                      <th className="px-4 py-3 font-semibold">Thickness (m)</th>
                      <th className="px-4 py-3 font-semibold">Coal Quality Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-[#0a101f] text-slate-300">
                    {report.strataData.map((stratum, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-2.5 font-medium text-white">{stratum.seam}</td>
                        <td className="px-4 py-2.5 font-mono text-cyan-300">{stratum.depthMeters} m</td>
                        <td className="px-4 py-2.5 font-mono text-amber-300">{stratum.thicknessMeters} m</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                            {stratum.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Topics Tagged */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-cyan-400" /> Extracted Topic Classifications
            </h3>
            <div className="flex flex-wrap gap-2">
              {report.topics.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => onOpenTopic && onOpenTopic(t)}
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300 transition"
                >
                  <span>{t}</span>
                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#0a101f] px-6 py-4">
          <div className="text-xs text-slate-400">
            Topic Coherence Index: <span className="font-mono font-bold text-amber-400">{report.coherenceIndex}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition shadow-md shadow-amber-500/20"
            >
              <Download className="h-4 w-4" /> Export Report (.txt)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
