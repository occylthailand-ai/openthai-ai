import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// PDPA consent-funnel guard. Every /portals/* page POSTs to /api/leads/submit,
// which HARD-REJECTS any lead without consent:true (portal-leads.js:71 — added
// after an audit found consent was collected in UI state but never sent, so it
// couldn't be proven). If a page ever loses its consent wiring, a real applicant
// who ticks the box is silently 400'd (the page shows a generic error, nobody
// realizes the checkbox is the cause). The affiliate E2E already rotted this exact
// way. These are structural asserts over the page source (same approach as
// seoInvariants.test.js) so the four consent-critical pieces can't drift on any
// of the nine pages:
//   1. consent state that DEFAULTS TO false (applicant must actively opt in)
//   2. `consent` included in the submitLead({...}) payload (so the server gets it)
//   3. a checkbox bound to that state (the actual UI control)
//   4. the submit button disabled until consent is given (can't send un-consented)
const here = dirname(fileURLToPath(import.meta.url));
const portalsDir = join(here, '..', 'pages', 'portals');
const pages = readdirSync(portalsDir).filter((f) => f.endsWith('PortalPage.jsx'));

describe('PDPA consent wiring on every /portals/* page', () => {
  it('found all nine portal pages', () => {
    expect(pages.length).toBe(9);
  });

  it('the shared consentLabel() defines the label in all three languages (th/en/zh)', () => {
    // The single source of truth for the PDPA consent copy. If a language goes missing here,
    // consentLabel() falls back to Thai — but a zh/en visitor would then silently get Thai
    // consent text instead of their own. Pin all three are present at the source.
    const shared = readFileSync(join(portalsDir, 'consentLabel.jsx'), 'utf8');
    const map = shared.match(/const\s+MAP\s*=\s*\{[\s\S]*?\n\s*\};/);
    expect(map, 'consentLabel MAP present').toBeTruthy();
    for (const lang of ['th', 'en', 'zh']) {
      expect(new RegExp(`\\b${lang}\\s*:`).test(map[0]), `consentLabel MAP has a "${lang}" entry`).toBe(true);
    }
  });

  for (const file of pages) {
    const src = readFileSync(join(portalsDir, file), 'utf8');
    describe(file, () => {
      it('has a consent state that defaults to false (must actively opt in)', () => {
        expect(/const\s*\[\s*consent\s*,\s*setConsent\s*\]\s*=\s*useState\(\s*false\s*\)/.test(src)).toBe(true);
      });
      it('passes consent in the submitLead(...) payload', () => {
        const call = src.match(/submitLead\(\{[\s\S]*?\}\)/);
        expect(call, 'submitLead({...}) call present').toBeTruthy();
        expect(/\bconsent\b/.test(call[0])).toBe(true);
      });
      it('renders a checkbox bound to the consent state', () => {
        expect(/type=["']checkbox["']/.test(src)).toBe(true);
        expect(/checked=\{consent\}/.test(src)).toBe(true);
        expect(/onChange=\{[^}]*setConsent\(/.test(src)).toBe(true);
      });
      it('disables the submit button until consent is given', () => {
        expect(/disabled=\{\s*!consent\b/.test(src)).toBe(true);
      });
      it('renders the checkbox label from the shared consentLabel() helper', () => {
        // The label copy used to be a per-page CONSENT_TEXT map — nine near-identical copies
        // that drifted (GovThai lost its `zh`, so a Chinese visitor saw a BLANK consent label:
        // un-informed consent + broken UI). It now lives in one place (consentLabel.jsx). Pin
        // that every page pulls the label from there and no stray per-page CONSENT_TEXT map
        // has crept back in (which could silently drift again).
        expect(/import\s*\{\s*consentLabel\s*\}\s*from\s*['"]\.\/consentLabel['"]/.test(src),
          'imports consentLabel from ./consentLabel').toBe(true);
        expect(/\bconsentLabel\(\s*lang\b/.test(src), 'renders consentLabel(lang, …)').toBe(true);
        expect(/const\s+CONSENT_TEXT\s*=/.test(src), 'no per-page CONSENT_TEXT map remains').toBe(false);
      });
      it('shows a real error on a failed submit — never a fake success', () => {
        // submitLead() returns {ok:false,...} on a 400/429/500/network failure (fetch
        // does not throw on 4xx/5xx). Each page must guard on that result and bail out
        // BEFORE showing the success screen — otherwise a consenting applicant is told
        // "we'll email you" while no lead was saved (the exact bug submitLead.js fixed).
        // Pin: (1) the result is captured, (2) there's an `if (!<result>.ok) { … return }`
        // guard, and (3) the success call setSent(true) appears only AFTER that guard.
        const m = src.match(/(?:const|let)\s+(\w+)\s*=\s*await\s+submitLead\(/);
        expect(m, 'captures the submitLead(...) result in a variable').toBeTruthy();
        const v = m[1];
        const guard = new RegExp(`if\\s*\\(\\s*!\\s*${v}\\.ok\\b[\\s\\S]{0,80}?return`);
        expect(guard.test(src), `has an "if (!${v}.ok) … return" guard`).toBe(true);
        const guardIdx = src.search(guard);
        const successIdx = src.search(/setSent\(\s*true\s*\)/);
        expect(successIdx, 'shows a success state via setSent(true)').toBeGreaterThan(-1);
        expect(guardIdx, 'the !ok guard comes before setSent(true)').toBeLessThan(successIdx);
      });
    });
  }
});
