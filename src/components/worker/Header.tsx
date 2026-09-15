import React, { useState, useEffect } from 'react';
import { 
  Moon, 
  Sun, 
  Calendar,
  Clock,
  Menu
} from 'lucide-react';
import { MineIntelLogo } from './MineIntelLogo';
import { UserProfile } from './UserProfile';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenHistory?: () => void;
  onOpenSamples?: () => void;
  historyCount?: number;
  onToggleMobileSidebar?: () => void;
  onNavigateProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
  onOpenHistory,
  historyCount = 0,
  onToggleMobileSidebar,
  onNavigateProfile,
}) => {
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentDateTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md border-b transition-colors duration-200 border-blue-900/30 dark:border-blue-500/20 bg-white/90 dark:bg-[#070e1c]/90">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl text-neutral-600 dark:text-blue-300 hover:bg-neutral-100 dark:hover:bg-blue-950/60 border border-neutral-200 dark:border-blue-900/40 cursor-pointer transition-colors"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <MineIntelLogo variant="icon-only" size={40} showGlow={true} />
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-xl tracking-tight text-neutral-900 dark:text-white">
              Mine<span className="text-amber-500">Intel</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Intelligence Engine
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Current Date & Time Display in place of Sample Documents */}
          <div 
            id="current-datetime-header"
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-neutral-200/90 dark:border-blue-900/60 bg-neutral-50/90 dark:bg-[#0b162a]/90 text-neutral-700 dark:text-blue-100 shadow-2xs"
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>
            <span className="text-neutral-300 dark:text-blue-800">•</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-neutral-900 dark:text-white">
              <Clock className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Dark / Light Mode Switch */}
          <button
            id="btn-theme-toggle"
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-medium text-xs sm:text-sm cursor-pointer border shadow-2xs active:scale-95 bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200/90 dark:bg-[#0b162a] dark:hover:bg-blue-950/60 dark:text-blue-100 dark:border-blue-900/60"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <span className={`p-1 rounded-lg flex items-center justify-center transition-colors ${
              isDark ? 'bg-amber-400/15 text-amber-400' : 'bg-blue-600/10 text-blue-600'
            }`}>
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </span>
            <span className="hidden md:inline font-semibold text-xs">
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
          </button>

          {/* User Profile (Placed directly after Dark Mode) */}
          <UserProfile 
            onOpenHistory={onOpenHistory}
            onNavigateProfile={onNavigateProfile}
            historyCount={historyCount}
          />
        </div>
      </div>
    </header>
  );
};
