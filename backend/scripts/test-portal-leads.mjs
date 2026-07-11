import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPortalLeads } from '../portal-leads.js';

// Regression test — portal-lead PDPA consent gate (standing-order #3, the legal
// foundation of the /portals/* funnel). submit() MUST reject a lead unless
// consent === true, require at least a name or email, and record consent:true on
// every saved lead. Pure/deterministic — file store, no Supabase or network.
// รัน: node scripts/test-portal-leads.mjs
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };

function make() {
  const notified = [];
  const dir = mkdtempSync(join(tmpdir(), 'pleads-'));
  const pl = createPortalLeads(dir, { onNewLead: (rec) => { notified.push(rec); } });
  return { pl, notified, dir };
}

console.log('\n=== consent gate (PDPA) ===');
{
  const { pl, notified } = make();
  const noConsent = await pl.submit({ type: 'producer', email: 'a@b.com' });
  ok(noConsent.ok === false && /PDPA|ยินยอม/.test(noConsent.error || ''), `no consent → rejected: ${noConsent.error}`);
  const consentFalse = await pl.submit({ type: 'producer', email: 'a@b.com', consent: false });
  ok(consentFalse.ok === false, 'consent:false → rejected');
  const consentString = await pl.submit({ type: 'producer', email: 'a@b.com', consent: 'true' });
  ok(consentString.ok === false, "consent:'true' (string, not boolean) → rejected (strict === true)");
  ok(notified.length === 0, 'no lead persisted/notified for any rejected submission');
}

console.log('\n=== require at least name or email ===');
{
  const { pl } = make();
  const empty = await pl.submit({ type: 'producer', consent: true });
  ok(empty.ok === false && /ชื่อหรืออีเมล/.test(empty.error || ''), `consent but no name/email → rejected: ${empty.error}`);
}

console.log('\n=== a valid consenting lead is saved with consent:true ===');
{
  const { pl, notified } = make();
  const r = await pl.submit({ type: 'producer', consent: true, email: 'Prod@Example.com', company: 'โรงงานไทย', junk: 42, agree: true });
  ok(r.ok === true && r.id, `saved (id=${r.id})`);
  const rec = notified[0];
  ok(rec && rec.consent === true, 'persisted record carries consent:true (auditable proof)');
  ok(rec.email === 'prod@example.com', 'email normalized to lowercase');
  ok(rec.form_data && rec.form_data.company === 'โรงงานไทย', 'string form field kept');
  ok(rec.form_data && !('junk' in rec.form_data) && !('agree' in rec.form_data), 'non-string form fields dropped (junk/agree not stored)');
  const list = await pl.all();
  ok(Array.isArray(list) && list.some((x) => x.id === r.id), 'lead appears in all()');
}

console.log('\n=== name falls back to agency/org/contact when no explicit name ===');
{
  const { pl, notified } = make();
  await pl.submit({ type: 'foundation', consent: true, agency: 'มูลนิธิเพื่อสังคม' });
  ok(notified[0]?.name === 'มูลนิธิเพื่อสังคม', 'name derived from agency when name absent');
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
