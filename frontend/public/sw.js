// Openthai.ai — Service Worker v2 (Display Acceleration)
// กลยุทธ์: API = pass-through · navigation = network-first + offline fallback
//          static assets (hashed JS/CSS/img/font) = stale-while-revalidate
//          → โหลดซ้ำเร็วทันที (จากแคช) แล้วอัปเดตเบื้องหลัง

const VERSION = 'v2';
const SHELL_CACHE = `openthai-shell-${VERSION}`;   // เปลือกแอป (precache)
const ASSET_CACHE = `openthai-assets-${VERSION}`;  // ไฟล์ static แบบ runtime
const SHELL_ASSETS = ['/', '/manifest.json', '/favicon.svg'];
const ASSET_MAX = 80; // กันแคชโตเกิน — เก็บไฟล์ล่าสุดไว้

// ── Install: precache เปลือกแอป ───────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

// ── Activate: ลบแคชเวอร์ชันเก่า ───────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![SHELL_CACHE, ASSET_CACHE].includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// จำกัดจำนวนไฟล์ในแคช (ลบตัวเก่าสุดออกแบบ FIFO)
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

const isStaticAsset = (url) =>
  url.pathname.startsWith('/assets/') ||
  /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|svg|webp|avif|gif|ico)$/i.test(url.pathname);

// ── Fetch: smart routing ──────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API / OAuth / ข้ามโดเมน → ปล่อยผ่าน ไม่ intercept
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Navigation (SPA) → network-first, ออฟไลน์ค่อย fallback เปลือกที่แคชไว้
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/', { ignoreSearch: true }).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static assets → stale-while-revalidate (เร็วทันทีจากแคช + รีเฟรชเบื้องหลัง)
  if (isStaticAsset(url)) {
    e.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(request, res.clone());
            trim(ASSET_CACHE, ASSET_MAX);
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});

// รับสัญญาณอัปเดตเวอร์ชันใหม่ทันที
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
