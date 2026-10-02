import React, { useState } from 'react';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  GraduationCap,
  Plus,
  Play,
  Zap,
  ShieldCheck,
  Server,
  Activity,
  HardDrive,
} from 'lucide-react';
import { SYSTEM_HEALTH_METRICS, TOPICS_DATA } from '../data/miningData';

export const SystemHealthPage: React.FC = () => {
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainingProgress, setRetrainingProgress] = useState(0);
  const [retrainingCompleted, setRetrainingCompleted] = useState(false);

  // Topic Categories manager
  const [categories, setCategories] = useState<string[]>([
    'Geotechnical & Strata',
    'Hydrogeology & Water',
    'Exploration & Reserves',
    'Mine Safety & Hazards',
    'Environmental & ESG',
    'Heavy Mechanization',
  ]);
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  const handleRunRetraining = () => {
    setIsRetraining(true);
    setRetrainingProgress(5);
    setRetrainingCompleted(false);

    const interval = setInterval(() => {
      setRetrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRetraining(false);
          setRetrainingCompleted(true);
          return 100;
        }
        return prev + 15;
      });
    }, 400);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCategories([...categories, newCatName.trim()]);
    setNewCatName('');
    setShowAddCat(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-400">
              Phase 2C • Continuous Enhancement Pipeline
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Model &amp; System Health
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time inference telemetry, scheduled neural retraining, active taxonomy management, and analyst curriculum logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Cluster Operational (A100 Active)
          </span>
        </div>
      </div>

      {/* SECTION 1: Model Retraining Module */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Zap className="h-4 w-4" /> Neural Fine-Tuning &amp; Checkpoint Scheduler
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Model Retraining: {SYSTEM_HEALTH_METRICS.modelName}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Scheduled periodic fine-tuning on newly ingested geological logs and DGMS audit circulars.
            </p>
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300 mt-3 font-mono">
              <div>Last Retrained: <strong className="text-white">{SYSTEM_HEALTH_METRICS.lastRetrained}</strong></div>
              <div>Next Scheduled: <strong className="text-cyan-400">{SYSTEM_HEALTH_METRICS.nextScheduledRetraining}</strong></div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleRunRetraining}
              disabled={isRetraining}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              <Play className={`h-4 w-4 ${isRetraining ? 'animate-spin' : ''}`} />
              <span>{isRetraining ? 'Retraining Pipeline Active...' : 'Run Retraining Now'}</span>
            </button>
          </div>
        </div>

        {/* Retraining Progress Bar */}
        {isRetraining && (
          <div className="pt-4 space-y-2 animate-fadeIn">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Optimizing Sentence-BERT Weights on 1.2M Records...</span>
              <span className="font-mono font-bold text-amber-400">{retrainingProgress}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${retrainingProgress}%` }}
              />
            </div>
          </div>
        )}

        {retrainingCompleted && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Retraining cycle executed successfully. Loss converged to 0.0412. Checkpoint saved to sovereign partition.</span>
          </div>
        )}
      </div>

      {/* SECTION 2: Model Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Model Accuracy</div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2 font-mono">
            {SYSTEM_HEALTH_METRICS.modelAccuracy}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Cross-entropy validation</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Processing Speed</div>
          <div className="text-3xl font-extrabold text-cyan-400 mt-2 font-mono">
            {SYSTEM_HEALTH_METRICS.processingSpeedSec} s
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Per 150-page document</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Documents Processed</div>
          <div className="text-3xl font-extrabold text-amber-400 mt-2 font-mono">
            {SYSTEM_HEALTH_METRICS.documentsProcessed.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total indexed filings</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Training Data Volume</div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">
            1.2M
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Geological record tokens</div>
        </div>
      </div>

      {/* SECTION 3: Topic Categories Manager & Analyst Training */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Categories Manager (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-400" /> Active Topic Categories
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Taxonomic buckets used by the clustering algorithm to group discovered topics.
              </p>
            </div>
            <button
              onClick={() => setShowAddCat(!showAddCat)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add Category
            </button>
          </div>

          {/* Add Form */}
          {showAddCat && (
            <form onSubmit={handleAddCategory} className="rounded-xl border border-slate-700 bg-[#080d17] p-3.5 flex items-center gap-2 animate-fadeIn">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Enter new category name..."
                className="flex-1 rounded-lg border border-slate-700 bg-[#121c33] px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                autoFocus
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                Save
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {categories.map((cat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#080d17] text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="font-semibold text-white">{cat}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* Analyst Training (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-400" /> Analyst Training &amp; Upskilling
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              CMPDI continuous capability building for mining geologists.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-800 bg-[#080d17] p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Users Trained</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Geologists &amp; mining engineers</div>
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{SYSTEM_HEALTH_METRICS.analystUsersTrained}</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#080d17] p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Completed Workshops</div>
                <div className="text-[11px] text-slate-400 mt-0.5">NLP &amp; report audit sessions</div>
              </div>
              <div className="text-2xl font-bold text-cyan-400 font-mono">{SYSTEM_HEALTH_METRICS.trainingSessionsCompleted}</div>
            </div>
          </div>

          <button
            onClick={() => alert('CMPDI Analyst Training Modules: 1. Neural Topic Interpretation, 2. Hydrogeological Ingress Signatures, 3. UNFC Reserves Protocol.')}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition text-center"
          >
            View Resources &amp; Course Materials
          </button>
        </div>
      </div>

      {/* SECTION 4: System Health Indicators */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" /> Sovereign Node Infrastructure Health
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-slate-800 bg-[#080d17] p-4 flex items-start gap-3">
            <Server className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">Inference Cluster</div>
              <div className="text-[11px] text-slate-400 mt-1">{SYSTEM_HEALTH_METRICS.gpuClusterStatus}</div>
              <span className="inline-block mt-2 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                LOAD: 18.2%
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#080d17] p-4 flex items-start gap-3">
            <Database className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">Vector Knowledge Base</div>
              <div className="text-[11px] text-slate-400 mt-1">{SYSTEM_HEALTH_METRICS.vectorStoreStatus}</div>
              <span className="inline-block mt-2 text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded">
                768 DIMENSIONS
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#080d17] p-4 flex items-start gap-3">
            <HardDrive className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">REST API Gateway</div>
              <div className="text-[11px] text-slate-400 mt-1">Sovereign loopback latency: {SYSTEM_HEALTH_METRICS.apiLatencyMs} ms</div>
              <span className="inline-block mt-2 text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                UPTIME: 99.98%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
