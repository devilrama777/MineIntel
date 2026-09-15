import React from 'react';

interface MineIntelLogoProps {
  size?: number;
  className?: string;
  variant?: 'full' | 'icon-only' | 'badge' | 'horizontal';
  showGlow?: boolean;
}

export const MineIntelLogo: React.FC<MineIntelLogoProps> = ({
  size = 40,
  className = '',
  variant = 'badge',
  showGlow = false,
}) => {
  // If horizontal header format: badge icon + horizontal typography
  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2.5 flex-shrink-0 ${className}`}>
        {showGlow && (
          <div className="absolute -inset-1 rounded-2xl bg-blue-500/25 blur-lg -z-10 animate-pulse" />
        )}
        <div 
          className="relative flex items-center justify-center rounded-xl overflow-hidden shadow-md shadow-blue-900/30 ring-1 ring-blue-500/30 flex-shrink-0"
          style={{ width: size, height: size }}
        >
          <img
            src="/mineintel_logo.svg"
            alt="MineIntel Icon"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center font-outfit text-xl font-black tracking-tight leading-none">
            <span className="text-neutral-900 dark:text-white">Mine</span>
            <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
              Intel
            </span>
          </div>
          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase mt-0.5">
            Intelligence Engine
          </span>
        </div>
      </div>
    );
  }

  // If full: renders the exact square badge containing the complete MineIntel logo including the text
  if (variant === 'full') {
    return (
      <div 
        className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {showGlow && (
          <div className="absolute -inset-1.5 rounded-2xl bg-blue-500/30 blur-lg -z-10 animate-pulse" />
        )}
        <img
          src="/mineintel_logo.svg"
          alt="MineIntel Official Logo"
          className="w-full h-full object-contain drop-shadow-md transition-transform hover:scale-102 duration-200"
        />
      </div>
    );
  }

  // If icon-only (e.g. small badges in buttons, headers, or pills):
  // Renders the exact squircle badge with the pickaxe, mountain, and gold bars
  return (
    <div 
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {showGlow && (
        <div className="absolute -inset-1 rounded-xl bg-blue-500/25 blur-md -z-10 animate-pulse" />
      )}
      <svg
        viewBox="0 0 512 512"
        width={size}
        height={size}
        className="w-full h-full drop-shadow-sm transition-transform hover:scale-105 duration-200"
      >
        <defs>
          <linearGradient id="miBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#040915" />
            <stop offset="45%" stopColor="#060e22" />
            <stop offset="100%" stopColor="#02050c" />
          </linearGradient>

          <linearGradient id="miBlueBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0066ff" />
            <stop offset="30%" stopColor="#0284c7" />
            <stop offset="60%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0052cc" />
          </linearGradient>

          <linearGradient id="miPickHead" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#f1f5f9" />
            <stop offset="70%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <linearGradient id="miPickHandle" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          <linearGradient id="miGoldRidge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="80%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          <linearGradient id="miGoldBars" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          <linearGradient id="miTextGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* Squircle Badge Background */}
        <rect x="25" y="25" width="462" height="462" rx="112" ry="112" fill="url(#miBgGrad)" />
        {/* Glowing Electric Blue Border */}
        <rect x="25" y="25" width="462" height="462" rx="112" ry="112" fill="none" stroke="url(#miBlueBorder)" strokeWidth="14" />

        {/* Graphic: Mountain, Gold Ridge, Bars, Pickaxe */}
        <g id="miGraphic">
          {/* Dark Mountain Base */}
          <polygon points="126,298 266,172 334,298" fill="#1e293b" />
          <polygon points="172,298 266,236 334,298" fill="#09101b" />
          <polygon points="158,284 266,172 216,284" fill="#64748b" opacity="0.85" />

          {/* Golden Mountain Ridge */}
          <polygon points="266,172 250,236 308,206" fill="#fde047" />
          <polygon points="266,172 308,206 396,298 376,298 322,238" fill="url(#miGoldRidge)" />
          <polygon points="308,206 322,238 396,298 382,298" fill="#b45309" />

          {/* Rising Bar Chart on the right */}
          <rect x="330" y="226" width="18" height="72" rx="2" fill="url(#miGoldBars)" />
          <rect x="354" y="208" width="18" height="90" rx="2" fill="url(#miGoldBars)" />
          <rect x="378" y="186" width="18" height="112" rx="2" fill="url(#miGoldBars)" />

          {/* Silver Pickaxe Handle */}
          <polygon points="274,142 292,154 126,300 114,300" fill="#334155" />
          <polygon points="274,142 282,148 118,300 114,300" fill="url(#miPickHandle)" />

          {/* Silver Pickaxe Curved Head */}
          <path d="M 174,86 C 220,78 282,106 344,204 C 322,194 286,146 244,124 C 214,108 192,100 174,86 Z" fill="url(#miPickHead)" />
          <path d="M 174,86 C 212,94 260,118 312,176 L 302,184 C 258,136 216,114 174,86 Z" fill="#ffffff" />
          <path d="M 238,122 L 274,142 L 292,154 L 282,126 Z" fill="#e2e8f0" />
        </g>

        {/* Text "MineIntel" */}
        <g id="miText">
          <text x="74" y="390" fontFamily="system-ui, -apple-system, 'Outfit', 'Plus Jakarta Sans', sans-serif" fontSize="70" fontWeight="900" fill="#ffffff" letterSpacing="-1.5">Mine</text>
          <text x="264" y="390" fontFamily="system-ui, -apple-system, 'Outfit', 'Plus Jakarta Sans', sans-serif" fontSize="70" fontWeight="900" fill="url(#miTextGold)" letterSpacing="-1.5">Intel</text>
        </g>
      </svg>
    </div>
  );
};
