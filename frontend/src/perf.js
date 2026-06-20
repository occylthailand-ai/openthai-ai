// ── Display Acceleration Engine — เร่งการแสดงผลทุกประเภทจอ ทั่วโลก ──────────────
// ปรับการเรนเดอร์ให้เหมาะกับ "อุปกรณ์ + เครือข่าย + จอ" ของผู้ใช้แต่ละคนแบบอัตโนมัติ:
//   • เครือข่ายช้า / Save-Data / เครื่องสเปคต่ำ → โหมด "lite" (ปิดเอฟเฟกต์หนัก เรนเดอร์ไว)
//   • prefetch หน้าถัดไปตอนว่าง (idle) เมื่อเน็ตดี → กดแล้วเปลี่ยนหน้าทันที
//   • ปรับ CSS variable กลาง (--fx-blur / --fx-anim) ให้ทั้งแอปลดงานวาดบนเครื่องอ่อน

const conn = () => navigator.connection || navigator.webkitConnection || navigator.mozConnection || {};

export function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
export function prefersReducedData() {
  try { return window.matchMedia('(prefers-reduced-data: reduce)').matches; } catch { return false; }
}

// คืนค่าโปรไฟล์อุปกรณ์/เครือข่ายปัจจุบัน
export function deviceProfile() {
  const c = conn();
  const saveData = !!c.saveData || prefersReducedData();
  const effectiveType = c.effectiveType || 'unknown';
  const slowNet = ['slow-2g', '2g', '3g'].includes(effectiveType);
  const lowMem = (navigator.deviceMemory || 8) <= 2;
  const lowCpu = (navigator.hardwareConcurrency || 8) <= 2;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const lite = saveData || slowNet || lowMem || lowCpu;
  return { lite, saveData, slowNet, effectiveType, lowMem, lowCpu, dpr, downlink: c.downlink || null };
}

// ใช้โปรไฟล์กับ <html> (data-* + CSS vars) เพื่อให้ทั้งแอปปรับตัวพร้อมกัน
let _bound = false;
export function initDisplayAcceleration() {
  if (typeof document === 'undefined') return null;
  const html = document.documentElement;
  const p = deviceProfile();
  html.dataset.perf = p.lite ? 'lite' : 'full';
  html.dataset.net = p.effectiveType;
  if (p.saveData) html.dataset.savedata = '1'; else delete html.dataset.savedata;
  if (prefersReducedMotion()) html.dataset.reduce = '1';
  // เครื่องอ่อน/เน็ตช้า → ตัด blur (แพงสุดในการวาด) + หดเวลาอนิเมชัน
  html.style.setProperty('--fx-blur', p.lite ? '0px' : '12px');
  html.style.setProperty('--fx-anim', (p.lite || prefersReducedMotion()) ? '60ms' : '240ms');
  // ปรับตามเครือข่ายแบบเรียลไทม์ (เช่นเดินออกจาก WiFi ไป 4G)
  const c = conn();
  if (!_bound && c.addEventListener) { _bound = true; c.addEventListener('change', () => initDisplayAcceleration()); }
  return p;
}

// รันงานตอนเบราว์เซอร์ว่าง (ไม่แย่งเวลาเรนเดอร์เฟรมแรก)
export function onIdle(fn, timeout = 2500) {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout });
  else setTimeout(fn, 200);
}

// prefetch โค้ดของหน้าที่ "น่าจะไปต่อ" ตอนว่าง + เฉพาะเมื่อเน็ตดี/ไม่ Save-Data
// loaders = อาเรย์ของฟังก์ชัน () => import('./pages/Xxx')
export function prefetchWhenIdle(loaders) {
  const p = deviceProfile();
  if (p.saveData || p.slowNet) return; // เน็ตจำกัด — ไม่ดึงล่วงหน้า เพื่อประหยัดเน็ตผู้ใช้
  onIdle(() => { loaders.forEach((load) => { try { load(); } catch { /* ignore */ } }); });
}

// ช่วยใส่ค่า default ที่เร่งการแสดงผลรูปภาพ (lazy + async decode) ให้ <img>
export const fastImg = { loading: 'lazy', decoding: 'async' };
