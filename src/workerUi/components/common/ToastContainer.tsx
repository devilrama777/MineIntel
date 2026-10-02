import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          let Icon = Info;
          let iconColor = 'text-cyan-400';
          let borderColor = 'border-cyan-500/30';
          let bgColor = 'bg-[#0b1322]/95';

          if (t.type === 'success') {
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
            borderColor = 'border-emerald-500/30';
          } else if (t.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = 'text-amber-400';
            borderColor = 'border-amber-500/30';
          } else if (t.type === 'error') {
            Icon = AlertCircle;
            iconColor = 'text-red-400';
            borderColor = 'border-red-500/30';
          }

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-xl shadow-xl shadow-black/40 ${bgColor} ${borderColor}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-xs font-semibold text-white tracking-wide">{t.title}</div>
                {t.message && (
                  <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{t.message}</div>
                )}
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
