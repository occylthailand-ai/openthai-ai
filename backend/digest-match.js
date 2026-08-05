// Pure, side-effect-free selector for the consumer category digest (sendConsumerDigest in server.js).
//
// WHY separate + pure: the digest itself needs a live SMTP mailer to run, so its selection logic was
// untestable inline. Pulling the "which products does this consumer see" decision into a pure function
// lets a no-server unit test pin the two rules that matter, without sending mail.
//
// Rules:
//   1. Exact category match — the consumer picked a category of interest; sendConsumerDigest matches it
//      against a producer's catalog category with strict equality (see frontend/src/data/portalCategories
//      for why the two lists are kept identical).
//   2. Don't feature sold-out items — a "🛍️ new picks in your category" promo that links a consumer to a
//      product they can't buy wastes the click and erodes trust. `stock === 0` (explicitly sold out) is
//      excluded; `stock == null` means the producer doesn't track stock (always available) and is kept,
//      as is any positive stock. Negative/garbage values are treated as unavailable.
export function selectDigestMatches(catalog, category, limit = 5) {
  if (!category) return [];
  const n = Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : 5);
  return (catalog || [])
    .filter((p) => p && p.category === category && (p.stock == null || Number(p.stock) > 0))
    .slice(0, n);
}

// Collapse consumer leads to ONE record per email address before sending the digest.
//
// WHY: portalLeads.submit() creates a fresh record per submission with no dedup by email, so a
// consumer who submits the /portals/consumer form more than once (double-click, page refresh,
// "did it go through?") ends up with 2+ 'consumer' records for the same address. sendConsumerDigest
// iterates the records, so that person receives the SAME promo email once per duplicate — which reads
// as spam, hurts sender reputation/deliverability, and erodes the trust the market-entry push depends on.
//
// RULE: among the duplicates for one email, keep the most recent submission that carries a category
// (so selectDigestMatches can actually match products); if none has a category, keep the most recent
// overall. Email compare is case-insensitive; created_at is ISO-8601 so a lexicographic compare orders
// it. Pure/non-mutating — input order does not matter.
export function dedupeConsumerLeads(leads) {
  const hasCategory = (l) => !!((l && l.form_data || {}).category);
  const newer = (a, b) => (String((a && a.created_at) || '') >= String((b && b.created_at) || '') ? a : b);
  const preferred = (a, b) => {
    const ca = hasCategory(a), cb = hasCategory(b);
    if (ca !== cb) return ca ? a : b;   // a real category beats a blank one regardless of recency
    return newer(a, b);                 // otherwise the latest stated intent wins
  };
  const byEmail = new Map();
  for (const lead of (leads || [])) {
    const email = ((lead && lead.email) || '').toString().trim().toLowerCase();
    if (!email) continue;
    const prev = byEmail.get(email);
    byEmail.set(email, prev ? preferred(prev, lead) : lead);
  }
  return [...byEmail.values()];
}
