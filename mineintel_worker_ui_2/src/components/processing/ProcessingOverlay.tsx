import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Navigate when 100% is reached
  useEffect(() => {
    if (progress >= 100 && targetReportId) {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          navigate(`/worker/preview/${targetReportId}`);
        }, 400);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, targetReportId, navigate]);

  // Canvas 2D Particle Funnel
  useEffect(() => {
    if (!isProcessing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      speedY: number;
      radius: number;
      color: string;
      alpha: number;
      originalX: number;
      swayOffset: number;
      swaySpeed: number;
    }

    const particleCount = 250;
    const particles: Particle[] = [];
    const colors = ['#00D9FF', '#FFA726', '#38BDF8', '#FBBF24', '#00F0FF'];

    // Target funnel vortex point (bottom center)
    const targetY = height * 0.78;
    const targetX = width / 2;

    for (let i = 0; i < particleCount; i++) {
      const startX = Math.random() * width;
      particles.push({
        x: startX,
        y: Math.random() * -height,
        speedY: 1.8 + Math.random() * 2.8,
        radius: 1.2 + Math.random() * 2.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.3 + Math.random() * 0.7,
        originalX: startX,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.03,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw Cone Glow at bottom center
      const coneRadius = Math.min(width * 0.28, 220);
      const gradientCone = ctx.createRadialGradient(
        targetX,
        targetY,
        10,
        targetX,
        targetY,
        coneRadius
      );
      gradientCone.addColorStop(0, 'rgba(0, 217, 255, 0.28)');
      gradientCone.addColorStop(0.4, 'rgba(255, 167, 38, 0.12)');
      gradientCone.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradientCone;
      ctx.beginPath();
      ctx.arc(targetX, targetY, coneRadius, 0, Math.PI * 2);
      ctx.fill();

      // Funnel guidelines (faint luminous cone)
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(targetX - width * 0.45, 0);
      ctx.lineTo(targetX, targetY);
      ctx.lineTo(targetX + width * 0.45, 0);
      ctx.stroke();

      // Render each particle converging toward cone point
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.swayOffset += p.swaySpeed;

        // Progress factor from top (0) to funnel target (1)
        const progressT = Math.max(0, Math.min(1, p.y / targetY));

        // Lateral convergence: interpolate from originalX to targetX
        const currentLateralTarget = p.originalX + (targetX - p.originalX) * Math.pow(progressT, 1.8);
        p.x = currentLateralTarget + Math.sin(p.swayOffset) * (1 - progressT) * 12;

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (1 - progressT * 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Reset particle when reaching cone convergence
        if (p.y >= targetY || p.y > height) {
          p.y = -20 - Math.random() * 50;
          p.originalX = Math.random() * width;
          p.x = p.originalX;
          p.speedY = 1.8 + Math.random() * 2.8;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isProcessing]);

  if (!isProcessing) return null;

  // Format elapsed time (00:MM:SS)
  const formatTimer = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // SVG Ring calculation: 200px diameter -> radius 86px
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progress) / 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, scale: isFadingOut ? 1.05 : 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl overflow-hidden select-none"
      >
        {/* Particle Canvas Background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none w-full h-full"
        />

        {/* Pulsing ambient glow */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-radial from-[#00D9FF]/15 via-[#FFA726]/8 to-transparent blur-3xl pointer-events-none" />

        {/* Center Circular Progress Ring & Info */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-lg">
          {/* Ring */}
          <div className="relative w-[220px] h-[220px] flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="cyanAmberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D9FF" />
                  <stop offset="60%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#FFA726" />
                </linearGradient>
                <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Track */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="8"
                fill="none"
              />

              {/* Progress */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="url(#cyanAmberGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                filter="url(#glowFilter)"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                  transition: 'stroke-dashoffset 0.15s ease-out',
                }}
              />
            </svg>

            {/* Center Percentage */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-mono text-5xl font-semibold tracking-tight text-white drop-shadow-[0_0_15px_rgba(0,217,255,0.6)]">
                {Math.round(progress)}%
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#00D9FF] mt-1">
                SYNTHESIS
              </span>
            </div>
          </div>

          {/* Below Ring: Stage Label */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="text-[11px] font-mono tracking-widest text-slate-300 font-semibold uppercase px-3 py-1 bg-slate-900/80 border border-[#00D9FF]/20 rounded-full shadow-inner">
              {stageName}
            </div>

            {/* Sub-status with subtle pulse */}
            <motion.p
              key={subStatus}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-cyan-300 font-medium tracking-wide flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-ping" />
              {subStatus}
            </motion.p>
          </div>
        </div>

        {/* Bottom Bar Controls */}
        <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between pointer-events-auto">
          {/* Bottom-left: Elapsed timer */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">ELAPSED</span>
            <span className="font-mono text-sm font-semibold text-white tracking-wider">
              {formatTimer(elapsedSeconds)}
            </span>
          </div>

          {/* Bottom-right: Cancel ghost button */}
          <button
            onClick={cancelProcessing}
            className="btn-action flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/60 text-slate-300 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-all text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Cancel Operation
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
