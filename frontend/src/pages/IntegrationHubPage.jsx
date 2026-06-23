import React, { useState, useEffect } from 'react';
import { apiUrl } from '../apiBase';

const CAT_LABEL = {
  social: { label: '📱 Social Media', color: '#6366f1' },
  commerce: { label: '🛒 E-Commerce', color: '#f59e0b' },
  design: { label: '🎨 Design', color: '#ec4899' },
  export: { label: '📦 B2B Export', color: '#10b981' },
};

export default function IntegrationHubPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [live, setLive] = useState(null);

  const loadStatus = async () => {
    try {
      const r = await fetch(apiUrl('/api/integrations'));
      const d = await r.json();
      if (d.ok) setData(d);
    } catch (_) {}
  };

  useEffect(() => {
    (async () => {
      await loadStatus();
      try {
        const r = await fetch(apiUrl('/api/integrations/analytics/live'));
        const d = await r.json();
        if (d.ok) setLive(d);
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const testConnection = async (id) => {
    setTesting(id);
    try {
      const r = await fetch(apiUrl(`/api/integrations/${id}/test`), { method: 'POST' });
      const d = await r.json();
      setTestResults(prev => ({ ...prev, [id]: d.result }));
    } catch (_) {
      setTestResults(prev => ({ ...prev, [id]: { ok: false, reason: 'network error' } }));
    }
    setTesting(null);
  };

  const s = {
    page: { minHeight: '100vh', background: '#080812', color: '#fff', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 22px', marginBottom: 16 },
  };

  const cats = data ? [...new Set(data.integrations.map(i => i.category))] : [];

  return (
    <div style={s.page}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#6366f1,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🔌 Integration Hub
            </h1>
            <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 14 }}>เชื่อมต่อ Platform จริง — ปิด Gap vs Hootsuite/Buffer · พร้อมเสียบ API ทันที</p>
          </div>
          {data && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ textAlign: 'center', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '10px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{data.summary.connected}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>เชื่อมแล้ว</div>
              </div>
              <div style={{ textAlign: 'center', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '10px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>{data.summary.pending}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>รอเชื่อม</div>
              </div>
            </div>
          )}
        </div>

        {/* #7 Real Analytics banner */}
        {live && (
          <div style={{ ...s.card, background: live.has_live_data ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${live.has_live_data ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.2)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: live.has_live_data ? '#6ee7b7' : '#fbbf24', marginBottom: 4 }}>
                  📊 Real Analytics (#7) — {live.has_live_data ? `Live จาก ${live.live_sources} platform` : 'รอเชื่อม Platform'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{live.message}</div>
              </div>
              {live.has_live_data && (
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>{live.total_reach.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Live Reach</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#6366f1' }}>{live.total_engagement.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Engagement</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔌</div>
            <div>กำลังโหลดสถานะ Integration...</div>
          </div>
        ) : data ? (
          <>
            {cats.map(cat => {
              const meta = CAT_LABEL[cat] || { label: cat, color: '#64748b' };
              const items = data.integrations.filter(i => i.category === cat);
              return (
                <div key={cat} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: meta.color, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{meta.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                    {items.map(it => (
                      <div key={it.id} style={{ ...s.card, marginBottom: 0, borderLeft: `3px solid ${it.connected ? '#10b981' : '#475569'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 24 }}>{it.icon}</span>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{it.name}</span>
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 9px',
                            background: it.connected ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.15)',
                            color: it.connected ? '#6ee7b7' : '#fbbf24',
                            border: `1px solid ${it.connected ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.3)'}`,
                          }}>
                            {it.connected ? '● Connected' : `○ ${it.eta}`}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 }}>{it.capability}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <code style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '3px 8px' }}>{it.envKey}</code>
                          <button onClick={() => testConnection(it.id)} disabled={testing === it.id} style={{
                            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                            borderRadius: 8, color: '#a5b4fc', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '6px 14px',
                          }}>
                            {testing === it.id ? '⏳ กำลังเช็ค...' : '🔍 ทดสอบเชื่อมต่อ'}
                          </button>
                        </div>
                        {testResults[it.id] && (
                          <div style={{
                            marginTop: 10, fontSize: 12, borderRadius: 8, padding: '8px 12px',
                            background: testResults[it.id].ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${testResults[it.id].ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            color: testResults[it.id].ok ? '#6ee7b7' : '#fca5a5',
                          }}>
                            {testResults[it.id].ok
                              ? `✅ เชื่อมต่อสำเร็จ — ${testResults[it.id].account || 'OK'}`
                              : `⚠️ ${testResults[it.id].reason === 'no_token' || testResults[it.id].reason === 'no_credentials' || testResults[it.id].reason === 'no_api_key' || testResults[it.id].reason === 'no_token_or_page_id' ? 'ยังไม่ได้ตั้ง credentials' : testResults[it.id].reason}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{ ...s.card, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>💡 วิธีเปิดใช้งาน Integration จริง</h3>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.8 }}>
                1. ขอ API Credentials จาก Platform (LINE Developers, Meta for Developers, TikTok Shop Partner ฯลฯ)<br/>
                2. ใส่ค่าใน Vercel Dashboard → Environment Variables (เช่น <code style={{ color: '#6ee7b7' }}>LINE_CHANNEL_TOKEN</code>)<br/>
                3. Redeploy — ระบบจะเปลี่ยนสถานะเป็น <span style={{ color: '#6ee7b7', fontWeight: 700 }}>● Connected</span> อัตโนมัติ<br/>
                4. Scheduler และ Global PR Creator จะโพสต์ผ่าน Platform จริงได้ทันที
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>ไม่สามารถโหลดข้อมูลได้</div>
        )}
      </div>
    </div>
  );
}
