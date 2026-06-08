import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { AF } from '../i18n/affiliate';

// ── Tier structural meta (ราคา/สี ไม่ขึ้นกับภาษา — ชื่อ/perks ดึงจาก AF) ─────────
const TIER_META = [
  { id: 'starter', commission: '20%', minSales: '0', maxSales: '9', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
  { id: 'pro', commission: '30%', minSales: '10', maxSales: '49', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.4)', recommended: true },
  { id: 'elite', commission: '40%', minSales: '50', maxSales: '∞', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)' },
];
const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'YouTube', 'Twitter/X', 'LINE', 'Discord', 'Other'];

function genRefCode(name) {
  const clean = (name || 'affiliate').replace(/\s+/g, '').toUpperCase().slice(0, 6);
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${clean}${rnd}`;
}

function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };
  return { copied, copy };
}

export default function AffiliatePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { lang } = useLang();
  const T = AF[lang] || AF.th;
  const { copied, copy } = useCopy();

  const [form, setForm] = useState({ name: '', email: '', phone: '', platform: 'TikTok', followers: T.followers[1], channel_url: '', note: '' });
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [refLink, setRefLink] = useState('');
  const [error, setError] = useState('');
  const [activeTier, setActiveTier] = useState('pro');
  const [calc, setCalc] = useState({ sales: 10, price: 299 });

  const commission = calc.sales * calc.price * 0.3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { setError(T.errRequired); toast.error(T.toast.required); return; }
    setLoading(true); setError('');
    try {
      const code = genRefCode(form.name);
      const link = `https://www.openthai-ai.com/?ref=${code}`;
      try {
        const res = await fetch(apiUrl('/api/affiliate/apply'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, ref_code: code, ref_link: link }),
        });
        if (!res.ok && res.status === 409) toast.warn(T.toast.dup);
      } catch (_) { /* offline – still show success */ }
      setRefCode(code); setRefLink(link); setStep('success');
      toast.success(T.toast.success.replace('{code}', code));
    } catch (err) {
      setError(T.toast.error); toast.error(T.toast.error);
    } finally { setLoading(false); }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1a 0%,#1a0a2e 50%,#0a1a2e 100%)', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <nav style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => navigate('/')} style={navBtn}>{T.nav.back}</button>
        <span style={{ flex: 1 }} />
        <LanguageSwitcher />
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{T.nav.hub}</span>
      </nav>

      <section style={{ textAlign: 'center', padding: '64px 24px 40px' }}>
        <div style={badgeStyle}>{T.badge}</div>
        <h1 style={{ fontSize: 'clamp(32px,6vw,60px)', fontWeight: 900, margin: '16px 0 12px', lineHeight: 1.2 }}>
          {T.hero.l1}<br />
          <span style={{ background: 'linear-gradient(90deg,#fe2c55,#ff9800,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{T.hero.l2}</span>
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 560, margin: '0 auto 32px' }}>{T.hero.sub}</p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {T.stats.map(([v, l]) => (
            <div key={l} style={statCard}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fe2c55' }}>{v}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 60px' }}>
        <SectionTitle>{T.how.title}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          {T.steps.map((s, i) => (
            <div key={i} style={glassCard}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px 60px' }}>
        <SectionTitle>{T.tiers.title}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
          {TIER_META.map((m) => {
            const td = T.tier[m.id];
            return (
            <div key={m.id} onClick={() => setActiveTier(m.id)}
              style={{ ...glassCard, border: `1.5px solid ${activeTier === m.id ? m.border : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all .2s', position: 'relative', background: activeTier === m.id ? m.bg : 'rgba(255,255,255,0.04)' }}>
              {m.recommended && <div style={recommendedBadge}>{T.tiers.recommended}</div>}
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: m.color }}>{td.name}</div>
              <div style={{ fontSize: 44, fontWeight: 900, color: m.color, lineHeight: 1.1 }}>{m.commission}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>{T.tiers.sales.replace('{min}', m.minSales).replace('{max}', m.maxSales)}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {td.perks.map((p) => (
                  <li key={p} style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', gap: 6 }}><span style={{ color: m.color }}>✓</span> {p}</li>
                ))}
              </ul>
            </div>
            );
          })}
        </div>
      </section>

      <section style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px 60px' }}>
        <SectionTitle>{T.calc.title}</SectionTitle>
        <div style={{ ...glassCard, background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <label style={labelStyle}>
              {T.calc.sales}
              <input type="range" min={1} max={200} value={calc.sales} onChange={(e) => setCalc((c) => ({ ...c, sales: +e.target.value }))} style={{ width: '100%', marginTop: 8 }} />
              <span style={{ color: '#6366f1', fontWeight: 700 }}>{calc.sales} {T.calc.orders}</span>
            </label>
            <label style={labelStyle}>
              {T.calc.price}
              <input type="range" min={99} max={999} step={100} value={calc.price} onChange={(e) => setCalc((c) => ({ ...c, price: +e.target.value }))} style={{ width: '100%', marginTop: 8 }} />
              <span style={{ color: '#6366f1', fontWeight: 700 }}>฿{calc.price}</span>
            </label>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>{T.calc.result}</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: '#10b981' }}>฿{commission.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{calc.sales} {T.calc.orders} × ฿{calc.price} × 30% = ฿{commission.toLocaleString()}</div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 60px' }}>
        <SectionTitle>{T.kit.title}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
          {T.kits.map((kit) => (
            <div key={kit.title} style={glassCard}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{kit.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{kit.title}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>{kit.desc}</div>
              <button style={smallBtn}>{kit.action} →</button>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 60px' }}>
        <SectionTitle>{T.tpl.title}</SectionTitle>
        {T.tpls.map((tp) => (
          <div key={tp.key} style={{ ...glassCard, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{tp.label}</span>
              <button onClick={() => copy(tp.text, tp.key)} style={smallBtn}>{copied === tp.key ? T.tpl.copied : T.tpl.copy}</button>
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{tp.text}</pre>
          </div>
        ))}
      </section>

      <section style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px 80px' }} id="apply">
        <SectionTitle>{T.form.title}</SectionTitle>
        {step === 'form' ? (
          <div style={{ ...glassCard, border: '1.5px solid rgba(99,102,241,0.4)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>{T.f.name}<input style={inputStyle} placeholder={T.f.name_ph} value={form.name} onChange={set('name')} required /></label>
                <label style={labelStyle}>{T.f.email}<input style={inputStyle} type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>{T.f.phone}<input style={inputStyle} placeholder="0812345678" value={form.phone} onChange={set('phone')} /></label>
                <label style={labelStyle}>{T.f.platform}<select style={inputStyle} value={form.platform} onChange={set('platform')}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></label>
              </div>
              <label style={labelStyle}>{T.f.followers}<select style={inputStyle} value={form.followers} onChange={set('followers')}>{T.followers.map((f) => <option key={f}>{f}</option>)}</select></label>
              <label style={labelStyle}>{T.f.channel}<input style={inputStyle} placeholder={T.f.channel_ph} value={form.channel_url} onChange={set('channel_url')} /></label>
              <label style={labelStyle}>{T.f.note}<textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} placeholder={T.f.note_ph} value={form.note} onChange={set('note')} /></label>
              {error && <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{error}</div>}
              <button type="submit" disabled={loading} style={submitBtn}>{loading ? T.submitting : T.submit}</button>
              <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: 0 }}>{T.formnote}</p>
            </form>
          </div>
        ) : (
          <div style={{ ...glassCard, border: '1.5px solid rgba(16,185,129,0.5)', textAlign: 'center', background: 'rgba(16,185,129,0.08)' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#10b981' }}>{T.ok.title}</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>{T.ok.sub}</p>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>REF CODE</div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, color: '#10b981' }}>{refCode}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>AFFILIATE LINK</div>
              <div style={{ fontSize: 13, color: '#cbd5e1', wordBreak: 'break-all', marginBottom: 10 }}>{refLink}</div>
              <button onClick={() => copy(refLink, 'reflink')} style={submitBtn}>{copied === 'reflink' ? T.ok.copied : T.ok.copylink}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[[T.ok.tierLabel, T.ok.tierVal], [T.ok.payLabel, T.ok.payVal], [T.ok.confLabel, T.ok.confVal]].map(([label, val]) => (
                <div key={label} style={{ ...glassCard, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#64748b' }}>{T.ok.team} <strong style={{ color: '#94a3b8' }}>{form.email}</strong></p>
          </div>
        )}
      </section>

      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px 80px' }}>
        <SectionTitle>{T.faq.title}</SectionTitle>
        {T.faqs.map(([q, a], i) => <FAQItem key={i} q={q} a={a} />)}
      </section>

      <section style={{ textAlign: 'center', padding: '40px 24px 60px', background: 'linear-gradient(180deg,transparent,rgba(99,102,241,0.08))' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{T.footer.title}</h2>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>{T.footer.sub}</p>
        <a href="#apply" style={{ ...submitBtn, textDecoration: 'none', display: 'inline-block' }}>{T.footer.cta}</a>
      </section>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 24, marginTop: 0 }}>{children}</h2>;
}
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...glassCard, marginBottom: 10, cursor: 'pointer', padding: '14px 20px' }} onClick={() => setOpen((o) => !o)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}>{q}<span style={{ color: '#6366f1', marginLeft: 8 }}>{open ? '▲' : '▼'}</span></div>
      {open && <div style={{ marginTop: 10, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{a}</div>}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, backdropFilter: 'blur(12px)' };
const statCard = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 24px', textAlign: 'center', minWidth: 100 };
const badgeStyle = { display: 'inline-block', background: 'linear-gradient(90deg,rgba(254,44,85,0.2),rgba(99,102,241,0.2))', border: '1px solid rgba(254,44,85,0.3)', borderRadius: 20, padding: '6px 18px', fontSize: 13, fontWeight: 600, marginBottom: 8 };
const recommendedBadge = { position: 'absolute', top: -12, right: 16, background: 'linear-gradient(90deg,#6366f1,#fe2c55)', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: '#fff' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#94a3b8', fontWeight: 600 };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', width: '100%' };
const submitBtn = { background: 'linear-gradient(135deg,#fe2c55,#ff5722,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '16px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'opacity .2s', boxShadow: '0 8px 24px rgba(254,44,85,0.3)' };
const smallBtn = { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, padding: '6px 14px', color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const navBtn = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
