// Openthai Store customer emails — extracted so the "does this buyer get an email, and
// what does it say" logic is pure and unit-testable (see scripts/test-shop-receipt.mjs),
// same rationale as affiliate-tiers.js / affiliate-payout.js.
//
// Context: subscription/plan payments send sendPaymentReceipt to the buyer, but a
// /api/shop/checkout purchase and its later fulfilment steps (ship / deliver) only ever
// notified the shop OWNER — the paying customer got nothing. These build the customer-facing
// receipt + shipped + delivered notices. Self-contained (its own tiny HTML escaper) so it has
// no coupling back into server.js.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const shell = (headerGrad, headerTitle, inner) => `
  <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,${headerGrad});padding:26px;text-align:center;"><h1 style="margin:0;font-size:20px;">${headerTitle}</h1></div>
    <div style="padding:24px;font-size:14px;line-height:1.7;">${inner}</div>
    <div style="background:rgba(255,255,255,0.03);padding:16px;text-align:center;font-size:12px;color:#64748b;">Openthai Store · openthai-ai.com</div>
  </div>`;
const row = (label, value, strong) => `<tr><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);color:#94a3b8;">${label}</td><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);text-align:right;${strong || ''}">${value}</td></tr>`;

// A notice can only be emailed when the buyer's contact is actually an email address
// (checkout also accepts a phone / LINE id, which we can't email).
export function isReceiptEmail(contact) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact || '');
}

// Pure: build the {subject, html} of the buyer's purchase receipt. `amount` is THB.
export function buildShopReceipt({ customer_name, product_name, qty, amount, order_id } = {}) {
  const q = Math.max(1, parseInt(qty, 10) || 1);
  const total = Number(amount) > 0 ? Number(amount) : 0;
  const baht = `฿${Number(total).toLocaleString('th-TH')}`;
  const subject = `🧾 ยืนยันคำสั่งซื้อ ${order_id || ''} — Openthai Store`.trim();
  const inner = `
      <p style="margin:0 0 14px;">สวัสดีคุณ${esc(customer_name || '')} เราได้รับการชำระเงินของคุณเรียบร้อยแล้ว นี่คือใบยืนยันคำสั่งซื้อ</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#94a3b8;">เลขคำสั่งซื้อ</td><td style="padding:8px 0;text-align:right;font-weight:700;">${esc(order_id || '-')}</td></tr>
        ${row('สินค้า', `${esc(product_name || '-')} × ${q}`)}
        ${row('ยอดชำระ', baht, 'font-weight:800;color:#34d399;')}
      </table>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">ทีมงานจะจัดส่งสินค้าและติดต่อกลับตามช่องทางที่ให้ไว้ หากมีคำถามตอบกลับอีเมลนี้ได้เลย</p>`;
  return { subject, html: shell('#10b981,#059669', '🧾 ขอบคุณสำหรับการสั่งซื้อ', inner) };
}

// Pure: receipt for a QuickPay one-time purchase (POST /api/quickpay/create — sell a
// package / single item, NOT a subscription). The subscription receipt (sendPaymentReceipt)
// says "your account was upgraded to the X monthly plan", which is wrong for a QuickPay buyer,
// and it fires only when rec.plan is set — QuickPay stores plan:null + the buyer's address in
// `buyer_email`, so a paying QuickPay customer got no confirmation at all. This is that
// confirmation: a one-time purchase receipt with the item label, amount, date and reference.
export function buildQuickpayReceipt({ buyer, label, amount, charge_id, paid_at } = {}) {
  const total = Number(amount) > 0 ? Number(amount) : 0;
  const baht = `฿${Number(total).toLocaleString('th-TH')}`;
  const when = paid_at ? new Date(paid_at).toLocaleString('th-TH') : new Date().toLocaleString('th-TH');
  const subject = `🧾 ใบเสร็จการชำระเงิน — ${label || 'Openthai.ai'}`.trim();
  const inner = `
      <p style="margin:0 0 14px;">สวัสดีคุณ${esc(buyer || '')} เราได้รับการชำระเงินของคุณเรียบร้อยแล้ว นี่คือใบเสร็จ</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${row('รายการ', esc(label || '-'))}
        ${row('ยอดที่ชำระ', baht, 'font-weight:800;color:#34d399;')}
        ${row('วันที่ชำระเงิน', esc(when))}
        <tr><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);color:#94a3b8;">เลขที่รายการ</td><td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);text-align:right;font-family:monospace;font-size:12px;">${esc(charge_id || '-')}</td></tr>
      </table>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">เก็บอีเมลนี้ไว้เป็นหลักฐานการชำระเงิน หากมีคำถามตอบกลับอีเมลนี้ได้เลย</p>`;
  return { subject, html: shell('#10b981,#059669', '🧾 ขอบคุณสำหรับการชำระเงิน', inner) };
}

// Pure: "your order shipped" notice — sent when an admin records a tracking number.
export function buildShippedNotice({ customer_name, product_name, tracking_no, carrier, order_id } = {}) {
  const subject = `📦 คำสั่งซื้อ ${order_id || ''} จัดส่งแล้ว — Openthai Store`.trim();
  const carrierRow = carrier ? row('ขนส่ง', esc(carrier)) : '';
  const trackingRow = tracking_no ? row('เลขพัสดุ', esc(tracking_no), 'font-weight:800;color:#60a5fa;') : '';
  const inner = `
      <p style="margin:0 0 14px;">สวัสดีคุณ${esc(customer_name || '')} คำสั่งซื้อของคุณถูกจัดส่งแล้ว รายละเอียดการติดตามพัสดุ:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#94a3b8;">เลขคำสั่งซื้อ</td><td style="padding:8px 0;text-align:right;font-weight:700;">${esc(order_id || '-')}</td></tr>
        ${row('สินค้า', esc(product_name || '-'))}${carrierRow}${trackingRow}
      </table>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">ติดตามสถานะพัสดุได้จากเลขที่ให้ไว้ หากมีคำถามตอบกลับอีเมลนี้ได้เลย</p>`;
  return { subject, html: shell('#3b82f6,#6366f1', '📦 คำสั่งซื้อของคุณจัดส่งแล้ว', inner) };
}

// Pure: "your order was cancelled" notice. Sent when an order moves to `cancelled`
// (admin cancels, or the paid-but-oversold race auto-cancels). When the buyer already
// paid (refund_pending / amount > 0) it must say a refund is being processed back to the
// original channel — the money case is exactly why the customer needs to hear from us.
export function buildCancelledNotice({ customer_name, product_name, order_id, amount, reason, refund_pending } = {}) {
  const paid = refund_pending || Number(amount) > 0;
  const subject = `❌ คำสั่งซื้อ ${order_id || ''} ถูกยกเลิก — Openthai Store`.trim();
  const reasonRow = reason ? row('เหตุผล', esc(reason)) : '';
  const refundBlock = paid
    ? `<div style="margin:16px 0 0;padding:14px;border-radius:10px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.25);">
         <p style="margin:0;color:#34d399;font-weight:700;">💰 การคืนเงิน</p>
         <p style="margin:6px 0 0;color:#cbd5e1;">ยอดที่ชำระ${Number(amount) > 0 ? ` ฿${Number(amount).toLocaleString('th-TH')}` : ''} กำลังดำเนินการคืนกลับช่องทางที่คุณชำระมา ทีมงานจะติดต่อกลับเพื่อยืนยันโดยเร็ว</p>
       </div>`
    : '';
  const inner = `
      <p style="margin:0 0 14px;">สวัสดีคุณ${esc(customer_name || '')} คำสั่งซื้อของคุณถูกยกเลิก รายละเอียดด้านล่าง</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#94a3b8;">เลขคำสั่งซื้อ</td><td style="padding:8px 0;text-align:right;font-weight:700;">${esc(order_id || '-')}</td></tr>
        ${row('สินค้า', esc(product_name || '-'))}${reasonRow}
      </table>
      ${refundBlock}
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">หากมีคำถามหรือต้องการเปิดข้อพิพาท ตอบกลับอีเมลนี้ได้ทันที</p>`;
  return { subject, html: shell('#ef4444,#f97316', '❌ คำสั่งซื้อถูกยกเลิก', inner) };
}

// Pure: "delivered" confirmation — sent when an admin confirms delivery with proof
// (received_by signature or drop_off location).
export function buildDeliveredNotice({ customer_name, product_name, order_id, received_by, drop_off } = {}) {
  const subject = `✅ คำสั่งซื้อ ${order_id || ''} จัดส่งถึงแล้ว — Openthai Store`.trim();
  const proof = received_by ? `เซ็นรับโดย ${esc(received_by)}` : drop_off ? `ฝากไว้ที่ ${esc(drop_off)}` : 'จัดส่งสำเร็จ';
  const inner = `
      <p style="margin:0 0 14px;">สวัสดีคุณ${esc(customer_name || '')} คำสั่งซื้อของคุณจัดส่งถึงปลายทางเรียบร้อยแล้ว</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#94a3b8;">เลขคำสั่งซื้อ</td><td style="padding:8px 0;text-align:right;font-weight:700;">${esc(order_id || '-')}</td></tr>
        ${row('สินค้า', esc(product_name || '-'))}
        ${row('หลักฐานการรับ', proof)}
      </table>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">หากยังไม่ได้รับสินค้าหรือมีปัญหา ตอบกลับอีเมลนี้เพื่อเปิดข้อพิพาทได้ทันที</p>`;
  return { subject, html: shell('#10b981,#059669', '✅ พัสดุถึงปลายทางแล้ว', inner) };
}
