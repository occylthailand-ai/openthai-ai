// Openthai.ai — Service Worker v2
// Cache Strategy: Network-first for API, Cache-first for static assets

const CACHE_VERSION = 2;
const CACHE_NAME = `openthai-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

// ── Install: cache static shell ───────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: smart routing ──────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // ไม่แคช API calls, OAuth, external requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.origin !== self.location.origin
  ) {
    return; // pass through — ไม่ intercept
  }

  // Network-first สำหรับ HTML navigation (SPA)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match('/').then((cached) => cached || new Response(
          '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>Openthai.ai — Offline</title>' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<style>body{font-family:system-ui,sans-serif;background:#080812;color:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;text-align:center}' +
          'h1{font-size:clamp(24px,6vw,40px);margin:0 0 12px}p{color:#94a3b8;margin:0 0 24px}button{background:linear-gradient(135deg,#fe2c55,#6366f1);color:#fff;border:none;border-radius:50px;padding:12px 28px;font-size:15px;cursor:pointer}</style>' +
          '</head><body><div style="font-size:48px;margin-bottom:16px">📡</div>' +
          '<h1>ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h1>' +
          '<p>กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง</p>' +
          '<button onclick="location.reload()">ลองใหม่</button></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )))
    );
    return;
  }

  // Cache-first สำหรับ static assets (JS, CSS, images, fonts)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // แคชเฉพาะ successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const { title = 'Openthai.ai', body = '', url = '/', icon = '/icon-192.png', badge = '/icon-192.png' } = e.data.json();
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(url) && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// ── Background Sync (future use) ──────────────────────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
