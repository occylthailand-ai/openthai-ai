import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastCtx = createContext(null);

const ICONS = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
const COLORS = {
  success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#34d399' },
  error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#f87171' },
  warn:    { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#fcd34d' },
  info:    { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)', text: '#a5b4fc' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now().toString();
    setToasts(t => [...t.slice(-4), { id, message, type }]); // สูงสุด 5 toasts
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Shorthand helpers
  toast.success = (msg, dur) => toast(msg, 'success', dur);
  toast.error   = (msg, dur) => toast(msg, 'error', dur ?? 5000);
  toast.warn    = (msg, dur) => toast(msg, 'warn', dur);
  toast.info    = (msg, dur) => toast(msg, 'info', dur);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 80, right: 20, zIndex: 99999,
        display: 'flex', flexDirection: 'column-reverse', gap: 8,
        maxWidth: 360, width: 'calc(100vw - 40px)',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div key={t.id}
              onClick={() => dismiss(t.id)}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
                backdropFilter: 'blur(20px)',
                animation: 'toastIn 0.25s ease',
                cursor: 'pointer', pointerEvents: 'all',
                fontFamily: "'Inter','Sarabun',sans-serif",
              }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{ICONS[t.type]}</span>
              <span style={{ fontSize: 13, color: '#f8fafc', flex: 1, lineHeight: 1.5 }}>{t.message}</span>
              <span style={{ fontSize: 16, color: c.text, flexShrink: 0 }}>×</span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
