import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Brain, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const STAGE_LABELS = [
  'Ingesting',
  'Verifying',
  'Analyzing',
  'Reasoning',
  'Charts',
  'Planning',
  'Validating',
  'Writing',
  'Verifying',
  'Compiling',
];

const RADIUS = 150;
const CENTER_X = 200;
const CENTER_Y = 200;

// Precompute 10 circular stage coordinates around (200, 200)
const STAGE_NODES = STAGE_LABELS.map((label, i) => {
  const angle = -Math.PI / 2 + i * ((2 * Math.PI) / 10);
  const x = Math.round(CENTER_X + RADIUS * Math.cos(angle));
  const y = Math.round(CENTER_Y + RADIUS * Math.sin(angle));
  return { label, index: i, x, y };
});

export const ProcessingOverlay: React.FC = () => {
  const {
    isProcessing,
    progress,
    stageName,
    subStatus,
    elapsedSeconds,
    cancelProcessing,
    targetReportId,
  } = useApp();

  const navigate = useNavigate();
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [displayedSubStatus, setDisplayedSubStatus] = useState('');

  const targetReportIdRef = useRef(targetReportId);
  useEffect(() => {
    targetReportIdRef.current = targetReportId;
  }, [targetReportId]);

  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (isProcessing) {
      hasNavigatedRef.current = false;
    }
  }, [isProcessing]);

  // Navigate when 100% is reached (ONCE PER GENERATION)
  useEffect(() => {
    if (progress >= 100 && targetReportId && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          navigate(`/worker/preview/${targetReportIdRef.current || targetReportId}`);
        }, 400);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, targetReportId, navigate]);

  // Typewriter effect for subStatus
  useEffect(() => {
    if (!subStatus) {
      setDisplayedSubStatus('');
      return;
    }
    setDisplayedSubStatus('');
    let idx = 0;
    const target = subStatus;
    const timer = setInterval(() => {
      idx++;
      setDisplayedSubStatus(target.slice(0, idx));
      if (idx >= target.length) {
        clearInterval(timer);
      }
    }, 22);

    return () => clearInterval(timer);
  }, [subStatus]);

  if (!isProcessing) return null;

  // Active stage index (0 to 9)
  const stageIndex = Math.min(9, Math.floor((progress / 100) * 10));

  // Format elapsed time (00:MM:SS) in JetBrains Mono
  const formatTimer = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl overflow-hidden select-none"
      >
        {/* Ambient radial lighting glow */}
        <div className="absolute w-[600px] h-[600px] rounded-full bg-radial from-[#00D9FF]/12 via-[#FFA726]/6 to-transparent blur-3xl pointer-events-none" />

        {/* CENTER CONTAINER: Gamma-style Glass Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: isFadingOut ? 0 : 1,
            scale: isFadingOut ? 0.95 : 1,
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-[520px] rounded-[24px] p-[40px] flex flex-col items-center backdrop-blur-xl"
          style={{
            backgroundColor: 'rgba(10, 14, 23, 0.85)',
            border: '1px solid rgba(0, 217, 255, 0.15)',
            boxShadow: '0 0 80px rgba(0, 217, 255, 0.15)',
          }}
        >
          {/* TOP: Percentage + Stage Label + Progress Bar */}
          <div className="w-full flex flex-col items-center">
            <span className="font-mono text-[64px] font-bold tracking-tight leading-none bg-gradient-to-r from-[#00D9FF] via-[#38BDF8] to-[#FFA726] bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(0,217,255,0.4)]">
              {Math.round(progress)}%
            </span>
            <span className="text-[11px] uppercase tracking-widest text-gray-400 font-mono font-medium mt-2">
              {stageName || 'Processing Report'}
            </span>
            <div className="w-full bg-slate-800/80 rounded-full h-[2px] mt-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00D9FF] to-[#FFA726] transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>

          {/* CENTER: Neural Web SVG (400x400 viewBox) */}
          <div className="relative w-[380px] h-[380px] my-2 flex items-center justify-center">
            <svg
              className="w-full h-full"
              viewBox="0 0 400 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="cyanGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="amberGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="centralCoreGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#00D9FF" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#00D9FF" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Connecting Lines (Center -> Each Stage Node) */}
              {STAGE_NODES.map((node) => {
                const isComplete = progress >= 100 || node.index < stageIndex;
                const isActive = progress < 100 && node.index === stageIndex;

                if (isComplete) {
                  return (
                    <line
                      key={`conn-complete-${node.index}`}
                      x1={CENTER_X}
                      y1={CENTER_Y}
                      x2={node.x}
                      y2={node.y}
                      stroke="rgba(0, 217, 255, 0.6)"
                      strokeWidth={1.5}
                      filter="url(#cyanGlow)"
                    />
                  );
                }

                if (isActive) {
                  return (
                    <motion.line
                      key={`conn-active-${node.index}`}
                      x1={CENTER_X}
                      y1={CENTER_Y}
                      x2={node.x}
                      y2={node.y}
                      stroke="#FFA726"
                      strokeWidth={1.5}
                      strokeDasharray="150"
                      initial={{ strokeDashoffset: 150 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      filter="url(#amberGlow)"
                    />
                  );
                }

                return (
                  <line
                    key={`conn-pending-${node.index}`}
                    x1={CENTER_X}
                    y1={CENTER_Y}
                    x2={node.x}
                    y2={node.y}
                    stroke="rgba(148, 163, 184, 0.15)"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Central Node Expanding Ring on 100% completion */}
              {progress >= 100 && (
                <motion.circle
                  cx={CENTER_X}
                  cy={CENTER_Y}
                  initial={{ r: 32, opacity: 0.9 }}
                  animate={{ r: 75, opacity: 0 }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: 'easeOut' }}
                  fill="none"
                  stroke="#00D9FF"
                  strokeWidth={2}
                />
              )}

              {/* Central Node Pulse (r=32, 2s loop) */}
              <motion.g
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: `${CENTER_X}px ${CENTER_Y}px` }}
              >
                <circle
                  cx={CENTER_X}
                  cy={CENTER_Y}
                  r={32}
                  fill="url(#centralCoreGradient)"
                  stroke="#00D9FF"
                  strokeWidth={2}
                  filter="url(#cyanGlow)"
                />
                <foreignObject
                  x={CENTER_X - 16}
                  y={CENTER_Y - 16}
                  width={32}
                  height={32}
                  className="pointer-events-none"
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(0,217,255,0.85)]" />
                  </div>
                </foreignObject>
              </motion.g>

              {/* 10 Outer Stage Nodes */}
              {STAGE_NODES.map((node) => {
                const isComplete = progress >= 100 || node.index < stageIndex;
                const isActive = progress < 100 && node.index === stageIndex;

                return (
                  <g key={`stage-node-${node.index}`}>
                    {/* Circle r=12 */}
                    {isComplete ? (
                      <motion.g
                        initial={false}
                        animate={
                          progress >= 100
                            ? { scale: [1, 1.15, 1] }
                            : undefined
                        }
                        transition={{
                          duration: 0.6,
                          repeat: progress >= 100 ? Infinity : 0,
                          ease: 'easeInOut',
                        }}
                        style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                      >
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={12}
                          initial={false}
                          animate={{ fill: '#00D9FF', stroke: '#00D9FF' }}
                          transition={{ duration: 0.3 }}
                          strokeWidth={1.5}
                          filter="url(#cyanGlow)"
                        />
                        <foreignObject
                          x={node.x - 6}
                          y={node.y - 6}
                          width={12}
                          height={12}
                          className="pointer-events-none"
                        >
                          <div className="w-full h-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
                          </div>
                        </foreignObject>
                      </motion.g>
                    ) : isActive ? (
                      <motion.circle
                        cx={node.x}
                        cy={node.y}
                        r={12}
                        fill="#FFA726"
                        stroke="#FFA726"
                        strokeWidth={2}
                        filter="url(#amberGlow)"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                      />
                    ) : (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={12}
                        fill="#1e293b"
                        stroke="#334155"
                        strokeWidth={1.5}
                      />
                    )}

                    {/* Label below node (9px uppercase) */}
                    <text
                      x={node.x}
                      y={node.y + 19}
                      textAnchor="middle"
                      className="text-[9px] uppercase font-mono tracking-wider font-semibold select-none pointer-events-none"
                      fill={isComplete ? '#67e8f9' : isActive ? '#fcd34d' : '#6b7280'}
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* BOTTOM: Typewriter Sub-Status Text */}
          <div className="min-h-[42px] flex items-center justify-center text-center px-2 mt-1">
            <p className="text-[13px] italic text-gray-300 max-w-[420px] line-clamp-2 leading-relaxed">
              {displayedSubStatus}
              {displayedSubStatus && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#00D9FF] animate-pulse align-middle" />
              )}
            </p>
          </div>
        </motion.div>

        {/* BOTTOM BAR (outside card) */}
        <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between pointer-events-auto">
          {/* Left: Elapsed timer "00:02:14" JetBrains Mono gray-500 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-gray-500 font-mono text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Right: Cancel ghost button (red on hover) */}
          <button
            onClick={cancelProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700/60 bg-slate-900/40 text-slate-300 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-all text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
