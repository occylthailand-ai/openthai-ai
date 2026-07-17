// Public-exposure boundary for the affiliate stats endpoint — extracted so the
// "what does an unauthenticated caller see" rule is pure and unit-testable
// (see scripts/test-affiliate-public.mjs), same rationale as orders.publicOrderView /
// disputes.publicDisputeView.
//
// GET /api/affiliate/stats/:ref_code has NO auth: the ref_code is the only gate, and a
// ref_code travels in the affiliate's shareable links — a buyer who clicks an affiliate
// link sees `?ref=CODE` in the URL, so the code is effectively public and anything this
// endpoint returns is public too. Each stored recent_sale carries the Omise `charge_id`
// of the *referred buyer's* transaction: an internal payment-processor reference the
// affiliate never needs (the dashboard never renders it) and that must not be handed to
// whoever holds the ref link. Project each sale down to the affiliate-facing fields; the
// charge_id stays in the stored record for admin reconciliation, it just isn't exposed.

export function publicAffiliateSale(sale) {
  if (!sale || typeof sale !== 'object') return {};
  return {
    amount_thb: sale.amount_thb,
    commission: sale.commission,
    source: sale.source || 'direct',
    at: sale.at,
    date: sale.at, // the dashboard table reads `date`; `at` is the real timestamp
  };
}

export function publicAffiliateSales(sales) {
  return (Array.isArray(sales) ? sales : []).map(publicAffiliateSale);
}
