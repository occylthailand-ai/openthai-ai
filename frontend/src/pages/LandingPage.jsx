import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoEmblem } from '../components/Logo';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

// ── Data ─────────────────────────────────────────────────────────────────────
// ข้อมูลโครงสร้างที่ไม่ขึ้นกับภาษา (ราคา/สี/ลำดับ) — ข้อความแปลดึงจาก i18n ผ่าน t('plans')
const PLAN_META = [
  { id: 'free', price: '0', color: '#10b981' },
  { id: 'pro', price: '149', color: '#6366f1', recommended: true },
  { id: 'business', price: '299', color: '#f59e0b' },
];

// ── Typing animation hook ────────────────────────────────────────────────────
function useTyping(words, speed = 80, pause = 2000) {
  const [text, setText] = useState('');
  const [wi, setWi] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w = words[wi];
    const t = del
      ? setTimeout(() => { setText((p) => p.slice(0, -1)); if (text.length <= 1) { setDel(false); setWi((i) => (i + 1) % words.length); } }, 40)
      : text === w
        ? setTimeout(() => setDel(true), pause)
        : setTimeout(() => setText(w.slice(0, text.length + 1)), speed);
    return () => clearTimeout(t);
  }, [text, del, wi]);
  return text;
}

// ── Blinking cursor hook ──────────────────────────────────────────────────────
function useBlink(interval = 530) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), interval);
    return () => clearInterval(t);
  }, [interval]);
  return on;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const typingWords = useMemo(() => t('typing'), [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const typed = useTyping(typingWords);
  const cursorOn = useBlink();

  // เนื้อหาที่แปลตามภาษา
  const stats = t('stats');
  const steps = t('steps');
  const features = t('features');
  const reviews = t('reviews');
  const plans = t('plans');
  const demoHashtags = t('demo.hashtags');
  // ข้อความหลายบรรทัด: คั่นด้วย "||"
  const lines = (key) => String(t(key)).split('||');
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => { document.title = 'Openthai.ai — สร้างคอนเทนต์ TikTok ปัง ด้วย AI ไทยแท้'; }, []);

  const handleFreeStart = () => navigate('/ai-generator');

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!email || joining) return;
    setJoining(true);
    try {
      const res = await fetch(apiUrl('/api/waitlist'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing-hero' }),
      });
      const data = await res.json();
      if (data.success) setJoined(true);
    } catch (_) {
      setJoined(true); // fallback — show success anyway
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,8,18,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 5%', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <LogoEmblem size={32} />
          <span style={{ fontWeight: 900, fontSize: 18, background: 'linear-gradient(90deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Openthai.ai</span>
          <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 20, padding: '2px 8px', color: '#a5b4fc' }}>v9.0</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <LanguageSwitcher />
          <button onClick={() => navigate('/affiliate')} style={ghostBtn}>{t('nav.affiliate')}</button>
          <button onClick={() => navigate('/pricing')} style={ghostBtn}>{t('nav.pricing')}</button>
          <button onClick={() => navigate('/login')} style={ghostBtn}>{t('nav.login')}</button>
          <button onClick={handleFreeStart} style={ctaPrimary}>{t('nav.freeCta')}</button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: 'clamp(60px,10vw,120px) 5% 80px', position: 'relative' }}>
        {/* glow blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, background: 'rgba(254,44,85,0.12)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', right: '10%', width: 350, height: 350, background: 'rgba(99,102,241,0.12)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(254,44,85,0.1)', border: '1px solid rgba(254,44,85,0.3)', borderRadius: 20, padding: '6px 16px', fontSize: 13, marginBottom: 24, color: '#fca5a5' }}>
          {t('hero.badge')}
        </div>

        <h1 style={{ fontSize: 'clamp(36px,7vw,76px)', fontWeight: 900, lineHeight: 1.15, margin: '0 0 20px' }}>
          {t('hero.line1')}<br />
          <span style={{ background: 'linear-gradient(90deg,#fe2c55,#ff5722,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            "{typed}<span style={{ opacity: cursorOn ? 1 : 0, transition: 'opacity 0.1s' }}>|</span>"
          </span>
          <br />
          <span style={{ background: 'linear-gradient(90deg,#6366f1,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('hero.line3')}
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(15px,2vw,20px)', color: '#94a3b8', maxWidth: 620, margin: '0 auto 36px', lineHeight: 1.7 }}>
          {t('hero.sub1')}<br />
          {t('hero.sub2')}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <button onClick={handleFreeStart} style={{ ...ctaPrimary, fontSize: 17, padding: '16px 36px' }}>
            {t('hero.ctaFree')}
          </button>
          <button onClick={() => navigate('/pricing')} style={{ ...ghostBtn, fontSize: 15, padding: '14px 28px', borderColor: 'rgba(255,255,255,0.15)' }}>
            {t('hero.ctaPricing')}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          {stats.map((s) => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fe2c55' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO PREVIEW ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ ...glassCard, background: 'rgba(99,102,241,0.06)', border: '1.5px solid rgba(99,102,241,0.2)', overflow: 'hidden' }}>
          {/* window chrome */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fe2c55' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 12, color: '#475569', marginLeft: 8 }}>{t('demo.title')}</span>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={demoBox}>
                <div style={demoLabel}>{t('demo.hook.label')}</div>
                <div style={demoText}>{t('demo.hook.text')}</div>
              </div>
              <div style={demoBox}>
                <div style={demoLabel}>{t('demo.score.label')}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#10b981', textAlign: 'center', padding: '8px 0' }}>9.2 <span style={{ fontSize: 14, color: '#64748b' }}>/10</span></div>
              </div>
            </div>
            <div style={demoBox}>
              <div style={demoLabel}>{t('demo.caption.label')}</div>
              <div style={demoText}>{lines('demo.caption.text').map((ln, i) => <React.Fragment key={i}>{i > 0 && <br />}{ln}</React.Fragment>)}</div>
            </div>
            <div style={{ ...demoBox, marginTop: 12 }}>
              <div style={demoLabel}>{t('demo.hashtags.label')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {demoHashtags.map((h) => (
                  <span key={h} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#a5b4fc' }}>{h}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <SectionBadge>{t('how.badge')}</SectionBadge>
        <SectionTitle>{t('how.title')}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20, marginTop: 32 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ ...glassCard, textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#fe2c55,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 900, fontSize: 18 }}>{s.n}</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 5% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionBadge>{t('features.badge')}</SectionBadge>
          <SectionTitle>{t('features.title')}</SectionTitle>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} style={{ ...glassCard, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REVIEWS ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <SectionBadge>{t('reviews.badge')}</SectionBadge>
        <SectionTitle>{t('reviews.title')}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginTop: 32 }}>
          {reviews.map((r) => (
            <div key={r.name} style={{ ...glassCard, textAlign: 'left' }}>
              <div style={{ color: '#f59e0b', marginBottom: 10, fontSize: 18 }}>{'★'.repeat(r.stars)}</div>
              <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 16px' }}>"{r.text}"</p>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{r.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <SectionBadge>{t('pricing.badge')}</SectionBadge>
        <SectionTitle>{t('pricing.title')}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginTop: 32 }}>
          {PLAN_META.map((m) => {
            const p = plans[m.id];
            return (
            <div key={m.id} style={{ ...glassCard, border: `1.5px solid ${m.recommended ? m.color + '55' : 'rgba(255,255,255,0.08)'}`, background: m.recommended ? `${m.color}0d` : undefined, position: 'relative', textAlign: 'left' }}>
              {m.recommended && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(90deg,${m.color},#fe2c55)`, borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{t('pricing.recommended')}</div>}
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4, color: m.color }}>{p.name}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>{p.desc}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 40, fontWeight: 900 }}>฿{m.price}</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>{p.unit}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.features.map((f) => <li key={f} style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', gap: 8 }}><span style={{ color: m.color }}>✓</span>{f}</li>)}
              </ul>
              <button
                onClick={() => m.id === 'free' ? navigate('/ai-generator') : navigate('/pricing')}
                style={{ width: '100%', padding: '12px', borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none', background: m.id === 'free' ? 'rgba(255,255,255,0.06)' : m.id === 'pro' ? 'linear-gradient(135deg,#6366f1,#fe2c55)' : `linear-gradient(135deg,${m.color},#ff5722)`, color: '#fff' }}>
                {p.cta}
              </button>
            </div>
            );
          })}
        </div>
      </section>

      {/* ── EMAIL CAPTURE ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 560, margin: '0 auto', padding: '0 5% 80px', textAlign: 'center' }}>
        <div style={{ ...glassCard, background: 'linear-gradient(135deg,rgba(254,44,85,0.08),rgba(99,102,241,0.08))', border: '1.5px solid rgba(99,102,241,0.2)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t('email.title')}</h3>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>{t('email.desc')}</p>
          {joined ? (
            <div style={{ color: '#10b981', fontWeight: 700, fontSize: 15 }}>{t('email.joined')}</div>
          ) : (
            <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8 }}>
              <input type="email" placeholder={t('email.placeholder')} value={email} onChange={(e) => setEmail(e.target.value)} required style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#f8fafc', fontSize: 14, outline: 'none' }} />
              <button type="submit" disabled={joining} style={{ ...ctaPrimary, whiteSpace: 'nowrap', opacity: joining ? 0.7 : 1 }}>
                {joining ? t('email.submitting') : t('email.submit')}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 5% 32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <LogoEmblem size={28} />
              <span style={{ fontWeight: 900, fontSize: 16, color: '#f8fafc' }}>Openthai.ai</span>
            </div>
            <p style={{ color: '#475569', fontSize: 12, margin: 0, maxWidth: 220, lineHeight: 1.6 }}>
              {lines('footer.tagline').map((ln, i) => <React.Fragment key={i}>{i > 0 && <br />}{ln}</React.Fragment>)}
            </p>
          </div>
          {/* Links */}
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{t('footer.services')}</div>
              {[[t('footer.link.generator'), '/ai-generator'], [t('footer.link.pricing'), '/pricing'], [t('footer.link.affiliate'), '/affiliate']].map(([l, r]) => (
                <div key={r} onClick={() => navigate(r)} style={{ color: '#94a3b8', fontSize: 13, cursor: 'pointer', marginBottom: 6 }}>{l}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{t('footer.info')}</div>
              {[[t('footer.link.privacy'), '/privacy'], [t('footer.link.terms'), '/terms'], [t('footer.link.contact'), 'mailto:support@openthai.ai']].map(([l, r]) => (
                r.startsWith('mailto')
                  ? <a key={r} href={r} style={{ display: 'block', color: '#94a3b8', fontSize: 13, textDecoration: 'none', marginBottom: 6 }}>{l}</a>
                  : <div key={r} onClick={() => navigate(r)} style={{ color: '#94a3b8', fontSize: 13, cursor: 'pointer', marginBottom: 6 }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#334155' }}>{t('footer.copyright')}</span>
          <span style={{ fontSize: 12, color: '#334155' }}>{t('footer.made')}</span>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionBadge({ children }) {
  return <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#a5b4fc', fontWeight: 600, marginBottom: 10 }}>{children}</div>;
}
function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, margin: 0 }}>{children}</h2>;
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const glassCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, backdropFilter: 'blur(12px)' };
const ctaPrimary = { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(254,44,85,0.3)' };
const ghostBtn = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '9px 18px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' };
const demoBox = { background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 14 };
const demoLabel = { fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 };
const demoText = { fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 };
