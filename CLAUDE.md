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

## Working style established this session

- Verify a claim against the actual code before building on it (grep first).
- Prefer generated/derived documentation over hand-maintained summaries that
  can silently drift from reality.
- Ship real, tested changes — a change isn't done because it should work; it's
  done once it's been run and observed to work (locally, then ideally against
  a real deployed instance).
