import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createProducers, producerRef } from '../producers.js';

// Guard for the producer registration funnel (producers.js) — the platform's MAIN
// onboarding path, and PDPA-critical. Pins the invariants that matter for consent,
// public safety, and data-subject rights:
//   • consent gate (no PDPA consent → no registration)
//   • public catalog shows ONLY approved producers that actually have a product
//     (a pending/rejected applicant's product must never be publicly listed)
//   • re-applying with an email that is already approved/suspended must NOT
//     overwrite it back to pending (would silently pull a live product offline)
//   • PDPA erasure (มาตรา 33) actually removes the producer record
// File-store temp dir, no Supabase — deterministic. รัน: node scripts/test-producers.mjs
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;

const dir = mkdtempSync(join(tmpdir(), 'producers-test-'));
const P = createProducers(dir);
const base = { company: 'บ.ทดสอบ', contact_name: 'สมชาย', email: 'p1@x.com', product_name: 'ข้าวหอม', price: 100, stock: 5, category: 'OTOP' };

try {
  console.log('\n=== consent gate (PDPA) ===');
  ok((await P.register({ ...base, consent: false })).ok === false, 'consent:false → refused');
  ok((await P.register({ ...base })).ok === false, 'consent missing → refused');

  console.log('\n=== required fields ===');
  ok((await P.register({ consent: true, email: 'p1@x.com', company: '', contact_name: 'ก' })).ok === false, 'empty company → refused');
  ok((await P.register({ consent: true, company: 'X', contact_name: 'Y', email: 'bad-email' })).ok === false, 'invalid email → refused');

  console.log('\n=== register → pending; field normalization ===');
  const r = await P.register({ ...base, consent: true, category: 'ไม่มีหมวดนี้', price: -5, stock: -3 });
  ok(r.ok === true && r.status === 'pending', 'valid register → ok, status pending');
  const rec = (await P.all()).find((p) => p.email === 'p1@x.com');
  ok(rec.consent === true, 'consent:true stored on the record');
  ok(rec.category === 'อื่นๆ', 'unknown category normalized to อื่นๆ');
  ok(rec.price === null, 'price ≤ 0 normalized to null');
  ok(rec.stock === 0, 'negative stock clamped to 0');
  ok(rec.lang === 'th', 'lang defaults to th when not supplied (so the approval email has a language)');
  // The producer's application language is stored so the later approval email can be in it (not Thai).
  await P.register({ ...base, email: 'en@x.com', consent: true, lang: 'en' });
  ok((await P.all()).find((p) => p.email === 'en@x.com').lang === 'en', 'lang:en is stored on the record');
  await P.register({ ...base, email: 'bad@x.com', consent: true, lang: 'xx' });
  ok((await P.all()).find((p) => p.email === 'bad@x.com').lang === 'th', 'unknown lang falls back to th (whitelist)');
  // Number("Infinity"/"1e999") === Infinity and Infinity > 0 is true, so a `> 0` check alone stores it;
  // it then serialises to null on the JSON-file write (JSON.stringify(Infinity)) — an in-memory/on-disk
  // split where getPrice() returns Infinity into orders until the next restart. Must normalise to null.
  for (const [email, bad] of [['inf@x.com', 1e999], ['infs@x.com', 'Infinity'], ['nan@x.com', 'nan']]) {
    await P.register({ ...base, email, consent: true, price: bad });
    ok((await P.all()).find((p) => p.email === email).price === null, `register price ${bad} → null (not stored as non-finite)`);
  }

  console.log('\n=== public catalog shows ONLY approved + has-product ===');
  ok((await P.catalog()).length === 0, 'pending producer is NOT in public catalog');
  await P.setStatus('p1@x.com', 'approved');
  const cat = await P.catalog();
  ok(cat.length === 1 && cat[0].ref === producerRef('p1@x.com') && !('email' in cat[0]), 'after approval → appears in catalog');
  // approved but no product_name → excluded
  await P.register({ consent: true, company: 'NoProd', contact_name: 'Z', email: 'p2@x.com' });
  await P.setStatus('p2@x.com', 'approved');
  ok((await P.catalog()).every((c) => c.ref !== producerRef('p2@x.com')), 'approved producer WITHOUT a product_name is excluded from catalog');
  // rejected producer never shows
  await P.register({ ...base, email: 'p3@x.com', consent: true });
  await P.setStatus('p3@x.com', 'rejected');
  ok((await P.catalog()).every((c) => c.ref !== producerRef('p3@x.com')), 'rejected producer never appears in catalog');

  console.log('\n=== re-apply must NOT overwrite an approved producer back to pending ===');
  const reapply = await P.register({ ...base, email: 'p1@x.com', consent: true, product_name: 'เปลี่ยนชื่อ' });
  ok(reapply.ok === false && reapply.already_registered === true, 're-apply on an approved email → refused (already_registered)');
  ok((await P.all()).find((p) => p.email === 'p1@x.com').status === 'approved', 'approved status preserved (not reset to pending) — live product stays online');

  console.log('\n=== re-apply IS allowed while pending/rejected (resets to pending) ===');
  const reRejected = await P.register({ ...base, email: 'p3@x.com', consent: true });
  ok(reRejected.ok === true && (await P.all()).find((p) => p.email === 'p3@x.com').status === 'pending', 'a rejected applicant can re-apply → back to pending');

  console.log('\n=== setStatus validation ===');
  ok((await P.setStatus('p1@x.com', 'bogus')).ok === false, 'invalid status → refused');
  ok((await P.setStatus('nobody@x.com', 'approved')).ok === false, 'unknown email → refused');

  console.log('\n=== approved producer self-manages own listing (updateListing / selfUpdate) ===');
  // a valid category change applies
  ok((await P.updateListing('p1@x.com', { category: 'ความงาม' })).ok === true, 'valid category update → ok');
  ok((await P.all()).find((p) => p.email === 'p1@x.com').category === 'ความงาม', 'valid category persisted');
  // an unknown category (e.g. a renamed/removed one) sent ALONGSIDE a price edit must be ignored,
  // NOT wipe the producer's current valid category — otherwise they silently drop out of
  // /api/producers/search?category=... while only meaning to change their price
  await P.updateListing('p1@x.com', { price: 250, category: 'หมวดที่ถูกลบไปแล้ว' });
  const afterUpd = (await P.all()).find((p) => p.email === 'p1@x.com');
  ok(afterUpd.category === 'ความงาม', 'unknown category is ignored — existing category preserved (not wiped to undefined)');
  // a self-service price edit to a non-finite value must normalise to null, same as register
  await P.updateListing('p1@x.com', { price: 1e999 });
  ok((await P.all()).find((p) => p.email === 'p1@x.com').price === null, 'updateListing price Infinity → null (not stored as non-finite)');
  ok(afterUpd.price === 250, 'the valid price still updates alongside the ignored category');
  // money guards on the self-serve path (same class inventory.js guards): no negative price/stock
  await P.updateListing('p1@x.com', { price: -10, stock: -4 });
  const guarded = (await P.all()).find((p) => p.email === 'p1@x.com');
  ok(guarded.price === null, 'price ≤ 0 on self-update → null (never a negative charge in catalog)');
  ok(guarded.stock === 0, 'negative stock on self-update → clamped to 0');
  // updateListing on an email that has no record → refused
  ok((await P.updateListing('nobody@x.com', { price: 300 })).ok === false, 'updateListing on unknown email → refused');

  console.log('\n=== PDPA erasure (มาตรา 33) removes the producer record ===');
  const er = await P.eraseByEmail('p1@x.com');
  ok(er.ok === true && er.removed === 1, 'eraseByEmail removes 1 record');
  ok((await P.all()).every((p) => p.email !== 'p1@x.com'), 'producer gone from all() after erasure');
  ok((await P.catalog()).every((c) => c.ref !== producerRef('p1@x.com')), 'erased producer no longer in public catalog');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
