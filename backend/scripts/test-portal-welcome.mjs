// Funnel-integrity guard: every /portals/* lead type must get a welcome email when it
// submits. server.js's sendPortalWelcomeEmail() looks the lead type up in
// PORTAL_WELCOME_COPY and silently returns if the type is missing (`if (!copySet) return`).
// This ACTUALLY shipped broken once — gov-thai / gov-intl / intl-org / foundation had no
// entry, so government / international-org / foundation applicants submitted the form and
// got total silence while the page promised "our team will contact you within 48/72h"
// (see the comment above PORTAL_WELCOME_COPY in server.js and DECISIONS_LOG). This test
// pins the completeness so a newly-added portal type can't quietly become a dead-end.
//
// Source-structural check (same approach as the frontend seoInvariants / portalConsent
// tests) — no server boot, deterministic.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const backend = join(here, '..');
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };

// 1. The authoritative list of portal types.
const plSrc = readFileSync(join(backend, 'portal-leads.js'), 'utf8');
const ktMatch = plSrc.match(/const\s+KNOWN_TYPES\s*=\s*\[([^\]]*)\]/);
const KNOWN_TYPES = ktMatch ? [...ktMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
ok(KNOWN_TYPES.length === 9, `found KNOWN_TYPES (${KNOWN_TYPES.length}): ${KNOWN_TYPES.join(', ')}`);

// 2. Isolate the PORTAL_WELCOME_COPY object block from server.js.
const srv = readFileSync(join(backend, 'server.js'), 'utf8');
const startIdx = srv.indexOf('const PORTAL_WELCOME_COPY = {');
ok(startIdx !== -1, 'PORTAL_WELCOME_COPY block found in server.js');
// Walk braces from the first "{" to find the matching close — robust to nested objects.
let i = srv.indexOf('{', startIdx), depth = 0, endIdx = -1;
for (; i < srv.length; i++) {
  if (srv[i] === '{') depth++;
  else if (srv[i] === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
}
const block = srv.slice(startIdx, endIdx + 1);

// 3. Depth-1 keys of the block = the portal types that get a welcome email.
const topKeys = new Set();
{
  let d = 0;
  const re = /(\{|\}|(?:'([^']+)'|([A-Za-z_][\w-]*))\s*:\s*\{)/g;
  let m;
  while ((m = re.exec(block))) {
    if (m[0] === '{') { d++; continue; }
    if (m[0] === '}') { d--; continue; }
    if (d === 1) topKeys.add(m[2] || m[3]); // a "key: {" opening at depth 1
    d++; // the "key: {" also opened a brace
  }
}

// 4. affiliate is intentionally NOT here — it gets its own sendAffiliateWelcome via
//    handleNewPortalLead's auto-register. Every OTHER known type must have welcome copy.
ok(!topKeys.has('affiliate'), "affiliate is intentionally absent (has its own sendAffiliateWelcome)");
for (const type of KNOWN_TYPES) {
  if (type === 'affiliate') continue;
  ok(topKeys.has(type), `portal type "${type}" has welcome copy (won't submit into silence)`);
}

// 5. Each welcome entry must carry all three languages, each with subject/title/body.
const LANGS = ['th', 'en', 'zh'];
for (const type of topKeys) {
  // slice this type's sub-object: from its key to the next depth-1 key or block end
  const keyRe = new RegExp(`(?:'${type}'|${type})\\s*:\\s*\\{`);
  const s = block.search(keyRe);
  if (s === -1) continue;
  let j = block.indexOf('{', s), dd = 0, e = -1;
  for (; j < block.length; j++) { if (block[j] === '{') dd++; else if (block[j] === '}') { dd--; if (dd === 0) { e = j; break; } } }
  const sub = block.slice(s, e + 1);
  for (const lang of LANGS) ok(new RegExp(`\\b${lang}\\s*:\\s*\\{`).test(sub), `${type}.${lang} present`);
  for (const field of ['subject', 'title', 'body']) ok(new RegExp(`\\b${field}\\s*:`).test(sub), `${type} has ${field}`);
}

console.log(`\n${'='.repeat(48)}`);
console.log(`ผลทดสอบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(48));
process.exit(fail > 0 ? 1 : 0);
