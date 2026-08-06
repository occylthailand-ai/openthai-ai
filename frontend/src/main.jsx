import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LanguageProvider } from './i18n'
import { captureAffiliateRef } from './lib/affiliateRef'
import './index.css'

// เก็บ affiliate ref จาก ?ref= เพื่อ attribute ยอดขายให้แพลตฟอร์ม/affiliate ที่แนะนำ (ดู lib/affiliateRef.js)
captureAffiliateRef(window.location.search, window.localStorage);

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
