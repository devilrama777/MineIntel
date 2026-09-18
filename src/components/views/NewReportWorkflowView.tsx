import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { DataSourceItem, ReportItem } from '../../types';

interface Props {
  dataSources: DataSourceItem[];
  previousReports: ReportItem[];
  userName?: string;
  onCreateReport: (report: any) => void;
  onCancel: () => void;
  aiProvider?: string;
  aiModel?: string;
}

const steps = ['Brief', 'Sources', 'Reference', 'Processing', 'Model', 'Launch'];

export const NewReportWorkflowView: React.FC<Props> = ({
  dataSources,
  previousReports,
  userName = 'Authorized Officer',
  onCreateReport,
  onCancel,
  aiProvider,
  aiModel,
}) => {
  const [step, setStep] = useState(1);
  const [reportName, setReportName] = useState('Consolidated Operational Review');
  const [organization, setOrganization] = useState(
    'MineIntel / Corporate Planning & Operations Directorate'
  );
  const [reportingPeriod, setReportingPeriod] = useState('January 1, 2026 – March 31, 2026');
  const [description, setDescription] = useState(
    'Quarterly institutional synthesis evaluating production, dispatch, environmental and mine safety evidence.'
  );
  const [selectedSources, setSelectedSources] = useState<string[]>(
    dataSources.map((source) => source.id).slice(0, 5)
  );
  const [reference, setReference] = useState(
    'MineIntel_Annual_Report_FY25_Audited_Reference.pdf'
  );
  const [config, setConfig] = useState({
    ocr: true,
    tableExtraction: true,
    imageExtraction: true,
    metadataExtraction: true,
    indexing: true,
  });
  const [temperature, setTemperature] = useState(0.2);
  const [strictVerification, setStrictVerification] = useState(true);
  const [launching, setLaunching] = useState(false);

  // Dynamic AI provider and model from backend health configuration
  const effectiveModel = aiModel || 'openrouter/free';
  const effectiveProvider = aiProvider || 'OpenRouter';

  const selected = dataSources.filter((source) => selectedSources.includes(source.id));
  const sourcePages = selected.reduce((sum, source) => sum + (source.pages || 0), 0);
  const readySources = selected.filter((source) => source.indexedStatus === 'Indexed').length;
  const chartData = useMemo(
    () => selected.map((source, index) => ({ name: `${index + 1}`, pages: source.pages || 0 })),
    [selected]
  );

  const options = [
    ['ocr', 'OCR extraction', 'Read scanned material and source text.'],
    ['tableExtraction', 'Table intelligence', 'Preserve structured numerical evidence.'],
    ['imageExtraction', 'Image extraction', 'Register useful figures in the asset library.'],
    ['metadataExtraction', 'Metadata tagging', 'Retain document provenance and dates.'],
    ['indexing', 'Evidence indexing', 'Make selected documents searchable in the report.'],
  ] as const;

  const toggleSource = (id: string) =>
    setSelectedSources((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );

  const launch = () => {
    setLaunching(true);
    window.setTimeout(
      () =>
        onCreateReport({
          name: reportName,
          organization,
          reportingPeriod,
          description,
          selectedSources,
          referenceReport: reference,
          processingConfig: config,
          aiConfig: {
            modelName: effectiveModel,
            contextLength: 32768,
            temperature,
            strictVerification,
          },
        }),
      600
    );
  };

  const content = () => {
    if (step === 1)
      return (
        <div className="space-y-5">
          <Field label="Report title">
            <input value={reportName} onChange={(e) => setReportName(e.target.value)} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Owning organization">
              <input value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </Field>
            <Field label="Reporting period">
              <input value={reportingPeriod} onChange={(e) => setReportingPeriod(e.target.value)} />
            </Field>
          </div>
          <Field label="Executive scope">
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
      );

    if (step === 2)
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2>Evidence workspace</h2>
              <p>Choose existing repositories that may ground this report.</p>
            </div>
            <span className="count-pill">{selected.length} selected</span>
          </div>
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden">
            {dataSources.length === 0 ? (
              <Empty copy="No evidence files or repositories are currently loaded." />
            ) : (
              dataSources.map((source) => (
                <button
                  type="button"
                  key={source.id}
                  onClick={() => toggleSource(source.id)}
                  className={`source-row ${selectedSources.includes(source.id) ? 'source-selected' : ''}`}
                >
                  <span
                    className={`select-dot ${selectedSources.includes(source.id) ? 'selected' : ''}`}
                  >
                    {selectedSources.includes(source.id) && <Check className="w-3 h-3" />}
                  </span>
                  <span className="min-w-0 text-left">
                    <b>{source.filename}</b>
                    <small>
                      {source.pages || 0} pages · {source.type} · {source.indexedStatus}
                    </small>
                  </span>
                  <ChevronRight className="ml-auto w-4 h-4 text-slate-500" />
                </button>
              ))
            )}
          </div>
        </div>
      );

    if (step === 3)
      return (
        <div className="space-y-4">
          <div>
            <h2>Reference guidance</h2>
            <p>A reference informs style and structure; it never replaces source-grounded analysis.</p>
          </div>
          {['MineIntel_Annual_Report_FY25_Audited_Reference.pdf', 'Technical_CapEx_Standard_Reference_2024.pdf', ''].map(
            (option) => (
              <button
                type="button"
                key={option || 'none'}
                onClick={() => setReference(option)}
                className={`reference-card ${reference === option ? 'reference-active' : ''}`}
              >
                <span>
                  <b>{option || 'No reference document'}</b>
                  <small>
                    {option
                      ? 'Use as a structural and voice benchmark.'
                      : 'Build the structure solely from selected evidence.'}
                  </small>
                </span>
                {reference === option && <CheckCircle2 className="w-5 h-5 text-cyan-300" />}
              </button>
            )
          )}
        </div>
      );

    if (step === 4)
      return (
        <div className="space-y-3">
          <div>
            <h2>Processing route</h2>
            <p>These existing processing passes are sent with the report request.</p>
          </div>
          {options.map(([key, title, copy]) => (
            <label key={key} className="option-card">
              <span>
                <b>{title}</b>
                <small>{copy}</small>
              </span>
              <input
                type="checkbox"
                checked={config[key]}
                onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
              />
            </label>
          ))}
        </div>
      );

    if (step === 5)
      return (
        <div className="space-y-5">
          <div>
            <h2>Generation controls</h2>
            <p>Use the configured MineIntel inference option and review controls.</p>
          </div>
          <div className="model-card">
            <span className="model-orb">
              <Sparkles className="w-5 h-5" />
            </span>
            <span>
              <b>{effectiveModel}</b>
              <small>
                {effectiveProvider} inference · 128,000 context · sovereign production model
              </small>
            </span>
            <CheckCircle2 className="ml-auto text-emerald-400 w-5 h-5" />
          </div>
          <Field label={`Temperature · ${temperature.toFixed(2)}`}>
            <input
              className="range"
              type="range"
              min="0"
              max="0.7"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </Field>
          <label className="option-card">
            <span>
              <b>Strict numerical verification</b>
              <small>Require exact table and source citations for figures.</small>
            </span>
            <input
              type="checkbox"
              checked={strictVerification}
              onChange={(e) => setStrictVerification(e.target.checked)}
            />
          </label>
        </div>
      );

    return (
      <div className="space-y-5">
        <div>
          <h2>Ready to create the report plan</h2>
          <p>Review the live configuration before MineIntel creates the report and opens its planner.</p>
        </div>
        <div className="launch-summary">
          <Summary label="Report" value={reportName} />
          <Summary label="Evidence" value={`${selected.length} selected sources`} />
          <Summary label="Processing" value={`${Object.values(config).filter(Boolean).length} active passes`} />
          <Summary
            label="Verification"
            value={strictVerification ? 'Strict citation checks on' : 'Citation checks off'}
          />
        </div>
        {launching && (
          <div className="launching">
            <Loader2 className="w-4 h-4 animate-spin" /> Creating report specification…
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-full report-workspace">
      <div className="report-shell">
        <header className="report-header">
          <div>
            <button type="button" onClick={onCancel} className="back-link">
              <ArrowLeft className="w-3.5 h-3.5" /> Workspace
            </button>
            <div className="eyebrow">
              <span /> Report builder
            </div>
            <h1>Compose a grounded report.</h1>
            <p>
              Configure a report plan with the data and processing capabilities already available in MineIntel.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="icon-close" aria-label="Close report builder">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="builder-grid">
          <section className="main-builder">
            <nav className="step-nav" aria-label="Report creation steps">
              {steps.map((label, index) => {
                const num = index + 1;
                return (
                  <button
                    type="button"
                    key={label}
                    onClick={() => setStep(num)}
                    className={step === num ? 'active' : step > num ? 'done' : ''}
                  >
                    <span>{step > num ? <Check className="w-3 h-3" /> : num}</span>
                    {label}
                  </button>
                );
              })}
            </nav>

            <div className="form-surface">
              <div className="step-label">
                Step {step} of {steps.length}
              </div>
              {content()}
            </div>

            <footer className="builder-footer">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep(step - 1)}
                className="secondary-button"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              {step < 6 ? (
                <button type="button" onClick={() => setStep(step + 1)} className="primary-button">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-generate-report"
                  disabled={launching || !reportName.trim() || selected.length === 0}
                  onClick={launch}
                  className="primary-button"
                >
                  {launching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Generate Report
                </button>
              )}
            </footer>
          </section>

          <aside className="agent-rail">
            <section className="agent-card">
              <div className="agent-top">
                <div className="agent-avatar">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="live-status">
                  <i /> Ready
                </span>
              </div>
              <div className="agent-copy">
                <span className="eyebrow">
                  <span /> MineIntel agent
                </span>
                <h2>{userName}</h2>
                <p>
                  Your report copilot is watching this configuration and will use only the selected evidence.
                </p>
              </div>
              <div className="agent-activity">
                <span className="pulse-ring">
                  <Wand2 className="w-4 h-4" />
                </span>
                <div>
                  <b>{step < 6 ? `Preparing ${steps[step - 1].toLowerCase()}` : 'Awaiting launch'}</b>
                  <small>Report configuration is kept in sync.</small>
                </div>
              </div>
            </section>

            <section className="metric-card">
              <div className="metric-heading">
                <span>Selected evidence</span>
                <b>
                  {sourcePages} <small>pages</small>
                </b>
              </div>
              {chartData.length ? (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="sourcePages" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" hide />
                      <Tooltip
                        cursor={false}
                        contentStyle={{
                          background: '#111827',
                          border: '1px solid #334155',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pages"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        fill="url(#sourcePages)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty copy="A chart will appear after you select a source." />
              )}
              <div className="metric-footer">
                <span>{readySources} indexed</span>
                <span>{selected.length} repositories</span>
              </div>
            </section>

            <section className="insight-card">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <b>Evidence integrity</b>
                <p>
                  {strictVerification
                    ? 'Citation verification is enabled for this plan.'
                    : 'Citation verification is currently disabled.'}
                </p>
              </div>
            </section>

            <section className="history-card">
              <span>Recent report activity</span>
              <b>{previousReports.length} reports in workspace</b>
              <small>
                {
                  previousReports.filter(
                    (report) => report.status === 'Ready for Export' || report.status === 'Validated'
                  ).length
                }{' '}
                verified or ready for export
              </small>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);

const Summary: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span>{label}</span>
    <b>{value}</b>
  </div>
);

const Empty: React.FC<{ copy: string }> = ({ copy }) => <div className="empty-copy">{copy}</div>;
