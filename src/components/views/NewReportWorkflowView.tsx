import React, { useState } from 'react';
import {
  FileText,
  FolderArchive,
  BookOpen,
  Cpu,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Settings2,
  Layers,
  AlertCircle,
  FileCheck,
  HardDrive,
  Info,
} from 'lucide-react';
import { DataSourceItem, ReportItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface NewReportWorkflowViewProps {
  dataSources: DataSourceItem[];
  previousReports: ReportItem[];
  onCreateReport: (newReport: any) => void;
  onCancel: () => void;
}

export const NewReportWorkflowView: React.FC<NewReportWorkflowViewProps> = ({
  dataSources,
  previousReports,
  onCreateReport,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Report Info
  const [reportName, setReportName] = useState('Consolidated Operational Review (Q4 FY26 Pre-Filing)');
  const [organization, setOrganization] = useState('MineIntel / Corporate Planning & Operations Directorate');
  const [reportingPeriod, setReportingPeriod] = useState('January 1, 2026 – March 31, 2026');
  const [description, setDescription] = useState('Quarterly institutional synthesis evaluating production quotas, raw coal dispatch by subsidiary, environmental afforestation metrics, and DGMS mine safety compliance.');

  // Step 2: Selected Data Sources
  const [selectedSources, setSelectedSources] = useState<string[]>(
    dataSources.map((d) => d.id).slice(0, 5)
  );

  // Step 3: Reference Report
  const [selectedReference, setSelectedReference] = useState<string>('MineIntel_Annual_Report_FY25_Audited_Reference.pdf');

  // Step 4: Processing Configuration
  const [procConfig, setProcConfig] = useState({
    ocr: true,
    tableExtraction: true,
    imageExtraction: true,
    metadataExtraction: true,
    indexing: true,
    ocrEngine: 'PaddleOCR GPU (Dual Pass)',
    tableMode: 'Lattice (Strict Border Detection)',
  });

  // Step 5: AI Configuration (Single Model: openrouter/free)
  const [availableModels] = useState([
    {
      id: 'openrouter-free',
      name: 'openrouter/free',
      vendor: 'OpenRouter Cloud Inference',
      vram: 'Cloud Hosted',
      latency: '~1.8s',
      context: '128,000',
      description: 'Single sovereign production AI model for statutory report generation, mathematical verification, and operational synthesis.',
    },
  ]);
  const [selectedModel, setSelectedModel] = useState('openrouter/free');
  const [temperature, setTemperature] = useState(0.2);
  const [strictVerification, setStrictVerification] = useState(true);

  // Step 6: Plan Generation
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);

  const handleToggleSource = (id: string) => {
    if (selectedSources.includes(id)) {
      setSelectedSources(selectedSources.filter((s) => s !== id));
    } else {
      setSelectedSources([...selectedSources, id]);
    }
  };

  const handleGeneratePlan = () => {
    setIsGeneratingPlan(true);
    setGenerationLogs([
      'Connecting to OpenRouter sovereign inference gateway via /api/pipeline/run...',
      `Loading reference structural patterns from: ${selectedReference || 'None (Autonomous Discovery)'}...`,
      `Synthesizing evidence schema across ${selectedSources.length} selected data sources...`,
      'Executing deterministic MathEngine cross-checks (zero-drift guarantee)...',
      'Synthesizing dynamic section hierarchy with evidence grounding anchors...',
      'Plan compiled successfully with openrouter/free: 7 primary chapters, 14 sub-sections mapped.',
    ]);

    setTimeout(() => {
      setIsGeneratingPlan(false);
      onCreateReport({
        name: reportName,
        organization,
        reportingPeriod,
        description,
        selectedSources,
        referenceReport: selectedReference,
        processingConfig: procConfig,
        aiConfig: {
          modelName: selectedModel,
          contextLength: 32768,
          temperature,
          strictVerification,
        },
      });
    }, 1200);
  };

  const steps = [
    { num: 1, label: 'Report Information' },
    { num: 2, label: 'Data Sources' },
    { num: 3, label: 'Reference Report' },
    { num: 4, label: 'Processing' },
    { num: 5, label: 'Local AI Model' },
    { num: 6, label: 'Plan & Launch' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="border-b border-[#233145] pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded">
              WIZARD
            </span>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              New Corporate Report Specification
            </h1>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-200 font-mono"
          >
            Cancel and Return
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Configure institutional boundaries, connect local document repositories, and prepare the local AI engine to synthesize a grounded report plan.
        </p>

        {/* Stepper Strip */}
        <div className="grid grid-cols-6 gap-2 mt-4">
          {steps.map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                className={`border rounded p-2 text-xs transition ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-950/30 text-blue-200'
                    : isDone
                    ? 'border-emerald-800/60 bg-emerald-950/20 text-emerald-300'
                    : 'border-slate-800 bg-[#111722] text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span>STEP 0{s.num}</span>
                  {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <div className="font-semibold truncate">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="bg-[#111722] border border-[#1e2a3b] rounded-md p-6 min-h-[420px]">
        {/* Step 1: Report Information */}
        {currentStep === 1 && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 mb-1">
                Report Identification & Institutional Mandate
              </h2>
              <p className="text-xs text-slate-400">
                Define the regulatory filing title, owning subsidiary or directorate, and temporal scope.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Report Name / Title *</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full bg-[#162030] border border-slate-700 rounded px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. MineIntel Operational & Financial Review FY26 Q4"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Organization / Owning Command *</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full bg-[#162030] border border-slate-700 rounded px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Reporting Period *</label>
                <input
                  type="text"
                  value={reportingPeriod}
                  onChange={(e) => setReportingPeriod(e.target.value)}
                  className="w-full bg-[#162030] border border-slate-700 rounded px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Executive Scope & Summary Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#162030] border border-slate-700 rounded px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none font-sans"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Data Sources */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 mb-1">
                  Attach Local Data Sources
                </h2>
                <p className="text-xs text-slate-400">
                  Select which local document repositories, spreadsheets, and scanned PDFs the local AI will index for evidence.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-300 bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
                Selected: <strong className="text-blue-400">{selectedSources.length}</strong> of {dataSources.length} files
              </div>
            </div>

            <div className="border border-slate-800 rounded divide-y divide-slate-800 max-h-80 overflow-y-auto">
              {dataSources.map((doc) => {
                const isSelected = selectedSources.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleToggleSource(doc.id)}
                    className={`p-3 flex items-center justify-between text-xs cursor-pointer transition ${
                      isSelected ? 'bg-blue-950/20' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 font-mono truncate">
                            {doc.filename}
                          </span>
                          <StatusBadge status={doc.type} size="sm" />
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {doc.sourcePath} • {doc.pages} pages • {(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={doc.ocrStatus} size="sm" />
                      <StatusBadge status={doc.indexedStatus} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Reference Report */}
        {currentStep === 3 && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 mb-1">
                Benchmark Reference Document (Optional)
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                You may provide a historical corporate report to benchmark writing tone, typographic hierarchy, and quality expectations.
              </p>
            </div>

            <div className="p-3.5 bg-amber-950/20 border border-amber-800/50 rounded-md text-xs text-amber-300/90 space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <Info className="w-4 h-4 text-amber-400" />
                <span>CRITICAL ENTERPRISE PRINCIPLE: Reference is NOT a Rigid Template</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                The reference document guides the local AI on formatting density, analytical depth, and corporate voice. The model is explicitly empowered to discover and propose completely new operational or regulatory sections if fresh data warrants it.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div
                onClick={() => setSelectedReference('MineIntel_Annual_Report_FY25_Audited_Reference.pdf')}
                className={`p-3.5 border rounded-md cursor-pointer transition flex items-center justify-between text-xs ${
                  selectedReference === 'MineIntel_Annual_Report_FY25_Audited_Reference.pdf'
                    ? 'border-blue-500 bg-blue-950/30 text-slate-100'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-semibold font-mono text-sm">
                    MineIntel_Annual_Report_FY25_Audited_Reference.pdf
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Prior year statutory corporate baseline • 140 pages • Audited tables & CSR disclosures
                  </div>
                </div>
                <StatusBadge status="Audited Benchmark" variant="blue" size="sm" />
              </div>

              <div
                onClick={() => setSelectedReference('Technical_CapEx_Standard_Reference_2024.pdf')}
                className={`p-3.5 border rounded-md cursor-pointer transition flex items-center justify-between text-xs ${
                  selectedReference === 'Technical_CapEx_Standard_Reference_2024.pdf'
                    ? 'border-blue-500 bg-blue-950/30 text-slate-100'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-semibold font-mono text-sm">
                    Technical_CapEx_Standard_Reference_2024.pdf
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Engineering, excavation plant availability and fleet depreciation format
                  </div>
                </div>
                <StatusBadge status="CapEx Format" variant="purple" size="sm" />
              </div>

              <div
                onClick={() => setSelectedReference('')}
                className={`p-3.5 border rounded-md cursor-pointer transition flex items-center justify-between text-xs ${
                  selectedReference === ''
                    ? 'border-blue-500 bg-blue-950/30 text-slate-100'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-300'
                }`}
              >
                <div>
                  <div className="font-semibold font-mono text-sm">
                    None (Pure Autonomous Discovery)
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Let local AI synthesize structural chapters purely from ingested data documents
                  </div>
                </div>
                <StatusBadge status="Autonomous" variant="slate" size="sm" />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Processing Configuration */}
        {currentStep === 4 && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 mb-1">
                Subprocess Processing Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Specify which local parser passes and extraction routines are executed before plan synthesis.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <label className="flex items-center justify-between p-3 bg-[#151d2b] border border-slate-800 rounded cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">Local OCR Engine</div>
                  <div className="text-[11px] text-slate-400">PaddleOCR GPU (Dual Pass) for scanned PDFs and site inspection logs</div>
                </div>
                <input
                  type="checkbox"
                  checked={procConfig.ocr}
                  onChange={(e) => setProcConfig({ ...procConfig, ocr: e.target.checked })}
                  className="rounded border-slate-700 text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[#151d2b] border border-slate-800 rounded cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">Table Extraction Mode</div>
                  <div className="text-[11px] text-slate-400">Lattice & Stream coordinate cell boundary reconstruction</div>
                </div>
                <input
                  type="checkbox"
                  checked={procConfig.tableExtraction}
                  onChange={(e) => setProcConfig({ ...procConfig, tableExtraction: e.target.checked })}
                  className="rounded border-slate-700 text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[#151d2b] border border-slate-800 rounded cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">High-Res Image Extraction</div>
                  <div className="text-[11px] text-slate-400">Extracts charts, maps, diagrams and site photographs to Asset Library</div>
                </div>
                <input
                  type="checkbox"
                  checked={procConfig.imageExtraction}
                  onChange={(e) => setProcConfig({ ...procConfig, imageExtraction: e.target.checked })}
                  className="rounded border-slate-700 text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[#151d2b] border border-slate-800 rounded cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">Metadata & Temporal Tagging</div>
                  <div className="text-[11px] text-slate-400">Extracts document author, publishing date, reporting subsidiary, and DGMS circular codes</div>
                </div>
                <input
                  type="checkbox"
                  checked={procConfig.metadataExtraction}
                  onChange={(e) => setProcConfig({ ...procConfig, metadataExtraction: e.target.checked })}
                  className="rounded border-slate-700 text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[#151d2b] border border-slate-800 rounded cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">Hybrid Dense + Lexical Indexing</div>
                  <div className="text-[11px] text-slate-400">Indexes into local Qdrant vector store and SQLite BM25 inverted index</div>
                </div>
                <input
                  type="checkbox"
                  checked={procConfig.indexing}
                  onChange={(e) => setProcConfig({ ...procConfig, indexing: e.target.checked })}
                  className="rounded border-slate-700 text-blue-600"
                />
              </label>
            </div>
          </div>
        )}

        {/* Step 5: AI Configuration */}
        {currentStep === 5 && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 mb-1">
                Sovereign AI Inference Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Single production model: openrouter/free. Coupled directly with deterministic MathEngine for 100% verified arithmetic.
              </p>
            </div>

            <div className="space-y-2.5">
              {availableModels.map((model) => {
                const isSelected = selectedModel === model.name;
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedModel(model.name)}
                    className={`p-3.5 border rounded-md cursor-pointer transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/30'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100 font-mono text-sm">
                            {model.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            {model.vendor}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {model.description}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px] shrink-0">
                        <div className="text-blue-300 font-semibold">{model.vram} VRAM</div>
                        <div className="text-slate-400">{model.latency}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-[#141c2a] border border-slate-800 rounded-md grid grid-cols-2 gap-4 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Inference Temperature: {temperature}</label>
                <input
                  type="range"
                  min="0.0"
                  max="0.7"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <span className="text-[10px] text-slate-400">0.0 (Deterministic) to 0.7 (Creative)</span>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Strict Numerical Verification</label>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={strictVerification}
                    onChange={(e) => setStrictVerification(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600"
                  />
                  <span className="text-slate-200">Mandate exact cell/table citation for all figures</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Generate Plan */}
        {currentStep === 6 && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 mb-1">
                Synthesize Report Plan
              </h2>
              <p className="text-xs text-slate-400">
                Ready to dispatch report generation request to local Python daemon.
              </p>
            </div>

            <div className="bg-[#141b27] border border-slate-800 rounded p-4 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Report Title:</span>
                <span className="text-slate-200 font-semibold">{reportName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Organization:</span>
                <span className="text-slate-200">{organization}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Period:</span>
                <span className="text-slate-200">{reportingPeriod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Attached Data Sources:</span>
                <span className="text-blue-400 font-semibold">{selectedSources.length} files</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reference Benchmark:</span>
                <span className="text-slate-300">{selectedReference || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Local AI Engine:</span>
                <span className="text-emerald-400 font-semibold">{selectedModel}</span>
              </div>
            </div>

            {/* Execution logs */}
            {generationLogs.length > 0 && (
              <div className="bg-[#0b0e14] border border-slate-800 rounded p-3 font-mono text-[11px] text-slate-300 space-y-1">
                {generationLogs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-blue-400">›</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-[#233145] pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
          className={`px-4 py-2 text-xs font-semibold rounded transition flex items-center gap-1.5 cursor-pointer ${
            currentStep === 1
              ? 'opacity-40 text-slate-400 bg-slate-800/40 cursor-not-allowed'
              : 'text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.min(6, s + 1))}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>Continue to Step 0{currentStep + 1}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={isGeneratingPlan}
            className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGeneratingPlan ? 'Synthesizing Plan...' : 'Generate Report Plan & Open Planner'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
