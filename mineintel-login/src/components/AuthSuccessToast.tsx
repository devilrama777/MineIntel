import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, CheckCircle2, X, Sparkles } from 'lucide-react';

interface AuthSuccessToastProps {
  isOpen: boolean;
  onClose: () => void;
  officerId: string;
  durationMs?: number;
}

export const AuthSuccessToast: React.FC<AuthSuccessToastProps> = ({
  isOpen,
  onClose,
  officerId,
  durationMs = 5000,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(durationMs);

  useEffect(() => {
    if (!isOpen) {
      setRemainingTime(durationMs);
      setIsPaused(false);
      return;
    }

    if (isPaused) return;

    const interval = 50;
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= interval) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - interval;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, durationMs, onClose]);

  const progressPercentage = Math.max(0, Math.min(100, (remainingTime / durationMs) * 100));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="auth-success-toast"
          role="status"
          aria-live="polite"
          initial={{ x: 80, opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 80, opacity: 0, scale: 0.92, transition: { duration: 0.2, ease: 'easeIn' } }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md pointer-events-auto"
        >
          {/* Card container with glowing accent border */}
          <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#0b1324]/95 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-500/40 shadow-2xl shadow-emerald-500/10 dark:shadow-black/70 p-4 transition-colors">
            {/* Top gradient glow shimmer */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500" />

            <div className="flex items-start gap-3.5">
              {/* Status icon with pulse aura */}
              <div className="relative shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
              </div>

              {/* Toast content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
                    Authentication Successful
                  </h4>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    <Sparkles className="w-2.5 h-2.5" />
                    Verified
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Session initialized for <span className="font-semibold text-slate-900 dark:text-white">{officerId || 'Officer'}</span>. MineIntel report generator access granted.
                </p>

                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Enclave Active
                  </span>
                  <span>•</span>
                  <span>Clearance Level 4</span>
                </div>
              </div>

              {/* Dismiss button */}
              <button
                type="button"
                onClick={onClose}
                id="btn-dismiss-toast"
                aria-label="Dismiss notification"
                className="shrink-0 p-1.5 -mr-1 -mt-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Timed dismiss progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-75 ease-linear"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
