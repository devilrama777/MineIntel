import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'emerald' | 'amber' | 'crimson' | 'blue' | 'slate' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  size = 'md',
  dot = true,
}) => {
  // Auto-detect variant if not passed
  let resolvedVariant = variant;
  if (!resolvedVariant) {
    const s = status.toLowerCase();
    if (s.includes('indexed') || s.includes('completed') || s.includes('validated') || s.includes('healthy') || s.includes('pass')) {
      resolvedVariant = 'emerald';
    } else if (s.includes('progress') || s.includes('running') || s.includes('warning') || s.includes('partial') || s.includes('review')) {
      resolvedVariant = 'amber';
    } else if (s.includes('failed') || s.includes('error') || s.includes('offline')) {
      resolvedVariant = 'crimson';
    } else if (s.includes('draft') || s.includes('extracting') || s.includes('ocr')) {
      resolvedVariant = 'blue';
    } else {
      resolvedVariant = 'slate';
    }
  }

  const colorStyles = {
    emerald: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
    amber: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
    crimson: 'bg-rose-950/40 text-rose-300 border-rose-800/60',
    blue: 'bg-blue-950/40 text-blue-300 border-blue-800/60',
    purple: 'bg-indigo-950/40 text-indigo-300 border-indigo-800/60',
    slate: 'bg-slate-900/60 text-slate-300 border-slate-700/60',
  }[resolvedVariant];

  const dotColors = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    crimson: 'bg-rose-400',
    blue: 'bg-blue-400',
    purple: 'bg-indigo-400',
    slate: 'bg-slate-400',
  }[resolvedVariant];

  const sizeStyles = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded font-mono tracking-tight uppercase ${sizeStyles} ${colorStyles}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />}
      <span className="whitespace-nowrap">{status}</span>
    </span>
  );
};
