import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';

const SKILLS = [
  'Artificial Intelligence',
  'Machine Learning',
  'Prompt Engineering',
  'Claude, ChatGPT, Grok',
  'Data Analytics',
  'AWS Certified',
  'Data Science',
  'Big Data',
  'Python',
  'Ethical Hacking',
];

export default function AboutPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  useEffect(() => { document.title = `${t('footer.link.about')} — Openthai.ai`; }, [t]);
  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif", padding: '0 0 80px' }}>
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 5%', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} aria-label={t('about.back')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          ← {t('about.back')}
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{t('footer.link.about')}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>About — Openthai.ai</div>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 5% 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
          <h1 style={{ fontSize: 'clamp(24px,5vw,36px)', fontWeight: 900, background: 'linear-gradient(90deg,#6366f1,#a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 12px' }}>
            {t('about.hero.title')}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>{t('about.hero.sub')}</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {SKILLS.map((s) => (
            <span
              key={s}
              style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 20,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                color: '#a5b4fc',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
