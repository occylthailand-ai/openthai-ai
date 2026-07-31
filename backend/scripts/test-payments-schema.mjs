// Guards the payment upsert-row ↔ payments-table schema, and pins WHICH migration is compatible.
// The row is POSTed to Supabase /payments (on_conflict=charge_id). If a written column has no
// matching table column, PostgREST 400s and the revenue record silently falls back to the ephemeral
// /tmp file (lost on the next redeploy) — money data loss. Two migrations define a `payments` table:
//   - FULL-MIGRATION.sql : flat (charge_id PK, mock_mode, …) — MATCHES the code.
//   - 002_subscriptions_payments.sql : normalized (user_id NOT NULL FK, omise_charge_id, plan_id) —
//     INCOMPATIBLE with the code. This test asserts the match with FULL-MIGRATION and documents the
//     002 mismatch, so a Supabase set-up that runs 002's payments table can't silently break revenue.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { buildPaymentRow, PAYMENT_COLUMNS } from '../payment-row.js';

const here = dirname(fileURLToPath(import.meta.url));
const mig = (f) => readFileSync(join(here, '..', 'migrations', f), 'utf8');

function paymentsColumns(sql) {
  const m = sql.match(/create table[^(]*payments[^(]*\(([\s\S]*?)\);/i);
  if (!m) return null;
  return m[1].split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^(primary|unique|foreign|constraint|check)\b/i.test(l))
    .map((l) => l.match(/^["']?([a-z_]+)["']?\s/i)?.[1])
    .filter(Boolean);
}

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

console.log('=== payment row shape == PAYMENT_COLUMNS ===');
const row = buildPaymentRow({ charge_id: 'chrg_1', email: 'a@b.com', plan: 'pro', method: 'card', amount_thb: 299, status: 'paid', paid: 1, paid_at: 't', mock_mode: 0, createdAt: 'c' });
ok(JSON.stringify(Object.keys(row).sort()) === JSON.stringify([...PAYMENT_COLUMNS].sort()),
   `buildPaymentRow keys == PAYMENT_COLUMNS (${PAYMENT_COLUMNS.join(',')})`);
ok(row.paid === true && row.mock_mode === false, 'paid/mock_mode are coerced to real booleans');
ok(buildPaymentRow({}, new Date('2026-07-31T00:00:00.000Z')).charge_id === `pay_${Date.parse('2026-07-31T00:00:00.000Z')}`, 'a missing charge_id falls back to a pay_<clock> id');
ok(buildPaymentRow({ subscription_id: 'sub_9' }).charge_id === 'sub_9', 'subscription_id is used as charge_id when charge_id is absent');

console.log('\n=== FULL-MIGRATION.sql payments defines every column the code writes (the compatible schema) ===');
const full = paymentsColumns(mig('FULL-MIGRATION.sql'));
ok(Array.isArray(full) && full.length > 0, `parsed FULL-MIGRATION payments columns: ${full?.join(', ')}`);
for (const col of PAYMENT_COLUMNS) ok(full?.includes(col), `FULL-MIGRATION payments has "${col}"`);

console.log('\n=== 002_subscriptions_payments.sql payments is a DIFFERENT, INCOMPATIBLE schema (documented landmine) ===');
const v002 = paymentsColumns(mig('002_subscriptions_payments.sql'));
ok(Array.isArray(v002) && v002.length > 0, `parsed 002 payments columns: ${v002?.join(', ')}`);
const missingIn002 = PAYMENT_COLUMNS.filter((c) => !v002?.includes(c));
ok(missingIn002.length > 0,
   `002 payments is missing code columns [${missingIn002.join(', ')}] → running 002 (not FULL-MIGRATION) would break payment upserts`);
ok(v002?.includes('user_id') && v002?.includes('omise_charge_id'),
   '002 payments is the normalized (user_id / omise_charge_id) design the code does not write');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
