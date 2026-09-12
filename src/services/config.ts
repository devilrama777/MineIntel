/**
 * Centralized API Base URL Resolver for MineIntel Application.
 *
 * Supports:
 * 1. Runtime injection via window.__MINEINTEL_API_BASE__
 * 2. Environment variable VITE_API_BASE (if defined)
 * 3. Relative origin fallback (empty string "") for seamless web / proxy integration
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).__MINEINTEL_API_BASE__) {
    return (window as any).__MINEINTEL_API_BASE__.replace(/\/+$/, '');
  }
  const meta = import.meta as any;
  if (meta && meta.env && meta.env.VITE_API_BASE) {
    return meta.env.VITE_API_BASE.replace(/\/+$/, '');
  }
  // Default to relative root so calls like `${API_BASE}/api/...` become `/api/...`
  return '';
};

export const API_BASE = getApiBaseUrl();
