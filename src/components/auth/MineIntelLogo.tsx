import React from 'react';

interface MineIntelLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'lockup' | 'badge-only';
}

export const MineIntelLogo: React.FC<MineIntelLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'lockup',
}) => {
  const badgeSizes = {
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-13 h-13 sm:w-14 sm:h-14 rounded-2xl',
    lg: 'w-18 h-18 rounded-3xl',
    xl: 'w-24 h-24 rounded-3xl',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
  };

  return (
    <div
      className={`inline-flex items-center gap-3.5 select-none group cursor-pointer ${className}`}
      id="mineintel-brand-logo"
    >
      {/* Animated glowing container */}
      <div className="relative">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/40 via-blue-600/40 to-amber-500/40 opacity-50 blur-sm group-hover:opacity-85 transition-opacity duration-500 animate-pulse" />

        <div
          className={`relative ${badgeSizes[size]} flex items-center justify-center bg-gradient-to-b from-[#0b1428] via-[#070e1c] to-[#040812] border border-blue-500/50 shadow-xl shadow-blue-950/60 overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300 ring-1 ring-cyan-400/20`}
        >
          {/* Ambient inner soft glow */}
          <div className="absolute inset-0 bg-radial from-blue-600/20 via-transparent to-transparent pointer-events-none" />

          {/* Dynamic shimmer sweep */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-300/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          {/* New MineIntel Icon Vector (Pickaxe, Mountain Peak, Golden Analytics Bars) */}
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full p-1.5"
            aria-label="MineIntel Icon"
          >
            <defs>
              {/* Pickaxe Metallic Gradients */}
              <linearGradient id="mi-pick-blade" x1="0%" y1="0%" x2="100%" y2="80%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#e2e8f0" />
                <stop offset="70%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>

              <linearGradient id="mi-pick-bevel" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>

              <linearGradient id="mi-pick-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>

              {/* Mountain Facets */}
              <linearGradient id="mi-mountain-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0c1527" />
              </linearGradient>

              <linearGradient id="mi-mountain-steel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>

              <linearGradient id="mi-mountain-mid" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              {/* Golden Mountain Facets */}
              <linearGradient id="mi-gold-peak" x1="15%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#fbbf24" />
                <stop offset="75%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>

              <linearGradient id="mi-gold-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>

              {/* Data Histogram Bars */}
              <linearGradient id="mi-bar-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="30%" stopColor="#fbbf24" />
                <stop offset="70%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>

            {/* 3 Rising Golden Analytics Histogram Bars */}
            <g id="mi-analytics-bars">
              <rect
                x="65"
                y="45"
                width="4.2"
                height="15"
                rx="1"
                fill="url(#mi-bar-gold)"
              />
              <rect
                x="70.5"
                y="39"
                width="4.2"
                height="21"
                rx="1"
                fill="url(#mi-bar-gold)"
              />
              <rect
                x="76"
                y="32"
                width="4.2"
                height="28"
                rx="1"
                fill="url(#mi-bar-gold)"
              />
            </g>

            {/* Mountain Peak Facets */}
            <g id="mi-mountain">
              {/* Deep dark mountain base */}
              <polygon
                points="22,60 53,36 59,60"
                fill="url(#mi-mountain-shadow)"
              />
              {/* Cyan light facet on left slope */}
              <polygon
                points="31,60 43,48 50,54 38,60"
                fill="url(#mi-mountain-steel)"
                opacity="0.85"
              />
              {/* Mid-tone facet */}
              <polygon
                points="43,48 53,36 55,52 50,54"
                fill="url(#mi-mountain-mid)"
              />

              {/* Golden Mountain Face (Right Peak & Ridge) */}
              <polygon
                points="53,36 61,45 68,52 78,60 72,60 64,54 58,47"
                fill="url(#mi-gold-peak)"
              />
              <polygon
                points="53,36 58,47 64,54 72,60 59,60"
                fill="url(#mi-gold-shadow)"
              />
            </g>

            {/* Chrome Mining Pickaxe */}
            <g id="mi-pickaxe">
              {/* Diagonal Handle with bevel lighting */}
              <polygon
                points="21,60.5 59.5,23.5 63,27 24.5,64"
                fill="url(#mi-pick-shadow)"
              />
              <polygon
                points="21,60.5 59.5,23.5 61.5,25.5 23,62.5"
                fill="url(#mi-pick-bevel)"
              />

              {/* Pickaxe Head Blade (Arched Chrome Pick) */}
              {/* Main blade arch */}
              <path
                d="M34 18 C42 16.5 56 19 69 40 C68 39 65 35 61 31 C55 23 46 19.5 34 18 Z"
                fill="url(#mi-pick-blade)"
              />
              {/* Top blade highlight reflection */}
              <path
                d="M34 18 C45 20.5 53 24 59 31 L61 29 C55 21 46 18 34 18 Z"
                fill="#ffffff"
              />
              {/* Lower edge shadow cut */}
              <path
                d="M59 31 C64 36 67 39 69 40 L68 41.5 C66 40 63 36 58 31.5 Z"
                fill="url(#mi-pick-shadow)"
              />

              {/* Handle Collar Point */}
              <polygon
                points="59.5,23.5 62,21 64.8,23.8 62.3,26.3"
                fill="#f8fafc"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Brand Title: Clean high-contrast typography matching the new brand identity */}
      {variant === 'lockup' && (
        <span
          className={`font-black tracking-tight select-none transition-colors duration-200 flex items-center ${textSizes[size]}`}
        >
          <span className="text-slate-900 dark:text-white transition-colors">
            Mine
          </span>
          <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
            Intel
          </span>
        </span>
      )}
    </div>
  );
};
