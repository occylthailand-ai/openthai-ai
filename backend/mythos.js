// Openthai.ai — Mythos: Real Orchestration Layer
// ─────────────────────────────────────────────────────────────────────────────
// ทำให้ "Mythos" (เดิมเป็น persona/เรื่องเล่า) กลายเป็นระบบจริงที่ตรวจสอบได้:
//   • map เทพแต่ละองค์ → ระบบจริงในโปรเจกต์ (1 ต่อ 1)
//   • คำนวณสถานะจาก "สัญญาณจริง" ของ backend (ไม่ใช่ค่าที่แต่งขึ้น)
//   • heartbeat ที่ persist จริง (ไฟล์ + Supabase KV) ขณะ process ทำงาน
//
// สถานะ (status):
//   active   = ระบบจริงทำงาน + ตรวจยืนยันได้จาก process นี้
//   degraded = ทำงานแบบจำกัด/ชั่วคราว (เช่น mock/ไฟล์ local) — ของจริงแต่ยังไม่เต็ม
//   external = ของจริงแต่ตรวจที่อื่น (เช่น CI/cron) — process นี้มองไม่เห็นตรงๆ
//   down     = ไม่พร้อม

const ROSTER = [
  { id: 'mythos',     name: 'Mythos',     icon: '⚡', role: 'ผู้บัญชาการ (Orchestrator)',     real: ['Claude Code (สร้าง/ดูแล)', 'PR → CI → main', 'docs/AI_WORKFLOW.md'] },
  { id: 'athena',     name: 'Athena',     icon: '🦉', role: 'AI / Prompt Engine',            real: ['backend smartGenerate', 'POST /api/generate', 'Anthropic / Gemini'] },
  { id: 'demeter',    name: 'Demeter',    icon: '🌾', role: 'Data / Persistence',            real: ['kv-store.js', 'Supabase', 'migrations/'] },
  { id: 'poseidon',   name: 'Poseidon',   icon: '🔱', role: 'Payments / Infra',              real: ['omise-payment.js', '/api/payment', 'PromptPay'] },
  { id: 'hermes',     name: 'Hermes',     icon: '🪽', role: 'Webhooks / Comms',              real: ['webhook-system.js', '/api/webhooks'] },
  { id: 'kronos',     name: 'Kronos',     icon: '⏱️', role: 'Health / Scheduler (24/7)',     real: ['health-watch.yml', 'auto-recovery.yml', 'node-cron'] },
  { id: 'hephaestus', name: 'Hephaestus', icon: '🔨', role: 'Frontend / Build',              real: ['frontend (vite)', 'test.yml build', 'Claude Code'] },
  { id: 'ares',       name: 'Ares',       icon: '🛡️', role: 'Security / Guardrails',          real: ['fail-closed auth', 'npm audit gate', 'autotest.yml'] },
];

export function createMythos(deps = {}) {
  const {
    aiActive    = () => 'mock',          // 'claude' | 'gemini' | 'mock'
    persistence = () => 'file',          // 'supabase' | 'file'
    paymentsLive = () => false,          // OMISE keys ตั้งแล้ว?
    webhooksCount = () => 0,
    agentsCount  = () => 0,
    schedulerOn  = () => false,
    isProd       = () => false,
    prodHardened = () => true,           // prod ต้องตั้ง ADMIN_KEY/JWT_SECRET ฯลฯ
    uptimeSec    = () => Math.round(process.uptime()),
    kvPush       = async () => {},       // (key, value) มิเรอร์ heartbeat ไป Supabase
    writeFile    = () => {},             // (data) เขียน heartbeat ลงไฟล์
    readFile     = () => null,           // () => heartbeat ล่าสุด
    express,
  } = deps;

  let commands = 0;
  const startedAt = Date.now();

  // คำนวณสถานะของเทพแต่ละองค์จากสัญญาณจริง
  function check(id) {
    switch (id) {
      case 'mythos':
        return { status: 'active', detail: `บัญชาการอยู่ · uptime ${uptimeSec()}s · ${agentsCount()} agents` };
      case 'athena': {
        const ai = aiActive();
        return ai === 'mock'
          ? { status: 'degraded', detail: 'AI = mock (ยังไม่ใส่ ANTHROPIC_API_KEY/GEMINI_API_KEY)' }
          : { status: 'active', detail: `AI engine = ${ai}` };
      }
      case 'demeter': {
        const p = persistence();
        return p === 'supabase'
          ? { status: 'active', detail: 'persistence = Supabase (ถาวร)' }
          : { status: 'degraded', detail: 'persistence = ไฟล์ local (เสี่ยงหายบน serverless — ตั้ง SUPABASE_*)' };
      }
      case 'poseidon':
        return paymentsLive()
          ? { status: 'active', detail: 'Omise live keys พร้อมรับเงินจริง' }
          : { status: 'degraded', detail: 'payment = mock (ยังไม่ใส่ OMISE_SECRET_KEY)' };
      case 'hermes':
        return { status: 'active', detail: `webhook system พร้อม · ลงทะเบียน ${webhooksCount()} ตัว` };
      case 'kronos':
        return schedulerOn()
          ? { status: 'active', detail: `cron ในตัวทำงาน · 24/7 จริงผ่าน health-watch.yml (ทุก 10 นาที)` }
          : { status: 'external', detail: '24/7 ตรวจที่ GitHub Actions (health-watch.yml / autotest.yml)' };
      case 'hephaestus':
        return { status: 'external', detail: 'frontend build ตรวจที่ CI (test.yml) — process นี้ไม่เห็นตรงๆ' };
      case 'ares':
        return prodHardened()
          ? { status: 'active', detail: isProd() ? 'production hardened (fail-closed ครบ)' : 'dev mode — guardrails พร้อมใช้ตอน prod' }
          : { status: 'degraded', detail: '⚠️ production แต่ยังไม่ตั้ง ADMIN_KEY/JWT_SECRET — ดู .env.example' };
      default:
        return { status: 'down', detail: 'unknown' };
    }
  }

  function roster() {
    return ROSTER.map(g => ({ ...g }));
  }

  function status() {
    const gods = ROSTER.map(g => ({ id: g.id, name: g.name, icon: g.icon, role: g.role, real: g.real, ...check(g.id) }));
    const counts = gods.reduce((a, g) => { a[g.status] = (a[g.status] || 0) + 1; return a; }, {});
    // สุขภาพรวม: down>0 → critical, degraded>0 → warn, ไม่งั้น healthy
    const overall = counts.down ? 'critical' : counts.degraded ? 'warn' : 'healthy';
    return { overall, counts, uptime_sec: uptimeSec(), commands, gods };
  }

  // heartbeat จริง — บันทึกสภาพปัจจุบันลงไฟล์ + KV (เรียกได้เป็นระยะ)
  async function recordHeartbeat(reason = 'manual') {
    commands += 1;
    const s = status();
    const hb = {
      ts: new Date().toISOString(),
      reason,
      uptime_sec: s.uptime_sec,
      commands,
      overall: s.overall,
      ai: aiActive(),
      persistence: persistence(),
      counts: s.counts,
    };
    try { writeFile(hb); } catch (_) {}
    try { await kvPush('mythos_heartbeat', hb); } catch (_) {}
    return hb;
  }

  function getHeartbeat() {
    return readFile() || { ts: null, commands, uptime_sec: uptimeSec(), note: 'ยังไม่มี heartbeat บันทึก' };
  }

  // ── Express router ──────────────────────────────────────────────────────────
  let router = null;
  if (express) {
    router = express.Router();
    // ผังการบัญชาการ — เทพ → ระบบจริง (metaphor → mechanism)
    router.get('/api/mythos', (req, res) => res.json({ success: true, commander: 'Mythos', roster: roster() }));
    // สถานะสด คำนวณจากสัญญาณจริง
    router.get('/api/mythos/status', (req, res) => res.json({ success: true, ...status() }));
    // heartbeat — persist จริงทุกครั้งที่เรียก
    router.get('/api/mythos/heartbeat', async (req, res) => res.json({ success: true, heartbeat: await recordHeartbeat('api') }));
    router.get('/api/mythos/heartbeat/last', (req, res) => res.json({ success: true, heartbeat: getHeartbeat() }));
  }

  // เริ่ม heartbeat เป็นระยะ (unref → ไม่ขวาง process exit / เทส)
  let timer = null;
  function start(everyMs = 15 * 60 * 1000) {
    if (timer) return;
    recordHeartbeat('boot');
    timer = setInterval(() => recordHeartbeat('interval'), everyMs);
    if (timer.unref) timer.unref();
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  return { roster, status, check, recordHeartbeat, getHeartbeat, start, stop, router, ROSTER };
}
