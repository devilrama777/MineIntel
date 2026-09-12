import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const btnBg = {
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white',
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-[#161e2b] border border-slate-700/80 rounded-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#121924]">
          <div className="flex items-center gap-2.5 text-slate-200 font-semibold text-sm">
            <AlertTriangle className={`w-4 h-4 ${variant === 'danger' ? 'text-rose-400' : 'text-amber-400'}`} />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 text-xs text-slate-300 leading-relaxed">
          {description}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-800 bg-[#121924]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition ${btnBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
