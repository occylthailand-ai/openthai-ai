// Affiliate payout invariant — extracted from server.js so the money-critical
// "never pay out more than was earned" rule can be unit-tested deterministically
// (see scripts/test-affiliate-payout.mjs), same rationale as affiliate-tiers.js.
// Pure functions, no state.
//
// The admin "paid" action (POST /api/affiliate/withdrawals/admin/:id) adds the
// withdrawal amount to the affiliate's paid_out. reservedFor() only counts
// 'pending'/'approved' withdrawals, so it can't stop an over-pay that arrives via
// a resurrected request: reject one → request+pay a new one up to the full balance
// → then re-approve the rejected one and pay it. Without a balance check at pay
// time, paid_out silently exceeds total_earned (real money paid twice). These
// helpers are that check.

// เงินที่ยังไม่ได้จ่ายให้ affiliate = total_earned − paid_out (ไม่ต่ำกว่า 0)
export function payoutRemaining(aff) {
  const remaining = (aff?.total_earned || 0) - (aff?.paid_out || 0);
  return +Math.max(0, remaining).toFixed(2);
}

// จ่ายคำขอจำนวน amount ได้ไหมโดยไม่ทำให้ paid_out เกิน total_earned
export function canPayout(aff, amount) {
  return amount > 0 && amount <= payoutRemaining(aff);
}
