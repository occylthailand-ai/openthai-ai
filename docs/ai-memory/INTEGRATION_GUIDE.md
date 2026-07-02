# Integration Guide — Core Philosophy & Lessons Memory

This describes how `docs/ai-memory/core-philosophy.json` (and its YAML twin) gets
loaded — into a system prompt, or permanently into the vector store that already
exists in this repo (`backend/vector-memory.js`). Nothing here requires new
infrastructure; it reuses what's already deployed.

## Files in this directory

| File | Purpose |
|---|---|
| `core-philosophy.json` | Canonical source. Hand-edit this one. |
| `core-philosophy.yaml` | Auto-generated twin — same content, YAML shape. Regenerate, don't hand-edit (command in the file header). |
| `skill-prompts/cognitive_architecture_analogy.md` | A reusable prompt template (see that file). |
| `INTEGRATION_GUIDE.md` | This file. |

## Option A — System prompt injection (simplest, no network call)

Read the JSON at process start and prepend/append it to whatever system prompt
your assistant uses. Works identically for a Claude Code session, a Gemini
system instruction, or a Grok system prompt — it's just text.

```js
// Node / Express example
import { readFileSync } from 'node:fs';
const corePhilosophy = JSON.parse(readFileSync('docs/ai-memory/core-philosophy.json', 'utf8'));
const systemPromptAddendum = `${corePhilosophy.core_philosophy.statement}\n\n` +
  corePhilosophy.key_lessons.map(l => `- ${l.title}: ${l.statement}`).join('\n');
```

```python
# Python example
import json
with open('docs/ai-memory/core-philosophy.json', encoding='utf-8') as f:
    core = json.load(f)
system_prompt_addendum = core['core_philosophy']['statement']
```

This is the right choice when you just want the philosophy to bias behavior in a
single conversation and don't need it to be searchable later.

## Option B — Permanent vector store (reuses `backend/vector-memory.js`)

This repo already has a working per-tenant semantic memory system with a REST API —
there is no separate "RAG infrastructure" to build. Relevant endpoints
(`backend/server.js` around line 5676):

| Method | Path | Body / Query |
|---|---|---|
| `POST` | `/api/memory/store` | `{ text, type, metadata, tenantId }` |
| `POST` | `/api/memory/search` | `{ query, type, topK, threshold, tenantId }` |
| `GET`  | `/api/memory?tenantId=&type=&limit=` | — |
| `DELETE` | `/api/memory/:id?tenantId=` | — |

`type` is a free-form string (no enum validation in `vector-memory.js`), so no code
change is needed to introduce new types. **Use `tenantId: "core-philosophy"`** — a
dedicated namespace, separate from `"global"` (used for real per-tenant marketing
content) so these entries never mix with or get pruned alongside business memories.

Suggested `type` values for this dataset:
- `"philosophy"` — the single core-philosophy statement (1 memory)
- `"lesson"` — one memory per entry in `key_lessons` (3 memories today, grows over time)

Store looks like:
```bash
curl -X POST https://www.openthai-ai.com/api/memory/store \
  -H 'Content-Type: application/json' \
  -d '{
    "tenantId": "core-philosophy",
    "type": "philosophy",
    "text": "Ground truth over narrative confidence. ...",
    "metadata": { "id": "openthaiai-core-philosophy-v1", "source": "docs/ai-memory/core-philosophy.json" }
  }'
```

Search it back (semantic, not exact match):
```bash
curl -X POST https://www.openthai-ai.com/api/memory/search \
  -H 'Content-Type: application/json' \
  -d '{ "tenantId": "core-philosophy", "query": "should I trust a pasted architecture spec?", "type": "lesson", "topK": 3 }'
```

Idempotency: `vector-memory.js` already rejects near-duplicate stores (cosine
similarity > 0.97 within the same `type`), so re-running the loader script below
after no real change is a safe no-op.

**⚠️ Known gap, not fixed by this change:** `/api/memory/store` has a rate limiter
(30 req/min) but no `x-admin-key` check, unlike the `/api/*/admin/*` routes
elsewhere in this codebase. On production, anyone who knows the URL can write to
any `tenantId`, including `"core-philosophy"`. This was already true before this
change (the existing `n8n-workflows/openthai-ai-automation.json` calls the same
endpoint unauthenticated) — flagging it here because we're now recommending this
endpoint for something meant to be permanent. If you want it locked down, that's
a follow-up: add the same `checkAdminKey` pattern used by `/api/orders/admin/*` to
the `/api/memory/*` routes. Not doing it silently as part of this change since it
would also break the existing n8n automation that writes to memory unauthenticated.

## Option C — Load it via the loader scripts (this PR ships both)

- `scripts/load_core_philosophy.py` — Python, calls Option B's REST API.
- `n8n-workflows/load-core-philosophy.json` — importable n8n workflow, same API.

Run either any time the JSON changes; both are idempotent (see above).

## Keeping this file alive (don't let it go stale like the old daily-briefing.sh did)

1. A new *event* (a decision, a rejected proposal, a real incident) always goes into
   `DECISIONS_LOG.md` first — that's the append-only factual record.
2. Only promote something into `core-philosophy.json` as a `lesson` if it's
   **generalizable** — a pattern worth applying to future work, not just a one-off
   fact. Not every decisions-log entry becomes a lesson.
3. When you add a lesson, bump `version` in `core-philosophy.json`, regenerate the
   YAML twin, and re-run the loader (Option B or C) so the vector store reflects
   the update — old near-duplicate entries won't be overwritten automatically,
   so delete the stale memory by `id` first if a lesson's wording changes
   materially (`DELETE /api/memory/:id?tenantId=core-philosophy`).

## Recommended repo paths (already applied in this PR)

```
docs/ai-memory/
├── core-philosophy.json        ← canonical, hand-edited
├── core-philosophy.yaml        ← generated twin
├── INTEGRATION_GUIDE.md         ← this file
└── skill-prompts/
    └── cognitive_architecture_analogy.md
scripts/
└── load_core_philosophy.py
n8n-workflows/
└── load-core-philosophy.json
```

This sits alongside (not instead of) `PROJECT_STATUS.md` and `DECISIONS_LOG.md` at
the repo root — those are the auto-generated "what's true right now" and "what
happened" documents; `docs/ai-memory/` is the curated, slower-changing "how we
think about this project" layer built on top of them.
