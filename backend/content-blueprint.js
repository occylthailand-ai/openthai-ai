// Content Blueprint — พิมพ์เขียวโครงสร้างเนื้อหา 8 หมวด (Maslow + มิติดิจิทัล + 7 กลุ่มอุตสาหกรรม)
// อ่าน backend/data/content-blueprint.json → ตรวจโครงสร้าง → เสิร์ฟ browse/search/coverage/develop
// ใช้เป็นแผนที่พัฒนาต่อยอดคอนเทนต์ สกิล และหมวดสินค้าของแพลตฟอร์ม
// CLI คู่กัน: scripts/blueprint-tool.mjs (validate | stats | coverage | export)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const BLUEPRINT_FILE = join(__dirname, 'data', 'content-blueprint.json');

let _cache = null;

// ── โหลด + validate (cache ในหน่วยความจำ — ไฟล์เป็น static data) ────────────────
export function loadBlueprint({ force = false } = {}) {
  if (_cache && !force) return _cache;
  const raw = readFileSync(BLUEPRINT_FILE, 'utf8');
  const bp = JSON.parse(raw);
  const problems = validateBlueprint(bp);
  if (problems.length) {
    throw new Error(`content-blueprint.json invalid:\n- ${problems.join('\n- ')}`);
  }
  _cache = bp;
  return bp;
}

// ── ตรวจโครงสร้าง — คืน array ของปัญหา (ว่าง = ผ่าน) ────────────────────────────
export function validateBlueprint(bp) {
  const problems = [];
  if (!bp || typeof bp !== 'object') return ['root is not an object'];
  if (bp.meta?.id !== 'content-blueprint') problems.push('meta.id must be "content-blueprint"');
  if (typeof bp.meta?.version !== 'number') problems.push('meta.version must be a number');

  const levels = Array.isArray(bp.maslow_levels) ? bp.maslow_levels : [];
  if (levels.length !== 6) problems.push(`maslow_levels must have 6 levels (found ${levels.length})`);
  const levelIds = new Set();
  for (const lv of levels) {
    if (!/^L\d$/.test(lv.id || '')) problems.push(`maslow level id "${lv.id}" must match L<n>`);
    if (levelIds.has(lv.id)) problems.push(`duplicate maslow level id "${lv.id}"`);
    levelIds.add(lv.id);
    if (!lv.name_th || !lv.name_en) problems.push(`maslow level ${lv.id} missing name_th/name_en`);
  }

  const domains = Array.isArray(bp.domains) ? bp.domains : [];
  if (!domains.length) problems.push('domains must be a non-empty array');
  const seenIds = new Set();
  for (const d of domains) {
    if (!/^D\d+$/.test(d.id || '')) problems.push(`domain id "${d.id}" must match D<n>`);
    if (seenIds.has(d.id)) problems.push(`duplicate domain id "${d.id}"`);
    seenIds.add(d.id);
    if (!d.name_th || !d.name_en) problems.push(`domain ${d.id} missing name_th/name_en`);
    for (const m of d.maslow || []) {
      if (!levelIds.has(m)) problems.push(`domain ${d.id} references unknown maslow level "${m}"`);
    }
    for (const s of d.related_skills || []) {
      if (!/^S\d+$/.test(s)) problems.push(`domain ${d.id} related skill "${s}" must match S<n>`);
    }
    const sections = Array.isArray(d.sections) ? d.sections : [];
    if (!sections.length) problems.push(`domain ${d.id} has no sections`);
    for (const sec of sections) {
      if (!(sec.id || '').startsWith(`${d.id}.`)) problems.push(`section id "${sec.id}" must be prefixed by "${d.id}."`);
      if (seenIds.has(sec.id)) problems.push(`duplicate section id "${sec.id}"`);
      seenIds.add(sec.id);
      if (!sec.name_th || !sec.name_en) problems.push(`section ${sec.id} missing name_th/name_en`);
      const items = Array.isArray(sec.items) ? sec.items : [];
      if (!items.length) problems.push(`section ${sec.id} has no items`);
      for (const it of items) {
        if (!it.th) problems.push(`section ${sec.id} has an item without "th" text`);
      }
    }
  }
  return problems;
}

// ── สถิติรวม — ใช้ทั้ง API overview และ CLI ──────────────────────────────────────
export function blueprintStats(bp) {
  const sections = bp.domains.reduce((n, d) => n + d.sections.length, 0);
  const items = bp.domains.reduce((n, d) => n + d.sections.reduce((m, s) => m + s.items.length, 0), 0);
  return {
    maslow_levels: bp.maslow_levels.length,
    domains: bp.domains.length,
    sections,
    items,
    version: bp.meta.version,
  };
}

// ── ค้นหา node ตาม id — domain (D2), section (D2.1) หรือขั้น Maslow (L1) ────────
export function findNode(bp, id) {
  const lv = bp.maslow_levels.find((l) => l.id === id);
  if (lv) return { type: 'maslow', node: lv, breadcrumb: [{ id: lv.id, name_th: lv.name_th }] };
  for (const d of bp.domains) {
    if (d.id === id) {
      const { sections, ...rest } = d;
      return {
        type: 'domain',
        node: { ...rest, sections: sections.map((s) => ({ id: s.id, name_th: s.name_th, name_en: s.name_en, item_count: s.items.length })) },
        breadcrumb: [{ id: d.id, name_th: d.name_th }],
      };
    }
    const sec = d.sections.find((s) => s.id === id);
    if (sec) {
      return {
        type: 'section',
        node: { ...sec, domain_id: d.id, maslow: d.maslow },
        breadcrumb: [{ id: d.id, name_th: d.name_th }, { id: sec.id, name_th: sec.name_th }],
      };
    }
  }
  return null;
}

// ── ค้นหาคำ (ไทย/อังกฤษ ไม่สนตัวพิมพ์) ทั่วทั้งพิมพ์เขียว ─────────────────────────
export function searchBlueprint(bp, q, limit = 30) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return [];
  const hit = (s) => (s || '').toLowerCase().includes(needle);
  const results = [];
  for (const lv of bp.maslow_levels) {
    if (hit(lv.name_th) || hit(lv.name_en) || (lv.items_th || []).some(hit) || (lv.digital_th || []).some(hit)) {
      results.push({ id: lv.id, type: 'maslow', name_th: lv.name_th, name_en: lv.name_en });
    }
  }
  for (const d of bp.domains) {
    if (hit(d.name_th) || hit(d.name_en)) {
      results.push({ id: d.id, type: 'domain', name_th: d.name_th, name_en: d.name_en });
    }
    for (const sec of d.sections) {
      const itemHits = sec.items.filter((it) => hit(it.th) || hit(it.en));
      if (hit(sec.name_th) || hit(sec.name_en) || itemHits.length) {
        results.push({
          id: sec.id,
          type: 'section',
          domain_id: d.id,
          name_th: sec.name_th,
          name_en: sec.name_en,
          matched_items: itemHits.slice(0, 3).map((it) => it.th),
        });
      }
      if (results.length >= limit) return results.slice(0, limit);
    }
  }
  return results.slice(0, limit);
}

// ── Coverage — เทียบแต่ละหมวดกับ SKILLS_REGISTRY จริง → covered/partial/gap ──────
export function computeCoverage(bp, skillsRegistry = []) {
  const byId = new Map(skillsRegistry.map((s) => [s.id, s]));
  const domains = bp.domains.map((d) => {
    const skills = (d.related_skills || []).map((id) => {
      const s = byId.get(id);
      return s
        ? { id, name: s.name, status: s.status, found: true }
        : { id, name: null, status: 'unknown', found: false };
    });
    const activeCount = skills.filter((s) => s.found && s.status === 'active').length;
    const status = activeCount >= 3 ? 'covered' : activeCount >= 1 ? 'partial' : 'gap';
    return {
      id: d.id,
      icon: d.icon,
      name_th: d.name_th,
      name_en: d.name_en,
      maslow: d.maslow,
      status,
      active_skills: activeCount,
      skills,
      routes: d.routes || [],
      next_steps_th: d.development?.next_steps_th || [],
    };
  });
  const summary = {
    covered: domains.filter((d) => d.status === 'covered').length,
    partial: domains.filter((d) => d.status === 'partial').length,
    gap: domains.filter((d) => d.status === 'gap').length,
  };
  return { summary, domains };
}

// ── Mock brief — ใช้เมื่อไม่มี AI key หรือ AI ล้มเหลว (สร้างจากข้อมูลจริงใน node) ──
function mockDevelopBrief(bp, found, goal) {
  const node = found.node;
  const domain = found.type === 'section' ? bp.domains.find((d) => d.id === node.domain_id) : node;
  const items = found.type === 'section' ? node.items : (domain.sections?.[0]?.items || []);
  const itemNames = (items || []).slice(0, 3).map((it) => (typeof it === 'object' ? it.th : it));
  return {
    node_id: node.id,
    title_th: node.name_th,
    goal: goal || 'พัฒนาต่อยอดบนแพลตฟอร์ม OpenThaiAi',
    content_ideas: itemNames.map((t) => `คอนเทนต์ให้ความรู้: ${t} สำหรับผู้ประกอบการไทย`),
    skill_suggestions: (domain?.related_skills?.length
      ? [`ต่อยอดสกิลเดิม: ${domain.related_skills.join(', ')}`]
      : ['ยังไม่มีสกิลรองรับหมวดนี้ — เป็นโอกาสสร้างสกิลใหม่']),
    catalog_categories: [`หมวดสินค้า/บริการที่เกี่ยวข้องกับ ${node.name_th}`],
    first_action: domain?.development?.next_steps_th?.[0] || `เริ่มจากคอนเทนต์แนะนำ ${node.name_th} 1 ชิ้น`,
  };
}

// ── ลงทะเบียน routes ทั้งหมด — เรียกจาก server.js หลังประกาศ limiter/callAI ───────
export function registerBlueprintRoutes(app, { limiter, getSkillsRegistry, callAI, parseAIJson, addLog }) {
  const bp = loadBlueprint();
  const pass = (req, res, next) => next();
  const lim = limiter || pass;
  const warn = addLog || (() => {});

  // ภาพรวม: meta + สถิติ + สรุปหมวด + สรุป coverage
  app.get('/api/blueprint', lim, (req, res) => {
    const coverage = computeCoverage(bp, getSkillsRegistry());
    res.json({
      success: true,
      meta: bp.meta,
      stats: blueprintStats(bp),
      maslow_levels: bp.maslow_levels.map((l) => ({ id: l.id, name_th: l.name_th, name_en: l.name_en })),
      domains: coverage.domains.map(({ skills, next_steps_th, ...d }) => d),
      coverage_summary: coverage.summary,
      ts: new Date().toISOString(),
    });
  });

  // โครงสร้างเต็ม (หรือเฉพาะหมวดด้วย ?domain=D2)
  app.get('/api/blueprint/tree', lim, (req, res) => {
    const domainId = (req.query.domain || '').trim();
    if (domainId) {
      const d = bp.domains.find((x) => x.id === domainId);
      if (!d) return res.status(404).json({ success: false, error: `ไม่พบหมวด ${domainId}` });
      return res.json({ success: true, domain: d });
    }
    res.json({ success: true, meta: bp.meta, maslow_levels: bp.maslow_levels, maslow_notes: bp.maslow_notes, domains: bp.domains });
  });

  // รายละเอียด node เดียว + breadcrumb
  app.get('/api/blueprint/node/:id', lim, (req, res) => {
    const found = findNode(bp, req.params.id);
    if (!found) return res.status(404).json({ success: false, error: `ไม่พบ node ${req.params.id}` });
    res.json({ success: true, ...found });
  });

  // ค้นหาไทย/อังกฤษ
  app.get('/api/blueprint/search', lim, (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ success: false, error: 'ต้องระบุคำค้น ?q=' });
    const results = searchBlueprint(bp, q);
    res.json({ success: true, q, count: results.length, results });
  });

  // Coverage เต็ม — จุดตั้งต้นของ "พัฒนาต่อยอด": หมวดไหนมีสกิลรองรับแล้ว หมวดไหนยังว่าง
  app.get('/api/blueprint/coverage', lim, (req, res) => {
    const coverage = computeCoverage(bp, getSkillsRegistry());
    res.json({ success: true, ...coverage, ts: new Date().toISOString() });
  });

  // AI development brief ต่อ node — ล้มเหลว/ไม่มี key → mock จากข้อมูลจริง (ไม่มีวัน 500)
  app.post('/api/blueprint/develop', lim, async (req, res) => {
    const { node_id, goal } = req.body || {};
    if (!node_id?.trim()) return res.status(400).json({ success: false, error: 'node_id required' });
    const found = findNode(bp, node_id.trim());
    if (!found) return res.status(404).json({ success: false, error: `ไม่พบ node ${node_id}` });

    const node = found.node;
    const itemsText = found.type === 'section'
      ? node.items.map((it) => `- ${it.th}`).join('\n')
      : (node.sections || []).map((s) => `- ${s.name_th}`).join('\n');
    const prompt = `คุณเป็นที่ปรึกษาพัฒนาแพลตฟอร์ม OpenThaiAi (AI คอนเทนต์+คอมเมิร์ซสำหรับผู้ประกอบการไทย)
จากหัวข้อในพิมพ์เขียวเนื้อหา:
หัวข้อ: ${node.name_th} (${node.name_en || node.id})
รายละเอียด:
${itemsText}
เป้าหมายผู้ใช้: ${goal || 'พัฒนาต่อยอดบนแพลตฟอร์ม'}
ตอบกลับ JSON เท่านั้น (ภาษาไทย):
{"content_ideas":["ไอเดียคอนเทนต์ 3 ข้อ"],"skill_suggestions":["สกิล AI ที่ควรสร้าง/ต่อยอด"],"catalog_categories":["หมวดสินค้า/บริการที่ควรเปิด"],"first_action":"สิ่งแรกที่ควรทำ 1 ประโยค"}`;
    if (callAI && parseAIJson) {
      try {
        const text = await callAI(prompt);
        const d = parseAIJson(text);
        return res.json({ success: true, source: 'ai', node_id: node.id, title_th: node.name_th, goal: goal || null, ...d });
      } catch (e) {
        warn('warn', 'Blueprint/Develop', e.message);
      }
    }
    res.json({ success: true, source: 'mock', ...mockDevelopBrief(bp, found, goal) });
  });
}
