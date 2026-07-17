// Openthai Store purchase receipt — extracted so the "does this buyer get a receipt,
// and what does it say" logic is pure and unit-testable (see scripts/test-shop-receipt.mjs),
// same rationale as affiliate-tiers.js / affiliate-payout.js.
//
// Context: subscription/plan payments send sendPaymentReceipt to the buyer, but a
// /api/shop/checkout purchase only ever emailed the shop OWNER — the paying customer got
// no confirmation at all. This builds the customer-facing receipt. Self-contained (its own
// tiny HTML escaper) so it has no coupling back into server.js.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// A receipt can only be emailed when the buyer's contact is actually an email address
// (checkout also accepts a phone / LINE id, which we can't email).
export function isReceiptEmail(contact) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact || '');
}

// Pure: build the {subject, html} of the buyer's receipt. `amount` is THB.
export function buildShopReceipt({ customer_name, product_name, qty, amount, order_id } = {}) {
  const q = Math.max(1, parseInt(qty, 10) || 1);
  const total = Number(amount) > 0 ? Number(amount) : 0;
  const baht = (n) => `฿${Number(n).toLocaleString('th-TH')}`;
  const subject = `🧾 ยืนยันคำสั่งซื้อ ${order_id || ''} — Openthai Store`.trim();
  const html = `
  <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#10b981,#059669);padding:26px;text-align:center;"><h1 style="margin:0;font-size:20px;">🧾 ขอบคุณสำหรับการสั่งซื้อ</h1></div>
    <div style="padding:24px;font-size:14px;line-height:1.7;">
      <p style="margin:0 0 14px;">สวัสดีคุณ${esc(customer_name || '')} เราได้รับการชำระเงินของคุณเรียบร้อยแล้ว นี่คือใบยืนยันคำสั่งซื้อ</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#94a3b8;">เลขคำสั่งซื้อ</td><td style="padding:8px 0;text-align:right;font-weight:700;">${esc(order_id || '-')}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);color:#94a3b8;">สินค้า</td><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);text-align:right;">${esc(product_name || '-')} × ${q}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);color:#94a3b8;">ยอดชำระ</td><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);text-align:right;font-weight:800;color:#34d399;">${baht(total)}</td></tr>
      </table>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">ทีมงานจะจัดส่งสินค้าและติดต่อกลับตามช่องทางที่ให้ไว้ หากมีคำถามตอบกลับอีเมลนี้ได้เลย</p>
    </div>
    <div style="background:rgba(255,255,255,0.03);padding:16px;text-align:center;font-size:12px;color:#64748b;">Openthai Store · openthai-ai.com</div>
  </div>`;
  return { subject, html };
}

// Pure: build the {subject, html} of the "your order shipped" notice for the buyer.
// Sent when an admin records a tracking number (/api/orders/admin/ship) — previously the
// customer was never told their order shipped or given the tracking number.
export function buildShippedNotice({ customer_name, product_name, tracking_no, carrier, order_id } = {}) {
  const subject = `📦 คำสั่งซื้อ ${order_id || ''} จัดส่งแล้ว — Openthai Store`.trim();
  const trackingRow = tracking_no
    ? `<tr><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);color:#94a3b8;">เลขพัสดุ</td><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);text-align:right;font-weight:800;color:#60a5fa;">${esc(tracking_no)}</td></tr>`
    : '';
  const carrierRow = carrier
    ? `<tr><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);color:#94a3b8;">ขนส่ง</td><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);text-align:right;">${esc(carrier)}</td></tr>`
    : '';
  const html = `
  <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:26px;text-align:center;"><h1 style="margin:0;font-size:20px;">📦 คำสั่งซื้อของคุณจัดส่งแล้ว</h1></div>
    <div style="padding:24px;font-size:14px;line-height:1.7;">
      <p style="margin:0 0 14px;">สวัสดีคุณ${esc(customer_name || '')} คำสั่งซื้อของคุณถูกจัดส่งแล้ว รายละเอียดการติดตามพัสดุ:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#94a3b8;">เลขคำสั่งซื้อ</td><td style="padding:8px 0;text-align:right;font-weight:700;">${esc(order_id || '-')}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);color:#94a3b8;">สินค้า</td><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);text-align:right;">${esc(product_name || '-')}</td></tr>
        ${carrierRow}${trackingRow}
      </table>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">ติดตามสถานะพัสดุได้จากเลขที่ให้ไว้ หากมีคำถามตอบกลับอีเมลนี้ได้เลย</p>
    </div>
    <div style="background:rgba(255,255,255,0.03);padding:16px;text-align:center;font-size:12px;color:#64748b;">Openthai Store · openthai-ai.com</div>
  </div>`;
  return { subject, html };
}
