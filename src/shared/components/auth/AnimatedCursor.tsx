import React, { useEffect, useRef } from 'react';

interface AnimatedCursorProps {
  isDark: boolean;
}

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  decay: number;
}

interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export const AnimatedCursor: React.FC<AnimatedCursorProps> = ({ isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Only activate on pointer-fine (desktop mouse) devices
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId: number;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse positions
    const mouse = { x: -100, y: -100, isVisible: false };
    let isHovering = false;

    const particles: TrailParticle[] = [];
    const ripples: ClickRipple[] = [];

    const darkPalette = ['#38bdf8', '#0284c7', '#22d3ee', '#f59e0b', '#818cf8'];
    const lightPalette = ['#0284c7', '#0369a1', '#0ea5e9', '#d97706', '#6366f1'];

    let lastX = -100;
    let lastY = -100;

    const handlePointerMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.isVisible = true;

      const target = e.target as HTMLElement | null;
      isHovering = !!target?.closest('button, a, input, select, [role="button"], .cursor-pointer');

      // Add trailing micro-ember particle if moved enough
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      if (dist > 7) {
        lastX = e.clientX;
        lastY = e.clientY;
        const palette = isDark ? darkPalette : lightPalette;
        const color = palette[Math.floor(Math.random() * palette.length)];

        particles.push({
          x: e.clientX + (Math.random() * 4 - 2),
          y: e.clientY + (Math.random() * 4 - 2),
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7 - 0.2,
          size: Math.random() * 2.5 + 1,
          alpha: 0.8,
          color,
          decay: 0.03 + Math.random() * 0.02,
        });

        if (particles.length > 70) {
          particles.shift();
        }
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // Pulse ring on click
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 6,
        maxRadius: isHovering ? 36 : 28,
        alpha: 0.9,
        color: isDark ? '#38bdf8' : '#0284c7',
      });

      // Quick tactical spark burst
      const palette = isDark ? darkPalette : lightPalette;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + (Math.random() * 0.3);
        const speed = Math.random() * 2.5 + 1.8;
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 3 + 1.5,
          alpha: 1,
          color: palette[Math.floor(Math.random() * palette.length)],
          decay: 0.045 + Math.random() * 0.02,
        });
      }
    };

    const handleMouseLeave = () => {
      mouse.isVisible = false;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render ripples (on click)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += (r.maxRadius - r.radius) * 0.15 + 0.8;
        r.alpha -= 0.045;

        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.alpha;
        ctx.lineWidth = 1.5;
        if (isDark) {
          ctx.shadowColor = r.color;
          ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Render trailing particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (isDark) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none select-none z-50"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
};
