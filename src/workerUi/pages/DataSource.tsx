import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Search,
  Filter,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  File,
  CheckCircle2,
  FolderOpen,
  ArrowUpDown,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FileSourceItem, FileType } from '../types';

export const DataSource: React.FC = () => {
  const { files, ingestFile, deleteFile } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'size' | 'name'>('newest');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        ingestFile(file);
      });
    }
  };

  // Filter & sort files
  const filteredFiles = useMemo(() => {
    let result = files.filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    result.sort((a, b) => {
      if (sortOption === 'newest') return b.id.localeCompare(a.id);
      if (sortOption === 'oldest') return a.id.localeCompare(b.id);
      if (sortOption === 'size') return b.bytes - a.bytes;
      if (sortOption === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [files, searchQuery, sortOption]);

  // Colored icon per type
  const renderBigFileIcon = (type: FileType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-12 h-12 text-red-400 stroke-[1.5]" />;
      case 'XLSX':
      case 'CSV':
        return <FileSpreadsheet className="w-12 h-12 text-emerald-400 stroke-[1.5]" />;
      case 'DOCX':
        return <FileText className="w-12 h-12 text-blue-400 stroke-[1.5]" />;
      case 'TXT':
        return <FileCode className="w-12 h-12 text-slate-400 stroke-[1.5]" />;
      case 'PNG':
      case 'JPG':
        return <FileImage className="w-12 h-12 text-purple-400 stroke-[1.5]" />;
      default:
        return <File className="w-12 h-12 text-cyan-400 stroke-[1.5]" />;
    }
  };

  const getBadgeStyle = (type: FileType) => {
    switch (type) {
      case 'PDF':
        return 'bg-red-500/15 border-red-500/30 text-red-400';
      case 'XLSX':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
      case 'DOCX':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
      case 'CSV':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'TXT':
        return 'bg-slate-500/15 border-slate-500/30 text-slate-300';
      case 'PNG':
      case 'JPG':
        return 'bg-purple-500/15 border-purple-500/30 text-purple-400';
      default:
        return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.txt,.png,.jpg,.jpeg"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* HEADER CARD */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mine-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-[#00D9FF]/30 flex items-center justify-center shrink-0">
            <FolderOpen className="w-6 h-6 text-[#00D9FF]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
              Ingest new source
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Field evidence repository: sensor tables, drone survey orthomosaics, and safety filings.
            </p>
          </div>
        </div>

        <button
          onClick={handleUploadClick}
          className="btn-action shine-sweep flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00D9FF] to-blue-600 text-slate-950 font-semibold text-sm shadow-[0_0_20px_rgba(0,217,255,0.25)] hover:brightness-110"
        >
          <Upload className="w-4 h-4 stroke-[2.5]" />
          <span>Upload File</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SEARCH BAR + SORT DROPDOWN */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search source by filename, format, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#00D9FF]/50 transition-colors"
          />
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">Sort:</span>
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-[#00D9FF]/50 cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="size">Size (Large to Small)</option>
              <option value="name">Alphabetical</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FILES GRID 3 COLUMNS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {filteredFiles.length === 0 ? (
        /* Empty State */
        <div className="mine-card p-16 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-center mb-4">
            <FolderOpen className="w-12 h-12 text-slate-500" />
          </div>
          <h4 className="text-base font-semibold text-white">No Sources Match Filter</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Try adjusting your search terms or upload a new telemetry document.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="btn-action mt-4 px-4 py-2 rounded-lg bg-slate-800 text-xs text-cyan-300 hover:bg-slate-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredFiles.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative h-[180px] mine-card p-4 flex flex-col justify-between overflow-hidden cursor-pointer hover:-translate-y-1 hover:border-[#00D9FF]/40 hover:shadow-[0_10px_25px_-5px_rgba(0,217,255,0.15)] transition-all duration-200"
              >
                {/* Top: Type badge top-left */}
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${getBadgeStyle(
                      file.type
                    )}`}
                  >
                    {file.type}
                  </span>

                  {/* Trash icon slides in from right on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(file.id);
                    }}
                    className="translate-x-10 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/15 transition-all duration-200"
                    title="Delete source file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Center: Big file icon + Filename */}
                <div className="flex flex-col items-center justify-center -mt-2">
                  {renderBigFileIcon(file.type)}
                  <div
                    className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[220px] text-center mt-2"
                    title={file.name}
                  >
                    {file.name}
                  </div>
                </div>

                {/* Footer: "size · date" + "Ingested" green pill */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">
                    {file.size} · {file.uploadedAt.split('·')[0].trim()}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Ingested
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
