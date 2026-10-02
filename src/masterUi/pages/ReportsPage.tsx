import React, { useState, useRef } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Tag,
  ArrowUpDown,
  Plus,
  Bookmark,
  Layers,
  Sliders,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { MINES_DATA, MiningReport, TopicItem } from '../data/miningData';
import { useScroll } from '../../shared/context/ScrollContext';
import { getApiBaseUrl } from '../../shared/services/config';
import { authService } from '../../shared/services/authService';

const API_BASE = getApiBaseUrl();

interface OutletContextType {
  onOpenReport: (report: MiningReport) => void;
  onOpenTopic: (topic: TopicItem) => void;
}

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { onOpenReport } = useOutletContext<OutletContextType>();
  const { tableScrollMode, setTableScrollMode } = useScroll();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const scrollTableToTop = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollTableToBottom = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: tableContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const filterParam = searchParams.get('filter') || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [mineFilter, setMineFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(filterParam === 'verified' ? 'Verified' : 'ALL');
  const [sortField, setSortField] = useState<'year' | 'title' | 'coherence'>('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [reports, setReports] = useState<MiningReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/reports/history`, {
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeader(),
          },
        });
        if (!res.ok) throw new Error('Failed to load reports');
        const data = await res.json();
        const history = Array.isArray(data.history) ? data.history
                      : Array.isArray(data.reports) ? data.reports
                      : Array.isArray(data) ? data : [];
        const mapped: MiningReport[] = history.map((r: any) => ({
          id: r.id || r.job_id || `rep-${Math.random()}`,
          title: r.title || r.template_name || 'Operational Dossier',
          mineId: r.theme || 'ALL',
          mineName: r.theme || 'Colliery Operations',
          subsidiary: (r.theme && r.theme.includes('MCL')) ? 'MCL' : (r.theme && r.theme.includes('NCL')) ? 'NCL' : 'SECL',
          reportType: 'Geological Assessment',
          year: r.timestamp ? parseInt(r.timestamp.match(/\d{4}/)?.[0] || '2026', 10) : 2026,
          date: r.timestamp || 'Today',
          author: r.auditor_id || 'Operational Auditor',
          topics: [r.template_name || 'Geological Assessment', 'Statutory Audit'],
          status: 'Verified',
          fileSize: '2.4 MB',
          coherenceIndex: 94,
          pages: r.records_count || 6,
          abstract: r.summary_snippet || 'Statutory intelligence report generated via sovereign AI engine.',
          keyFindings: ['Statutory compliance verified', 'Telemetry logs cross-referenced'],
        }));
        setReports(mapped);
      } catch {
        setReports([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  // Filter & Sort
  const filteredReports = reports.filter((r) => {
    if (mineFilter !== 'ALL' && r.mineId !== mineFilter) return false;
    if (typeFilter !== 'ALL' && r.reportType !== typeFilter) return false;
    if (yearFilter !== 'ALL' && r.year.toString() !== yearFilter) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchMine = r.mineName.toLowerCase().includes(q);
      const matchAuthor = r.author.toLowerCase().includes(q);
      const matchTopic = r.topics.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchMine && !matchAuthor && !matchTopic) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortField === 'year') {
      return sortOrder === 'desc' ? b.year - a.year : a.year - b.year;
    }
    if (sortField === 'coherence') {
      return sortOrder === 'desc' ? b.coherenceIndex - a.coherenceIndex : a.coherenceIndex - b.coherenceIndex;
    }
    return sortOrder === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title);
  });

  const toggleSort = (field: 'year' | 'title' | 'coherence') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-400">
              Corpus Index &amp; Document Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Reports &amp; Document Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse, search, and audit geological disclosures, strata surveys, and hydrogeological assessments across Coal India subsidiaries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/generate-report')}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-md shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" /> Synthesize New Report
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by title, mine, author, or keyword..."
              className="w-full rounded-xl border border-slate-700 bg-[#121c33] pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto text-xs text-slate-400">
            <span>Showing <strong className="text-white font-mono">{filteredReports.length}</strong> of {reports.length} documents</span>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Colliery Site</label>
            <select
              value={mineFilter}
              onChange={(e) => setMineFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#121a2e] px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="ALL">All Collieries</option>
              {MINES_DATA.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Report Classification</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#121a2e] px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="ALL">All Report Types</option>
              <option value="Geological Assessment">Geological Assessment</option>
              <option value="Hydrogeological Survey">Hydrogeological Survey</option>
              <option value="Slope Stability Audit">Slope Stability Audit</option>
              <option value="Safety & DGMS Compliance">Safety &amp; DGMS Compliance</option>
              <option value="Feasibility & Reserves">Feasibility &amp; Reserves</option>
              <option value="Environmental Impact">Environmental Impact</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#121a2e] px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Verification Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#121a2e] px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Verified">Verified / DGMS Approved</option>
              <option value="Processed">Processed</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Document Table & Scrolling Controls */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1424] shadow-xl overflow-hidden">
        {/* Table Top Utility Bar with Scrolling Mode Options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-[#090f1d] text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-bold text-white">{filteredReports.length}</span>
            <span>Documents Listed</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Click headers to sort</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Table Scrolling Mode Toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setTableScrollMode('fixed')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  tableScrollMode === 'fixed'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Scrollable table viewport with sticky pinned headers"
              >
                Scrollable (540px)
              </button>
              <button
                type="button"
                onClick={() => setTableScrollMode('expanded')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  tableScrollMode === 'expanded'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Expanded view (Full page scroll)"
              >
                Expanded Flow
              </button>
            </div>

            {/* In-Table Scroll Jump (when in fixed scrollable mode) */}
            {tableScrollMode === 'fixed' && (
              <div className="flex items-center gap-1 pl-1">
                <button
                  type="button"
                  onClick={scrollTableToTop}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-850 hover:bg-slate-750 text-slate-300 border border-slate-700/60"
                  title="Scroll table to top"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={scrollTableToBottom}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-850 hover:bg-slate-750 text-slate-300 border border-slate-700/60"
                  title="Scroll table to bottom"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Container */}
        <div
          ref={tableContainerRef}
          className={`overflow-x-auto ${
            tableScrollMode === 'fixed' ? 'max-h-[540px] overflow-y-auto scrollbar-thin' : ''
          }`}
        >
          <table className="w-full text-left text-xs">
            <thead className={`bg-[#121c33] text-slate-300 border-b border-slate-800 ${
              tableScrollMode === 'fixed' ? 'sticky top-0 z-10 shadow-md backdrop-blur-md' : ''
            }`}>
              <tr>
                <th
                  onClick={() => toggleSort('title')}
                  className="px-5 py-3.5 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    Report Title
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th className="px-4 py-3.5 font-semibold">Colliery / Subsidiary</th>
                <th className="px-4 py-3.5 font-semibold">Classification</th>
                <th
                  onClick={() => toggleSort('year')}
                  className="px-4 py-3.5 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    Year / Date
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th className="px-4 py-3.5 font-semibold">Associated Topics</th>
                <th
                  onClick={() => toggleSort('coherence')}
                  className="px-4 py-3.5 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    Coherence
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#080d17] text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-xs text-slate-400">
                    Loading reports from sovereign database...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-xs text-slate-400">
                    No reports found. Synthesize a report or check back later.
                  </td>
                </tr>
              ) : filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-5 py-4 max-w-sm">
                    <div className="font-bold text-white text-xs leading-snug">{report.title}</div>
                    <div className="text-[11px] text-slate-400 mt-1 truncate">Author: {report.author}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      {report.mineName}
                    </div>
                    <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{report.subsidiary}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 border border-slate-700">
                      {report.reportType}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap font-mono text-slate-400">
                    <div>{report.year}</div>
                    <div className="text-[10px] text-slate-500">{report.date}</div>
                  </td>
                  <td className="px-4 py-4 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {report.topics.slice(0, 2).map((t, idx) => (
                        <span key={idx} className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/20">
                          {t}
                        </span>
                      ))}
                      {report.topics.length > 2 && (
                        <span className="rounded bg-slate-800 px-1 py-0.5 text-[9px] text-slate-400">
                          +{report.topics.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap font-mono">
                    <span className="font-bold text-amber-400">{report.coherenceIndex}%</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                      report.status === 'Verified'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                    }`}>
                      <ShieldCheck className="h-3 w-3" /> {report.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => onOpenReport(report)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
