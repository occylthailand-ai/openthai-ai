import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'openthai_consent_v1';

export default function PDPABanner() {
  const [show, setShow] = useState(false);
  const [detail, setDetail] = useState(false);

  useEffect(() => {
    const c = localStorage.getItem(STORAGE_KEY);
    if (!c) setTimeout(() => setShow(true), 1200); // delay เล็กน้อย
  }, []);

  const accept = (all) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      analytics: all, marketing: all, necessary: true,
      date: new Date().toISOString(),
    }));
    setShow(false);
    // เปิด GA4 ถ้า accept all
    if (all && window.gtag) window.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted' });
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: 'rgba(8,8,18,0.97)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: detail ? '24px 5%' : '16px 5%',
      display: 'flex', flexDirection: detail ? 'column' : 'row',
      alignItems: detail ? 'stretch' : 'center',
      gap: 16, flexWrap: 'wrap',
    }}>
      {!detail ? (
        <>
          <div style={{ flex: 1, minWidth: 260 }}>
            <span style={{ fontSize: 18, marginRight: 8 }}>🍪</span>
            <span style={{ fontSize: 13, color: '#cbd5e1' }}>
              เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์ใช้งาน ตาม{' '}
              <strong style={{ color: '#a5b4fc' }}>พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)</strong>
            </span>
            <button onClick={() => setDetail(true)} style={{ ...linkBtn, marginLeft: 8 }}>ดูรายละเอียด</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => accept(false)} style={outlineBtn}>จำเป็นเท่านั้น</button>
            <button onClick={() => accept(true)} style={primaryBtn}>ยอมรับทั้งหมด ✓</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🍪</span>
            <strong style={{ fontSize: 16 }}>นโยบายการใช้คุกกี้ — OpenThai AI</strong>
            <button onClick={() => setDetail(false)} style={{ marginLeft: 'auto', ...linkBtn }}>ย่อลง ▲</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            {[
              { icon: '🔒', name: 'จำเป็น (Necessary)', desc: 'การทำงานพื้นฐานของเว็บไซต์ — ไม่สามารถปิดได้', required: true },
              { icon: '📊', name: 'Analytics', desc: 'ช่วยให้เราเข้าใจพฤติกรรมผู้ใช้เพื่อปรับปรุงบริการ', required: false },
              { icon: '📢', name: 'Marketing', desc: 'แสดงโฆษณาที่ตรงกับความสนใจของคุณ', required: false },
            ].map((c) => (
              <div key={c.name} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{c.desc}</div>
                  {c.required && <div style={{ fontSize: 11, color: '#6366f1', marginTop: 4 }}>เปิดอยู่เสมอ</div>}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
            ข้อมูลของคุณจะถูกเก็บตาม PDPA พ.ศ. 2562 อ่าน{' '}
            <a href="/privacy" style={{ color: '#6366f1' }}>นโยบายความเป็นส่วนตัว</a>
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button onClick={() => accept(false)} style={outlineBtn}>จำเป็นเท่านั้น</button>
            <button onClick={() => accept(true)} style={primaryBtn}>ยอมรับทั้งหมด ✓</button>
          </div>
        </>
      )}
    </div>
  );
}

const primaryBtn = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const outlineBtn = { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '9px 20px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const linkBtn = { background: 'none', border: 'none', color: '#6366f1', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' };
