import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Search,
  SlidersHorizontal,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Download,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Send,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authService } from '../../shared/services/authService';
import { ReportItem, ReportStatus } from '../types';

type TabType = 'All' | 'Draft' | 'Ready' | 'Pending' | 'Approved' | 'Rejected';

export const MyReports: React.FC = () => {
  const { reports, deleteReport, submitForReview, refreshReportsFromServer } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    refreshReportsFromServer();
    const interval = setInterval(() => {
      refreshReportsFromServer();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Drawer filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateRange, setDateRange] = useState<string>('All Time');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const all = reports.length;
    const draft = reports.filter((r) => r.status === 'Draft').length;
    const ready = reports.filter((r) => r.status === 'Ready').length;
    const pending = reports.filter((r) => r.status === 'Pending').length;
    const approved = reports.filter((r) => r.status === 'Approved').length;
    const rejected = reports.filter((r) => r.status === 'Rejected').length;
    return { All: all, Draft: draft, Ready: ready, Pending: pending, Approved: approved, Rejected: rejected };
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Tab filter
      if (activeTab !== 'All' && report.status !== activeTab) {
        return false;
      }
      // Category drawer filter
      if (selectedCategory !== 'All' && report.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = report.title.toLowerCase().includes(query);
        const matchesId = report.id.toLowerCase().includes(query);
        const matchesCategory = report.category.toLowerCase().includes(query);
        if (!matchesTitle && !matchesId && !matchesCategory) return false;
      }
      return true;
    });
  }, [reports, activeTab, selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredReports.length / rowsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredReports.slice(start, start + rowsPerPage);
  }, [filteredReports, currentPage, rowsPerPage]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleRowClick = (id: string) => {
    navigate(`/worker/preview/${id}`);
  };

  const categories = [
    'All',
    'Safety Audit',
    'Ventilation',
    'Production',
    'Maintenance',
    'Environmental',
    'Geotechnical',
    'DGMS Compliance',
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* PAGE HEADER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-[#00D9FF] uppercase">
            REGIONAL REPORT LEDGER
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mt-1">
            My Operational Reports
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Historical filings, statutory safety dossiers, and pending approvals for North Ridge District.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={() => refreshReportsFromServer()}
            className="btn-action flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-[#00D9FF]/40 text-slate-200 text-xs font-semibold shadow-sm transition-all"
            title="Refresh reports"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>Refresh</span>
          </button>

          {/* Filters Button */}
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className="btn-action flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-[#00D9FF]/40 text-slate-200 text-xs font-semibold shadow-sm transition-all"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>Filters</span>
            {(selectedCategory !== 'All' || dateRange !== 'All Time') && (
              <span className="w-2 h-2 rounded-full bg-[#FFA726]" />
            )}
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FILTER TABS WITH ANIMATED SLIDING UNDERLINE */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#00D9FF]/12 pb-1">
        {/* Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto">
          {(['All', 'Draft', 'Ready', 'Pending', 'Approved', 'Rejected'] as TabType[]).map((tab) => {
            const count = tabCounts[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`relative pb-3 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {count}
                </span>

                {/* Animated cyan sliding underline 3px */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00D9FF] shadow-[0_0_8px_#00D9FF] rounded-t-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Live Search bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search report ID, title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#00D9FF]/40"
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* REPORTS TABLE (72px rows, glassmorphic) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mine-card overflow-hidden">
        {reports.length === 0 ? (
          /* Empty state when user has no reports yet */
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-center mb-4">
              <FolderOpen className="w-12 h-12 text-slate-500" />
            </div>
            <h4 className="text-base font-semibold text-white">No reports yet.</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              No operational dossiers filed for your account.
            </p>
            <Link
              to="/worker/new-report"
              className="mt-4 px-4 py-2 rounded-xl bg-[#00D9FF]/15 border border-[#00D9FF]/40 text-[#00D9FF] text-xs font-semibold hover:bg-[#00D9FF]/25 transition-colors"
            >
              Create your first report
            </Link>
          </div>
        ) : paginatedReports.length === 0 ? (
          /* Empty state */
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-center mb-4">
              <FolderOpen className="w-12 h-12 text-slate-500" />
            </div>
            <h4 className="text-base font-semibold text-white">No Reports Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              No field dossiers match the selected tab or criteria.
            </p>
            <button
              onClick={() => {
                setActiveTab('All');
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="btn-action mt-4 px-4 py-2 rounded-lg bg-slate-800 text-xs text-cyan-300 hover:bg-slate-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View (<640px) */}
            <div className="sm:hidden divide-y divide-[#00D9FF]/[0.08]">
              {paginatedReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleRowClick(report.id)}
                  className="p-3.5 space-y-2.5 hover:bg-[rgba(0,217,255,0.04)] cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate max-w-[190px]">
                          {report.title}
                        </div>
                        <div className="font-mono text-[10px] text-cyan-400/90">{report.id}</div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {(report.status === 'Draft' || report.status === 'Ready') && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/40 border border-slate-600/60 text-slate-300">
                          {report.status}
                        </span>
                      )}
                      {report.status === 'Approved' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 border border-green-500/30 text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {report.status === 'Pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {report.status === 'Rejected' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 border border-red-500/30 text-red-400">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                    <div>
                      <span>{report.category}</span> · <span>{report.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {(report.status === 'Draft' || report.status === 'Ready') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            submitForReview(report.id);
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                          title="Submit for approval"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/worker/preview/${report.id}`)}
                        className="p-1 rounded-lg text-slate-400 hover:text-cyan-300"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/worker/export/${report.id}`)}
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-400"
                        title="Export"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop Table (>=640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[rgba(0,217,255,0.05)] border-b border-[#00D9FF]/10 text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                    <th className="py-3 px-6">REPORT TITLE & ID</th>
                    <th className="py-3 px-6">CREATED DATE</th>
                    <th className="py-3 px-6">CATEGORY</th>
                    <th className="py-3 px-6">SOURCES</th>
                    <th className="py-3 px-6">STATUS</th>
                    <th className="py-3 px-6 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00D9FF]/[0.07]">
                  {paginatedReports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => handleRowClick(report.id)}
                      className="h-[72px] hover:bg-[rgba(0,217,255,0.04)] cursor-pointer transition-colors group"
                    >
                      {/* Title + ID */}
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-[#00D9FF]/40 flex items-center justify-center shrink-0 transition-colors">
                            <FileText className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white group-hover:text-[#00D9FF] transition-colors truncate max-w-[280px]">
                              {report.title}
                            </div>
                            <div className="font-mono text-xs text-slate-400 mt-0.5">
                              {report.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-6">
                        <span className="font-mono text-xs text-slate-300">
                          {report.createdAt}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-6">
                        <span className="text-xs text-slate-300 font-medium">
                          {report.category}
                        </span>
                      </td>

                      {/* Sources Count */}
                      <td className="py-3 px-6">
                        <span className="font-mono text-xs text-slate-400">
                          {report.sourcesCount} files · {report.pagesCount}p
                        </span>
                      </td>

                      {/* Status Pill */}
                      <td className="py-3 px-6">
                        {(report.status === 'Draft' || report.status === 'Ready') && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/40 border border-slate-600/60 text-slate-300">
                            {report.status}
                          </span>
                        )}
                        {report.status === 'Approved' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 border border-green-500/30 text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                            Approved
                          </span>
                        )}
                        {report.status === 'Pending' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            Pending
                          </span>
                        )}
                        {report.status === 'Rejected' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400">
                            <XCircle className="w-3.5 h-3.5" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td
                        className="py-3 px-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {(report.status === 'Draft' || report.status === 'Ready') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                submitForReview(report.id);
                              }}
                              className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                              title="Submit for approval"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/worker/preview/${report.id}`)}
                            className="p-2 rounded-lg text-slate-400 hover:text-[#00D9FF] hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/worker/export/${report.id}`)}
                            className="p-2 rounded-lg text-slate-400 hover:text-[#FFA726] hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Export dossier"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteReport(report.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete dossier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Table Pagination Footer */}
        {filteredReports.length > rowsPerPage && (
          <div className="p-4 border-t border-[#00D9FF]/10 flex items-center justify-between text-xs font-mono text-slate-400">
            <div>
              Showing{' '}
              <strong className="text-white">
                {(currentPage - 1) * rowsPerPage + 1}-
                {Math.min(currentPage * rowsPerPage, filteredReports.length)}
              </strong>{' '}
              of <strong className="text-white">{filteredReports.length}</strong> reports
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-action p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#00D9FF]/40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-white font-semibold">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-action p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#00D9FF]/40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RIGHT-SIDE DRAWER WITH DATE RANGE + REPORT TYPE + STATUS FILTERS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-80 sm:w-96 bg-[rgba(8,13,22,0.96)] border-l border-[#00D9FF]/20 shadow-2xl backdrop-blur-2xl z-50 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#00D9FF]" />
                    <h3 className="text-base font-semibold text-white">Filter Parameters</h3>
                  </div>
                  <button
                    onClick={() => setIsFilterDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Filter 1: Status */}
                  <div>
                    <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
                      Review Status
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['All', 'Approved', 'Pending', 'Rejected'] as TabType[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleTabChange(st)}
                          className={`py-2 px-3 rounded-lg text-xs font-medium border text-left transition-all ${
                            activeTab === st
                              ? 'bg-[#00D9FF]/15 border-[#00D9FF] text-[#00D9FF]'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {st} ({tabCounts[st]})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filter 2: Report Category */}
                  <div>
                    <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
                      Operational Discipline
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-[#00D9FF]/50"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter 3: Date Range */}
                  <div>
                    <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
                      Date Range
                    </label>
                    <div className="space-y-2">
                      {['All Time', 'Past 7 Days', 'Current Month (Sep 2026)', 'Q2 Fiscal Period'].map(
                        (period) => (
                          <button
                            key={period}
                            onClick={() => setDateRange(period)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-medium border text-left transition-all flex items-center justify-between ${
                              dateRange === period
                                ? 'bg-[#00D9FF]/15 border-[#00D9FF] text-[#00D9FF]'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span>{period}</span>
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer footer buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setDateRange('All Time');
                    setActiveTab('All');
                    setIsFilterDrawerOpen(false);
                  }}
                  className="btn-action flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 text-center"
                >
                  Reset
                </button>
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="btn-action flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00D9FF] to-blue-600 text-slate-950 font-semibold text-xs text-center shadow-[0_0_15px_rgba(0,217,255,0.2)]"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
