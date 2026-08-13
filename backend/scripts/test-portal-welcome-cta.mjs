// Deterministic unit test (no server, no SMTP) — the welcome-email dashboard CTA helper.
// Pins the two things that matter: (1) exactly the three dashboard roles (producer/consumer/middleman)
// get a button linking to /<role>/dashboard?email=<encoded>, localized per language; (2) every other
// role — and missing inputs — get NO button (empty string), so their emails are unchanged.
import { portalWelcomeCtaHtml, PORTAL_DASHBOARD } from '../portal-welcome-cta.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

const DOMAIN = 'https://www.openthai-ai.com';

console.log('=== the three dashboard roles get a link to their dashboard with the email pre-filled ===');
for (const [role, path] of Object.entries(PORTAL_DASHBOARD)) {
  const html = portalWelcomeCtaHtml(role, 'user@example.com', 'th', DOMAIN);
  ok(html.includes(`${DOMAIN}${path}?email=user%40example.com`), `${role}: links to ${path}?email=<encoded email>`);
  ok(/<a\s+href=/.test(html), `${role}: renders an <a> button`);
}

console.log('\n=== label is localized per language ===');
ok(portalWelcomeCtaHtml('producer', 'a@b.com', 'en', DOMAIN).includes('Open my producer dashboard'), 'producer en label');
ok(portalWelcomeCtaHtml('consumer', 'a@b.com', 'zh', DOMAIN).includes('查看我的推荐'), 'consumer zh label');
ok(portalWelcomeCtaHtml('middleman', 'a@b.com', 'th', DOMAIN).includes('เปิดแดชบอร์ดคนกลาง'), 'middleman th label');
ok(portalWelcomeCtaHtml('producer', 'a@b.com', 'xx', DOMAIN).includes('เปิดแดชบอร์ดผู้ผลิต'), 'unknown lang falls back to th');

console.log('\n=== roles without a dashboard get NO button (email unchanged) ===');
for (const role of ['gov-thai', 'gov-intl', 'intl-org', 'foundation', 'creator', 'affiliate', 'unknown']) {
  ok(portalWelcomeCtaHtml(role, 'a@b.com', 'th', DOMAIN) === '', `${role}: returns '' (no button)`);
}

console.log('\n=== defensive: missing email / domain do not throw or emit a broken link ===');
ok(portalWelcomeCtaHtml('producer', '', 'th', DOMAIN) === '', 'empty email → no button');
ok(portalWelcomeCtaHtml('producer', null, 'th', DOMAIN) === '', 'null email → no button');
ok(!portalWelcomeCtaHtml('producer', 'a@b.com', 'th', 'https://x.com/').includes('//producer'), 'trailing slash on domain is not doubled');
const special = portalWelcomeCtaHtml('consumer', 'a+b@x.com', 'en', DOMAIN);
ok(special.includes('email=a%2Bb%40x.com'), 'special chars in the email are URL-encoded (no broken link)');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
