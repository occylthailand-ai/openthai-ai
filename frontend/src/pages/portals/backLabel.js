// Single source of truth for the "← Back" control shown at the top of every /portals/* page.
// Each page inlined a hardcoded back button that did NOT follow the page's language toggle: the
// seven Thai-default portals showed "← กลับ" and the two international ones showed "← Back", and
// neither changed when a visitor switched language. So a Chinese visitor on the consumer portal, or
// a Thai visitor on the international-organization portal, saw a back control in the wrong language.
// Centralizing it here (same pattern as consentLabel.jsx) makes the label follow `lang` on all nine
// pages, and gives the icon-ish button a real localized aria-label for screen readers (the visible
// text is just an arrow + word; the aria-label states the destination). Falls back to Thai for an
// unknown language so the control is never blank.
const WORD = { th: 'กลับ', en: 'Back', zh: '返回' };
const ARIA = { th: 'กลับไปหน้าเลือกประตู', en: 'Back to the portal hub', zh: '返回门户选择页' };

// The visible label, e.g. "← กลับ" / "← Back" / "← 返回".
export function backLabel(lang) {
  return `← ${WORD[lang] || WORD.th}`;
}

// The accessible name announcing where the button goes (the /portals hub).
export function backAria(lang) {
  return ARIA[lang] || ARIA.th;
}

// Languages this helper is guaranteed to cover — exported so the drift-guard test can assert
// completeness without re-parsing the maps.
export const BACK_LANGS = ['th', 'en', 'zh'];
