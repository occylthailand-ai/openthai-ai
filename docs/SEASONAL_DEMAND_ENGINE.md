# Seasonal Demand Engine — 24 solar terms (节气) × climate zone → product categories

**Owner vision (2026-07-24):** push the *right product* to the *right region* for people who
*actually need that category right now* — anchored to the Chinese 24 solar terms (节气) and each
region's *local* season, so all five groups (ผู้ผลิต / คนกลาง / affiliate / partner-agent / ผู้บริโภค)
get a concrete "**what to push, where, this period**" signal — and so the platform's targeting does
**not depend on an LLM alone**.

This document is the honest, grounded roadmap. It states what is **built and verified today**, what
is the **next buildable brick**, and what is **deliberately out of scope** (and why).

---

## Design principles (non-negotiable, from the repo's working style)

- **Verify before build.** Everything here maps to real code in `backend/`, not to a pasted spec.
- **No scraping, no non-consensual data.** Rule #3 of the standing order (rejected 3×). We use
  *public, deterministic knowledge* (the astronomical solar calendar) and *legally-open trend
  signals* — never harvested personal or third-party ad data.
- **Not LLM-dependent.** The core engine is a pure, deterministic module. It returns correct answers
  offline and when every AI provider is down. An LLM may *dress up* the output later, but must never
  be *required* for the targeting to work.
- **Honest guidance, not fake statistics.** Category lists are well-known seasonal-demand patterns
  framed as guidance — not invented percentages.

---

## ✅ Brick 1 — BUILT & VERIFIED (this round)

**Module:** `backend/seasonal-engine.js` — pure, deterministic, no dependencies.
**API:** `GET /api/seasonal/recommend?zone=<zone>&date=YYYY-MM-DD` and `GET /api/seasonal/zones`.
**Test:** `backend/scripts/test-seasonal-engine.mjs` (`npm run test:seasonal`, 24/24), wired into the
CI no-server unit block.

### What it does
1. **Solar term for any date** — the 24 terms land on well-known Gregorian dates (±1 day); the table
   is exact enough to never be wrong by more than a day, and needs no network or ephemeris.
   Handles the Jan 1–5 wrap back to the previous year's 冬至.
2. **The core insight — the same term means a different *local* season per climate zone:**
   - `north_temperate` (จีนเหนือ/ญี่ปุ่น/เกาหลี/ยุโรป/อเมริกาเหนือ): the term's own season.
   - `south_temperate` (ออสเตรเลีย/นิวซีแลนด์/อเมริกาใต้ตอนล่าง): seasons **inverted** —
     北 midsummer = 南 midwinter.
   - `tropical` (ไทย/อาเซียน/เส้นศูนย์สูตร): no 4 seasons → mapped to **hot-dry / rainy / cool-dry**
     by month, while the solar term is still surfaced as the *China-facing export/marketing hook*.
3. **Category recommendations + 5-group actions** — per local season, a list of in-demand product
   categories (each with `key/th/en/why`) and a one-line action for each of producer, middleman,
   affiliate, partner-agent, consumer. Plus the **next term + a day countdown** so sellers stock up
   *before* the peak.

### Worked example (verified live)
`2026-07-24` = **大暑 (Major Heat)**:
| zone | local season | top categories |
| --- | --- | --- |
| north_temperate | summer | cooling · hydration · sun-protection |
| south_temperate | **winter** (inverted) | heating · warm-apparel · hot-food |
| tropical (ไทย) | **rainy** | rain-gear · quick-dry · moisture-control |

Same term, three genuinely different "what to push" answers — which is the whole point.

---

## ⏭️ Brick 2 — NEXT (documented, not yet built): trend-direction overlay

Upgrade the existing `POST /api/skills/trend` / `GET /api/trending` so that, on top of the seasonal
baseline, it answers *"global trend is moving in direction X → which product angle in this region
right now."* Constraints: aggregate only **legally-open** signals (the platform's own opt-in data,
public trend APIs the owner authorizes) — **never scraped** third-party ad/personal data. This is a
separate, testable change; it will land in its own round with its own mutation-tested guard.

## ⏭️ Brick 3 — LATER (needs owner decision): real per-region weather layer

The engine currently uses the *climatological* season of a zone. A real weather API
(temperature/rainfall/alerts per city) would sharpen "push cooling to the city having a heatwave
*this week*." This needs an API key + a network-policy decision, so it is **flagged, not guessed** —
owner chooses the provider and whether to enable outbound calls.

---

## Deliberately OUT of scope (and why)

- **"Scrape all the world's advertising data."** Refused — violates rule #3 (non-consensual
  collection) and copyright/PDPA. The public-calendar + opt-in-signal approach reaches the same
  business goal cleanly.
- **Guaranteeing income for everyone.** Code can't promise outcomes. This engine *increases the odds*
  by pointing effort the right way; it does not claim more than that.

---

## How each group uses it (today)

- **ผู้ผลิต (producer):** read the next-term countdown → produce/stock the top categories *before* the
  peak.
- **คนกลาง / พ่อค้าคนกลาง (middleman):** route in-season goods into the zones where they're peaking.
- **affiliate / partner / agent:** make content for the top categories and post *before* the peak to
  capture early volume.
- **ผู้บริโภค (consumer):** see what's genuinely useful and worth buying this period.

Call it: `GET /api/seasonal/recommend?zone=tropical` (or `north_temperate` / `south_temperate`).
