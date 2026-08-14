import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// /.well-known/security.txt (RFC 9116) is the responsible-disclosure channel for a platform
// handling PDPA-covered PII + payments. RFC 9116 REQUIRES a Contact and an Expires field, and the
// file is worthless once Expires lapses — so this test doubles as a renewal alarm: it fails in CI
// before the published date goes stale, forcing us to bump it rather than silently serving an
// expired policy. (Vite copies public/.well-known → dist, verified at authoring time.)

const here = dirname(fileURLToPath(import.meta.url));
const txt = readFileSync(join(here, '..', '..', 'public', '.well-known', 'security.txt'), 'utf8');
const field = (name) =>
  txt.split(/\r?\n/)
    .filter((l) => !l.trim().startsWith('#'))
    .map((l) => l.match(new RegExp(`^${name}:\\s*(.+?)\\s*$`, 'i')))
    .filter(Boolean)
    .map((m) => m[1]);

describe('/.well-known/security.txt (RFC 9116)', () => {
  it('has at least one Contact (the required field)', () => {
    const contacts = field('Contact');
    expect(contacts.length).toBeGreaterThan(0);
    // a Contact must be a URI or a mailto: — the real privacy inbox is our primary channel
    expect(contacts.some((c) => /^mailto:.+@.+/.test(c) || /^https?:\/\//.test(c))).toBe(true);
    expect(contacts.some((c) => c === 'mailto:privacy@openthai.ai')).toBe(true);
  });

  it('has an Expires that is a valid date still in the future (renewal alarm)', () => {
    const exp = field('Expires');
    expect(exp.length).toBe(1);                       // RFC 9116: exactly one Expires
    const when = new Date(exp[0]);
    expect(Number.isNaN(when.getTime())).toBe(false); // parseable ISO 8601
    expect(when.getTime()).toBeGreaterThan(Date.now()); // not lapsed — bump it before this fails
  });

  it('Canonical points at the .well-known URL on the hyphen domain', () => {
    const canon = field('Canonical');
    expect(canon).toContain('https://www.openthai-ai.com/.well-known/security.txt');
  });
});
