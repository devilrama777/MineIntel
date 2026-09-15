import React, { useEffect, useRef } from 'react';

interface FunnelVisualProps {
  isProcessing: boolean;
  stageIndex?: number;
  stageName?: string;
  stageDetail?: string;
  isDark?: boolean;
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
  color: string;
  angle: number;
  radius: number;
  type: 'doc' | 'byte' | 'spark';
  label?: string;
}

export const FunnelVisual: React.FC<FunnelVisualProps> = ({
  isProcessing,
  stageIndex = 0,
  stageName = 'Analyzing Document',
  stageDetail = 'Synthesizing document data points into executive intelligence matrix...',
  isDark = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle pool
    const particleCount = isProcessing ? 75 : 28;
    const particles: Particle[] = [];

    const dataLabels = ['PDF', 'Tables', 'Raw Text', 'Metrics', 'Entities', 'Audit', 'Dates', 'Values'];
    // MineIntel blue & gold palette
    const colorsDark = ['#38bdf8', '#2563eb', '#60a5fa', '#f59e0b', '#fbbf24'];
    const colorsLight = ['#0284c7', '#2563eb', '#3b82f6', '#d97706', '#f59e0b'];

    for (let i = 0; i < particleCount; i++) {
      const palette = isDark ? colorsDark : colorsLight;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.4,
        speed: 1.2 + Math.random() * 2.2,
        size: 2.5 + Math.random() * 3.5,
        opacity: 0.35 + Math.random() * 0.65,
        color: palette[Math.floor(Math.random() * palette.length)],
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * (width * 0.35),
        type: Math.random() > 0.82 ? 'doc' : Math.random() > 0.6 ? 'byte' : 'spark',
        label: dataLabels[Math.floor(Math.random() * dataLabels.length)],
      });
    }

    let pulse = 0;

    const render = () => {
      pulse += 0.035;
      ctx.clearRect(0, 0, width, height);

      // Funnel Geometry coordinates
      const centerX = width / 2;
      const topY = height * 0.12;
      const topRadiusX = Math.min(width * 0.38, 280);
      const topRadiusY = topRadiusX * 0.22;

      const throatY = height * 0.68;
      const throatRadiusX = topRadiusX * 0.18;
      const throatRadiusY = throatRadiusX * 0.28;

      const bottomY = height * 0.88;
      const bottomRadiusX = topRadiusX * 0.24;
      const bottomRadiusY = bottomRadiusX * 0.25;

      // 1. Draw Funnel Ambient Wireframe Lines & Rings
      ctx.save();
      const strokeStyle = isDark
        ? `rgba(37, 99, 235, ${isProcessing ? 0.45 : 0.2})`
        : `rgba(29, 78, 216, ${isProcessing ? 0.35 : 0.15})`;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 1.4;

      // Top Ring (Funnel Rim)
      ctx.beginPath();
      ctx.ellipse(centerX, topY, topRadiusX, topRadiusY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Intermediate Rings along the taper
      const intermediateSteps = 5;
      for (let s = 1; s <= intermediateSteps; s++) {
        const ratio = s / (intermediateSteps + 1);
        const currentY = topY + (throatY - topY) * ratio;
        const currentRx = topRadiusX - (topRadiusX - throatRadiusX) * Math.pow(ratio, 0.85);
        const currentRy = currentRx * 0.22;

        ctx.beginPath();
        ctx.ellipse(centerX, currentY, currentRx, currentRy, 0, 0, Math.PI * 2);
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = isDark
          ? `rgba(56, 189, 248, ${0.15 + Math.sin(pulse + s) * 0.06})`
          : `rgba(37, 99, 235, ${0.12 + Math.sin(pulse + s) * 0.05})`;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Funnel Outer Wall Guide Curves
      ctx.beginPath();
      // Left contour
      ctx.moveTo(centerX - topRadiusX, topY);
      ctx.bezierCurveTo(
        centerX - topRadiusX * 0.7, topY + (throatY - topY) * 0.45,
        centerX - throatRadiusX * 1.3, throatY - 20,
        centerX - throatRadiusX, throatY
      );
      // Down through nozzle
      ctx.lineTo(centerX - bottomRadiusX, bottomY);
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(2, 132, 199, 0.4)';
      ctx.lineWidth = isProcessing ? 2 : 1.3;
      ctx.stroke();

      // Right contour
      ctx.beginPath();
      ctx.moveTo(centerX + topRadiusX, topY);
      ctx.bezierCurveTo(
        centerX + topRadiusX * 0.7, topY + (throatY - topY) * 0.45,
        centerX + throatRadiusX * 1.3, throatY - 20,
        centerX + throatRadiusX, throatY
      );
      ctx.lineTo(centerX + bottomRadiusX, bottomY);
      ctx.stroke();

      // Funnel Throat Ring
      ctx.beginPath();
      ctx.ellipse(centerX, throatY, throatRadiusX, throatRadiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = isDark
        ? `rgba(37, 99, 235, ${isProcessing ? 0.4 : 0.18})`
        : `rgba(29, 78, 216, ${isProcessing ? 0.3 : 0.12})`;
      ctx.fill();
      ctx.strokeStyle = isDark ? '#38bdf8' : '#2563eb';
      ctx.stroke();

      // Funnel Bottom Nozzle Emitter
      ctx.beginPath();
      ctx.ellipse(centerX, bottomY, bottomRadiusX, bottomRadiusY, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? '#f59e0b' : '#d97706';
      ctx.stroke();

      // Energy Cone Gradient inside funnel
      if (isProcessing) {
        const energyGrad = ctx.createLinearGradient(centerX, topY, centerX, bottomY);
        if (isDark) {
          energyGrad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
          energyGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.22)');
          energyGrad.addColorStop(0.85, 'rgba(245, 158, 11, 0.3)');
          energyGrad.addColorStop(1, 'rgba(251, 191, 36, 0.5)');
        } else {
          energyGrad.addColorStop(0, 'rgba(2, 132, 199, 0.06)');
          energyGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.16)');
          energyGrad.addColorStop(0.85, 'rgba(217, 119, 6, 0.25)');
          energyGrad.addColorStop(1, 'rgba(245, 158, 11, 0.4)');
        }

        ctx.beginPath();
        ctx.moveTo(centerX - topRadiusX, topY);
        ctx.bezierCurveTo(
          centerX - topRadiusX * 0.7, topY + (throatY - topY) * 0.45,
          centerX - throatRadiusX * 1.3, throatY - 20,
          centerX - throatRadiusX, throatY
        );
        ctx.lineTo(centerX - bottomRadiusX, bottomY);
        ctx.lineTo(centerX + bottomRadiusX, bottomY);
        ctx.lineTo(centerX + throatRadiusX, throatY);
        ctx.bezierCurveTo(
          centerX + throatRadiusX * 1.3, throatY - 20,
          centerX + topRadiusX * 0.7, topY + (throatY - topY) * 0.45,
          centerX + topRadiusX, topY
        );
        ctx.closePath();
        ctx.fillStyle = energyGrad;
        ctx.fill();

        // Emitter Ray beam shooting downward from bottom nozzle
        const beamGrad = ctx.createLinearGradient(centerX, bottomY, centerX, height);
        beamGrad.addColorStop(0, isDark ? 'rgba(245, 158, 11, 0.7)' : 'rgba(217, 119, 6, 0.6)');
        beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(centerX - bottomRadiusX, bottomY);
        ctx.lineTo(centerX + bottomRadiusX, bottomY);
        ctx.lineTo(centerX + bottomRadiusX * 1.8, height);
        ctx.lineTo(centerX - bottomRadiusX * 1.8, height);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // 2. Animate Particles Funneling Downward
      particles.forEach((p, idx) => {
        p.angle += 0.02 * (isProcessing ? 1.8 : 0.8);
        p.y += p.speed * (isProcessing ? 1.9 : 0.9);

        // Funnel boundary calculation at current y
        let currentWidthAtY = topRadiusX;
        if (p.y < topY) {
          currentWidthAtY = topRadiusX * 1.25;
        } else if (p.y >= topY && p.y <= throatY) {
          const progress = (p.y - topY) / (throatY - topY);
          currentWidthAtY = topRadiusX - (topRadiusX - throatRadiusX) * Math.pow(progress, 0.75);
        } else if (p.y > throatY && p.y <= bottomY) {
          currentWidthAtY = throatRadiusX;
        } else {
          // Output zone below bottom
          currentWidthAtY = bottomRadiusX * 1.4;
        }

        // Spiral toward center as particle drops through funnel
        const spiralX = Math.cos(p.angle) * (currentWidthAtY * (0.2 + (idx % 7) * 0.11));
        p.x = centerX + spiralX;

        // Reset particle when it drops below the canvas
        if (p.y > height + 20) {
          p.y = topY - 30 - Math.random() * 50;
          p.angle = Math.random() * Math.PI * 2;
          p.speed = (isProcessing ? 2.0 : 1.2) + Math.random() * 2;
        }

        // Draw particle
        ctx.save();
        if (p.y > bottomY && isProcessing) {
          // In the output zone: particles turn into bright amber/gold synthesized intelligence sparks
          ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = p.color;
          if (isProcessing) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
          }
        }

        ctx.globalAlpha = p.y < topY - 20 ? 0.3 : p.opacity;

        if (p.type === 'doc' && isProcessing && p.y < throatY) {
          // Little miniature document icon or tag
          ctx.fillStyle = isDark ? 'rgba(11, 22, 42, 0.9)' : 'rgba(241, 245, 249, 0.95)';
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          const cardW = 38;
          const cardH = 16;
          ctx.beginPath();
          ctx.roundRect(p.x - cardW / 2, p.y - cardH / 2, cardW, cardH, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
          ctx.font = '600 8px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.label || 'DATA', p.x, p.y);
        } else {
          // Glowing particle dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, isProcessing ? p.size * 1.1 : p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isProcessing, isDark]);

  return (
    <div className="relative w-full h-full overflow-hidden pointer-events-none select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {/* Floating Center Badge during Processing */}
      {isProcessing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
          <div className="mt-28 flex flex-col items-center text-center px-4 max-w-md animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm border border-amber-500/40 bg-amber-500/15 text-amber-500 dark:text-amber-400 backdrop-blur-md mb-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Stage {stageIndex + 1} of 5: {stageName}
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 dark:text-blue-100 font-medium">
              {stageDetail}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
