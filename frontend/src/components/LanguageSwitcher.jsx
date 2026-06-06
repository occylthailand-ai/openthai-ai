import React from 'react';
import { useLang } from '../i18n';

// เมนูสลับภาษา:  ภาษา | ไทย | english | 中文
export default function LanguageSwitcher() {
  const { lang, setLang, t, langs } = useLang();

  return (
    <div style={wrap} role="group" aria-label={t('lang.label')}>
      <span style={labelSt}>🌐 {t('lang.label')}</span>
      {langs.map((l) => (
        <React.Fragment key={l.code}>
          <span style={sep} aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => setLang(l.code)}
            aria-pressed={lang === l.code}
            style={{
              ...itemSt,
              color: lang === l.code ? '#a5b4fc' : '#94a3b8',
              fontWeight: lang === l.code ? 800 : 500,
            }}
          >
            {l.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

const wrap = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 50,
  padding: '6px 12px',
};
const labelSt = { fontSize: 12, color: '#64748b', fontWeight: 600 };
const sep = { color: '#334155', fontSize: 12 };
const itemSt = {
  background: 'transparent',
  border: 'none',
  padding: '2px 4px',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
  lineHeight: 1,
};
