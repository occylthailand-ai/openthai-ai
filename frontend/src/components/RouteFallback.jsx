import React from 'react';

// ตัวคั่นระหว่างโหลด chunk ของหน้า — เบามาก ไม่มี dependency, ไม่บล็อกการแสดงผล
export default function RouteFallback() {
  return (
    <div style={wrap} role="status" aria-label="Loading">
      <div className="otai-spin" style={spinner} />
      <style>{`@keyframes otaiSpin{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion: reduce){.otai-spin{animation:none!important}}`}</style>
    </div>
  );
}

const wrap = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080812' };
const spinner = {
  width: 38, height: 38, borderRadius: '50%',
  border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#6366f1',
  animation: 'otaiSpin 0.7s linear infinite',
};
