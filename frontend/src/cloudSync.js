// ─── Cloud Sync — ข้อมูลผู้ใช้ตรงกันทุกอุปกรณ์ (มือถือ + คอม + memory + cloud) ──
// memory = localStorage (cache เร็ว/ออฟไลน์) · cloud = /api/sync (ถาวร ข้ามอุปกรณ์)
// hydrate ตอนเปิดแอป (cloud → local) แล้ว write-through ทุกครั้งที่เปลี่ยน (local → cloud)
import { apiUrl } from './apiBase';

// keys ที่ซิงค์ข้ามอุปกรณ์
const SYNC_KEYS = ['otai_lang', 'otai_ref', 'user_email', 'user_plan', 'otai_device'];
const PREFS_KEY = 'otai_prefs'; // generic JSON blob (ค่าตั้งต่างๆ)

const token = () => localStorage.getItem('auth_token');

function collectLocal() {
  const out = {};
  for (const k of SYNC_KEYS) { const v = localStorage.getItem(k); if (v != null) out[k] = v; }
  try { const p = localStorage.getItem(PREFS_KEY); if (p) out[PREFS_KEY] = JSON.parse(p); } catch { /* ignore */ }
  return out;
}

function applyToLocal(data) {
  if (!data || typeof data !== 'object') return;
  for (const k of SYNC_KEYS) { if (data[k] != null) localStorage.setItem(k, String(data[k])); }
  if (data[PREFS_KEY] != null) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(data[PREFS_KEY])); } catch { /* ignore */ } }
  // แจ้ง UI ให้ refresh (เช่น เปลี่ยนภาษาจากอีกอุปกรณ์)
  try { window.dispatchEvent(new CustomEvent('otai:sync', { detail: data })); } catch { /* ignore */ }
}

export async function pullSync() {
  const t = token(); if (!t) return null;
  try {
    const r = await fetch(apiUrl('/api/sync'), { headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    return d.success ? (d.data || {}) : null;
  } catch { return null; }
}

let _pushTimer = null;
export function pushSync(partial) {
  const t = token(); if (!t) return;
  const data = partial || collectLocal();
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => {
    fetch(apiUrl('/api/sync'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ data }),
    }).catch(() => {});
  }, 800);
}

// hydrate ตอนเปิดแอป/ล็อกอินอุปกรณ์ใหม่: cloud → local (cloud ชนะ) แล้ว push local-only keys กลับขึ้น (converge ทุกอุปกรณ์)
export async function hydrateSync() {
  const t = token(); if (!t) return null;
  const cloud = await pullSync();
  if (cloud && Object.keys(cloud).length) applyToLocal(cloud);
  pushSync(collectLocal());
  return cloud;
}

// write-through: ตั้งค่า + ซิงค์ขึ้น cloud ทันที (memory & cloud เหมือนกัน)
export function syncSet(key, value) {
  localStorage.setItem(key, String(value));
  pushSync({ [key]: String(value) });
}

export function syncSetPref(prefKey, value) {
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { /* ignore */ }
  prefs[prefKey] = value;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  pushSync({ [PREFS_KEY]: prefs });
}

export function getPref(prefKey, fallback = null) {
  try { const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); return prefKey in prefs ? prefs[prefKey] : fallback; }
  catch { return fallback; }
}

// ─── Cloud Drive backup (Google Drive + OneDrive) ──────────────────────────────
const authHeaders = () => { const t = token(); return t ? { Authorization: `Bearer ${t}` } : {}; };

// สถานะการเชื่อมต่อ drive ทั้งหมด (configured/connected/last_backup_at)
export async function driveStatus() {
  const t = token(); if (!t) return null;
  try {
    const r = await fetch(apiUrl('/api/sync/drive/status'), { headers: authHeaders() });
    const d = await r.json();
    return d.success ? d.providers : null;
  } catch { return null; }
}

// เริ่มเชื่อม drive — ขอ consent URL แล้วพาไปหน้า OAuth
export async function driveConnect(provider) {
  const t = token(); if (!t) return;
  const r = await fetch(apiUrl(`/api/sync/drive/${provider}/connect`), { headers: authHeaders() });
  const d = await r.json();
  if (d.success && d.url) { window.location.href = d.url; return; }
  throw new Error(d.error || 'เชื่อมต่อไม่สำเร็จ');
}

async function driveAction(provider, action) {
  const r = await fetch(apiUrl(`/api/sync/drive/${provider}/${action}`), { method: 'POST', headers: authHeaders() });
  const d = await r.json();
  if (!d.success) throw new Error(d.error || `${action} ไม่สำเร็จ`);
  return d;
}
export const driveBackup     = (provider) => driveAction(provider, 'backup');
export const driveRestore    = (provider) => driveAction(provider, 'restore');
export const driveDisconnect = (provider) => driveAction(provider, 'disconnect');
