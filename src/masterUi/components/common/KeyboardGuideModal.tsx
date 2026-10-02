import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardGuideModal: React.FC<KeyboardGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + /', desc: 'Open Command Palette / Search' },
    { key: 'Ctrl + E', desc: 'Export Executive Archive CSV' },
    { key: 'Ctrl + P', desc: 'Print / Proofing Report' },
    { key: 'Alt + Up', desc: 'Instant Scroll to Top' },
    { key: 'Alt + Down', desc: 'Instant Scroll to Bottom' },
    { key: 'Esc', desc: 'Close any active modal or search' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#0d1424] text-slate-100 shadow-2xl p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Keyboard Shortcuts Guide</h3>
              <p className="text-[10px] text-slate-400">MineIntel Sovereign Desktop Navigation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800/80 bg-[#080d17]"
            >
              <span className="text-slate-300 font-medium">{s.desc}</span>
              <kbd className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-cyan-400 font-bold shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 text-center text-[10px] text-slate-500">
          Press <kbd className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded">Esc</kbd> anytime to dismiss
        </div>
      </div>
    </div>
  );
};
