import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// A11y guard for the consent-based signup confirmation (WCAG 4.1.3 Status Messages).
//
// Every /portals/* page renders `sent ? <success div> : <form>`. When a producer / consumer /
// middleman / affiliate submits the form, React swaps the whole <form> out for the success div
// ("ส่งคำขอเรียบร้อย! …"). The submit button that had focus is now gone, so a screen-reader user
// gets NO announcement that their signup succeeded — the confirmation is a silent visual-only
// change. The error path was already handled correctly (`{err && <div role="alert">…}` announces),
// but the success path had no live region, so the two outcomes were announced asymmetrically.
//
// Fix: the success container carries role="status" (an implicit aria-live="polite" region), which
// mirrors the error's role="alert" — the same conditionally-rendered live-region idiom already
// proven to work for the error message on these pages.
//
// Structural asserts over the page source (same no-render approach as portalConsent.test.js /
// portalFieldCollision.test.js / trackFormsA11y.test.js) so neither live region can silently drop
// off any page.
const here = dirname(fileURLToPath(import.meta.url));
const portalsDir = join(here, '..', 'pages', 'portals');
const pages = readdirSync(portalsDir).filter((f) => f.endsWith('PortalPage.jsx'));

// The opening tag of the success container in `sent ? <div ...>`.
function sentDivOpenTag(src) {
  const m = src.match(/\bsent\s*\?\s*<div\b([^>]*)>/);
  return m ? m[1] : null;
}

describe('/portals/* signup confirmation is announced to screen readers', () => {
  it('found all nine portal pages', () => {
    expect(pages.length).toBe(9);
  });

  for (const file of pages) {
    const src = readFileSync(join(portalsDir, file), 'utf8');

    it(`${file}: the success (sent) container is a role="status" live region`, () => {
      const attrs = sentDivOpenTag(src);
      expect(attrs, `could not locate the "sent ? <div ...>" success container in ${file}`).not.toBeNull();
      expect(
        /\brole="status"/.test(attrs),
        `${file} success confirmation has no role="status" — a screen reader won't announce a completed signup`,
      ).toBe(true);
    });

    it(`${file}: the error message stays a role="alert" live region`, () => {
      expect(
        /role="alert"/.test(src),
        `${file} lost its role="alert" error region — submit errors would go unannounced`,
      ).toBe(true);
    });
  }
});
