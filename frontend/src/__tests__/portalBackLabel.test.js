import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { backLabel, backAria, BACK_LANGS } from '../pages/portals/backLabel';

// Localization guard for the "← Back" control at the top of every /portals/* page.
// Each page used to hardcode its back button — the seven Thai-default portals showed "← กลับ"
// and the two international ones "← Back" — and NEITHER followed the page's language toggle, so a
// zh visitor on the consumer portal (or a th visitor on the intl-org portal) saw a back control in
// the wrong language. It now comes from the shared backLabel()/backAria() helper. These structural
// asserts (same approach as portalConsent.test.js / seoInvariants.test.js) pin that every page uses
// the helper and no hardcoded back text creeps back in on any of the nine pages.
const here = dirname(fileURLToPath(import.meta.url));
const portalsDir = join(here, '..', 'pages', 'portals');
const pages = readdirSync(portalsDir).filter((f) => f.endsWith('PortalPage.jsx'));

describe('localized back button on every /portals/* page', () => {
  it('found all nine portal pages', () => {
    expect(pages.length).toBe(9);
  });

  it('backLabel/backAria cover all three languages and localize distinctly', () => {
    expect(BACK_LANGS).toEqual(['th', 'en', 'zh']);
    const labels = BACK_LANGS.map(backLabel);
    const arias = BACK_LANGS.map(backAria);
    // every language yields a non-empty, arrow-prefixed label and a non-empty aria name
    for (const l of labels) { expect(l.startsWith('←')).toBe(true); expect(l.length).toBeGreaterThan(2); }
    for (const a of arias) { expect(a.trim().length).toBeGreaterThan(0); }
    // the three languages are actually different from one another (not one hardcoded string)
    expect(new Set(labels).size).toBe(3);
    expect(new Set(arias).size).toBe(3);
  });

  it('falls back to Thai for an unknown language (never blank)', () => {
    expect(backLabel('xx')).toBe(backLabel('th'));
    expect(backAria('xx')).toBe(backAria('th'));
  });

  for (const file of pages) {
    const src = readFileSync(join(portalsDir, file), 'utf8');
    describe(file, () => {
      it('imports the shared backLabel helper', () => {
        expect(/import\s*\{[^}]*\bbackLabel\b[^}]*\}\s*from\s*['"]\.\/backLabel['"]/.test(src)).toBe(true);
      });
      it('renders the back button from backLabel(lang) with a localized aria-label', () => {
        expect(/\{\s*backLabel\(\s*lang\s*\)\s*\}/.test(src), 'uses {backLabel(lang)}').toBe(true);
        expect(/aria-label=\{\s*backAria\(\s*lang\s*\)\s*\}/.test(src), 'has aria-label={backAria(lang)}').toBe(true);
      });
      it('has no hardcoded "← กลับ" / "← Back" text left', () => {
        expect(/←\s*(?:กลับ|Back)\s*</.test(src)).toBe(false);
      });
    });
  }
});
