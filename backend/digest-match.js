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
