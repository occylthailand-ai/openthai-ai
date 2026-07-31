import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { benefitsTitle, SECTION_LANGS } from '../pages/portals/sectionTitle';

// Localization guard for the "Benefits" section heading on the six consumer-facing /portals/* pages
// (producer, consumer, creator, affiliate, middleman, foundation). The benefit ITEMS were localized
// but the heading above them was a hardcoded Thai "สิทธิประโยชน์", so an en/zh visitor saw localized
// bullets under a Thai heading. It now comes from the shared benefitsTitle() helper. Same structural
// approach as portalBackLabel.test.js / portalConsent.test.js.
const here = dirname(fileURLToPath(import.meta.url));
const portalsDir = join(here, '..', 'pages', 'portals');
const BENEFIT_PAGES = ['Affiliate', 'Consumer', 'Creator', 'Foundation', 'Middleman', 'Producer']
  .map((n) => `${n}PortalPage.jsx`);

describe('localized "Benefits" heading on the six benefit /portals/* pages', () => {
  it('benefitsTitle covers all three languages, distinctly', () => {
    expect(SECTION_LANGS).toEqual(['th', 'en', 'zh']);
    const titles = SECTION_LANGS.map(benefitsTitle);
    for (const t of titles) expect(t.trim().length).toBeGreaterThan(0);
    expect(new Set(titles).size).toBe(3); // not one hardcoded string reused
    expect(benefitsTitle('th')).toBe('สิทธิประโยชน์'); // unchanged Thai wording
  });

  it('falls back to Thai for an unknown language (never blank)', () => {
    expect(benefitsTitle('xx')).toBe(benefitsTitle('th'));
  });

  for (const file of BENEFIT_PAGES) {
    const src = readFileSync(join(portalsDir, file), 'utf8');
    describe(file, () => {
      it('imports the shared benefitsTitle helper', () => {
        expect(/import\s*\{[^}]*\bbenefitsTitle\b[^}]*\}\s*from\s*['"]\.\/sectionTitle['"]/.test(src)).toBe(true);
      });
      it('renders the benefits heading from benefitsTitle(lang), not a hardcoded string', () => {
        expect(/<h3[^>]*>\{benefitsTitle\(\s*lang\s*\)\}<\/h3>/.test(src), 'uses {benefitsTitle(lang)}').toBe(true);
        // the heading sits directly above the localized t.benefits list
        expect(/\{\s*t\.benefits\.map/.test(src), 'renders t.benefits list').toBe(true);
      });
      it('has no hardcoded ">สิทธิประโยชน์<" heading left', () => {
        expect(/>สิทธิประโยชน์</.test(src)).toBe(false);
      });
    });
  }
});
