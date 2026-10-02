import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  CheckCircle2,
  Eye,
  Search,
  Check,
  Shield,
  Layers,
  Table,
  Sparkles,
  X,
  ChevronRight,
  Info,
  Calendar,
  Database,
  ArrowRight,
  FileCheck,
  Activity,
  AlertTriangle,
  HelpCircle,
  Maximize2,
  Minimize2,
  LayoutGrid,
  ListFilter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReportTemplate, TemplateCategory } from '../../types';

export const ReportTemplatesSection: React.FC = () => {
  const { templates, selectedTemplateId, setSelectedTemplateId, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [previewTemplate, setPreviewTemplate] = useState<ReportTemplate | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'schema' | 'sections' | 'sample'>('schema');
  const [isModalMaximized, setIsModalMaximized] = useState(false);
  const [dataPointsViewMode, setDataPointsViewMode] = useState<'cards' | 'table'>('cards');

  // Category filter items
  const categories: { label: string; value: string }[] = [
    { label: 'All Templates', value: 'All' },
    { label: 'Mining Operations', value: 'Mining Operations' },
    { label: 'Safety & Statutory', value: 'Safety & Statutory' },
    { label: 'Production & Dispatch', value: 'Production & Dispatch' },
    { label: 'Quality & Beneficiation', value: 'Quality & Beneficiation' },
    { label: 'Asset & Fleet', value: 'Asset & Fleet' },
    { label: 'Financial & Capex', value: 'Financial & Capex' },
    { label: 'Project & Planning', value: 'Project & Planning' },
    { label: 'Workforce & HR', value: 'Workforce & HR' },
  ];

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory =
        selectedCategory === 'All' || t.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !searchQuery ||
        t.name.toLowerCase().includes(q) ||
        t.annexure.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.relevance.toLowerCase().includes(q) ||
        t.keyMetrics.some((m) => m.toLowerCase().includes(q)) ||
        t.schema.expectedDataPoints.some((dp) => dp.field.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });
  }, [templates, selectedCategory, searchQuery]);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  const getCategoryColor = (cat: TemplateCategory) => {
    switch (cat) {
      case 'Safety & Statutory':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Mining Operations':
        return 'text-[#FFA726] bg-[#FFA726]/10 border-[#FFA726]/30';
      case 'Production & Dispatch':
        return 'text-[#00D9FF] bg-[#00D9FF]/10 border-[#00D9FF]/30';
      case 'Quality & Beneficiation':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'Asset & Fleet':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'Financial & Capex':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Project & Planning':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'Workforce & HR':
        return 'text-slate-300 bg-slate-800/80 border-slate-700';
      default:
        return 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30';
    }
  };

  const getObligatoryBadge = (status: 'Mandatory' | 'High Priority' | 'Conditional') => {
    if (status === 'Mandatory') {
      return 'bg-red-500/15 border-red-500/30 text-red-400';
    }
    if (status === 'High Priority') {
      return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
    }
    return 'bg-slate-700/40 border-slate-600 text-slate-300';
  };

  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplateId(template.id);
    showToast(
      'Template Blueprint Selected',
      `${template.annexure}: ${template.name} activated for synthesis.`,
      'success'
    );
  };

  const handleOpenModal = (template: ReportTemplate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewTemplate(template);
    setActiveModalTab('schema');
  };

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION HEADER & ACTIVE BLUEPRINT INDICATOR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#00D9FF] uppercase">
              CIL ANNUAL REPORT STRUCTURE · BSE FILING ANNEXURES
            </span>
            <span className="font-mono text-[10px] px-2 py-0.2 rounded bg-amber-500/15 text-[#FFA726] border border-amber-500/30">
              15 Pre-Configured Templates
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-white tracking-tight mt-1">
            Statutory Report Templates
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Select a verified statutory filing schema. Inspect the <strong>Template Schema</strong> detailing required annexures, cross-references, and expected telemetry data points before initiating synthesis.
          </p>
        </div>

        {/* Selected Blueprint Indicator Pill */}
        {activeTemplate && (
          <div className="p-3 rounded-xl bg-slate-900/90 border border-[#00D9FF]/40 shadow-[0_0_15px_rgba(0,217,255,0.15)] flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 max-w-full">
            <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/15 border border-[#00D9FF]/30 flex items-center justify-center text-[#00D9FF] shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                ACTIVE REPORT BLUEPRINT
              </div>
              <div className="text-xs font-bold text-white truncate max-w-full sm:max-w-[280px]">
                {activeTemplate.annexure}: {activeTemplate.name}
              </div>
            </div>
            <button
              onClick={() => handleOpenModal(activeTemplate)}
              className="btn-action px-2.5 py-1 text-[11px] font-medium rounded-lg text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 flex items-center gap-1 shrink-0 cursor-pointer"
              title="Inspect Template Schema"
            >
              <Eye className="w-3 h-3 text-[#00D9FF]" />
              <span>View Schema</span>
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FILTER TABS & SEARCH BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-[#00D9FF]/10">
        {/* Category Filter Buttons with smooth scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
          {categories.map((cat) => {
            const count =
              cat.value === 'All'
                ? templates.length
                : templates.filter((t) => t.category === cat.value).length;
            const isActive = selectedCategory === cat.value;

            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`btn-action px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{cat.label}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-950/60 text-slate-400">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Search */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search templates, annexure, or fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#00D9FF]/50"
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TEMPLATES GRID */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-5">
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;

          return (
            <motion.div
              key={template.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleSelectTemplate(template)}
              className={`mine-card p-4 sm:p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 relative group overflow-hidden ${
                isSelected
                  ? 'border-[#00D9FF] bg-[rgba(15,23,42,0.85)] ring-2 ring-[#00D9FF]/60 shadow-[0_0_25px_rgba(0,217,255,0.2)]'
                  : 'hover:border-[#00D9FF]/40 hover:-translate-y-1 hover:shadow-[0_8px_20px_-4px_rgba(0,217,255,0.12)]'
              }`}
            >
              {/* Top Row: Annexure badge + Category + Radio indicator */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30">
                      {template.annexure}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getCategoryColor(
                        template.category
                      )}`}
                    >
                      {template.relevance}
                    </span>
                  </div>

                  {/* Radio Selection Indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'border-[#00D9FF] bg-[#00D9FF] text-slate-950 shadow-[0_0_8px_#00D9FF]'
                        : 'border-slate-700 bg-slate-900 group-hover:border-slate-500'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Template Title (multi-line supported, never clipped) */}
                <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 min-h-[40px] leading-snug">
                  {template.name}
                </h4>

                {/* Description */}
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                  {template.description}
                </p>

                {/* Expected Schema Metrics Pills */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {template.schema.expectedDataPoints.slice(0, 2).map((dp, i) => (
                    <span
                      key={i}
                      className="font-mono text-[10px] text-slate-300 bg-slate-950/70 border border-slate-800 px-2 py-0.5 rounded truncate max-w-[200px]"
                      title={dp.field}
                    >
                      {dp.field.split('(')[0].trim()}
                    </span>
                  ))}
                  {template.schema.expectedDataPoints.length > 2 && (
                    <span className="font-mono text-[10px] text-cyan-400/90 px-1.5 py-0.5">
                      +{template.schema.expectedDataPoints.length - 2} data points
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                  <span className="text-slate-500">Annexures:</span>
                  <span className="text-white font-semibold">
                    {template.schema.requiredAnnexures.length}
                  </span>
                  <span>·</span>
                  <span className="text-slate-500">Fields:</span>
                  <span className="text-cyan-300 font-semibold font-mono">
                    {template.schema.expectedDataPoints.length}
                  </span>
                </div>

                {/* View Template Schema button */}
                <button
                  onClick={(e) => handleOpenModal(template, e)}
                  className="btn-action flex items-center gap-1.5 text-[11px] text-[#00D9FF] hover:text-cyan-200 transition-colors font-semibold px-2.5 py-1.5 rounded-lg bg-[#00D9FF]/10 hover:bg-[#00D9FF]/20 border border-[#00D9FF]/20 hover:border-[#00D9FF]/40 shadow-sm cursor-pointer ml-auto"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Schema</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DETAIL MODAL: TEMPLATE SCHEMA (REQUIRED ANNEXURES & DATA POINTS) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {previewTemplate && (
          <>
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setPreviewTemplate(null);
                setIsModalMaximized(false);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className={`fixed ${
                isModalMaximized
                  ? 'inset-0 w-full h-full rounded-none border-0 max-w-none max-h-none z-50 p-4 sm:p-8'
                  : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96vw] sm:w-[92vw] max-w-5xl max-h-[92vh] rounded-2xl border border-[#00D9FF]/35 z-50 p-4 sm:p-6 md:p-8'
              } overflow-y-auto bg-[rgba(11,18,33,0.98)] shadow-2xl backdrop-blur-2xl flex flex-col justify-between transition-all duration-200`}
            >
              <div className="space-y-6">
                {/* Modal Top Header */}
                <div className="flex items-start justify-between pb-4 sm:pb-5 border-b border-slate-800 gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-mono font-bold bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/35 shadow-sm">
                        {previewTemplate.annexure}
                      </span>
                      <span
                        className={`px-2 sm:px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-semibold border ${getCategoryColor(
                          previewTemplate.category
                        )}`}
                      >
                        {previewTemplate.relevance}
                      </span>
                      <span className="font-mono text-[10px] sm:text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">{previewTemplate.schema.filingFrequency}</span>
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight pt-1 break-words">
                      {previewTemplate.officialTitle}
                    </h3>

                    <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-cyan-300/80">
                      <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">Benchmark: {previewTemplate.schema.statutoryReference}</span>
                    </div>
                  </div>

                  {/* Header actions: Maximize/Restore + Close */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setIsModalMaximized(!isModalMaximized)}
                      className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                      title={isModalMaximized ? 'Restore Default Window' : 'Maximize to Fullscreen'}
                    >
                      {isModalMaximized ? (
                        <Minimize2 className="w-4 h-4 text-[#FFA726]" />
                      ) : (
                        <Maximize2 className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setPreviewTemplate(null);
                        setIsModalMaximized(false);
                      }}
                      className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Tab Switcher */}
                <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setActiveModalTab('schema')}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      activeModalTab === 'schema'
                        ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Template Schema & Data Points</span>
                  </button>

                  <button
                    onClick={() => setActiveModalTab('sections')}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      activeModalTab === 'sections'
                        ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Section Outlines ({previewTemplate.sections.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveModalTab('sample')}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      activeModalTab === 'sample'
                        ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>BSE Filing Sample Preview</span>
                  </button>
                </div>

                {/* TAB 1: TEMPLATE SCHEMA (REQUIRED ANNEXURES & EXPECTED DATA POINTS) */}
                {activeModalTab === 'schema' && (
                  <div className="space-y-6">
                    {/* A. Required Annexures & Cross-References */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-[#00D9FF]" />
                          <span>1. Mandatory Annexure Cross-References</span>
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400">
                          {previewTemplate.schema.requiredAnnexures.length} Annexures Linked
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {previewTemplate.schema.requiredAnnexures.map((annex, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-xl border flex flex-col justify-between ${
                              annex.type === 'Primary'
                                ? 'bg-cyan-950/30 border-[#00D9FF]/40 shadow-sm'
                                : 'bg-slate-900/60 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono text-xs font-bold text-white">
                                {annex.code}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  annex.mandatory
                                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {annex.mandatory ? 'Mandatory' : 'Complementary'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-300 font-medium leading-tight">
                              {annex.title}
                            </div>
                            <div className="mt-2 text-[10px] font-mono text-cyan-400/80">
                              {annex.type}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* B. Expected Data Points Matrix with Dual View (Cards vs Matrix Table) */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#FFA726]" />
                          <span>2. Expected Field Data Points & Ingestion Specifications</span>
                        </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                            {previewTemplate.schema.expectedDataPoints.length} Data Vectors
                          </span>
                          {/* Cards vs Matrix View Switcher */}
                          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
                            <button
                              type="button"
                              onClick={() => setDataPointsViewMode('cards')}
                              className={`px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors ${
                                dataPointsViewMode === 'cards'
                                  ? 'bg-[#00D9FF]/20 text-[#00D9FF] font-semibold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title="Cards Grid (Adapts on any screen width)"
                            >
                              <LayoutGrid className="w-3 h-3" />
                              <span className="text-[11px]">Card View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDataPointsViewMode('table')}
                              className={`px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors ${
                                dataPointsViewMode === 'table'
                                  ? 'bg-[#00D9FF]/20 text-[#00D9FF] font-semibold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title="Full Matrix Table"
                            >
                              <ListFilter className="w-3 h-3" />
                              <span className="text-[11px]">Matrix Table</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* View 1: Responsive High-Density Card Grid (Never Blinds Any Data on Any Device) */}
                      {dataPointsViewMode === 'cards' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {previewTemplate.schema.expectedDataPoints.map((dp, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-2 hover:border-[#00D9FF]/35 transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-white text-xs leading-snug break-words">
                                  {dp.field}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${getObligatoryBadge(
                                    dp.obligatory
                                  )}`}
                                >
                                  {dp.obligatory}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1.5 border-t border-slate-800/80">
                                <div>
                                  <span className="text-slate-500 block text-[9px] uppercase tracking-wider">
                                    Measurement Unit
                                  </span>
                                  <span className="text-slate-200 font-semibold">{dp.unit}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[9px] uppercase tracking-wider">
                                    Regulatory Norm
                                  </span>
                                  <span className="text-amber-300 font-semibold truncate block" title={dp.threshold}>
                                    {dp.threshold}
                                  </span>
                                </div>
                              </div>
                              <div className="text-[10px] font-mono text-cyan-400/90 flex items-center gap-1.5 pt-0.5">
                                <span className="text-slate-500">Source:</span>
                                <span className="truncate">{dp.sourceFeed}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* View 2: Wide Matrix Table with Container Scroll */}
                      {dataPointsViewMode === 'table' && (
                        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 w-full">
                          <table className="w-full text-left text-xs min-w-[650px]">
                            <thead className="bg-slate-900/90 border-b border-slate-800 font-mono text-[11px] text-cyan-300">
                              <tr>
                                <th className="p-3">DATA POINT / FIELD NAME</th>
                                <th className="p-3">MEASUREMENT UNIT</th>
                                <th className="p-3">INGESTION SOURCE FEED</th>
                                <th className="p-3">REGULATORY THRESHOLD / NORM</th>
                                <th className="p-3 text-right">OBLIGATION</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                              {previewTemplate.schema.expectedDataPoints.map((dp, idx) => (
                                <tr key={idx} className="hover:bg-slate-900/40">
                                  <td className="p-3 font-semibold text-white">
                                    {dp.field}
                                  </td>
                                  <td className="p-3 text-slate-300">
                                    {dp.unit}
                                  </td>
                                  <td className="p-3 text-cyan-400">
                                    {dp.sourceFeed}
                                  </td>
                                  <td className="p-3 text-amber-300">
                                    {dp.threshold}
                                  </td>
                                  <td className="p-3 text-right">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getObligatoryBadge(
                                        dp.obligatory
                                      )}`}
                                    >
                                      {dp.obligatory}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Operational Guidance Callout */}
                    <div className="p-3.5 rounded-xl bg-[#00D9FF]/[0.06] border border-[#00D9FF]/20 flex items-start gap-3 text-xs text-slate-300">
                      <Info className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong>Synthesis Engine Behavior:</strong> Ingested field files in Step 2 (.xlsx, .csv, .pdf) will be automatically scanned and mapped against the above expected data points. Any missing mandatory fields will trigger a compliance prompt before final DGMS signature.
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MANDATORY SECTION OUTLINES */}
                {activeModalTab === 'sections' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">
                      Standard section layout synthesized for official {previewTemplate.annexure} filing:
                    </p>
                    <div className="space-y-2">
                      {previewTemplate.sections.map((sec, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-[#00D9FF]/15 border border-[#00D9FF]/30 flex items-center justify-center font-mono text-[11px] text-[#00D9FF] font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-white">{sec}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 uppercase">
                            Mandatory Dossier Section
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: SAMPLE TABLE PREVIEW */}
                {activeModalTab === 'sample' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">
                      Preview of generated analytical table for {previewTemplate.name}:
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/90 border-b border-slate-800 font-mono text-[11px] text-cyan-300">
                          <tr>
                            {previewTemplate.sampleTablePreview.headers.map((h, i) => (
                              <th key={i} className="p-3">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                          {previewTemplate.sampleTablePreview.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-900/40">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-3">
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
              </div>

              {/* Modal Bottom Footer Actions */}
              <div className="mt-8 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <span>Supported Input Formats:</span>
                  <span className="text-white font-semibold">
                    {previewTemplate.suggestedFormats.join(', ')}
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="btn-action flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Close
                  </button>

                  <button
                    onClick={() => {
                      handleSelectTemplate(previewTemplate);
                      setPreviewTemplate(null);
                    }}
                    className="btn-action shine-sweep flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00D9FF] to-blue-600 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(0,217,255,0.3)] hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Select & Apply Template Schema</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
