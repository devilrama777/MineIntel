const PRODUCTION_BACKEND = 'https://mineintel-q0z7.onrender.com';

export const getApiBaseUrl = (): string => {
  // 1. Runtime injection (highest priority)
  if (typeof window !== 'undefined' && (window as any).__MINEINTEL_API_BASE__) {
    return String((window as any).__MINEINTEL_API_BASE__).replace(/\/+$/, '');
  }

  // 2. Build-time env var (works on Vercel if configured)
  const meta = import.meta as any;
  const envBase = meta?.env?.VITE_API_BASE;
  if (envBase && String(envBase).trim().length > 0) {
    return String(envBase).replace(/\/+$/, '');
  }

  // 3. Hardcoded fallback for production deployment
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Only fallback on public deployments (not localhost)
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return PRODUCTION_BACKEND;
    }
  }

  // 4. Local dev — relative path (Vite proxy handles it)
  return '';
};

export const API_BASE = getApiBaseUrl();
