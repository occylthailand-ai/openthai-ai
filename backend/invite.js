// Openthai.ai — Invite Program (โปรแกรมเชิญชวนลูกค้าสำเร็จรูป อัตโนมัติ)
// ─────────────────────────────────────────────────────────────────────────────
// ลูกค้าทุกคนได้ "โค้ดเชิญ" + ลิงก์ ?invite=CODE → แชร์ให้เพื่อน →
// เพื่อนซื้อสำเร็จ → ผู้ชวนได้ "เครดิต" อัตโนมัติ (ผ่าน credits.grant) + เพื่อนได้สิทธิ์ต้อนรับ
//
// ต่อยอดจาก attribution: เรียก reward() ตอนจ่ายเงินสำเร็จ (finalizePaid) เหมือน affiliate
// แตกต่าง: affiliate = พาร์ตเนอร์ (คอมมิชชั่น %) · invite = ลูกค้าชวนลูกค้า (เครดิต)

const code6 = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export function createInvite(deps = {}) {
  const {
    grantCredits = async () => ({}),           // (identity, amount, source) → grant เครดิตจริง
    rewardCredits = parseInt(process.env.INVITE_REWARD_CREDITS || '10', 10),
    baseUrl = process.env.FRONTEND_URL || 'https://www.openthai-ai.com',
    kvPush = async () => {},
    writeFile = () => {},
    readFile = () => null,
    addLog = () => {},
    express,
  } = deps;

  // store: { codes: { EMAIL: CODE }, byCode: { CODE: EMAIL }, referrals: [] }
  const store = readFile() || { codes: {}, byCode: {}, referrals: [] };
  store.codes = store.codes || {}; store.byCode = store.byCode || {}; store.referrals = store.referrals || [];
  const save = () => { try { writeFile(store); } catch (_) {} try { kvPush('invite_program', store); } catch (_) {} };

  const norm = (e) => String(e || '').trim().toLowerCase();

  // ออก/คืนโค้ดเชิญของลูกค้า 1 คน (idempotent)
  function getOrCreate(email) {
    const id = norm(email);
    if (!id || !id.includes('@')) return { ok: false, error: 'ต้องการอีเมล' };
    let code = store.codes[id];
    if (!code) {
      do { code = code6(); } while (store.byCode[code]);
      store.codes[id] = code; store.byCode[code] = id; save();
    }
    return { ok: true, code, link: `${baseUrl}/?invite=${code}`, reward_per_invite: rewardCredits };
  }

  function ownerOf(code) { return store.byCode[String(code || '').toUpperCase()] || null; }

  function statusOf(code) {
    const c = String(code || '').toUpperCase();
    const owner = ownerOf(c);
    if (!owner) return { ok: false, error: 'ไม่พบโค้ดเชิญ' };
    const mine = store.referrals.filter(r => r.code === c);
    return {
      ok: true, code: c, owner_masked: owner.replace(/(.).+(@.*)/, '$1***$2'),
      invited_converted: mine.length,
      credits_earned: mine.reduce((s, r) => s + (r.reward || 0), 0),
      recent: mine.slice(0, 10),
    };
  }

  // ให้รางวัลเมื่อเพื่อนที่ถูกเชิญ "ซื้อสำเร็จ" (เรียกจาก checkout finalizePaid)
  async function reward(code, { order_id, amount = 0, customer_name = '' } = {}) {
    const c = String(code || '').toUpperCase();
    const owner = ownerOf(c);
    if (!owner) { addLog('warn', 'Invite', `code ไม่พบ: ${c}`); return null; }
    if (store.referrals.find(r => r.order_id === order_id)) return null; // กันซ้ำ
    const first = store.referrals.length === 0;
    let grant = {};
    try { grant = await grantCredits(owner, rewardCredits, `invite:${order_id}`) || {}; } catch (e) { addLog('warn', 'Invite', `grant fail: ${e.message}`); }
    const ref = {
      id: `inv_${Date.now()}_${code6().toLowerCase()}`,
      code: c, inviter: owner, order_id, amount: Number(amount) || 0,
      customer_name, reward: rewardCredits, balance_after: grant.balance ?? null,
      first_ever: first, at: new Date().toISOString(),
    };
    store.referrals.unshift(ref); save();
    addLog('info', 'Invite', `${first ? '🎉 FIRST ' : ''}invite reward: ${c} +${rewardCredits} เครดิต (order ${order_id})`);
    return ref;
  }

  function leaderboard(limit = 10) {
    const tally = {};
    for (const r of store.referrals) {
      tally[r.code] = tally[r.code] || { code: r.code, inviter_masked: r.inviter.replace(/(.).+(@.*)/, '$1***$2'), invites: 0, credits: 0 };
      tally[r.code].invites += 1; tally[r.code].credits += r.reward || 0;
    }
    return Object.values(tally).sort((a, b) => b.invites - a.invites).slice(0, limit);
  }

  function summary() {
    return {
      total_codes: Object.keys(store.codes).length,
      total_conversions: store.referrals.length,
      total_credits_rewarded: store.referrals.reduce((s, r) => s + (r.reward || 0), 0),
      first_referral: store.referrals.length ? store.referrals[store.referrals.length - 1] : null,
      reward_per_invite: rewardCredits,
    };
  }

  let router = null;
  if (express) {
    router = express.Router();
    // ขอ/ดูลิงก์เชิญของตัวเอง
    router.post('/api/invite/create', (req, res) => {
      const r = getOrCreate(req.body?.email);
      return r.ok ? res.json({ success: true, ...r }) : res.status(400).json({ success: false, error: r.error });
    });
    // สถานะโค้ด (ชวนไปกี่คน ได้กี่เครดิต)
    router.get('/api/invite/status/:code', (req, res) => {
      const s = statusOf(req.params.code);
      return s.ok ? res.json({ success: true, ...s }) : res.status(404).json({ success: false, error: s.error });
    });
    router.get('/api/invite/leaderboard', (req, res) => res.json({ success: true, leaderboard: leaderboard() }));
    router.get('/api/invite/summary', (req, res) => res.json({ success: true, ...summary() }));
  }

  return { getOrCreate, ownerOf, statusOf, reward, leaderboard, summary, router };
}
