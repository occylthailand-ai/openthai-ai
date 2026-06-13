// Openthai.ai — Vector Memory System
// Long-term semantic memory for AI agents.
// Each tenant gets an isolated memory space.
//
// Storage: backend/data/memory_<tenantId>.json (local / Vercel /tmp)
// Embedding: Google text-embedding-004 (768-dim) → cosine similarity fallback: keyword hash
//
// Endpoints registered in server.js:
//   POST   /api/memory/store    — store a memory with embedding
//   POST   /api/memory/search   — semantic search (top-K)
//   GET    /api/memory          — list memories (with optional type filter)
//   DELETE /api/memory/:id      — delete one memory
//   DELETE /api/memory          — clear all memories for tenant

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ── Storage helpers ───────────────────────────────────────────────────────────

function memFile(writeDir, tenantId) {
  const safe = (tenantId || 'global').replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(writeDir, `memory_${safe}.json`);
}

function loadMemories(writeDir, tenantId) {
  try {
    const f = memFile(writeDir, tenantId);
    if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  } catch (_) {}
  return [];
}

function saveMemories(writeDir, tenantId, data) {
  try {
    if (!existsSync(writeDir)) mkdirSync(writeDir, { recursive: true });
    writeFileSync(memFile(writeDir, tenantId), JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('[memory] save error:', e.message); }
}

// ── Embedding helpers ─────────────────────────────────────────────────────────

// Cosine similarity between two float arrays
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

// Lightweight keyword-hash fallback (128-dim) when no embedding API is available
function hashEmbed(text) {
  const tokens = text.toLowerCase().replace(/[^฀-๿a-z0-9\s]/g, '').split(/\s+/);
  const vec = new Float32Array(128).fill(0);
  for (const t of tokens) {
    let h = 5381;
    for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
    vec[h % 128] += 1;
  }
  // L2 normalise
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) + 1e-9;
  return Array.from(vec).map(v => v / norm);
}

// Get embedding via Gemini text-embedding-004, fallback to hash
async function embed(text, geminiClient) {
  if (geminiClient) {
    try {
      const model = geminiClient._googleAI
        ? geminiClient._googleAI.getGenerativeModel({ model: 'text-embedding-004' })
        : null;
      if (model) {
        const res = await model.embedContent(text.slice(0, 2048));
        return res.embedding.values;
      }
    } catch (_) {}
  }
  return hashEmbed(text);
}

// ── Memory types ──────────────────────────────────────────────────────────────
// content    — past generated hooks/captions (learn brand voice)
// product    — product knowledge (name, category, keywords)
// brand      — brand guidelines (tone, style, do/don't)
// feedback   — user feedback on content quality
// trend      — saved trending topics/hashtags

// ── Public API ────────────────────────────────────────────────────────────────

export function createMemorySystem(writeDir, getGemini) {
  return {

    // Store a memory with semantic embedding
    async store({ tenantId = 'global', text, type = 'content', metadata = {} }) {
      if (!text?.trim()) throw new Error('text is required');
      const memories = loadMemories(writeDir, tenantId);

      // Prevent near-duplicate storage (cosine > 0.97)
      const gemini = getGemini?.();
      const vec = await embed(text, gemini);
      for (const m of memories) {
        if (m.type === type && cosine(m.embedding, vec) > 0.97) {
          return { stored: false, reason: 'near-duplicate', existing_id: m.id };
        }
      }

      const record = {
        id:        `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tenantId,
        type,
        text:      text.slice(0, 2000),
        metadata,
        embedding: vec,
        ts:        new Date().toISOString(),
      };

      memories.push(record);
      // Keep newest 2000 per tenant
      if (memories.length > 2000) memories.splice(0, memories.length - 2000);
      saveMemories(writeDir, tenantId, memories);
      return { stored: true, id: record.id, type, ts: record.ts };
    },

    // Semantic search — returns top-K most similar memories
    async search({ tenantId = 'global', query, type, topK = 5, threshold = 0.3 }) {
      if (!query?.trim()) throw new Error('query is required');
      const memories = loadMemories(writeDir, tenantId);
      if (!memories.length) return { results: [], count: 0 };

      const gemini = getGemini?.();
      const queryVec = await embed(query, gemini);

      let scored = memories
        .filter(m => !type || m.type === type)
        .map(m => ({ ...m, score: cosine(m.embedding, queryVec) }))
        .filter(m => m.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      // Strip embedding from response (heavy)
      return {
        results: scored.map(({ embedding, ...rest }) => ({ ...rest, score: +rest.score.toFixed(4) })),
        count:   scored.length,
        query,
      };
    },

    // List all memories for a tenant (no embeddings in response)
    list({ tenantId = 'global', type, limit = 50 }) {
      const memories = loadMemories(writeDir, tenantId);
      let filtered = memories;
      if (type) filtered = filtered.filter(m => m.type === type);
      return {
        memories: filtered
          .slice(-limit)
          .reverse()
          .map(({ embedding, ...rest }) => rest),
        total:  filtered.length,
        types:  [...new Set(memories.map(m => m.type))],
      };
    },

    // Delete one memory
    delete({ tenantId = 'global', id }) {
      const memories = loadMemories(writeDir, tenantId);
      const idx = memories.findIndex(m => m.id === id);
      if (idx < 0) return { deleted: false };
      memories.splice(idx, 1);
      saveMemories(writeDir, tenantId, memories);
      return { deleted: true, id };
    },

    // Clear all memories for tenant
    clear({ tenantId = 'global', type }) {
      let memories = loadMemories(writeDir, tenantId);
      const before = memories.length;
      if (type) {
        memories = memories.filter(m => m.type !== type);
      } else {
        memories = [];
      }
      saveMemories(writeDir, tenantId, memories);
      return { cleared: before - memories.length, remaining: memories.length };
    },

    // Auto-store agent result into memory (called after agent runs successfully)
    async autoLearn({ tenantId = 'global', result, form }) {
      const promises = [];

      // Learn hook patterns
      if (result.hook) {
        promises.push(this.store({
          tenantId, type: 'content',
          text: result.hook,
          metadata: { product: form.product, platform: form.platform, style: form.style, score: result.criticScore },
        }));
      }

      // Learn product knowledge
      promises.push(this.store({
        tenantId, type: 'product',
        text: `${form.product} | ${form.category} | ${form.platform} | score:${result.criticScore}`,
        metadata: { ...form, criticScore: result.criticScore },
      }));

      await Promise.allSettled(promises);
    },
  };
}
