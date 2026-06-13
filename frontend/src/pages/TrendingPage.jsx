import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { apiUrl } from '../apiBase';

export default function TrendingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [activeTab, setActiveTab] = useState('hashtags');

  useEffect(() => {
    document.title = '🔥 Trending Now — Openthai.ai';
    fetch(apiUrl('/api/trending'))
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`📋 คัดลอก ${text} แล้ว!`)).catch(() => {});
    setCopied(key); setTimeout(() => setCopied(''), 1800);
  };

  const copyAll = () => {
    if (!data?.hashtags) return;
    const all = data.hashtags.map(h => h.tag).join(' ');
    navigator.clipboard.writeText(all).then(() => toast.success('📋 คัดลอก hashtag ทั้งหมดแล้ว!')).catch(() => {});
  };

  const cardSt = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px', backdropFilter: 'blur(8px)' };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>🔥 Trending Now</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {data ? `อัพเดต: ${new Date(data.ts).toLocaleTimeString('th-TH')} · แหล่ง: ${data.source === 'gemini' ? 'AI Generated' : 'Curated'}` : 'กำลังโหลด...'}
          </div>
        </div>
        <button onClick={() => { setLoading(true); fetch(apiUrl('/api/trending?bust=' + Date.now())).then(r => r.json()).then(d => { setData(d); setLoading(false); }); }}
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '7px 14px', color: '#a5b4fc', cursor: 'pointer', fontSize: 13 }}>
          🔄 รีเฟรช
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 5% 0' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🔥</div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, background: 'linear-gradient(90deg,#fe2c55,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 8px' }}>
            Trending TikTok Thailand
          </h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>คลิก hashtag เพื่อคัดลอก ใส่ในคอนเทนต์ได้เลย</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['hashtags','#️⃣ Hashtags'],['topics','📈 Topics'],['sounds','🎵 Sounds']].map(([id,label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ borderRadius: 50, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${activeTab === id ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`, background: activeTab === id ? 'rgba(99,102,241,0.18)' : 'transparent', color: activeTab === id ? '#a5b4fc' : '#64748b' }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            กำลังโหลด Trending...
          </div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 36 }}>❌</div>
            <p>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p>
          </div>
        ) : (
          <>
            {/* HASHTAGS */}
            {activeTab === 'hashtags' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: '#94a3b8' }}>
                    {data.hashtags?.length} hashtag · คลิกเพื่อคัดลอก
                  </div>
                  <button onClick={copyAll} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '7px 14px', color: '#a5b4fc', fontSize: 13, cursor: 'pointer' }}>
                    📋 คัดลอกทั้งหมด
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                  {data.hashtags?.map((h, i) => (
                    <div key={i} onClick={() => copy(h.tag, h.tag)}
                      style={{ ...cardSt, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all .2s', border: `1px solid ${copied === h.tag ? 'rgba(16,185,129,0.5)' : h.hot ? 'rgba(254,44,85,0.3)' : 'rgba(255,255,255,0.08)'}`, background: copied === h.tag ? 'rgba(16,185,129,0.1)' : h.hot ? 'rgba(254,44,85,0.05)' : 'rgba(255,255,255,0.03)' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: copied === h.tag ? '#6ee7b7' : '#f8fafc' }}>{h.tag}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{h.views} views</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        {h.hot && <span style={{ background: 'rgba(254,44,85,0.2)', color: '#fe2c55', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>🔥 HOT</span>}
                        <span style={{ fontSize: 12, color: '#475569' }}>{copied === h.tag ? '✅' : '📋'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TOPICS */}
            {activeTab === 'topics' && (
              <div style={{ display: 'grid', gap: 12 }}>
                {data.topics?.map((t, i) => (
                  <div key={i} style={{ ...cardSt, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#fe2c55,#6366f1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.topic}</div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, parseInt(t.momentum))}%`, background: 'linear-gradient(90deg,#10b981,#06b6d4)', borderRadius: 3, transition: 'width .8s' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981', flexShrink: 0 }}>{t.momentum}</div>
                    <button onClick={() => copy(t.topic, `topic${i}`)} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '6px 12px', color: '#a5b4fc', fontSize: 12, cursor: 'pointer' }}>
                      {copied === `topic${i}` ? '✅' : '📋'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* SOUNDS */}
            {activeTab === 'sounds' && (
              <div style={{ display: 'grid', gap: 12 }}>
                {data.sounds?.map((s, i) => (
                  <div key={i} style={{ ...cardSt, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎵</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>ใช้แล้ว {s.uses} ครั้ง</div>
                    </div>
                    <div style={{ padding: '5px 12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, fontSize: 12, color: '#6ee7b7', fontWeight: 600 }}>
                      🎯 Popular
                    </div>
                  </div>
                ))}
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: '#fcd34d' }}>
                  💡 ค้นหาเพลงใน TikTok Creator Tools → Trending Sounds เพื่อดูเพลงล่าสุด
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/ai-generator')} style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                ⚡ สร้างคอนเทนต์จาก Trend นี้
              </button>
              <button onClick={() => navigate('/calendar')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '12px 24px', fontSize: 14, color: '#94a3b8', cursor: 'pointer' }}>
                📅 วางแผนใน Calendar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
