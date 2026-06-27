// Smoke test — boots the server and asserts every skill in /api/skills returns 200.
// Run: node scripts/smoke-skills.mjs   (no external deps; uses mock AI fallback)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.SMOKE_PORT || '5610';
const BASE = `http://localhost:${PORT}`;

// ตัวอย่าง input ครอบคลุมทุก field ที่ skills อาจต้องการ (required fields ของทุก endpoint)
const SAMPLE = {
  product: 'น้ำพริกเผาทดสอบ', message: 'สินค้าดีไหมคะ ราคาเท่าไหร่', text: 'สินค้าดีมากแนะนำเลย',
  situation: 'อยากขยายธุรกิจ', problem: 'ลูกค้าสนใจแต่ไม่ปิดการขาย', context: 'งบจำกัด', goal: 'ยอดขาย', usp: 'อร่อย สะอาด ปลอดภัย', category: 'OTOP',
  conflict: 'หุ้นส่วนเห็นไม่ตรงกันเรื่องแบ่งกำไร', parties: 'หุ้นส่วน A, หุ้นส่วน B',
  price: 120, cost: 45, unit_cost: 45, fixed_costs: 8000, budget: 10000, competitor_price: 150,
  monthly_volume: 200, sourcing: 'ผสม', platforms: 'TikTok, Facebook', from: 'ภาษาไทย', to: 'English',
  channel: 'แชท', technique: 'role', review: 'ของดีมากแต่ส่งช้าไปหน่อยค่ะ', rating: 4,
};

// DISABLE_RATE_LIMIT ให้ทดสอบทุก skill ติดต่อกันได้ (production ไม่ตั้ง flag นี้)
const server = spawn('node', ['server.js'], { cwd: join(__dirname, '..'), env: { ...process.env, PORT, DISABLE_RATE_LIMIT: '1' }, stdio: ['ignore', 'ignore', 'inherit'] });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;

async function main() {
  // wait for server
  for (let i = 0; i < 30; i++) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) break; } catch { /* not up yet */ }
    await sleep(300);
  }

  const reg = await fetch(`${BASE}/api/skills`).then(r => r.json());
  if (!reg.success) { console.error('❌ /api/skills failed'); failures++; finish(); return; }

  // ทดสอบ Skills Hub (endpoint ใต้ /api/skills/*) — core S1–S8 ใช้ image/key/credits จึง skip
  const hub = reg.skills.filter(s => s.endpoint.startsWith('/api/skills/'));
  const skipped = reg.skills.length - hub.length;
  console.log(`\n🔎 Smoke testing ${hub.length} hub skills (engine: ${reg.ai_engine}) · skip core ${skipped}\n`);

  for (const s of hub) {
    try {
      const res = s.method === 'GET'
        ? await fetch(BASE + s.endpoint)
        : await fetch(BASE + s.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(SAMPLE) });
      const d = await res.json().catch(() => ({}));
      const ok = res.status === 200 && d.success !== false;
      const tolerated = s.status === 'needs_key' && res.status >= 400; // ต้องการ API key → ยอมรับ error ได้
      if (ok || tolerated) {
        console.log(`✅ ${s.id.padEnd(4)} ${s.name.padEnd(24)} ${res.status} (${d.source || (tolerated ? 'needs_key' : 'ok')})`);
      } else {
        console.log(`❌ ${s.id.padEnd(4)} ${s.name.padEnd(24)} HTTP ${res.status} ${d.error || ''}`);
        failures++;
      }
    } catch (e) {
      console.log(`❌ ${s.id.padEnd(4)} ${s.name.padEnd(24)} ERROR ${e.message}`);
      failures++;
    }
  }
  finish();
}

function finish() {
  server.kill();
  console.log(`\n${failures === 0 ? '✅ ALL PASSED' : `❌ ${failures} FAILED`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); finish(); });
