/**
 * Optional backend origin for production (split deploy).
 * Vite: set VITE_API_URL (no trailing slash), e.g. https://api.example.com
 * Empty: same-origin /api (local dev uses vite proxy to :8000).
 */
const RAW = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

// Warn in development if API URL is configured but not HTTPS
if (import.meta.env.DEV && RAW && !RAW.startsWith('https://')) {
  console.warn('[apiBase] WARNING: VITE_API_URL is not HTTPS. Ensure production uses HTTPS.');
}

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return RAW ? `${RAW}${p}` : p;
}

/**
 * Wraps fetch with an AbortController-based timeout.
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {number} [timeoutMs=15000]
 * @returns {Promise<Response>}
 */
export function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}
