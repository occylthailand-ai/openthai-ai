// Openthai.ai — Vector Memory (Supabase pgvector)
// Drop-in replacement สำหรับ vector-memory.js เมื่อ Supabase พร้อม
// ใช้ชุดเดียวกับ createMemorySystem() API

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Supabase REST helper ───────────────────────────────────────────────────────
async function sbFetch(method, path, body = null, params = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');

  const url = new URL(`${SUPABASE_URL}/rest/v1${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const opts = {
    method,
    headers: {
      apikey:          SUPABASE_SERVICE_KEY,
      Authorization:   `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          method === 'POST' ? 'return=representation' : 'return=minimal',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url.toString(), opts);
  if (method === 'DELETE' || res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.hint || `Supabase HTTP ${res.status}`);
  return data;
}

// ── RPC (stored functions) ───────────────────────────────────────────────────
async function rpc(fn, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey:        SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':'application/json',
    },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `RPC ${fn} failed`);
  return data;
}

// ── Embedding via Google API ──────────────────────────────────────────────────
async function embed(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text }] } }),
      }
    );
    const data = await res.json();
    return data.embedding?.values || null;
  } catch {
    return null;
  }
}

// ── Keyword-hash fallback embedding (768-dim) ─────────────────────────────────
function hashEmbed(text) {
  const words = text.toLowerCase().split(/\s+/);
  const vec = new Float32Array(768).fill(0);
  words.forEach(w => {
    let h = 5381;
    for (let i = 0; i < w.length; i++) h = ((h << 5) + h) ^ w.charCodeAt(i);
    vec[Math.abs(h) % 768] += 1;
    vec[Math.abs(h >> 3) % 768] += 0.5;
  });
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return Array.from(vec).map(v => v / norm);
}

// ── Memory system factory (same interface as vector-memory.js) ────────────────
export function createSupabaseMemory() {
  const ready = !!SUPABASE_URL && !!SUPABASE_SERVICE_KEY;
  if (!ready) console.warn('[supabase-memory] Not configured — SUPABASE_URL / SUPABASE_SERVICE_KEY missing');

  return {
    // ── store ────────────────────────────────────────────────────────────────
    async store({ tenantId = 'global', text, type = 'content', metadata = {}, score = 0 }) {
      const embedding = (await embed(text)) || hashEmbed(text);

      const rows = await sbFetch('POST', '/memory_entries', {
        tenant_id: tenantId, type, text, embedding, metadata, score,
      });
      return { stored: true, id: rows?.[0]?.id };
    },

    // ── search ───────────────────────────────────────────────────────────────
    async search({ tenantId = 'global', query, type = null, topK = 10, threshold = 0.7 }) {
      const queryEmbedding = (await embed(query)) || hashEmbed(query);

      const results = await rpc('search_memory', {
        p_tenant_id: tenantId,
        p_embedding:  queryEmbedding,
        p_type:       type,
        p_top_k:      topK,
        p_threshold:  threshold,
      });

      return (results || []).map(r => ({
        id:        r.id,
        text:      r.text,
        type:      r.type,
        metadata:  r.metadata,
        score:     r.score,
        similarity: r.similarity,
        createdAt: r.created_at,
      }));
    },

    // ── list ─────────────────────────────────────────────────────────────────
    async list({ tenantId = 'global', type = null, limit = 50 }) {
      const params = {
        tenant_id: `eq.${tenantId}`,
        order: 'created_at.desc',
        limit: String(limit),
        select: 'id,type,text,metadata,score,created_at',
      };
      if (type) params.type = `eq.${type}`;
      const rows = await sbFetch('GET', '/memory_entries', null, params);
      return rows || [];
    },

    // ── delete ────────────────────────────────────────────────────────────────
    async delete({ tenantId, id }) {
      await sbFetch('DELETE', '/memory_entries', null, { id: `eq.${id}`, tenant_id: `eq.${tenantId}` });
      return { deleted: true };
    },

    // ── clear ─────────────────────────────────────────────────────────────────
    async clear({ tenantId, type = null }) {
      const params = { tenant_id: `eq.${tenantId}` };
      if (type) params.type = `eq.${type}`;
      await sbFetch('DELETE', '/memory_entries', null, params);
      return { cleared: true };
    },

    // ── autoLearn ─────────────────────────────────────────────────────────────
    async autoLearn({ tenantId = 'global', result, form }) {
      try {
        const text = [form.product, form.category, result.hook, (result.hashtags || []).join(' ')].filter(Boolean).join(' ');
        await this.store({ tenantId, text, type: 'content', metadata: { product: form.product, platform: form.platform, score: result.criticScore }, score: parseFloat(result.criticScore) || 0 });
      } catch (_) {}
    },

    ready,
  };
}

// ── Migration: JSON files → Supabase ─────────────────────────────────────────
export async function migrateFromJson(jsonDir) {
  const { readFileSync, readdirSync } = await import('fs');
  const { join } = await import('path');

  const mem = createSupabaseMemory();
  const files = readdirSync(jsonDir).filter(f => f.startsWith('memory_') && f.endsWith('.json'));

  let total = 0, failed = 0;
  for (const file of files) {
    const tenantId = file.replace('memory_', '').replace('.json', '');
    const entries = JSON.parse(readFileSync(join(jsonDir, file), 'utf8'));

    for (const entry of entries) {
      try {
        await mem.store({
          tenantId,
          text:     entry.text,
          type:     entry.type,
          metadata: entry.metadata,
          score:    entry.score,
        });
        total++;
      } catch (e) {
        console.warn(`[migrate] Failed ${entry.id}:`, e.message);
        failed++;
      }
    }
    console.log(`[migrate] ${file}: ${entries.length} entries → Supabase`);
  }
  return { total, failed };
}
