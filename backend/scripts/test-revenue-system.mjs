import { createHmac } from 'crypto';

// ── E2E รวมระบบหารายได้ OpenThaiAi ─────────────────────────────────────────────
// รัน: เปิด server (OMISE_WEBHOOK_SECRET=testsecret ADMIN_KEY=testadmin) แล้ว
//      node scripts/test-revenue-system.mjs
const BASE = process.env.TEST_BASE || 'http://localhost:8000';
const SECRET = process.env.OMISE_WEBHOOK_SECRET || 'testsecret';
const ADMIN = process.env.ADMIN_KEY || 'testadmin';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

async function j(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined });
  let data = null; try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}
async function paySignedWebhook(chargeId, amount = 100000) {
  const ev = { key: 'charge.complete', data: { id: chargeId, paid: true, amount, paid_at: new Date().toISOString(), metadata: {} } };
  const raw = JSON.stringify(ev);
  const sig = createHmac('sha256', SECRET).update(raw).digest('hex');
  await fetch(BASE + '/api/payment/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-omise-signature': sig }, body: raw });
}
async function dealFrom(ref, source) {
  const q = (await j('POST', '/api/quickpay/create', { amount_thb: 1000, ref, source })).data;
  await paySignedWebhook(q.charge_id);
  return q;
}

const REF = 'E2E' + Date.now().toString().slice(-6);

console.log('\n=== Captions (3 ภาษา) ===');
for (const lang of ['th', 'en', 'zh']) {
  const r = await j('POST', '/api/captions/generate', { name: 'Air Purifier', price: 890, platforms: ['tiktok', 'line'], lang });
  ok(r.data?.success && r.data.lang === lang && r.data.captions.tiktok && r.data.captions.line, `lang=${lang} → 2 แพลตฟอร์ม`);
}
ok((await j('POST', '/api/captions/generate', { price: 1 })).status === 400, 'ไม่มีชื่อ → 400');

console.log('\n=== Smart Model Router ===');
let r = await j('GET', '/api/router/status');
ok(r.data?.success && Array.isArray(r.data.providers) && r.data.providers.length === 3, 'status: 3 providers');
ok(typeof r.data.budget_usd === 'number' && typeof r.data.eco_mode === 'boolean', 'มี budget + eco_mode');
r = await j('POST', '/api/router/run', { prompt: 'hi', task_type: 'bulk' });
ok(r.data && r.data.tier === 'bulk' && Array.isArray(r.data.tried), 'run: เลือก tier bulk + tried');

console.log('\n=== OpenThaiAi Council ===');
r = await j('POST', '/api/council', { topic: 'ทดสอบ' });
ok(r.data?.success && r.data.voices?.length === 3 && r.data.synthesis, 'council: 3 เสียง + สังเคราะห์');
ok((await j('POST', '/api/council', {})).status === 400, 'ไม่มี topic → 400');

console.log('\n=== Affiliate + Sales/Clicks by Source + Tier ===');
ok((await j('POST', '/api/affiliate/apply', { name: 'E2E Tester', email: `${REF}@t.com`, ref_code: REF })).data?.success, `สมัคร ${REF}`);
await j('POST', '/api/affiliate/click', { ref: REF, source: 'tiktok' });
await j('POST', '/api/affiliate/click', { ref: REF, source: 'facebook' });
r = await j('POST', '/api/track/link', { url: 'openthai-ai.com/pay', source: 'TikTok!!', campaign: 'x', ref: REF });
ok(r.data?.link?.includes('utm_source=tiktok') && r.data.source === 'tiktok', 'track/link สร้าง UTM + sanitize');
await dealFrom(REF, 'tiktok'); await dealFrom(REF, 'tiktok'); await dealFrom(REF, 'facebook');
let st = (await j('GET', `/api/affiliate/stats/${REF}`)).data.data;
ok(st.total_sales === 3 && st.total_earned === 600, `3 ดีล · ค่าคอม ฿${st.total_earned}`);
ok(st.clicks_by_source.tiktok === 1 && st.clicks_by_source.facebook === 1, 'clicks_by_source ถูก');
ok(st.sales_by_source.tiktok === 2 && st.sales_by_source.facebook === 1, 'sales_by_source ถูก');
ok(st.earned_by_source.tiktok === 400 && st.earned_by_source.facebook === 200, 'earned_by_source ถูก');

console.log('\n=== Tier auto-promotion (ปิดเพิ่มจนครบ 10 ดีล → pro 30%) ===');
for (let i = 0; i < 7; i++) await dealFrom(REF, 'tiktok');  // รวมเป็น 10
st = (await j('GET', `/api/affiliate/stats/${REF}`)).data.data;
ok(st.tier === 'pro' && st.commission_rate === 0.30, `เลื่อนเป็น ${st.tier} ${Math.round(st.commission_rate * 100)}%`);

console.log('\n=== Leaderboard ===');
r = await j('GET', '/api/affiliate/leaderboard');
ok(r.data?.success && r.data.leaderboard.some(x => x.total_sales >= 10), 'leaderboard มีรายการ + จัดอันดับ');

console.log('\n=== Withdrawals ===');
ok((await j('POST', '/api/affiliate/withdraw', { ref_code: REF, promptpay: '123' })).status === 400, 'พร้อมเพย์ผิด → 400');
r = await j('POST', '/api/affiliate/withdraw', { ref_code: REF, promptpay: '0812345678' });
ok(r.data?.success && r.data.pending_balance === 0, 'ขอถอน → จองยอด, pending=0');
const wid = r.data.withdrawal.id;
ok((await j('POST', '/api/affiliate/withdrawals/admin/' + wid, { action: 'approve' }, { 'x-admin-key': ADMIN })).data?.withdrawal.status === 'approved', 'admin approve');
ok((await j('POST', '/api/affiliate/withdrawals/admin/' + wid, { action: 'paid' }, { 'x-admin-key': ADMIN })).data?.withdrawal.status === 'paid', 'admin paid');
ok((await j('GET', '/api/affiliate/withdrawals/admin')).status === 401, 'admin ไม่มี key → 401');

console.log('\n=== Scheduler ===');
const past = new Date(Date.now() - 60000).toISOString(), fut = new Date(Date.now() + 3600000).toISOString();
const sp = (await j('POST', '/api/scheduler/create', { platform: 'tiktok', content: 'x', scheduled_at: fut })).data;
await j('POST', '/api/scheduler/create', { platform: 'line', content: 'y', scheduled_at: past });
ok((await j('GET', '/api/scheduler/due')).data.count >= 1, 'due ตรวจตามเวลา');
r = await j('GET', '/api/scheduler/process');  // GET (Vercel Cron)
ok(r.data?.ok && r.data.processed >= 1, 'process (GET) ทำงาน');
ok((await j('DELETE', '/api/scheduler/' + sp.post.id)).data?.ok, 'ลบโพสต์');

console.log('\n=== Webhook signature guard ===');
const ev = JSON.stringify({ key: 'charge.complete', data: { id: 'x', paid: true, amount: 100 } });
ok((await j('POST', '/api/payment/webhook', ev, { 'x-omise-signature': 'bad' })).status === 401, 'ลายเซ็นปลอม → 401');

console.log(`\n${'='.repeat(50)}`);
console.log(`ผลทดสอบรวมระบบ: ✅ ${pass} ผ่าน · ❌ ${fail} ไม่ผ่าน`);
console.log('='.repeat(50));
process.exit(fail > 0 ? 1 : 0);
