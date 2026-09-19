/**
 * หมวด 2 — RAM / Context: RAG Pipeline + Vector Orchestrator
 * ใช้ pgvector (Supabase) เป็น vector store หลัก
 * รองรับ: ค้นหาความรู้, enrichment context, agent memory
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small'
const EMBED_DIM = 1536
const DEFAULT_MATCH_COUNT = 5
const DEFAULT_MATCH_THRESHOLD = 0.75

// --- Embedding ---

async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  })
  const data = await res.json()
  if (!data.data?.[0]?.embedding) throw new Error('Embed failed: ' + JSON.stringify(data))
  return data.data[0].embedding
}

// --- Ingest ---

export async function ingestDocument({ content, metadata = {}, namespace = 'default' }) {
  const embedding = await embed(content)
  const { error } = await supabase.from('knowledge_chunks').insert({
    content,
    embedding,
    namespace,
    metadata,
    created_at: new Date().toISOString(),
  })
  if (error) throw new Error('Ingest failed: ' + error.message)
  return { ok: true }
}

export async function ingestBatch(docs, namespace = 'default') {
  const results = []
  for (const doc of docs) {
    results.push(await ingestDocument({ ...doc, namespace }))
  }
  return results
}

// --- Retrieval ---

export async function retrieve({ query, namespace = 'default', matchCount = DEFAULT_MATCH_COUNT, threshold = DEFAULT_MATCH_THRESHOLD }) {
  const queryEmbedding = await embed(query)
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: threshold,
    filter_namespace: namespace,
  })
  if (error) throw new Error('Retrieve failed: ' + error.message)
  return data ?? []
}

// --- RAG: Retrieve + Generate Context ---

export async function buildContext({ query, namespace = 'default', maxTokens = 3000 }) {
  const chunks = await retrieve({ query, namespace })
  if (!chunks.length) return ''

  let context = ''
  let approxTokens = 0
  for (const chunk of chunks) {
    const chunkTokens = Math.ceil(chunk.content.length / 4)
    if (approxTokens + chunkTokens > maxTokens) break
    context += `\n---\n${chunk.content}`
    approxTokens += chunkTokens
  }
  return context.trim()
}

// --- Agent Memory ---

export async function saveAgentMemory({ agentId, content, sessionId }) {
  return ingestDocument({
    content,
    namespace: `agent:${agentId}`,
    metadata: { sessionId, agentId, type: 'memory' },
  })
}

export async function recallAgentMemory({ agentId, query, matchCount = 3 }) {
  return retrieve({ query, namespace: `agent:${agentId}`, matchCount })
}

// --- SQL migration helper (run once) ---
export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          BIGSERIAL PRIMARY KEY,
  namespace   TEXT NOT NULL DEFAULT 'default',
  content     TEXT NOT NULL,
  embedding   VECTOR(${EMBED_DIM}),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS knowledge_chunks_namespace_idx ON knowledge_chunks (namespace);
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding   VECTOR(${EMBED_DIM}),
  match_count       INT DEFAULT 5,
  match_threshold   FLOAT DEFAULT 0.75,
  filter_namespace  TEXT DEFAULT 'default'
)
RETURNS TABLE (id BIGINT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT id, content, metadata,
         1 - (embedding <=> query_embedding) AS similarity
  FROM   knowledge_chunks
  WHERE  namespace = filter_namespace
    AND  1 - (embedding <=> query_embedding) >= match_threshold
  ORDER  BY embedding <=> query_embedding
  LIMIT  match_count;
$$;
`
