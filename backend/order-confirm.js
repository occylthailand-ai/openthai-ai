// Pure, side-effect-free decision helper for the BUYER order-confirmation email.
//
// WHY: when a buyer places an order (POST /api/orders), sendOrderNotification emails the PRODUCER
// (and CCs the owner), but the buyer got nothing but an on-screen order id — close the tab and the id
// (needed to track the order at /track) is gone. This adds a transactional confirmation to the buyer.
//
// It's consent-safe (not the prohibited "contact people without consent"): the buyer initiated the
// order and supplied this contact FOR this order — a one-off transactional receipt is exactly what
// they expect, not marketing. We only email when the contact they gave is an email (many buyers give
// a phone instead — then there's simply no email channel and we skip, no guessing).
//
// Kept pure + separate so a no-server test can pin the two things that matter — WHEN we email and the
// track link we build — without needing a live SMTP mailer.

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');

// Returns null when the buyer can't/shouldn't be emailed (no email contact), otherwise the
// { to, subject, trackUrl } needed to send — the caller adds the HTML body and does the send.
export function buyerConfirmation(order, domainUrl = '') {
  const to = (order?.contact || '').toString().trim();
  if (!isEmail(to)) return null;
  const id = (order?.id || '').toString();
  const name = (order?.product_name || '').toString();
  const qty = order?.qty != null ? order.qty : 1;
  const base = String(domainUrl || '').replace(/\/+$/, '');
  const trackUrl = `${base}/track?id=${encodeURIComponent(id)}&contact=${encodeURIComponent(to)}`;
  return { to, subject: `✅ ยืนยันคำสั่งซื้อ — ${name} ×${qty}`, trackUrl };
}
