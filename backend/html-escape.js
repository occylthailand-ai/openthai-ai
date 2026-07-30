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

// Consumer "new picks" digest email. The consumer's chosen `category` (form_data.category,
// entered at consumer-portal signup and only clip()-sanitized — the bypassable /<[^>]*>/g) was
// interpolated RAW into the title that fills the <h1>, so an unclosed `<img …onerror=…` category
// rendered live in the digest email. Escape it (and name + each match's product/producer) at the
// HTML insertion point. The email SUBJECT keeps the raw category — a subject is plain text, not
// HTML, so escaping it would show literal &quot;. Returns { subject, html }.
export function consumerDigestHtml({ name, category, matches = [], lang, domainUrl, unsubUrl } = {}) {
  const L = lang === 'en' ? 'en' : lang === 'zh' ? 'zh' : 'th';
  const cat = String(category ?? '');
  const nm = escapeHtml(name || '');
  const itemsHtml = matches.map((p) => `
      <tr><td style="padding:9px 0;border-top:1px solid rgba(255,255,255,0.08);">${escapeHtml(p.product_name)} <span style="color:#64748b;font-size:12px;">· ${escapeHtml(p.producer)}</span></td>
      <td style="padding:9px 0;border-top:1px solid rgba(255,255,255,0.08);text-align:right;font-weight:700;">${p.price ? `฿${Number(p.price).toLocaleString('th-TH')}` : '-'}</td></tr>`).join('');
  // Plain title (for the subject) uses the raw category; the <h1> escapes the whole string.
  const titleByLang = { th: `🛍️ สินค้าใหม่ในหมวด "${cat}" ที่คุณสนใจ`, en: `🛍️ New picks in "${cat}"`, zh: `🛍️ "${cat}" 分类新品` };
  const introByLang = {
    th: `สวัสดีคุณ${nm} นี่คือสินค้าจากผู้ผลิตที่ผ่านการรับรองในหมวดที่คุณสนใจ`,
    en: `Hi ${nm}, here are verified-producer picks in your selected category`,
    zh: `您好${nm}，以下是您感兴趣分类中的认证生产商产品`,
  };
  const unsubByLang = { th: 'ยกเลิกรับอีเมลนี้', en: 'Unsubscribe', zh: '取消订阅' };
  const subject = titleByLang[L];
  const html = `
        <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#06b6d4,#3b82f6);padding:24px;text-align:center;"><h1 style="margin:0;font-size:19px;">${escapeHtml(titleByLang[L])}</h1></div>
          <div style="padding:24px;font-size:14px;">
            <p style="margin:0 0 14px;">${introByLang[L]}</p>
            <table style="width:100%;border-collapse:collapse;">${itemsHtml}</table>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:16px;text-align:center;font-size:12px;color:#64748b;">Openthai.ai · <a href="${domainUrl}" style="color:#6366f1;">${String(domainUrl || '').replace(/^https?:\/\//, '')}</a> · <a href="${unsubUrl}" style="color:#64748b;">${unsubByLang[L]}</a></div>
        </div>`;
  return { subject, html };
}

// Producer-approval email body ("your shop is approved"). `company` and `productName` are
// producer-entered at signup (clip()-sanitized only — the bypassable /<[^>]*>/g) and were the
// one email in server.js still interpolated RAW into the HTML. Besides the XSS class every other
// email here already closes, this is a correctness bug for legitimate producers: a Thai shop name
// with `&` (e.g. "S & P") or `<`/`>` rendered garbled in the very email that welcomes them.
// Escape both at the insertion point. `to` (recipient email) only lands in the manage-link URL
// via encodeURIComponent (URL context); domainUrl is a trusted env origin, left verbatim.
export function producerApprovalHtml({ to, company, productName, domainUrl } = {}) {
  const co = escapeHtml(company);
  const prod = escapeHtml(productName);
  const manageUrl = `${domainUrl}/producers/manage?email=${encodeURIComponent(to ?? '')}`;
  return `
      <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#10b981,#06b6d4);padding:28px;text-align:center;">
          <h1 style="margin:0;font-size:22px;">🎉 ยินดีด้วย${company ? ' ' + co : ''}!</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);">ใบสมัครผู้ผลิตของคุณได้รับการอนุมัติแล้ว</p>
        </div>
        <div style="padding:24px;font-size:15px;line-height:1.7;">
          <p>${productName ? `สินค้า "<strong>${prod}</strong>"` : 'สินค้าของคุณ'} พร้อมแสดงในตลาด Openthai.ai แล้วตอนนี้</p>
          <div style="text-align:center;margin:20px 0;">
            <a href="${manageUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#06b6d4);color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:700;font-size:15px;">📦 จัดการสินค้าของฉัน</a>
          </div>
          <p style="color:#94a3b8;font-size:13px;">เติมสต๊อก แก้ราคา หรือแก้รายละเอียดสินค้าได้เองทุกเมื่อจากหน้านี้ ไม่ต้องรอทีมงาน</p>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:16px;text-align:center;font-size:12px;color:#64748b;">Openthai.ai · <a href="${domainUrl}" style="color:#6366f1;">${String(domainUrl || '').replace(/^https?:\/\//, '')}</a></div>
      </div>`;
}

// Affiliate welcome email body. `name` is applicant-entered (registerAffiliateCore trims/slices
// but does NOT HTML-escape it) and was interpolated raw into the <h1> — the last notification-email
// path still doing so. `refLink` can be caller-supplied (input.ref_link) and lands in an href AND as
// link text, so it's escaped too; `refCode` is already charset-limited ([A-Za-z0-9_-]) but escaped
// for uniformity. The dashboard link uses encodeURIComponent on the code (URL context). domainUrl is
// a trusted env origin, left verbatim.
export function affiliateWelcomeHtml({ name, refCode, refLink, domainUrl } = {}) {
  const n = escapeHtml(name);
  const code = escapeHtml(refCode);
  const link = escapeHtml(refLink);
  const dashHref = `${domainUrl}/affiliate/dashboard?ref=${encodeURIComponent(refCode ?? '')}`;
  return `
      <div style="font-family:Arial,sans-serif;background:#0f0f1a;color:#f8fafc;max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#fe2c55,#6366f1);padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:26px;">🎉 ยินดีด้วย ${n}!</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);">คุณเป็น Affiliate ของ Openthai.ai แล้ว</p>
        </div>
        <div style="padding:28px;">
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
            <div style="font-size:12px;color:#64748b;margin-bottom:6px;">REF CODE ของคุณ</div>
            <div style="font-size:32px;font-weight:900;letter-spacing:4px;color:#10b981;">${code}</div>
          </div>
          <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:16px;margin-bottom:20px;">
            <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Affiliate Link ของคุณ</div>
            <a href="${link}" style="color:#a5b4fc;font-size:14px;word-break:break-all;">${link}</a>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:10px;background:rgba(16,185,129,0.1);border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:900;color:#10b981;">20%</div>
                <div style="font-size:11px;color:#64748b;">Commission เริ่มต้น</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:10px;background:rgba(99,102,241,0.1);border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:900;color:#6366f1;">ทุกจันทร์</div>
                <div style="font-size:11px;color:#64748b;">จ่ายเงิน</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:10px;background:rgba(245,158,11,0.1);border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:900;color:#f59e0b;">40%</div>
                <div style="font-size:11px;color:#64748b;">สูงสุด Elite</div>
              </td>
            </tr>
          </table>
          <div style="text-align:center;">
            <a href="${dashHref}" style="display:inline-block;background:linear-gradient(135deg,#fe2c55,#6366f1);color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:700;font-size:15px;">📊 เปิด Dashboard ของฉัน</a>
          </div>
        </div>
        <div style="padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#475569;">
          Openthai.ai • <a href="${domainUrl}" style="color:#6366f1;">openthai-ai.com</a>
        </div>
      </div>`;
}
