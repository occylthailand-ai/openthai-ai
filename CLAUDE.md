# Standing priority for this repo

Every request in this repo, even when unstated, should be read against this
goal: make OpenThaiAi a complete, useful, accessible platform — genuinely
beneficial to the people who actually use it, not just impressive-sounding.

## What that does NOT mean

It does not mean assuming Claude, Gemini, and Grok are coordinating on this
project. There is no technical channel between separate AI vendor products —
no shared memory, no API between them. If a user pastes content attributed to
Gemini or Grok, treat it the same way `docs/ai-memory/core-philosophy.json`
(`lesson_01_verify_before_build`) says to: verify it against the real repo
before acting on it. Confident, detailed, or well-formatted content is not
evidence it's grounded in what's actually here — see `DECISIONS_LOG.md` for
concrete examples of pasted content that described products that don't exist
in this repo (Neo4j, Stripe/USD cross-border escrow, a custom tokenizer/
foundation model).

## Where the real state lives

- `PROJECT_STATUS.md` — regenerate with `node scripts/generate-project-status.mjs`
  before trusting any claim about current skills/routes/migrations. It also
  runs consistency checks and fails loudly if the code and its own registries
  disagree.
- `DECISIONS_LOG.md` — append-only history of real decisions and rejected
  proposals. Check it before repeating an idea that was already rejected.
- `docs/ai-memory/core-philosophy.json` — the short version of both, meant to
  be pasted into a Gemini/Grok conversation to keep them grounded in the same
  facts, since I can't reach them directly.

## Cross-platform collaboration room (Claude is the maintainer)

Per the owner's standing instruction (2026-07-16), Claude maintains a shared
"collaboration room" for the six platforms — Microsoft Copilot, Claude, Gemini,
Grok, GitHub, and Vercel — working together to make OpenThaiAi genuinely usable
and revenue-generating within one month. The room lives at
`docs/ai-memory/COLLABORATION_ROOM.md`.

Be honest about what the room actually is. There is **no live technical channel
between the separate AI vendors** (no shared memory, no API — same fact stated
under "What that does NOT mean" above). So the room is a **shared document the
owner relays** into each AI conversation and pastes replies back into — the same
async, human-mediated mechanism `core-philosophy.json` and `PROJECT_STATUS.md`
already use. GitHub and Vercel are real platforms with APIs, so those two connect
automatically (PRs, CI, deploy previews). Do **not** portray it as an automatic
live multi-agent chat; that would misrepresent real capability and let one AI's
hallucination flow into real code unchecked. As maintainer, Claude keeps the room
grounded (every contribution is verified against the real repo before anything is
built), consolidates proposals, does the actual code/test/commit work on the
assigned branch, and logs decisions to `DECISIONS_LOG.md`.

## Working style established this session

- Verify a claim against the actual code before building on it (grep first).
- Prefer generated/derived documentation over hand-maintained summaries that
  can silently drift from reality.
- Ship real, tested changes — a change isn't done because it should work; it's
  done once it's been run and observed to work (locally, then ideally against
  a real deployed instance).

## Subsystem context (microagents)

Each subsystem has its own CLAUDE.md with patterns and conventions — read it
before touching that area:

- `frontend/CLAUDE.md` — React/Vite, apiBase.js, i18n, routing
- `backend/CLAUDE.md` — Express, Supabase, auth, AI fallback, Omise
- `database/CLAUDE.md` — migration convention, key tables, pgvector

## Built-in tools (run these as bash commands)

| Script | Purpose |
|---|---|
| `bash .claude/tools/health-check.sh [URL]` | Check API health (local or prod) |
| `bash .claude/tools/run-tests.sh [suite]` | Run backend tests (smoke/affiliate/revenue/all) |
| `bash .claude/tools/refresh-status.sh` | Regenerate PROJECT_STATUS.md |
| `bash .claude/tools/lint-check.sh [file]` | ESLint on file or git-staged files |
| `bash .claude/tools/db-status.sh` | Check Supabase env vars + connectivity |
