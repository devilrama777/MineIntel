import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Network,
  Layers,
  ArrowRight,
  TrendingUp,
  FileText,
  MapPin,
  ExternalLink,
  ChevronLeft,
  Info,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { TOPICS_DATA, REPORTS_DATA, MINES_DATA, TopicItem, MiningReport } from '../data/miningData';

interface OutletContextType {
  onOpenReport: (report: MiningReport) => void;
  onOpenTopic: (topic: TopicItem) => void;
}

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  category: string;
  docs: number;
  importance: 'center' | 'primary' | 'secondary';
  topicRef?: TopicItem;
}

export const TopicNetworkPage: React.FC = () => {
  const navigate = useNavigate();
  const { onOpenReport, onOpenTopic } = useOutletContext<OutletContextType>();

  // Center node: COAL
  // Connected nodes: Geology, Mining, Exploration, Safety, Reserves, Environment, Water Management, Drilling
  const initialNodes: GraphNode[] = [
    { id: 'coal', name: 'Coal (Central)', x: 400, y: 260, radius: 46, color: '#f59e0b', category: 'Core Mineral Core', docs: 1284, importance: 'center' },
    { id: 'geology', name: 'Geology & Strata', x: 200, y: 130, radius: 32, color: '#0284c7', category: 'Lithology', docs: 238, importance: 'primary', topicRef: TOPICS_DATA[0] },
    { id: 'mining', name: 'Heavy Mining Methods', x: 600, y: 140, radius: 34, color: '#059669', category: 'Heavy Mechanization', docs: 220, importance: 'primary', topicRef: TOPICS_DATA[7] },
    { id: 'exploration', name: 'AI Exploration', x: 170, y: 390, radius: 28, color: '#06b6d4', category: 'Exploration & Reserves', docs: 142, importance: 'primary', topicRef: TOPICS_DATA[4] },
    { id: 'safety', name: 'Mine Safety & Hazards', x: 630, y: 380, radius: 35, color: '#10b981', category: 'Safety & DGMS', docs: 248, importance: 'primary', topicRef: TOPICS_DATA[3] },
    { id: 'reserves', name: 'Coal Seam Reserves', x: 400, y: 70, radius: 30, color: '#d97706', category: 'Economics & UNFC', docs: 215, importance: 'primary', topicRef: TOPICS_DATA[0] },
    { id: 'environment', name: 'Fugitive Emissions', x: 400, y: 450, radius: 28, color: '#7c3aed', category: 'Environmental & ESG', docs: 165, importance: 'primary', topicRef: TOPICS_DATA[5] },
    { id: 'water', name: 'Water Ingress', x: 260, y: 250, radius: 32, color: '#3b82f6', category: 'Hydrogeology & Risk', docs: 184, importance: 'primary', topicRef: TOPICS_DATA[1] },
    { id: 'drilling', name: 'Drilling & Blasting', x: 540, y: 260, radius: 29, color: '#f43f5e', category: 'Operations & Strata', docs: 198, importance: 'primary', topicRef: TOPICS_DATA[6] },
  ];

  const links = [
    { from: 'coal', to: 'geology', strength: 0.92 },
    { from: 'coal', to: 'mining', strength: 0.88 },
    { from: 'coal', to: 'exploration', strength: 0.85 },
    { from: 'coal', to: 'safety', strength: 0.94 },
    { from: 'coal', to: 'reserves', strength: 0.91 },
    { from: 'coal', to: 'environment', strength: 0.78 },
    { from: 'coal', to: 'water', strength: 0.89 },
    { from: 'coal', to: 'drilling', strength: 0.82 },
    // Inter-cluster cross-links
    { from: 'water', to: 'geology', strength: 0.75 },
    { from: 'water', to: 'safety', strength: 0.81 },
    { from: 'mining', to: 'drilling', strength: 0.88 },
    { from: 'exploration', to: 'reserves', strength: 0.84 },
  ];

  const [selectedNode, setSelectedNode] = useState<GraphNode>(initialNodes[0]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Active topic reference or default topic
  const currentTopic = selectedNode.topicRef || TOPICS_DATA[0];

  const relatedReports = REPORTS_DATA.filter((r) =>
    r.topics.some((t) => t.toLowerCase().includes(selectedNode.name.toLowerCase()) || selectedNode.name.toLowerCase().includes(t.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/topics')}
              className="text-slate-400 hover:text-white transition flex items-center gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Categories
            </button>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-purple-400">
              Co-occurrence Spatial Graph
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Topic Network
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Interactive topological semantic graph centered around primary geological concepts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedNode(initialNodes[0])}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#0d1424] px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset View
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Graph on Left (8 cols), Detail Panel on Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive SVG Network Canvas */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Semantic Co-occurrence Field (Click any node to inspect)
            </span>
            <span className="text-xs font-mono text-cyan-400">
              Louvain Modularity: Q = 0.742
            </span>
          </div>

          {/* SVG Viewport */}
          <div className="relative rounded-xl border border-slate-800/80 bg-[#070b14] overflow-hidden min-h-[460px] flex items-center justify-center">
            {/* Ambient Background Grid */}
            <svg viewBox="0 0 800 520" className="w-full h-full select-none">
              <defs>
                <radialGradient id="coalGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Central ambient glow */}
              <circle cx="400" cy="260" r="140" fill="url(#coalGlow)" pointerEvents="none" />

              {/* Edge Links */}
              {links.map((link, idx) => {
                const source = initialNodes.find((n) => n.id === link.from)!;
                const target = initialNodes.find((n) => n.id === link.to)!;
                const isConnected = selectedNode.id === source.id || selectedNode.id === target.id;
                return (
                  <line
                    key={idx}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isConnected ? '#f59e0b' : '#1e293b'}
                    strokeWidth={isConnected ? 2.5 : 1.5}
                    strokeOpacity={isConnected ? 0.9 : 0.4}
                    strokeDasharray={isConnected ? 'none' : '4 4'}
                    className="transition-all duration-300"
                  />
                );
              })}

              {/* Nodes */}
              {initialNodes.map((node) => {
                const isSelected = selectedNode.id === node.id;
                const isHovered = hoveredNode?.id === node.id;

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer transition-transform duration-200"
                  >
                    {/* Pulsing ring for selected node */}
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius + 8}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                    )}

                    {/* Node circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.radius}
                      fill={node.color}
                      stroke={isSelected ? '#ffffff' : '#0f172a'}
                      strokeWidth={isSelected ? 3 : 2}
                      className="shadow-lg hover:brightness-125 transition-all"
                    />

                    {/* Node Text Label */}
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fill={node.importance === 'center' ? '#030712' : '#ffffff'}
                      fontSize={node.importance === 'center' ? '13' : '10'}
                      fontWeight="bold"
                      className="pointer-events-none tracking-tight"
                    >
                      {node.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Instruction tooltip */}
            <div className="absolute bottom-3 left-3 bg-[#0d1424]/90 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur">
              Click any node to reveal linked documents, affected collieries, and temporal trends.
            </div>
          </div>

          {/* Graph Legend */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Core Mineral</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Hydrogeology</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Safety</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Environment</span>
            </div>
            <span>Node area proportional to report occurrence weight</span>
          </div>
        </div>

        {/* Right Column: Node Detail Panel */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20">
                {selectedNode.category}
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {selectedNode.docs} Documents
              </span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight mt-2">
              {selectedNode.name}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {currentTopic.summary}
            </p>
          </div>

          {/* Keywords */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Associated Vocabulary Keywords
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentTopic.keywords.map((kw, idx) => (
                <span key={idx} className="rounded-md border border-slate-700/80 bg-[#080d17] px-2.5 py-1 text-xs text-slate-200">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Related Topics */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Strongly Linked Graph Neighbors
            </div>
            <div className="space-y-1.5">
              {initialNodes.filter((n) => n.id !== selectedNode.id).slice(0, 3).map((neighbor) => (
                <div
                  key={neighbor.id}
                  onClick={() => setSelectedNode(neighbor)}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-800 bg-[#080d17] hover:border-slate-700 transition cursor-pointer text-xs"
                >
                  <span className="font-semibold text-white">{neighbor.name}</span>
                  <span className="font-mono text-emerald-400">88% Co-occurrence</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Affected Mines */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Top Mines Reporting Mention
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentTopic.topMines.map((m, idx) => (
                <span key={idx} className="rounded bg-slate-800/80 border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-amber-400" /> {m}
                </span>
              ))}
            </div>
          </div>

          {/* Relevant Reports */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Relevant Audits &amp; Filings
            </div>
            <div className="space-y-2">
              {REPORTS_DATA.slice(0, 2).map((r) => (
                <div
                  key={r.id}
                  onClick={() => onOpenReport(r)}
                  className="p-2.5 rounded-lg border border-slate-800 bg-[#080d17] hover:border-amber-500/30 transition cursor-pointer text-xs"
                >
                  <div className="font-semibold text-white truncate">{r.title}</div>
                  <div className="text-[10px] text-amber-400 mt-0.5">Click to Open Report →</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="pt-2">
            <button
              onClick={() => onOpenTopic(currentTopic)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-md shadow-amber-500/20"
            >
              <span>Inspect Full Topic Intelligence</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
