import React from 'react';

interface ProgressIndicatorProps {
  value: number; // 0 to 100
  label?: string;
  sublabel?: string;
  stage?: string;
  status?: 'running' | 'completed' | 'paused' | 'failed';
  size?: 'sm' | 'md';
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  label,
  sublabel,
  stage,
  status = 'running',
  size = 'md',
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const barColor = {
    running: 'bg-blue-500',
    completed: 'bg-emerald-500',
    paused: 'bg-amber-500',
    failed: 'bg-rose-500',
  }[status];

  return (
    <div className="w-full space-y-1.5">
      {(label || stage) && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium truncate max-w-[70%]">
            {label}
            {stage && (
              <span className="ml-2 font-mono text-[11px] text-blue-400 bg-blue-950/40 px-1.5 py-0.5 border border-blue-800/40 rounded">
                {stage}
              </span>
            )}
          </span>
          <span className="font-mono text-slate-400">{clamped}%</span>
        </div>
      )}
      <div
        className={`w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden ${
          size === 'sm' ? 'h-1.5' : 'h-2'
        }`}
      >
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {sublabel && (
        <div className="text-[11px] text-slate-400 font-mono">{sublabel}</div>
      )}
    </div>
  );
};
