// Pure helper — the "open your dashboard" call-to-action injected into the portal welcome email.
// Extracted (like producerApprovalHtml) so it is unit-testable without a live mailer/SMTP.
//
// After signing up on /portals/<role>, a member gets a welcome email. For the three roles that now have
// a self-serve dashboard (producer / consumer / middleman) the email should carry a PERMANENT link
// straight to that dashboard with their email pre-filled (?email=…) — the durable re-entry path the
// in-page success button can't provide (it's lost on refresh). Roles without a dashboard (gov-thai,
// gov-intl, intl-org, foundation, creator, affiliate — affiliate has its own separate flow) get no
// button, so this returns '' for them and the email is unchanged.

// role → its self-serve dashboard route (only roles that actually have one)
export const PORTAL_DASHBOARD = {
  producer:  '/producer/dashboard',
  consumer:  '/consumer/dashboard',
  middleman: '/middleman/dashboard',
};

const CTA_LABEL = {
  producer:  { th: '📊 เปิดแดชบอร์ดผู้ผลิตของฉัน', en: 'Open my producer dashboard',  zh: '打开我的生产者仪表板' },
  consumer:  { th: '🛍️ ดูสินค้าแนะนำในแดชบอร์ด',    en: 'See my recommendations',      zh: '查看我的推荐' },
  middleman: { th: '📦 เปิดแดชบอร์ดคนกลางของฉัน',   en: 'Open my distributor dashboard', zh: '打开我的中间商仪表板' },
};

// Returns the CTA button HTML for a welcome email, or '' when the role has no dashboard / inputs are
// unusable. The email is placed in the href via encodeURIComponent, so it is safe inside the attribute
// (no raw user text is interpolated into HTML).
export function portalWelcomeCtaHtml(type, email, lang, domainUrl) {
  const path = PORTAL_DASHBOARD[type];
  if (!path) return '';
  const e = (email || '').toString().trim();
  if (!e) return '';
  const base = (domainUrl || '').replace(/\/+$/, '');
  const url = `${base}${path}?email=${encodeURIComponent(e)}`;
  const label = (CTA_LABEL[type] && (CTA_LABEL[type][lang] || CTA_LABEL[type].th)) || 'Open my dashboard';
  return `<div style="text-align:center;padding:0 24px 24px;"><a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#6366f1);color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;font-size:15px;">${label}</a></div>`;
}
