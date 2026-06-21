import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';

const S = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'Inter','Sarabun',sans-serif" },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #1e1e2e', position: 'sticky', top: 0, background: '#0a0a0f', zIndex: 50 },
  hero: { textAlign: 'center', padding: '64px 32px 48px', maxWidth: 800, margin: '0 auto' },
  icon: { fontSize: 64, marginBottom: 16, display: 'block' },
  h1: { fontSize: 'clamp(28px,5vw,42px)', fontWeight: 900, marginBottom: 12 },
  sub: { color: '#94a3b8', fontSize: 17, lineHeight: 1.7, marginBottom: 32 },
  statsRow: { display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 48, padding: '0 32px' },
  stat: { textAlign: 'center' },
  statVal: { fontSize: 32, fontWeight: 900, display: 'block' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  section: { maxWidth: 960, margin: '0 auto', padding: '48px 32px' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 },
  card: { background: '#111827', border: '1px solid #1e293b', borderRadius: 14, padding: '24px' },
  featureIcon: { fontSize: 28, marginBottom: 12, display: 'block' },
  featureTitle: { fontWeight: 700, fontSize: 15, marginBottom: 6 },
  featureDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 1.6 },
  formCard: { background: '#111827', border: '1px solid #6366f133', borderRadius: 16, padding: 32, maxWidth: 500, margin: '0 auto' },
  label: { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6 },
  input: { width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', padding: '10px 14px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', padding: '10px 14px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  btn: { width: '100%', border: 'none', padding: '14px', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  divider: { borderTop: '1px solid #1e293b', margin: '0 32px' },
  altSection: { background: '#050508', padding: '48px 32px' },
  timelineItem: { display: 'flex', gap: 16, marginBottom: 24 },
  timelineNum: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 },
};

export default function PortalLayout({ config }) {
  const { icon, title, titleGrad, sub, color, accent, stats, features, steps, formFields, formTitle, apiEndpoint, successMsg, lang, setLang, t } = config;
  const [form, setForm] = useState(Object.fromEntries(formFields.map(f => [f.key, ''])));
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(apiUrl(apiEndpoint || '/api/leads/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lang }),
      });
    } catch {}
    setLoading(false);
    setSent(true);
  };

  return (
    <div style={S.page}>
      {/* Nav */}
      <div style={S.nav}>
        <button onClick={() => navigate('/portals')} style={{ background: 'none', border: `1px solid #334155`, color: '#94a3b8', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          ← Back to Portals
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {['th', 'en', 'zh'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{ background: lang === l ? color : 'none', border: `1px solid ${lang === l ? color : '#334155'}`, color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {l === 'th' ? 'ไทย' : l === 'en' ? 'EN' : '中文'}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={S.hero}>
        <span style={S.icon}>{icon}</span>
        <h1 style={{ ...S.h1, background: titleGrad || `linear-gradient(90deg,${color},${accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{title}</h1>
        <p style={S.sub}>{sub}</p>
        <a href="#register" style={{ background: `linear-gradient(90deg,${color},${accent})`, color: '#fff', padding: '14px 36px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>
          {t.cta}
        </a>
      </div>

      {/* Stats */}
      {stats && (
        <div style={S.statsRow}>
          {stats.map(s => (
            <div key={s.label} style={S.stat}>
              <span style={{ ...S.statVal, color }}>{s.value}</span>
              <span style={S.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={S.divider} />

      {/* Features */}
      <div style={S.section}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>{t.featuresTitle}</h2>
        <div style={S.grid2}>
          {features.map(f => (
            <div key={f.title} style={S.card}>
              <span style={S.featureIcon}>{f.icon}</span>
              <div style={S.featureTitle}>{f.title}</div>
              <div style={S.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      {steps && (
        <div style={{ ...S.altSection }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 28, textAlign: 'center' }}>{t.stepsTitle}</h2>
            {steps.map((step, i) => (
              <div key={i} style={S.timelineItem}>
                <div style={{ ...S.timelineNum, background: `${color}22`, color, border: `2px solid ${color}` }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{step.title}</div>
                  <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Register Form */}
      <div id="register" style={S.section}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: 'center' }}>{formTitle}</h2>
        <div style={S.formCard}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <p style={{ color: accent, fontWeight: 600, fontSize: 16 }}>{successMsg}</p>
              <button onClick={() => setSent(false)} style={{ marginTop: 20, background: 'none', border: `1px solid ${color}`, color, padding: '8px 20px', borderRadius: 8, cursor: 'pointer' }}>
                {t.submitAnother}
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {formFields.map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={S.label}>{f.label}{f.required !== false ? ' *' : ''}</label>
                  {f.type === 'select' ? (
                    <select required={f.required !== false} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={S.select}>
                      <option value="">{f.placeholder || '— เลือก —'}</option>
                      {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type || 'text'} required={f.required !== false} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={S.input} />
                  )}
                </div>
              ))}
              <button type="submit" disabled={loading} style={{ ...S.btn, background: `linear-gradient(90deg,${color},${accent})`, color: '#fff', opacity: loading ? 0.7 : 1 }}>
                {loading ? '⏳ กำลังส่ง...' : t.submit}
              </button>
              <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 12 }}>{t.formNote}</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
