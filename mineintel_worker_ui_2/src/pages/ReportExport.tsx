import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FileText,
  Download,
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  Shield,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ReportExport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReportById, showToast } = useApp();

  const report = getReportById(id || '');
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'DOCX'>('PDF');
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = () => {
    const formatParam = selectedFormat.toLowerCase();
    const downloadUrl = `/api/reports/${report?.id || 'dossier'}/download?format=${formatParam}`;
    console.log(`GET ${downloadUrl}`);

    setIsExporting(true);
    showToast(
      'Export Initiated',
      `Dispatching official ${selectedFormat} export for ${report?.id}...`,
      'success'
    );

    // Prompt specifies: window.open('/api/reports/{id}/download?format=pdf')
    // We execute this and provide feedback
    try {
      window.open(downloadUrl, '_blank');
    } catch {
      // safe fallback
    }

    setTimeout(() => {
      setIsExporting(false);
    }, 1200);
  };

  const fileSize = selectedFormat === 'PDF' ? (report?.fileSizeEstimate || '2.4 MB') : '1.8 MB';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#00D9FF]/40 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#00D9FF] uppercase">
              EXPORT DISPATCH
            </span>
            <h2 className="text-2xl font-semibold text-white tracking-tight mt-0.5">
              Select Output Format
            </h2>
          </div>
        </div>

        {report && (
          <div className="text-right hidden sm:block">
            <div className="font-mono text-xs font-semibold text-white">{report.id}</div>
            <div className="text-xs text-slate-400 truncate max-w-xs">{report.title}</div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TWO GIANT 300px CARDS SIDE BY SIDE (PDF and DOCX) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
        {/* PDF CARD */}
        <motion.div
          whileHover={{ y: -6 }}
          onClick={() => setSelectedFormat('PDF')}
          className={`w-full max-w-[340px] h-[300px] mine-card p-6 flex flex-col justify-between items-center text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${
            selectedFormat === 'PDF'
              ? 'ring-2 ring-[#00D9FF] shadow-[0_0_35px_rgba(0,217,255,0.3)] bg-[rgba(15,23,42,0.85)]'
              : 'hover:border-[#00D9FF]/50'
          }`}
        >
          {/* Radio indicator top-right */}
          <div className="w-full flex justify-between items-center">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 border border-red-500/30 text-red-400">
              DGMS ARCHIVAL
            </span>
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                selectedFormat === 'PDF'
                  ? 'border-[#00D9FF] bg-[#00D9FF] text-slate-950 shadow-[0_0_8px_#00D9FF]'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              {selectedFormat === 'PDF' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
            </div>
          </div>

          {/* Big PDF icon 60px with page-flip animation on hover */}
          <div className="relative py-4 perspective-500">
            <div className="w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center transition-transform duration-500 group-hover:[transform:rotateY(-30deg)] shadow-lg">
              <FileText className="w-[60px] h-[60px] text-red-400 stroke-[1.5]" />
            </div>
          </div>

          {/* Label & Details */}
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Adobe PDF Dossier
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Digitally sealed, print-optimized document with Ministry watermark.
            </p>
          </div>
        </motion.div>

        {/* DOCX CARD */}
        <motion.div
          whileHover={{ y: -6 }}
          onClick={() => setSelectedFormat('DOCX')}
          className={`w-full max-w-[340px] h-[300px] mine-card p-6 flex flex-col justify-between items-center text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${
            selectedFormat === 'DOCX'
              ? 'ring-2 ring-[#00D9FF] shadow-[0_0_35px_rgba(0,217,255,0.3)] bg-[rgba(15,23,42,0.85)]'
              : 'hover:border-[#00D9FF]/50'
          }`}
        >
          {/* Radio indicator top-right */}
          <div className="w-full flex justify-between items-center">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
              EDITABLE DRAFT
            </span>
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                selectedFormat === 'DOCX'
                  ? 'border-[#00D9FF] bg-[#00D9FF] text-slate-950 shadow-[0_0_8px_#00D9FF]'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              {selectedFormat === 'DOCX' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
            </div>
          </div>

          {/* Big DOCX icon 60px with typing animation on hover */}
          <div className="relative py-4">
            <div className="w-24 h-24 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-lg relative">
              <FileCheck className="w-[60px] h-[60px] text-blue-400 stroke-[1.5]" />
              {/* Subtle typing flicker cursor inside icon badge */}
              <div className="absolute right-6 bottom-6 w-2 h-3.5 bg-blue-400 animate-pulse" />
            </div>
          </div>

          {/* Label & Details */}
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Microsoft Word (.docx)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Fully editable tables and raw telemetry vectors for joint review.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BOTTOM CENTER: "Download (PDF · 2.4 MB)" big button with shine-sweep */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="pt-8 flex flex-col items-center justify-center gap-4">
        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="btn-action shine-sweep px-10 py-4 rounded-[10px] bg-gradient-to-r from-[#00D9FF] to-blue-600 text-slate-950 font-bold text-base shadow-[0_0_30px_rgba(0,217,255,0.35)] hover:brightness-110 flex items-center gap-3 disabled:opacity-60 cursor-pointer"
        >
          <Download className="w-5 h-5 stroke-[2.5]" />
          <span>
            {isExporting
              ? 'Generating Output Stream...'
              : `Download (${selectedFormat} · ${fileSize})`}
          </span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Signed with CIL SHA-256 Digital Verification Token</span>
        </div>
      </div>
    </div>
  );
};
