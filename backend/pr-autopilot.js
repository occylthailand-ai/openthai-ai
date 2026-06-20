// Openthai.ai — PR Autopilot
// ─────────────────────────────────────────────────────────────────────────────
// โปรแกรมผลิตสื่อประชาสัมพันธ์อัตโนมัติ "วันเว้นวัน" (every-other-day)
// ดึงสัญญาณจากแพลตฟอร์มเราเอง → ผลิตคอนเทนต์ตามยุคสมัย → ลงปฏิทินคอนเทนต์
//
// สัญญาณ (platform updates): สินค้าใหม่ในคลัง · press release ล่าสุด · เวอร์ชัน ·
//   สุขภาพระบบ (Mythos) · trending hashtags + ข่าว (ยุคสมัย)
// Engine: ใช้ smartGenerate ตัวเดียวกับเว็บ/แอป (Athena) — สูตรเดียวกัน
//
// รัน: cron รายวัน 09:00 แต่ "ลงมือเฉพาะวันคู่ของ epoch" = วันเว้นวันจริง
//      (POST /api/pr/autopilot/run เพื่อสั่งเดี๋ยวนั้น — admin)

const PILLARS = [
  { id: 'thai_first', style: 'entertainment', angle: 'ชูความเป็นไทยแท้ เข้าใจการขายแบบไทย (ตลาดนัด/ไลฟ์/OTOP)' },
  { id: 'learning',   style: 'educational',   angle: 'ชู AI Critic + Learning Layer — สอนให้ขายเป็น ไม่ใช่แค่สร้างเสร็จ' },
  { id: 'all_in_one', style: 'sales',         angle: 'ชูครบวงจร สร้าง→ขาย→เก็บเงิน + ราคาเข้าถึงได้' },
];

const epochDay = (ts = Date.now()) => Math.floor(ts / 86_400_000);

export function createPRAutopilot(deps = {}) {
  const {
    generate     = async () => ({ hook: '', script: [], caption: '', hashtags: [], criticScore: '' }),
    listProducts = async () => [],
    getReleases  = () => [],
    getTrending  = async () => [],
    version      = '1.0.0',
    postsPerCycle = parseInt(process.env.PR_AUTOPILOT_POSTS || '3', 10),
    keepCalendar = 120,
    kvPush       = async () => {},
    writeFile    = () => {},
    readFile     = () => null,
    adminCheck   = () => false,
    addLog       = () => {},
    express,
  } = deps;

  // ── 1) เก็บสัญญาณจากแพลตฟอร์ม ───────────────────────────────────────────────
  async function collectSignals() {
    let products = [];
    try { products = (await listProducts()) || []; } catch (_) {}
    const active = products.filter(p => (p.status ? p.status === 'active' : true));
    // สินค้าใหม่ล่าสุด (เรียงตาม updated_at/created ถ้ามี ไม่งั้นเอาท้าย ๆ)
    const newest = [...active].sort((a, b) =>
      String(b.updated_at || b.id).localeCompare(String(a.updated_at || a.id))).slice(0, 5);
    let trending = [];
    try { trending = (await getTrending()) || []; } catch (_) {}
    const releases = (getReleases() || []).filter(r => r.status === 'published');
    return {
      version,
      product_count: active.length,
      newest_products: newest,
      latest_release: releases[0] || null,
      trending: trending.slice(0, 8),
      month: new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
    };
  }

  // ── 2) วางแผนหัวข้อรอบนี้ (หมุน pillar + ดันสินค้าใหม่ + มุมยุคสมัย) ───────────
  function planTopics(signals, cycle = epochDay()) {
    const topics = [];
    const newest = signals.newest_products || [];
    for (let i = 0; i < postsPerCycle; i++) {
      const pillar = PILLARS[(cycle + i) % PILLARS.length];
      const product = newest.length ? newest[(cycle + i) % newest.length] : null;
      topics.push({
        pillar: pillar.id,
        style: pillar.style,
        angle: pillar.angle,
        product: product ? product.name : 'Openthai.ai',
        category: product ? (product.category || 'ทั่วไป') : 'แพลตฟอร์ม AI',
        price: product && product.price ? `${product.price} บาท` : '',
        is_feature: !!product,
        era_tags: signals.trending || [],
        month: signals.month,
      });
    }
    return topics;
  }

  // ── 3) ผลิตคอนเทนต์ผ่าน engine กลาง แล้วลงปฏิทิน ──────────────────────────────
  async function produce(reason = 'manual') {
    const signals = await collectSignals();
    const topics = planTopics(signals);
    const now = Date.now();
    const items = [];
    for (let i = 0; i < topics.length; i++) {
      const t = topics[i];
      let gen = {};
      try {
        gen = await generate({
          product: t.product, category: t.category, platform: 'TikTok',
          style: t.style, lang: 'ภาษาไทย', price: t.price,
          audience: 'ผู้ประกอบการ/แม่ค้าออนไลน์ไทย',
        }) || {};
      } catch (e) { addLog('warn', 'PRAutopilot', `generate fail: ${e.message}`); }
      const eraTags = (t.era_tags || []).filter(Boolean).slice(0, 4);
      items.push({
        id: `pra_${now}_${i}`,
        created_at: new Date(now).toISOString(),
        scheduled_for: new Date(now + i * 6 * 3600_000).toISOString(), // กระจายในวัน
        status: 'planned',
        pillar: t.pillar,
        angle: t.angle,
        feature: t.is_feature ? t.product : null,
        platform: 'TikTok/Facebook',
        hook: gen.hook || '',
        caption: gen.caption || '',
        hashtags: [...(gen.hashtags || []), ...eraTags].slice(0, 14),
        critic_score: gen.criticScore || '',
        engine_source: gen.source || 'unknown',
      });
    }
    const cal = loadCalendar();
    const updated = { runs: (cal.runs || 0) + 1, last_run: new Date(now).toISOString(),
      last_reason: reason, version: signals.version, items: [...items, ...(cal.items || [])].slice(0, keepCalendar) };
    saveCalendar(updated);
    try { await kvPush('pr_content_calendar', updated); } catch (_) {}
    addLog('info', 'PRAutopilot', `ผลิต ${items.length} ชิ้น (${reason}) · v${signals.version} · สินค้า ${signals.product_count}`);
    return { produced: items.length, reason, signals_summary: { products: signals.product_count, trending: signals.trending.length }, items };
  }

  function loadCalendar() { return readFile() || { runs: 0, items: [] }; }
  function saveCalendar(data) { try { writeFile(data); } catch (_) {} }

  // วันเว้นวัน: ลงมือเฉพาะวันคู่ของ epoch
  function shouldRunToday(ts = Date.now()) { return epochDay(ts) % 2 === 0; }

  function status() {
    const cal = loadCalendar();
    return {
      enabled: true,
      cadence: 'every-other-day (วันเว้นวัน)',
      posts_per_cycle: postsPerCycle,
      runs: cal.runs || 0,
      last_run: cal.last_run || null,
      runs_today: shouldRunToday(),
      upcoming: (cal.items || []).filter(i => i.status === 'planned').slice(0, postsPerCycle),
      total_in_calendar: (cal.items || []).length,
    };
  }

  // ── Express router ──────────────────────────────────────────────────────────
  let router = null;
  if (express) {
    router = express.Router();
    router.get('/api/pr/autopilot', (req, res) => res.json({ success: true, ...status() }));
    router.get('/api/pr/autopilot/calendar', (req, res) =>
      res.json({ success: true, items: (loadCalendar().items || []).slice(0, 50) }));
    router.post('/api/pr/autopilot/run', async (req, res) => {
      if (!adminCheck(req)) return res.status(401).json({ success: false, message: 'ต้องการ Admin Key' });
      res.json({ success: true, result: await produce('manual-api') });
    });
  }

  // ── Cron: รายวัน 09:00 แต่ลงมือเฉพาะวันคู่ (= วันเว้นวัน) ────────────────────
  let task = null;
  function start(cronLib) {
    if (task || !cronLib) return;
    task = cronLib.schedule('0 9 * * *', async () => {
      if (!shouldRunToday()) return;
      try { await produce('cron'); } catch (e) { addLog('error', 'PRAutopilot', e.message); }
    });
    addLog('info', 'PRAutopilot', 'ตั้งเวลาผลิตสื่ออัตโนมัติแล้ว — วันเว้นวัน 09:00');
  }
  function stop() { if (task) { task.stop(); task = null; } }

  return { collectSignals, planTopics, produce, status, shouldRunToday, start, stop, router };
}
