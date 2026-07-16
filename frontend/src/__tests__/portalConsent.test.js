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
    });
  }
});
