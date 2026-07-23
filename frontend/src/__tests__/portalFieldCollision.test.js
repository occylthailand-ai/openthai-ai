import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Consent-funnel data-integrity guard.
//
// Every /portals/* page submits with `submitLead({ ...form, type:'<portal>', lang, consent })`
// — i.e. it spreads the form state, then appends `type`, `lang`, `consent`. Object-spread
// order means any of those three appended keys OVERWRITES a same-named field in `form`. So a
// form field literally called `type` (or `lang`/`consent`) is silently clobbered on submit and
// never reaches the backend.
//
// This actually happened: IntlOrgPortalPage collected an "Organization Type" dropdown
// (UN / World Bank / WHO / ASEAN …) in a form field named `type`, which the `type:'intl-org'`
// discriminator overwrote — so the applicant's chosen org type was dropped and the Partnerships
// team never saw it. Fixed by renaming that field to `org_type`.
//
// These are structural asserts over the page source (same no-render approach as
// portalConsent.test.js / seoInvariants.test.js) so the collision can't silently return on any
// page: the initial form-state object must not declare a key that the submit call then appends.
const here = dirname(fileURLToPath(import.meta.url));
const portalsDir = join(here, '..', 'pages', 'portals');
const pages = readdirSync(portalsDir).filter((f) => f.endsWith('PortalPage.jsx'));

// Keys the submitLead({...}) call appends after `...form`; any form field with one of these
// names is overwritten on submit. Keep in sync with the shared submit shape.
const APPENDED_KEYS = ['type', 'lang', 'consent'];

// Pull the initial object passed to `const [form, setForm] = useState({ ... })`.
// The portal form-state objects are flat (no nested braces), so a non-greedy {...} is enough.
function formStateKeys(src) {
  const m = src.match(/\[\s*form\s*,\s*setForm\s*\]\s*=\s*useState\(\s*\{([^}]*)\}/);
  if (!m) return null;
  return [...m[1].matchAll(/([a-zA-Z_$][\w$]*)\s*:/g)].map((x) => x[1]);
}

// Pull the literal `type:'...'` the page appends in its submitLead(...) call.
function submittedType(src) {
  const m = src.match(/submitLead\(\s*\{[^}]*\btype\s*:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

describe('/portals/* form fields do not collide with the appended submit keys', () => {
  it('found all nine portal pages', () => {
    expect(pages.length).toBe(9);
  });

  for (const file of pages) {
    const src = readFileSync(join(portalsDir, file), 'utf8');

    it(`${file}: form state declares no field named type/lang/consent (would be clobbered on submit)`, () => {
      const keys = formStateKeys(src);
      expect(keys, `could not locate the [form, setForm] = useState({...}) object in ${file}`).not.toBeNull();
      const collisions = keys.filter((k) => APPENDED_KEYS.includes(k));
      expect(collisions, `${file} form field(s) ${collisions.join(', ')} collide with the appended submit keys and would be dropped`).toEqual([]);
    });

    it(`${file}: appends a non-empty literal portal type in submitLead(...)`, () => {
      const t = submittedType(src);
      expect(t, `no literal type:'...' found in the submitLead call of ${file}`).toBeTruthy();
    });
  }
});
