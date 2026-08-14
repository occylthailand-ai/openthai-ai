import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Localization guard for the remaining page-specific section headings on the government /
// international / foundation portals — the follow-up to portalSectionTitle.test.js (which covered the
// six shared "Benefits" pages). These headings were hardcoded and ignored the language toggle:
//   GovThai  "บริการสำหรับภาครัฐ"   (over t.services)   → now {t.svcTitle}
//   GovIntl  "Services"             (over t.services)   → now {t.svcTitle}
//   IntlOrg  "Partnership Areas"    (over t.services)   → now {t.svcTitle}
//   Foundation "วิธีการทำงาน / How It Works"            → now {t.howTitle}
// Because these are distinct per-page strings (not one shared label), each lives in that page's own T.
// GovThai deliberately ships only th/en (its toggle offers just those two); the rest ship th/en/zh.
const here = dirname(fileURLToPath(import.meta.url));
const portalsDir = join(here, '..', 'pages', 'portals');
const read = (f) => readFileSync(join(portalsDir, f), 'utf8');

// page -> { key: the T key rendered, langs: supported languages that must define it, dynamic: JSX used }
const CASES = {
  'GovThaiPortalPage.jsx': { key: 'svcTitle', langs: ['th', 'en'], overServices: true },
  'GovIntlPortalPage.jsx': { key: 'svcTitle', langs: ['th', 'en', 'zh'], overServices: true },
  'IntlOrgPortalPage.jsx': { key: 'svcTitle', langs: ['th', 'en', 'zh'], overServices: true },
  'FoundationPortalPage.jsx': { key: 'howTitle', langs: ['th', 'en', 'zh'], overServices: false },
};

describe('localized page-specific section headings (gov / intl / foundation portals)', () => {
  for (const [file, cfg] of Object.entries(CASES)) {
    const src = read(file);
    describe(file, () => {
      it(`renders the heading from {t.${cfg.key}} (not a hardcoded string)`, () => {
        expect(new RegExp(`<h3[^>]*>\\{t\\.${cfg.key}\\}</h3>`).test(src), `uses {t.${cfg.key}}`).toBe(true);
      });
      it(`defines ${cfg.key} in every supported language block (${cfg.langs.join('/')})`, () => {
        // each language sub-object starts with `<lang>: { ... title:'...' ...` — assert the key appears
        // the same number of times as supported languages (one per block), and is never empty.
        const occurrences = (src.match(new RegExp(`${cfg.key}\\s*:\\s*['"][^'"]+['"]`, 'g')) || []);
        expect(occurrences.length, `${cfg.key} defined once per language`).toBe(cfg.langs.length);
      });
      if (cfg.overServices) {
        it('the heading sits above the localized t.services list', () => {
          expect(/\{\s*t\.services\.map/.test(src), 'renders t.services list').toBe(true);
        });
      }
      it('has no leftover hardcoded heading text', () => {
        expect(/>(?:บริการสำหรับภาครัฐ|Services|Partnership Areas|วิธีการทำงาน\s*\/\s*How It Works)<\/h3>/.test(src)).toBe(false);
      });
    });
  }
});
