import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEPARTMENT_TOOL_BUILDER_FILE = join(__dirname, 'data', 'department-tool-builder.json');

let _cache = null;

export function loadDepartmentToolBuilder({ force = false } = {}) {
  if (_cache && !force) return _cache;
  const raw = readFileSync(DEPARTMENT_TOOL_BUILDER_FILE, 'utf8');
  const data = JSON.parse(raw);
  const problems = validateDepartmentToolBuilder(data);
  if (problems.length) {
    throw new Error(`department-tool-builder.json invalid:\n- ${problems.join('\n- ')}`);
  }
  _cache = data;
  return data;
}

export function validateDepartmentToolBuilder(data) {
  const problems = [];
  if (!data || typeof data !== 'object') return ['root is not an object'];
  if (data.meta?.id !== 'department-tool-builder') problems.push('meta.id must be "department-tool-builder"');
  if (typeof data.meta?.version !== 'number') problems.push('meta.version must be a number');

  const departments = Array.isArray(data.departments) ? data.departments : [];
  const requested = Array.isArray(data.requested_headings) ? data.requested_headings : [];
  if (!departments.length) problems.push('departments must be a non-empty array');
  if (!requested.length) problems.push('requested_headings must be a non-empty array');

  const deptIds = new Set();
  for (const dept of departments) {
    if (!dept.id) problems.push('department missing id');
    if (deptIds.has(dept.id)) problems.push(`duplicate department id "${dept.id}"`);
    deptIds.add(dept.id);
    if (!dept.name_th || !dept.name_en) problems.push(`department ${dept.id} missing name_th/name_en`);
    if (!Array.isArray(dept.related_skills) || !dept.related_skills.length) problems.push(`department ${dept.id} must have related_skills`);
    for (const skill of dept.related_skills || []) {
      if (!/^S\d+$/.test(skill)) problems.push(`department ${dept.id} has invalid related skill "${skill}"`);
    }
    if (!Array.isArray(dept.tool_templates_th) || !dept.tool_templates_th.length) problems.push(`department ${dept.id} must have tool_templates_th`);
  }

  const indexes = new Set();
  for (const item of requested) {
    if (typeof item.index !== 'number') problems.push('requested heading index must be a number');
    if (indexes.has(item.index)) problems.push(`duplicate requested heading index ${item.index}`);
    indexes.add(item.index);
    if (!deptIds.has(item.canonical_id)) problems.push(`requested heading ${item.index} references unknown canonical_id "${item.canonical_id}"`);
  }

  return problems;
}

export function departmentToolBuilderStats(data) {
  const requested = data.requested_headings || [];
  const departments = data.departments || [];
  const duplicateCount = requested.length - departments.length;
  return {
    requested_headings: requested.length,
    canonical_departments: departments.length,
    duplicate_headings: duplicateCount,
    clusters: [...new Set(departments.map((d) => d.cluster))].length,
    version: data.meta.version,
  };
}

export function findDepartment(data, { departmentId = '', requestIndex = null } = {}) {
  if (departmentId) {
    return data.departments.find((d) => d.id === departmentId) || null;
  }
  if (requestIndex != null) {
    const req = data.requested_headings.find((r) => r.index === Number(requestIndex));
    return req ? data.departments.find((d) => d.id === req.canonical_id) || null : null;
  }
  return null;
}

export function searchDepartmentToolBuilder(data, q, limit = 30) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return [];
  const hit = (s) => (s || '').toLowerCase().includes(needle);
  const results = [];
  for (const dept of data.departments || []) {
    const requestMatches = (data.requested_headings || []).filter((r) => r.canonical_id === dept.id && hit(r.label_th));
    if (hit(dept.name_th) || hit(dept.name_en) || hit(dept.summary_th) || hit(dept.cluster) || requestMatches.length) {
      results.push({
        id: dept.id,
        type: 'department',
        name_th: dept.name_th,
        name_en: dept.name_en,
        cluster: dept.cluster,
        matched_requests: requestMatches.map((r) => r.index),
      });
    }
    if (results.length >= limit) return results.slice(0, limit);
  }
  return results.slice(0, limit);
}

export function computeDepartmentCoverage(data, skillsRegistry = []) {
  const byId = new Map(skillsRegistry.map((s) => [s.id, s]));
  const requestMap = new Map();
  for (const req of data.requested_headings || []) {
    const arr = requestMap.get(req.canonical_id) || [];
    arr.push({ index: req.index, label_th: req.label_th });
    requestMap.set(req.canonical_id, arr);
  }

  const departments = (data.departments || []).map((dept) => {
    const skills = (dept.related_skills || []).map((id) => {
      const skill = byId.get(id);
      return skill
        ? { id, name: skill.name, status: skill.status, endpoint: skill.endpoint, found: true }
        : { id, name: null, status: 'unknown', endpoint: null, found: false };
    });
    const active = skills.filter((s) => s.found && s.status === 'active').length;
    const status = active >= 3 ? 'covered' : active >= 1 ? 'partial' : 'gap';
    return {
      id: dept.id,
      name_th: dept.name_th,
      name_en: dept.name_en,
      icon: dept.icon,
      cluster: dept.cluster,
      summary_th: dept.summary_th,
      summary_en: dept.summary_en || dept.summary_th,
      corporate_links: dept.corporate_links || [],
      request_count: (requestMap.get(dept.id) || []).length,
      requests: requestMap.get(dept.id) || [],
      status,
      active_skills: active,
      skills,
      tool_templates_th: dept.tool_templates_th || [],
      first_action_th: dept.first_action_th,
    };
  });

  const summary = {
    covered: departments.filter((d) => d.status === 'covered').length,
    partial: departments.filter((d) => d.status === 'partial').length,
    gap: departments.filter((d) => d.status === 'gap').length,
  };
  return { summary, departments };
}

function mockDevelopBrief(data, coverageEntry, goal) {
  const defaults = data.policy_defaults || {};
  const skillNames = coverageEntry.skills.filter((s) => s.found).slice(0, 4).map((s) => `${s.id} ${s.name}`);
  return {
    department_id: coverageEntry.id,
    title_th: coverageEntry.name_th,
    title_en: coverageEntry.name_en,
    goal: goal || 'สร้างเครื่องมือย่อยที่ใช้ได้จริงและปลอดภัยต่อบันทึก',
    mission_th: coverageEntry.summary_th,
    mission_en: coverageEntry.summary_en || coverageEntry.summary_th,
    related_requests: coverageEntry.requests,
    corporate_links: coverageEntry.corporate_links,
    existing_skills: skillNames,
    suggested_tools: coverageEntry.tool_templates_th,
    automation_flow: [
      `ค้นหาโจทย์จริงของ ${coverageEntry.name_th} จากข้อมูลที่มีอยู่`,
      'วิเคราะห์เป้าหมาย ความเสี่ยง และข้อจำกัดก่อนลงมือ',
      `จับคู่สกิลที่มีอยู่ (${skillNames.join(', ') || 'ยังไม่พบสกิลพร้อมใช้'}) และระบุช่องว่าง`,
      'สรุปวิธีปรับใช้แบบทีละขั้นที่ตรวจสอบได้',
      'ยืนยัน guardrails เรื่องบันทึก/หลักฐานก่อนนำไปใช้จริง',
    ],
    record_guardrails: defaults.record_guardrails_th || [],
    record_guardrails_en: defaults.record_guardrails_en || defaults.record_guardrails_th || [],
    execution_loop: defaults.execution_loop_th || [],
    execution_loop_en: defaults.execution_loop_en || defaults.execution_loop_th || [],
    definition_of_done: defaults.definition_of_done_th || [],
    definition_of_done_en: defaults.definition_of_done_en || defaults.definition_of_done_th || [],
    first_action: coverageEntry.first_action_th,
  };
}

export function registerDepartmentToolBuilderRoutes(app, {
  limiter, getSkillsRegistry, callAI, parseAIJson, addLog,
}) {
  const data = loadDepartmentToolBuilder();
  const pass = (req, res, next) => next();
  const lim = limiter || pass;
  const warn = addLog || (() => {});

  app.get('/api/department-tools', lim, (req, res) => {
    const coverage = computeDepartmentCoverage(data, getSkillsRegistry());
    res.json({
      success: true,
      meta: data.meta,
      stats: departmentToolBuilderStats(data),
      policy_defaults: data.policy_defaults,
      coverage_summary: coverage.summary,
      departments: coverage.departments,
      requested_headings: data.requested_headings,
      ts: new Date().toISOString(),
    });
  });

  app.get('/api/department-tools/search', lim, (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ success: false, error: 'ต้องระบุคำค้น ?q=', error_en: 'missing ?q search query' });
    const results = searchDepartmentToolBuilder(data, q);
    res.json({ success: true, q, count: results.length, results });
  });

  app.post('/api/department-tools/develop', lim, async (req, res) => {
    const { department_id, request_index, goal } = req.body || {};
    if (!department_id?.trim() && request_index == null) {
      return res.status(400).json({
        success: false,
        error: 'ต้องระบุ department_id หรือ request_index',
        error_en: 'department_id or request_index required',
      });
    }
    const department = findDepartment(data, { departmentId: department_id?.trim(), requestIndex: request_index });
    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบฝ่ายที่ต้องการพัฒนา',
        error_en: 'department not found',
      });
    }
    const coverage = computeDepartmentCoverage(data, getSkillsRegistry());
    const entry = coverage.departments.find((d) => d.id === department.id);
    const fallback = mockDevelopBrief(data, entry, goal);

    if (callAI && parseAIJson) {
      const prompt = `คุณเป็นนักวางระบบ OpenThaiAi
ฝ่าย: ${department.name_th} (${department.name_en})
เป้าหมาย: ${goal || 'สร้างเครื่องมือย่อยที่ใช้ได้จริงและปลอดภัยต่อบันทึก'}
บทบาท: ${department.summary_th}
สกิลที่มีอยู่: ${(entry.skills || []).map((s) => `${s.id} ${s.name || 'unknown'} (${s.status})`).join(', ')}
หัวข้อที่ผู้ใช้ร้องขอ: ${(entry.requests || []).map((r) => `${r.index}. ${r.label_th}`).join(' | ')}
เครื่องมือย่อยที่ควรมี: ${(department.tool_templates_th || []).join(' | ')}
กติกาบันทึก: ${(data.policy_defaults?.record_guardrails_th || []).join(' | ')}
ตอบ JSON เท่านั้น:
{"mission_th":"...","existing_skills":["S.. name"],"suggested_tools":["..."],"automation_flow":["..."],"record_guardrails":["..."],"first_action":"..."}`;
      try {
        const text = await callAI(prompt, 1800);
        const ai = parseAIJson(text);
        return res.json({
          success: true,
          source: 'ai',
          department_id: department.id,
          title_th: department.name_th,
          title_en: department.name_en,
          goal: goal || null,
          related_requests: entry.requests,
          corporate_links: entry.corporate_links,
          execution_loop: data.policy_defaults?.execution_loop_th || [],
          definition_of_done: data.policy_defaults?.definition_of_done_th || [],
          ...ai,
        });
      } catch (e) {
        warn('warn', 'DepartmentToolBuilder/Develop', e.message);
      }
    }

    res.json({ success: true, source: 'registry', ...fallback });
  });

  app.post('/api/department-tools/develop-all', lim, (req, res) => {
    const { goal } = req.body || {};
    const coverage = computeDepartmentCoverage(data, getSkillsRegistry());
    const briefs = coverage.departments.map((dept) => ({ source: 'registry', ...mockDevelopBrief(data, dept, goal) }));
    res.json({
      success: true,
      source: 'registry',
      goal: goal || null,
      stats: departmentToolBuilderStats(data),
      coverage_summary: coverage.summary,
      briefs,
      ts: new Date().toISOString(),
    });
  });
}
