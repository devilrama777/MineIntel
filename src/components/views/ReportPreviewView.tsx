import React, { useState } from 'react';
import {
  FileText,
  ZoomIn,
  ZoomOut,
  Printer,
  Download,
  CheckCircle2,
  Table as TableIcon,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ReportItem, ReportSectionNode, EditorBlock } from '../../types';

interface ReportPreviewViewProps {
  report: ReportItem;
  sections: ReportSectionNode[];
  blocks: EditorBlock[];
  onNavigateToExport: () => void;
}

export const ReportPreviewView: React.FC<ReportPreviewViewProps> = ({
  report,
  sections,
  blocks,
  onNavigateToExport,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activePage, setActivePage] = useState<number>(1);
  const totalPages = 4;

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(150, Math.max(65, prev + delta)));
  };

  const handlePrint = () => {
    const prevZoom = zoomLevel;
    setZoomLevel(100);
    setTimeout(() => {
      window.print();
      setZoomLevel(prevZoom);
    }, 60);
  };

  const scrollToPage = (pageNumber: number) => {
    setActivePage(pageNumber);
    const element = document.getElementById(`preview-page-${pageNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const pagesInfo = [
    { page: 1, title: 'Cover & Executive Summary', subtitle: 'Section 1.0 Overview & Key Metrics' },
    { page: 2, title: 'Geological Stratigraphy', subtitle: 'Section 2.0 Borehole Drill Logs (Table 2.1)' },
    { page: 3, title: 'Coal Quality & Laboratory Assay', subtitle: 'Section 3.0 Proximate Analysis (Table 3.1)' },
    { page: 4, title: 'Geotechnical & Statutory Audit', subtitle: 'Section 4.0 - 6.0 Slope FoS & Provenance' },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-[#0b0f17]">
      {/* Top Preview Control Bar */}
      <div className="no-print h-12 bg-[#121824] border-b border-[#1f2b3d] px-5 flex items-center justify-between text-xs select-none shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="font-mono font-bold text-slate-100 truncate max-w-md">
            {report?.name || 'Consolidated Technical & Geological Evaluation (Block ML-492)'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            AUTONOMOUS REPORT • 4 A4 PAGES COMPILED
          </span>
        </div>

        {/* Page & Zoom Controls */}
        <div className="flex items-center gap-3">
          {/* Page Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 font-mono text-xs text-slate-300">
            <button
              type="button"
              onClick={() => scrollToPage(Math.max(1, activePage - 1))}
              disabled={activePage === 1}
              className="p-0.5 rounded hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-1 font-semibold">
              Page <strong className="text-white">{activePage}</strong> of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => scrollToPage(Math.min(totalPages, activePage + 1))}
              disabled={activePage === totalPages}
              className="p-0.5 rounded hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 font-mono text-xs text-slate-300 bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => handleZoom(-10)}
              className="p-1 rounded hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center text-[11px] font-bold">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => handleZoom(10)}
              className="p-1 rounded hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-mono text-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToExport}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded font-mono text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Page & Section Navigation */}
        <div className="no-print w-64 bg-[#0f141f] border-r border-[#1f2b3d] flex flex-col shrink-0 select-none">
          <div className="p-3 border-b border-[#1f2b3d] bg-[#111722] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 font-bold">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              DOCUMENT PAGES
            </span>
            <span className="text-emerald-400 font-bold">{totalPages} PAGES</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {pagesInfo.map((p) => {
              const isActive = p.page === activePage;
              return (
                <button
                  key={p.page}
                  type="button"
                  onClick={() => scrollToPage(p.page)}
                  className={`w-full text-left p-2.5 rounded transition text-xs font-mono flex items-start gap-2.5 cursor-pointer ${
                    isActive
                      ? 'bg-blue-950/60 border border-blue-500 text-blue-200 shadow-md font-semibold'
                      : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {p.page}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-200">{p.title}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Verification Badge Footer */}
          <div className="p-3 border-t border-slate-800 bg-[#0c1018] text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DGMS / CIL VERIFIED</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Audit Score: 98% • Airgap Enforced
            </div>
          </div>
        </div>

        {/* Center: Discrete Multi-Page A4 Document Canvas */}
        <div className="preview-canvas-wrapper flex-1 overflow-y-auto p-8 flex flex-col items-center bg-[#070a0f] space-y-8">
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="preview-pages-container transition-transform duration-100 ease-out flex flex-col items-center space-y-8 pb-16"
          >
            {/* ========================================================================= */}
            {/* PAGE 1: TITLE & EXECUTIVE OVERVIEW */}
            {/* ========================================================================= */}
            <div
              id="preview-page-1"
              className="report-preview-page w-[820px] min-h-[1160px] bg-white text-slate-900 shadow-2xl p-12 flex flex-col justify-between select-text rounded-xs"
            >
              {/* Running Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between text-[11px] text-slate-600 font-mono uppercase tracking-wider">
                <span className="font-bold text-slate-900">MineIntel • Autonomous Geological & Mine Technical Evaluation</span>
                <span className="text-blue-900 font-semibold">Block ML-492 • Q4 FY26</span>
              </div>

              {/* Page 1 Body */}
              <div className="py-6 space-y-6 flex-1">
                {/* Title Banner */}
                <div className="border-b border-slate-200 pb-5">
                  <div className="text-xs font-mono font-bold text-blue-900 uppercase tracking-widest mb-1">
                    Statutory Mining Technical Report
                  </div>
                  <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight leading-snug">
                    Consolidated Geological & Mine Technical Evaluation
                  </h1>
                  <p className="text-xs text-slate-600 font-mono mt-1">
                    Mining Lease Concession Block ML-492 (24.8 sq km) • WGS84 UTM Zone 45N
                  </p>
                </div>

                {/* Key Summary Cards Bar */}
                <div className="grid grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Proved Reserves</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">42.6 MT</div>
                    <div className="text-[9px] text-slate-400">Mineable Coal</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Primary Intercept</div>
                    <div className="text-base font-extrabold text-blue-900 mt-0.5">9.6 m</div>
                    <div className="text-[9px] text-slate-400">Seam II (Clean Coal)</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Coal Grade (GCV)</div>
                    <div className="text-base font-extrabold text-emerald-900 mt-0.5">G8 (5,420)</div>
                    <div className="text-[9px] text-slate-400">kcal/kg Composite</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Slope Safety (FoS)</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">1.42</div>
                    <div className="text-[9px] text-emerald-700 font-semibold">DGMS Compliant</div>
                  </div>
                </div>

                {/* Section 1: Executive Summary */}
                <div className="space-y-3 pt-2">
                  <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span>1.0 Executive Summary & Mine Concession Overview</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">[EVID-005]</span>
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify">
                    This technical synthesis compiles multi-source exploration drilling, certified laboratory proximate assays, geotechnical field observations, and production telemetry for Mining Lease Block ML-492 (24.8 sq km). All survey benchmarks are referenced in UTM Zone 45N (WGS84 datum, Northing 2634100m to 2638500m, Easting 432100m to 437400m) in strict conformance with CIL/CMPDI statutory exploration protocols. Exploration confirms a high-value bituminous deposit amenable to open-cast mechanized extraction.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    1.1 Tenement Description & Survey Controls
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify">
                    The exploration block covers an aggregate area of 2,480 hectares with moderate undulating topography. Benchmarks have been permanently monumented with differential GPS (DGPS) survey baselines. Stratigraphic strike trends NW-SE with gentle dip angles varying between 6° and 9° towards the south-west, ensuring continuous, fault-free seam continuity across the central mine quadrant.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 space-y-1.5 font-mono">
                  <div className="font-bold text-slate-900">Key Concession Parameters:</div>
                  <div>• Concession Name: Central Coalfields Exploration Block ML-492</div>
                  <div>• Allocated Boundary: 24.8 sq km (Allotted under statutory mineral development rules)</div>
                  <div>• Target Seams: Seam I (Lower), Seam II (Main Prime), Seam III (Upper Thermal)</div>
                  <div>• Exploration Standard: CMPDI Exploration Manual Revision 2024 (100% Core Recovery)</div>
                </div>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-300 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>CONFIDENTIAL • MINING LEASE BLOCK ML-492 • STATUTORY DISCLOSURE ONLY</span>
                <span>MineIntel Verified • Page 1 of 4</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PAGE 2: GEOLOGICAL STRATIGRAPHY & DRILLHOLE LOGS */}
            {/* ========================================================================= */}
            <div
              id="preview-page-2"
              className="report-preview-page w-[820px] min-h-[1160px] bg-white text-slate-900 shadow-2xl p-12 flex flex-col justify-between select-text rounded-xs"
            >
              {/* Running Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between text-[11px] text-slate-600 font-mono uppercase tracking-wider">
                <span className="font-bold text-slate-900">MineIntel • Autonomous Geological & Mine Technical Evaluation</span>
                <span className="text-blue-900 font-semibold">Block ML-492 • Q4 FY26</span>
              </div>

              {/* Page 2 Body */}
              <div className="py-6 space-y-6 flex-1">
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span>2.0 Geological Stratigraphy & Core Drillhole Logs</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">[EVID-001, EVID-006]</span>
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify">
                    Exploration diamond core drilling confirmed persistent lateral continuity of three primary coal seams across the tenement. Borehole BH-2026-04 intercepted prime metallurgical Seam II at depth 45.2m to 54.8m with a clean net thickness of 9.6m, displaying low dirt-band inclusion and favorable hanging-wall sandstone competence.
                  </p>
                </div>

                {/* Table 2.1 */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono font-bold text-slate-800">
                    Table 2.1: Key Exploration Borehole Core Intercepts & Seam Assay Matrix
                  </div>
                  <table className="w-full text-[11px] font-mono border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                        <th className="p-2 text-left border-r border-slate-300">Borehole ID</th>
                        <th className="p-2 text-left border-r border-slate-300">Target Seam</th>
                        <th className="p-2 text-right border-r border-slate-300">Depth (m)</th>
                        <th className="p-2 text-right border-r border-slate-300">Thickness (m)</th>
                        <th className="p-2 text-right border-r border-slate-300">Ash (%)</th>
                        <th className="p-2 text-right border-r border-slate-300">GCV (kcal/kg)</th>
                        <th className="p-2 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      <tr>
                        <td className="p-2 border-r border-slate-300 font-semibold">BH-2026-01</td>
                        <td className="p-2 border-r border-slate-300">Seam I</td>
                        <td className="p-2 border-r border-slate-300 text-right">28.4 – 33.6</td>
                        <td className="p-2 border-r border-slate-300 text-right font-medium">5.2</td>
                        <td className="p-2 border-r border-slate-300 text-right">22.1%</td>
                        <td className="p-2 border-r border-slate-300 text-right">5,680</td>
                        <td className="p-2 text-center text-emerald-800 font-semibold">G7</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-300 font-semibold">BH-2026-02</td>
                        <td className="p-2 border-r border-slate-300">Seam I</td>
                        <td className="p-2 border-r border-slate-300 text-right">31.0 – 36.8</td>
                        <td className="p-2 border-r border-slate-300 text-right font-medium">5.8</td>
                        <td className="p-2 border-r border-slate-300 text-right">21.4%</td>
                        <td className="p-2 border-r border-slate-300 text-right">5,740</td>
                        <td className="p-2 text-center text-emerald-800 font-semibold">G7</td>
                      </tr>
                      <tr className="bg-blue-50/60 font-semibold">
                        <td className="p-2 border-r border-slate-300 text-blue-900">BH-2026-04</td>
                        <td className="p-2 border-r border-slate-300 text-blue-900">Seam II (Prime)</td>
                        <td className="p-2 border-r border-slate-300 text-right">45.2 – 54.8</td>
                        <td className="p-2 border-r border-slate-300 text-right text-emerald-800 font-bold">9.6</td>
                        <td className="p-2 border-r border-slate-300 text-right">18.4%</td>
                        <td className="p-2 border-r border-slate-300 text-right font-bold text-blue-900">6,120</td>
                        <td className="p-2 text-center text-emerald-800 font-bold">G4</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-300 font-semibold">BH-2026-05</td>
                        <td className="p-2 border-r border-slate-300">Seam III</td>
                        <td className="p-2 border-r border-slate-300 text-right">78.5 – 84.1</td>
                        <td className="p-2 border-r border-slate-300 text-right font-medium">5.6</td>
                        <td className="p-2 border-r border-slate-300 text-right">26.8%</td>
                        <td className="p-2 border-r border-slate-300 text-right">5,150</td>
                        <td className="p-2 text-center text-amber-800 font-semibold">G9</td>
                      </tr>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td className="p-2 border-r border-slate-300" colSpan={3}>Proved Cumulative Reserve</td>
                        <td className="p-2 border-r border-slate-300 text-right text-emerald-800">26.2 m</td>
                        <td className="p-2 border-r border-slate-300 text-right">22.2%</td>
                        <td className="p-2 border-r border-slate-300 text-right">5,672</td>
                        <td className="p-2 text-center text-blue-900">42.6 MT</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-slate-800">
                    2.1 Coal Seam Continuity & Resource Classification
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify">
                    Geostatistical interpolation across 25 boreholes confirms that Seam II exhibits exceptional uniformity with standard deviation in thickness below ±0.45 meters. The core recovery across all coal intersections averaged 96.4%, satisfying the statutory threshold for JORC/UNFC Proved Resource classification.
                  </p>
                </div>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-300 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>CONFIDENTIAL • MINING LEASE BLOCK ML-492 • STATUTORY DISCLOSURE ONLY</span>
                <span>MineIntel Verified • Page 2 of 4</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PAGE 3: COAL QUALITY & LABORATORY ASSAYS */}
            {/* ========================================================================= */}
            <div
              id="preview-page-3"
              className="report-preview-page w-[820px] min-h-[1160px] bg-white text-slate-900 shadow-2xl p-12 flex flex-col justify-between select-text rounded-xs"
            >
              {/* Running Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between text-[11px] text-slate-600 font-mono uppercase tracking-wider">
                <span className="font-bold text-slate-900">MineIntel • Autonomous Geological & Mine Technical Evaluation</span>
                <span className="text-blue-900 font-semibold">Block ML-492 • Q4 FY26</span>
              </div>

              {/* Page 3 Body */}
              <div className="py-6 space-y-6 flex-1">
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span>3.0 Coal Quality & Certified Laboratory Assay</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">[EVID-002]</span>
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify">
                    Certified proximate and ultimate analysis of drill core composites by the NABL-accredited Central Testing Laboratory indicates consistent medium-rank bituminous coal with low total sulfur (0.48%) and high ash fusion temperature (1,380°C).
                  </p>
                </div>

                {/* Table 3.1 */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono font-bold text-slate-800">
                    Table 3.1: Certified Composite Proximate & Ultimate Assay Results (IS 1350)
                  </div>
                  <table className="w-full text-[11px] font-mono border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                        <th className="p-2 text-left border-r border-slate-300">Parameter</th>
                        <th className="p-2 text-right border-r border-slate-300">Measured Value</th>
                        <th className="p-2 text-left border-r border-slate-300">Standard Test Method</th>
                        <th className="p-2 text-center">Statutory Compliance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      <tr>
                        <td className="p-2 border-r border-slate-300 font-medium">Total Moisture</td>
                        <td className="p-2 border-r border-slate-300 text-right font-bold">6.8%</td>
                        <td className="p-2 border-r border-slate-300">IS 1350 (Part I)</td>
                        <td className="p-2 text-center text-emerald-800 font-semibold">Pass (&lt; 10%)</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-300 font-medium">Ash Content (air-dried)</td>
                        <td className="p-2 border-r border-slate-300 text-right font-bold text-blue-900">24.2%</td>
                        <td className="p-2 border-r border-slate-300">IS 1350 (Part I)</td>
                        <td className="p-2 text-center text-blue-900 font-semibold">Grade G8 Band</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-300 font-medium">Volatile Matter</td>
                        <td className="p-2 border-r border-slate-300 text-right font-bold">28.5%</td>
                        <td className="p-2 border-r border-slate-300">IS 1350 (Part I)</td>
                        <td className="p-2 text-center text-emerald-800 font-semibold">Pass (25.0 – 32.0%)</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-300 font-medium">Fixed Carbon</td>
                        <td className="p-2 border-r border-slate-300 text-right font-bold">40.5%</td>
                        <td className="p-2 border-r border-slate-300">By difference</td>
                        <td className="p-2 text-center text-emerald-800 font-semibold">Pass (&gt; 38.0%)</td>
                      </tr>
                      <tr className="bg-emerald-50/50">
                        <td className="p-2 border-r border-slate-300 font-bold text-slate-900">Gross Calorific Value (GCV)</td>
                        <td className="p-2 border-r border-slate-300 text-right font-bold text-emerald-900">5,420 kcal/kg</td>
                        <td className="p-2 border-r border-slate-300">Bomb Calorimeter</td>
                        <td className="p-2 text-center font-bold text-emerald-900">Grade G8 Verified</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-300 font-medium">Total Sulfur</td>
                        <td className="p-2 border-r border-slate-300 text-right font-bold">0.48%</td>
                        <td className="p-2 border-r border-slate-300">Eschka Method</td>
                        <td className="p-2 text-center text-emerald-800 font-semibold">Low Sulfur (&lt; 0.80%)</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-300 font-medium">Ash Fusion Temp (IDT)</td>
                        <td className="p-2 border-r border-slate-300 text-right font-bold">1,380°C</td>
                        <td className="p-2 border-r border-slate-300">IS 1350 (Part II)</td>
                        <td className="p-2 text-center text-emerald-800 font-semibold">High Refractory</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-slate-800">
                    3.1 Beneficiation & Utilization Feasibility
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify">
                    Float-sink washability tests indicate that heavy medium cyclone beneficiation at 1.45 specific gravity reduces overall ash content to 14.2% with a clean coal yield of 74.8%. This enables dual commercial off-take: washed coking coal fractions for steel plant blending and washed thermal middlings for supercritical power generation.
                  </p>
                </div>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-300 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>CONFIDENTIAL • MINING LEASE BLOCK ML-492 • STATUTORY DISCLOSURE ONLY</span>
                <span>MineIntel Verified • Page 3 of 4</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PAGE 4: GEOTECHNICAL STABILITY, PRODUCTION & AUDIT ASSURANCE */}
            {/* ========================================================================= */}
            <div
              id="preview-page-4"
              className="report-preview-page w-[820px] min-h-[1160px] bg-white text-slate-900 shadow-2xl p-12 flex flex-col justify-between select-text rounded-xs"
            >
              {/* Running Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between text-[11px] text-slate-600 font-mono uppercase tracking-wider">
                <span className="font-bold text-slate-900">MineIntel • Autonomous Geological & Mine Technical Evaluation</span>
                <span className="text-blue-900 font-semibold">Block ML-492 • Q4 FY26</span>
              </div>

              {/* Page 4 Body */}
              <div className="py-6 space-y-6 flex-1">
                {/* Section 4: Geotechnical */}
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span>4.0 Geotechnical Slope Stability Assessment</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">[EVID-003]</span>
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify">
                    Geotechnical mapping of highwall bench #4 confirms competent sandstone overburden with Rock Mass Rating (RMR) of 68 (Good Rock). Calculated Factor of Safety is 1.42 under dry state and 1.31 under saturated conditions, safely exceeding the DGMS minimum threshold of 1.30. Bench face angles of 70° with 15m safety berms are officially approved.
                  </p>
                </div>

                {/* Section 5: Production Telemetry */}
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span>5.0 Mine Production & Stripping Ratio Telemetry</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">[EVID-004]</span>
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify">
                    Monthly excavation telemetry indicates Run-of-Mine coal production of 245,000 MT/month with overburden removal of 680,000 m3/month, yielding an operational Stripping Ratio of 2.78 m3/MT. Equipment availability across the primary shovel and 100T dump truck fleet remained at 84.6% throughout the quarter.
                  </p>
                </div>

                {/* Section 6: Statutory Audit Assurance Box */}
                <div className="space-y-3 pt-2">
                  <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span>6.0 Statutory QA/QC Audit Trail & Regulatory Certification</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">[AIRGAP VERIFIED]</span>
                  </h2>

                  <div className="p-4 bg-slate-50 border border-slate-300 rounded text-[11px] leading-relaxed text-slate-700 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      STATUTORY AUDITOR ASSURANCE & CRYPTOGRAPHIC LEDGER SIGN-OFF
                    </div>
                    <p className="text-justify">
                      All multi-source data streams were independently cross-referenced against original physical drill logs, certified NABL laboratory certificates, and electronic pit dispatch telemetry. Zero compliance non-conformances were detected. Every numerical statement in this report is bidirectionally tied to immutable cryptographic hashes.
                    </p>
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600">
                      <div>Auditor Ref: CIL/DGMS/STAT-2026/089</div>
                      <div>Digital SHA-256: 4f8b9e...2a1c0d (Airgapped)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-300 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>CONFIDENTIAL • MINING LEASE BLOCK ML-492 • STATUTORY DISCLOSURE ONLY</span>
                <span>MineIntel Verified • Page 4 of 4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
