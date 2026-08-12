// Drift guard — the PDPA right-of-access export (/api/privacy/access/confirm) and the
// right-to-erasure (/api/privacy/erasure/confirm → performErasure) must stay in agreement about
// which stores hold a data subject's personal data. The danger is one-directional and silent: if a
// new signup/store is wired into the access export but NOT into performErasure, an "erased" user can
// still download their data — the record persists while the system reports it deleted. The reverse
// (a store cited as erased but no longer actually deleted) is just as bad. Both are the kind of
// hand-maintained cross-file parity this repo pins with a source-parsing test rather than trusting.
//
// This does NOT boot the server (test-pdpa-tenant-erasure.mjs already exercises the live endpoints
// end-to-end). It parses server.js and asserts:
//   1. Every `records.<key>` the access export populates is classified below — so a NEW store added
//      to access fails the build until someone decides its erasure treatment.
//   2. Each store classified `erased` has its deletion evidence present in performErasure().
//   3. The `retained` set is EXACTLY the documented financial-record legal-retention exception
//      (PDPA allows keeping transaction/contract records past an erasure request) — nothing may be
//      quietly parked in `retained` to dodge erasure.
// รัน: node scripts/test-privacy-parity.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = readFileSync(join(ROOT, 'server.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

// Slice a function/handler body from an anchor to a sentinel, so the regexes below only see the
// region they're meant to (not the whole 9k-line file). Throws loudly if the anchor format drifts —
// a silently-empty slice would make every assertion vacuously pass (the failure mode this guards).
function slice(anchor, endAnchor, label) {
  const start = SRC.indexOf(anchor);
  if (start < 0) throw new Error(`[privacy-parity] anchor not found for ${label}: ${anchor} — server.js changed, update this test`);
  const end = SRC.indexOf(endAnchor, start + anchor.length);
  if (end < 0) throw new Error(`[privacy-parity] end anchor not found for ${label}: ${endAnchor}`);
  return SRC.slice(start, end);
}

// The access export handler body, and the performErasure() function body.
const ACCESS = slice("app.get('/api/privacy/access/confirm'", "app.get('/api/privacy/policy'", 'access handler');
const ERASE = slice('async function performErasure(', '\n}\n', 'performErasure');

// Every store the access export can hand back, classified by how erasure must treat it.
//   erased   — personal data; performErasure MUST delete it (evidence = a regex found in its body).
//   retained — a financial/transaction record kept past erasure under PDPA's legal-retention
//              exception; access still shows it (the subject may see it) but erasure leaves it.
const CLASSIFY = {
  waitlist:     { kind: 'erased',   evidence: /waitlist\.splice|'\/waitlist'/ },
  consents:     { kind: 'erased',   evidence: /consents\.splice|'\/pdpa_consents'/ },
  producers:    { kind: 'erased',   evidence: /producers\.eraseByEmail/ },
  portal_leads: { kind: 'erased',   evidence: /portalLeads\.eraseByEmail/ },
  affiliates:   { kind: 'erased',   evidence: /affiliates\.splice|'\/affiliates'/ },
  tenants:      { kind: 'erased',   evidence: /tenants\.eraseByEmail/ },
  cloud_sync:   { kind: 'erased',   evidence: /_syncStore|'\/user_sync'/ },
  withdrawals:  { kind: 'retained' },
  orders:       { kind: 'retained' },
  payments:     { kind: 'retained' },
  entitlements: { kind: 'retained' },
};

console.log('=== access export keys are all classified (a new store must be wired into erasure or documented as retained) ===');
const accessKeys = [...new Set([...ACCESS.matchAll(/records\.([a-z_]+)\s*=/g)].map((m) => m[1]))].sort();
ok(accessKeys.length >= 10, `parsed the access export record keys (found ${accessKeys.length})`);
for (const k of accessKeys) {
  ok(!!CLASSIFY[k], `access store "${k}" is classified (erased vs retained) — no unclassified personal-data store`);
}
// And nothing stale: every classified key is actually still exported by access.
for (const k of Object.keys(CLASSIFY)) {
  ok(accessKeys.includes(k), `classified store "${k}" is still part of the access export (no stale classification)`);
}

console.log('\n=== every "erased" store is actually deleted in performErasure() ===');
for (const [k, c] of Object.entries(CLASSIFY)) {
  if (c.kind !== 'erased') continue;
  ok(c.evidence.test(ERASE), `performErasure() deletes "${k}" (erasure evidence present)`);
}

console.log('\n=== the retained set is EXACTLY the financial legal-retention exception ===');
const retained = Object.entries(CLASSIFY).filter(([, c]) => c.kind === 'retained').map(([k]) => k).sort();
const EXPECTED_RETAINED = ['entitlements', 'orders', 'payments', 'withdrawals'];
ok(JSON.stringify(retained) === JSON.stringify(EXPECTED_RETAINED),
  `retained-past-erasure = financial records only [${EXPECTED_RETAINED.join(', ')}] (got [${retained.join(', ')}])`);
// A retained store must NOT be silently deleted by erasure (that would contradict its classification)
// — but more importantly must never be an un-thought-through way to skip erasing personal data. The
// four here are transaction/contract records; anything else claiming "retained" should fail review.

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
