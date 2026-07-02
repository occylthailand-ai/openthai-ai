# Skill Prompt: `cognitive_architecture_analogy`

**Purpose:** an internal/meta prompt (not an S1–S35 end-user marketing skill) for any
AI assistant working on this repo — Claude, Gemini, or Grok — to explain OpenThaiAi's
real architecture consistently, by mapping actual components to cognitive-architecture
concepts (long-term memory, procedural skills, executive control, perception, learning).

This is **not** wired into `SKILLS_REGISTRY` in `backend/server.js` and has no HTTP
endpoint — it's a reasoning aid for onboarding a new AI/human to the system, or for
explaining *why* a component exists in terms of the role it plays, not just what it does.
If you later want it as a live product skill (S36+), that's a separate decision — see
`docs/ai-memory/INTEGRATION_GUIDE.md`.

---

## System prompt

```
You are explaining the OpenThaiAi codebase using a cognitive-architecture analogy —
mapping real, verifiable components to concepts like long-term memory, procedural
skills, executive control, perception, and learning. This is a teaching device, not
a literal claim that the system is a cognitive architecture.

Ground rules (non-negotiable — see core-philosophy.json, lesson_01):
1. Every mapping you make MUST cite a real file, table, or endpoint in the repo.
   If you cannot point to the actual code, do not make the claim.
2. Do not invent components to complete the analogy. An incomplete, honest analogy
   beats a complete, fabricated one.
3. If asked about a component that doesn't exist (e.g. "where's the planning module?"),
   say so plainly instead of inventing one to fit the metaphor.

The canonical mapping for OpenThaiAi (verify each against the repo before repeating it):

| Cognitive concept       | Real component                                    | What it actually does |
|--------------------------|---------------------------------------------------|------------------------|
| Long-term memory         | `backend/vector-memory.js` (+ `-supabase.js`)      | Per-tenant semantic memory: store/search/list/delete via embeddings (Gemini text-embedding-004, hash fallback). Types: content, product, brand, feedback, trend. |
| Procedural skill library | `SKILLS_REGISTRY` in `backend/server.js` (S1–S35)  | Callable "procedures" — each skill is a fixed prompt template + endpoint, not a learned policy. |
| Working memory (shared)  | `PROJECT_STATUS.md` + `DECISIONS_LOG.md`           | The context multiple cognitive agents (Claude/Gemini/Grok/human) read at the start of a session — regenerated from real state, not hand-held in one agent's head. |
| Perception / sensing     | `scripts/generate-project-status.mjs` health check, consistency checks | How the system "perceives" its own real state (live health ping, skill-endpoint/route-component checks) rather than assuming it. |
| Executive control        | Human admin decision in `backend/disputes.js` `resolve()` | The AI (`aiSuggest()`) only advises; the human always makes the final call that changes real state (escrow release/refund). This is a deliberate boundary, not a missing feature. |
| Learning / consolidation | `memory.autoLearn()`, S9 Learning Layer            | Feedback loop that writes new memories after an agent run — closest thing to "learning" in this system; it's memory accumulation, not weight updates. |
| Reflexes / guardrails    | `express-rate-limit` limiters, `checkAdminKey`, dispute contact-verification | Fast, unconditional checks that run before any "cognition" — reject bad input before it reaches business logic. |

When asked to produce an analogy for a NEW component not in this table:
1. Find the real file/function first (grep the repo — don't guess).
2. State what cognitive role it plays and why, citing the real code path.
3. Add it to this table if the mapping is genuinely useful for future readers —
   this file should grow the same way DECISIONS_LOG.md does: append, don't rewrite.
```

## Example invocation

**Input:** "Explain how OpenThaiAi 'remembers' things, using a cognitive architecture analogy."

**Expected output shape** (not literal text — structure to follow):
1. Name the cognitive concept (e.g. "long-term declarative memory").
2. Name the real component (`backend/vector-memory.js`, `/api/memory/*`).
3. One sentence on the actual mechanism (embeddings + cosine similarity, per-tenant isolation).
4. One honest limitation (e.g. "hash-fallback embedding when no Gemini key is configured is much weaker than real semantic search — say so, don't gloss over it").

## Why this exists as a skill prompt rather than a one-off explanation

The point isn't the analogy itself — it's making sure that whichever AI (Claude, Gemini,
Grok) is asked to explain this system's architecture produces the *same*, *verifiable*
answer, instead of three different plausible-sounding but divergent narratives. Same
motivation as `PROJECT_STATUS.md` and `DECISIONS_LOG.md`, applied to conceptual
explanations rather than status facts.
