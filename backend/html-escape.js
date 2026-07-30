// Shared HTML-escaping for values interpolated into notification-email markup.
//
// Why this exists as its own tested module: server.js escapes user-entered fields
// before dropping them into email HTML (order/dispute/portal-lead/buyer-confirm),
// because the upstream clip() sanitizers strip `<tag>` with /<[^>]*>/g — a regex an
// UNCLOSED `<` bypasses (e.g. `<img src=x onerror=…` has no `>`, so clip keeps it),
// and that dangling tag-opener then completes against the next `>` in the email
// template itself, injecting a real tag into the recipient's mail client. The email
// paths cross real people (buyer ↔ producer ↔ admin), so escaping must happen at the
// HTML insertion point, not be trusted to clip(). escapeHtml was inlined in server.js
// with no test; pulling it here (same implementation) lets the escaping — which every
// notification email depends on — be pinned by a unit test and reused without drift.
export const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Low-stock alert email body. product.name / product.sku are producer/admin-entered
// (inventory.upsert → clip(), the bypassable sanitizer above), so they MUST be escaped
// here — this is the one alert-email path that interpolated them raw. stock/low_stock
// are coerced to numbers (never HTML). domainUrl is a trusted env origin, left as-is.
export function lowStockAlertHtml(product, domainUrl) {
  const name = escapeHtml(product?.name);
  const sku = escapeHtml(product?.sku);
  const stock = Number(product?.stock ?? 0);
  const low = Number(product?.low_stock ?? 0);
  return `<div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:24px;text-align:center;"><h1 style="margin:0;font-size:22px;">⚠️ สต๊อกใกล้หมด</h1></div>
          <div style="padding:24px;font-size:15px;line-height:1.7;">
            <b>${name}</b> (SKU ${sku})<br>เหลือ <b style="color:#ef4444;">${stock}</b> ชิ้น · จุดเตือน ${low}<br><br>
            👉 ควรเติมสต๊อกที่ <a href="${domainUrl}/admin" style="color:#6366f1;">Admin → คลังสินค้า</a>
          </div></div>`;
}
