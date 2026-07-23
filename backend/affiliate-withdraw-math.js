// Affiliate withdraw-request math — the money-integrity rules for how much an
// affiliate may REQUEST to withdraw right now. Kept separate from the admin PAY
// side (affiliate-payout.js: payoutRemaining/canPayout) and extracted verbatim
// from server.js so the invariant can be unit-tested deterministically. The two
// exports below are byte-for-byte the same computation server.js used inline; the
// extraction adds no behaviour, only testability.
//
// The withdraw route (POST /api/affiliate/withdraw) rejects any request whose
// amount exceeds `affAvailable(aff, withdrawals)`. Availability must subtract not
// only what's already been paid out but also what's already RESERVED by other
// in-flight requests (status pending/approved) — otherwise an affiliate could fire
// several requests that each individually fit the earned balance but together
// exceed it, and the platform would owe more than was earned.

// Sum of amounts an affiliate has locked up in still-open withdrawal requests.
// Only 'pending'/'approved' reserve funds: 'paid' is already reflected in the
// affiliate's paid_out, and 'rejected'/'cancelled' free the funds again.
export function reservedFor(withdrawals, ref) {
  return (withdrawals || [])
    .filter((w) => w.ref_code === ref && ['pending', 'approved'].includes(w.status))
    .reduce((s, w) => s + (w.amount || 0), 0);
}

// How much this affiliate can still request to withdraw right now:
// earned − paid − reserved, rounded to 2dp (satang). Matches server.js exactly —
// notably it is NOT clamped at 0, so heavy over-reservation drift can read
// negative; every caller treats "amount > available" as a rejection, so a negative
// available simply rejects all further requests (the safe direction).
export function affAvailable(aff, withdrawals) {
  return +((aff?.total_earned || 0) - (aff?.paid_out || 0) - reservedFor(withdrawals, aff?.ref_code)).toFixed(2);
}
