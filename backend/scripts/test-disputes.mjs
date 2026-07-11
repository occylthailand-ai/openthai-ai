import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDisputes } from '../disputes.js';

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

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
