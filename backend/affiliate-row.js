// ── Affiliate ↔ Supabase row mapping (extracted for deterministic unit testing) ──
// The affiliates table is upserted on ref_code. `affToRow` maps an in-memory
// affiliate record to exactly the columns the table declares — the safe pattern
// that structurally can't send an unknown column (see credits.toRow).
//
// `consent` was added later (PDPA — registerAffiliateCore enforces consent:true and
// keeps it in the record, but it was never persisted in Supabase). Because Vercel
// auto-deploys on push, the code may start writing `consent` before the owner has
// run the migration alter on the live table. To avoid regressing a working signup
// funnel (an unknown-column write 400s in PostgREST → the whole insert fails →
// falls back to the ephemeral file store → lost on redeploy), saveAffiliate retries
// once WITHOUT consent when the write fails specifically because the consent column
// is missing. Post-migration the retry never triggers and consent persists.

export function affToRow(r) {
  return {
    ref_code: r.ref_code, name: r.name, email: r.email, phone: r.phone || '',
    platform: r.platform || 'TikTok', followers: r.followers || '',
    channel_url: r.channel_url || '', note: r.note || '', ref_link: r.ref_link || '',
    tier: r.tier || 'starter', commission_rate: r.commission_rate ?? 0.20,
    total_sales: r.total_sales || 0, total_earned: r.total_earned || 0,
    pending_payout: (r.total_earned || 0) - (r.paid_out || 0),
    status: r.status || 'active',
    consent: r.consent === true,
    joined_at: r.joined_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// A copy of the row without the consent key — used for the pre-migration retry.
export function rowWithoutConsent(row) {
  const { consent, ...rest } = row || {};
  return rest;
}

// True only when a Supabase write error is specifically about a missing `consent`
// column (PostgREST PGRST204: "Could not find the 'consent' column ... in the
// schema cache"). Kept narrow so an unrelated failure never silently drops consent.
export function isMissingConsentColumnError(message) {
  const m = String(message || '');
  return /consent/i.test(m) && /(could not find|schema cache|PGRST204|does not exist|unknown column)/i.test(m);
}
