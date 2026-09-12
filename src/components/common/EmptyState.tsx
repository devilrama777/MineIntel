import React from 'react';
import { LucideIcon, Inbox, AlertOctagon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded bg-[#131923]/40">
      <div className="p-3 bg-slate-800/60 rounded border border-slate-700/50 text-slate-400 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded transition shadow-sm cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Service Subprocess Error',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-rose-900/50 rounded bg-rose-950/20">
      <div className="p-2.5 bg-rose-900/40 rounded border border-rose-700/50 text-rose-400 mb-3">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-rose-200 mb-1">{title}</h3>
      <p className="text-xs text-rose-300/80 font-mono max-w-lg mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-medium rounded transition"
        >
          Retry Subprocess
        </button>
      )}
    </div>
  );
};
