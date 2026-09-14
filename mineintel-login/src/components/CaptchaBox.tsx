import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCw, Volume2, CheckCircle2 } from 'lucide-react';

interface CaptchaBoxProps {
  value: string;
  onChange: (val: string) => void;
  onCodeGenerated?: (code: string) => void;
  isValid?: boolean | null;
  error?: string | null;
  isDark?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const CHAR_POOL = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const CaptchaBox: React.FC<CaptchaBoxProps> = ({
  value,
  onChange,
  onCodeGenerated,
  isValid = null,
  error = null,
  isDark = true,
  onKeyDown,
}) => {
  const [captchaCode, setCaptchaCode] = useState<string>('');
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCodeGeneratedRef = useRef(onCodeGenerated);

  useEffect(() => {
    onCodeGeneratedRef.current = onCodeGenerated;
  }, [onCodeGenerated]);

  const generateNewCaptcha = useCallback(() => {
    let result = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * CHAR_POOL.length);
      result += CHAR_POOL[randomIndex];
    }
    setCaptchaCode(result);
    onCodeGeneratedRef.current?.(result);
  }, []);

  useEffect(() => {
    generateNewCaptcha();
  }, [generateNewCaptcha]);

  const drawCaptcha = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !captchaCode) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient based on theme
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (isDark) {
      bgGrad.addColorStop(0, '#090e18');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#070b14');
    } else {
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(0.5, '#f1f5f9');
      bgGrad.addColorStop(1, '#e2e8f0');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Dynamic cyber grid lines
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 12; x < width; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 8; y < height; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Security interference spline wave
    const waveColors = isDark
      ? ['rgba(56, 189, 248, 0.65)', 'rgba(245, 158, 11, 0.55)', 'rgba(168, 85, 247, 0.5)']
      : ['rgba(2, 132, 199, 0.55)', 'rgba(217, 119, 6, 0.5)', 'rgba(124, 58, 237, 0.45)'];

    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = waveColors[i % waveColors.length];
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5 + (Math.random() * 20 - 10));
      ctx.bezierCurveTo(
        width * 0.3,
        Math.random() * height,
        width * 0.7,
        Math.random() * height,
        width,
        height * 0.5 + (Math.random() * 20 - 10)
      );
      ctx.stroke();
    }

    // Security noise particles
    for (let i = 0; i < 32; i++) {
      ctx.fillStyle = isDark
        ? `rgba(186, 230, 253, ${Math.random() * 0.45 + 0.2})`
        : `rgba(71, 85, 105, ${Math.random() * 0.35 + 0.15})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 1.5 + 0.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Characters styling with distinctive angles and vivid holographic colors
    const charColors = isDark
      ? ['#38bdf8', '#fbbf24', '#f87171', '#34d399', '#c084fc', '#60a5fa']
      : ['#0284c7', '#d97706', '#dc2626', '#059669', '#7c3aed', '#2563eb'];
    const letterSpacing = (width - 44) / captchaCode.length;

    for (let i = 0; i < captchaCode.length; i++) {
      const char = captchaCode[i];
      ctx.save();
      const x = 24 + i * letterSpacing;
      const y = height / 2 + (Math.sin(i * 1.2) * 5);
      const angle = (Math.sin(i * 1.5) * 14) * (Math.PI / 180);

      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isDark) {
        ctx.shadowColor = charColors[i % charColors.length];
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = charColors[i % charColors.length];
      ctx.fillText(char, 0, 0);

      ctx.restore();
    }
  }, [captchaCode, isDark]);

  useEffect(() => {
    drawCaptcha();
  }, [drawCaptcha]);

  const handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRotating(true);
    generateNewCaptcha();
    onChange('');
    setTimeout(() => setIsRotating(false), 550);
  };

  const speakCode = (e: React.MouseEvent) => {
    e.preventDefault();
    if ('speechSynthesis' in window && captchaCode) {
      window.speechSynthesis.cancel();
      const spaced = captchaCode.split('').join(' . ');
      const utterance = new SpeechSynthesisUtterance(`Captcha challenge characters are: ${spaced}`);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-2 pt-1" id="captcha-challenge-section">
      {/* Captcha Display & Controls */}
      <div className="flex items-center gap-2">
        {/* Visual Canvas Box with dynamic glow border */}
        <div
          className={`relative flex-1 h-14 rounded-xl border transition-all duration-300 overflow-hidden flex items-center justify-center ${
            isValid
              ? 'border-emerald-500/80 shadow-md shadow-emerald-500/15'
              : 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/90 shadow-inner'
          }`}
          title="Security verification graphic"
        >
          <canvas
            ref={canvasRef}
            width={240}
            height={56}
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        </div>

        {/* Refresh & Accessibility Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRefresh}
            id="btn-refresh-captcha"
            title="Generate new CAPTCHA challenge"
            className="p-3.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 shadow-xs transition-all duration-200 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <RotateCw
              className={`w-4 h-4 transition-transform duration-500 ${
                isRotating ? 'rotate-180 text-blue-600 dark:text-cyan-400' : ''
              }`}
            />
          </button>

          <button
            type="button"
            onClick={speakCode}
            id="btn-audio-captcha"
            title="Read CAPTCHA aloud"
            className="p-3.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 shadow-xs transition-all duration-200 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Captcha Text Input */}
      <div className="relative">
        <input
          id="captcha-input"
          type="text"
          maxLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onKeyDown={onKeyDown}
          placeholder="Enter the 6 characters shown"
          autoComplete="off"
          spellCheck={false}
          className={`w-full h-12 px-4 pr-11 text-sm font-mono tracking-widest uppercase rounded-xl transition-all duration-200 bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border focus:outline-none shadow-xs ${
            error
              ? 'border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : isValid
              ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 focus:border-blue-600 dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-cyan-500/20'
          }`}
        />
        {isValid && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 dark:text-emerald-400 pointer-events-none animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 animate-fadeIn">
          <span>•</span> {error}
        </p>
      )}
    </div>
  );
};
