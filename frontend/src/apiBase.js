/**
 * Optional backend origin for production (split deploy).
 * Vite: set VITE_API_URL (no trailing slash), e.g. https://api.example.com
 * Empty: same-origin /api (local dev uses vite proxy to :8000).
 */
const RAW = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return RAW ? `${RAW}${p}` : p;
}
