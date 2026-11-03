// บันทึกการเรียก AI ลง Supabase ตาราง ai_usage_log (migration 003 + 009)
// fire-and-forget — ห้าม throw / ห้ามทำให้ request ล่ม (รูปแบบเดียวกับ audit.js)
//
// หมายเหตุความถูกต้องของตัวเลข:
//  - tokens จาก router เป็นค่าประมาณ (ความยาวข้อความ/4) ไม่ใช่ usage จริงจาก API → tokens_est = true
//  - cost_usd มาจาก costPer1k ในโค้ด ซึ่งยังไม่ได้วัดเทียบเรตจริงของแต่ละค่าย
//  - cost_thb คำนวณเมื่อตั้ง USD_THB_RATE เท่านั้น ไม่มีค่าเริ่มต้นแต่งขึ้นเอง (ไม่ตั้ง → null)

const ALLOWED_SOURCES = new Set(['claude', 'gemini', 'grok', 'mock', 'mock-fallback']);

/**
 * @param {object} e
 * @param {string} e.provider      provider ที่ตอบสำเร็จจริง (หลัง fallback)
 * @param {string} [e.model]
 * @param {string} e.endpoint
 * @param {number} [e.tokens]      รวม input+output (ค่าประมาณ)
 * @param {number} [e.costUsd]
 * @param {number} [e.latencyMs]
 * @param {string[]} [e.tried]
 * @param {string|null} [e.userId]
 * @param {{ url?: string, key?: string, fetchImpl?: typeof fetch, thbRate?: number }} [opts]
 * @returns {Promise<boolean>} true ถ้าส่งเขียนสำเร็จ (ไม่ throw ไม่ว่ากรณีใด)
 */
export async function logAiUsage(e, opts = {}) {
  try {
    const url = opts.url ?? process.env.SUPABASE_URL;
    const key = opts.key ?? process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return false;
    if (!ALLOWED_SOURCES.has(e.provider)) return false;
    const rate = opts.thbRate ?? parseFloat(process.env.USD_THB_RATE || '');
    const costUsd = typeof e.costUsd === 'number' ? e.costUsd : null;
    const row = {
      user_id: e.userId ?? null,
      ai_source: e.provider,
      model_id: e.model ?? null,
      endpoint: e.endpoint,
      input_tokens: null,                       // router ไม่แยก in/out → ไม่เดา
      output_tokens: null,
      cost_usd: costUsd,
      cost_thb: costUsd !== null && Number.isFinite(rate) && rate > 0 ? +(costUsd * rate).toFixed(2) : null,
      response_ms: e.latencyMs ?? null,
      tried: e.tried ?? null,
      tokens_est: true,
    };
    const f = opts.fetchImpl ?? fetch;
    const res = await f(`${url}/rest/v1/ai_usage_log`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    return !!res.ok;
  } catch (_) {
    return false;
  }
}
