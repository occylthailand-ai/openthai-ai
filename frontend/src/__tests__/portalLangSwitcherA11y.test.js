import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// A11y guard for the language switcher on the consent-signup funnel (WCAG 1.4.1 Use of
// Color / 4.1.2 Name, Role, Value).
//
// Each /portals/* page and the /portals hub render their own inline switcher as
// `['th','en','zh'].map(l => <button onClick={() => setLang(l)} style={{ background: lang===l ? … }}>`.
// The currently-selected language was signalled ONLY by the button's background colour — a
// screen-reader user tabbing across "ไทย / English / 中文" heard three plain buttons with no
// indication of which language is active, and a colour-blind user couldn't tell either. The
// project already ships the correct pattern in components/LanguageSwitcher.jsx (role="group" +
// aria-pressed, and it also varies fontWeight so state isn't colour-only) — these inline copies
// had regressed it.
//
// Fix: each inline switcher button now carries `aria-pressed={lang===l}` (a toggle-button state
// assistive tech announces) plus `type="button"`. Structural asserts over source (same no-render
// approach as portalStatusRegion / portalConsent / trackFormsA11y): every switcher button that
// calls setLang(l) must expose aria-pressed, so the regression can't silently return.
const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..');
const files = [
  'pages/portals/AffiliatePortalPage.jsx',
  'pages/portals/ConsumerPortalPage.jsx',
  'pages/portals/CreatorPortalPage.jsx',
  'pages/portals/FoundationPortalPage.jsx',
  'pages/portals/GovIntlPortalPage.jsx',
  'pages/portals/GovThaiPortalPage.jsx',
  'pages/portals/IntlOrgPortalPage.jsx',
  'pages/portals/MiddlemanPortalPage.jsx',
  'pages/portals/ProducerPortalPage.jsx',
  'pages/PortalHubPage.jsx',
];

// The switcher <button> opening tags call setLang(l) and are each written on a single source
// line, so match line-wise — a tag-level regex can't be used because the `=>` in
// `onClick={() => setLang(l)}` contains a '>' that ends a naive `<button[^>]*>` match early.
function switcherButtonTags(src) {
  return src.split('\n').filter((line) => /<button\b/.test(line) && /setLang\(l\)/.test(line));
}

describe('/portals/* language switcher exposes the active language to assistive tech', () => {
  for (const rel of files) {
    const src = readFileSync(join(srcDir, rel), 'utf8');
    const tags = switcherButtonTags(src);

    it(`${rel}: has a setLang(l) switcher button`, () => {
      expect(tags.length, `no language-switcher button found in ${rel}`).toBeGreaterThan(0);
    });

    it(`${rel}: every switcher button carries aria-pressed (state not colour-only)`, () => {
      const missing = tags.filter((t) => !/\baria-pressed=/.test(t));
      expect(missing, `${rel} switcher button(s) lack aria-pressed — active language is conveyed by colour alone`).toEqual([]);
    });
  }
});
