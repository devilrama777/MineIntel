import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Layers, 
  Activity, 
  ShieldCheck,
  Zap,
  FileText
} from 'lucide-react';
import { MineIntelLogo } from './MineIntelLogo';

interface IntelligenceVisualCoreProps {
  isDark?: boolean;
}

export const IntelligenceVisualCore: React.FC<IntelligenceVisualCoreProps> = ({ isDark = false }) => {
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(14);
  const [isAutoSpinning, setIsAutoSpinning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [accuracy, setAccuracy] = useState(99.8);
  const dragStartRef = useRef<{ 
    x: number; 
    y: number; 
    startRotX: number; 
    startRotY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
  }>({
    x: 0,
    y: 0,
    startRotX: 14,
    startRotY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0
  });
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const momentumVelocityRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Smooth continuous 360-degree rotation loop with physics momentum
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      if (!isDragging) {
        if (Math.abs(momentumVelocityRef.current) > 0.05) {
          setRotationY((prev) => (prev + momentumVelocityRef.current * delta * 60 + 3600) % 360);
          momentumVelocityRef.current *= 0.94; // friction decay
        } else if (isAutoSpinning) {
          setRotationY((prev) => (prev + delta * 22) % 360);
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoSpinning, isDragging]);

  // Subtle telemetry jitter
  useEffect(() => {
    const interval = setInterval(() => {
      setAccuracy(+(99.5 + Math.random() * 0.4).toFixed(1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Universal 360-degree interactive pointer drag handlers (Mouse + Touch + Pen)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }

    setIsDragging(true);
    momentumVelocityRef.current = 0;
    const now = performance.now();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startRotX: rotationX,
      startRotY: rotationY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: now
    };
    velocityRef.current = { vx: 0, vy: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - dragStartRef.current.lastTime);
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Calculate instantaneous velocity for flick/momentum
    const vx = (e.clientX - dragStartRef.current.lastX) / dt;
    const vy = (e.clientY - dragStartRef.current.lastY) / dt;
    velocityRef.current = { vx, vy };

    dragStartRef.current.lastX = e.clientX;
    dragStartRef.current.lastY = e.clientY;
    dragStartRef.current.lastTime = now;

    // Full 360-degree continuous yaw spin & pitch tilt in 3D
    const newRotY = ((dragStartRef.current.startRotY + dx * 0.85) % 360 + 360) % 360;
    const newRotX = Math.max(-65, Math.min(65, dragStartRef.current.startRotX - dy * 0.55));

    setRotationY(newRotY);
    setRotationX(newRotX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // safe fallback
    }
    setIsDragging(false);

    // Apply inertia if user released while dragging with speed
    if (Math.abs(velocityRef.current.vx) > 0.15) {
      momentumVelocityRef.current = Math.max(-12, Math.min(12, velocityRef.current.vx * 8));
    }
  };

  return (
    <div 
      className="relative w-full h-[380px] sm:h-[420px] flex items-center justify-center select-none perspective-1200 cursor-grab active:cursor-grabbing touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Ambient Lighting & Hologram Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-88 h-88 rounded-full bg-blue-600/15 dark:bg-blue-500/25 blur-3xl animate-pulse-glow" />
        <div className="w-64 h-64 rounded-full bg-amber-400/10 dark:bg-amber-500/15 blur-2xl -translate-y-8" />
      </div>

      {/* ========================================================================= */}
      {/* 360-DEGREE CONTINUOUS 3D PERSPECTIVE SCENE                                */}
      {/* ========================================================================= */}
      <div 
        style={{
          transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`,
          transformStyle: 'preserve-3d',
          transition: isDragging ? 'none' : 'transform 0.05s linear',
        }}
        className="relative w-full max-w-[420px] h-[360px] flex items-center justify-center preserve-3d"
      >
        {/* ======================================================================= */}
        {/* LAYER 1: DEEP 360° CYBER FLOOR RADAR (Z: -100px)                         */}
        {/* ======================================================================= */}
        <div 
          style={{ transform: 'translateZ(-100px) rotateX(72deg)' }}
          className="absolute w-[360px] h-[360px] rounded-full flex items-center justify-center pointer-events-none preserve-3d opacity-85 dark:opacity-90"
        >
          <div className="absolute inset-0 rounded-full border border-blue-500/25 dark:border-blue-400/35" />
          <div className="absolute inset-6 rounded-full border border-dashed border-blue-500/35 dark:border-blue-400/40 animate-spin-slow" />
          <div className="absolute inset-14 rounded-full border border-neutral-300/40 dark:border-blue-800/40" />
          <div className="absolute inset-22 rounded-full border border-amber-400/30 dark:border-amber-500/35 animate-spin-reverse-slow" />
          
          <svg className="w-full h-full" viewBox="0 0 360 360" fill="none">
            <line x1="180" y1="10" x2="180" y2="350" stroke={isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(37, 99, 235, 0.25)"} strokeWidth="1" strokeDasharray="4 4" />
            <line x1="10" y1="180" x2="350" y2="180" stroke={isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(37, 99, 235, 0.25)"} strokeWidth="1" strokeDasharray="4 4" />
            <polygon points="180,50 292,115 292,245 180,310 68,245 68,115" stroke={isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(37, 99, 235, 0.3)"} strokeWidth="1.5" strokeDasharray="6 4" />
          </svg>

          {/* Sweeping 360 Radar */}
          <div className="absolute inset-0 rounded-full overflow-hidden animate-radar-sweep pointer-events-none">
            <div className="w-1/2 h-1/2 bg-gradient-to-br from-blue-500/30 via-blue-500/10 to-transparent origin-bottom-right" />
          </div>
        </div>

        {/* ======================================================================= */}
        {/* LAYER 2: 360° REVOLVING GIMBAL RINGS (Z: -25px to +25px)                 */}
        {/* ======================================================================= */}
        {/* Gimbal 1: Tilted on X-axis (68deg) */}
        <div 
          style={{ transform: 'translateZ(-20px) rotateX(68deg)' }}
          className="absolute w-[310px] h-[310px] rounded-full border border-blue-500/40 dark:border-blue-400/50 animate-spin-slow pointer-events-none preserve-3d"
        >
          <div 
            style={{ transform: 'translateZ(18px)' }}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/60 ring-2 ring-white dark:ring-blue-300"
          />
          <div 
            style={{ transform: 'translateZ(-14px)' }}
            className="absolute bottom-4 right-10 w-3 h-3 rounded-full bg-amber-400 shadow-md shadow-amber-400/60"
          />
        </div>

        {/* Gimbal 2: Tilted on Y-axis (65deg) */}
        <div 
          style={{ transform: 'translateZ(15px) rotateY(65deg)' }}
          className="absolute w-[290px] h-[290px] rounded-full border border-dashed border-amber-400/45 dark:border-amber-400/55 animate-spin-reverse-slow pointer-events-none preserve-3d"
        >
          <div 
            style={{ transform: 'translateZ(16px)' }}
            className="absolute top-1/4 left-0 w-3.5 h-3.5 rounded-full bg-amber-500 shadow-md shadow-amber-500/70"
          />
          <div 
            style={{ transform: 'translateZ(-12px)' }}
            className="absolute bottom-1/4 right-0 w-3 h-3 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/70"
          />
        </div>

        {/* Gimbal 3: Equatorial Tech Ring with 360-degree ticks */}
        <div 
          style={{ transform: 'translateZ(25px)', animationDuration: '36s' }}
          className="absolute w-[270px] h-[270px] rounded-full border border-neutral-300/70 dark:border-blue-800/70 pointer-events-none animate-spin-slow"
        >
          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-blue-500 font-extrabold">000°</div>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-mono text-blue-500 font-extrabold">090°</div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-blue-500 font-extrabold">180°</div>
          <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-mono text-blue-500 font-extrabold">270°</div>
        </div>

        {/* ======================================================================= */}
        {/* LAYER 3: 3D DUAL-SIDED HOLOGRAPHIC DOCUMENT SLAB (Z: +50px)              */}
        {/* Beautiful from front (0-90° / 270-360°) and back (90-270°)             */}
        {/* ======================================================================= */}
        <div 
          style={{ transform: 'translateZ(50px)' }}
          className="relative w-[215px] sm:w-[235px] h-[195px] sm:h-[205px] rounded-2xl bg-white/92 dark:bg-[#071329]/94 backdrop-blur-xl border-2 border-blue-400/50 dark:border-blue-500/50 shadow-2xl shadow-blue-900/50 p-3.5 flex flex-col justify-between overflow-hidden preserve-3d"
        >
          {/* 3D Slab Thickness Rim */}
          <div className="absolute -bottom-2.5 -right-2.5 w-full h-full rounded-2xl border-r-4 border-b-4 border-blue-600/35 dark:border-blue-400/50 pointer-events-none" />

          {/* Sweeping 3D Laser Scan Bar */}
          <div className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/90 animate-laser-scan z-20 pointer-events-none" />
          
          {/* Header of 3D Document Slab */}
          <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-blue-900/50 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider font-outfit">
                MineIntel Synthesizer
              </span>
            </div>
            <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-extrabold">
              360° 3D
            </span>
          </div>

          {/* Mid Section: Telemetry Bars & Live Data Synthesis */}
          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between text-[9px] font-bold text-neutral-600 dark:text-blue-200/80">
              <span>PDF Reasoning Engine</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">{accuracy}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-blue-950/80 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-amber-400 rounded-full w-[96%] animate-pulse" />
            </div>

            {/* Live Audio / Frequency Waveform Equalizer */}
            <div className="flex items-end justify-between gap-1 h-8 pt-1 px-1">
              {[45, 78, 55, 92, 65, 88, 50, 95, 72, 54, 82, 68].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-xs bg-blue-500 dark:bg-blue-400"
                  style={{
                    height: `${h}%`,
                    opacity: 0.45 + (i % 3) * 0.28,
                    animation: `pulseGlow ${1.1 + (i % 4) * 0.3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.07}s`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Footer of 3D Document Slab */}
          <div className="pt-2 border-t border-neutral-200/80 dark:border-blue-900/50 flex items-center justify-between text-[9px] font-mono text-neutral-500 dark:text-blue-300/80">
            <div className="flex items-center gap-1 font-bold">
              <Activity className="w-3 h-3 text-amber-500 animate-pulse" />
              <span>Multi-Modal 360°</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">LIVE AUDIT</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* LAYER 4: THE EXACT MINEINTEL LOGO IN 3D HOVER (Z: +105px)               */}
        {/* Floating high in front of the core with an electric aura                */}
        {/* ======================================================================= */}
        <div 
          style={{ transform: 'translateZ(105px)' }}
          className="absolute -top-5 sm:-top-7 z-30 preserve-3d"
        >
          <div className="relative p-2.5 rounded-2xl bg-white/95 dark:bg-[#060e22]/95 backdrop-blur-xl border-2 border-blue-400 dark:border-blue-500/70 shadow-2xl shadow-blue-500/40 ring-2 ring-blue-500/40 hover:scale-110 transition-transform duration-300">
            {/* Glowing Aura Behind Emblem */}
            <div className="absolute inset-0 rounded-2xl bg-blue-500/35 dark:bg-blue-500/45 blur-lg -z-10 animate-pulse" />
            
            {/* The EXACT Official MineIntel Logo */}
            <MineIntelLogo variant="full" size={72} showGlow={true} />
          </div>
        </div>

        {/* ======================================================================= */}
        {/* LAYER 5: 360° REVOLVING TELEMETRY SATELLITES (Z: +135px to +165px)      */}
        {/* ======================================================================= */}

        {/* Satellite 1: Top-Left Scan Node */}
        <div 
          style={{ transform: 'translateZ(140px)' }}
          className="absolute -top-7 -left-6 sm:-left-12 z-40 preserve-3d animate-float-gentle"
        >
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#071326]/95 border border-blue-300 dark:border-blue-500/50 shadow-xl backdrop-blur-md">
            <div className="p-1 rounded-lg bg-blue-100 dark:bg-blue-900/70 text-blue-600 dark:text-blue-300">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-outfit text-[10px] font-bold text-neutral-900 dark:text-white leading-tight">
                Multi-Modal Scan
              </div>
              <div className="text-[9px] font-mono text-neutral-500 dark:text-blue-300/70">
                PDF &bull; DOCX &bull; CSV
              </div>
            </div>
          </div>
        </div>

        {/* Satellite 2: Top-Right Strategic Synthesis */}
        <div 
          style={{ transform: 'translateZ(165px)', animationDelay: '-2.5s' }}
          className="absolute top-4 -right-6 sm:-right-12 z-40 preserve-3d animate-float-reverse"
        >
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#071326]/95 border border-amber-300 dark:border-amber-500/50 shadow-xl backdrop-blur-md">
            <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-outfit text-[10px] font-bold text-neutral-900 dark:text-white leading-tight">
                Executive Synthesis
              </div>
              <div className="text-[9px] font-mono text-amber-600 dark:text-amber-300/90 font-bold">
                Risk &amp; KPI Matrix
              </div>
            </div>
          </div>
        </div>

        {/* Satellite 3: Bottom-Right Precision Audit */}
        <div 
          style={{ transform: 'translateZ(130px)', animationDelay: '-1.5s' }}
          className="absolute -bottom-6 right-1 sm:right-0 z-40 preserve-3d animate-float-gentle"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#071326]/95 border border-emerald-300 dark:border-emerald-500/50 shadow-xl backdrop-blur-md">
            <div className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-outfit text-[10px] font-bold text-neutral-900 dark:text-white leading-tight">
                Intelligence Engine
              </div>
              <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                {accuracy}% Precision
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
