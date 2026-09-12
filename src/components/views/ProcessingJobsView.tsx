import React, { useState } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { ProcessingJobItem, JobStage } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressIndicator } from '../common/ProgressIndicator';

interface ProcessingJobsViewProps {
  jobs: ProcessingJobItem[];
  onUpdateJobStatus: (id: string, status: 'running' | 'paused' | 'completed' | 'failed') => void;
}

export const ProcessingJobsView: React.FC<ProcessingJobsViewProps> = ({
  jobs,
  onUpdateJobStatus,
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  const filteredJobs = jobs.filter((j) => {
    if (statusFilter === 'All') return true;
    return j.status === statusFilter.toLowerCase();
  });

  const pipelineStages: JobStage[] = [
    'Discovering',
    'Extracting',
    'OCR',
    'Table extraction',
    'Image extraction',
    'Indexing',
    'Embedding',
    'Completed',
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#233145] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Background Processing Pipeline & Job Daemon
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Monitor OCR worker pools, table lattice parsing, and vector embedding queues running asynchronously on host hardware.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['All', 'Running', 'Completed', 'Paused'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                statusFilter === s
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Left Jobs Table, Right Job Detail & Live Logs */}
      <div className="flex-1 flex gap-5 overflow-hidden">
        {/* Left Table Panel */}
        <div className="flex-1 bg-[#111722] border border-[#1e2a3b] rounded-md overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-[#141d2b] border-b border-[#1e2a3b] text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Active & Historical Pipeline Tasks ({filteredJobs.length})
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#182333]">
            {filteredJobs.map((job) => {
              const isSelected = job.id === selectedJob?.id;
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`p-4 transition cursor-pointer ${
                    isSelected ? 'bg-[#151f2e] border-l-2 border-blue-500' : 'hover:bg-[#131b26]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 text-xs truncate max-w-sm">
                          {job.jobName}
                        </span>
                        <StatusBadge status={job.status} size="sm" />
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Type: {job.type} • Started: {job.startedAt} • Elapsed: {job.elapsedTime}
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs text-blue-300 font-bold">
                      {job.progress}%
                    </div>
                  </div>

                  <ProgressIndicator
                    value={job.progress}
                    stage={job.currentStage}
                    status={job.status}
                    size="sm"
                  />

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
                    <span>
                      Files: {job.filesProcessed} / {job.totalFiles}
                    </span>
                    <span className={job.errorsCount > 0 ? 'text-rose-400' : 'text-slate-400'}>
                      Errors: {job.errorsCount} • Warnings: {job.warningsCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel: Stages & Live Terminal Logs */}
        {selectedJob && (
          <div className="w-[480px] bg-[#111722] border border-[#1e2a3b] rounded-md overflow-hidden flex flex-col shrink-0">
            {/* Header & Controls */}
            <div className="p-4 bg-[#141d2b] border-b border-[#1e2a3b] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-100 font-mono truncate max-w-[280px]">
                  {selectedJob.jobName}
                </h3>
                <div className="text-[10px] font-mono text-slate-400">
                  ID: {selectedJob.id} • Current Stage: {selectedJob.currentStage}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {selectedJob.status === 'running' ? (
                  <button
                    type="button"
                    onClick={() => onUpdateJobStatus(selectedJob.id, 'paused')}
                    className="p-1.5 text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded text-xs flex items-center gap-1"
                    title="Pause Job"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px]">Pause</span>
                  </button>
                ) : selectedJob.status === 'paused' ? (
                  <button
                    type="button"
                    onClick={() => onUpdateJobStatus(selectedJob.id, 'running')}
                    className="p-1.5 text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 rounded text-xs flex items-center gap-1"
                    title="Resume Job"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px]">Resume</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => onUpdateJobStatus(selectedJob.id, 'running')}
                  className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs"
                  title="Retry / Re-run Pipeline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateJobStatus(selectedJob.id, 'failed')}
                  className="p-1.5 text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded text-xs"
                  title="Cancel Job Execution"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Pipeline Stages Stepper */}
            <div className="p-4 border-b border-[#1e2a3b] bg-[#121924]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                Pipeline Lifecycle Progression
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono">
                {pipelineStages.map((stg) => {
                  const isCurrent = selectedJob.currentStage === stg;
                  const isPast =
                    selectedJob.status === 'completed' ||
                    pipelineStages.indexOf(selectedJob.currentStage) > pipelineStages.indexOf(stg);
                  return (
                    <div
                      key={stg}
                      className={`p-1.5 rounded border text-center truncate ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-bold'
                          : isPast
                          ? 'border-emerald-800/60 bg-emerald-950/20 text-emerald-400'
                          : 'border-slate-800 bg-slate-900/40 text-slate-400'
                      }`}
                    >
                      {stg}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Terminal Live Execution Log */}
            <div className="flex-1 flex flex-col bg-[#0a0d14] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#0e131d] border-b border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-blue-400" />
                  Local Subprocess Stdout / Stderr
                </span>
                <span className="text-emerald-400">Daemon Active (PID 4920)</span>
              </div>

              <div className="flex-1 p-3 font-mono text-[11px] overflow-y-auto space-y-1 text-slate-300 select-text">
                {selectedJob.logs.map((line, idx) => (
                  <div key={idx} className="leading-relaxed break-all">
                    <span className="text-slate-400 select-none mr-2">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={line.includes('warning') ? 'text-amber-300' : line.includes('error') ? 'text-rose-400' : 'text-slate-300'}>
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
