import React, { useEffect, useRef } from 'react';

interface ConfettiEffectProps {
  active: boolean;
  onComplete?: () => void;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  tiltAngle: number;
  tiltSpeed: number;
  alpha: number;
  decay: number;
  shape: 'rect' | 'circle' | 'diamond';
}

const CONFETTI_COLORS = [
  '#10b981', // Emerald success
  '#34d399', // Mint emerald
  '#38bdf8', // Cyan
  '#60a5fa', // Soft Blue
  '#fbbf24', // Gold
  '#f59e0b', // Amber
  '#c084fc', // Lilac
  '#f8fafc', // Platinum white
];

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ active, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Launch origin centered around the middle card
    const originX = width / 2;
    const originY = height / 2 - 20;

    const particles: ConfettiParticle[] = [];
    const count = 65; // Subtle, elegant density

    for (let i = 0; i < count; i++) {
      // Fan spread upwards and outwards
      const angle = (Math.PI * 1.5) + (Math.random() * 1.6 - 0.8);
      const velocity = Math.random() * 7 + 4;
      const size = Math.random() * 5 + 3;

      const shapes: Array<'rect' | 'circle' | 'diamond'> = ['rect', 'circle', 'diamond'];

      particles.push({
        x: originX + (Math.random() * 80 - 40),
        y: originY + (Math.random() * 40 - 20),
        vx: Math.cos(angle) * velocity + (Math.random() * 2 - 1),
        vy: Math.sin(angle) * velocity,
        size,
        width: size * (Math.random() * 1.5 + 1),
        height: size,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        tiltAngle: Math.random() * Math.PI,
        tiltSpeed: Math.random() * 0.08 + 0.04,
        alpha: 1,
        decay: Math.random() * 0.008 + 0.006,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.alpha <= 0) continue;

        aliveCount++;

        // Physics: gravity + air resistance
        p.vy += 0.16; // gravity
        p.vx *= 0.985; // air drag
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;

        p.rotation += p.rotationSpeed;
        p.tiltAngle += p.tiltSpeed;
        p.alpha -= p.decay;

        const tilt = Math.sin(p.tiltAngle);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.scale(1, tilt);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        } else if (p.shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (aliveCount > 0) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        onComplete?.();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none select-none z-40"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
};
