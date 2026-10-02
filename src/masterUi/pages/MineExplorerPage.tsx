import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  MapPin,
  Filter,
  Layers,
  FileText,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { MINES_DATA, REPORTS_DATA, TOPICS_DATA, MineLocation, MiningReport, TopicItem } from '../data/miningData';

interface OutletContextType {
  onOpenReport: (report: MiningReport) => void;
  onOpenTopic: (topic: TopicItem) => void;
  onOpenTopicByName: (name: string) => void;
}

export const MineExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const { onOpenReport, onOpenTopicByName } = useOutletContext<OutletContextType>();

  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedSubsidiary, setSelectedSubsidiary] = useState('ALL');
  const [selectedMine, setSelectedMine] = useState<MineLocation>(MINES_DATA[0]);

  const filteredMines = MINES_DATA.filter((m) => {
    if (selectedRegion !== 'ALL' && m.state !== selectedRegion) return false;
    if (selectedSubsidiary !== 'ALL' && m.subsidiary !== selectedSubsidiary) return false;
    return true;
  });

  // Calculate India tactical map coordinates projection (lat 18–25, lng 78–88)
  const getMapCoordinates = (lat: number, lng: number) => {
    // Map bounding box: lat 16 to 27, lng 77 to 89
    const minLat = 16.0;
    const maxLat = 26.5;
    const minLng = 77.0;
    const maxLng = 88.5;

    const x = ((lng - minLng) / (maxLng - minLng)) * 740 + 30;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 460 + 20;

    return { x, y };
  };

  const relatedReports = REPORTS_DATA.filter((r) => r.mineId === selectedMine.id || r.mineName === selectedMine.name);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
              Spatial Geospatial Intelligence Layer
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Mine Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Interactive tactical spatial visualization of Coal India Limited subsidiaries, opencast mega-pits, and underground projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-slate-800 bg-[#0d1424] px-3.5 py-1.5 text-xs text-slate-300">
            Tracking <strong className="text-amber-400 font-mono">8 Tier-1</strong> Strategic Collieries
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-4 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          <Filter className="h-3.5 w-3.5 text-amber-400" /> Geospatial &amp; Administrative Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Mining Basin / State</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="ALL">All States (National Grid)</option>
              <option value="Chhattisgarh">Chhattisgarh (Korba Basin)</option>
              <option value="Odisha">Odisha (Talcher Basin)</option>
              <option value="Madhya Pradesh">Madhya Pradesh (Singrauli Basin)</option>
              <option value="Jharkhand">Jharkhand (Jharia Coking Basin)</option>
              <option value="Telangana">Telangana (Godavari Valley)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Operating Subsidiary</label>
            <select
              value={selectedSubsidiary}
              onChange={(e) => setSelectedSubsidiary(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="ALL">All CIL Subsidiaries</option>
              <option value="SECL">SECL (South Eastern Coalfields)</option>
              <option value="MCL">MCL (Mahanadi Coalfields)</option>
              <option value="NCL">NCL (Northern Coalfields)</option>
              <option value="BCCL">BCCL (Bharat Coking Coal)</option>
              <option value="SCCL">SCCL (Singareni Collieries)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Direct Colliery Jump</label>
            <select
              value={selectedMine.id}
              onChange={(e) => {
                const found = MINES_DATA.find((m) => m.id === e.target.value);
                if (found) setSelectedMine(found);
              }}
              className="w-full rounded-xl border border-slate-700 bg-[#121c33] px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            >
              {MINES_DATA.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.subsidiary})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map on Left (8 cols), Mine Detail Drawer on Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tactical Map Canvas */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              India East-Central Coal Belts Tactical Map
            </span>
            <span className="text-xs font-mono text-amber-400">
              Datum: WGS84 • Spatial Resolution: 1:50,000
            </span>
          </div>

          {/* SVG Tactical Map Graphic */}
          <div className="relative rounded-xl border border-slate-800/80 bg-[#070b14] overflow-hidden min-h-[460px] flex items-center justify-center p-2">
            <svg viewBox="0 0 800 500" className="w-full h-full select-none">
              {/* Background Radar Rings & Grid */}
              <defs>
                <pattern id="tacticalGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#172338" strokeWidth="0.8" />
                </pattern>
                <linearGradient id="basinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.6" />
                </linearGradient>
              </defs>

              <rect width="800" height="500" fill="url(#tacticalGrid)" />

              {/* Schematic East-Central Indian States Contours */}
              {/* Madhya Pradesh / Uttar Pradesh Border Line */}
              <path
                d="M 120 180 Q 240 100 420 140 T 600 130"
                fill="none"
                stroke="#25354e"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x="260" y="110" fill="#475569" fontSize="11" fontWeight="bold">MADHYA PRADESH (NCL)</text>

              {/* Chhattisgarh Basin Contour */}
              <path
                d="M 280 200 Q 380 240 420 320 Q 340 380 280 340 Z"
                fill="url(#basinGrad)"
                stroke="#334155"
                strokeWidth="1.2"
              />
              <text x="320" y="270" fill="#475569" fontSize="11" fontWeight="bold">CHHATTISGARH (SECL)</text>

              {/* Odisha / Talcher Basin Contour */}
              <path
                d="M 460 280 Q 580 260 680 340 Q 580 410 490 360 Z"
                fill="url(#basinGrad)"
                stroke="#334155"
                strokeWidth="1.2"
              />
              <text x="560" y="320" fill="#475569" fontSize="11" fontWeight="bold">ODISHA (MCL)</text>

              {/* Jharkhand / Jharia Contour */}
              <path
                d="M 540 140 Q 640 160 700 230 Q 620 250 560 200 Z"
                fill="url(#basinGrad)"
                stroke="#334155"
                strokeWidth="1.2"
              />
              <text x="610" y="180" fill="#475569" fontSize="11" fontWeight="bold">JHARKHAND (BCCL)</text>

              {/* Telangana Godavari Valley */}
              <text x="140" y="380" fill="#475569" fontSize="11" fontWeight="bold">TELANGANA (SCCL)</text>

              {/* Mine Markers */}
              {filteredMines.map((mine) => {
                const { x, y } = getMapCoordinates(mine.lat, mine.lng);
                const isSelected = selectedMine.id === mine.id;
                const hasHighAlert = mine.activeAlerts > 0;

                return (
                  <g
                    key={mine.id}
                    onClick={() => setSelectedMine(mine)}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing ring if alert or selected */}
                    {(isSelected || hasHighAlert) && (
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 18 : 14}
                        fill="none"
                        stroke={hasHighAlert ? '#f43f5e' : '#f59e0b'}
                        strokeWidth="1.5"
                        className="animate-pulse"
                      />
                    )}

                    {/* Outer marker pin */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 9 : 7}
                      fill={isSelected ? '#f59e0b' : '#0284c7'}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className="transition-all duration-200 group-hover:scale-125"
                    />

                    {/* Mine Label Tag */}
                    <g transform={`translate(${x + 12}, ${y - 6})`}>
                      <rect
                        rx="4"
                        width={mine.name.length * 6.5 + 24}
                        height="18"
                        fill="#0b1322"
                        stroke={isSelected ? '#f59e0b' : '#334155'}
                        strokeWidth="1"
                        opacity="0.9"
                      />
                      <text
                        x="8"
                        y="13"
                        fill={isSelected ? '#fbbf24' : '#f8fafc'}
                        fontSize="9.5"
                        fontWeight="bold"
                      >
                        {mine.name.split(' ')[0]} ({mine.subsidiary})
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* In-Map Bottom Legend */}
            <div className="absolute bottom-3 left-3 bg-[#0d1424]/90 border border-slate-800 rounded-lg p-2.5 text-[11px] text-slate-300 backdrop-blur space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span>Selected Colliery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <span>Active Operating Mine</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Active Geological Alert</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Coordinate projection: CMPDI Central Grid System</span>
            <span>Click any marker to inspect colliery telemetry</span>
          </div>
        </div>

        {/* Right Column: Selected Mine Detail Drawer */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/20">
                {selectedMine.subsidiary} Subsidiary
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                {selectedMine.status}
              </span>
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight mt-2">
              {selectedMine.name}
            </h3>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              <span>{selectedMine.district}, {selectedMine.state}</span>
            </div>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-center">
            <div className="rounded-xl border border-slate-800 bg-[#080d17] p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400">Annual Extraction</span>
              <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">{selectedMine.annualCapacityMT} MT</div>
              <span className="text-[10px] text-slate-500">Run-rate Capacity</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#080d17] p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400">Reports Filed</span>
              <div className="text-xl font-bold text-cyan-400 font-mono mt-0.5">{selectedMine.reportsCount} Docs</div>
              <span className="text-[10px] text-emerald-400">In Corpus</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#080d17] p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400">Tracked Topics</span>
              <div className="text-xl font-bold text-white font-mono mt-0.5">{selectedMine.topicsCount}</div>
              <span className="text-[10px] text-slate-500">Active Themes</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#080d17] p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400">Emerging Alerts</span>
              <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">{selectedMine.emergingTopicsCount}</div>
              <span className="text-[10px] text-rose-400">High Velocity</span>
            </div>
          </div>

          {/* Geological & Technical Specs */}
          <div className="rounded-xl border border-slate-800 bg-[#080d17] p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Colliery Type:</span>
              <span className="text-white font-medium">{selectedMine.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Primary Coal Grade:</span>
              <span className="text-amber-300 font-mono font-medium">{selectedMine.primaryCoalGrade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stripping Ratio (OB/Coal):</span>
              <span className="text-cyan-300 font-mono font-medium">{selectedMine.strippingRatio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Latest Filing Audit:</span>
              <span className="text-slate-300 font-mono">{selectedMine.latestReportDate}</span>
            </div>
          </div>

          {/* Highlights */}
          <div className="text-xs text-slate-300 border-l-2 border-amber-500 pl-3 italic">
            "{selectedMine.highlightMetric}"
          </div>

          {/* Recent Reports at this Mine */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
              <span>Recent Filings at {selectedMine.name.split(' ')[0]}</span>
              <span className="font-mono text-cyan-400">{relatedReports.length} Available</span>
            </div>
            <div className="space-y-2">
              {relatedReports.slice(0, 2).map((r) => (
                <div
                  key={r.id}
                  onClick={() => onOpenReport(r)}
                  className="p-2.5 rounded-lg border border-slate-800 bg-[#080d17] hover:border-slate-700 transition cursor-pointer text-xs"
                >
                  <div className="font-semibold text-white truncate">{r.title}</div>
                  <div className="text-[10px] text-amber-400 mt-0.5">{r.reportType} • {r.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="pt-2">
            <button
              onClick={() => navigate('/reports')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-md shadow-amber-500/20"
            >
              <span>View Mine Intelligence Reports</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
