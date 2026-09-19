import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiUrl } from '../apiBase';

// พิมพ์เขียวเนื้อหา 8 หมวด — browse/search/coverage/develop จาก GET /api/blueprint/*
// ข้อมูลจริงอยู่ที่ backend/data/content-blueprint.json (แก้ที่นั่น ไม่ใช่ในหน้านี้)
const STATUS_BADGE = {
  covered: { icon: '🟢', th: 'มีสกิลรองรับแล้ว', color: '#34d399' },
  partial: { icon: '🟡', th: 'รองรับบางส่วน', color: '#fbbf24' },
  gap: { icon: '🔴', th: 'ช่องว่าง — โอกาสต่อยอด', color: '#f87171' },
};
const MASLOW_COLORS = ['#f97316', '#fbbf24', '#34d399', '#38bdf8', '#a78bfa', '#f472b6'];

export default function ContentBlueprintPage() {
  const navigate = useNavigate();
  const [tree, setTree] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDomain, setOpenDomain] = useState('');
  const [openLevel, setOpenLevel] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [briefs, setBriefs] = useState({});
  const [briefLoading, setBriefLoading] = useState('');

  useEffect(() => {
    document.title = '🧭 Content Blueprint — Openthai.ai';
    Promise.all([
      fetch(apiUrl('/api/blueprint/tree')).then((r) => r.json()),
      fetch(apiUrl('/api/blueprint/coverage')).then((r) => r.json()),
    ])
      .then(([t, c]) => { setTree(t); setCoverage(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const search = (term) => {
    const query = term.trim();
    if (!query) { setResults(null); return; }
    fetch(apiUrl(`/api/blueprint/search?q=${encodeURIComponent(query)}`))
      .then((r) => r.json())
      .then((d) => setResults(d.results || []))
      .catch(() => setResults([]));
  };

  const develop = (domainId) => {
    setBriefLoading(domainId);
    fetch(apiUrl('/api/blueprint/develop'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: domainId, goal: 'พัฒนาต่อยอดบนแพลตฟอร์ม OpenThaiAi' }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setBriefs((b) => ({ ...b, [domainId]: d })); })
      .catch(() => {})
      .finally(() => setBriefLoading(''));
  };

  const covOf = (id) => coverage?.domains?.find((d) => d.id === id);
  const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px' };
  const chip = { display: 'inline-block', fontSize: 11, padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', marginRight: 6, marginBottom: 6, textDecoration: 'none' };

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#080812', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>กำลังโหลดพิมพ์เขียว...</div>;
  }
  if (!tree?.success) {
    return <div style={{ minHeight: '100vh', background: '#080812', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>โหลดพิมพ์เขียวไม่สำเร็จ — ลองรีเฟรชอีกครั้ง</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", paddingBottom: 80 }}>
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>🧭 Content Blueprint — พิมพ์เขียวเนื้อหา</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{tree.meta?.title_en} · v{tree.meta?.version}</div>
        </div>
        {coverage?.summary && (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            🟢 {coverage.summary.covered} · 🟡 {coverage.summary.partial} · 🔴 {coverage.summary.gap}
          </div>
        )}
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '24px 5%' }}>
        <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>{tree.meta?.description_th}</p>

        {/* ── ค้นหา ── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); search(e.target.value); }}
            placeholder="🔍 ค้นหาในพิมพ์เขียว เช่น ไฮโดรโปนิกส์, PromptPay, Cold Chain..."
            aria-label="ค้นหาในพิมพ์เขียว"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
          {results && (
            <div style={{ marginTop: 10 }}>
              {results.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>ไม่พบผลลัพธ์</div>}
              {results.map((r) => (
                <button key={r.id} onClick={() => { setOpenDomain(r.domain_id || (r.type === 'domain' ? r.id : '')); setResults(null); setQ(''); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#64748b', marginRight: 8 }}>{r.id}</span>{r.name_th}
                  {r.matched_items?.length > 0 && <span style={{ color: '#64748b' }}> — {r.matched_items[0]}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── กรอบ Maslow + มิติดิจิทัล ── */}
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: '20px 0 10px' }}>1️⃣ กรอบแนวคิด: ลำดับขั้นความต้องการ × มิติดิจิทัล</h2>
        <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 6, marginBottom: 10 }}>
          {(tree.maslow_levels || []).map((lv, i) => (
            <div key={lv.id}>
              <button onClick={() => setOpenLevel(openLevel === lv.id ? '' : lv.id)}
                style={{ width: `${58 + i * 7}%`, minWidth: 260, textAlign: 'left', margin: '0 auto', display: 'block', background: `${MASLOW_COLORS[i]}22`, border: `1px solid ${MASLOW_COLORS[i]}55`, borderRadius: 10, padding: '8px 14px', color: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>
                <b>{lv.id}</b> {lv.name_th} <span style={{ color: '#94a3b8' }}>({lv.name_en})</span>
              </button>
              {openLevel === lv.id && (
                <div style={{ ...card, margin: '6px auto', maxWidth: 640, fontSize: 12.5, color: '#cbd5e1' }}>
                  <div>ความต้องการ: {lv.items_th.join(' · ')}</div>
                  <div style={{ marginTop: 6, color: '#7dd3fc' }}>📱 ดิจิทัล: {lv.digital_th.join(' · ')}</div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>
          {(tree.maslow_notes || []).map((n) => <div key={n.id}>• <b>{n.name_th}:</b> {n.text_th}</div>)}
        </div>

        {/* ── 7 หมวดอุตสาหกรรม ── */}
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: '20px 0 10px' }}>2️⃣–8️⃣ เจ็ดหมวดเทคโนโลยีและอุตสาหกรรม</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {(tree.domains || []).map((d) => {
            const cov = covOf(d.id);
            const b = STATUS_BADGE[cov?.status] || STATUS_BADGE.gap;
            const open = openDomain === d.id;
            return (
              <div key={d.id} style={{ ...card, gridColumn: open ? '1 / -1' : 'auto' }}>
                <button onClick={() => setOpenDomain(open ? '' : d.id)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#f8fafc', cursor: 'pointer', padding: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{d.icon} {d.id} · {d.name_th}</div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>{d.name_en} · Maslow {d.maslow.join('+')}</div>
                  <div style={{ fontSize: 12, marginTop: 6, color: b.color }}>{b.icon} {b.th}{cov ? ` (${cov.active_skills} สกิล)` : ''}</div>
                </button>

                {open && (
                  <div style={{ marginTop: 14 }}>
                    {d.sections.map((sec) => (
                      <div key={sec.id} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#7dd3fc' }}>{sec.id} {sec.name_th} <span style={{ color: '#475569', fontWeight: 400 }}>({sec.name_en})</span></div>
                        <ul style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7 }}>
                          {sec.items.map((it, i) => <li key={i}>{it.th}</li>)}
                        </ul>
                      </div>
                    ))}

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 10 }}>
                      {cov?.skills?.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 8 }}>สกิลที่รองรับ:</span>
                          {cov.skills.map((s) => <Link key={s.id} to="/skills" style={chip}>{s.id} {s.name}</Link>)}
                        </div>
                      )}
                      {cov?.routes?.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 8 }}>หน้าในแพลตฟอร์ม:</span>
                          {cov.routes.map((r) => <Link key={r} to={r} style={chip}>{r}</Link>)}
                        </div>
                      )}
                      {cov?.next_steps_th?.length > 0 && (
                        <div style={{ fontSize: 12.5, color: '#fbbf24', marginBottom: 10 }}>
                          <b>🚀 แนวทางต่อยอด:</b>
                          <ul style={{ margin: '4px 0 0', paddingLeft: 20, color: '#cbd5e1' }}>
                            {cov.next_steps_th.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}

                      <button onClick={() => develop(d.id)} disabled={briefLoading === d.id}
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, padding: '8px 16px', color: '#a5b4fc', cursor: 'pointer', fontSize: 13 }}>
                        {briefLoading === d.id ? '⏳ กำลังสร้างแผน...' : '✨ สร้างแผนพัฒนาต่อยอด (AI)'}
                      </button>

                      {briefs[d.id] && (
                        <div style={{ ...card, marginTop: 10, borderColor: 'rgba(99,102,241,0.35)', fontSize: 12.5, lineHeight: 1.7 }}>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>แหล่งที่มา: {briefs[d.id].source === 'ai' ? 'AI Generated' : 'จากข้อมูลพิมพ์เขียว'}</div>
                          <div><b>💡 ไอเดียคอนเทนต์:</b><ul style={{ margin: '2px 0 8px', paddingLeft: 20 }}>{(briefs[d.id].content_ideas || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                          <div><b>🛠 สกิลที่ควรสร้าง/ต่อยอด:</b><ul style={{ margin: '2px 0 8px', paddingLeft: 20 }}>{(briefs[d.id].skill_suggestions || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                          <div><b>🛒 หมวดสินค้า/บริการ:</b><ul style={{ margin: '2px 0 8px', paddingLeft: 20 }}>{(briefs[d.id].catalog_categories || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                          <div style={{ color: '#34d399' }}><b>▶️ เริ่มจาก:</b> {briefs[d.id].first_action}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
