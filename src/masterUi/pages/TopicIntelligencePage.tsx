import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Layers,
  Network,
  GitFork,
  Search,
  Filter,
  FileText,
  TrendingUp,
  ShieldCheck,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { TOPICS_DATA, TopicItem } from '../data/miningData';

interface OutletContextType {
  onOpenTopic: (topic: TopicItem) => void;
}

export const TopicIntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const { onOpenTopic } = useOutletContext<OutletContextType>();

  const [activeTab, setActiveTab] = useState<'categories' | 'taxonomy'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = Array.from(new Set(TOPICS_DATA.map((t) => t.category)));

  const filteredTopics = TOPICS_DATA.filter((t) => {
    if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const matchName = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchKw = t.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchName && !matchKw) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
              Neural Topic Discovery Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Topic Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Unsupervised semantic discovery and categorization extracted across the CIL/CMPDI corpus.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-[#0d1424] p-1">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === 'categories'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Topic Categories
          </button>
          <button
            onClick={() => navigate('/topics/network')}
            className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <Network className="h-3.5 w-3.5 text-purple-400" /> Topic Network
          </button>
          <button
            onClick={() => setActiveTab('taxonomy')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === 'taxonomy'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitFork className="h-3.5 w-3.5" /> Topic Taxonomy
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0d1424] p-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            All Categories ({TOPICS_DATA.length})
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === c
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic or keyword..."
            className="w-full rounded-xl border border-slate-700 bg-[#121c33] pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Tab 1: Topic Categories Grid */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20">
                    {topic.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-cyan-400">{topic.coherenceScore}%</span>
                    <span className="text-[10px] text-slate-500">Coherence</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-amber-300 transition">
                  {topic.name}
                </h3>

                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {topic.summary}
                </p>

                {/* Keywords pill list */}
                <div className="mt-4">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Key Vocabulary Tokens
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {topic.keywords.slice(0, 4).map((kw, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-300"
                      >
                        {kw}
                      </span>
                    ))}
                    {topic.keywords.length > 4 && (
                      <span className="rounded-md bg-slate-800/40 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
                        +{topic.keywords.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white font-mono">{topic.documentsCount} Documents</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="h-3 w-3" /> +{topic.growthPercent}% 2-Year Shift
                  </div>
                </div>
                <button
                  onClick={() => onOpenTopic(topic)}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-sm shadow-amber-500/20"
                >
                  <span>View Topic</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Topic Taxonomy Hierarchical Tree */}
      {activeTab === 'taxonomy' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GitFork className="h-4 w-4 text-amber-400" /> CMPDI Geological Taxonomy Tree
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Hierarchical classification tree linking broad mineral and geotechnical disciplines to micro-level operational topics.
            </p>
          </div>

          <div className="space-y-4">
            {categories.map((cat, catIdx) => {
              const catTopics = TOPICS_DATA.filter((t) => t.category === cat);
              return (
                <div key={catIdx} className="rounded-xl border border-slate-800/80 bg-[#080d17] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">{cat}</h4>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{catTopics.length} Sub-topics</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-5 border-l-2 border-slate-800 ml-1.5 my-2">
                    {catTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="rounded-lg border border-slate-800/60 bg-[#0d1527] p-3 flex items-center justify-between hover:border-slate-700 transition"
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">{topic.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {topic.documentsCount} documents • {topic.keywords.slice(0, 3).join(', ')}
                          </div>
                        </div>
                        <button
                          onClick={() => onOpenTopic(topic)}
                          className="text-xs font-semibold text-amber-400 hover:underline shrink-0 ml-3"
                        >
                          Explore →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
