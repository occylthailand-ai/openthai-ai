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

// ── Stable anonymous device id (สำหรับผูกเครดิต/streak ต่อเครื่อง) ──────────────
export function getDeviceId() {
  try {
    let id = localStorage.getItem('otai_device');
    if (!id) {
      id = (crypto?.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem('otai_device', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

// แนบ identity headers — device id เสมอ + email ถ้ามี (ให้ backend ใช้ระบุตัวตน)
export function authHeaders(extra = {}) {
  const h = { 'x-device-id': getDeviceId(), ...extra };
  try {
    const email = localStorage.getItem('otai_email') || localStorage.getItem('user_email');
    if (email) h['x-user-email'] = email;
  } catch { /* ignore */ }
  return h;
}

// fetch wrapper ที่แนบ identity headers อัตโนมัติ
export function apiFetch(path, opts = {}) {
  return fetch(apiUrl(path), {
    ...opts,
    headers: authHeaders(opts.headers || {}),
  });
}
