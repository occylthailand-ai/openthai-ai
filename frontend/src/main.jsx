import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LanguageProvider } from './i18n'
import './index.css'

// เก็บ affiliate ref (?ref=) + invite code (?invite=) เพื่อ attribute ยอดขาย/ให้รางวัลผู้ชวน
try {
  const q = new URLSearchParams(window.location.search);
  const r = q.get('ref'); if (r) localStorage.setItem('otai_ref', r.slice(0, 20));
  const iv = q.get('invite'); if (iv) localStorage.setItem('otai_invite', iv.slice(0, 12));
} catch { /* ignore */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
)

// ── PWA Service Worker Registration ───────────────────────────────────────────
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[SW] Registered:', reg.scope);
        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}
