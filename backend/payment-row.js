// Payment upsert-row construction — extracted so its shape can be pinned by a test against the
// `payments` table the code actually targets. The row is POSTed to Supabase `/payments` with
// on_conflict=charge_id; if a column here has no matching column in the table, PostgREST rejects the
// whole upsert (400) and the payment/revenue record silently falls back to the ephemeral /tmp file
// (lost on the next Vercel redeploy) — a money-data-loss bug. The schema test keeps the two in lockstep.
//
// IMPORTANT (schema source of truth): the code writes the FLAT schema below, which matches
// migrations/FULL-MIGRATION.sql's `payments` table (charge_id PK, mock_mode, …). It does NOT match
// migrations/002_subscriptions_payments.sql, which defines a different, normalized `payments` table
// (user_id NOT NULL FK, omise_charge_id, plan_id, no charge_id/mock_mode). Setting up Supabase with
// 002's payments table would make every payment upsert fail. See DECISIONS_LOG 2026-07-31.

export const PAYMENT_COLUMNS = ['charge_id', 'email', 'plan', 'method', 'amount_thb', 'status', 'paid', 'paid_at', 'mock_mode', 'created_at'];

export function buildPaymentRow(rec = {}, now = new Date()) {
  return {
    charge_id:  rec.charge_id || rec.subscription_id || `pay_${now.getTime()}`,
    email:      rec.email || null,
    plan:       rec.plan || 'unknown',
    method:     rec.method || 'unknown',
    amount_thb: rec.amount_thb || null,
    status:     rec.status || null,
    paid:       !!rec.paid,
    paid_at:    rec.paid_at || null,
    mock_mode:  !!rec.mock_mode,
    created_at: rec.createdAt || now.toISOString(),
  };
}
