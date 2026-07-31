// Guards that FULL-MIGRATION.sql — the single consolidated file the owner is told to run — contains
// every column the backend writes for the money / order / producer tables. FULL-MIGRATION is the
// SAFE path: the alternative is running the incremental files (000/002/*-schema.sql + ALTERs like
// 001-shipping-stock.sql, 006_order_disputes.sql) in the right order, which is fragile — e.g.
// producers-schema.sql alone lacks `stock` (added later by 001-shipping-stock.sql) and orders-schema.sql
// alone lacks `escrow_status` (added by 006). FULL-MIGRATION folds all of those in. This test pins that,
// so a future "simplification" of FULL-MIGRATION that drops a needed column (silently breaking the
// Supabase upsert → data lost on redeploy) fails CI.
//
// The column sets below are the fields the code actually POSTs, verified against the source on
// 2026-07-31 (orders.js place(), inventory.js upsert/adjust, credits.js toRow, server.js entitlements/
// user_sync). payments + pdpa_consents have their own dedicated schema tests.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const full = readFileSync(join(here, '..', 'migrations', 'FULL-MIGRATION.sql'), 'utf8');

function columnsOf(table) {
  const m = full.match(new RegExp(`create table\\s+(?:if not exists\\s+)?(?:public\\.)?${table}\\s*\\(([\\s\\S]*?)\\);`, 'i'));
  if (!m) return null;
  return m[1].split('\n').map((l) => l.trim())
    .filter((l) => l && !/^(primary|unique|foreign|constraint|check)\b/i.test(l))
    .map((l) => l.match(/^["']?([a-z_]+)["']?\s/i)?.[1]).filter(Boolean);
}

// table -> the columns the code writes (subset of the table is fine; every one MUST exist)
const CONTRACT = {
  orders:          ['id', 'producer_email', 'product_name', 'customer_name', 'contact', 'address', 'qty', 'amount', 'note', 'status', 'escrow_status', 'tracking_no', 'carrier', 'delivered_at', 'received_by', 'drop_off', 'proof_note', 'history', 'created_at'],
  producers:       ['stock'],  // the column producers-schema.sql lacks; FULL-MIGRATION must carry it
  products:        ['id', 'sku', 'name', 'category', 'price', 'cost', 'stock', 'low_stock', 'status', 'image_url', 'description', 'created_at', 'updated_at'],
  stock_movements: ['id', 'product_id', 'delta', 'type', 'reason', 'ref', 'platform', 'at'],
  credits:         ['id', 'balance', 'streak_days', 'streak_date', 'spun', 'prize', 'claims', 'updated_at'],
  entitlements:    ['email', 'plan', 'status', 'source', 'subscription_id', 'started_at', 'updated_at', 'expires_at'],
  user_sync:       ['user_key', 'data', 'updated_at'],
};

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

for (const [table, needed] of Object.entries(CONTRACT)) {
  console.log(`\n=== FULL-MIGRATION.sql "${table}" carries every column the code writes ===`);
  const cols = columnsOf(table);
  ok(Array.isArray(cols) && cols.length > 0, `parsed ${table} columns: ${cols?.join(', ')}`);
  for (const col of needed) ok(cols?.includes(col), `${table}.${col} exists in FULL-MIGRATION`);
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
