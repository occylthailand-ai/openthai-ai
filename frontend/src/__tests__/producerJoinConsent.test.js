import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// PDPA consent-funnel guard for /join (ProducerJoinPage) — the SECOND producer onboarding entry
// (the /faq tells producers they can join at "/portals/producer หรือ /join"). It collects the SAME
// PII as /portals/producer (company, contact_name, email, phone, …) and POSTs to /api/producers/apply,
// which — like /api/leads/submit — must receive consent:true. But portalConsent.test.js only scans
// *PortalPage.jsx, so /join was UNGUARDED: this page once shipped with no PDPA UI at all (see the
// comment at the top of ProducerJoinPage.jsx), and nothing would catch that regressing. It also uses
// its own CONSENT_TEXT map rather than the shared consentLabel(), so its 3-language copy can drift the
// way the per-page maps did before consentLabel.jsx was introduced. Structural asserts over the page
// source, same approach as portalConsent.test.js — pin the consent wiring so it can't silently rot.
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'pages', 'ProducerJoinPage.jsx'), 'utf8');

describe('PDPA consent wiring on /join (ProducerJoinPage)', () => {
  it('has a consent state that defaults to false (applicant must actively opt in)', () => {
    expect(/const\s*\[\s*consent\s*,\s*setConsent\s*\]\s*=\s*useState\(\s*false\s*\)/.test(src)).toBe(true);
  });

  it('sends consent in the /api/producers/apply POST body', () => {
    // the fetch body must include `consent` (the server hard-rejects an application without it)
    const body = src.match(/body:\s*JSON\.stringify\(\{[\s\S]*?\}\)/);
    expect(body, 'JSON.stringify({...}) request body present').toBeTruthy();
    expect(/\bconsent\b/.test(body[0])).toBe(true);
  });

  it('renders a checkbox bound to the consent state', () => {
    expect(/type=["']checkbox["']/.test(src)).toBe(true);
    expect(/checked=\{consent\}/.test(src)).toBe(true);
    expect(/onChange=\{[^}]*setConsent\(/.test(src)).toBe(true);
  });

  it('disables the submit button until consent is given', () => {
    // ProducerJoinPage writes it as `disabled={busy || !consent}` — pin the !consent part.
    expect(/disabled=\{[^}]*!\s*consent\b/.test(src)).toBe(true);
  });

  it('defines the consent label in all three languages (th/en/zh)', () => {
    const map = src.match(/const\s+CONSENT_TEXT\s*=\s*\{[\s\S]*?\n\s*\};/);
    expect(map, 'CONSENT_TEXT map present').toBeTruthy();
    for (const lang of ['th', 'en', 'zh']) {
      expect(new RegExp(`\\b${lang}\\s*:`).test(map[0]), `CONSENT_TEXT has a "${lang}" entry`).toBe(true);
    }
  });

  it('shows the success screen ONLY on a successful response — never a fake success', () => {
    // fetch does not throw on 4xx/5xx, so setDone(true) must be gated on the parsed success flag,
    // otherwise a rejected (e.g. un-consented → 400) application still shows "we'll review it".
    expect(/\.success\s*\)\s*setDone\(\s*true\s*\)/.test(src),
      'setDone(true) is gated on a .success check').toBe(true);
    // and a non-success response surfaces a real error instead
    expect(/else\s+setErr\(/.test(src), 'a non-success response calls setErr(...)').toBe(true);
  });
});
