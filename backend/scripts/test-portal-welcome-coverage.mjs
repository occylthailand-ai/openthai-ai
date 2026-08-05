// Deterministic drift-guard (no server) — every consent-funnel portal type sends an acknowledgment.
//
// WHY: sendPortalWelcomeEmail(lead) looks up PORTAL_WELCOME_COPY[lead.type] and returns silently when
// the type has no entry (`if (!copySet ...) return;`). That is exactly how gov-thai/gov-intl/intl-org/
// foundation applicants once got NO confirmation at all while their portal pages promised "we'll follow
// up within 48/72h" (see the comment above PORTAL_WELCOME_COPY in server.js). KNOWN_TYPES (portal-leads.js)
// is the source of truth for which /portals/* types the backend accepts; this test fails the build if a
// type is ever added there (or a new portal page) without adding its welcome copy — so the silent
// no-acknowledgment funnel bug can't come back.
//
// AFFILIATE is the one deliberate exception: an affiliate portal lead is auto-registered
// (handleNewPortalLead → affiliate.apply) and gets the affiliate-specific welcome email with its ref
// code + link instead of the generic portal copy, so it must NOT be in PORTAL_WELCOME_COPY (a generic
// copy there would double-mail them). This test pins that intent too.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createPortalLeads } from '../portal-leads.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

// The runtime source of truth for accepted portal types (uses a throwaway data dir — no tracked files).
const { KNOWN_TYPES } = createPortalLeads(join('/tmp', `pwc-${Date.now()}`));

// Every portal type EXCEPT affiliate must have a welcome-copy entry; affiliate uses its own welcome email.
const SELF_WELCOMED = new Set(['affiliate']);
const expected = KNOWN_TYPES.filter((t) => !SELF_WELCOMED.has(t));

// Extract the top-level keys of the PORTAL_WELCOME_COPY object from server.js source (importing the file
// would boot the whole server — this stays a fast no-server static check like test-api-contract).
const src = readFileSync(join(ROOT, 'server.js'), 'utf8');
const start = src.indexOf('const PORTAL_WELCOME_COPY = {');
const end = src.indexOf('\n};', start);
ok(start >= 0 && end > start, 'found the PORTAL_WELCOME_COPY object in server.js');
const block = src.slice(start, end);
// Top-level keys sit at exactly 2-space indent (`  producer: {` / `  'gov-thai': {`); nested th/en/zh
// are deeper, so this matches type keys only.
const copyKeys = [...block.matchAll(/^ {2}'?([a-z0-9-]+)'?:\s*\{/gm)].map((m) => m[1]);

console.log('\n=== every accepted portal type (except affiliate) has acknowledgment copy ===');
for (const t of expected) ok(copyKeys.includes(t), `PORTAL_WELCOME_COPY has an entry for "${t}"`);

console.log('\n=== affiliate is intentionally NOT in the generic copy (own ref-link welcome) ===');
ok(KNOWN_TYPES.includes('affiliate'), 'affiliate is a KNOWN_TYPE (sanity)');
ok(!copyKeys.includes('affiliate'), 'affiliate has NO generic copy entry (avoids double-mailing the ref-link welcome)');

console.log('\n=== no stray copy for a type the backend does not accept ===');
for (const k of copyKeys) ok(KNOWN_TYPES.includes(k), `copy key "${k}" is a real KNOWN_TYPE`);

console.log('\n=== each copy entry is complete: th/en/zh, each with subject+title+body ===');
const nTypes = copyKeys.length;
for (const lang of ['th', 'en', 'zh']) {
  const n = (block.match(new RegExp(`^ {4}${lang}: \\{`, 'gm')) || []).length;
  ok(n === nTypes, `every type has a "${lang}" copy block (${n}/${nTypes})`);
}
for (const field of ['subject:', 'title:', 'body:']) {
  const n = (block.match(new RegExp(field.replace(':', ':'), 'g')) || []).length;
  ok(n === nTypes * 3, `"${field}" appears once per type per language (${n}/${nTypes * 3})`);
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
