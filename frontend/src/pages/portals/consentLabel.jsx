import React from 'react';

// Single source of truth for the PDPA consent-checkbox label shown on every /portals/* page.
// Each page used to inline its own near-identical CONSENT_TEXT map (th/en/zh); the ONLY real
// difference between them was the privacy-link accent color. That duplication drifted — the
// Gov-Thai page silently lost its `zh` entry, so a Chinese visitor saw a blank consent label
// (an un-informed consent; fixed 2026-07-17). Centralizing the copy here means the
// legally-significant wording can't diverge across the nine pages again — each page passes only
// its own accent color. Returns the JSX label for `lang`, falling back to Thai for an unknown
// language (so the checkbox is never blank).
export function consentLabel(lang, color = '#a5b4fc') {
  const link = (text) => (
    <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color }}>{text}</a>
  );
  const MAP = {
    th: <>ยินยอมให้เก็บและใช้ข้อมูลตาม{link('นโยบายความเป็นส่วนตัว (PDPA)')}</>,
    en: <>I agree to the collection and use of my data per the {link('Privacy Policy (PDPA)')}</>,
    zh: <>同意根据{link('隐私政策（PDPA）')}收集和使用我的数据</>,
  };
  return MAP[lang] || MAP.th;
}

// The languages this label is guaranteed to cover — exported so the drift-guard test
// (portalConsent.test.js) can assert completeness without re-parsing the JSX.
export const CONSENT_LANGS = ['th', 'en', 'zh'];
