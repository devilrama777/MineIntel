import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type ScrollbarStyle = 'amber' | 'slate' | 'default';
export type TableScrollMode = 'fixed' | 'expanded';

interface ScrollContextType {
  // Settings & preferences
  smoothScroll: boolean;
  setSmoothScroll: (enabled: boolean) => void;
  showFloatingControls: boolean;
  setShowFloatingControls: (show: boolean) => void;
  showQuickSectionNav: boolean;
  setShowQuickSectionNav: (show: boolean) => void;
  tableScrollMode: TableScrollMode;
  setTableScrollMode: (mode: TableScrollMode) => void;
  scrollbarStyle: ScrollbarStyle;
  setScrollbarStyle: (style: ScrollbarStyle) => void;

  // Auto-scroll state
  isAutoScrolling: boolean;
  autoScrollSpeed: number; // 1 = slow, 2 = medium, 3 = fast
  toggleAutoScroll: () => void;
  setAutoScrollSpeed: (speed: number) => void;
  stopAutoScroll: () => void;

  // Navigation actions
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToElement: (elementId: string) => void;

  // Telemetry
  scrollProgress: number; // 0 to 100
  scrollY: number;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved preferences
  const [smoothScroll, setSmoothScrollState] = useState<boolean>(() => {
    const saved = localStorage.getItem('mineintel_smooth_scroll');
    return saved !== null ? saved === 'true' : true;
  });

  const [showFloatingControls, setShowFloatingControlsState] = useState<boolean>(() => {
    const saved = localStorage.getItem('mineintel_floating_scroll_controls');
    return saved !== null ? saved === 'true' : true;
  });

  const [showQuickSectionNav, setShowQuickSectionNavState] = useState<boolean>(() => {
    const saved = localStorage.getItem('mineintel_quick_section_nav');
    return saved !== null ? saved === 'true' : true;
  });

  const [tableScrollMode, setTableScrollModeState] = useState<TableScrollMode>(() => {
    const saved = localStorage.getItem('mineintel_table_scroll_mode') as TableScrollMode;
    return saved || 'fixed';
  });

  const [scrollbarStyle, setScrollbarStyleState] = useState<ScrollbarStyle>(() => {
    const saved = localStorage.getItem('mineintel_scrollbar_style') as ScrollbarStyle;
    return saved || 'amber';
  });

  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);
  const [autoScrollSpeed, setAutoScrollSpeedState] = useState<number>(() => {
    const saved = localStorage.getItem('mineintel_autoscroll_speed');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(0);

  const autoScrollIntervalRef = useRef<number | null>(null);

  // Sync state to localStorage & document classes
  const setSmoothScroll = (enabled: boolean) => {
    setSmoothScrollState(enabled);
    localStorage.setItem('mineintel_smooth_scroll', String(enabled));
    if (enabled) {
      document.documentElement.style.scrollBehavior = 'smooth';
    } else {
      document.documentElement.style.scrollBehavior = 'auto';
    }
  };

  const setShowFloatingControls = (show: boolean) => {
    setShowFloatingControlsState(show);
    localStorage.setItem('mineintel_floating_scroll_controls', String(show));
  };

  const setShowQuickSectionNav = (show: boolean) => {
    setShowQuickSectionNavState(show);
    localStorage.setItem('mineintel_quick_section_nav', String(show));
  };

  const setTableScrollMode = (mode: TableScrollMode) => {
    setTableScrollModeState(mode);
    localStorage.setItem('mineintel_table_scroll_mode', mode);
  };

  const setScrollbarStyle = (style: ScrollbarStyle) => {
    setScrollbarStyleState(style);
    localStorage.setItem('mineintel_scrollbar_style', style);
    document.documentElement.setAttribute('data-scrollbar-style', style);
  };

  const setAutoScrollSpeed = (speed: number) => {
    setAutoScrollSpeedState(speed);
    localStorage.setItem('mineintel_autoscroll_speed', String(speed));
  };

  // Helper to determine the active scrolling container
  const getScrollContainer = (): Element | Window => {
    const mainEl = document.querySelector('main');
    if (mainEl && mainEl.scrollHeight > mainEl.clientHeight && mainEl.clientHeight > 0) {
      return mainEl;
    }
    return window;
  };

  // Track scroll position & calculate progress
  useEffect(() => {
    const handleScroll = () => {
      const mainEl = document.querySelector('main');
      let currentY = 0;
      let maxScroll = 1;

      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight && mainEl.clientHeight > 0) {
        currentY = mainEl.scrollTop;
        maxScroll = mainEl.scrollHeight - mainEl.clientHeight;
      } else {
        currentY = window.scrollY || document.documentElement.scrollTop;
        maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      }

      setScrollY(currentY);
      const progress = maxScroll > 0 ? Math.min(100, Math.max(0, Math.round((currentY / maxScroll) * 100))) : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Set smooth scroll & scrollbar style on initial mount
  useEffect(() => {
    if (smoothScroll) {
      document.documentElement.style.scrollBehavior = 'smooth';
    } else {
      document.documentElement.style.scrollBehavior = 'auto';
    }
    document.documentElement.setAttribute('data-scrollbar-style', scrollbarStyle);
  }, [smoothScroll, scrollbarStyle]);

  // Scroll to Top action
  const scrollToTop = useCallback(() => {
    const behavior: ScrollBehavior = smoothScroll ? 'smooth' : 'auto';
    window.scrollTo({ top: 0, behavior });
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior });
    }
  }, [smoothScroll]);

  // Scroll to Bottom action
  const scrollToBottom = useCallback(() => {
    const behavior: ScrollBehavior = smoothScroll ? 'smooth' : 'auto';
    const mainEl = document.querySelector('main');
    if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
      mainEl.scrollTo({ top: mainEl.scrollHeight, behavior });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
    }
  }, [smoothScroll]);

  // Scroll to Specific Element with offset to avoid topbar clipping
  const scrollToElement = useCallback((elementId: string) => {
    const target = document.getElementById(elementId);
    if (!target) return;

    const behavior: ScrollBehavior = smoothScroll ? 'smooth' : 'auto';
    const topOffset = 80; // height of fixed topbar + breathing room

    const mainEl = document.querySelector('main');
    if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
      const mainRect = mainEl.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetTop = targetRect.top - mainRect.top + mainEl.scrollTop - 20;
      mainEl.scrollTo({ top: Math.max(0, targetTop), behavior });
    } else {
      const elementPosition = target.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - topOffset;
      window.scrollTo({ top: Math.max(0, offsetPosition), behavior });
    }

    // Flash a subtle outline highlight to guide the user's eye
    target.classList.add('ring-2', 'ring-amber-400/80', 'transition-all', 'duration-500');
    setTimeout(() => {
      target.classList.remove('ring-2', 'ring-amber-400/80');
    }, 1500);
  }, [smoothScroll]);

  // Auto-scroll engine
  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current !== null) {
      window.clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    setIsAutoScrolling(false);
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    setIsAutoScrolling(true);

    const stepPixels = autoScrollSpeed === 1 ? 1 : autoScrollSpeed === 2 ? 2.5 : 5;
    const intervalMs = 25;

    autoScrollIntervalRef.current = window.setInterval(() => {
      const mainEl = document.querySelector('main');
      let currentY = 0;
      let maxScroll = 0;

      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
        currentY = mainEl.scrollTop;
        maxScroll = mainEl.scrollHeight - mainEl.clientHeight;
        if (currentY >= maxScroll - 2) {
          // Reached bottom, loop or stop
          stopAutoScroll();
          return;
        }
        mainEl.scrollTop += stepPixels;
      } else {
        currentY = window.scrollY || document.documentElement.scrollTop;
        maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (currentY >= maxScroll - 2) {
          stopAutoScroll();
          return;
        }
        window.scrollBy(0, stepPixels);
      }
    }, intervalMs);
  }, [autoScrollSpeed, stopAutoScroll]);

  const toggleAutoScroll = useCallback(() => {
    if (isAutoScrolling) {
      stopAutoScroll();
    } else {
      startAutoScroll();
    }
  }, [isAutoScrolling, startAutoScroll, stopAutoScroll]);

  // Cleanup auto-scroll on unmount or speed change
  useEffect(() => {
    if (isAutoScrolling) {
      startAutoScroll();
    }
    return () => {
      if (autoScrollIntervalRef.current !== null) {
        window.clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [autoScrollSpeed]);

  return (
    <ScrollContext.Provider
      value={{
        smoothScroll,
        setSmoothScroll,
        showFloatingControls,
        setShowFloatingControls,
        showQuickSectionNav,
        setShowQuickSectionNav,
        tableScrollMode,
        setTableScrollMode,
        scrollbarStyle,
        setScrollbarStyle,
        isAutoScrolling,
        autoScrollSpeed,
        toggleAutoScroll,
        setAutoScrollSpeed,
        stopAutoScroll,
        scrollToTop,
        scrollToBottom,
        scrollToElement,
        scrollProgress,
        scrollY,
      }}
    >
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = (): ScrollContextType => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
};
