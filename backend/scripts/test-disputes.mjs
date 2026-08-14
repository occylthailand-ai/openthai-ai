import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDisputes, publicDisputeView } from '../disputes.js';

// Regression test — dispute resolution escrow mapping (money-safety).
// Guards the fix that removed the "split" decision: it used to release the FULL
// escrow to the supplier (buyer got nothing) while the admin UI labelled it
// "แบ่งครึ่ง". resolve() must now reject 'split' and map the three real decisions
// to the correct escrow status. Pure/deterministic — no server or network.
// รัน: node scripts/test-disputes.mjs
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };

// in-memory orders stub: a buyer-opened dispute needs order.contact to match
function makeDisputes() {
  const escrow = [];
  const orders = {
    async getOne() { return { id: 'o1', amount: 100, contact: 'buyer@x.com' }; },
    async setEscrowStatus(orderId, status) { escrow.push(status); },
  };
  const dir = mkdtempSync(join(tmpdir(), 'disp-test-'));
  return { d: createDisputes(dir, { orders, notify: {} }), escrow };
}

async function freshOpenDispute() {
  const { d, escrow } = makeDisputes();
  const o = await d.open({ order_id: 'o1', opened_by: 'buyer', contact: 'buyer@x.com', reason: 'ไม่ได้ของ' });
  return { d, escrow, id: o.id, openOk: o.ok };
}

// same but the stub order carries a producer_email, so the producer (the other party
// to a buyer-opened dispute) can post a counter-response
function makeDisputesWithProducer() {
  const orders = { async getOne() { return { id: 'o1', amount: 100, contact: 'buyer@x.com', producer_email: 'seller@x.com' }; }, async setEscrowStatus() {} };
  const dir = mkdtempSync(join(tmpdir(), 'disp-test-'));
  return createDisputes(dir, { orders, notify: {} });
}

console.log('\n=== disputes: DECISIONS no longer includes split ===');
{
  const { d } = makeDisputes();
  ok(Array.isArray(d.DECISIONS) && !d.DECISIONS.includes('split'), `DECISIONS = [${d.DECISIONS.join(', ')}] (no split)`);
  ok(['favor_supplier', 'favor_buyer', 'refund'].every((x) => d.DECISIONS.includes(x)), 'keeps favor_supplier / favor_buyer / refund');
}

console.log('\n=== resolve(split) is rejected ===');
{
  const { d, id, openOk } = await freshOpenDispute();
  ok(openOk && id, 'opened a buyer dispute');
  const r = await d.resolve(id, { decision: 'split', note: '', resolved_by: 'admin' });
  ok(r.ok === false && /invalid decision/i.test(r.error || ''), `split → rejected: ${r.error}`);
}

console.log('\n=== escrow mapping for the three real decisions ===');
{
  const { d, escrow, id } = await freshOpenDispute();
  ok(escrow[0] === 'held', 'opening a dispute holds escrow');
  const r = await d.resolve(id, { decision: 'favor_supplier', note: 'ให้ผู้ผลิต', resolved_by: 'admin' });
  ok(r.ok && r.status === 'resolved_supplier' && r.escrow_status === 'released', `favor_supplier → resolved_supplier + released`);
}
{
  const { d, escrow, id } = await freshOpenDispute();
  const r = await d.resolve(id, { decision: 'favor_buyer', note: 'คืนเงิน', resolved_by: 'admin' });
  ok(r.ok && r.status === 'resolved_buyer' && r.escrow_status === 'refunded', `favor_buyer → resolved_buyer + refunded`);
  ok(escrow[escrow.length - 1] === 'refunded', 'buyer wins → escrow refunded (buyer gets money back)');
}
{
  const { d, id } = await freshOpenDispute();
  const r = await d.resolve(id, { decision: 'refund', note: 'คืน', resolved_by: 'admin' });
  ok(r.ok && r.status === 'refunded' && r.escrow_status === 'refunded', `refund → refunded + refunded`);
}

console.log('\n=== an already-resolved dispute cannot be re-resolved ===');
{
  const { d, id } = await freshOpenDispute();
  await d.resolve(id, { decision: 'favor_supplier', note: '', resolved_by: 'admin' });
  const again = await d.resolve(id, { decision: 'favor_buyer', note: '', resolved_by: 'admin' });
  ok(again.ok === false, `re-resolve blocked: ${again.error}`);
}

console.log('\n=== publicDisputeView hides admin-only artifacts from the parties (the /track projection) ===');
{
  const internal = {
    id: 'dsp_1', order_id: 'o1', opened_by: 'buyer', reason: 'ของไม่ตรงปก',
    opener_contact: 'buyer@x.com', evidence: 'รูปสินค้า', status: 'resolved_buyer',
    ai_suggestion: { recommendation: 'favor_buyer', confidence: 0.82, reasoning: 'หลักฐานฝั่งผู้ซื้อชัดกว่า', missing_evidence: ['ใบส่งของของผู้ผลิต'], source: 'ai' },
    counter_response: { note: 'ส่งถูกต้องแล้ว', evidence: 'เลขพัสดุ', responded_at: '2026-07-17T00:00:00Z' },
    resolution: { decision: 'favor_buyer', note: 'ผู้ผลิตรับปากจะปรับปรุง — internal', resolved_by: 'admin_jane', resolved_at: '2026-07-17T01:00:00Z' },
    created_at: '2026-07-17T00:00:00Z',
  };
  const v = publicDisputeView(internal);
  const asText = JSON.stringify(v);
  ok(!('ai_suggestion' in v), 'the AI arbitration draft is NOT in the party-facing view');
  ok(!asText.includes('favor_buyer') || !asText.includes('missing_evidence'), 'missing_evidence / AI recommendation not leaked');
  ok(!asText.includes('ใบส่งของของผู้ผลิต'), 'the AI missing_evidence hint (what proof would win) is not leaked');
  ok(!asText.includes('resolved_by') && !asText.includes('admin_jane'), 'which admin resolved it is not exposed');
  ok(!asText.includes('internal'), "the admin's internal resolution note is not exposed");
  ok(!('opener_contact' in v) && !asText.includes('buyer@x.com'), 'opener contact is not echoed back');
  // ...but the legitimate party-facing content survives
  ok(v.reason === 'ของไม่ตรงปก' && v.status === 'resolved_buyer', 'reason + status preserved');
  ok(v.counter_response?.note === 'ส่งถูกต้องแล้ว', 'the other side’s counter_response is preserved (due process)');
  ok(v.resolution?.decision === 'favor_buyer' && v.resolution?.resolved_at === '2026-07-17T01:00:00Z', 'final decision + when preserved (the outcome)');
  ok(!('note' in (v.resolution || {})) && !('resolved_by' in (v.resolution || {})), 'resolution keeps only decision + resolved_at');
  ok(publicDisputeView(null) === null, 'null → null (no crash)');
  ok(publicDisputeView({ id: 'd', status: 'open' }).resolution === null, 'unresolved dispute → resolution null (no crash)');
}

console.log('\n=== respond(): the other party posts a counter-response (contact-gated, crash-safe) ===');
{
  // crash-safety: a buyer-opened dispute on an order with NO producer_email. respond()
  // computes the "other party" as order.producer_email; the `? :` binds looser than `||`,
  // so the buyer branch used to be a bare order.producer_email (undefined) and .toLowerCase()
  // threw a TypeError → 500. It must instead cleanly reject the mismatched contact.
  const { d, id } = await freshOpenDispute();
  const r = await d.respond(id, { contact: 'seller@x.com', note: 'ส่งของแล้ว', evidence: 'tracking#' });
  ok(r.ok === false && /ไม่ตรง/.test(r.error || ''), `respond to an order with no producer_email → clean {ok:false} (no crash): ${r.error}`);

  // happy path: order HAS producer_email → the producer's matching contact is accepted
  const d2 = makeDisputesWithProducer();
  const opened = await d2.open({ order_id: 'o1', opened_by: 'buyer', contact: 'buyer@x.com', reason: 'ของชำรุด' });
  const good = await d2.respond(opened.id, { contact: 'SELLER@x.com', note: 'ขอส่งหลักฐาน', evidence: 'รูปสินค้า' });
  ok(good.ok === true, 'the producer (matching producer_email, case-insensitive) can post a counter-response');
  const wrong = await d2.respond(opened.id, { contact: 'someone-else@x.com', note: 'ไม่ใช่คู่กรณี', evidence: '' });
  ok(wrong.ok === false, 'a third party whose contact matches neither side is rejected');
}

console.log('\n=== track(): contact-gated status check, crash-safe on an order with no producer_email ===');
{
  // Same `?:`/`||` precedence crash as respond(), but track() computes otherPartyContact BEFORE
  // the contact check — so a buyer-opened dispute on an order with NO producer_email used to throw
  // (500) for EVERY caller, including the dispute's own opener who just wants to see its status.
  const { d, id } = await freshOpenDispute(); // makeDisputes() order has no producer_email
  const self = await d.track(id, 'buyer@x.com');
  ok(self.ok === true && self.dispute?.id === id, `the opener can track their own dispute even when the order has no producer_email (no crash): ok=${self.ok}`);
  ok(!('opener_contact' in (self.dispute || {})) && !('ai_suggestion' in (self.dispute || {})), 'track returns the sanitized party-facing view (no opener_contact / AI draft)');
  const stranger = await d.track(id, 'nobody@x.com');
  ok(stranger.ok === false && /ไม่ตรง/.test(stranger.error || ''), `a non-party contact → clean {ok:false} (no crash): ${stranger.error}`);
  const missing = await d.track(id, '');
  ok(missing.ok === false, 'empty contact → rejected (no bypass)');

  // with a producer_email present, the producer (the other party) can also track
  const d2 = makeDisputesWithProducer();
  const opened = await d2.open({ order_id: 'o1', opened_by: 'buyer', contact: 'buyer@x.com', reason: 'ของชำรุด' });
  const byProducer = await d2.track(opened.id, 'SELLER@x.com');
  ok(byProducer.ok === true, 'the producer (matching producer_email, case-insensitive) can also track');
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
