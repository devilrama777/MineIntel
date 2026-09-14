import React, { useState, useEffect, useCallback } from 'react';
import { X, KeyRound, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AuthInput } from './AuthInput';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOfficerId?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultOfficerId = '',
}) => {
  const [officerId, setOfficerId] = useState(defaultOfficerId);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = useCallback(() => {
    setSent(false);
    setError(null);
    onClose();
  }, [onClose]);

  // Keyboard navigation: Esc to close modal, Enter on success screen to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'Enter' && sent) {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, sent, handleReset]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerId.trim() || !recoveryEmail.trim()) {
      setError('Officer ID and Recovery Email are required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSent(true);
    }, 700);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-fadeIn"
      id="forgot-password-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleReset();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden text-left">
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset Password</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Recover your MineIntel account access</p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">Recovery Email Dispatched</p>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  A reset link was sent to <span className="font-mono text-blue-600 dark:text-cyan-400">{recoveryEmail}</span>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Enter your assigned Officer ID and registered email address to receive password reset instructions.
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <AuthInput
              id="reset-officer-id"
              label="Officer ID / Username"
              placeholder="e.g., mine_analyst2"
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
            />

            <AuthInput
              id="reset-email"
              type="email"
              label="Email Address"
              placeholder="officer@mineintel.org"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 h-11 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
