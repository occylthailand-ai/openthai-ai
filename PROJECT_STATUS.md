# OpenThaiAi — PROJECT STATUS (single source of truth)

Generated: 2026-07-11T08:11:00.945Z · branch `claude/daily-reporter-improvements-8vc9ct` (234 commit(s) ahead of main)

> Paste this whole file at the start of a Claude / Gemini / Grok conversation about this project
> so all three start from the same facts, pulled directly from the repo — not from memory.

## What this project actually is (read this before anything else)
- Git history: 444 commits, earliest 2026-04-02 — this is the entire real history, there is no earlier "locked" architecture beyond what's in this repo.
- README.md tagline (may be stale — see "Known stale documentation" below): "(none found)"
- Verified real backend stack (from backend/package.json): @anthropic-ai/sdk, @google/generative-ai, bcryptjs, cors, dotenv, express, express-rate-limit, jsonwebtoken, node-cron, node-fetch, nodemailer
- Payments: Omise (PromptPay + card), THB only. Database: Supabase Postgres only (no graph DB). Deploy: Vercel serverless, auto-deploy on push to `main` via Vercel's GitHub integration.
- If something you're reading (from any AI assistant, including this one) describes Neo4j, Stripe, USD/cross-border escrow, PCI DSS scope, or vessel/shipment tracking as part of this project — it is wrong. See DECISIONS_LOG.md below: those exact proposals were made and explicitly rejected on 2026-07-01.

## Decisions log (full history in DECISIONS_LOG.md — append-only, don't delete old entries)
# OpenThaiAi — Decisions Log

Append-only record of real architecture decisions **and rejected proposals**,
so Claude / Gemini / Grok (and any human) can check a claim about this
project's direction against what was actually decided, instead of trusting
whichever assistant last generated a confident-sounding paragraph.

Add a new dated entry at the top when a real decision is made or a scope-creep
proposal is rejected. Do not delete old entries — a wrong idea that was already
rejected once is worth remembering so it doesn't get silently re-proposed.

### 2026-07-11 — Hourly loop, run 98: extended the FAQPage JSON-LD to the /affiliate growth funnel (same drift-proof pattern); test now covers both pages

openthai-ai synced (HEAD 4d4b738). Direct follow-up to run 97: `/affiliate` (a core growth funnel) renders a visible FAQ (`T.faqs`) with the **same missing-FAQPage gap** /pricing had. Added FAQPage JSON-LD in `AffiliatePage.jsx` built from the **same `T.faqs` array** it renders (drift-proof), client-side (Google-only feature, Google renders JS), guarded for locales missing the key + escapes `<` — identical to the /pricing approach. **Generalized** `src/__tests__/pricingFaqSchema.test.jsx` to cover **both** `/pricing` and `/affiliate` via `describe.each`.

**Verified by running the real components in vitest/jsdom (12/12 pass** incl. existing `faqAccordionA11y`): each page emits exactly one valid FAQPage block; correct @context/@type; **one Question per rendered FAQ disclosure** (schema mirrors the visible FAQ, pinned so it can't drift); every Question has a non-empty name + acceptedAnswer.text. Committed + pushed (`3c7e0f3`) — draft **PR #79**. Both public FAQ pages now carry FAQPage structured data.

**Owner-decision backlog unchanged:** otop-ai-landing domain, all-platform-files domain (sitemap) + orphan-file cleanup, and openthai-ai #9 (affiliate commission on shop), #10 (dispute split), #11 (AI-usage-log migration), #12 (v9.0 build-out).

### 2026-07-11 — Hourly loop, run 97: added FAQPage JSON-LD to the flagship /pricing (Google FAQ rich-result eligibility) — an unblocked SEO win on the known domain; verified with a new drift-guard test

openthai-ai synced (HEAD 0a78af9). Diversified back to the **flagship** (known domain openthai-ai.com → SEO work here is NOT domain-blocked, unlike the satellites). First **verified two core areas clean** (recording so they aren't re-scanned): (1) the existing JSON-LD @graph in `frontend/index.html` (Organization + WebSite + SoftwareApplication) — its offer prices **exactly match** the real `SUBSCRIPTION_PLANS` in `backend/omise-payment.js` (Free 0 / Pro 299 / Premier 599 / Enterprise 1299 THB), so the structured-data pricing is accurate. (2) public `GET /api/shop/products` (`inventory.js`) exposes only id/sku/name/category/price/image/description/in_stock/stock — **no `cost`/margin leak** — and `adjust(type:'sale')` blocks overselling (`before+d<0` → "สต๊อกไม่พอ").

**Real unblocked SEO win shipped:** `/pricing` renders a visible FAQ (`t('pp.faq')`) but had **no FAQPage structured data**, so Google couldn't surface it as an FAQ rich result (expandable Q&A in the SERP — high-CTR on a core conversion page). Added FAQPage JSON-LD in `PricingPage.jsx` built from the **same `faq` array** the page already renders (so it can't drift from the visible Q&A). FAQ rich results are Google-only and Google renders SPA JS + reads DOM JSON-LD, so **client-side injection is sufficient** — deliberately NOT added to `prerender-meta.mjs`, since that would require duplicating the FAQ text into the build script (the exact drift risk CLAUDE.md warns against). Guarded for locales missing the key (filters to valid `[q,a]` pairs; renders nothing if none) and escapes `<`.

**Verified by running the real component in vitest/jsdom** (new `src/__tests__/pricingFaqSchema.test.jsx` + existing `faqAccordionA11y` unaffected → **10/10 pass**): exactly one valid FAQPage block; correct @context/@type; **one Question per rendered FAQ disclosure** (schema mirrors the visible FAQ — the test pins this so it can't silently drift); every Question has a non-empty name + acceptedAnswer.text. Committed + pushed to `claude/daily-reporter-improvements-8vc9ct` (commit `b688ebc`) — draft **PR #79**.

**Owner-decision backlog unchanged:** otop-ai-landing domain, all-platform-files domain (sitemap) + orphan-file cleanup, and openthai-ai #9 (affiliate commission on shop), #10 (dispute split), #11 (AI-usage-log migration), #12 (v9.0 build-out).

### 2026-07-11 — Hourly loop, run 96: verified the otop-ai-landing signup funnel is correctly wired (all 6 CTA paths map to real routes) + one mobile polish; og:image still domain-blocked

openthai-ai synced (HEAD 0e7f115). Examined **otop-ai-landing** in full (run 89 only checked its `<head>`). It's a single gateway page (no forms of its own — consent happens on the main platform's `/portals/*`, already verified solid in run 93). Since commit `5c1206a` a prior pass added Twitter tags + `og:image:width/height` + robots.txt.

**High-impact verification (the reason this page exists):** the 5 role CTAs + hub link all deep-link to `https://www.openthai-ai.com/portals/{producer,consumer,middleman,creator,affiliate}` and `/portals`. A single wrong path would silently 404 and kill signups (esp. producer = the supply side). Cross-checked every one against `frontend/src/App.jsx`'s route table → **all 6 map exactly to real routes**. Funnel is correctly wired.

**Shipped (real, unblocked, verified):** the page is dark-themed (`--bg #06070d`) and mobile-first for a Thai Android audience but had **no `<meta name="theme-color">`**, so the mobile browser toolbar stayed light and clashed on first impression. Added `<meta name="theme-color" content="#06070d">` matching the bg. Verified in jsdom: parses, exactly one theme-color = `#06070d`, all 5 role CTAs + h1 + title intact. Committed + pushed to `claude/daily-reporter-improvements-8vc9ct` of **otop-ai-landing** (commit `7403909`) — lands on existing **PR #1**.

**Still blocked on owner (unchanged, won't guess):** `og:image`/`twitter:image` on otop-ai-landing are relative (`og-image.png`); the OG spec wants absolute URLs and Twitter's `summary_large_image` needs one, but that requires **this deploy's own production domain**, which appears in no repo (its CTAs point to openthai-ai.com, but the landing deploys separately). Plus all-platform-files domain (sitemap) + orphan-file cleanup, and openthai-ai #9–#12.

### 2026-07-11 — Hourly loop, run 95: added SEO + Open Graph metadata to the 93 dashboard content pages (priority #2), and caught+fixed a real double-wrap defect my own run-92 pass left in affiliate-hub.html

openthai-ai synced (HEAD 5b6fe8d). Continued the market-reach thread on `all-platform-files`. After run 92 gave the 93 dashboard-reachable pages a proper `<head>` (mobile), they still had **no `<meta name="description">` and no Open Graph tags** — and they're both crawlable (linked from the dashboard) and shared on LINE/Facebook, so a bare share-card + no SERP snippet is a real reach gap. Added per page, all **domain-independent** (no production URL needed): `meta description` + `og:type/title/description/site_name/locale`, derived from each page's own `<title>` + subtitle; idempotent.

**Caught a real defect in my own run-92 output (verify-before-trust paid off):** the metadata check flagged `affiliate-hub.html` with **two `</head>`**. Root cause: it was actually a **full** document (`<html><head><style>…</head><body>`) that merely lacked a leading `<!doctype>`, so run 92's `hasDoctype && hasHead` fragment-detector mis-classified it and wrapped it again → nested `<html>/<head>`. It was the **only** originally-full page among the 93 (verified: the other 92 have exactly one html/head/body). Rebuilt it from the pre-wrap original (`git show c541f31:`) as a single clean document — `<!doctype html>` + `<html lang="th">` + viewport + title + the same SEO/OG metas in its existing `<head>`.

**Verified (jsdom + structural counts), not "should work":** all 93 pages now have exactly one html/head/body (no nesting) and a non-empty description + og:title/type/description; `<li>` step counts unchanged vs the prior commit on every fragment (bodies preserved); affiliate-hub keeps all 30 program cards + 30 links + its CTA and renders with title/lang=th/viewport/description; the coupang phase-switcher still toggles correctly after injection. Committed + pushed to `claude/daily-reporter-improvements-8vc9ct` of **all-platform-files** (commit `0515aa2`, 93 files) — draft **PR #1**.

**Owner-decision backlog unchanged:** otop-ai-landing domain, all-platform-files domain (sitemap) + orphan-file cleanup, openthai-ai #9–#12.

### 2026-07-11 — Hourly loop, run 94: smart-e deep review — verified order/payment/auth/LINE flows solid; fixed one real data-integrity gap (negative PromptPay amount) verified against the booted server

openthai-ai synced (HEAD 700ae02). Diversified to **smart-e** (Python commerce server, `server.py` 1016 lines) for a fresh-codebase pass beyond run 89's lighter review. Read the real handlers; **most of it is solid** (recording so it isn't re-swept):
- **Auth:** every `/api/*` route requires `X-Admin-Key` via `hmac.compare_digest`, fail-closed 503 when `ADMIN_KEY` unset; `/api/webhook/line` verifies LINE HMAC signature instead. So `_create_order` trusting client-supplied item price is **not** a vuln — it's admin/merchant order-entry, not customer checkout.
- **Orders:** `_create_order` validates items shape + coerces price≥0/qty≥1; `_update_order_status` validates the status enum, returns stock on cancel and re-decrements on un-cancel (no free stock via status flips), 404s on missing order.
- **Payments:** `_confirm_payment` 404s on missing id and is idempotent (flips status to 'paid', no side effects). 
- **LINE broadcast:** uses LINE's official `/v2/bot/message/broadcast`, which only reaches opt-in followers (LINE handles unfollow/block) — consent handled by the platform model; admin-gated. No consent gap.

**Real fix shipped — `_create_qr` negative-amount gap:** it validated that `amount` is numeric but not its sign. `generate_promptpay_payload` only adds the EMV amount tag when `amount and amount > 0`, so a **negative** amount silently produced an amount-less "payer enters amount" QR — while the `payments` row was still INSERTed with the negative value, polluting any revenue/stat aggregate summing `payments.amount`. Same input-validation class the smart-e PR has been closing (non-numeric `?limit`, order-status enum, missing-payment 404). Fix: reject `amount < 0` with a 400; **`amount == 0`/omitted is deliberately still allowed** — that's the valid dynamic "any amount" PromptPay QR the generator already supports.

**Verified against the booted server** (isolated DB under scratch `$HOME`, `ADMIN_KEY` set), not "should work": `amount=-50` → 400; `amount=0` → 200 with a payload carrying **no** `54` amount tag (dynamic QR preserved); `amount=100` → 200 with `5406100.00`; `amount="abc"` → 400 (pre-existing guard intact). `ast.parse` clean. Committed + pushed to `claude/daily-reporter-improvements-8vc9ct` of **smart-e** (commit `decbd8f`, full detail there) — lands on the existing **smart-e PR #1**.

**Owner-decision backlog unchanged:** otop-ai-landing domain, all-platform-files domain (sitemap) + orphan-file cleanup, and openthai-ai items #9–#12.

### 2026-07-11 — Hourly loop, run 93: verification run — swept the #1-priority consent/PDPA funnel end-to-end and confirmed it fully solid (negative result, logged so it isn't re-swept); surfaced 2 all-platform-files owner-decision items

openthai-ai synced (HEAD c9acce3). Diversified off the all-platform-files SEO thread back to the standing order's **top-listed** priority (consent-based registration funnel). Read the real code rather than trusting prior claims; **found no gap — everything is correctly wired**, so recording the negative result to prevent re-sweeping:

- **Backend `portal-leads.js`:** `submit()` hard-rejects `consent !== true` (400) and stores `consent:true` on the record; rate-limited 10/15min; dual-mode Supabase/file. `unsubscribe()` + `eraseByEmail()` both exported **and wired**: `GET /api/leads/unsubscribe` (server.js:147) validates the HMAC token + rate-limits; `sendConsumerDigest` skips `l.unsubscribed` (server.js:1107).
- **PDPA rights (server.js):** `/api/privacy/erasure/confirm` (6146) erases waitlist+consents+producers+**portal_leads**+affiliates (token-gated); `/api/privacy/access/confirm` (6219) returns all 7 categories incl. portal_leads (token-gated, §30/§31). The one open item (whether erasure should also purge/anonymise **orders/withdrawals** financial records, or retain under the accounting/tax exemption) is **already a logged owner-decision** from run 62 — not a new gap.
- **Email-injection defense:** `escapeHtml()` (server.js:853) is applied at every user-value insertion point across all 3 notification paths (order 874-879, dispute 928-930, portal-lead 950) + consumer digest — closing the `clip()` unclosed-`<` bypass. Affiliate withdrawal email interpolates `${promptpay}` unescaped but it's validated to exactly 10/13 **digits** upstream (server.js:1493-1496), so no injection.
- **All 9 frontend portal pages** (`/portals/*`): each holds `consent` state, gates the submit button (`disabled={!consent||busy}`), and **sends `consent` in the POST body** via the shared `submitLead()` — which posts the full payload and reports **honest** success/failure (`res.ok && data.success===true`), not fake success. The 9 page types exactly match backend `KNOWN_TYPES`.

**2 new all-platform-files owner-decision items surfaced (not acted on — scope/domain):** (a) **230 `OpenThaiAI_*_Roadmap.html` files are true orphans** — not linked from any page, no sitemap; they're deployed/publicly reachable by direct URL only and are older duplicates of the 93 live lowercase pages. Deleting 230 files is a product call for the owner. (b) the deployed dashboard site has **no `sitemap.xml`/`robots.txt`** — a real SEO gap, but a correct sitemap needs the site's **production domain**, which (like otop-ai-landing) appears in no repo. Both deferred rather than guessed.

**No code shipped this run** — the priority area is genuinely clean; fabricating a change would violate the repo's verify-before-build / no-marginal-change philosophy. Draft PR #1 (all-platform-files, runs 90-92) and the owner-decision backlog are unchanged.

### 2026-07-11 — Hourly loop, run 92: made all 93 dashboard-reachable content pages mobile-ready + SEO-valid (wrapped bare `<section>` fragments in a proper HTML5 shell; verified in jsdom)

openthai-ai synced (HEAD 081a9c0). Continuing the `all-platform-files` sweep. First ran a **full internal-link integrity check** across all 516 HTML files (href + JS-string `.html` refs) → **0 broken** — confirming run 91's Coupang fix was the last dead link.

**New real finding:** **515 of 516 files are bare `<section>` fragments** — no `<!doctype>`, `<head>`, charset, or viewport meta (only `index.html` is a full document). The dashboard cards navigate to them **directly** (`<a href>`, not fetch/embed — grep confirmed nothing embeds them), so each renders standalone as a headless fragment: **non-mobile-optimized** (no viewport → desktop-width, pinch-to-zoom) for a **Thai mobile-first audience**, no explicit charset, and no `<title>` (tab showed the filename). This degrades both real UX and mobile SEO on every content page users actually reach.

**Scope decision (standing order #8 — avoid over-reach):** limited the fix to the **93 pages actually reachable from the dashboard** (the `file:` targets + `affiliate-hub.html`). The other ~420 `OpenThaiAI_*_Roadmap.html` fragments are **orphans not linked from anywhere**, so I left them untouched rather than mass-editing 500+ files no user reaches.

**What shipped:** wrapped each of the 93 fragments in a minimal, correct, **idempotent** HTML5 shell — `<!doctype html>`, `<html lang="th">`, `<meta charset="UTF-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1.0">`, and a `<title>` derived from the page's own `<h2>`. Body content left **byte-for-byte unchanged**; wrapper is purely additive and skips any file already starting with `<!doctype>` (safe to re-run).

**Verified by running (not "should work"):** all 93 now have doctype+charset+viewport+title and a single (non-doubled) `<!doctype>` closing with `</html>`; `<li>` step counts **unchanged vs HEAD on every file** (bodies preserved); and in jsdom the wrapped naver + coupang pages expose `lang=th` + viewport + title and their phase-switcher scripts still toggle the correct section. Committed + pushed to `claude/daily-reporter-improvements-8vc9ct` of **all-platform-files** (commit `54dbdc6`, full detail there) — adds to **draft PR #1**.

**Still blocked on owner (not acted on, won't guess):** otop-ai-landing production domain (og:image/canonical/sitemap) + owner-decisions #9 (affiliate commission on shop), #10 (dispute split), #11 (migration 003), #12 (v9.0 build-out).

### 2026-07-11 — Hourly loop, run 91: fixed a real dead link on the deployed `all-platform-files` dashboard — the Coupang card had no roadmap file (built a genuine one, verified in jsdom)

openthai-ai synced (HEAD 0ac1070; PROJECT_STATUS regenerated clean). Continuing the `all-platform-files` sweep from run 90. Ran a **link-integrity check** on the deployed dashboard: extracted all 93 `file:` targets the platform cards link to and checked each on disk → **92 exist, 1 missing**. The **Coupang** card (`group:kr, steps:55, 30M+ KR`, type Marketplace) linked to `coupang-roadmap-section.html`, which **did not exist** — only `aff-coupang-affiliate.html` (a 2KB affiliate page) was present. Because `vercel.json` ends with a catch-all `{src:'/(.*)', dest:'/index.html'}`, clicking Coupang **soft-404'd back to the dashboard** — a dead click on an intended Korea-market platform.

**Fork considered (standing order #8):** three options — (a) delete the Coupang card (drops a platform the owner clearly intended, card metadata present), (b) point it at the affiliate page (misleading: "เปิด Roadmap" → affiliate), (c) build the missing roadmap. Chose **(c)** because it's the only option that neither drops an intended market nor misleads, and it directly serves the standing priority (help Thai sellers reach more markets). This is **not** fabrication in the CLAUDE.md sense: the other 92 cards are exactly this kind of factual how-to-sell guide; I wrote real, publicly-documented Coupang Wing seller steps, not invented repo features.

**What shipped:** `coupang-roadmap-section.html` matching the existing roadmap-section template exactly (namespaced `cp-` classes + `showCpPhase()` switcher, Coupang brand color `#E01E5A`), 9 sections totalling **exactly 55 steps** to match the card's `steps:55` — Coupang Wing signup + 통신판매업, Marketplace vs Rocket Growth fulfillment, listing + Item Winner/Buy Box, Coupang Ads, order/delivery SLA, and the Coupang settlement cycle. No card metadata changed.

**Verified by running (jsdom, 6/6), not "should work":** dashboard card links now 0 missing; tabs==9, phases==9, total `<li>` steps==55; step numbering contiguous 1..55 with no gaps/overlap; `showCpPhase` toggles exactly one correct phase for all 9 sections. Committed + pushed to `claude/daily-reporter-improvements-8vc9ct` of **all-platform-files** (commit `c541f31`, full detail there since that repo has no DECISIONS_LOG) — adds to the existing **draft PR #1**.

**Still blocked on owner (not acted on, won't guess):** otop-ai-landing production domain (for og:image/canonical/sitemap) + owner-decisions #9 (affiliate commission on shop), #10 (dispute split), #11 (migration 003), #12 (v9.0 build-out).

### 2026-07-10 — Hourly loop, run 90: diversified to the deployed `all-platform-files` dashboard — fixed a real hero-stat-clobber bug (verified in jsdom); otop-ai-landing SEO fix still blocked on owner (domain)

openthai-ai synced (HEAD 1e412c3; consistency-check clean, exit 0). openthai-ai + smart-e are saturated from prior runs, so I swept the remaining in-scope repos. Findings, so future runs don't re-scan:
- **all-platform-files** — deployed Vercel dashboard (`vercel.json` name `openthai-ai-dashboard`). The 35 `*Onboarding.jsx` files are **self-contained roadmap checklists** (local checkbox state only, no PII/API/credentials — no consent surface). **Real bug found + fixed in `index.html`** (see below).
- **otop-ai-landing** (from run 89, still open) — real defect: `og:image`/`twitter:image` are **relative** URLs (spec requires absolute → blank Twitter preview, inconsistent LINE/FB), plus no canonical/og:url/sitemap. The correct fix needs the page's **own production domain**, which appears in **no** repo (every CTA points to openthai-ai.com; the landing deploys separately). Guessing a domain would leave previews broken while looking fixed — worse than now. **Asked the owner** (run 89) for the domain; no answer yet, so NOT acted on (won't guess).

**The real bug fixed — `all-platform-files/index.html` hero stat clobber:** the hero advertises **"241 แพลตฟอร์ม"**, but `renderCards()` ran `document.querySelector('.hero-stats .stat:first-child .stat-num').textContent = filtered.length` on **every** render including the initial load — so on page load the headline silently flipped **241 → 93** (the real `platforms[]` array length), and dropped to **0** during a no-match search. The stat is labelled `แพลตฟอร์ม` (a marketing count), not "results", so this corrupted the hero on the most-visited surface. **Fix (index.html only, no domain/deploy change):** removed the hero overwrite so `241` stays as authored (the true cross-file total is the owner's marketing claim — I can't verify it from 515 files, so I did **not** change the number itself); added a dedicated `#resultCount` line above the grid for honest live filter/search feedback (`แสดง N แพลตฟอร์ม`); added an explicit empty-state (`ไม่พบแพลตฟอร์มที่ตรงกับการค้นหา`) instead of a blank grid on no match.

**Verified by running the real page script in jsdom (8/8), not "should work":** hero stays `241` after load and during filtering/empty search; `#resultCount` shows `แสดง 93 แพลตฟอร์ม` initially and `0` on no-match; all 93 cards render; empty-state appears on no match; a `shopee` search narrows the grid. Committed + pushed to `claude/daily-reporter-improvements-8vc9ct` of **all-platform-files** (full detail in commit `729635b`, since that repo has no DECISIONS_LOG); **draft PR #1** opened against `master`.

**Owner-decision items unchanged** (#9 affiliate-commission-on-shop, #10 dispute-split, #11 migration 003, #12 v9.0 build-out) + the run-89 open question: **what is otop-ai-landing's production domain?** (needed to fix its OG/canonical/sitemap).

### 2026-07-10 — Hourly loop, run 88: turned the hand-maintained SEO invariant (sitemap == robots Allow, all-public) into an automated regression-guard test + single source of truth

openthai-ai synced (HEAD f2721a6, run-87 `/earn` SEO shipped; consistency-check clean, exit 0). Run 87 (and 76, 84) each **manually** diffed the prerender ROUTES list against robots.txt and against the auth-gated routes before shipping a new public page. That manual cross-check is exactly the "hand-maintained thing that silently drifts" CLAUDE.md warns against — the moment a future change adds a page to the sitemap but forgets `robots.txt` (or advertises an auth-gated page), the drift ships silently as a real SEO defect. This run **codifies the check** so it can't.

**Two structural facts made it worth doing, both verified first (grep, not assumed):** (1) the canonical route list lived **inside** `scripts/prerender-meta.mjs`, which reads `dist/index.html` at import time — so no test could import the real list without a build. (2) The "sitemap URL set == robots Allow list" invariant + "every advertised path is a real PUBLIC route" were only ever enforced by me remembering to run a diff by hand.

**Shipped (build-config/test only — zero runtime/behavior change, verified below):**
- Extracted `DOMAIN` + `ROUTES` verbatim into a new side-effect-free module `frontend/scripts/seo-routes.mjs`; `prerender-meta.mjs` now imports them (single source of truth — the build script and the test consume the identical list). Build output is byte-identical.
- New `frontend/src/__tests__/seoInvariants.test.js` (5 tests) pins: sitemap set (`ROUTES` + `/`) **exactly equals** robots `Allow:` list; no advertised path is also `Disallow:`; **every advertised path is a public route in `App.jsx`** (regex-checks the `<Route>` element does NOT redirect to `/login` — advertising an auth-gated page makes Google index a login redirect / soft-404); every route has non-empty title+desc for OG tags; `DOMAIN` is the https origin robots' `Sitemap:` directive points at.

**Verified by running, not "should work":** confirmed the current tree satisfies all three invariants first (both-way diff of ROUTES vs robots Allow = IDENTICAL, 21 paths; all 21 map to public `<Route>`s with no `/login` redirect). Then proved the guard is **non-vacuous** — ran its auth-gated regex against a real gated route (`/skills-catalog`) → correctly detected the `/login` redirect; against `/store` → correctly passed. `npx vitest run` **56/56** (was 51; +5 new). `npm run build` → all 21 prerender pages + 22-url sitemap emitted identically after the extraction. Committed + pushed to `claude/daily-reporter-improvements-8vc9ct`; PR #79 already open.

**Owner-decision items unchanged** (#9 affiliate-commission-on-shop, #10 dispute-split, #11 AI-usage-log migration-applied?, #12 v9.0 build-out, + soft: index app/tool surfaces like `/skills-catalog`?). Nothing here touches them.

### 2026-07-10 — Hourly loop, run 87: systematic prerender-coverage audit found `/earn` (a homepage hero CTA) invisible to search/social — added it; deliberately left `/skills-catalog` for the owner

openthai-ai synced (HEAD 02fbc17, run-86 webhook-hardening shipped; consistency-check clean, exit 0). Followed up run 84's `/store` find with a **systematic** cross-check instead of a one-off: diffed the prerender ROUTES list against robots.txt's Disallow set and against every `navigate('/x')` on the public marketing pages, to surface any *other* public page that's linked but has neither prerendered meta nor an index directive. Two candidates fell out: `/earn` and `/skills-catalog`.

**Shipped `/earn`:** `EarnHubPage` ("ศูนย์สร้างรายได้") is a **homepage hero CTA** (LandingPage "💸 หารายได้", two buttons) and an explicitly **shareable** earning/affiliate landing (the page builds `https://www.openthai-ai.com/earn?ref=CODE` and says "แชร์ลิงก์นี้ได้เลย") — the exact `/store`-class gap: not in prerender ROUTES, sitemap, or robots.txt, so sharing it on LINE/Facebook showed the homepage's TikTok pitch. Added one ROUTES entry (`title: 'ศูนย์สร้างรายได้'` from the page's own `document.title`; `desc` a factual restatement of its verified real content — ready-to-ship products paid via PromptPay + affiliate commission 20–40% with a share link/clip) plus `Allow: /earn` in robots.txt (keeping run-76's "sitemap URL set == robots Allow" invariant). The one entry auto-propagates to the sitemap + a Home›ศูนย์สร้างรายได้ breadcrumb.

**Deliberately did NOT add `/skills-catalog`** (per standing-order restraint — don't force-fit): although it's public (no auth redirect) and homepage-linked, it reads as an **app/tool surface** (primary nav is "← Dashboard", light in-app theme, links to the /skills hub) rather than a share-on-LINE marketing page. Whether tool/app surfaces should be indexed is a judgment call for the owner, not something to decide unilaterally — noted here so it isn't re-scanned, and left for the owner to green-light if desired.

**Verified by running the build (not "should work"):** `npm run build` → `dist/earn/index.html` has `<title>ศูนย์สร้างรายได้ — Openthai.ai</title>`, the matching description, `canonical`/`og:url` = `/earn`, and valid `@graph` + `BreadcrumbList` (หน้าแรก › ศูนย์สร้างรายได้); `/earn` is in `dist/sitemap.xml`; the **invariant holds** — sitemap 22 URLs vs robots Allow 22, both-way diff empty (was 21/21). Full frontend suite **51/51**, no regression (build-config change). Committed + pushed to `claude/daily-reporter-improvements-8vc9ct`; PR #79 already open.

Owner-decision list unchanged (12 items) — plus a soft note above: does the owner want app/tool surfaces like `/skills-catalog` indexed too?

---

### 2026-07-10 — Hourly loop, run 86: hardened both signed-webhook signature checks to constant-time comparison (payment + LINE) — backend security

openthai-ai synced (HEAD dc842f6, run-85 focus-trap shipped; consistency-check clean, exit 0). Diversified from the frontend sweep to the **backend money path**. Audited the Omise payment webhook (`/api/payment/webhook`) end-to-end and **logged the parts that are already correct** so they aren't re-scanned: it uses `express.raw` + a raw-buffer HMAC (the global JSON parser is correctly skipped for it, server.js:125), `verifyOmiseWebhook` **fails closed** when `OMISE_WEBHOOK_SECRET` is unset (returns false + logs — no forged-payment bypass), and the handler is idempotent (`!rec.paid_at` guard before granting entitlements / crediting affiliates / finalizing shop orders). Solid.

**The real gap fixed (defense-in-depth on a payment path):** both signed webhooks compared the HMAC with a plain `===` / `!==` — **non-constant-time**. Constant-time comparison via `crypto.timingSafeEqual` is the established standard for webhook signatures (Stripe/GitHub/LINE SDKs all mandate it) because a plain string compare leaks, through response timing, how many leading bytes of the expected HMAC matched — a side channel an attacker can use to forge a signature byte-by-byte. Low practical exploitability over a network, but it's a recognized best-practice gap on the endpoint that grants paid entitlements + credits affiliate commissions, so worth closing. Fixes:
- `omise-payment.js` `verifyOmiseWebhook`: import `timingSafeEqual`; compare the hex HMACs constant-time, rejecting a length mismatch first (timingSafeEqual throws on unequal lengths) and guarding non-string input — still fails closed on missing secret.
- `server.js` `/api/line/webhook`: same constant-time compare on the base64 HMAC (its secret-absent skip is left as the documented dev-mode choice — lower severity since LINE events aren't a money path).

**Verified by unit-testing the real exported function (not "should work"):** a standalone ESM harness imported the actual `verifyOmiseWebhook` and asserted **10/10**: a correctly-computed HMAC is accepted; a tampered one, a wrong-**length** one (the case that would throw without the length guard), an empty one, an `undefined` one, and a valid HMAC-for-a-different-body are all rejected; and with the secret unset it fails closed. Also verified the identical constant-time pattern on **base64** digests (LINE's form) — valid accepted, tampered + wrong-length rejected without throwing. Both files pass `node --check`. (Backend has no committed test runner, so — as with the smart-e fixes in runs 74–75 — the verification harness was run live but not committed.) Committed + pushed to `claude/daily-reporter-improvements-8vc9ct`; PR #79 already open.

Owner-decision list unchanged (12 items).

---

### 2026-07-10 — Hourly loop, run 85: completed the checkout-modal focus-trap (the piece explicitly deferred in run 83) via a shared `useDialog` hook

openthai-ai synced (HEAD 75cc988, run-84 store-SEO shipped; consistency-check clean, exit 0). First **verified two more flows clean and logged so they aren't re-scanned:** (1) `DisputeTrackPage` (`/dispute`, the status page the run-83 checkout-success path links to) — `check()` verifies `d.success`, shows the real error otherwise, fetch wrapped, output React-escaped; solid. (2) **Affiliate ref-code case consistency** (a suspected attribution bug) — traced the whole path: `genRefCode()` uppercases (name `.toUpperCase()` + random `.toUpperCase()`), portal/auto signups get `AFF######` (uppercase), the backend stores `finalCode` and matches `a.ref_code === ref` exactly, and `AffiliateDashboard` `.toUpperCase()`s the lookup input — so every real code is uppercase end-to-end; **no mismatch** (and `buildRefLink`, which uppercases, turned out to be a *test-file-local helper*, not app code). No bug.

**The real work shipped (a11y completeness, unblocked):** run 83 gave the two checkout modals `role="dialog"`/`aria-modal`, Escape-to-close, and focus-in/return, but explicitly left the **Tab focus-trap** for later — without it, a keyboard user Tabbing through an open payment dialog eventually lands on the inert page behind it (WCAG 2.4.3 Focus Order). Also, run 83 left the accessible-dialog effect **duplicated verbatim** in `BuyModal` and `OrderModal`. Fixed both at once: extracted `src/hooks/useDialog.js` — a `useDialog(onClose)` hook that returns the dialog ref and provides Escape + focus-in + focus-return **+ the Tab/Shift+Tab trap** (queries the standard focusable set inside the container; wraps last→first on Tab and first→last on Shift+Tab). Both modals now call `const dialogRef = useDialog(onClose)` in place of the ~8-line inline effect (and dropped the now-unused `useRef` imports). Net: −16 duplicated lines, +1 shared, tested hook, and the trap that was missing.

**Verified by running the real components (not "should work"):** extended `src/__tests__/modalDialogA11y.test.jsx` — the 8 existing assertions (role/aria-modal/label, focus-in, Escape, backdrop-vs-content click) still pass through the hook, and a new per-modal test drives the trap: with the real `BuyModal`/`OrderModal` rendered, focusing the **last** control + Tab moves focus to the **first**, and focusing the **first** + Shift+Tab moves it to the **last**. Added `afterEach(cleanup)` so stale dialogs' document listeners can't cross-talk. **10/10 modal tests pass (5 × 2 modals); full suite 51/51 (was 49); `npm run build` exits 0.** Committed + pushed to `claude/daily-reporter-improvements-8vc9ct`; PR #79 already open.

Owner-decision list unchanged (12 items).

---

### 2026-07-10 — Hourly loop, run 84: the public `/store` page was invisible to search/social — missing from prerender meta, sitemap, AND robots.txt (SEO / go-to-market)

openthai-ai synced (HEAD 2df945e, run-83 modal-a11y shipped; consistency-check clean, exit 0). Diversified off the a11y sweep. First **verified two funnels clean and logged so they aren't re-scanned:** (1) `TrackOrderPage` (post-purchase tracking + dispute-open, the flow the run-83 modals link to) — `track()` and `openDispute()` both check `d.success`/`d.id` and show the real error otherwise (no fake-success), fetches are wrapped, output is React-escaped; solid. (2) `ProducerJoinPage` (`/join`, the producer-onboarding funnel *outside* `/portals/*`) — already has the PDPA consent checkbox + `disabled={busy || !consent}` + sends `consent` (a prior cycle added it, per its own header comment); no gap.

**The real gap shipped (SEO):** `/store` (the public "Openthai Store", `<Route path="/store">`) is a genuine commerce funnel — linked from the homepage footer (the `<a href>` I fixed in run 82) and the nav — but it was **missing from all three SEO surfaces**: not in `prerender-meta.mjs` ROUTES (so its `dist/store/index.html` served the homepage's TikTok-pitch `<title>`/OG to LINE/Facebook crawlers), not in the generated sitemap, and not in `robots.txt` Allow — even though its sibling `/catalog` had all three. Fix: added one ROUTES entry (`title: 'Openthai Store'`, `desc: 'สินค้าอย่างเป็นทางการจาก Openthai.ai'` — copied verbatim from the page's own `mk.store.title`/`mk.store.sub` Thai i18n) and `Allow: /store` to robots.txt. Because run-76's sitemap and run-80's per-route BreadcrumbList are both generated from that same ROUTES list, this one entry auto-propagates to the sitemap + a Home›Openthai Store breadcrumb; adding it to robots.txt too preserves run-76's **"sitemap URL set == robots Allow list"** invariant.

**Verified by running the build (not "should work"):** `npm run build` → `dist/store/index.html` now has `<title>Openthai Store — Openthai.ai</title>`, the matching description, `canonical`/`og:url` = `https://www.openthai-ai.com/store`, and two valid JSON-LD blocks (the inherited `@graph[Organization,WebSite,SoftwareApplication]` + a `BreadcrumbList` หน้าแรก›Openthai Store); `/store` now appears in `dist/sitemap.xml`; a script confirmed the **invariant holds** — sitemap 21 URLs vs robots Allow 21, both-way diff empty (was 20/20). Full frontend suite **49/49**, no regression (build-config change only). Committed + pushed to `claude/daily-reporter-improvements-8vc9ct`; PR #79 already open.

Owner-decision list unchanged (12 items).

---

### 2026-07-10 — Hourly loop, run 83: the checkout/order modals (Store + Catalog — the real purchase path) had no dialog semantics, no Escape-to-close, and no focus management

openthai-ai synced (HEAD 1b7fbb7, run-82 footer-a11y shipped; consistency-check clean, exit 0). Continued the accessibility sweep onto the **money path** — the two order modals real buyers use. Scanned the remaining interactive-`<div onClick>` sites and correctly **ruled the backdrop/stopPropagation divs NOT the run-81/82 bug class** (backdrop-click-to-close is a mouse convenience, and each modal already has a real `×` close button), but the scan surfaced the deeper modal-a11y gaps.

**The real gaps fixed (`StorePage.jsx` `BuyModal` + `CatalogPage.jsx` `OrderModal`, two near-identical inline modals):** grep confirmed **neither had `role="dialog"`, `aria-modal`, an Escape handler, or any focus management** anywhere in either file. For a payment/checkout dialog that fails the ARIA dialog pattern three ways: (1) screen readers don't announce it as a modal or convey its boundary, (2) keyboard users can't dismiss with Escape (the near-universal expectation), (3) focus stays behind on the trigger, so SR/keyboard users are stranded outside the dialog content they just opened. Fix (identical in both): added `role="dialog"` + `aria-modal="true"` + an `aria-label` (product name) on the dialog container, a `useEffect` that **moves focus into the dialog on open and restores it to the trigger on unmount**, and a document-level **Escape→onClose** handler (cleaned up on unmount); also gave the `×` button an `aria-label` on the Store side (Catalog already had one) and `tabIndex={-1}`+`outline:none` on the container so programmatic focus doesn't show a stray ring. (A full focus-**trap** — cycling Tab within the dialog — is the one remaining ARIA-dialog nicety not added here; noted as a possible future enhancement. Escape + focus-in + focus-return + role/label covers the highest-impact parts.)

**Verified by rendering the real components (not "should work"):** exported the two modals (named exports; default page exports unchanged) and added `src/__tests__/modalDialogA11y.test.jsx` — renders the **real** `BuyModal` and `OrderModal` and asserts each surfaces via `getByRole('dialog')` with `aria-modal=true` + a non-empty `aria-label`, that focus lands on the dialog on open, that **Escape** calls `onClose` once, and that a **backdrop** click closes while a click **inside** the dialog does not (stopPropagation intact). **8/8 new tests pass (4 assertions × 2 modals); full suite 49/49 (was 41); `npm run build` exits 0.** Committed + pushed to `claude/daily-reporter-improvements-8vc9ct`; PR #79 already open.

Owner-decision list unchanged (12 items).

---

### 2026-07-10 — Hourly loop, run 82: homepage footer nav links were mouse-only `<div onClick>` — converted to real `<a href>` links (a11y continuation of run 81)

openthai-ai synced (HEAD acf5b62, run-81 FAQ-a11y shipped; consistency-check clean, exit 0). Continued the keyboard-accessibility sweep from run 81 — same bug class (`<div onClick>` used as an interactive control), now on the highest-traffic public page. Scanned the interactive-div count across the public/funnel pages (LandingPage, Pricing, Catalog, Store, PortalHub, Contact, About, Affiliate) to target real user-facing violations, not force-fit changes.

**The gap fixed:** `LandingPage.jsx`'s footer (lines 351 & 359) rendered its **10 internal navigation links** (Services column: generator/pricing/store/catalog/find-producers/affiliate/join; Info column: about/privacy/terms) as bare `<div onClick={() => navigate(r)}>`. These are pure navigation, so the defect is double: **not keyboard-focusable and not announced as links** (WCAG 2.1.1 Keyboard + 4.1.2 Name/Role/Value) — keyboard/screen-reader users can't Tab to or activate the whole primary footer nav on the site's most-visited page. The sibling mailto item was already a correct `<a>`, so this was an inconsistency too. Fix: converted both to real `<a href={r}>` with an `onClick` that `preventDefault()`s and calls `navigate(r)` for SPA routing — real anchors are inherently focusable + SR-announced + support right-click/middle-click "open in new tab", while `textDecoration:'none'` + identical color/size keep the visual output pixel-identical.

**Verified by rendering the real component (not "should work"):** added `src/__tests__/footerNavA11y.test.jsx` — renders the actual `LandingPage` (in `MemoryRouter`, with `fetch` stubbed for its `/api/skills` mount call) and asserts all 10 internal footer targets are real `<a>` elements with the correct `href`, that they surface via `getByRole('link')` (keyboard-focusable + SR-announced), and that a click is `preventDefault`ed (SPA nav, no full reload). **3/3 new tests pass; full suite 41/41 (was 38); `npm run build` exits 0.** Committed + pushed to `claude/daily-reporter-improvements-8vc9ct`; PR #79 already open.

Owner-decision list unchanged (12 items).

---

### 2026-07-10 — Hourly loop, run 81: fixed a real keyboard/screen-reader accessibility gap in the FAQ accordions on the two public conversion funnels (/affiliate, /pricing)

openthai-ai synced (HEAD c0fa2f8, run-80 SEO structured-data shipped; consistency-check clean, exit 0). Scanned the consent-based registration funnel first (the standing order's #1 frame) and **logged it clean so future cycles don't re-scan:** all 9 `/portals/*` pages enforce consent uniformly (`disabled={!consent || busy}` on submit **and** send `consent` in the payload), the consent checkbox is wrapped in a `<label>` (clickable text + SR-associated), text inputs have `htmlFor`/`id`, and the **backend** enforces it server-side at multiple layers (`registerAffiliateCore` returns a 400 `ต้องยินยอม…` when `consent !== true`; the portal-leads submit path forces `consent:true`). Nothing to fix there.

**Considered but deliberately did NOT ship (scope/risk):** real FAQ sections exist on `/pricing` and `/affiliate`, so `FAQPage` structured data would be a strong Thai rich-result win — but Google requires the JSON-LD to match the *rendered* text exactly, and the two pages use two different multilingual i18n systems (`t('pp.faq.*')` vs an `AF.faqs` `[q,a]` array × 3 languages). Emitting matching JSON-LD from the separate build script would either duplicate that copy (drift risk CLAUDE.md explicitly warns against) or require a multi-file refactor to a shared imported FAQ module — scope-creep for one cycle. Left for a future dedicated pass.

**The real gap shipped (a11y — matches CLAUDE.md's "accessible platform" goal):** the FAQ accordions on both public funnels were bare `<div onClick>` toggles — `AffiliatePage.jsx`'s `FAQItem` (line 280) and `PricingPage.jsx`'s `faq.map` (line 84). A `<div>` with only `onClick` is **not keyboard-operable and not announced to screen readers** (WCAG 2.1.1 Keyboard + 4.1.2 Name/Role/Value): keyboard-only and SR users literally cannot open any FAQ answer on the two pages that most drive conversion. Fix: made each a proper disclosure — `role="button"`, `tabIndex={0}`, `aria-expanded={open}`, an `onKeyDown` that toggles on Enter/Space (with `preventDefault` on Space so it doesn't scroll the page), and `aria-hidden` on the decorative ▲/▼ caret. Purely additive — same visual styling, same mouse behavior.

**Verified by actually running the real components (not "should work"):** added `src/__tests__/faqAccordionA11y.test.jsx` that renders the **real** `AffiliatePage` and `PricingPage` (inside `MemoryRouter` + `ToastProvider`) and drives the DOM — asserts every FAQ disclosure is `tabindex=0` + `aria-expanded=false` collapsed, that **Enter** toggles `aria-expanded` open→closed, that **Space** toggles open **and** returns `preventDefault` (no page scroll), and that the caret flips ▼→▲ on activation. Result: **8/8 new tests pass; full frontend suite 38/38 (was 30), no regression; `npm run build` exits 0.** Committed + pushed to `claude/daily-reporter-improvements-8vc9ct`; PR #79 already open.

Owner-decision list unchanged (12 items).

---

### 2026-07-10 — Hourly loop, run 80: enriched SEO structured data (Organization + WebSite entities + per-route BreadcrumbList) — go-to-market

openthai-ai synced (HEAD 46097d4, run-79's PDPA fix + owner-decision #12 logged; consistency-check clean — every backend env var documented, registries agree). Both main codebases are heavily hardened, so this cycle took the **SEO / go-to-market** frame (explicitly allowed, low-risk, fully verifiable at build time, no owner decision, no production-domain blocker since `DOMAIN` is already a constant in the prerender script).

**First verified an existing claim before building on it (CLAUDE.md rule):** the homepage's existing `SoftwareApplication` JSON-LD hardcodes Pro=299 / Premier=599 / Enterprise=1299 THB. Grep of the real `PricingPage.jsx` (`pro:299, premier:599, enterprise:1299`) → **prices match**, so that block is factually correct (no inconsistent-structured-data bug to fix).

**The real gap shipped:** the site had only a bare `SoftwareApplication` node, and the per-route prerendered pages (`/portals/*`, `/pricing`, `/catalog`, …) carried **no page-specific structured data at all** — Google saw no brand/logo entity and no breadcrumbs, so funnel pages appeared in the SERP as bare URLs. Two coherent additions:
1. **`frontend/index.html`** — expanded the single JSON-LD block into an `@graph` linking the existing `SoftwareApplication` with a new **`Organization`** (name + url + `logo: /icon-512.png`, a real 512×512 square asset that ships in `dist/`) and a **`WebSite`** entity, cross-referenced by `@id`/`publisher`. Because `prerender-meta.mjs` copies the base `index.html` onto every route, all funnel pages now inherit the brand entity + logo. (No `SearchAction` added — there's no verified public search-results URL template, and fabricating one would be exactly the kind of unverified claim CLAUDE.md forbids.)
2. **`frontend/scripts/prerender-meta.mjs`** — emits a per-route **`BreadcrumbList`** (the one structured-data piece that must differ per page), hierarchy derived from the real path (child portals sit under `/portals`; everything else is one level under home), names reused from the same `ROUTES` titles that drive `<title>`/OG so the crumb matches the page. `JSON.stringify` + a `<`→`<` escape guarantee it can't break out of the `<script>` element.

**Verified by actually running `npm run build` (not "should work"):** base `dist/index.html` → one `@graph[Organization,WebSite,SoftwareApplication]` block that `JSON.parse`s clean; `dist/portals/producer/index.html` → inherited `@graph` **plus** a 3-level breadcrumb (หน้าแรก › ประตูสู่ OpenThai.ai › ทางเข้าผู้ผลิต); `dist/pricing/index.html` → inherited `@graph` + 2-level breadcrumb; all breadcrumb `item` URLs absolute + correct; `icon-512.png` + `og-image.png` confirmed present in `dist/`; `sitemap.xml` still emitted with 20 urls (no regression); **all 30 frontend unit tests pass**. Committed + pushed to `claude/daily-reporter-improvements-8vc9ct`; PR #79 already open for this branch.

Owner-decision list unchanged (12 items, incl. run-79's v9.0-deploy #12, run-78's AI-usage-logging #11, run-77's dispute-split #10, run-73's affiliate-commission-on-shop #9).

---

### 2026-07-10 — Hourly loop, run 79: verified the whole openthai-ai portal→email surface is already clean; shipped a real PDPA-consent gap fix in OpenThai-AI-v9.0's affiliate-hub form

**openthai-ai — verified clean (logged so future cycles don't re-scan):** chased a suspected "affiliate signups get no confirmation email" gap. `PORTAL_WELCOME_COPY` covers producer/consumer/middleman/creator/gov-thai/gov-intl/intl-org/foundation but **not** affiliate — which *looked* like the same class of gap a prior run fixed for gov/foundation. **Not a bug:** affiliate has its own dedicated `sendAffiliateWelcome()` (called inside `registerAffiliateCore`, backend/server.js:1304) that includes the ref_code + ref_link — richer than the generic copy could be, so affiliate is *intentionally* omitted from `PORTAL_WELCOME_COPY` to avoid a double email. Also re-verified `sendPortalLeadNotification` (the admin-inbox email) already escapes both key and value with `escapeHtml` (server.js:950) — no stored-XSS-into-admin-inbox. Net: the portal email surface is fully hardened; nothing to ship in openthai-ai this cycle. (Minor note, NOT shipped: `sendAffiliateWelcome`/`sendProducerApproval` interpolate `${name}`/`${company}`/`${product_name}` without `escapeHtml`, unlike every other render site — but these emails are delivered only to the applicant's *own* inbox, so it's self-only, not a real vuln; left as-is to avoid fabricating a marginal change.)

**OpenThai-AI-v9.0 — real fix shipped** (`app/affiliate-hub/page.tsx`): this pre-production scaffold's affiliate signup form collected PII (name, email, phone) and POSTed to `/api/affiliate/apply` with **zero PDPA consent** — no checkbox, no `consent` field in the payload, and `grep consent|pdpa|ยินยอม` across the whole repo returned nothing. Two concrete defects: (1) **consent gap** — directly contradicts the standing order's mandatory-consent rule (point 3) and the platform's PDPA-everywhere policy; the real backend `registerAffiliateCore` hard-rejects `consent !== true`, so *every* submission would also have failed. (2) **fake-success looseness** — checked only `data.success`, not `res.ok`, and `await res.json()` on a non-JSON response (e.g. a 404 HTML page — note v9.0 has no `/api/affiliate/apply` route of its own) would throw into the catch as a vague error. Fix: added a required consent checkbox linking to `https://www.openthai-ai.com/privacy`, block submit until checked (guard + `disabled={loading || !consent}`), send `consent` in the body, guard `res.json()` and require `res.ok && data.success` before showing success. Verified: repo has no build tooling (no package.json/tsconfig — README targets "Production Ready Q2 2026"), so ran a standalone `ts.transpileModule` (ReactJSX) check → **0 syntax diagnostics**. Committed + pushed to `claude/daily-reporter-improvements-8vc9ct` of OpenThai-AI-v9.0 (full detail in that commit message, since that repo has no DECISIONS_LOG). PR #5 (draft) opened.

**Owner-decision item #12 (surfaced by PR #5's CI):** opening PR #5 fired ~10 Vercel projects that are all wired to the OpenThai-AI-v9.0 repo, and nearly all of them **error on deploy**. Diagnosed as **pre-existing, NOT caused by the one-file PDPA fix**: the v9.0 repo has **no `package.json` / `next.config` / `tsconfig` anywhere** (confirmed on `origin/main` too), so `deploy.yml`'s `npm ci` + `npm run build` — and Vercel's Next build — fail immediately. The repo is an `app/`-dir scaffold (2 code files: a health route + this affiliate page) that has never been deployable. Making it deploy is architecturally significant — it means standing up the whole v9.0 Next.js stack (package.json + deps + next.config + tsconfig) **and** creating the missing `/api/affiliate/apply` backend route — well beyond a consent-checkbox fix, so per standing-order point 8 I did **not** do it unprompted. Two things for the owner: (a) do you want me to build out the v9.0 app so it actually deploys, or is v9.0 intentionally parked until Q2 2026? (b) ~10 near-duplicate Vercel projects (`openthai-ai-v9`, `open-thai-ai-v9-0`, `-5dm7`, `-6jqb`, `-sc3f`, `-ufv7`, `v905dm791`, …) all pointed at this one tiny repo looks like Vercel-dashboard misconfiguration worth pruning (that's in your Vercel account, not something I can fix from code).

---

### 2026-07-10 — Hourly loop, run 78: discovered the token/cost-tracking table the owner asked about (run 71) already EXISTS as dead schema — escalating to wire it up

openthai-ai synced (HEAD cb1d97d, run-77 deployed all-3-Ready). Ran `generate-project-status.mjs` — **no consistency-check failures** (every backend-referenced env var is documented in `.env.example`; skills/routes/migrations registries agree with code). Clean.

**The find (directly closes the loop on run 71's "which part uses the most tokens" question):** migration `backend/migrations/003_ai_usage_log.sql` defines a **complete AI cost-tracking schema** — `ai_usage_log` (per-request row: `endpoint`, `ai_source`, `model_id`, `input_tokens`, `output_tokens`, `cost_usd`, `cost_thb`, `response_ms`, `critic_score`, `user_id`…), `daily_cost_summary`, a `monthly_cost_per_user` view, indexes, and RLS. This is **exactly** the per-endpoint token/cost logging I said (run 71) the platform lacked. But a full-repo grep (`ai_usage_log|daily_cost_summary`) finds **zero** references in any `.js` — **nothing ever writes to or reads these tables.** It's entirely dead schema; the design plainly expects the app to `INSERT` into `ai_usage_log` on each AI call (no DB trigger populates it).

So the answer to run 71 improved: it's not that the platform *can't* log per-endpoint token usage — the table for it was **built and then never connected**.

**Why I'm escalating instead of just wiring it (step 8 + CLAUDE.md "verify before build"):** activating it safely needs facts only the owner has, and the repo's own rules forbid guessing them:
1. **Is migration 003 actually applied in the live Supabase?** The migration file says verbatim: *"Presence here means the SQL exists in the repo — it does **not** mean it has been run against the live Supabase project."* If it isn't applied, wiring `INSERT`s would just spew caught errors in prod.
2. **Scope/granularity:** true per-endpoint logging needs an `endpoint` label threaded through the ~50 `callAI()` sites (or logged at the `routeAI` level at coarser `taskType` granularity). Which does the owner want?
3. On Vercel **serverless**, a file-mode fallback is useless (ephemeral disk), so this feature only produces value via Supabase — reinforcing that #1 must be answered first.

**Ready to implement the moment the owner confirms:** a fire-and-forget, non-throwing `recordAiUsage()` in `routeAI` (it already computes provider, tokens, and `cost_usd` per call) that INSERTs into `ai_usage_log`, plus a small admin read endpoint / extend `/api/router/status` to surface real per-endpoint totals. This is item **#11** for the owner (the prior 10 unchanged, incl. run-77's dispute-split and run-73's affiliate-commission questions). No code shipped this cycle — the honest blocker is unverified prod migration state, which CLAUDE.md says not to build on.

---

### 2026-07-09 — Hourly loop, run 77: verification cycle — several modules audited clean; surfaced a real money-path finding for the owner (dispute "แบ่งครึ่ง"/split doesn't actually split)

openthai-ai synced (HEAD fa71772, run-76 deployed all-3-Ready). This cycle turned up no *cleanly-shippable, unblocked* bug — both main codebases are now heavily hardened — so it's an honest verification + escalation cycle rather than a forced change. Logged so future cycles don't re-scan:

- **Accessibility:** all 8 `<img>` in `pages/` + `components/` have `alt` text — no missing-alt gap.
- **`credits.js`** (free-tier credit economy, every user): `/api/credits/claim` requires `source ∈ ALLOWED_CLAIMS` whitelist (no arbitrary-source farming), idempotent per source, `addCredits` floors+clamps amount and balance, `consumeCredit` only decrements when `balance>0` (no negative balance), spin/checkin idempotent. Clean.
- **`disputes.js`** (escrow/arbitration): `open()` validates all fields + verifies the opener's contact matches the order's buyer/producer + blocks duplicate open disputes; `resolve()` is idempotent (won't re-resolve). Escrow is explicitly a **ledger flag** for humans to execute the real payout. Clean **except** the split finding below.
- **`smart-e` `_line_broadcast`:** returns an honest `sent` / `error:…` / `simulated` status — not fake success.
- **`otop-ai-landing`:** already fully audited run 39 (axe-core 0 violations, all 13 CTA links resolve, image dims 1200×655 match). Its one open issue — `og:image`/`twitter:image` are **relative** URLs (`og-image.png`) which social crawlers (LINE/Facebook) often won't render — can't be fixed to absolute without the production domain, which is **already the pending owner-decision item**. Not re-touched.

**⚠️ New finding flagged for the owner (financial/design decision, per standing-order point 8) — dispute "split" does not split:** the admin dispute UI (`AdminPage.jsx:613`) shows a **"แบ่งครึ่ง" (split in half)** button → `POST /api/disputes/admin/resolve` with `decision:'split'`. But `disputes.resolve()` maps `split` to escrow **`released`** + status **`resolved_supplier`** — i.e. it silently releases the **full** escrow to the supplier; the buyer gets nothing. The escrow model (`order.escrow_status ∈ {none,held,released,refunded}`) has **no partial-amount field**, so a real 50/50 split can't be represented, and the order's ledger flag will tell the team to pay the supplier in full. The AI-suggest prompt also offers `split` as a recommendation. Fixing it means deciding how a split should actually move money (ratio, partial-payout mechanics, ledger representation) — a money decision I won't guess. **Owner-decision item #10** (the prior 9 unchanged). Minimal safe options for the owner to pick from: (a) implement a real partial-split escrow amount, (b) relabel/remove the "แบ่งครึ่ง" button until (a) exists, or (c) define "split" as a documented manual process the note field drives.

---

### 2026-07-09 — Hourly loop, run 76: sitemap.xml is now generated at build time (fresh lastmod) instead of a stale hand-maintained file — SEO / go-to-market

openthai-ai synced (HEAD 78327b2, run-75 deployed all-3-Ready). Vercel webhooks were deploy-status only (a Canceled = normal build-supersede), nothing actionable.

**Scanned `credits.js` (the free-tier credit economy — affects every user) first; came back clean, logged so it isn't re-scanned:** `/api/credits/claim` requires `source ∈ ALLOWED_CLAIMS` (whitelist `{welcome:3}`) so no arbitrary-source credit farming; claims are idempotent per source; `addCredits` floors + clamps the amount to `[0, MAX_CLAIM]` and the balance to `[0, MAX_BALANCE]`; `consumeCredit` only decrements when `balance > 0` (no negative balance); spin/checkin are idempotent (per-day / `spun` flag). No money/quota bug.

**Shipped (SEO, go-to-market category):** `public/sitemap.xml` was a static file with `<lastmod>` hard-coded to **2026-05-03 on all 20 URLs** despite 2+ months of active development — search engines use `lastmod` to prioritise recrawls, so genuinely-changed pages were being deprioritised. It was also a **third hand-maintained copy of the route list** (with `prerender-meta.mjs` ROUTES and robots.txt) that would inevitably drift — exactly the "hand-maintained summaries that silently drift" problem CLAUDE.md warns about. The `postbuild` step (`scripts/prerender-meta.mjs`) already owns the canonical ROUTES list and runs after Vite copies `public/`→`dist/`, so I extended it to **emit `dist/sitemap.xml` from that same list**, with `lastmod = build date` (self-updating every deploy) and per-path priority/changefreq (1.0 homepage, 0.5 legal/info, 0.8 funnels). Deleted the static `public/sitemap.xml` → single source of truth.

**Verified:** `npm run build` emits `dist/sitemap.xml` with **20 URLs all dated the build day**, it parses as valid XML, and its URL set **exactly matches robots.txt's Allow list** (no drift, both-way diff empty). robots.txt still points at `/sitemap.xml`, served from `dist` as before.

Owner-decision list unchanged (9 items).

---

### 2026-07-09 — Hourly loop, run 75: smart-e — fixed the *root cause* of the crash class, not just the two symptoms (blanket dispatcher guard → 500 instead of empty reply)

**Change is in the `smart-e` repo** (own branch, no DECISIONS_LOG there — full detail in the commit message). openthai-ai synced (HEAD 47a8601, run-74 deployed all-3-Ready).

**Root-cause follow-up to run 74.** Run 74 patched the two known `int()`-on-query-param crashes individually, but the underlying problem is that Python's `BaseHTTPRequestHandler` does **not** convert an exception raised inside `do_GET/do_POST/do_PUT/do_DELETE` into an HTTP response — it logs a traceback and closes the socket, so the client sees an **empty reply (000)**. Any *other* uncaught handler exception (a DB error, an unexpected type, a malformed `Content-Length` in `read_body`, …) fails the same silent way.

**Fix:** extracted each dispatcher body into a `_dispatch_*` method and made `do_GET/POST/PUT/DELETE` thin wrappers that run it through a shared `_guard()`. `_guard` swallows `BrokenPipe/ConnectionReset` quietly, and for any other `Exception` prints the traceback and sends a clean `{'error': …}` **500** (itself guarded, in case headers were already sent). One place now converts the entire crash class to readable 500s — for current *and* future handlers.

**Verified live (not "should work"):** normal requests (`GET /api/products`, `/api/orders`, `/api/analytics?days=7`, and run-74's `?limit=abc`) all still return **200** (no regression); a **raw socket POST with `Content-Length: abc`** — which hits an unguarded `int()` inside `read_body`, a genuinely reachable crash the per-endpoint fixes didn't cover — now returns **HTTP 500** instead of an empty reply. `py_compile` passes. Pushed on smart-e's branch.

Owner-decision list unchanged (9 items).

---

### 2026-07-09 — Hourly loop, run 74: smart-e — two admin GET endpoints crashed the request on a non-numeric ?limit / ?days

**This cycle's change is in the `smart-e` repo** (own branch, no DECISIONS_LOG there — full detail is in the commit message). openthai-ai backend is now heavily hardened, so I diversified. Confirmed openthai-ai synced (HEAD c09cdc8, run-73 deployed all-3-Ready) and did a fresh crash-class + SQL-injection sweep of smart-e's `server.py`.

**Logged clean (so not re-scanned):** the two dynamic `UPDATE ... SET {','.join(fields)}` queries (products, customers) build column names from a **hardcoded whitelist** with `?`-parameterised values — no SQL injection. Search/filter WHERE clauses all use `?` placeholders. Path-id `int(m.group(1))` casts are guarded by `\d+` regexes.

**The real bug — crash-class on admin GET query params:** `do_GET` has **no try/except** around handler dispatch, so any handler exception propagates out of `BaseHTTPRequestHandler` and the connection closes with **no HTTP response** (client sees an empty reply / `000`). Two handlers cast a raw query param straight to `int`: `GET /api/orders?limit=abc` (`int('abc')`) and `GET /api/analytics?days=abc` — both `ValueError` → dead request. Same class as the POST-body validation already hardened on this branch (runs 59–61).

**Fix:** `/api/orders` parses `limit` in a try/except and only applies `LIMIT` for a positive int (else returns all); `/api/analytics` defaults `days` to 30 on non-numeric input and clamps to [1, 365].

**Verified live before/after on the real server (not "should work"):** before the fix `?limit=abc` and `?days=abc` returned **000** (empty reply); after, both return **200** and valid values (`?limit=1`, `?days=7`) still return 200. `py_compile` passes. Pushed on smart-e's branch.

Owner-decision list unchanged (9 items, incl. run-73's affiliate-commission-on-shop question).

---

### 2026-07-09 — Hourly loop, run 73: fixed PromptPay sales losing referral-channel attribution (run-72 follow-up); flagged an affiliate-commission gap for the owner to decide

PR #79: run 72 deployed all-3-Ready. No actionable webhook events (Vercel status only).

**Continued auditing the shop money path from the frontend side down — all clean, logged so it isn't re-scanned:** `StorePage.jsx` checkout correctly checks `r.success` and shows the server error otherwise (no fake-success), and renders the PromptPay QR from `res.qr_image_url` — which the backend really returns (`createPromptPayCharge` → `charge.source.scannable_code.image.download_uri`, spread into the checkout response), so field names match and the QR shows. The public `/api/shop/products` maps to a **public view that excludes `cost`** (no margin/business-data leak).

**Shipped fix — PromptPay sales lost referral-channel attribution (a small inconsistency the run-72 fix introduced):** the sync **card** path records the checkout's computed `channel` (`ref:<code>` when the buyer arrived via an affiliate link, else the platform) on the inventory `sale` movement, but the async **PromptPay** finalize in the Omise webhook hardcoded `'store'` — the channel was never in the charge metadata, so the webhook had nothing to record. Fix (**reporting/attribution only — no commission/payout logic touched**): include `channel` in both card & PromptPay charge metadata, and have the webhook use `data.metadata.channel` (fallback `'store'`). Verified live (HMAC-signed webhook): a PromptPay checkout with `ref=aff123` → signed `charge.complete` → the `sale` movement now has `platform: 'ref:aff123'` (was `'store'`). `node --check` passes; data dir snapshotted + restored.

**⚠️ Flagged for the owner (NOT acted on — financial/product decision, per standing-order point 8): should affiliates earn commission on marketplace product sales?** Evidence it may be an intended-but-incomplete feature: (1) `StorePage.jsx` already sends `ref` (from `localStorage.otai_ref`) into `/api/shop/checkout`; (2) `/api/shop/checkout` captures it into the movement `channel`; (3) the affiliate program copy explicitly advertises "ขายสินค้าจาก OpenThai.ai และรับค่าคอมมิชชั่นสูงสุด 30%"; (4) `creditAffiliateSale()` exists and is wired for **subscription/quickpay** payments (charge-status poll + webhook) — **but shop checkout never calls it**, so an affiliate who drives a physical-product sale currently earns **nothing**. This is a promise-vs-reality gap on a core growth funnel, but wiring commission = paying real money (rate, timing, idempotency, refund-clawback all need deciding), so it needs the owner's call rather than a guess. This is now item #9 of the pending owner-decision list (the prior 8 unchanged).

---

### 2026-07-09 — Hourly loop, run 72: PromptPay shop orders were never finalized — customers paid but stock wasn't cut and orders stuck 'new' (real money-path bug)

PR #79: run 71 deployed all-3-Ready. No actionable webhook events (Vercel status only).

**Audited the shop/order/payment money path** (core marketplace, real THB). Most of it is genuinely well-built and I logged the negatives so they aren't re-scanned: `/api/shop/checkout` computes `amount` from the **server-side** product price (no client price-tampering), clamps qty to [1,999], checks stock, and returns 404/400/409 correctly; all `/api/orders/admin/*` and `/api/disputes/admin/*` endpoints check `checkAdminKey`; public `/api/orders/track` requires the **contact to match** and returns no name/address (no IDOR/PII leak); SEO is fully consistent (prerender routes == sitemap, per-route title/desc/canonical/OG/twitter, og-image.png is a real 1200×630 matching its declared dims). `orders.place()` requires contact so the `track()` `o.contact.toLowerCase()` path isn't reachable with a null contact.

**The one real bug found — PromptPay checkout never completes:** card checkout finalizes synchronously in-request (cut stock + mark `confirmed`), but PromptPay returns a QR and expects the Omise `charge.complete` webhook to finalize later, tracking the order only via the charge's `metadata {order_id, product_id, qty}`. The webhook handler (`/api/payment/webhook`) only looked up **subscription** payments (`payments.find(p => p.charge_id === data.id)`) — shop checkout never creates a `payments` record, so a completed PromptPay charge matched nothing and finalized nothing. A customer scans the QR, **pays real money, but the order stays `new` forever and stock is never decremented** → invisible-paid orders + overselling, on a primary Thai payment method.

**Fix (`server.js`, webhook handler):** in the `charge.complete` branch, also finalize shop orders from `data.metadata` — when `order_id` + `product_id` are present, look up the order and, **only if still `new`** (idempotent — card orders are already `confirmed`, duplicate webhooks are no-ops), `inventory.adjust(-qty, 'sale')` + `orders.setStatus('confirmed')`. Subscription flow untouched; the guard needs both `order_id` **and** `product_id`, which only shop checkout sets, so no collision with plan/quickpay charges.

**Verified live end-to-end (test `OMISE_WEBHOOK_SECRET`, real HMAC-signed webhook):** seed product stock 10 → PromptPay checkout qty 3 leaves order `new` & stock 10 (**reproduces the bug**) → signed `charge.complete` webhook → stock **7** & order **`confirmed`** → resending the same webhook keeps stock 7 (**idempotent**) → a **bad signature is rejected 401**. `node --check` passes; data dir snapshotted + restored, `git status` clean. Pushed on the branch.

8 items still pending an owner decision, unchanged.

---

### 2026-07-09 — Hourly loop, run 71: owner asked "which part uses the most tokens" — answered from code, then fixed a real Thai-undercount bug in the AI budget governor it exposed

**Owner question this cycle:** "ส่วนไหนกินโทเค้นเยอะที่สุดของ OpenThaiAi". Answered from the real code (every `callAI(prompt, maxTokens)` site + measured prompt sizes), no guessing:
- Heaviest **per call**: `/api/ultra-promo` — input prompt ~11,449 chars (~4,600 tok) + `callAI(prompt, 6000)` ≈ **~10,600 tok/call**; `/api/pr/global-content` — `callAI(prompt, 8000)` (biggest single output) ≈ ~9,400 tok/call. Then content-benchmark (4000), pr/daily-content (3000), catalog-ai/generate + skills/kol-brief (3000 each).
- The marketing/PR skills (big few-shot JSON-template prompts + high `max_tokens`) are the token hogs; the flagship `/api/generate` and `/api/chat` are **light** (1024 output).
- Honest caveat given to owner: these are **per-call** weights from code; true **totals** need runtime request-count logging, which the code alone can't show.

**Real bug the investigation exposed (and fixed this cycle):** the Smart Model Router already has a cost governor (`routeAI`/`routerState`, exposed at `GET /api/router/status`) that sums estimated tokens → USD → trips **Eco Mode** (cheap-models-only) once `AI_DAILY_BUDGET_USD` (default $1) is hit. But its estimator was `estTokens = len/4` for **every** language. Thai/CJK tokenize far denser (Thai ~1 token per 1–2 chars, not 4), so on this Thai-first platform `spentUsd` accumulated ~2–3× slower than real spend → **Eco Mode fired ~40% too late**, and `/api/router/status` under-reported cost. Rewrote `estTokens` to classify chars: Thai (U+0E00–0E7F) ~1 tok/1.5, CJK ~1 tok/1.3, else ~1 tok/4 (Latin unchanged).

**Verified (pure function, real inputs + boot):** pure-English **1.00×** (unchanged — no regression for Latin), pure-Thai **2.65×**, Chinese **3.00×**, mixed th/en hook 1.68×, real 11,449-char ultra-promo prompt 2863→3702 tok (1.29×, it's mostly Latin JSON scaffold). `node --check` passes; server boots and `GET /api/router/status` still returns valid JSON with the estimate in the hot path. Data dir snapshotted + restored, `git status` clean. Pushed on the branch.

**Offered as a possible follow-up (NOT built — needs owner OK):** real per-endpoint token-usage logging (capture `usage.input_tokens/output_tokens`, aggregate by skill, expose a dashboard) to turn the per-call estimates into measured totals. 8 items still pending an owner decision, unchanged.

---

### 2026-07-09 — Hourly loop, run 70: the homepage hero waitlist (highest-traffic consent funnel) faked success on network error and gave zero feedback on rejection — fixed

PR #79: run 69 (portal fake-success fix) deployed all-3-Ready. No actionable webhook events (Vercel redeploy status only).

**Continued the run-69 consent-funnel audit into the non-portal lead paths.** Checked `/join` (ProducerJoinPage — already correct, checks `d.success`), ContactPage (already correct — success/else/catch all handled), and the homepage hero email capture on `LandingPage`. The last one was broken:
```js
const data = await res.json();
if (data.success) setJoined(true);   // no else
} catch (_) { setJoined(true); }      // "show success anyway"
```
`/api/waitlist` really rejects with **400** (invalid email), **429** (`waitlistLimiter` — only **3/hour per IP**), or **500**, each with a helpful Thai message. Two failure modes, both bad: on any rejection `data.success` is false and there's **no else**, so the visitor gets **zero feedback** — the email isn't saved, nothing tells them, and they may retry straight into the 3/hr limit; and on a network error the catch set `joined=true`, showing the ✅ "you're on the list" screen while **nothing was sent** (the comment literally said "show success anyway"). This is the single highest-traffic consent point on the platform.

**Fix (1 file, `LandingPage.jsx`):** show the joined screen only on a real save (`res.ok && data.success`); otherwise surface the backend's own message (or a localized th/en/zh fallback) in an inline `role="alert"`, keep the form on screen, and clear the error when the visitor edits the email. Guarded the JSON parse against non-JSON bodies.

**Verified live end-to-end (real backend + vite dev proxy + real Chromium via Playwright):** a valid email replaces the hero form with the joined screen and shows no error (lead saved); after exhausting the real 3/hr limiter (statuses 200,200,429) the next submit **keeps the form** and shows `⚠️ ส่งคำขอบ่อยเกินไป กรุณารอแล้วลองใหม่` (the backend's real 429 message) instead of a fake ✅. `npm run build` passes; backend data dir snapshotted + restored, `git status` clean.

**Consent-funnel fake-success sweep is now complete:** all 9 `/portals/*` (run 69) + `/join` + Contact (already correct) + homepage waitlist (this run) either check the real response or were already doing so. 8 items still pending an owner decision, unchanged.

---

### 2026-07-09 — Hourly loop, run 69: every /portals/* signup showed a fake ✅ success even when the backend rejected the consented lead — fixed all 9

PR #79: run 68 was a smart-e change; openthai-ai's last deploy was the run-68 log commit (all-3-Ready). No actionable webhook events (Vercel redeploy status only).

**Found by scanning the consent funnels (the platform's #1 priority) for the fake-success bug class** (run-52 lesson: frontend ignoring `res.ok`). All 9 `/portals/*` pages submitted with `try { await fetch('/api/leads/submit', ...) } catch {}` then `setSent(true)` — showing the ✅ "we received your application / we'll email you" screen **unconditionally**. But `fetch()` doesn't throw on HTTP 4xx/5xx, so the empty catch never fired, and the backend genuinely rejects submissions: **400** (missing PDPA consent / invalid email), **429** (`submitLimiter` 10/15min per IP), **500** (server/DB). In every one of those, a *consenting* applicant was told they signed up while **no lead was saved** — the platform silently loses the signup and the person waits for emails that never come. This is the exact promise-vs-reality gap `server.js`'s own `PORTAL_WELCOME_COPY` comment already flagged (run 67 added the welcome email, but it only fires when the lead is actually saved — this fixes the case where it isn't).

**Fix (10 files, frontend):**
- New shared helper `frontend/src/pages/portals/submitLead.js` — single source of truth: POSTs the lead and returns `{ ok:true, id }` only on a real save (`res.ok` **and** `body.success === true`), else `{ ok:false, error, status }` surfacing the backend's own Thai message; `leadError()` gives a localized (th/en/zh) fallback for network/parse failures.
- All 9 portals (producer, consumer, middleman, creator, affiliate, gov-thai, gov-intl, intl-org, foundation) now await it, keep the form on screen with an inline `role="alert"` error on failure, and only show the success screen on a genuine save. Added a `busy` state so the button disables during the request (no double-submit). Removed the now-unused `apiUrl` import from each page.

**Verified live end-to-end (real backend + vite dev proxy + real Chromium via Playwright), not "should work":** a valid submit shows the success screen and saves the lead (200); then, after exhausting the real rate limiter (9×200 then 429), the next submit **keeps the form** and shows `⚠️ ส่งฟอร์มบ่อยเกินไป กรุณารอแล้วลองใหม่` (the backend's real 429 message) instead of a fake ✅. `npm run build` passes; backend data dir snapshotted + restored, `git status` clean.

8 items still pending an owner decision, unchanged.

---

### 2026-07-09 — Hourly loop, run 68: closed a real stored-XSS in the smart-e admin dashboard reachable by any external LINE user

PR #79 (openthai-ai): run 67's producer-welcome fix deployed all-3-Ready; the only new webhook events were Vercel deploy-status updates (all Ready), nothing actionable.

**This cycle's task was in the `smart-e` repo** (its own repo, own branch — no DECISIONS_LOG there, so the full record is here + in the commit message). Code-scanned `index.html`, the admin dashboard: it builds every table/list/form via `innerHTML` template literals with **no output encoding** (22 `innerHTML` sites, 0 `escapeHtml`). User- and externally-controlled strings were interpolated raw.

**The genuine vulnerability — stored XSS via LINE, reachable by unauthenticated external users:** `server.py`'s `_line_webhook` stores the raw `event.message.text` from any LINE user into `line_messages.message` with no sanitization, and `renderLine()` printed `${m.message}` straight into a `<td>` via `innerHTML`. So a LINE user messaging the Official Account could send `<img src=x onerror=...>` / `<script>` that executes **in the admin's browser with their session** the moment they open the LINE tab. The webhook is HMAC-signature-verified (good — that authenticates it's really from LINE's platform), but the *message body* a real customer types is still attacker-controlled untrusted input. Sender display-name (from the LINE profile) is the same class of input.

**Fix (1 file, `index.html`):** added an `escapeHtml()` helper (escapes `& < > " '`) next to the other formatters and applied it to every user/external-controlled field rendered via `innerHTML` — LINE message text + sender name; `customer_name` across orders/payments/dashboard-recent/TikTok orders; product name/description/category; customer name/email/phone/line_display_name; items_summary/items_json; the category & channel `<option>` lists. Also escaped values interpolated into `value="…"` / `data-*="…"` attributes and `<textarea>` bodies in the product/customer/settings edit forms, so a stored quote can't break out of the attribute (attribute-injection variant of the same bug).

**Verified live with a real browser (not "should work"):** booted the server with a test `LINE_CHANNEL_SECRET` + `ADMIN_KEY`, sent `<img src=x onerror="alert(1)">HELLO_XSS` through the **HMAC-signed** `/api/webhook/line`, confirmed via `/api/line/messages` it is stored **raw** (input path is vulnerable), then rendered the dashboard in real Chromium via Playwright with the admin key seeded in localStorage. Post-fix: the cell `innerHTML` is `&lt;img …&gt;HELLO_XSS`, **zero** `<img>` elements are injected, and **no** alert / `onerror` fires (`window.__XSS_FIRED` stays 0). A bad webhook signature is still rejected 401. Committed + pushed on `claude/daily-reporter-improvements-8vc9ct` (smart-e).

8 items still pending an owner decision, unchanged.

---

### 2026-07-09 — Hourly loop, run 67: producers were the only signup funnel with no confirmation email — now they get one on both signup paths (the #1 growth priority)

PR #79: run 66's email-domain fix deployed all-3-Ready.

**Found by asking which consent funnels actually acknowledge the applicant.** Every signup type sends the applicant an immediate "we received your application" email — consumer / middleman / creator / gov-thai / gov-intl / intl-org / foundation via `PORTAL_WELCOME_COPY`, affiliate via `sendAffiliateWelcome` — **except the producer**, which is the platform's core funnel (the whole point is selling Thai products). A producer who submitted their business + product details heard nothing until (and only if) an admin later approved them. Both producer paths were silent: `/portals/producer` reached `sendPortalWelcomeEmail` but there was no `producer` key in the copy set (so it returned early), and `/join` → `/api/producers/apply` → `producers.register()` never sent anything. This is exactly the promise-vs-reality gap the code's own consumer/middleman comment (line ~972) already established as a bug.

**Fix (2 files, backend):**
- `server.js`: added a `producer` entry to `PORTAL_WELCOME_COPY` (th/en/zh) — this alone fixes `/portals/producer`. The copy states the *real* flow (pending → admin review → approval email with a manage-listings link), no false "you're live" promise.
- `producers.js`: added an `onApply` hook to `createProducers`, fired **only** from the `/api/producers/apply` route handler (not from `register()` itself, so the `/portals/producer` path — which also calls `register()` via `handleNewPortalLead` — can't double-send) and only for new applicants, not re-submits. `server.js` wires `onApply` to the same welcome email.

**Verified live end-to-end against a local capture SMTP (wrote a minimal Node SMTP stub since `smtp-server` isn't installed):** a `/join` producer signup sent exactly one 📦 producer-welcome to the applicant; a `/portals/producer` signup sent one welcome to the applicant plus the admin lead-notification; a re-submit of the same `/join` email sent **no** duplicate; neither path double-sends. Decoded the captured MIME subject to confirm it's the producer-welcome copy. `node --check` passes; only the two backend files changed; data dir snapshotted + restored, `git status` clean. Pushed on `claude/daily-reporter-improvements-8vc9ct`.

8 items still pending an owner decision, unchanged.

---

### 2026-07-09 — Hourly loop, run 66: price-consistency + money-path sweep came back clean; fixed the one real defect found — broken hr@/ir@ email domain on the corporate pages

PR #79: run 65's price fix deployed all-3-Ready.

**Swept the whole price/money surface first (continuing run 65) — all consistent, logged so it isn't re-swept:** no stale ฿20/฿30 Pro/Premier price remains anywhere (the ฿30 hits are ad-budget CPM KPIs); the authoritative `SUBSCRIPTION_PLANS` (omise-payment.js) is Free 0 / Pro 299 / Premier 599 / Enterprise 1299 and the charge uses `plan.price_thb`; the entitlement system is correct — `grantEntitlement` sets `expires_at = +1 month` and `getEntitlement` downgrades expired ones to free; `checkQuota` gates free users at the daily limit with a bonus-credit fallback; the SPA has a real `*`→`NotFoundPage` catch-all with a helpful, funnel-linked 404. Nothing to fix in any of these.

**The one real defect found:** the careers (`HRPage`) and investor-relations (`InvestorRelationsPage`) pages listed contact emails at `Openthai.ai.com` — a domain this org does not use (every other email on the site is `@openthai.ai`; 15 usages). `hr@Openthai.ai.com` / `ir@Openthai.ai.com` would bounce, so a candidate or investor copying the on-page address couldn't reach anyone. Corrected both to `@openthai.ai` and made the IR one a clickable `mailto:` like the HR page. These pages are auth-gated (`/corporate/hr`, `/corporate/ir`), so it's staff-facing, not a public-SEO change.

**Verified:** grep confirms no `.ai.com` remains and the exact corrected addresses; `npm run build` passes (the IR edit adds a JSX `<a>`, so compilation is the meaningful check for a static contact-link fix). Only the two corporate page files changed.

**Also flagged for the owner (not changed):** `index.html`'s `twitter:site` is `@Openthai.ai`, which is not a valid X/Twitter handle (handles can't contain a dot) — needs the real handle or removal; left for the owner since the correct handle is unknown (guessing one would attribute cards to a wrong/nonexistent account). This is a small note, not a formal escalation; the 8 prior owner-decision items are unchanged.

---

### 2026-07-09 — Hourly loop, run 65: the free-quota "upgrade to Pro" prompt still quoted the stale ฿20 price (real Pro is ฿299) — right in front of the most conversion-ready users

PR #79: run 64's privacy-UI change deployed all-3-Ready. Moved off the PDPA thread to the flagship AI-generator path.

**Found while reading `/api/generate`.** When a free user hits the daily limit, the 429 response said `อัพเกรดเป็น Pro (฿20/เดือน)`. But ฿20 is the same stale price run 57 already corrected in the homepage JSON-LD — the real Pro price is **฿299/month** (`PricingPage.jsx` `PP_META`, `PaymentPage`, the fixed structured data). So the upgrade prompt shown to exactly the users most likely to convert (the ones who just ran out of free quota) quoted a price **15× too low**; clicking through lands on ฿299. Same fabricated-price class as run 57, still living in the quota path — and in a spot with direct revenue/trust impact.

**Grepped for every occurrence, fixed all four:** the backend 429 message (`server.js:355`) and the `gen.quota.upgrade` string in all three languages (`i18n/index.jsx` th/en/zh). Confirmed no other ฿20 Pro-price reference remains anywhere in backend or frontend (the ฿30 hits are ad-budget CPM KPIs from marketing-skill output, unrelated).

**Verified live:** booted the backend, made 3 free generations (all 200), and the 4th and 5th returned **429 with `อัพเกรดเป็น Pro (฿299/เดือน)`**; `npm run build` passes (i18n compiles). Only `server.js` + `i18n/index.jsx` changed; data dir snapshotted + restored, `git status` clean. Pushed on `claude/daily-reporter-improvements-8vc9ct`.

8 items still pending an owner decision, unchanged.

---

### 2026-07-09 — Hourly loop, run 64: the PDPA access/erasure endpoints (runs 62-63) had no UI — the privacy page now lets users actually exercise those rights

PR #79: run 63's access endpoint deployed and settled all-3-Ready. This closes the loop opened by runs 62-63: the backend rights exist, but a real visitor still had no way to invoke them.

**Found by asking "can a real user actually reach the endpoints I just built?"** `PrivacyPage.jsx` listed the PDPA rights (สิทธิเข้าถึง / ลบ / พกพา) as static cards and told people to email `privacy@openthai.ai` — the only frontend caller of `api/privacy/*` was the SDK file, not the UI. So `/api/privacy/access` (run 63) and `/api/privacy/erasure` (run 62) were unreachable through the site; "accessible platform" means a person can *use* a right, not just read that they have it.

**Fix (frontend only, `PrivacyPage.jsx`):** added a "ใช้สิทธิของคุณด้วยตนเอง" section — an email field + `📋 ขอดูข้อมูลของฉัน` and `🗑 ขอลบข้อมูลของฉัน` buttons that POST to the real endpoints via `apiUrl`. Both backends email a tokenised confirm link before doing anything, so the UI can't leak or delete another person's data. The handler checks `res.ok` before showing success and otherwise surfaces the server's own Thai message (run-52 fake-success lesson); client-side email validation gives immediate feedback. Sections renumbered (security 7→8, DPO 8→9).

**Verified live in a real browser (Playwright against the built `dist`, proxied to a running backend so the buttons hit the real API):** the new section renders; an invalid email shows the inline `กรุณากรอกอีเมลให้ถูกต้อง`; a valid email on *both* `ขอดูข้อมูล` and `ขอลบข้อมูล` calls the real endpoint and shows the server's `ส่งอีเมลยืนยันแล้ว` success (all 5 assertions passed). Only `PrivacyPage.jsx` changed; backend data dir snapshotted + restored, `git status` clean. Pushed on `claude/daily-reporter-improvements-8vc9ct`.

The PDPA self-service thread (consent record → erasure → access → **UI to use them**) is now complete end-to-end. 8 items still pending an owner decision, unchanged.

---

### 2026-07-09 — Hourly loop, run 63: the privacy policy promised a right-of-access ("ขอดูข้อมูล") with no endpoint behind it — added the data-export endpoint (PDPA §30/§31)

PR #79: run 62's PDPA-erasure fix deployed and settled all-3-Ready (frontend `6dNcTs9e`, backend `5mwuSmJx`, npxn `BenCFGLw`; interleaved Canceled = build-supersede). This cycle continues the PDPA-completeness thread on the same #1 priority.

**Found by reading what the policy claims vs. what exists.** `GET /api/privacy/policy` advertises `rights: ['ขอดูข้อมูล','แก้ไข','ลบ','โอนย้าย','คัดค้าน']` and returns an `erasure_url` — but grep of `/api/privacy/*` shows only `consent`, `erasure`, `erasure/confirm`, `policy`. There was **no access/export endpoint at all**, so the platform advertised a PDPA §30 right-of-access it could not fulfil — the same promise-vs-reality gap the repo's philosophy targets, and a direct parallel to run 62's erasure fix.

**Added (mirrors the email-confirmed erasure flow so it can't become a data-leak vector — anyone typing an email must not be able to pull another person's PII):**
- `POST /api/privacy/access {email}` → validates, rate-limited 5/hr, emails a tokenised confirm link (HMAC token, type `access`).
- `GET /api/privacy/access/confirm?email=&token=` → verifies the token, gathers everything held for that email across waitlist, consents, producers, portal_leads, affiliates, withdrawals, and orders, and returns a **downloadable JSON export** (also satisfies data-portability, §31). Unlike erasure this **intentionally includes** the financial records (withdrawals, orders) — a data subject has the right to *see* their own data in full, even where those records are retained against deletion.
- policy endpoint now returns `access_url` and marks `GAP-003: Right of access / data export endpoint ✅`.

**Verified live (backend booted, file mode, isolated+restored data dir):** registered a producer + affiliate + portal lead under one email; `POST /api/privacy/access` → confirmation message; `GET .../access/confirm` with the valid token → JSON `total_records=3` (producers/portal_leads/affiliates each 1, email present in each); bad token → 403; invalid email → 400; policy now lists `access_url` and GAP-003. `node --check` passes; only `server.js` changed; data dir clean afterwards. Pushed on `claude/daily-reporter-improvements-8vc9ct`.

8 items still pending an owner decision, unchanged (the run-62 financial-record-retention question and the run-61 payment↔order note still stand).

---

### 2026-07-09 — Hourly loop, run 62: PDPA erasure falsely claimed "ลบข้อมูลแล้ว" while keeping every producer/affiliate/portal-lead record — now erases them for real

PR #79: verified green via the real commit-status API — all 3 Vercel checks `success` on head `eb4926b` (runs 60+61). This cycle's change is a backend fix on openthai-ai itself, so it deploys on #79.

**Returned to the flagship after three smart-e commerce fixes, into the #1 priority (consent-based personal-data handling) — and found a real PDPA compliance breach, not a micro-bug.** `POST /api/privacy/erasure/confirm` (the email-confirmed right-to-erasure endpoint, PDPA §33) responded `✅ ยืนยันและลบข้อมูลเรียบร้อยแล้ว` but only removed the person from **two** stores: `waitlist` and `consents`. Everyone who had actually signed up through the consent funnels — a producer (`producers.json` / Supabase: company, contact name, phone, email), an affiliate (`affiliates.json`: name, email, phone, **and their PromptPay number**), or any `/portals/*` lead (`portal_leads`: name, email, whole form) — was told their data was erased while the record stayed in full. Both a false success message and an actual retention breach.

**Fix (3 files):**
- `producers.js` + `portal-leads.js`: added `eraseByEmail(email)` — deletes the person's records in **both** Supabase and file mode, returns a removed count. Exported from each module.
- `server.js`: the confirm handler is now `async` and additionally erases producers, portal_leads, and affiliate records (array splice + `_affFileSave` + Supabase `DELETE`), all keyed on the confirmed email; the count shown to the user now reflects everything actually deleted.

**Deliberately NOT deleted — flagged for owner decision (standing-order point 8, legal implication):** financial/transaction records that also contain contact data — affiliate **withdrawals** (PromptPay + amounts) and **orders** (customer name/contact) — were left in place, because PDPA §33 exempts data a business must retain under other law (accounting/tax). Whether and how to purge or anonymise those is a real legal-scope call I did not make unilaterally; raising it rather than guessing.

**Verified live (booted the real backend in file mode, isolated data dir snapshotted + restored so nothing leaked):** registered a producer + an affiliate + a portal lead under one email → producers=1, affiliates_total=1, aggregated leads-view=2 (that view spans waitlist/affiliates/orders/portal_leads, so the affiliate shows there too — the 3 real records are 1 producer + 1 affiliate + 1 portal lead); a single erasure-confirm call returned `ลบข้อมูลเรียบร้อยแล้ว (3 รายการ)` and all three stores dropped to 0; a bad token → 403. `node --check` passes on all three files; `git status` clean afterwards. Pushed on `claude/daily-reporter-improvements-8vc9ct`.

8 items now pending an owner decision (added: should PDPA erasure also purge/anonymise financial records — affiliate withdrawals, orders — or retain them under the accounting/tax exemption, and for how long?). The run-61 payment↔order workflow note also still stands.

---

### 2026-07-09 — Hourly loop, run 61: smart-e `_confirm_payment` returned success:true even when the payment id didn't exist; also surfaced a payment↔order-status workflow question for the owner

PR #79: run 60's openthai-ai deploy (the DECISIONS_LOG/PROJECT_STATUS commit) went all-3-Ready; a follow-on CI `sync PROJECT_STATUS.md` commit triggered a second all-3-Ready deploy. (GitHub MCP was flapping again around this cycle; verification leaned on the settled Vercel webhooks + local git.)

**Continued the smart-e commerce-path audit into the money path.** `_confirm_payment` (POST /api/payments/confirm, admin-gated) ran `UPDATE payments SET status='paid' WHERE id=?` with `body.get('id')` unchecked — including `None` when the key was absent — and unconditionally returned `{success:true}` even when zero rows matched. So an admin confirming a mistyped or nonexistent payment id saw "success" while nothing was actually marked paid. Fixed by looking the payment up first and returning **404** when it doesn't exist (same shape as run 60's order 404), only then flipping status and echoing `id/status` back.

**Verified live (booted smart-e with an admin key, isolated DB):** created a real promptpay payment; confirm valid id → 200 and the row reads `paid`; confirm id 99999 → 404; confirm with no id → 404. `server.py` parses; only that file changed. Pushed to smart-e's `claude/daily-reporter-improvements-8vc9ct` as `9496df1` (PR #1).

**Observation raised for the owner (NOT changed — it's a workflow design choice, per standing-order point 8):** confirming a payment does not touch the linked `order_id`'s status, so an order stays `pending` after its payment is marked `paid`. Whether payment-confirm should auto-advance the order status is a real product decision — flagging it rather than guessing. This is a *note*, not a blocking escalation; the 7 prior owner-decision items are unchanged.

---

### 2026-07-09 — Hourly loop, run 60: smart-e cancelled orders never returned their stock (inventory drifted down permanently), and order-status was writable to any garbage value

PR #79: GitHub MCP dropped again at the start of this cycle (reconnected mid-run). Run 59's openthai-ai deploy (the DECISIONS_LOG/PROJECT_STATUS commit `63338ef`) settled all-3-Ready in the final webhook state; the smart-e fix itself is on smart-e's PR #1, not #79.

**Direct follow-through on run 59** (which fixed `_create_order`'s stock *decrement*): checked the other order write path, `_update_order_status` — two real bugs, both verified by reproduction:
- **Stock never restored on cancel.** `_create_order` decrements product stock, but cancelling an order only flipped `orders.status` to `'cancelled'` — it never added the reserved units back. So every cancellation drifted real inventory *down* permanently (and the dashboard revenue query already excludes cancelled orders, so the sale correctly vanishes from revenue while the stock stayed gone — a pure loss). Fixed by restoring each `order_items.qty` to `products.stock` on the transition *into* `cancelled`, and re-decrementing on the reverse transition (`cancelled → active`) so toggling status can't mint free stock; the guard only fires on an actual cancel↔active flip, so a repeated `cancelled` PUT is a no-op.
- **Order status accepted any value.** `status` was written straight from `body.get('status')` with no validation — any arbitrary string, or `None` when the key was absent, was persisted, setting the column to garbage/NULL and corrupting the dashboard queries that key on it (`pending` count, `status!='cancelled'` revenue). Now validated against the real status set the UI can set (`pending/confirmed/shipped/delivered/cancelled`) plus the `paid/processing` values already present in seed/data; anything else → 400. Also returns 404 for a non-existent order instead of a silent success.

**Verified live (booted smart-e with an admin key, isolated DB):** product stock 10; order of qty 3 → stock 7; **cancel → 200 and stock restored to 10**; **un-cancel to pending → 200 and stock back to 7** (symmetric, no free stock); status `'banana'` → 400; missing status → 400; unknown order id → 404; stock unchanged after all rejected calls. `server.py` parses; only that file changed. Pushed to smart-e's `claude/daily-reporter-improvements-8vc9ct` as `737ca0c` (PR #1). (smart-e has no DECISIONS_LOG — full write-up is in the commit message per the standing order.)

7 items still pending an owner decision, unchanged.

---

### 2026-07-09 — Hourly loop, run 59: smart-e's POST /api/orders never validated per-item price/qty — crash on non-numeric, and negative qty *inflated* stock (run-48 data-integrity class, order path)

PR #79: GitHub MCP reconnected this cycle — verified via the real commit-status API for the first time since it dropped: all 3 Vercel checks `success` on head `c193a09` (which includes runs 57 & 58). The runs 57/58 "couldn't confirm via API" flag is now cleared.

**Confirmed clean first (logged so they aren't re-swept):** openthai-ai's `prerender-meta.mjs` covers all 19 public routes with unique titles/descriptions and now matches `sitemap.xml` exactly (19 + `/` homepage = 20) after run 58. Portal consent is enforced server-side (`portal-leads.js` rejects `consent !== true`). smart-e's auth model is solid: every API route is behind `_require_admin()` (fails closed 503 if `ADMIN_KEY` unset, timing-safe `hmac.compare_digest`), and the LINE webhook uses timing-safe signature verification that fails closed on an empty secret. Public pages use almost no `<img>` (emoji/CSS), and the ones present have alt.

**Then found the real bug in smart-e (`server.py` `_create_order`) — the run-48 "no crash is not no bug" class on a path runs 48/54 never covered** (run 54 only checked the *frontend* rejects an empty item list; the backend numeric validation was never there). The handler validated that `items` is a list of dicts but never the `price`/`qty` values inside each item:
- `price:"abc"` → `total = sum(item['price'] * item['qty'])` hits `int + str` → **uncaught TypeError → empty response** (the same crash class this function's own comments already guard against for the items *shape*).
- `qty:-5` → `UPDATE products SET stock=MAX(0,stock-(-5))` = **stock+5**: placing an "order" *inflates* product stock, writes a negative order line, and pushes a negative `total` into `orders.total`, dashboard revenue, and `customers.total_spent`.

**Fix:** coerce+validate each item like `_create_product` — `price` float ≥ 0, `qty` int ≥ 1, else 400; `total` and the stock decrement then use the coerced values. (smart-e has no DECISIONS_LOG, so the full write-up is in the commit message per the standing order.)

**Verified live (booted smart-e with an admin key, isolated DB):** created a product (stock 10); valid order (100×2) → **201**, stock → **8**; `price:"abc"` → **400** with a readable Thai error (no crash / no empty response); `qty:-5` → **400** and stock stayed **8** (not inflated to 13). `server.py` parses; only that file changed. Pushed to smart-e's `claude/daily-reporter-improvements-8vc9ct` as `b4e26ee` (PR #1).

7 items still pending an owner decision, unchanged.

---

### 2026-07-09 — Hourly loop, run 58: the personal, ref-gated affiliate dashboard was in the sitemap (told Google to index an empty ref-code shell) — made it consistent with every other personal surface

PR #79: run 57's deploys completed normally — all 3 projects reached Ready in the final webhook state (frontend `9kuvgjYw`/`CuKXTbCt`, backend `7mSP3NNs`, npxn `Gri1y8Lu`; Canceled = build-supersede). GitHub MCP is still disconnected/needs re-auth, so still no commit-status-API confirmation this cycle — relied on settled Vercel webhooks + local git, as noted in run 57.

**Scanned clean first (logged so they aren't re-swept):** `manifest.json` is valid and all referenced icons (`icon-192.png`, `icon-512.png`, `og-image.png`) exist. `sitemap.xml` uses a single consistent host (`https://www.openthai-ai.com`, matching the canonical) across all URLs and declares itself correctly; `robots.txt` disallows the private surfaces.

**Then found the real inconsistency by cross-checking sitemap.xml ↔ robots.txt ↔ prerender-meta.mjs ↔ the actual page:** `/affiliate/dashboard` was the lone personal surface being advertised for indexing — it was in `sitemap.xml` (priority 0.6) *and* `robots.txt` `Allow`, while every other personal surface (`/dashboard`, `/track`, `/dispute`, `/producers/manage`) is `Disallow`ed and absent from the sitemap. It was also already, deliberately, excluded from `prerender-meta.mjs` back in run 49 ("personal dashboard, not a shareable marketing page") and confirmed in run 55 as a `?ref=`-gated surface showing an affiliate's name / total earnings / withdrawal history. I verified the page itself: with no `?ref=` param `AffiliateDashboard.jsx` renders only a "กรอก Ref Code เพื่อดูสถิติของคุณ" (enter your ref code) shell. So Googlebot, crawling it without a ref, would index that empty shell — wasted crawl budget on a page that can never show public content, and inconsistent with three prior decisions.

**Fix (make it match how the other 4 personal surfaces are already handled):** removed the `/affiliate/dashboard` `<url>` block from `sitemap.xml` and moved `/affiliate/dashboard` from `Allow` to `Disallow` in `robots.txt`. The public affiliate *signup* funnel `/affiliate` stays in both the sitemap and the `Allow` list (it's the real marketing page) — robots' most-specific-match rule means `Disallow: /affiliate/dashboard` (longer) blocks only the dashboard while `Allow: /affiliate` keeps the funnel indexable.

**Verified with the real build:** parsed `public/sitemap.xml` (valid XML, now 20 URLs, `/affiliate/dashboard` absent); `robots.txt` keeps `Allow: /affiliate` and adds `Disallow: /affiliate/dashboard`; ran `npm run build` and confirmed `dist/sitemap.xml` has 0 occurrences of `affiliate/dashboard` and `dist/robots.txt` has exactly the one Disallow. Only the two static files changed. Pushed on `claude/daily-reporter-improvements-8vc9ct`.

7 items still pending an owner decision, unchanged.

---

### 2026-07-08 — Hourly loop, run 57: homepage JSON-LD advertised wrong prices (฿20/฿30 vs real ฿299/฿599) and a fabricated 4.9★/1200-review rating to Google

PR #79: run 56's deploys completed normally — all 3 projects reached Ready in the final webhook state (backend `5bVXvAtE`, frontend `FCTAukiA`, npxn `8omrdMem`; the Canceled entries were the usual build-supersede). NOTE: the GitHub MCP server disconnected and now requires re-auth, so I could not confirm via the commit-status API this cycle — relied on the settled Vercel webhooks + local git. Flagging so a later cycle re-verifies via the API once GitHub is reconnected.

**First re-checked the accessibility lens on the consent funnels (form labels) — all clean, no fix needed:** `LanguageSwitcher` already has `role="group"`, `aria-label`, `aria-pressed`, `type="button"`, `aria-hidden` separators. `ProducerJoinPage`'s inputs *look* unlabeled to a naive grep (2 literal `<label>` for 11 inputs) but its `Field` wrapper does `React.cloneElement(children, { id })`, so every `<label htmlFor>` is correctly associated. `AffiliatePage` and `ContactPage` wrap each input inside its `<label>` (valid implicit association). Logged negative so this isn't re-swept.

**Then found the real gap — in the homepage `SoftwareApplication` JSON-LD structured data (`index.html`), and it's a ground-truth/honesty problem, not a missing feature:**
- **Wrong prices shipped to search engines.** The `offers` block claimed Pro=฿20 and Premier=฿30. The real pricing (`PricingPage.jsx` `PP_META`) is Free ฿0 / Pro ฿299 / Premier ฿599 / Enterprise ฿1299. Google can render Offer prices directly in results, so a user could see "฿20", click through, and hit ฿299 — a misleading ~15× understatement. Enterprise was missing entirely.
- **Fabricated review rating.** `aggregateRating: { ratingValue: "4.9", reviewCount: "1200" }` — but there is **no** reviews/ratings system anywhere in the backend (grep for aggregateRating/reviewCount/review routes: only an unrelated AI review-reply skill and a memory review-queue). The "1200" was evidently lifted from the "คนไทยกว่า 1,200 คน" (1,200 *users*) marketing line — users are not reviews. Fabricated review markup violates Google's structured-data policy (manual-action risk) and directly contradicts this repo's core philosophy (ground truth over narrative confidence — the same rule that rejected Neo4j/Stripe-escrow).

**Fix:** corrected the four `offers` to the real THB prices (added Enterprise) and removed the fabricated `aggregateRating` block entirely. Chose removal over inventing a plausible rating — keeping fabricated data would be exactly the failure mode CLAUDE.md warns against, and there's no real review corpus to cite.

**Verified with the real build, not by eye:** parsed the JSON-LD out of `index.html` with `JSON.parse` (valid; offers = Free 0 / Pro 299 / Premier 599 / Enterprise 1299; `aggregateRating` absent), then ran `npm run build` and re-parsed both `dist/index.html` and the prerendered `dist/pricing/index.html` — both carry the corrected offers and no rating. Only `frontend/index.html` changed; `git status` clean. Pushed on `claude/daily-reporter-improvements-8vc9ct`.

7 items still pending an owner decision, unchanged.

---

### 2026-07-08 — Hourly loop, run 56: `<html lang>` never re-synced to the actually-displayed language — screen readers read en/zh content with Thai phonemes (WCAG 3.1.1)

PR #79: run 55's deploys completed normally — verified green via the real commit-status API (all 3 Vercel checks `success` on head `a0c673e`, "Deployment has completed"). The interleaved Building/Canceled webhook entries were the usual build-supersede noise.

**First closed the enumeration lens (run 55) on the rest of the affiliate/admin read surface — all clean, so no new limiter needed:** `/api/affiliate/leaderboard` already masks names (`maskName`) and exposes only aggregate stats; `/api/affiliate/list`, `/api/affiliate/withdrawals/admin`, and every `/api/orders/admin/*` and `/api/disputes/admin/*` endpoint gate on `checkAdminKey` (the orders/disputes ones lack a rate limiter but are auth-gated, so not an enumeration risk); `/api/affiliate/withdraw` requires email confirmation. Logged negative so this isn't re-swept.

**Then picked the real gap the "accessible platform" standing priority points at — a genuine, reproducible bug, not a guess:** the site ships 3 languages (th/en/zh, `i18n/index.jsx` `LANGS`). `index.html` is statically `<html lang="th">`. The language state hydrates from `localStorage('otai_lang')` on mount, but `document.documentElement.lang` was only ever updated *inside* `setLang` — the explicit toggle path. Two paths never touched it:
- **Initial load:** a returning visitor who previously chose en or zh boots with the content in en/zh while `<html lang>` stays `th`. A screen reader then pronounces the English/Chinese text using Thai phonemes until the user manually re-toggles — exactly the failure WCAG 3.1.1 (Language of Page) exists to prevent, hitting the blind/low-vision users accessibility is *for*.
- **Cross-device cloud sync:** the `otai:sync` handler calls `setLangState` directly (not `setLang`), so a language change synced from another device also left `<html lang>` stale.

**Fix:** replaced the imperative set inside `setLang` with a single `useEffect([lang])` that drives `document.documentElement.lang` from the one piece of state — so all three paths (mount, explicit toggle, cloud sync) stay correct from one source of truth.

**Verified live in a real browser (Playwright against the built `dist`), 4 cases:** fresh visitor → `th`; returning `otai_lang=en` → `<html lang>` becomes `en` after boot (was staying `th`); returning `zh` → `zh`; dispatched an `otai:sync` th→en event → `<html lang>` follows to `en` (was staying `th`). Only `frontend/src/i18n/index.jsx` changed; `git status` clean. Pushed on `claude/daily-reporter-improvements-8vc9ct`.

7 items still pending an owner decision, unchanged.

---

### 2026-07-08 — Hourly loop, run 55: rate-limited two public ref_code-keyed affiliate read endpoints leaking name + earnings (enumeration mitigation, same precedent as run 11)

PR #79: run 54's deploys completed normally (all 3 Ready; the interleaved Canceled entries were the usual build-supersede).

**Found by applying run 47's "is this identifier actually a secret?" lens to the affiliate side:** `GET /api/affiliate/stats/:ref_code` and `GET /api/affiliate/withdrawals?ref_code=` are both public, unauthenticated, and keyed only by `ref_code`. But `ref_code` is not a secret — it's embedded in every share link the affiliate posts (`?ref=CODE`), and `genRefCode()` gives it low entropy (up-to-6-char name prefix + 3 random base36 chars ≈ 46k suffixes). Between them the two endpoints return the affiliate's real name, tier, total earnings, pending payout, and withdrawal history. With no rate limiter on either, those could be enumerated to harvest name+earnings across affiliates.

**Scoping decision (why a limiter, not an auth rewrite):** the login-less "enter your ref code to see your stats" dashboard is the product's intentional design, not an accident — so I did not change the auth model. Whether that dashboard *should* gain real auth is a genuine architecture decision, added to the owner-decision list. What's shippable now without touching that design is enumeration mitigation, exactly the move run 11 made for the unsubscribe routes: a rate limiter.

**Fix:** added `affReadLimiter` (60 requests / 15 min, shared by both read endpoints).

**Verified live against a booted server:** registered a real affiliate, confirmed a normal stats read returns 200, hammered the endpoint 65× → first 60 return 200, the rest 429; confirmed the withdrawals endpoint shares the same budget (429 once spent); zero exceptions in the server log. Cleaned the test affiliate out of the gitignored-placeholder `affiliates.json` (caught it in `git status` before committing, same as prior runs). Pushed as `1693cd1`.

7 items now pending an owner decision (added: should the affiliate dashboard have real auth rather than ref_code-as-credential?).

---

### 2026-07-08 — Hourly loop, run 54: openthai-ai's customer-facing money/order flows all scanned clean under the fake-success lens; smart-e's PR #1 description rewritten to match what the branch actually became

PR #79: run 53's CI hiccup investigated and closed last cycle (transient race between the CI sync-push and a same-minute manual push; the next run passed and pushed its sync commit). Deploys all Ready.

**Applied run 52's fake-success lens (frontend ignoring `res.ok`) to every customer-facing money/order flow in openthai-ai — all clean:**
- `CatalogPage`'s order modal checks `d.success`, shows the server error, and only flips to the success screen on a real success.
- `QuickPayPage.createQR` checks `!res.ok || !data.success` and surfaces the error.
- `PaymentPage`'s create-payment path checks `res.ok`, throws on missing `charge_id`, and handles the 3-D Secure redirect; its cancel-subscription UI already matches the two-step backend from run 14 (confirm dialog + "กดลิงก์ในอีเมล" messaging — no false "ยกเลิกแล้ว").
- Also re-checked `smart-e`'s "+ ออเดอร์ใหม่" modal: `createOrder` already rejects an empty item list client-side.
Negative results logged so this lens doesn't get re-applied to the same surfaces.

**Real deliverable:** `smart-e`'s PR #1 still carried the title/body from its first commit ("Remove stale committed local artifacts") while the branch had grown into an 8-commit hardening pass (real authentication on a previously wide-open API, four reproduce-first crash/validation fixes, a data-integrity fix, and honest error feedback in the dashboard). A human reviewing that PR would have had no idea what they were approving. Rewrote the title/body to summarize all 8 commits grouped by theme, with the per-commit live-verification notes in the test plan. Updated via the GitHub API (`update_pull_request` returned success; PR title/body now reflect the real diff).

6 items still pending an owner decision, unchanged.

---

### 2026-07-08 — Hourly loop, run 53: openthai-ai's commerce stack scanned clean under the data-integrity lens; fixed /pricing's tab title flipping from Thai to English after SPA boot

PR #79: run 52's deploys completed normally (all 3 Ready in the final webhook state).

**Closed the data-integrity sweep for openthai-ai's commerce stack — all clean:** `inventory.js` guards every numeric field with `num()` (`Number.isFinite` check with fallback) in `upsert()`, and `adjust()` coerces `delta` via `Math.trunc(Number(delta) || 0)` with a zero-reject — so the NaN-stock corruption class that bit smart-e (run 48) cannot happen here. Combined with run 51's clean scan of `orders.place()`/`track()`/`/api/shop/checkout`, every write path in the openthai-ai commerce stack has now been checked under this lens. Negative results logged so future cycles don't re-scan.

**The real (small) gap found while in the area:** `PricingPage`'s `document.title` was `'Openthai.ai — Pricing'` (English) while the prerendered title that crawlers/link-previews see (added run 49) is the Thai `'เลือกแพ็กเกจที่ใช่สำหรับคุณ — Openthai.ai'`, and every other page on this Thai-first site uses the `'<ชื่อหน้าไทย> — Openthai.ai'` convention. Net effect: the tab showed the Thai title on first paint, then flipped to English once React booted — inconsistent with both the convention and what search results display.

**Fix + verified with the real build:** title now matches the prerender exactly; `dist/pricing/index.html` carries the Thai title and a real browser (Playwright) shows the same Thai title after the SPA boots — no flip. Pushed as `cb6e554`.

6 items still pending an owner decision, unchanged.

---

### 2026-07-08 — Hourly loop, run 52: `smart-e`'s dashboard showed "สำเร็จ" even when the server said no — every write handler ignored the response

PR #79: run 51's deploys completed normally (all 3 Ready on `d8f7cda`, confirmed in the final webhook state).

**Direct follow-through on runs 46/48's own backend hardening:** those runs made the backend return clean 400s for malformed data — but nobody checked whether the frontend *shows* them. It didn't: `api()` returned parsed JSON without ever reading `r.ok` (and swallowed network errors into a silent `null`), and all 7 write handlers (save/delete product, create order, update order status, save customer, confirm payment, save settings) fired their success toast and closed the modal unconditionally. An admin whose save was rejected — or whose connection dropped — saw "เพิ่มสินค้าแล้ว" while nothing was saved.

**Honest scoping note:** the product form's price field is `type="number"`, so the specific "typed abc into price" path is already blocked by HTML validation (discovered this during testing when Playwright refused to type letters into it — adjusted the test rather than pretending the case was reachable). The fix matters for the failure classes HTML validation can't catch: real server-side 400s via API, 500s, 503 (ADMIN_KEY unset), and network failures — all of which previously produced fake success.

**Fix:** `api()` now checks `r.ok`, toasts the server's own Thai `error` message (or a generic connection-failure message), and returns `null`; every write handler bails before its success toast on `null`, leaving the form open so the admin can correct and retry.

**Verified live in a real browser (Playwright against the running server), 3 cases:** (1) a real 400 from the real backend through the app's own `api()` → server's Thai error toast shown, `null` returned; (2) a valid product save → success toast, modal closes, product appears; (3) request failing mid-save → error toast, **no** success toast, modal stays open. Pushed to `smart-e`'s PR #1 branch as `a27ccef` — full writeup in that repo's commit message.

6 items still pending an owner decision, unchanged.

---

### 2026-07-08 — Hourly loop, run 51: order paths scanned clean; ai-memory grounding pack updated to v1.1.0 with the 3 durable lessons this session actually produced

PR #79: run 50's deploys completed normally (webhook noise was the usual build-supersede progression; final state all Ready).

**Scanned first, found the order system clean:** checked both real purchase paths with the run-48 data-integrity lens — `/api/shop/checkout` clamps `qty` (`Math.max(1, Math.min(999, parseInt||1))`) and validates product/stock/customer fields; `orders.place()` clamps `qty` and validates `price` as number-or-null; `orders.track()` requires an exact contact match and returns only a whitelisted field subset (no address/PII echo). No gap found — logging the negative result so future cycles don't re-scan the same ground.

**Then picked the real gap the scan pointed at:** `docs/ai-memory/core-philosophy.json` — the file `CLAUDE.md` designates as the grounding pack for Gemini/Grok — was still v1.0.0 dated 2026-07-02, written before the standing order existed and before all ~50 hourly-loop runs. The pack's whole purpose is carrying this project's evidence-cited lessons to other AI collaborators; it was missing everything this session learned.

**Added 3 lessons, every one citing the real DECISIONS_LOG entry it came from (per the file's own no-invention rule):**
- `lesson_04_consent_is_platform_policy` — the 2026-07-03 standing order (after 3 prior rejections) + runs 40/42/43's server-side consent enforcement including the internal auto-registration bridges.
- `lesson_05_no_crash_is_not_no_bug` — run 48's silent data-corruption find (PUT stored `price:"abc"`, next order wiped real stock) that runs 45-46's crash-only sweep had correctly-but-incompletely cleared.
- `lesson_06_trust_the_api_not_the_dashboard_comment` — runs 44-49's recurring Vercel-bot-comment vs commit-status-API contradictions.

**Verified:** JSON parses (`node require`: 6 lessons, v1.1.0); regenerated `core-philosophy.yaml` from the JSON using the file's own documented command, verified it parses (`yaml.safe_load`: 6 lessons, v1.1.0); synced INTEGRATION_GUIDE.md's memory count (3→6). Pushed as `229ea5b`.

6 items still pending an owner decision, unchanged.

---

### 2026-07-08 — Hourly loop, run 50: the public producer directory's category filter was out of sync with the backend — producers in the 2 newest categories were unfindable by category

PR #79: confirmed green via the real status API at the end of run 49 (all 3 `success` on head). This cycle's webhook noise was routine build progressions of run 49's own pushes.

**Found by checking a known-risky pattern against the current code, not by guess:** `backend/producers.js` itself carries a comment (from run 42) about category-list drift between frontend and backend. Grepped every hardcoded category list in the frontend against the backend's canonical `CATEGORIES` (12 items). Most per-tool pages (AI generator, promo engine, etc.) have deliberately different lists for their own domains — not bugs. But two files sit on the *real producer funnel* and were stale:
- `ProducerDirectoryPage.jsx` (`/find-producers`, in the sitemap, linked from the landing page): hardcoded the old 10-item filter list — a producer registered under 'อาหารสัตว์เลี้ยง' or 'สินค้าดิจิทัล' (both added run 42) could never be found via the category filter. They'd only appear under "ทั้งหมด", which defeats the directory's purpose for those two categories.
- `ProducerJoinPage.jsx`'s `FALLBACK_CATS` — lower severity since `/join` fetches the real list from `/api/producers/categories` at load, but the offline fallback was the stale 10-item set.

**Fix:** `ProducerDirectoryPage` now fetches `/api/producers/categories` (the exact pattern `/join` already uses) with the full 12-item list as offline fallback — so this drift class can't recur for the directory. `FALLBACK_CATS` in `/join` synced to the full list.

**Verified live end-to-end, all three layers:** (1) booted the real backend — `/api/producers/categories` returns all 12; (2) built the frontend against it and loaded `/find-producers` in a real browser via Playwright — the filter renders all 13 options (ทั้งหมด + 12), confirmed programmatically from the rendered `<option>` elements; (3) registered a real test producer under อาหารสัตว์เลี้ยง through `/api/producers/apply` (with consent), approved it via the admin status endpoint, and confirmed `/api/producers/search?category=อาหารสัตว์เลี้ยง` returns it (`count: 1`). Cleaned up the test data (gitignored file, removed anyway) and confirmed `git status` shows only the two intended source files. Pushed as `479f7b1`.

6 items still pending an owner decision, unchanged.

---

### 2026-07-08 — Hourly loop, run 49: `/pricing` and `/affiliate` were in the sitemap but served the homepage's meta to social crawlers — same defect runs 21/26 fixed elsewhere, now closed for the last two pages

PR #79: GitHub MCP reconnected this cycle — verified via the real status API for the first time in several cycles: all 3 Vercel checks are `success` on head commit `7d7384e` ("Deployment has completed"). The free-tier deploy quota has genuinely reset; the run-48 pushes deployed cleanly (one intermediate build was Canceled because two commits were pushed back-to-back and Vercel superseded the older one — normal behavior, not a failure).

**Found via a three-way consistency check, not a guess:** compared `sitemap.xml` (21 URLs) against `App.jsx`'s route table (all 21 resolve — no broken sitemap entries), then against `prerender-meta.mjs`'s route list. Two pages are in the sitemap *and* `robots.txt` Allow but missing from the prerender list: `/pricing` and `/affiliate`. Since this is a client-side-routed SPA, both were still serving the homepage's `<title>`/OG tags to non-JS social crawlers (LINE/Facebook link previews) — the exact defect runs 21/26 fixed for the other 17 public pages, just never applied to these two. Both are core funnel pages (pricing + the primary affiliate signup), so this was the highest-value SEO gap available.

Also checked while in the area: all 4 public signup endpoints (`/api/leads/submit`, `/api/producers/apply`, `/api/affiliate/apply`, `/api/waitlist`) have real rate limiters — no gap there.

**Fix:** added both routes to `prerender-meta.mjs`, title/description copied verbatim from each page's own i18n source (`pp.hero.*` for pricing, `AF.th.hero` for affiliate), per the file's established convention. `/affiliate/dashboard` (also in the sitemap) deliberately left out with a comment explaining why: it's a personal dashboard, not a shareable marketing page.

**Verified with the real build, not by reading the script:** ran `npm run build` — `dist/pricing/index.html` and `dist/affiliate/index.html` now carry the correct title/canonical/`og:*`/`twitter:*` tags, the homepage `dist/index.html` is untouched, and the `<script>` tags in the new files are byte-identical to the homepage's, so the SPA boots identically for real visitors. Pushed as `c4d8951`.

6 items still pending an owner decision, unchanged (see runs 44–48).

---

### 2026-07-08 — Hourly loop, run 48: `smart-e`'s PUT /api/products accepted the exact garbage its POST now rejects — real stock data destroyed downstream, reproduced then fixed

PR #79 status: could not cross-check via the GitHub status API this cycle — the GitHub MCP connector needs re-authorization (non-interactive session, can't run the OAuth flow here; เจ้าของต้อง authorize GitHub connector ใหม่ใน claude.ai connector settings ถ้าอยากให้รอบถัดไปเช็ค PR ผ่าน API ได้). The interleaving Vercel bot comment updates that arrived since run 47 all show routine building→ready progressions for the run-46/47 docs commits — same noise pattern as every prior cycle, no action taken on them. Note the bot comment has repeatedly contradicted the real API before, so "Ready" in the comment is not treated as confirmation of anything.

Run 47's owner question (producer_id vs email as the public catalog identifier) remains open — the interactive question tool failed twice with a transport error, but the full decision context is durably recorded in the run 47 entry below, so nothing is lost. Not proceeding on that architecture change without an answer.

**This cycle's task — direct follow-up on run 46's own fix, same repo, same bug class from the other direction:** run 46 made `POST /api/products` reject non-numeric `price`/`stock`, and its writeup claimed `_update_product` was safe because it has "no type coercion that could raise". That was true for the *crash* class but missed the *data-integrity* class: `PUT /api/products/1` with `{"price":"abc","stock":"xyz"}` returned 200 and SQLite stored the literal strings (dynamic typing, no column type enforcement).

**Verified the damage is real, not theoretical, before fixing:** placed a real order against the polluted product on a live server — the order's stock decrement (`MAX(0, stock-?)`) coerced `'xyz'` to 0 and silently overwrote the real stock count with 0, and the `"abc"` price string stayed in the catalog for the dashboard/frontend to render. So an admin typo in a future edit form wouldn't just store garbage, it would destroy real inventory data on the next sale.

**Fix:** `_update_product` now validates/coerces `price` (float) and `stock` (int) exactly like `_create_product` does, returning the same clean Thai 400 on bad input.

**Verified live after the fix:** bad price → 400, bad stock → 400, valid numeric update → 200 with correct values, an update touching only non-numeric fields still works untouched, and a numeric string (`"99.25"`) is properly coerced rather than rejected. Zero exceptions in the server log across the whole run. Pushed to `smart-e`'s existing PR #1 branch (commit `4191fc9`).

Lesson recorded for the loop itself: "no crash" ≠ "no bug" — run 46's sweep checked which handlers could *throw*, not which could silently persist garbage. `_update_customer` was re-checked under this lens too: its editable fields (`name`,`email`,`phone`,`tag`) are all genuinely free-text columns with no numeric coupling, so it does not have the same problem.

5 items still pending an owner decision, unchanged; `otop-ai-landing`'s domain question unchanged; run 47's producer_id question now added to that list (6 total).

---

### 2026-07-05 — Hourly loop, run 47: re-investigated the "low priority" producer-email-exposure note — it's more load-bearing than assumed; escalating to the owner instead of guessing an architecture fix

PR #79: same recurring rate-limit pattern confirmed again via the real status API (commit `d3b8ea8`: all 3 Vercel checks still `failure` / rate-limited), bot comment lag noted once more, no action needed.

**Re-opened a previously "low priority, not blocking" item** (public `/api/producers/search` and `/api/catalog` responses include producer `email`) instead of treating it as settled, since several other privacy items this session turned out to be more serious on closer inspection. Read `producers.js`, `orders.js`, `disputes.js`, and the actual frontend consumers (`CatalogPage.jsx`, `ProducerDirectoryPage.jsx`) before concluding anything.

**Confirmed this is not a simple "strip the field" fix, and stopping here rather than guessing an architecture change:** `email` is the actual primary key for the entire producer/order/dispute system, not incidental exposure —
- `producers.js` keys its file-store by email and upserts Supabase rows `on_conflict: 'email'` — there is no separate `producer_id` anywhere in the data model.
- `CatalogPage.jsx`'s checkout flow (`POST /api/orders`) literally sends back `producer_email: product.email` — the exact value read from the public, unauthenticated `/api/catalog` response — to tell the backend which producer to attribute the order to.
- `orders.js`/`disputes.js`/the DB schema (`orders.producer_email`, an indexed column in `migrations/*.sql`) all use `producer_email` as the real join key for stock decrement, order notification emails, and dispute-party verification.

So removing `email` from the public catalog/search responses, as the obvious fix would suggest, would immediately break checkout for every product — there is currently no non-PII identifier the frontend could send instead. A correct fix means introducing a stable public producer identifier (e.g. a generated id/slug per producer) that the frontend uses for catalog display and order placement, with the backend resolving it to the real email server-side wherever `producer_email` is used today — a schema change (new column + migration) touching `producers.js`, `orders.js`, `disputes.js`, 2 frontend pages, and the Supabase migrations, not a small self-contained bug fix.

**Not touching this without the owner's input**, per the standing instruction to stop at legal/high-risk/scope-creep decision points rather than guess: this is a real architecture decision (new identifier scheme across a live production schema with real data), not a code-scanning bug fix. Asked the owner directly which direction to take (see message sent alongside this log entry). No code changes this cycle as a result — the investigation itself is the deliverable, logged here so the next cycle (or the owner's answer) has full context instead of re-discovering the same thing from scratch.

---

### 2026-07-05 — Hourly loop, run 46: closed out the crash-class sweep flagged at the end of run 45 — 3 more unguarded body-shape bugs found and fixed in `smart-e`, plus the JSON parser itself

PR #79: same recurring rate-limit pattern confirmed again via the real status API (`get_status` on commit `7b2d038`: all 3 Vercel checks `failure` / "Deployment rate limited — retry in 24 hours"), while the bot's PR comment simultaneously showed all 3 as "Ready" — the same lag noted repeatedly this session. No action needed; this is a Vercel free-tier quota issue, not a code problem.

**Followed up on run 45's own "worth a similar pass, not fixing speculatively" note** instead of picking a new category: audited every other `POST`/`PUT` handler in `smart-e/server.py` for the same unguarded-`.get()`-on-request-body pattern that caused the `_create_order` crash fixed last run. Read the full file rather than trusting the earlier grep-level guess about which routes were affected.

**Reproduced each candidate before touching code**, same discipline as run 45: booted the server fresh (`ADMIN_KEY` set, clean DB) and sent deliberately malformed payloads. Confirmed via the server's own traceback log, not assumption:
1. `POST /api/products` with `price:"abc"` → unhandled `ValueError` in `float(body.get('price',0))`, empty response.
2. `POST /api/payments/qr` with `amount:"abc"` → same `ValueError` class, empty response.
3. `POST /api/settings` with a JSON array body instead of an object → `AttributeError: 'list' object has no attribute 'items'`.
4. Any `POST`/`PUT` with a body that isn't valid JSON at all (e.g. plain text) → `read_body()` itself had no try/except around `json.loads`, so this crashed *every* write route, not just one — the widest-reaching of the four.

**Fix:** wrapped the numeric conversions in `_create_product`/`_create_qr` with a `try/except (TypeError, ValueError)` returning a clean `400` with a Thai message; added an `isinstance(body, dict)` check to `_save_settings`; made `read_body()` catch `JSONDecodeError`/`UnicodeDecodeError` and return `None`, with `do_POST`/`do_PUT` now checking for that `None` immediately after reading the body and returning `400` before any route dispatch (including before the LINE-webhook signature branch, since a body-shape problem should fail the same way regardless of which route it's headed to).

**Verified live:** re-ran all 4 malformed payloads against the fixed server — all now return a clean `400` with an explanatory message, zero exceptions in the server log. Re-ran a full set of valid requests afterward (create product, create QR, save settings, create a valid order) to confirm no regression — all still return the correct 200/201 with correct data. Confirmed the dashboard/products `GET` routes still return clean data after the write operations.

Pushed to `smart-e`'s existing PR #1 branch (commit `df8fced`) — full writeup in that repo's commit message, no `DECISIONS_LOG.md` there. This closes out the crash-class sweep across `smart-e`'s write routes; no further unguarded-body-shape gaps found in the remaining handlers (`_create_customer`, `_update_product`, `_update_customer`, `_confirm_payment`, `_line_broadcast` all only do `.get()` with string/None defaults, no type coercion that could raise).

5 items still pending an owner decision, unchanged (see run 44/45 entries); `otop-ai-landing`'s domain question also unchanged.

---

### 2026-07-05 — Hourly loop, run 45: `openthai-ai`'s own self-serve producer edit endpoint checked clean; real crash bug found and fixed in `smart-e`'s order creation

PR #79: same recurring rate-limit pattern, confirmed via the real status API again (the bot's PR comment table showed "all Ready" mid-cycle for a commit that the API simultaneously showed 2-of-3 failing for — noting this recurring lag once more since it happened several times this session; always trusted the API over the comment).

**Checked `openthai-ai` first, found nothing to fix:** re-examined `ProducerManagePage.jsx` (self-serve edit for approved producers, built run 31) since it hadn't had a close look since its own creation and interacts with run 39/42's hijack-prevention work. Confirmed `backend/producers.js`'s `selfUpdate()` — the function actually backing `POST /api/producers/update-listing` — does check `rec.status !== 'approved'` server-side before allowing any edit, not just relying on the frontend's conditional rendering. Properly secured, no gap.

**Moved to `smart-e` for a broader regression sweep** (the auth-gate fix in run 38 had only been verified against `/api/products`; the rest of the API surface — orders, customers, payments, tiktok, analytics, settings, LINE messages — was untested since). Hit all 10 `GET` routes with and without the admin key (all correctly 200/401), then exercised the write routes with real data. `POST /api/products`, `/api/customers`, and `/api/settings` all worked cleanly. `POST /api/orders` returned a bare empty response (`curl` exit 52, "empty reply from server") for a plausible-looking test payload.

**Found the real cause rather than assuming the test input was simply wrong:** `_create_order()` does `item.get('price',0) * item.get('qty',1) for item in body.get('items', [])` with zero shape-checking on `items` — a request where `items` isn't an array of objects throws an unhandled `AttributeError` deep in Python's stdlib `http.server` stack. Confirmed via the server's own log, not just inferred. Checked `index.html`'s dashboard: there's no order-*creation* UI at all (only read + status-update) and `POST /api/orders` requires the admin key (unlike `/api/webhook/line`, which verifies LINE's signature instead) — so this isn't reachable by an anonymous visitor, but a legitimate admin-key holder using a future POS form or a slightly-wrong integration script would hit a silent dead end instead of an actionable error. Also confirmed the crash doesn't take the whole server down — `http.server`'s base request handler catches the exception at the framework level and keeps serving other requests — so this was a per-request robustness gap, not a full outage risk.

**Fix:** validate `items` is a list of dicts before processing; return a clean `400` with an explanation instead of crashing.

**Verified live:** reproduced the exact original crash first (confirmed via the server log's traceback) before touching anything. After the fix: the identical malformed payload now returns a proper `400` instead of an empty response; the server stays healthy for the next request; a correctly-shaped order (real `product_id`/`qty`/`price` objects) still creates successfully with the right computed total; an order with `items` omitted entirely still defaults cleanly to an empty order; a list containing a non-dict element is also correctly rejected. Pushed to `smart-e`'s existing PR #1 branch — full writeup in that repo's commit message, no `DECISIONS_LOG.md` there.

4 items still pending an owner decision, unchanged; `otop-ai-landing`'s domain question also unchanged. Noted but not chased this cycle: `_create_product`/`_create_customer`/the payment routes in `smart-e` likely have similar unguarded `.get()` chains on request-body shape — worth a similar pass next time that repo comes up, not fixing speculatively without reproducing each one first.

---

### 2026-07-05 — Hourly loop, run 44: closed the consent-flow audit (no more instances found), then found and fixed a real Thai-name display bug in the affiliate ref code — the code shown to the user could silently diverge from the one actually stored

PR #79: rate-limited again on the API-confirmed real status (2 of 3), same recurring pattern.

**Finished the sweep queued at the end of run 43:** checked whether consumer/middleman/creator have a primary signup page outside `/portals/*` the way producer (`/join`) and affiliate (`/affiliate`) did. They don't — no `ConsumerPage.jsx`/`MiddlemanPage.jsx`/`CreatorPage.jsx`-shaped files exist anywhere outside the `portals/` folder. Also checked the other pages with email inputs (`ContactPage.jsx`, `PaymentPage.jsx`, `ProducerManagePage.jsx`, the homepage waitlist) — none are new-business-relationship signups needing PDPA consent the way the portal/join/affiliate forms are (a direct support inquiry, a payment receipt, self-service by an already-approved producer, and an already-reviewed marketing opt-in respectively). The 3-run consent audit (runs 40/42/44) is now genuinely closed, not just paused.

**Found something different while closing that out — re-examined a "cosmetic, out of scope" note from run 43's own writeup rather than letting it sit:** `AffiliatePage.jsx`'s `genRefCode(name)` doesn't strip non-Latin characters, so a Thai name (the overwhelmingly common case on a Thai-first platform) produces a ref code containing Thai characters. The page never read `POST /api/affiliate/apply`'s response body at all — it always displayed its own locally-generated `code`/`link` on the success screen, regardless of what the server actually did with it.

**Verified precisely what "actually did with it" means, rather than assuming the worst or dismissing it as harmless:** `registerAffiliateCore()` (`server.js`) strips exactly the same non-`[A-Za-z0-9_-]` characters from any submitted `ref_code` before storing it — so for a Thai name, the *real* stored `ref_code` is just whatever ASCII survives (e.g. `"N88"`), while the frontend was showing the user something like `"สมชายใN88"`. Traced whether this actually breaks commission attribution: every consumer of `ref` (click tracking, checkout, `/earn`, `/affiliate-programs`, `/pay`) applies the identical stripping regex, so a shared link with the Thai-charactered code *does* still reduce to the same surviving ASCII and technically still attributes correctly today — this is a display/trust bug, not (currently) a broken-commission bug, and worth being precise about the difference rather than overclaiming severity.

**Fix:** `handleSubmit` now reads the real `POST /api/affiliate/apply` response and uses its `data.ref_code`/`data.ref_link` for the success screen, falling back to the locally-generated one only if the request fails outright (matching the existing "offline — still show success" resilience choice already in this code, not removing it).

**Verified live:** registered through the real `/api/affiliate/apply` endpoint with the exact Thai name `"สมชาย ใจดี"` and the exact ref_code the real frontend would generate for it — confirmed the server actually stores `"N88"`, not the Thai-charactered version. Then drove a real headless browser through the actual `/affiliate` form with that same Thai name and confirmed the success screen now shows `"N88"` — matching the stored record exactly, extracted and cross-checked byte-for-byte via `affiliates.json`. Re-ran the same flow with a plain ASCII name (`"JohnSmith"`) to confirm the ordinary case still displays and stores identically (no regression). Accidentally `rm`'d the tracked `affiliates.json` placeholder again during cleanup (same slip as run 43) — caught it in `git status` and restored via `git checkout` before committing, same as last time.

4 items still pending an owner decision, unchanged; `otop-ai-landing`'s domain question also unchanged.

---

### 2026-07-05 — Hourly loop, run 43: same gap, third place — `/affiliate` (the *primary* affiliate signup, not `/portals/affiliate`) also had zero PDPA consent UI, plus the same internal-bridge trap as run 42

GitHub MCP tools were unavailable this cycle (needed re-auth) — couldn't check PR #79's live status via the API the way previous cycles did; proceeded with local git operations only, which don't depend on it.

**Followed the same pattern as run 42, one level further:** after finding `/join` lacked consent UI last cycle, checked whether the *other* half of the producer/affiliate pairing had the same issue — `AffiliatePage.jsx` (`/affiliate`, the site's main, most-promoted affiliate signup — homepage nav button, footer link, `/pricing`'s affiliate banner — not the less-prominent `/portals/affiliate`). It had **zero** consent UI, same as `/join` before its fix.

**Fix, exact same shape as run 42's producers.js fix:** `registerAffiliateCore()` (used by both `POST /api/affiliate/apply` directly and the `handleNewPortalLead()` auto-registration bridge for `/portals/affiliate` leads) now requires `consent === true` and stores it on the record. Added the same `CONSENT_TEXT`-plus-checkbox pattern to `AffiliatePage.jsx`, disabling submit until ticked and including `consent` in the submitted body.

**Caught the identical cross-cutting break as run 42, in the parallel code path:** `handleNewPortalLead()`'s affiliate branch calls `registerAffiliateCore({ name, email, platform })` without `consent` — same silent-breakage shape as the producer bridge (the portal lead still saves; only the invisible auto-registration into the real affiliate system, with its ref code and welcome email, would start failing on every submission). Fixed identically: passed `consent: true` explicitly at that call site, since `portal-leads.js` already required and verified it for that submission before this internal call is ever reached.

**Verified live:** rebuilt, booted a fresh backend. Hit `/api/affiliate/apply` directly — no consent rejected (400), `consent:true` accepted (200, real ref code generated). Submitted through `/api/leads/submit` (type `affiliate`) and confirmed via the backend log that the internal auto-registration still fires (`✅ Portal lead (affiliate) auto-registered...`). Checked `affiliates.json` and confirmed both the direct and portal-bridged records show `consent: true`. Drove a real headless browser through the actual `/affiliate` page: submit button disabled until ticked, captured the real outgoing request body with `consent:true`, confirmed the ref-code success screen renders. (Also accidentally `rm`'d the tracked, empty `backend/data/affiliates.json` placeholder during test cleanup and caught it in `git status` before committing — restored via `git checkout` rather than letting an unrelated deletion slip into this diff.)

**Not chased, out of scope for this fix:** noticed `genRefCode()` uppercases the raw name without stripping non-Latin characters, so a Thai name produces a ref code with Thai characters embedded in a URL (`?ref=คนทดสอ4QG`) — cosmetically odd but pre-existing and unrelated to consent; noting it rather than scope-creeping into fixing it now.

4 items still pending an owner decision, unchanged; `otop-ai-landing`'s domain question also unchanged. Worth checking next cycle: whether `/portals/creator`, `/portals/consumer`, `/portals/middleman` etc. have similar *primary, non-portal* signup pages elsewhere in the app with the same gap, following this same pattern.

---

### 2026-07-05 — Hourly loop, run 42: `/join` — the *other* producer signup flow — had no PDPA consent UI at all, not even a checkbox; also found and fixed an internal bridge that would have silently broken

PR #79: same recurring Vercel quota pattern, real status API checked directly (not the bot comment, which has repeatedly lagged behind the actual per-commit state this session) — not actionable.

**Followed up on run 40's fix rather than starting fresh:** that run closed the consent gap on all 9 `/portals/*` pages, but this app has a *second*, completely separate producer-signup code path — `/join` (`ProducerJoinPage.jsx`) → `POST /api/producers/apply` → `producers.js`. Checked it specifically because it collects the exact same fields (company, contact name, phone, email) for the same purpose. It had **zero** consent UI — not a checkbox that failed to wire through like the portals had, just nothing at all. Confirmed this page is genuinely live, not a dead leftover: linked from the homepage footer (`footer.link.producer`) and listed in `sitemap.xml`.

**Fix:** added the same `CONSENT_TEXT`-plus-checkbox pattern used in all 9 portal pages to `ProducerJoinPage.jsx` (this file uses the shared `useLang()` i18n system rather than each portal's local per-file translation object, so reused that where it already existed and added a local `CONSENT_TEXT` just for the consent line itself, matching the portals' own approach for that one piece of text). `backend/producers.js`'s `register()` now requires `consent === true`, same shape as `portal-leads.js`'s `submit()` from run 40.

**Caught a real cross-cutting break before it shipped, not after:** `server.js`'s `handleNewPortalLead()` auto-registers any `/portals/producer` lead into the *real* `producers.js` system too (a bridge built specifically so portal leads don't just sit in an admin-only queue) — via an internal call to `producers.register()` that never passed `consent`. Adding the new requirement to `register()` would have silently broken that bridge the moment it shipped, with no user-facing symptom (the portal lead still saves fine; only the invisible auto-registration into the real producer system would start failing on every single submission). Since a lead only reaches this internal call *after* `portal-leads.js` already required and verified `consent: true` for that exact submission, fixed it by passing `consent: true` through explicitly at that call site — not a bypass, an accurate reflection that consent was already given and checked upstream for this data.

**Verified live:** rebuilt, booted the backend fresh. Hit `/api/producers/apply` directly — no consent rejected (400), `consent:true` accepted (200). Submitted through `/api/leads/submit` (the portal path) with `consent:true` and confirmed via the backend log that the internal producer auto-registration still fired successfully (`✅ Portal lead (producer) auto-registered...`) — the exact bridge that would have silently broken. Checked the persisted `producers.json` and confirmed **both** the direct `/join` submission and the portal-bridged one show `consent: true`. Then drove a real headless browser through the actual `/join` page: submit button genuinely disabled until ticked, captured the real outgoing request body with `consent:true`, and confirmed the success message renders.

4 items still pending an owner decision, unchanged; `otop-ai-landing`'s domain question also unchanged.

---

### 2026-07-05 — Hourly loop, run 41: full regression sweep after run 40's 12-file consent change — clean, no new code shipped this cycle

PR #79: Vercel status still mixed per the real commit-status API (`openthai-ai` project succeeded, `-backend`/`-npxn` rate-limited) — the bot's PR comment table showed "all Ready" at one point during this cycle, which didn't match the API; trusted the API, not the comment, consistent with this log's running note that the comment table can lag/misreport. Recurring quota issue, not actionable.

**Checked two adjacent things before picking a new task, found nothing worth changing:**
- `PDPABanner.jsx` (cookie-consent banner) stores its accept/reject choice only in `localStorage`, no server record — looked like it might be the same class of bug as run 40's portal-consent gap, but it isn't: cookie/analytics consent is a browser-session preference, not a specific person's submitted-data consent, and storing it client-side + gating `gtag('consent', 'update', ...)` off of it is the standard, correct pattern for this kind of banner everywhere. Not a bug.
- The homepage's waitlist email-capture (`handleJoin` → `POST /api/waitlist`) has no explicit consent checkbox, unlike the 9 portals. Considered whether this is the same gap, but it's a genuinely different, more debatable case (single-purpose "get free tips" opt-in via affirmative submission, with working unsubscribe links already confirmed in earlier runs) rather than the portals' multi-field business-signup consent — didn't manufacture a fix here without being sure it's actually broken.

**Given run 40 touched 12 files across 9 portal pages plus shared backend logic, ran a full regression sweep before considering it done-done:** rebuilt the frontend against a local backend, then drove a real headless browser across 21 routes (homepage, pricing, about, catalog, all 9 portals, privacy/terms/contact, affiliate, payment, etc.). Initial pass showed every single route "timing out" on navigation — dug into this rather than either dismissing it or panicking: root cause was `fonts.googleapis.com`'s stylesheet request hanging indefinitely under this sandbox's outbound proxy (confirmed directly by inspecting Playwright's still-pending-requests list), which blocks the browser's `load` event even though the page underneath renders completely fine. Confirmed real content still rendered correctly on every route (route-specific body sizes, no `pageerror` JS crashes anywhere) — an environment artifact, not a regression, and it affected literally every route uniformly including ones untouched by any recent commit, which rules out a code-level cause.

No code change shipped this cycle — a clean verification pass is also a legitimate outcome, not a failure to find work; forcing a low-confidence fix (like the waitlist consent question above) just to have a diff would have been worse than shipping nothing.

4 items still pending an owner decision, unchanged; `otop-ai-landing`'s domain question also unchanged.

---

### 2026-07-05 — Hourly loop, run 40: all 9 `/portals/*` signup forms required a PDPA consent tick client-side, but the backend never actually recorded it — real compliance gap, now closed

PR #79: Vercel quota rate-limited again (same recurring 24h operational cycle, not a code issue).

**Found while double-checking last run's own finding** (run 39 confirmed `GovThaiPortalPage` intentionally has only `th`/`en`, not a bug) — while re-reading these files, noticed every one of the 9 `/portals/*` pages disables its submit button via `disabled={!consent}` where `consent` is its own `useState`, but the actual fetch call only ever sends `{...form, type, lang}` — `consent` was never part of the payload at all. Confirmed this was universal, not a one-off, by grepping the exact submit call in all 9 files: identical shape everywhere, no exceptions.

**Why this matters, not just a missing field:** the UI enforces "you must tick this box to submit," which *looks* like real PDPA consent gating, but `backend/portal-leads.js`'s `submit()` never received or checked it — and even if a portal page *had* sent `consent: true` in the body, the record-building loop only kept `typeof v === 'string'` values, silently dropping a boolean. Net effect: **zero server-side evidence that anyone ever consented**, for every lead ever submitted through any of the 9 portals since they were built. If ever asked to demonstrate a specific person's consent (the actual point of PDPA/GDPR-style consent requirements), there was nothing to show — only "the button was disabled until they ticked it," which isn't verifiable after the fact.

**Fix:** `portal-leads.js`'s `submit()` now requires `input.consent === true` and rejects with 400 (`ต้องยินยอมตามนโยบายความเป็นส่วนตัว (PDPA) ก่อนส่งข้อมูล`) otherwise — this also closes a request-forgery gap where someone could've POSTed directly to `/api/leads/submit` bypassing the UI's checkbox entirely. Accepted leads now store `consent: true` on the record itself (alongside the existing `created_at` timestamp, which doubles as the consent timestamp — no need for a separate field). Updated all 9 portal pages to actually include `consent` in their submitted JSON body (one-line addition each, same `{...form, type, lang, consent}` shape everywhere).

**Verified live, not just via curl:** booted the backend fresh and hit `/api/leads/submit` directly for all three cases — no `consent` field (400, rejected), `consent:true` (200, accepted), `consent:false` (400, rejected — confirms it's not just checking truthiness of presence). Then rebuilt the frontend with `VITE_API_URL` pointed at that local backend and drove a **real headless browser** through `/portals/producer`: confirmed the submit button is genuinely disabled until the checkbox is ticked, captured the actual outgoing request body after ticking it and submitting, confirmed it contains `consent:true`, and confirmed the persisted record in `portal_leads.json` shows `"consent": true` next to a real `created_at` — an actual auditable trail now exists where none did before.

4 items still pending an owner decision, unchanged (3 `openthai-ai` security-adjacent items + `OpenThai-AI-v9.0`'s fabricated-content question); `otop-ai-landing`'s domain question from run 39 remains a separate low-priority item.

---

### 2026-07-05 — Hourly loop, run 39: audited `otop-ai-landing` end-to-end (found it honest, not broken) — shipped SEO hygiene there; `openthai-ai` itself had nothing new to fix

PR #79: Vercel free-tier quota hit the rate limit again (`Resource is limited — try again in 24 hours`, all 3 projects) — same recurring operational pattern as before, not a code issue, nothing to act on.

**Verification pass on `otop-ai-landing` (the landing page built in an earlier run) before deciding whether to touch it:** re-checked its own marketing claims against the real `openthai-ai` repo rather than assuming they were still accurate. The page claims signup pages support Thai/English/Chinese — initially grepped for `useLang`/`LanguageSwitcher` in `frontend/src/pages/portals/*.jsx` and found zero matches, which looked like a false claim at first. Read the actual files before concluding anything: the portal pages implement their own **self-contained** `th`/`en`/`zh` translation objects with their own inline language-switcher buttons, a different (but equally real) pattern from the shared `useLang` hook used elsewhere in the app. 8 of 9 portals have all three languages; `GovThaiPortalPage` intentionally only offers `th`/`en` (its own switcher only renders those two, no dangling `zh` button pointing at missing text) — a sensible scope choice for a Thai-government-specific portal, not a bug. Also re-ran the axe-core WCAG scan from the original build (still 0 violations) and confirmed all 13 CTA links still resolve to real routes. The page holds up — no fix needed there.

**What was real and worth shipping:** the page's `<head>` had no Twitter Card tags at all (sharing a link on Twitter/X would fall back to a bare text card) and no `og:image:width`/`height` despite the actual image being a valid 1200×655 PNG. Added both. Also added a `robots.txt` (previously 404'd — not a crawl blocker by default, since absence just means "allow everything," but an explicit `Allow: /` is standard and now matches `openthai-ai`'s own convention).

**Deliberately left unfixed and flagged, not guessed:** `og:image`/`twitter:image` are still relative paths (`og-image.png`), which the OG/Twitter Card specs technically want as absolute URLs — some link-unfurlers don't reliably resolve relative image paths. Fixing that needs this repo's real production domain, which isn't declared anywhere in the repo, its PR, or the GitHub repo metadata (unlike `openthai-ai`, where `https://www.openthai-ai.com` is used consistently everywhere and was safe to rely on for its own sitemap/robots work in run 36). Not fabricating a domain guess — flagging it as a small, contained, easy-to-finish-later item once the owner confirms the real domain.

Also checked `openthai-ai` itself this cycle for a broken-navigation class of bug (grepped every `navigate('/...')` call against `App.jsx`'s route table, similar in spirit to the `document.title` sweep in run 37) — first pass showed 4 "missing" routes (`/login`, `/dashboard`, `/tiktok`, `/facebook`), but that was a false positive from a grep pattern that didn't handle multi-line `<Route path=... element=...>` formatting; all 4 routes are real. No actual gap found, confirmed properly before logging it as one.

4 items still pending an owner decision, unchanged (3 from `openthai-ai`'s security backlog area + `OpenThai-AI-v9.0`'s fabricated-content question from run 38); the new otop-ai-landing domain question above is a separate, low-priority, easy item once answered — not blocking anything.

---

### 2026-07-05 — Hourly loop, run 38: this cycle's real fix landed in `smart-e`, not `openthai-ai` — plus a new fabricated-content finding in `OpenThai-AI-v9.0` flagged for the owner, not built on

PR #79 status checked first per usual: all 3 Vercel deploys green on the latest push, no new comments. Nothing needed in `openthai-ai` itself this cycle, so — per the standing order's "5 repos" scope — looked across the other 4 for real, verifiable work instead of manufacturing something in this repo just to have a diff here.

**`OpenThai-AI-v9.0` — found, but deliberately did not act on:** its `README.md`/`CHANGELOG.md`/`ARCHITECTURE.md`/`DEPLOYMENT.md`/`ROADMAP.md` etc. describe a full "Advanced Self-Healing AI System" with badges claiming TypeScript 5.0+/Node 18+/Active Development and detailed npm install instructions. The actual repo contains **two** source files total (`app/api/monitor/health/route.ts`, `app/affiliate-hub/page.tsx`) and **no `package.json`, no `next.config`, no `tsconfig.json`** — it cannot be installed or run as-is. The one real interactive page (`affiliate-hub`) posts to `/api/affiliate/apply`, which does not exist anywhere in the repo, so any real visitor who filled out that form today would always get "❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง." This is the same category of problem `all-platform-files` was already flagged for (run 5, still unanswered) — docs describing something that isn't there — just discovered in a different repo. **Not building a Next.js scaffold or backend for this** — deciding whether this repo should become a real minimal app, get its aspirational docs trimmed back to match reality, or be deprioritized is a product decision matching item 8, not something to guess at. Flagging alongside the existing `all-platform-files` question rather than silently fixing or silently ignoring it.

**What was actually shipped this cycle — `smart-e`:** while deciding where to look instead, checked whether the previous cycle's real security fix (`cfd9caf`, gating every `server.py` API route behind `X-Admin-Key` to close a genuine unauthenticated-full-CRUD vulnerability) had a live consumer that needed updating to match — this is the same "verify your own recent work" discipline as run 8's regression pass in this repo. It did, and hadn't been updated: `index.html`'s `api()` fetch wrapper never sent the new header, so **every dashboard API call started 401ing the moment the security fix shipped** — a real, complete regression of the admin UI, not just a rough edge. Fixed by having `api()` prompt once for the key (`window.prompt`, persisted in `localStorage`), attach it as `X-Admin-Key` on every call, and clear+reprompt on a 401 instead of failing silently forever.

While verifying that fix live, hit a *second*, unrelated pre-existing bug that was blocking the dashboard from ever rendering on initial load in the first place: `navigate()`'s `event?.currentTarget?.classList.add('active')` throws when called without a real click event — which is exactly how it's invoked from the `DOMContentLoaded` listener on page load (`window.event` at that point resolves to the DOMContentLoaded event itself, whose `currentTarget` has no `.classList`). Fixed with one more `?.` before `.add` so it safely no-ops outside a real click context, without changing behavior for actual nav-item clicks.

**Verified live for both**: booted `server.py` with a real `ADMIN_KEY`, reproduced the exact 401 regression first (`/api/products` → 401 with no key, 200 with the right one). Then drove a real headless browser through the full flow — initial load now renders the dashboard with real data instead of crashing before the first API call fires; a wrong key gets rejected and cleared from `localStorage`; reloading with the correct key persists and loads correctly; and a real click on a nav item still correctly applies the `active` class, confirming the extra `?.` didn't regress the working case. Pushed to `smart-e`'s existing PR #1 branch — no `DECISIONS_LOG.md` in that repo, so the full writeup is in the commit message there.

4 items now pending an owner decision (3 from `openthai-ai` + this new `OpenThai-AI-v9.0` finding, which mirrors the existing unanswered `all-platform-files` one); the producer-email-disclosure-via-search observation remains a separate, lower-priority note.

---

### 2026-07-05 — Hourly loop, run 37: 8 public pages never set `document.title` — browser tab still showed whatever page you came from

PR #79's Vercel deploy quota reset overnight (confirmed via the real GitHub status API, not just the bot's comment table which has shown stale/premature "Ready" states before) — all 3 projects green, `mergeable_state: clean`, no new PR comments. Nothing to build there.

**Task selection**: considered adding more pages to `sitemap.xml`/`robots.txt` (mirroring the `/about` pattern from earlier today) but audited each candidate first rather than assuming "public route = marketing page": `/earn` and `/affiliate-programs` are referral-link landing pages meant to be shared with a `?ref=CODE`, not organic search destinations; `/council` is the owner's personal Claude/Gemini/Grok bridge-notes tool (unauthenticated, but clearly not general-audience content — indexing it would be actively wrong); `/leaderboard` and `/router` are affiliate/ops utility dashboards. None of these belong in a public sitemap, so didn't add them — a real judgment call, not scope creep avoidance for its own sake.

**What was a real, unambiguous bug**: while checking `document.title` usage as part of that audit, found 8 public, unauthenticated pages that never set it at all — `AffiliatePage.jsx` (the actual `/affiliate` program page, not a minor one), `EarnHubPage.jsx`, `AffiliateProgramsPage.jsx`, `ContentStudioPage.jsx`, `CouncilPage.jsx`, `LeaderboardPage.jsx`, `RouterStatusPage.jsx`, `VoiceCommandPage.jsx`. Since this is a single-page app, visiting any of these client-side (not a fresh URL load) left the browser tab showing whichever page's title happened to render first that session — wrong tab title, wrong bookmark name, wrong browser-history entry, and a missing accessibility signal for screen-reader users on tab switch.

**Fix**: added `useEffect(() => { document.title = '...'; }, [])` to all 8, matching the exact convention already used by every other page in this codebase (`PrivacyPage.jsx`, `AboutPage.jsx`, etc.) — titles pulled from each page's own visible `<h1>`/hero text, not invented.

**Verified live**: rebuilt, served via `vite preview`, drove a real headless browser to each of the 8 routes directly and confirmed `document.title` is now correct for every one. Then specifically re-tested the actual reported failure mode — client-side navigation without a full page reload (`pushState` + `popstate`, the same mechanism React Router uses) from the homepage to `/leaderboard` — and confirmed the tab title updates correctly instead of staying on the homepage's title, which is the exact bug this fix closes.

4 items from earlier runs (3 owner-decision items + the producer-email-disclosure observation) unchanged.

---

### 2026-07-05 — Direct owner request: repriced Pro/Premier and added a new Enterprise tier

Owner instruction: "Free / Pro ฿299 / Premier ฿599 / บริษัทข้ามชาติ ฿1,299" — a real pricing change plus a brand-new 4th tier for multinational companies. Found and updated **every** place pricing exists in this codebase, not just the visible pages, since the actual source of truth for what a customer gets charged is `backend/omise-payment.js`'s `SUBSCRIPTION_PLANS` map — the frontend pages just display numbers that have to match it.

**Backend (the numbers that actually get charged):**
- `omise-payment.js`: `pro` ฿20→฿299, `premier` ฿30→฿599, added `enterprise: { price_thb: 1299, omise_plan_id: process.env.OMISE_PLAN_ENTERPRISE }`.
- `server.js`: `PAID_PLANS` (grants unlimited daily generation quota) now includes `enterprise`; updated the mock-mode startup warning to mention the new `OMISE_PLAN_ENTERPRISE` env var.
- `.env.example`: added `OMISE_PLAN_ENTERPRISE=` alongside the existing Pro/Premier plan-ID placeholders.

**Frontend (every place a human sees a price):** `LandingPage.jsx`'s homepage pricing preview, `PricingPage.jsx`'s full plans grid (added Enterprise as a 4th card, ≈$8/$16/$35 USD estimates alongside the THB prices), and all three `i18n` languages (`th`/`en`/`zh`) for both the `plans` key (Landing) and `pp.plans` key (Pricing) — including the `cta` button text that embeds the price directly (e.g. "เริ่ม Pro ฿299/เดือน"). Also fixed `AIGeneratorPage.jsx`'s plan-name badge, which only distinguished `premier` vs. defaulting everything else to "Pro" — an Enterprise subscriber would have been mislabeled "Pro" without this fix.

**Verified live:** rebuilt the frontend, confirmed via a real headless browser that both the homepage and `/pricing` render all 4 tiers with the correct numbers and zero remaining trace of the old ฿20/฿30 anywhere on either page. Hit the real `POST /api/payment/create` endpoint for all three paid plans and confirmed the actual computed `amount_thb` matches exactly (299/599/1299); confirmed the free plan still short-circuits with no charge, and confirmed an invalid/unknown plan key is still rejected with `400`.

5 items from earlier runs (4 owner-decision items + the new low-priority producer-email-disclosure observation) are unchanged by this entry — this was a direct content/pricing request, not part of the security backlog.

---

### 2026-07-05 — Owner decision received (part 2 of 2): fixed the run-1 producer-apply hijack, flagged on the very first hourly cycle

**Second of the two owner-approved fixes this session** (payment-cancel above was part 1). Re-verified the exact vulnerability described in run 1 was still real: `POST /api/producers/apply` (`producers.js`'s `register()`) upserts by email with zero identity check — if the email already belongs to an existing record, it silently overwrites `company`/`product_name`/`price`/`description` and unconditionally resets `status` back to `'pending'`, pulling an already-approved producer off the public catalog. `/api/producers/search`'s public response includes each producer's `email`, so an attacker doesn't even need to guess it. Confirmed both halves still true by reading the current file before writing anything.

**Fix, deliberately not another email-confirmation-link:** unlike payment-cancel, this one didn't need a new async mechanism, because run 31 already built the correct legitimate path for this exact need — `/producers/manage` lets an *approved* producer edit their own listing without touching `status` (`POST /api/producers/update-listing`, gated on `status === 'approved'`). So the real fix is narrower: `register()` now checks whether the submitted email already belongs to a producer with `status` `approved` or `suspended`, and if so, **refuses the overwrite outright** (returns a 400 with a message pointing at `/producers/manage`) instead of processing it. `pending`/`rejected` emails can still resubmit exactly as before — there's no live public listing at stake yet for those, so the original convenience (fixing a typo before approval) is preserved.

**Verified live, adversarially — the exact attack run 1 described:** applied and approved a real producer (`ร้านของจริง`, real listing live on `/api/catalog`), then replayed the attack — re-submitted `/api/producers/apply` with the *same email* and hostile replacement data (`ร้านปลอมของแฮกเกอร์`). Got a `400` rejection; confirmed the public catalog and the producer's own status afterward were **byte-for-byte unchanged** — no overwrite, no reset to pending. Then confirmed the two cases that must keep working: a still-`pending` applicant resubmitting to fix their own details succeeds and reflects the update (unchanged behavior), and a brand-new email applies normally.

**Not fixed this cycle, noted for later:** `/api/producers/search`'s public disclosure of producer email addresses (the reconnaissance step of this attack) is a separate, lower-severity privacy question — worth a future look, but the hijack it enabled is now closed regardless of whether the email itself stays discoverable.

Both of the two payment/producer security items approved this session are now shipped and verified. 3 items from earlier runs are still pending an owner decision (down from 5 at the start of today): run-3's creator-portal account-provisioning gap, run-5's all-platform-files fabricated-content question, and the newly-noted producer-email-disclosure-via-search observation above (low priority, not blocking).

---

### 2026-07-05 — Owner decision received: fixed the run-13 subscription-cancellation hijack, flagged 22 cycles ago and left open pending exactly this call

**Owner reviewed both remaining flagged decisions this session and approved fixing them, in order: payment-cancel first, then the run-1 producer-apply hijack.** This entry covers payment-cancel.

Re-verified the bug was still real before touching anything: `POST /api/payment/cancel` and `GET /api/payment/entitlement` still took only a bare `email` with zero session/login binding — anyone who knew (or guessed) a paying customer's email could cancel their real Omise subscription outright. Run 13 (2026-07-04) explicitly declined to auto-fix this because the two candidate fixes both changed live UX for real paying customers (email-confirmation friction, or waiting for a full login system with a backfill migration) — a product call, not a same-shape bug fix, per item 8. That decision has now been made.

**Fix — same email-confirmation-link pattern already proven for PDPA erasure (run 12) and affiliate withdrawal (run 17), not a new mechanism:** split `POST /api/payment/cancel` into two steps. The POST now only sends a confirmation email (`unsubToken(email, 'payment-cancel')`) and no longer touches the entitlement; a new `GET /api/payment/cancel/confirm?email=&token=` verifies the token and only then calls `cancelSubscription()` and flips `status` to `cancelled`. Tightened the initiation route to its own limiter (`paymentCancelLimiter`, 5/hour) matching erasure's budget for account-destructive actions, separate from the more lenient read-only `paymentAccountLimiter` already on `GET /api/payment/entitlement`. Updated `PaymentPage.jsx`'s `handleCancelSubscription` (previously assumed instant synchronous cancellation) to show "ส่งอีเมลยืนยันแล้ว — เช็คอีเมลเพื่อกดยืนยันยกเลิก" instead of an immediate cancelled state.

**Verified live, adversarially — the exact attack run 13 described:** seeded a real active entitlement locally, called `POST /api/payment/cancel` with only the email (no other credential) and confirmed the subscription **stayed active** — the old one-shot hijack no longer works. Caught the real confirmation email via a local SMTP catcher, followed the real link, and confirmed the subscription only then flipped to `cancelled`. Confirmed a wrong/tampered token is rejected (403), confirmed re-visiting the same valid link after cancellation returns "ยกเลิกไปแล้วก่อนหน้านี้" instead of double-processing, and confirmed re-initiating cancellation on an already-cancelled account is rejected (400) rather than re-sending. `npm run build` compiled cleanly.

**Next up (owner-approved, not yet built):** the run-1 producer-apply hijack (`POST /api/producers/apply` accepting an unauthenticated upsert keyed only by email, able to silently overwrite an approved producer's listing and knock them back to `pending`) — queued as this session's immediate next task.

4 items from earlier runs are still pending an owner decision (down from 5 — payment-cancel is resolved); the producer-apply item above is approved-but-not-yet-built, not a new open question.

---

### 2026-07-05 — Direct owner request: new `/about` page, currently just a skill-tag list (placeholder, deliberately not a full bio)

Owner asked to add 10 topics ("Artificial Intelligence", "Machine Learning", "Prompt Engineering", "Claude/ChatGPT/Grok", "Data Analytics", "AWS Certified", "Data Science", "Big Data", "Python", "Ethical Hacking") as "skill tags" on the site. These read like personal/professional skill tags, not anything tied to OpenThaiAi's actual product surface, so — following the same verify-before-build discipline as everything else in this log — checked before placing them anywhere: no `About`/`Team`/`Profile` page or route existed in this repo at all. Asked the owner where these should go and whether a full profile (name/photo/bio) should ship alongside them; confirmed: build a new `/about` page, skill tags only for now, no bio content yet (that's expected to come later).

**Built:** `frontend/src/pages/AboutPage.jsx`, a new page in the same style convention as `PrivacyPage.jsx`/`TermsPage.jsx` (sticky header with back button, gradient hero, dark theme) showing the 10 tags as pill badges under a generic "ทีมงานเบื้องหลัง Openthai.ai" heading — no invented name, title, photo, or biographical claims about the owner, since none were provided and this log's whole point is not fabricating content about real people/entities. Wired the route into `App.jsx`, added a footer link on `LandingPage.jsx` (next to Privacy/Terms/Contact) so it's actually discoverable, and treated it as a normal public page for SEO purposes: added to `sitemap.xml`, `robots.txt`'s `Allow` list, and `prerender-meta.mjs`'s per-route title/description list, matching exactly how `/privacy`/`/terms`/`/contact` are already handled.

**Verified live:** built the frontend, confirmed `/about/index.html` prerendered with the correct title, served via `vite preview`, and drove a real headless browser: clicked the new footer link from the homepage and confirmed it actually lands on `/about` (not just that the route exists in isolation), confirmed all 10 tags render as text on the page, and ran the same `axe-core` WCAG scan used throughout this session's accessibility work — 0 violations on the new page.

Not queued as a follow-up, but noted for whenever the owner is ready: this page currently has no name, photo, or bio — just tags floating under a generic heading — so it reads as a placeholder rather than a real About/Team page until that content exists.

---

### 2026-07-05 — Hourly loop, run 34: approving a producer never told them — closes the loop with run 31's self-serve listing page

**Found by re-auditing run 31's own feature area.** `POST /api/producers/admin/status` (the admin action that flips a producer from `pending` to `approved`) only ever updated the database row — no notification of any kind. A producer who applied had exactly one way to discover they'd been approved: proactively visit `/producers/manage` and check, despite nothing in the initial "รับใบสมัครแล้ว" confirmation ever mentioning that page exists. This is the same "promised/implied follow-up that never actually happens" pattern already fixed for consumer/middleman leads (run 2) and 4 portal types (run 19) — just found in a part of the funnel none of those runs touched.

**Fix:** added `sendProducerApproval(to, company, product_name)` (same visual template convention as `sendAffiliateWelcome`/`sendPortalWelcomeEmail` — dark card, gradient header, single CTA button), wired into `/api/producers/admin/status` so it fires exactly once, only on the real `pending/rejected/suspended → approved` transition (not on an admin re-clicking approve on an already-approved producer). The email's CTA links straight to `/producers/manage?email=...`, so the producer lands directly on the self-serve editing page from run 31 instead of having to know it exists.

**A real bug caught only because of live verification (not something a code read would have caught):** the first implementation compared `prev.status` (the producer's status *before* the update) against `'approved'` *after* calling `producers.setStatus()`. `producers.setStatus()`'s file-mode path (`backend/producers.js`) mutates the same object in place (`store[e].status = status`), and `producers.all()` returns `Object.values(store)` — **live references into that same store, not copies**. So `prev` was pointing at the exact object `setStatus` had just mutated, meaning `prev.status` had already silently become `'approved'` by the time it was checked, and the condition was always false — the email would never have fired for anyone, in production, despite the code looking correct on read-through. Caught by wiring a real local SMTP catcher (a throwaway `smtp-server` instance) and observing zero emails arrive on a real pending→approved transition; root-caused with targeted `console.log`s comparing the object dump immediately before vs. the boolean check immediately after the mutating call. Fixed by capturing `prevStatus`/`prevCompany`/`prevProductName` as primitives *before* calling `setStatus`, so the later mutation can't retroactively change what was already read.

**Verified live, full real cycle:** ran the backend against a real (if throwaway) SMTP server and drove the actual HTTP flow — applied a producer (`pending`) → approved via the admin route → confirmed a real captured email with the correct subject, the producer's real company/product name interpolated, and a working `/producers/manage?email=...` link. Re-approved the same already-approved producer → confirmed zero additional email (no duplicate-notification spam). Suspended then re-approved the same producer → confirmed the email fires again correctly, proving the guard checks the *transition*, not just "is the target status approved."

No new items queued — this closes the gap cleanly. 5 items from earlier runs are still pending an owner decision, unchanged.

---

### 2026-07-05 — Rejected another fabricated spec: `src/types/entity.ts`, `DiscoveryEngine.findPotentialMatches`, `international_service_provider` entity type — none of it exists in this repo

Pasted content (same pattern as the Neo4j/Stripe/tokenizer/`acquisition_pool` incidents recorded elsewhere in this log) proposed adding an `EntityType` union to `src/types/entity.ts`, a cross-border matching rewrite of `DiscoveryEngine.findPotentialMatches` querying a Supabase `entities` table (`entity_type`, `location->>province`, `attributes->>main_category`), and a new `international_service_provider` category for foreign logistics/import-export/distributor companies. **None of this exists.** Verified by grep across the whole repo for `EntityType`, `DiscoveryEngine`, `findPotentialMatches`, `entity_type`, `international_service_provider` — zero matches. There is no `src/types` directory anywhere in this repo, and no `entities` table in any of `backend/migrations/*.sql`. This codebase has no generic "entity/discovery-engine" matching system at all — producers, affiliates, and portal leads are each their own dedicated file (`producers.js`, `portal-leads.js`, etc.), not rows in a shared polymorphic table.

Rejected without building on it, per the standing policy this log already documents (`docs/ai-memory/core-philosophy.json`'s `lesson_01_verify_before_build`): confident, well-formatted, code-shaped pasted content is not evidence it's grounded in what's actually in this repo. No legitimate real task was extractable from the pasted spec itself (unlike the Daily Status Reporter incident, where a real underlying bug was found once the fabricated framing was set aside) — the message's only concrete, in-scope, verifiable request was to keep watching PR #79 for new activity, which was actioned directly (`subscribe_pr_activity`) rather than folded into a spec that doesn't match this codebase.

---

### 2026-07-05 — Hourly loop, run 33: every social link preview (Facebook/LINE/Twitter/Slack) has been broken since this repo's first commit — `og:image` pointed at a file that never existed

**Found via a marketing/SEO scan, verified against real files before touching anything.** `frontend/index.html`'s `og:image`/`twitter:image` meta tags (plus `manifest.json`'s screenshot entry) point at `https://www.openthai-ai.com/og-image.png`. `frontend/public/` has never contained an `og-image.png` — only `og-image.svg`. Checked with `git log -S`/`git log -p` on both files: they were introduced in the *same* commit (`6cac3df`, June 22, this repo's earliest history), so this mismatch has existed since day one, unnoticed across 33 hourly cycles because it only manifests when an external crawler (not a normal browser visit) fetches that exact URL and gets a 404 — every link shared on LINE/Facebook/Twitter/Slack has been showing no preview image at all, silently undermining the "เข้าตลาดให้เร็วและกว้างที่สุด" (fast, wide market entry) goal this whole session is driving toward.

**Why not just point the tag at the `.svg` instead:** Facebook, Twitter/X, and LINE's link-preview crawlers do not reliably render SVG for `og:image` (most require a raster format) — renaming the reference would trade a guaranteed-broken 404 for a probably-still-broken unsupported-format image, not a real fix.

**Fix:** rasterized the *existing* `og-image.svg` (a real, already-designed 1200×630 asset from the same original commit — no new copy/stats invented) to a real `og-image.png` at the exact dimensions already declared in the meta tags (`og:image:width=1200`, `og:image:height=630`). Used a real headless browser (Playwright/Chromium) to render it, since this sandbox has no Thai-script font installed by default (`fc-list` showed only the emoji font) — installing one first (`fonts-thai-tlwg`) and visually inspecting the rendered output was necessary to confirm the Thai headline/subtext render as real glyphs, not tofu boxes, before shipping it as the canonical social-preview image.

**Verified live:** rebuilt the frontend, confirmed `dist/og-image.png` exists at 1200×630, served it via `vite preview`, and fetched `http://localhost:4176/og-image.png` directly — `200 OK`, `Content-Type: image/png` (previously would have 404'd). Also confirmed the homepage's rendered `og:image` meta tag still points at this exact path, and that `og-image.svg` continues to serve independently (kept as the editable source, no longer referenced by any meta tag). Visually inspected the rendered PNG: headline, subtext, stat pills, and CTA all legible; a small cosmetic overlap between the mockup card's internal tab label and its content box is inherent to the original SVG's layout (present in the source since its original commit, unrelated to this fix) — not something to redesign as part of a "make the missing file exist" bug fix.

No new items queued — the file now exists and matches what every page has already been declaring since day one. 5 items from earlier runs are still pending an owner decision, unchanged.

---

### 2026-07-05 — Hourly loop, run 32: closed a real privacy gap in run 31's own work — the new self-serve producer page wasn't excluded from search-engine crawling

**Found by re-scanning last cycle's own change, not new spec.** Run 31 built `/producers/manage`, which takes the producer's own email as a URL query param (`?email=...`) so a producer can jump straight to checking their status after applying — same shape as `/track` (order id + contact) and `/dispute` (dispute id + contact). Both of those existing pages are correctly excluded from search-engine indexing in `frontend/public/robots.txt` (`Disallow: /track`, `Disallow: /dispute`) precisely because a shared, bookmarked, or cached link carries someone's real contact info in the URL. Re-checked `robots.txt` against the new route while reviewing what else this cycle should touch and found `/producers/manage` was missing from that same disallow list — meaning if a producer ever pasted their pre-filled status-check link somewhere public (a Facebook post, a forum, a support chat), a crawler could index a URL containing their real email address. This is a genuine gap the standing order's "scan the code for real bugs" category exists to catch, and it's this session's own oversight from the immediately preceding cycle, not a pre-existing issue.

**Fix:** added `Disallow: /producers/manage` to `robots.txt`, right alongside the existing `/track`/`/dispute` entries — same pattern, same reasoning, no new mechanism invented. Confirmed this repo's other identity-bearing pages (`TrackOrderPage.jsx`, `DisputeTrackPage.jsx`, `AffiliateDashboard.jsx`) also rely on `robots.txt` alone (no per-page `noindex` meta tag), so this fix matches the established convention rather than introducing an inconsistent one.

**Verified live:** rebuilt the frontend, confirmed the built `dist/robots.txt` contains the new rule, then served it via `vite preview` and fetched `http://localhost:4175/robots.txt` directly — confirmed the live response includes `Disallow: /producers/manage`. `/producers/manage` was already absent from `sitemap.xml` (correct — it was never added there), so no companion fix was needed on that file.

No new items queued from this cycle — this fully closes the gap it found. 5 items from earlier runs are still pending an owner decision, unchanged.

---

### 2026-07-05 — Hourly loop, run 31: built the self-serve producer product listing queued all the way back on 2026-07-03 — never actually built until now

**Re-verified before building.** The very first hourly-loop cycle audited `backend/inventory.js` and queued "no self-serve path for a producer to list their own product" as the next real task. That queued description turned out to describe a since-replaced architecture (`inventory.js` is now a first-party admin catalog with only one public route, `GET /api/shop/products`) — the *actual* producer-facing catalog lives in `backend/producers.js` (`register()` → `pending`, admin `setStatus()` → `approved`, public `catalog()`). Re-checked that file fresh rather than trusting the 28-cycles-old description: `producers.js` already had an `updateListing()` function (added in an earlier run specifically so an approved producer's stock/price could be topped up without resetting them to `pending` via re-applying), but it was **only reachable through `POST /api/producers/admin/update`, gated by `x-admin-key`**. So the same real gap the first cycle found is still real today, just in the current file: an approved producer has no way to restock, reprice, or edit their own listing without asking an admin to do it for them via the admin panel — a genuine bottleneck against "เข้าตลาดให้เร็วที่สุด" (fast market entry), and squarely inside the "consent-based producer/portal improvements" category, not new scope.

**Fix — identity pattern reused, not invented** (same email-match convention `disputes.js` established, since this codebase has no producer login/session): added `myStatus(email)` (returns the producer's own application status + current listing — including `pending`, so an applicant can see they're still waiting) and `selfUpdate(email, fields)` (only permits the edit if the matching record's `status === 'approved'`; otherwise returns the same generic "not found" used for a nonexistent email, so the endpoint never discloses whether an email exists or what stage its application is at). Wired 2 new public, rate-limited (20/15min) routes in `producers.js`: `GET /api/producers/my-status` and `POST /api/producers/update-listing`. Built a new frontend page, `ProducerManagePage.jsx` (`/producers/manage`) — email in, status badge out, and (only when approved) an editable form for product name/category/price/stock/description that posts straight to the new endpoint. Linked it from `ProducerJoinPage.jsx`'s nav bar and from the post-application success screen (pre-filled with the email just submitted), so a producer can actually find it.

**Verified live, full real cycle, no shortcuts:** ran the real backend locally against a scratch data dir. Applied a real producer via `POST /api/producers/apply` (status: `pending`) → confirmed `GET /api/producers/my-status` correctly reports `pending` → confirmed `POST /api/producers/update-listing` correctly **rejects** the edit with a generic 404 while still pending (no bypass) → approved the producer for real via the existing admin route → confirmed the exact same self-update call now succeeds and the public `GET /api/catalog` immediately reflects the new price/stock/description → confirmed a nonexistent email gets the identical generic 404 as the pending-but-real case (no identity leak either direction). Then rebuilt the frontend wired to that same live backend (`VITE_API_URL`) and drove the actual UI with a real headless browser (Playwright): typed the producer's email into `/producers/manage`, saw the real "✅ อนุมัติแล้ว" badge and the pre-filled form, edited the product name/price/stock through the real inputs, clicked save, saw the real "บันทึกสำเร็จ" success message — then re-queried `/api/catalog` directly and confirmed the values matched exactly what was typed into the browser, proving the UI is really wired to the backend end-to-end, not just independently functional. Screenshotted the final state for a visual record.

This closes the oldest unaddressed item in the entire standing-order backlog — queued in the very first cycle, still valid 31 cycles later because nothing since had re-verified whether it was already done.

5 items from earlier runs are still pending an owner decision, unchanged.

---

### 2026-07-05 — Hourly loop, run 30: closed the last 3 items run 28 explicitly queued — portal-card badges/links, the locked Foundation card's washed-out text, and the homepage footer

**Direct continuation of run 28's queue** ("the `/portals` hub's translucent category-badge overlays ... the locked Foundation card's intentionally-dimmed styling, and the homepage footer copyright text"). All three were distinct problems, not one mechanical pattern, so each got its own fix:

**1. Portal-card badge/link text on dark backgrounds (producer, gov-intl, intl-org):** these 3 accent colors (`#6366f1`, `#3b82f6`, `#8b5cf6`) were failing 4.5:1 as text on `PortalHubPage.jsx`'s dark card background (`#111`) and the translucent corner badge (~13%-opacity tint over the same dark background). Important direction check: run 29 fixed the *same* accent colors as *white-button-background* fill (needed *darker* shades so white text stays legible on top). This is the opposite context — the accent color itself is the *text*, sitting on a dark background, so it needed to go *lighter*, not darker. Confirmed this by first mistakenly trying to darken them (converged toward near-black, ~1.05:1, obviously wrong) before recognizing the direction was inverted for text-on-dark vs fill-behind-white-text. Computed real HSL-lightness increases via the WCAG luminance formula until both the solid-card context and the translucent-badge context simultaneously cleared 4.5:1: `producer #6366f1→#7a7df3` (5.44 / 4.67), `gov-intl #3b82f6→#4085f6` (5.31 / 4.60), `intl-org #8b5cf6→#996ff7` (5.37 / 4.59). The other 6 portal colors already passed both contexts and were left untouched. Also fixed the homepage's identically-sourced `PLAN_META` "Pro" plan color (`LandingPage.jsx`, same `#6366f1`→`#7a7df3`, verified 4.30:1→5.54:1 against that section's actual background), since it's the same brand hex failing the same way.

**2. Locked Foundation card's dimmed text:** this card applies `opacity: locked ? 0.55 : 1` to the whole container. Checked the math first: the card's own text colors (`#94a3b8`, `#7c8797`, `#888`) all already clear 4.5:1 against the card's own background at full opacity (5.34–7.58:1 measured) — the *only* reason axe was flagging them (2.37–2.99:1) was the 0.55 opacity multiplying every child color toward the background. "Locked" is still fully communicated without that opacity trick: the card already has a different (darker) background, a plain gray border instead of a colored one, `cursor: not-allowed`, an explicit "🔒 ยังไม่เปิดใช้งาน" badge, and a "🔒 เปิดเมื่อกำไรสะสม > 10M ฿" line replacing the normal join CTA. Removed the opacity line entirely rather than re-tuning colors that were already correct.

**3. Homepage footer copyright text:** `color: '#555'` against `#0a0a0f` measured 2.64:1. Replaced with `#7c8797` (5.43:1) — reused rather than invented, since it's the same "tier 2" muted gray already established site-wide by run 28's global contrast fix, keeping the footer visually consistent with the rest of the muted-text hierarchy instead of introducing a 4th gray.

**Verified live:** rebuilt the frontend, served it via `vite preview`, and re-ran the same `axe-core` scan technique from runs 27-30 against `/` and `/portals` — 0 total violations on both pages (down from the `color-contrast` violations flagged since run 28). Took full-page screenshots of both routes after the fix: the Foundation card still reads unambiguously as locked (lock badge, distinct border/background, disabled-style CTA text) even without the opacity dimming, and the lightened portal-card badges/links and homepage "Pro" label are legible without looking visually different in any jarring way from the surrounding cards.

This closes out the entire run 27→30 accessibility chain that started from run 27's original `axe-core` scan (missing form labels → global gray-text contrast → language-button contrast → this run's remaining 3 items). No new accessibility follow-ups are queued from this chain; a fresh scan would be needed to find the next batch, if any.

5 items from earlier runs are still pending an owner decision, unchanged.

---

### 2026-07-05 — Hourly loop, run 29: closed part of run 28's queued color-contrast follow-up — every portal's active-language button failed contrast, not just the 4 nodes axe happened to catch

**Continuation of run 28's remaining findings.** Run 28 reported "4 remaining color-contrast violations" as a future follow-up, based on what `axe-core` flagged on a single page load. Investigating those 4 nodes turned up something bigger: one of them was `#ffffff` text on the *active* state of a portal page's language-switcher button (`lang===l ? '<brand color>' : 'none'`), and each of the 9 `/portals/*` pages (plus the `/portals` hub) uses a **different** brand accent color for this — axe can only see whichever language is active by default, so it only caught the 1-2 combinations that happened to be pre-selected in that scan, not the other 7-8 that were sitting there identical and unflagged simply because nobody had clicked that button yet during the test.

**Verified the real scope before fixing:** computed the actual WCAG contrast ratio of white text against all 9 accent colors (`#6366f1`, `#f59e0b`, `#06b6d4`, `#ec4899`, `#059669`, `#3b82f6`, `#10b981`, `#8b5cf6`, `#f97316`) — every single one failed 4.5:1, ranging from a near-miss (indigo, 4.47:1) to badly failing (amber, 2.15:1; cyan, 2.43:1). This is a systemic pattern bug across the entire portal cluster, not 4 isolated spots.

**Fix:** computed a darkened variant of each of the 9 brand colors (HSL lightness reduced iteratively until the real WCAG luminance formula confirms ≥4.5:1 against white — not eyeballed), preserving hue so each portal's brand identity stays recognizable (e.g. amber stays amber, just a deeper shade — the same convention real design systems use for solid-fill buttons, where a "600/700" shade replaces "500" specifically because lighter shades don't support white text). Only the active-language-button background was touched; each color's other uses elsewhere on the same page (icons, badges, primary CTAs) were left alone since those weren't part of the flagged violation.

**Verified live:** for all 10 pages (9 portals + hub), used a real headless browser to actually click through *every* language option (not just the default), re-running `axe-core` after each click — 0 contrast failures on the language-switcher button across all pages × all language combinations (previously this would have failed on literally every single one once clicked, verified via the same luminance math beforehand). Screenshotted the affiliate portal's now-active amber button — reads clearly as the same amber/gold brand color, just deep enough to keep white text crisp, no visual regression.

**Still queued for a future cycle** (the rest of run 28's original 4-node list, now better understood): the `/portals` hub's translucent category-badge overlays (saturated text on ~13%-opacity tinted backgrounds), the "🔒 locked" Foundation card's intentionally-dimmed styling, and the homepage footer copyright text. These are each a distinct design question (badge-overlay opacity math, how a "coming soon" section should read, footer text weight) rather than one shared mechanical pattern like this run's fix, so kept separate rather than rushed together.

5 items from earlier runs are still pending an owner decision, unchanged.

---

### 2026-07-04 — Hourly loop, run 28: closed run 27's queued color-contrast follow-up — muted gray text failed WCAG AA on every page

**Direct continuation of run 27**, which found (via `axe-core`) that a `color-contrast` violation existed on literally every page scanned, including the homepage, and deliberately queued it as a separate follow-up rather than folding it into the label-association fix.

**Scope-mapping before touching anything:** the violating text all traced back to exactly 3 hex values reused as inline `color:` across the whole app — `#64748b` (404 occurrences / 51 files), `#475569` (239 occurrences / 34 files), `#334155` (16 occurrences / 10 files) — all failing 4.5:1 against this app's near-black background shades (ratios measured 1.92–4.19:1 against the actual dark bg tones in use, needed 4.5:1). Before doing a global replace, explicitly hunted for non-text usages of these same hex values (background/border/gradient) that a blind find-and-replace would have wrongly altered — found and catalogued exactly 10 such occurrences across 7 files (status-dot backgrounds, a "disconnected" indicator border, a couple of button-gradient stops) using `grep`'s precise property-value extraction, not just "does this line contain the word background."

**Fix:** replaced all 3 hex values everywhere with lighter equivalents computed from the actual WCAG relative-luminance formula (not eyeballed) against the darkest real background shade in use, preserving the original 3-tier visual hierarchy (dimmest → brightest): `#334155→#748293` (1.92:1→4.75:1+), `#475569→#7c8797` (2.6:1→5.11:1+), `#64748b→#94a3b8` (4.0-4.2:1→7.26:1+ — and `#94a3b8` was already an established secondary-text color elsewhere in this codebase, so this also improves consistency, not just contrast). Then reverted the 10 pre-identified non-text exceptions back to their original values, since those were never part of the flagged violation and don't need the same treatment.

**Verified live:** re-ran the identical `axe-core` scan from run 27 across the same 9 pages — 5 of 9 now have zero `color-contrast` violations (`/catalog`, `/join`, `/track`, `/dispute`, `/pricing`), and the homepage's violating-node count dropped from 36 to 1. Confirmed zero regressions on run 27's label/select-name fix by re-running that exact check too (still 0 across all 10 pages). Took real screenshots of the homepage and `/portals/producer` before/after — visually indistinguishable from the original design, confirming the color shift reads as "slightly brighter muted gray," not a jarring or broken change. Also grepped for the 3 old hex values afterward and confirmed the only 10 remaining occurrences are exactly the intentionally-preserved non-text exceptions.

**Deliberately left for a future cycle:** 4 remaining `color-contrast` violations, all a genuinely different problem — white button text on saturated brand colors (`#ffffff` on `#6366f1`/`#06b6d4`, failing by margins from tiny to severe depending on the brand color's own luminance) and a "locked/coming soon" Foundation card on `/portals` whose intentional dimmed/disabled visual treatment produces washed-out low-contrast grays as a side effect. Fixing these safely means per-button-color judgment calls (darken the brand color vs. switch to dark text) and deciding whether a "locked" section should read as fully accessible text or intentionally look disabled — different, more design-judgment-heavy work than the mechanical global substitution done this cycle, so queued separately rather than rushed in.

5 items from earlier runs are still pending an owner decision, unchanged.

---

### 2026-07-04 — Hourly loop, run 27: screen-reader users could not use any of the 9 `/portals/*` signup forms or `/join` — form fields had no programmatic labels

**New verification technique this run**: installed `axe-core` (industry-standard automated accessibility checker) in a scratch dir and ran it via Playwright against 9 real pages, rather than another manual code-read. This is a genuinely different angle from every previous run's approach (manual grep + reasoning) and immediately surfaced something no amount of visual/functional testing would have caught, since the pages look completely normal to a sighted mouse user.

**Found:** every one of the 9 `/portals/*` consent-based signup forms — the literal centerpiece of this session's work all the way back to the original standing order — plus `/join` (producer signup), render visible `<label>` text and `<input>`/`<select>`/`<textarea>` elements as unconnected sibling DOM nodes, with no `id`/`htmlFor` (or wrapping) association. A sighted user sees "ชื่อบริษัท/ผู้ผลิต" sitting right above the name field and assumes it's labeled; a screen-reader user tabbing through the exact same form hears nothing but "edit text, blank" for every single field — no indication of what to type where. This is a WCAG 2 Level A failure (axe flagged it `critical`), not a cosmetic nitpick: it makes the actual signup mechanism unusable for blind/low-vision producers, consumers, creators, affiliates, and government/NGO contacts — the specific real people this whole `/portals` cluster exists to bring in.

Also flagged, but explicitly **not fixed this cycle**: a `color-contrast` (serious, not critical) violation present on literally every page scanned, including the homepage. Left as a follow-up rather than folded in here — fixing text/background contrast properly means auditing color choices across the whole dark-theme design system, a much larger, more design-judgment-heavy task than mechanically wiring up label associations, and the standing order's "one real task, fully verified" discipline is better served by finishing the narrower critical fix cleanly than starting a broad recolor and not finishing it.

**Fix:** added `htmlFor`/`id` pairs to every form field across all 9 portal pages (using the existing loop variable `k` as the id where fields are rendered via `.map()`, and the matching state key as a literal id for the few standalone fields/selects/textareas outside a loop — `org`/`type` in `IntlOrgPortalPage.jsx`, `need` in `GovThaiPortalPage.jsx`/`GovIntlPortalPage.jsx`, `focus` in `IntlOrgPortalPage.jsx`). For `ProducerJoinPage.jsx`, which uses a shared `Field` wrapper component, added an `id` prop to `Field` that it now passes into its child via `React.cloneElement` rather than touching every call site's underlying input markup.

**Verified live:** re-ran the exact same `axe-core` scan after the fix — 0 `label`/`select-name` violations remaining across all 9 portal pages and `/join` (down from a `critical`-severity violation on 4 pages, `label` failures on 2, `select-name` failures on 4 in the initial scan — some pages had more than one violation type). Also drove a real headless browser to click a field's visible label text directly and confirmed it now correctly moves focus into the associated input (proving the association is real, not just present in markup), then filled and validated the entire producer form end-to-end via `id`-based selectors to confirm nothing was functionally broken by the change.

5 items from earlier runs are still pending an owner decision, unchanged; the site-wide `color-contrast` finding above is a new, lower-priority follow-up item, not a blocker.

---

### 2026-07-04 — Hourly loop, run 26: extended run 21's crawler-preview fix to the other 6 real public pages that had the same defect

**Started by trying to rotate to `all-platform-files`** for this run's other-repo turn, and found something worth recording before moving on: `claude/daily-reporter-improvements-8vc9ct` doesn't actually exist on that repo's remote at all (`git ls-remote origin` shows only `master`) — the local `remotes/origin/...` tracking ref was stale, pointing at the same commit as `master`. Confirmed via `git ls-remote`, not just local state, so this is real: no work has ever actually landed there under the standing order despite it being in scope. Investigated further and every file in that repo (onboarding JSX components, "Roadmap.html" files, a fake `.yml` "workflow" that's actually just a markdown feature list, not real CI config) fits the exact fabricated-content pattern already flagged for the owner in an earlier run — nothing safe to fix there independent of that still-open decision, so didn't force a task into that repo this cycle.

**Pivoted back to `openthai-ai`** and found a direct, narrower continuation of run 21's real fix instead. Run 21 fixed the "shared SPA route serves the homepage's OG tags for every path" defect for the 10 `/portals/*` routes specifically. The exact same defect trivially applies to every other public route, since it's caused by the single catch-all rewrite serving one static `index.html` — confirmed `/catalog`, `/join`, `/find-producers`, `/privacy`, `/terms`, and `/contact` (all real, public, unauthenticated, evergreen pages — verified against `App.jsx`'s route table) all had the identical problem, and were also missing entirely from `sitemap.xml` (same gap run 18 fixed for portals, never extended to these).

**Fix:** renamed run 21's `prerender-portal-meta.mjs` to `prerender-meta.mjs` (it now covers more than portals) and added these 6 routes to its `ROUTES` table, using title/description text pulled verbatim from each page's own real i18n copy (`mk.cat.title`, `mk.join.sub`, etc.) or, for Privacy/Terms/Contact which don't have an i18n "sub" string, a plain factual restatement of the page's real purpose — not invented marketing copy. Added the same 6 URLs to `sitemap.xml` with priority/changefreq matching their real importance (`/catalog` daily — it's live commerce inventory; legal pages yearly/low-priority). Also added `/track` and `/dispute` (run 22/23's pages) to `robots.txt`'s `Disallow` list, since they're personalized utility pages with no evergreen content to index — they were never in the sitemap, so this is a defensive addition, not a behavior change.

**Verified live:** `npm run build` confirmed the renamed `postbuild` hook fires and writes all 16 prerendered files (10 portals + 6 new) correctly; validated `sitemap.xml` is well-formed XML with 20 total `<loc>` entries; served the real `dist/` via `vite preview` and `curl`'d 3 of the 6 new routes raw (simulating a non-JS crawler) — correct titles for all three, plus re-checked one portal route and one unrelated route (`/pricing`) to confirm zero regression from the rename. Loaded `/catalog` in a real headless browser and confirmed the actual interactive page renders correctly (right `<h1>`, zero page errors) — the prerendered title is correctly overridden by the page's own `document.title` once React mounts, exactly as designed.

5 items from earlier runs are still pending an owner decision, unchanged; the `all-platform-files` branch-doesn't-exist-yet finding above is a new observation, not a blocker.

---

### 2026-07-04 — Hourly loop, run 25: `smart-e` repo — the entire API had zero authentication; found while re-auditing that repo after run 20's path fix

**Continued auditing `smart-e`** this run (having fixed its `server.py` frontend-path bug in run 20) — full detail lives in that repo's own commit message (`cfd9caf` on `claude/daily-reporter-improvements-8vc9ct`) since it has no `DECISIONS_LOG.md`; summary here per rule 6.

While scanning `server.py` for SQL-injection risk (its dynamic `UPDATE ... SET` queries build column lists via f-strings) I first confirmed those were actually safe — the column names come from a fixed whitelist array, never from request-body keys, so that specific pattern isn't exploitable. But while checking *how* those routes were reached at all, found something much more severe: **there is no authentication anywhere in this file.** Every route — `/api/products`, `/api/orders`, `/api/customers`, `/api/payments`, `/api/tiktok/*`, `/api/analytics`, `/api/settings`, `/api/line/messages`, `/api/line/broadcast` — full CRUD, GET/POST/PUT/DELETE — was reachable by anyone who could hit the port, with zero credential check of any kind. That means, as shipped: anyone could read every customer's name/email/phone/LINE user ID, delete real products, POST a fake "payment confirmed" to `/api/payments/confirm`, and use `/api/line/broadcast` to send an actual message to every real customer's LINE account.

On top of that, `/api/webhook/line` (the inbound receiver for LINE's platform) never verified the `X-Line-Signature` header at all, despite `do_OPTIONS` already advertising that header in its CORS allow-list — a strong signal the author intended to check it and never did. Anyone could POST a fake "follow" or "message" event and get a fabricated customer record inserted straight into the real database.

**Fix:** added an `ADMIN_KEY`-gated check (`X-Admin-Key` header, `hmac.compare_digest`) in front of every route in `do_GET`/`do_POST`/`do_PUT`/`do_DELETE` except the LINE webhook and the static `/`/`index.html` page. The LINE webhook instead now verifies the real LINE Messaging API signature scheme (HMAC-SHA256 over the raw request body, base64-encoded, compared against `X-Line-Signature`) — required reworking `read_body()` to retain the raw bytes, since the existing code parsed straight to JSON and discarded them. Both checks fail closed by default (503 if `ADMIN_KEY` isn't set at all, 401 for a wrong LINE signature) rather than silently staying wide open — same fail-closed principle already used for `OMISE_WEBHOOK_SECRET` in `openthai-ai`.

**Verified live**, full matrix, against a real running instance: with no `ADMIN_KEY` set, every API route returned 503; with a key set, no-key and wrong-key requests got 401 while the correct key allowed a full real create → update → delete product cycle to succeed. For the webhook: no signature and a wrong signature both got 401; a correctly-HMAC-computed signature was accepted (200) and — checked directly afterward via the now-authenticated `/api/customers` route — had actually inserted the real customer record described in the webhook payload, confirming the signature check gates real behavior, not just a response code.

5 items from earlier runs are still pending an owner decision, unchanged; the `smart-e` `package.json` dead-dependency note from run 20 remains a low-priority observation.

---

### 2026-07-04 — Hourly loop, run 24: `otop-ai-landing` repo — logo was a 1.6MB PNG displayed at 34-84px, compressed to a 14.6KB WebP with no visible quality change

**Rotated back to `otop-ai-landing`** this run (per the standing order's all-5-repos scope) after several runs focused on `openthai-ai`. Full detail lives in that repo's own commit message (`074a57b` on `claude/daily-reporter-improvements-8vc9ct`, lands in the existing PR #1) since it has no `DECISIONS_LOG.md` of its own — summary here per rule 6.

`logo.png` was a 1408×768 PNG, 1.6MB, used unmodified as: the header logo (displayed at 34px height), the hero logo (84px height), the browser favicon, and the `og:image` for social-share previews. Every visitor to the landing page — the whole point of which is to load fast and convert — downloaded the full 1.6MB file just to render a 34px logo, roughly 40× oversampled for that use.

**Fix:** used `sharp` (installed fresh in a scratch dir, not a project dependency) to generate `logo.webp` (513×280 — comfortably retina-sharp at the actual 34/84px display sizes — 14.6KB, a 99% reduction) for the header/hero `<img>` tags and the favicon, and a separate `og-image.png` (1200px wide, 540KB, a 66% reduction) specifically for the `og:image` meta tag, kept as PNG rather than WebP since external social-crawler format support isn't something this sandbox can actually verify against a real deployment, unlike a real browser load which it can. Deleted the original 1.6MB `logo.png` once nothing referenced it anymore (confirmed via grep first). Also removed `google_apps_script.js` (0 bytes, unreferenced anywhere — same dead-scaffolding pattern already cleaned up in `smart-e` in run 20).

**Verified live:** screenshotted the real page (desktop 1280px and mobile 390px) before and after the change — pixel-identical appearance, confirming zero visible quality loss. Loaded the after-version in a real headless browser and confirmed both `<img>` tags report correct natural dimensions (513×280, not 0×0/broken) and zero failed network requests; separately curled both new asset files directly to confirm they're served with `200` and correct content-type.

5 items from earlier runs are still pending an owner decision, unchanged; the `smart-e` `package.json` dead-dependency note from run 20 remains a low-priority observation, not a blocker.

---

### 2026-07-04 — Hourly loop, run 23: closed the follow-up queued in run 22 — buyers can now actually open a dispute from `/track`, not just check one

**Direct continuation of run 22**, which built `/dispute` (status tracking) but deliberately left "there's still no UI to open a dispute" as a queued follow-up rather than folding it into that cycle. This run builds that piece.

Confirmed there's no producer-facing order-management page anywhere in the frontend (`grep -rl producer_email frontend/src/pages` only matches `AdminPage.jsx` and `CatalogPage.jsx`) — this matches the already-known, already-flagged architectural gap (no real producer login/account system). So this cycle scoped the fix to the **buyer** side only, via the one self-service page that actually exists for a customer: `TrackOrderPage.jsx` (`/track`).

**Fix:** added an "⚠️ มีปัญหากับคำสั่งซื้อนี้? เปิดข้อพิพาท" button to the order card on `/track`, shown once an order is successfully looked up. Clicking it reveals a small form (reason, required; evidence, optional) that posts to the same `POST /api/disputes` the backend already exposed but no UI ever called — reusing the buyer's already-verified `contact` value from the track form itself (`opened_by: 'buyer'`, matching this page's own identity-verification model, since it only ever proves the buyer's contact, never the producer's). On success it shows the confirmation message and a link straight to run 22's `/dispute?id=...` tracking page. If the order already has an open dispute, the backend's existing duplicate-guard (`disputes.js`'s `existingOpen` check) still fires — the UI now surfaces that gracefully with a link to the *existing* dispute instead of just failing silently or showing a raw error.

**Verified live, full real cycle** on a locally running backend + a `vite preview` build wired to it via `VITE_API_URL`, driven entirely through Playwright as a real user would use it (not direct API calls): created a product, checked out a real order, loaded `/track?id=...&contact=...`, clicked the new button, filled in the reason/evidence textareas, submitted — confirmed the success message and the correct `/dispute?id=` link appeared. Followed that link and confirmed `/dispute` (from run 22) shows the *exact* reason text typed into the form and the correct "รอพิจารณา" (awaiting review) status — proving the two pages built across these two runs are correctly wired end to end, not just independently functional. Then repeated the open-dispute flow a second time against the **same order** and confirmed the UI correctly shows "มีข้อพิพาทที่ยังไม่ปิดอยู่แล้ว" (already has an open dispute) with a link back to the *original* dispute ID, not a duplicate. `npm run build` (both with and without `VITE_API_URL` override) compiled cleanly.

The producer-side "open/respond to a dispute" UI is still missing, but that's the same pre-existing, already-flagged "no real producer account system" gap — not a new decision, and not something this narrower buyer-side fix could unilaterally resolve.

5 items from earlier runs are still pending an owner decision, unchanged.

---

### 2026-07-04 — Hourly loop, run 22: the order-dispute system had zero frontend page — the "check status" link in its own notification emails pointed at a raw JSON API endpoint

**Found by reading `backend/disputes.js` end to end** (a real module: open/respond/track/aiSuggest/resolve, escrow-aware, already correctly notifies both buyer and producer per an earlier fix). Grepped the frontend for any consumer of it — `grep -rl dispute frontend/src/pages` matched only `AdminPage.jsx`. There is no public page anywhere for a buyer or producer to open a dispute, respond to one, or check its status — the entire feature is backend-only, reachable only via raw `fetch()`/`curl` calls a real user would never make.

Worse: `sendDisputeNotification()` — the email actually sent to real buyers and producers today on every open/respond/resolve — told them to "เช็คสถานะที่ `/api/disputes/${id}/track`", a raw backend API path with no UI at all. A real user clicking that in an email would see unstyled JSON (and it wouldn't even load without a matching `?contact=` query param they'd have to guess to add themselves).

**Fix (scoped to the status-checking half of the gap, not the full "open a dispute" UI — see note below):** added `frontend/src/pages/DisputeTrackPage.jsx` (mounted at `/dispute`), modeled directly on the existing `TrackOrderPage.jsx`/`/track` pattern (same layout, same `useLang()` i18n system, same manual-entry-of-both-fields security model — deliberately does **not** auto-fill the visitor's contact from a link, since the notification email goes to both parties in one shared `to:` header and pre-filling either party's contact into a link both would receive would leak it to the other). Added matching `mk.dispute.*` i18n keys in all 3 languages (th/en/zh), and changed the notification email's link from the raw API path to `${DOMAIN_URL}/dispute?id=${dispute.id}` (id only, contact stays manual).

**Verified live, full real cycle** against a locally running backend: created a real product via `/api/inventory/admin/upsert`, placed a real order via `/api/shop/checkout`, opened a real dispute via `POST /api/disputes` as the buyer, then loaded `/dispute?id=...&contact=...` in a real headless browser (Playwright) against a `vite preview` build wired to that backend (`VITE_API_URL`) — confirmed the real reason text and "รอพิจารณา" (awaiting review) status rendered correctly. Tested the wrong-contact case separately: shows the not-found error and does **not** leak the dispute's reason text, matching `disputes.js`'s own contact-verification model. Then resolved the dispute for real via `POST /api/disputes/admin/resolve` (decision: refund) and reloaded the same tracking page — confirmed it now shows "ปิดแล้ว — คืนเงินแล้ว" (closed — refunded) with the correct decision label. `npm run build` confirmed the new page compiles and bundles cleanly alongside the existing `postbuild` OG-prerender step from run 21.

**Deliberately left out of scope this cycle:** there is still no frontend path to *open* a dispute in the first place (`POST /api/disputes` itself has no UI form anywhere) — that's a separate, larger task (deciding where a "report a problem" entry point belongs, most likely `TrackOrderPage.jsx`) queued for a future cycle rather than folded into this one, to keep this cycle's change small enough to fully verify.

5 items from earlier runs are still pending an owner decision, unchanged; this cycle adds the "build the open-a-dispute UI" item as a queued (not blocking) follow-up, similar to how the consumer-digest feature was queued and then built in an earlier run.

---

### 2026-07-04 — Hourly loop, run 21: `/portals/*` links shared on LINE/Facebook showed the homepage's TikTok pitch, not the portal's own content

**Follow-on to run 18's SEO fix**, which added `document.title` per portal
page — but that only helps crawlers that execute JS (Google does; Facebook's
and LINE's link-preview scrapers generally do not, they read the raw HTML at
the requested path). This app is a client-side-routed SPA (`BrowserRouter`,
confirmed in `frontend/src/App.jsx`), served via Vercel's catch-all rewrite
(`frontend/vercel.json`: `"/(.*)" → "/index.html"`) — so **every** route,
including all 10 `/portals/*` URLs, served the exact same built
`dist/index.html`, whose `<title>`/OG tags are the homepage's TikTok-caption
pitch. Sharing a `/portals/producer` link on LINE — the dominant Thai
sharing channel, and this app's main funnel channel — showed a preview card
about generating TikTok captions, not producer signup, for every single
portal URL.

**Fix:** added `frontend/scripts/prerender-portal-meta.mjs`, wired as an npm
`postbuild` hook (auto-runs after `vite build` since `frontend/package.json`
has both `build` and `postbuild` scripts — verified this actually fires via
`npm run build`, not just `vite build` directly). It copies the real built
`dist/index.html` to `dist/<portal-path>/index.html` for all 10 portal
routes, with only `<title>`, description, canonical, OG, and Twitter-card
tags swapped to that page's real title/description (copied verbatim from
each page's own `T`/`LANG` i18n object — same source run 18 used for
`document.title` — matching whichever language each page actually defaults
to: Thai for most, English for `gov-intl`/`intl-org` which default `lang:
'en'`). Vercel's `rewrites` config resolves existing files in the filesystem
before applying rewrite rules, so these static per-route files are served
directly instead of falling through to the generic `index.html` — no
`vercel.json` change needed. The bundled JS reference is byte-identical to
the real `index.html` (confirmed via diff), so React Router still boots
normally from `window.location.pathname` and renders the actual page —
this is only ever the first HTML byte a crawler or browser receives, not a
different app.

**Verified live:** `npm run build` (not just `vite build`) actually
triggers the `postbuild` step and writes all 10 files with correct content
(spot-checked `dist/portals/producer/index.html` — correct title/og:title/
og:description/canonical, `diff`'d against the base file to confirm nothing
else changed). Served the real `dist/` via `vite preview` and: (1) `curl`'d
`/portals/producer/` raw (no JS execution, simulating a real crawler) — got
the correct title/og:title; (2) same for `/portals/` (hub) and
`/portals/gov-intl` (English-default page) — both correct; (3) loaded
`/portals/producer` in a real headless browser (Playwright) — confirmed the
actual interactive form renders (6 input fields, correct heading, zero page
errors), proving the client app still works normally; (4) confirmed an
unrelated existing route (`/pricing`) and a nonexistent path both still
fall through to the normal SPA catch-all exactly as before — nothing else
was affected.

5 items from earlier runs are still pending an owner decision, unchanged
(the `smart-e` `package.json` dead-dependency observation from run 20 is a
low-priority 6th note, not a blocking item).

---

### 2026-07-04 — Hourly loop, run 20: `smart-e` repo — `server.py` couldn't find its own frontend

**Rotated back to the other 4 repos this run** (per the standing order's
scope of all 5 in parallel) after 3 straight runs focused only on
`openthai-ai`. Full detail lives in the `smart-e` repo's own commit message
(commit `57c79cc` on `claude/daily-reporter-improvements-8vc9ct`) since that
repo has no `DECISIONS_LOG.md` of its own — summary here per the standing
order's rule 6.

`smart-e/server.py` is a self-contained Python-stdlib backend (its own
docstring: "Run: python3 server.py — no external packages required") that
serves a 62KB single-file dashboard (`index.html`, full sidebar: products,
orders, CRM, payments, LINE/TikTok integration, analytics, settings) sitting
right next to it at the repo root. But `FRONTEND_PATH` was hardcoded to
`../frontend/index.html` — a sibling directory that doesn't exist anywhere
in this repo. Every `GET /` therefore returned a hardcoded placeholder
string ("Frontend not found. Place index.html in frontend/") instead of the
real app — confirmed live by actually running `python3 server.py` and
curling `/` before touching anything, which reproduced the placeholder byte-
for-byte.

**Fix:** changed `FRONTEND_PATH` to `os.path.dirname(__file__)` (same
directory as `server.py`, where the real `index.html` actually lives), and
updated the fallback message text to match. **Verified live:** re-ran the
server, `curl /` now returns exactly 62194 bytes matching the real file
size; loaded it with a real headless-browser check (Playwright) and
confirmed the actual sidebar renders (Dashboard, สินค้า, คำสั่งซื้อ,
ลูกค้า/CRM, ชำระเงิน, LINE Integration, TikTok, Analytics, ตั้งค่า); spot-
checked `/api/dashboard/stats` and `/api/products` still return valid JSON,
confirming only the static-file path was broken, not the API layer.

Also noticed while scanning this repo: `package.json` declares a full React/
Vite/Tailwind/Recharts frontend stack, but nothing in the actual app (the
static `index.html`, which uses Chart.js from a CDN directly) imports or
references any of it — zero hits for react/recharts/lucide/axios anywhere
in the real code. Left this alone rather than unilaterally stripping it:
same category of question as the `all-platform-files`/`OpenThai-AI-v9.0`
items already flagged for the owner — can't tell from the code alone whether
this is dead scaffolding safe to delete, or a planned migration to a real
React frontend that just hasn't happened yet.

5 items from earlier runs are still pending an owner decision, unchanged;
this is a 6th item now (the `smart-e` `package.json` question above), noted
for the owner but not blocking — it's a low-risk observation, not something
that needed to stop work this cycle.

---

### 2026-07-04 — Hourly loop, run 19: 4 of 9 `/portals/*` types (gov-thai, gov-intl, intl-org, foundation) sent zero confirmation email to the submitter

**Found by finishing a fix that was already started but left incomplete.**
`backend/server.js` has a comment (right above `PORTAL_WELCOME_COPY`, added in
an earlier run) explaining that `/portals/consumer` and `/portals/middleman`
used to promise a confirmation email on the frontend that the backend never
actually sent — that run fixed it for `consumer`, `middleman`, and `creator`
by adding entries to `PORTAL_WELCOME_COPY`. But `sendPortalWelcomeEmail()`
looks up `PORTAL_WELCOME_COPY[lead.type]` and returns immediately if there's
no matching key (`if (!copySet || ...) return;`) — and the object only ever
had 3 keys, never all 9 portal types. `gov-thai`, `gov-intl`, `intl-org`, and
`foundation` were left with the exact same gap the earlier fix was written
to close: the frontend pages promise "ทีม Government/International
Relations/Partnerships จะติดต่อกลับภายใน 48/72 ชม." (or, for foundation,
"จะได้รับการแจ้งเตือนเมื่อกองทุนเปิดใช้งาน"), but the submitter never
received so much as a receipt confirming their submission was recorded —
only an internal admin-facing alert (`sendPortalLeadNotification`) fired.
These are arguably the highest-stakes leads on the whole site (formal
G2G/international-organization/NGO partnership requests), yet they got the
least confirmation of any portal type.

**Fix:** added the missing 4 entries to `PORTAL_WELCOME_COPY` (th/en/zh each,
matching the existing pattern exactly — no new mechanism), with copy that
mirrors what each portal page already promises: 48h for gov-thai/gov-intl,
72h for intl-org, and a "notified when the fund activates" framing for
foundation (since that one isn't a callback-window promise like the others).

**Verified live:** booted the real backend locally (fake unreachable SMTP
host to avoid needing real credentials). First reproduced the bug on the
pre-fix code (`git stash`) — submitting a `gov-thai` lead via the real
`POST /api/leads/submit` produced only a `Portal lead email error` (the
admin-alert attempt) in the server console, with no attempt at a submitter
email at all. Restored the fix (`git stash pop`), re-ran the exact same
request plus `gov-intl`, `intl-org`, `foundation`, and `consumer` (as a
control, already known to work) — all 5 now produced **both** a
`Portal lead email error` and a `Portal welcome email error` in the console,
proving `sendPortalWelcomeEmail` now enters the send path for all of them
(the "error" is expected — SMTP was intentionally unreachable in this test;
what matters is the code no longer silently skips the send). Also rendered
all 12 new subject/body combinations (4 types × 3 languages) standalone in
Node to confirm no template-literal or escaping bugs before wiring them in.

5 items from earlier runs are still pending an owner decision, unchanged.

---

### 2026-07-04 — Hourly loop, run 18: portals cluster was invisible to search engines — no per-page titles, missing from sitemap/robots

**Switched category this run** from backend security (runs 11-15, 17) to
marketing/SEO, per the standing order's task list — after 6 straight security
audits it was worth checking whether the newest, most-worked-on growth
surface this whole session (`/portals` + its 9 sub-portals: producer,
affiliate, creator, consumer, middleman, gov-thai, gov-intl, intl-org,
foundation) was actually reachable and indexable by search engines, not just
functionally correct.

**Found two real gaps, both verified by reading the actual files, not assumed:**
1. `frontend/public/sitemap.xml` listed only 4 URLs (`/`, `/pricing`,
   `/affiliate`, `/affiliate/dashboard`) — all 10 portal pages were entirely
   absent, despite being the primary consent-based signup funnel this session
   spent the most effort building and fixing (welcome emails, unsubscribe,
   PDPA erasure, real-browser E2E in run 16). A page missing from the
   sitemap is discovered by crawlers slower and less reliably.
2. All 10 portal pages (`PortalHubPage.jsx` + all 9 files under
   `frontend/src/pages/portals/`) never set `document.title` — confirmed via
   `grep -L document.title`, every other real page in the app (`PricingPage`,
   `ContactPage`, `CatalogPage`, etc.) already follows this exact pattern.
   Every visitor on any of these 10 URLs saw the same generic homepage title
   in their browser tab regardless of which portal they were actually on —
   bad for SEO differentiation across the 10 distinct URLs and for usability
   when a user has multiple portal tabs open.

**Fix:** Added a `useEffect(() => { document.title = t.title + ' — Openthai.ai'; }, [t.title])`
to each of the 10 files, reusing the `title` string each page's own `T`/`LANG`
i18n object already defines per language (no new copy invented — every page
already had the right title text sitting unused). Added all 10 portal URLs
to `sitemap.xml` with reasonable priority/changefreq, and added matching
explicit `Allow:` lines to `robots.txt` for each portal path, following the
file's existing style of calling out real pages explicitly (even though
`Allow: /` already covers them implicitly).

**Verified live:** `npx vite build` succeeded with zero errors; booted
`vite preview` and used Playwright to visit all 10 portal URLs directly,
confirming each shows a distinct, correct, language-appropriate
`document.title` (e.g. `/portals/producer` → "ทางเข้าผู้ผลิต — Openthai.ai",
`/portals/gov-intl` → "Foreign Government Agency Portal — Openthai.ai",
matching that page's actual `lang` default and content — not a placeholder).
Also validated `sitemap.xml` is well-formed XML (`<url>`/`</url>` tag counts
match, 14 total `<loc>` entries as expected).

5 items are still pending an owner decision from earlier runs, unchanged.

---

### 2026-07-04 — Hourly loop, run 17: affiliate withdrawal hijack — `promptpay` accepted with zero ownership check, fixed with email confirmation

**Found while re-reading `POST /api/affiliate/withdraw` after the webhook
data-exfiltration fix from run 15** (same instinct: "what else trusts a
request-body field as if it were verified identity?"). `AffiliateDashboard.jsx`
has no login system at all — it's reached purely via `?ref=XXXXX` in the URL,
and `ref_code` is not a secret: it's embedded in every affiliate's public
referral link, which affiliates are explicitly encouraged to share on TikTok/
IG to their followers. The withdrawal endpoint accepted a `promptpay` payout
number straight from the request body with no check that the caller was the
real affiliate. Anyone who had ever seen an affiliate's public referral link
— potentially shared with thousands of followers — could submit a withdrawal
request that redirected that affiliate's real earned commission to an
attacker-controlled PromptPay account. Admin approval was already required
before money actually moves, but the admin has no way to know the PromptPay
number shown isn't the real affiliate's — so real money was genuinely at risk
of being paid to the wrong person.

**Why this one got fixed directly (unlike `/api/payment/cancel` in run 13,
which was flagged instead):** withdrawals already go through an admin-approval
step before funds move (not instant), affiliates already have a real `email`
captured at signup (`/api/affiliate/apply`), and adding an email-confirmation
step only changes the shape of *new* withdrawal requests going forward — it
doesn't strand any existing user or require inventing an identity system the
frontend doesn't have, unlike `/api/payment/cancel` where `PaymentPage.jsx`
has no device-id captured at purchase time to retrofit against.

**Fix:** `POST /api/affiliate/withdraw` no longer creates a withdrawal
directly. It validates everything as before (ref exists, promptpay format,
amount within available balance), then stores a `pending` confirmation record
(`backend/data/withdraw_confirmations.json`, gitignored — added to
`.gitignore`) and emails a confirmation link to the affiliate's *registered*
address, signed with the same reusable `unsubToken(id, type)` HMAC helper
already used for erasure/unsubscribe flows (this time with
`type='affiliate-withdraw'`). Only `GET /api/affiliate/withdraw/confirm`
(rate-limited, token-checked) actually creates the real `withdrawals` record
the admin-approval flow already handles — re-checking the balance is still
sufficient at confirm time in case another withdrawal was requested in
between. Updated `AffiliateDashboard.jsx`'s success toast, which previously
said "request submitted, pending approval" — no longer true since a request
now isn't created until the email link is clicked.

**Verified live** (local server, fake fast-failing SMTP host to avoid needing
real credentials, matching the pattern from runs 9/10/12): registered a test
affiliate, credited it ฿200 real commission via the quickpay+signed-webhook
path, then confirmed all three cases — (1) `POST /withdraw` creates a pending
confirmation and does **not** create a visible withdrawal (checked via
`GET /api/affiliate/withdrawals?ref_code=`, balance stayed ฿200 pending); (2) a
wrong/guessed token on `GET /confirm` returns 403 with the confirmation record
left untouched; (3) the correct token (computed with the same `JWT_SECRET`
the test server used) creates the real withdrawal, balance correctly drops to
฿0 pending, and the record appears in both the affiliate's own list and the
admin list; (4) reusing the same correct token a second time returns 404
since the confirmation was already consumed. Cleaned up test data
(`backend/data/affiliates.json`/`withdrawals.json` restored to their
pre-test contents, `withdraw_confirmations.json` removed) before committing.

---

### 2026-07-04 — Hourly loop, run 16: real-browser E2E pass on the actual funnel UI — clean, no code change this run
5 items still pending an owner decision, unchanged; PR #79's latest deploy
succeeded.

After 5 straight runs of backend security work (runs 11-15), deliberately
switched to a different verification angle instead of scanning for more
endpoint gaps: every check this session so far has been `curl`/API-level or
the AI-generated `otop-ai-landing` page — **never the actual React frontend
of `openthai-ai` itself, driven through a real browser.** Booted the real
backend (port 8000) and the real Vite dev server together (matching how
this app actually runs, not an isolated API test) and used Playwright to
click through the funnel a real visitor would use.

- `/portals` hub: all 6 category cards render correctly, both desktop and
  mobile (390px) viewports.
- `/portals/consumer`: filled the real form (name, country, email, category,
  PDPA checkbox) and submitted through the actual UI — first attempt
  correctly blocked by native browser validation on a required field I'd
  skipped (not a bug, the form's own validation working as intended); second
  attempt with all fields completed showed the real success screen. Cross-
  checked the backend directly afterward (`GET /api/leads/admin/search`) and
  confirmed the submission that came through the browser was recorded with
  the exact data typed into the form — the whole pipeline (React form → real
  fetch → backend → persisted record) is connected correctly end-to-end, not
  just each piece verified in isolation.
- `/join` (producer signup): renders correctly, all fields present and
  correctly laid out.
- Zero console errors, zero failed requests other than expected sandbox
  network blocks (Google Fonts / Tag Manager, unrelated to the app).

No bug found this run — logging the clean result honestly rather than
inventing a change to ship. This closes a real gap in this session's own
verification coverage: every fix in runs 1-15 was checked against the
backend directly, never against the actual rendered UI a real person uses.

### 2026-07-04 — Hourly loop, run 15: last run's webhook fix had a bypass door — found and closed it too
5 items still pending an owner decision, unchanged. PR #79's latest deploy
succeeded; still only the Vercel bot on comments.

Checked whether last run's `/api/webhooks` fix was actually complete before
moving to something new — it wasn't. `webhooks.register()` (the same
underlying function `POST /api/webhooks` calls) is also called directly by
`POST /api/n8n/register-webhooks`, a completely separate route with **zero
auth of any kind**. It takes `n8n_base_url` straight from the request body
and registers 3 real webhooks pointing at `${that_url}/webhook/...` with
`tenantId: 'system'`, dispatching `content.generated`/`agent.completed`/
`payment.completed` events to them — the identical data-exfiltration
vulnerability fixed last run, reachable through a door that fix didn't
touch because it's a different route calling `register()` directly rather
than going through `POST /api/webhooks`. Confirmed zero frontend usage
before touching it (same check as every route fixed the last 3 runs), then
gated it with the same `webhooksAuth()` helper built last run — one line of
reuse, no new auth mechanism needed.

Verified live, adversarially: sent `n8n_base_url: "https://attacker.example.com"`
with no admin key — now correctly `401` (previously would have silently
registered 3 real webhooks pointing at the attacker's server). Then
confirmed the legitimate path: admin key + a real n8n base URL → all 3
webhooks actually registered (verified via `GET /api/webhooks`, count: 3),
so real n8n integration setup still works exactly as before.

Worth noting for whoever reviews this PR: `webhooks.register()` is called
from at least these 2 places now; if a 3rd call site is ever added, it needs
the same admin gate at its own route, not just at the ones fixed so far.

### 2026-07-04 — Hourly loop, run 14: fixed silent, unlimited data-exfiltration via /api/webhooks — anyone could register a global listener for every real business event
5 items still pending an owner decision (unchanged from run 13; PR #79's
latest deploy succeeded, still only the Vercel bot on comments — GitHub
tools were reachable again this cycle).

Continued the security sweep into `/api/webhooks*`. `DELETE
/api/webhooks/:id` was already gated with a comment saying "no UI calls
this, safe to lock" — checked whether that same justification actually
held for the other 3 routes on this same resource (it does — grepped the
whole frontend for `api/webhooks`, zero matches anywhere), then read
`backend/webhook-system.js` to understand what was actually exposed.

Found this is worse in kind than runs 12-13's findings: those were one-time
destructive actions (erase a record, cancel a subscription); this one is
**silent, ongoing, indefinite data exfiltration**. `POST /api/webhooks`
computes `tenantId = req.tenant?.id || 'global'` — but `req.tenant` is only
ever set by the `requireTenant()` middleware from `tenant-manager.js`, which
was never attached to this route, so `req.tenant` is `undefined` for every
single request that reaches it, meaning **every unauthenticated caller
registers a `'global'`-scoped webhook** by construction, not as an edge
case. `dispatch()` sends a `'global'`-scoped webhook a copy of every event
system-wide (`affiliate.sale` with `ref_code`/`amount_thb`/`commission`,
`payment.completed`, `tenant.created`, etc.) if its `events` filter is `['*']`
(the default). Anyone could silently register such a listener and receive a
live feed of every sale/commission/payment happening on the platform,
indefinitely, until an admin happened to notice and manually delete it —
nothing alerts anyone to a new registration. `GET /api/webhooks` had the
same root cause inverted: `adminView = !tenantId`, and since `tenantId` is
always `undefined` here too, **every unauthenticated caller gets the full
admin view** (all registered hook URLs + tenantIds), the opposite of what
that line's own comment ("admin sees all") intended. `GET /api/webhooks/logs`
and `POST /api/webhooks/:id/test` had no guard of any kind.

Fixed all 4 with the exact same `x-admin-key` check already used (and
already justified) for the sibling `DELETE` route — introduced one shared
`webhooksAuth()` helper so all 4 routes gate identically. Verified live,
adversarially: unauthenticated register, list, logs, and test-fire all now
correctly return `401` (previously: register succeeded, list returned the
full admin view, logs and test-fire had zero protection at all). Then
verified the legitimate admin path still works end-to-end with
`x-admin-key`: registered a real webhook, listed it back, fired a real test
delivery (`200`, delivery itself failed only because the test URL wasn't a
real listener — the call path worked), and read the delivery log.

### 2026-07-04 — Hourly loop, run 13: found the most severe issue yet (unauthenticated real subscription cancellation) — mitigated, but the real fix needs the owner's call
5 items now genuinely pending an owner decision (adding this one). GitHub
MCP tool hit a real auth expiration this cycle (not just a transient
disconnect) — couldn't re-check PR comments, noted rather than blocked on.

Continued last run's security sweep into `/api/payment/cancel`: found it's
**worse than the PDPA-erasure bug fixed last run**. It takes only an `email`
in the POST body, no verification of any kind, and immediately cancels that
email's **real, paid Omise subscription**. Anyone who knows a paying
customer's email can cancel their active subscription. Also
`GET /api/payment/entitlement` discloses anyone's plan/status the same way
(lower severity — read, not destructive — but same root cause).

Unlike the erasure fix, **did not apply the same email-confirmation-link
pattern here**, and this was a deliberate call, not an oversight: checked
`PaymentPage.jsx` first and confirmed this endpoint is actively used by real
customers today (`handleCancelSubscription`, instant-cancel UX behind a
`window.confirm()`), and this whole flow has zero session/login backing it —
identity is just `email` from `localStorage.getItem('user_email')`, the
exact same shape of gap as `/api/agent/*`'s original zero-auth bug (fixed in
an earlier session with lightweight `x-device-id` scoping via
`authHeaders()` in `apiBase.js`). Checked whether that same fix applies here
too: it doesn't cleanly — `owner_device_id` scoping worked for agents
because old agents could safely become invisible (low-stakes JSON file,
explicitly documented as acceptable blast radius); entitlements have no
device-id captured at purchase time at all, so the same scoping would make
**every existing real paying customer permanently unable to cancel their own
subscription** — a worse outcome than the current vulnerability. An
email-confirmation-link (erasure's fix) would also silently change live
UX for real customers using this today, which the erasure fix never had to
worry about (nothing used it). Both real fixes need a decision only the
owner should make: is a confirmation-email round-trip acceptable friction
for cancellation, or should this wait for a real login system, and if so —
retroactively backfill device-id/session onto existing entitlements, or
accept some other transition cost? Flagging rather than guessing.

Shipped a small, safe, no-regression mitigation instead of leaving it
completely open while waiting: added rate limiting (`paymentAccountLimiter`,
15 min / max 30) to both routes — matching the same "every comparable
endpoint already has one" gap class as runs 9-11's unsubscribe routes. This
doesn't fix the identity problem, only slows down mass email-scanning/abuse
attempts; said so explicitly rather than implying it's a full fix.

Verified live: normal entitlement lookup and a normal (404, no real
subscription) cancel attempt both still work exactly as before; fired 31
rapid requests at the entitlement endpoint — first 28 succeeded normally,
29th-31st correctly `429`.

### 2026-07-04 — Hourly loop, run 12: fixed a real, weaponizable vulnerability — anyone could erase anyone else's data via the PDPA erasure endpoint
4 flagged decisions now technically pending, but this one didn't wait for a
reply — explained why below. Other 3 (run-1 producer vuln, run-3 creator
account gap, run-5 all-platform-files) still unanswered; checked PR #79
again, still only the Vercel bot (deploy succeeded this time — quota must
have partially reset).

Did a broader security sweep this cycle instead of another portal-email
audit: wrote a script to flag every `app.post/patch/delete` route in
`server.js` with no visible auth guard. First pass had a real bug in my own
analysis — it only searched for the literal string `checkAdminKey`, so it
flagged ~15 routes that are actually protected by differently-named guards
(`requireAuth`, `requireTenant`, `checkOverrideKey`, `useRecoveryCode`) as
false positives. Fixed the script to also check for those before trusting
any result — same "verify before treating output as a finding" discipline
as runs 8's test false-alarms, just applied to my own analysis tooling this
time.

One real result survived: **`POST /api/privacy/erasure`** (the PDPA
"right to erasure" endpoint, มาตรา 33) took nothing but an `email` in the
request body and **immediately deleted that email's waitlist entry and
consent record — no ownership verification of any kind**. Anyone who knows
or guesses another person's email can erase their data without their
knowledge or consent. This is worse than the run-1 producer-listing vuln
(that one corrupts/knocks a listing offline; this one destroys real
consent/waitlist records for a person who never asked for anything) —
weaponizable as harassment or to sabotage a competitor's affiliate/waitlist
signup, and it inverts PDPA's actual intent (protecting people's data, not
giving strangers a lever to delete it).

Fixed it this cycle rather than only flagging it, because the fix is the
exact same email-confirmation pattern already built and verified twice this
session (runs 9-10's unsubscribe flow) — not a new architecture decision,
just applying an established, already-trusted pattern to one more
endpoint. `POST /api/privacy/erasure` now only emails a confirmation link
(reusing `unsubToken()`, type `'erasure'`); the actual deletion moved to a
new `GET /api/privacy/erasure/confirm` (rate-limited with the existing
`unsubLimiter`), which only fires once the real inbox owner clicks it.
Checked first that no frontend page calls this endpoint at all (only
referenced in the auto-generated SDK client), so changing its response
shape broke nothing.

Verified live end-to-end, adversarially: registered a real waitlist entry,
called `/api/privacy/erasure` for that email with no proof of ownership —
confirmed the record **still existed** afterward (previously it would have
been gone instantly). Then confirmed the negative and positive paths on the
new confirm route: a wrong/guessed token → `403`, record still present;
the real computed token → success message, and the record was actually
gone afterward.

### 2026-07-04 — Hourly loop, run 11: rate-limited the 2 unsubscribe routes added in runs 9-10; flagging a real operational finding (Vercel free-tier deploy quota now exhausted)
3 flagged decisions still unanswered (checked PR comments on all 3 PRs
again). One new, real, non-code finding surfaced this cycle worth its own
mention: PR #79 got a Vercel bot comment — `Resource is limited - try again
in 24 hours (more than 100, code: "api-deployments-free-per-day")`. Checked
why: `otop-ai-landing`'s PR alone is linked to **4** separate Vercel
projects (`otop-ai-landing`, `-1m4o`, `-45lf`, `-essf`), `openthai-ai`'s PR
to 3 — every push across 3 repos this loop touches redeploys 8+ Vercel
projects at once, and 11 hourly cycles did that enough times to exhaust the
Hobby-plan daily deployment quota. Not a code bug, nothing to fix in this
repo — flagging it because it's a real constraint on how fast changes
actually go live, directly relevant to item 7 ("เข้าตลาดให้เร็วที่สุด").
GitHub pushes/PRs are unaffected; only live-preview builds are blocked for
~24h. Continuing to push real, verified commits regardless — that part of
the pipeline still works.

Audited my own last 2 runs before picking something new, same discipline as
runs 8-10: the 2 unsubscribe routes added in runs 9 and 10
(`/api/leads/unsubscribe`, `/api/broadcast/unsubscribe`) were the only
routes in this entire file that touch real user data with **no rate
limiter** — every comparable endpoint (`applyLimiter`, `submitLimiter`,
`broadcastLimiter`, `adminLimiter`, etc.) has one. The HMAC token makes
brute-forcing computationally infeasible on its own, but unlimited requests
still means unlimited disk writes (`saveFile()`/`saveBroadcastUnsub()` on
every valid hit) and no defense-in-depth consistent with the rest of the
codebase. Added `unsubLimiter` (15 min window, max 20) to both routes.

Checked middleman's post-signup value delivery too (same kind of audit that
found the consumer/creator email gaps) — its promise ("ทีมงานจะติดต่อกลับ") is
a human-followup claim, same honest shape as producer/gov-thai/gov-intl/
intl-org, not an automated one nothing backs. No gap there; confirms the
run-3 assessment was right.

Verified live: booted the server, confirmed a normal request still works,
then fired 21 rapid requests at `/api/leads/unsubscribe` — the first 19
correctly returned `403` (invalid token, as expected), the 20th and 21st
correctly returned `429` (rate limited), matching the configured `max: 20`
exactly.

### 2026-07-03 — Hourly loop, run 10: found a bigger, adjacent unsubscribe gap — the admin newsletter broadcast tool had none either
3 flagged decisions still unanswered; re-checked all 3 PR threads, still
only the Vercel bot.

Followed up on last run's unsubscribe fix by checking for the same pattern
elsewhere, since fixing one instance and stopping is how gaps like this
survive elsewhere in a codebase. Found `POST /api/leads/admin/broadcast`
(the general newsletter tool, sends to combined waitlist+affiliate+order
contacts) — its own footer text says "ส่งถึงคุณเพราะเคยลงทะเบียน/ใช้บริการ
Openthai.ai," but had zero opt-out, same gap as the consumer digest, just
with a broader recipient pool and no relation to `portal_leads` at all (this
tool's recipients come from `waitlist`/`affiliates`/`orders`, none of which
are portal leads) — so last run's fix didn't cover it.

Added a separate suppression list (`broadcast_unsubscribed.json`, same
load/save-to-`WRITE_DATA_DIR` pattern as `waitlist.json` already uses) and
`GET /api/broadcast/unsubscribe`, reusing the exact same `unsubToken()`
HMAC helper from last run — just a different `type` string ('broadcast'
instead of 'consumer'), no new crypto needed. Kept this list separate from
the consumer-digest one on purpose: unsubscribing from category-matched
consumer deals and unsubscribing from the general newsletter are different
consents, and conflating them would be a product-policy guess I'm not
positioned to make unilaterally.

This required a real structural fix, not just an added link: the broadcast
route previously sent one email via `bcc` to up to 50 recipients per batch,
sharing identical HTML — which cannot include a per-recipient unsubscribe
link at all (everyone in a bcc batch gets the same body). Switched to
sending one email per recipient with their own personalized unsubscribe
link. Slower per-send, but this is an admin-triggered, rate-limited (6/hour)
action, not a hot path, and correctness here matters more than batching.

Verified live: signed up 2 real waitlist emails, triggered the broadcast
(`recipients: 2`), unsubscribed one via the real computed token, triggered
again — `recipients: 1`. Confirmed a wrong/guessed token still returns 403
and does not unsubscribe anyone.

### 2026-07-03 — Hourly loop, run 9: the consumer digest I shipped last run had no unsubscribe link — added one, PDPA needs it
3 flagged decisions still unanswered; re-checked all 3 PR threads again,
still only the Vercel bot.

Audited my own run-7 work again instead of scanning for something new: the
weekly consumer digest sends real recurring marketing email to real people,
but shipped with **zero way to opt out** — checked the whole codebase
(`grep unsubscribe`), no unsubscribe mechanism exists anywhere for any email
this app sends. This project has repeatedly emphasized PDPA consent (the
9-portal consent gate entry earlier in this log) — consent to receive
something also has to include a real way to withdraw it, not just a
one-time checkbox at signup. Since I'm the one who just turned a one-time
welcome email into a recurring one, this was mine to close before letting
the loop move on to something else.

Added `portalLeads.unsubscribe(email, type)` (flags matching lead records,
same Supabase/file dual-mode pattern as the rest of that module) and `GET
/api/leads/unsubscribe` in `server.js`, gated by an HMAC token
(`unsubToken()`, keyed off the same `JWT_SECRET` `tenant-manager.js` already
uses as a stable general-purpose secret — deliberately not `auth.js`'s
`crypto.randomBytes` fallback, since that regenerates on every restart and
would invalidate every link already mailed out) so a malicious actor can't
unsubscribe someone else just by knowing their email. `sendConsumerDigest()`
now filters out `unsubscribed` leads and every digest email includes the
real unsubscribe link.

Verified live end-to-end, not just code review: registered 2 real consumers
+ 1 approved producer in a matching category, ran the digest
(`total_consumers: 2`), computed the real HMAC token and hit the
unsubscribe endpoint for one of them, re-ran the digest — `total_consumers`
correctly dropped to `1`. Also confirmed the negative paths: missing
params → 400, wrong/guessed token → 403 (didn't unsubscribe anything).

### 2026-07-03 — Hourly loop, run 8: full regression pass across 7 runs of changes — one real (small) find, two false alarms caught before being "fixed"
3 flagged decisions still unanswered; PR comments re-checked, still nothing
but the Vercel bot on all 3 PRs.

Instead of scanning for a new feature gap, ran the actual test suites this
repo already has (`test:smoke`, `test:affiliate`, `test:revenue`) against
everything built across runs 1-7 — first time this session running the full
suite, not just the specific endpoints touched each cycle.

- `npm run test:smoke` (27 skills): all pass, no regressions.
- `test-affiliate-flow.mjs`: first run showed 8/22 failing — looked alarming,
  but before treating it as a real bug, checked whether *this session's*
  diffs (confined to lines 100, 392-492, 868-1014 of `server.js`, confirmed
  via `git diff main --stat`) touch anything near the webhook/commission
  code (~line 7307) at all. They don't. Re-ran with the exact env vars the
  script's own header comment specifies (`OMISE_WEBHOOK_SECRET=testsecret`)
  instead of what I'd started the server with — 22/22 passed. Not a bug,
  just my own test-setup mistake; would have been a false "found a bug"
  report if I'd trusted the first run.
- `test-revenue-system.mjs`: same story on the first pass (wrong `ADMIN_KEY`
  vs. the script's documented `testadmin` default caused a crash, not a
  real failure) — but after matching the documented env vars, one real
  failure survived: "ลบโพสต์" (delete post). Traced it: `DELETE
  /api/scheduler/:id` was intentionally gated with `x-admin-key` in an
  earlier autonomous security fix (2026-07-02, this log), but this E2E test
  was never updated to send the header — it's been asserting against a 401
  response's shape and failing ever since, a false negative masking as a
  bug. Fixed the test (added `x-admin-key: ADMIN`), re-ran clean against a
  fresh server: 26/26 pass.

Also caught and reverted an unrelated mistake before committing: running
these tests repeatedly wrote real-looking mock affiliate records into the
tracked `backend/data/affiliates.json` (not gitignored, unlike other local
data files) — `git checkout --` before staging, so no test fixtures leaked
into the diff.

Net effect: confirmed no regressions across everything built this session,
fixed one small piece of real test debt, and — maybe more useful than
either — didn't chase two false alarms into unnecessary "fixes." Same
discipline as `lesson_01_verify_before_build`, just applied to my own test
output instead of a pasted spec.

### 2026-07-03 — Hourly loop, run 7: closed a promise I myself left half-built two runs ago — real weekly consumer digest, not just softer wording
3 flagged decisions still unanswered (GitHub tools were also temporarily
unauthenticated this cycle, so couldn't re-check PR comments — noted, not
blocking, moved on).

Re-audited my own run-2 fix instead of scanning for something new. The
consumer welcome email I shipped then says "จะเริ่มส่งสินค้า/โปรโมชั่นในหมวดที่
คุณสนใจให้ทางอีเมล" — "we'll **start sending** [products in your category]" —
a future-recurring claim. Checked: nothing recurring existed, only that one
welcome email. I'd fixed the "zero emails ever sent" bug but left a smaller
version of the same "promise not backed by code" problem in my own copy.

Two ways to close it: soften the wording again, or actually build the thing.
Chose to build it — the pieces already existed and were already verified
real this session: `producers.catalog()` (real approved-producer product
listings) and `portalLeads.all()` (real consumer signups with their chosen
`category`, using the same category strings as `producers.js` — confirmed
still in sync from an earlier fix in this log).

Added `sendConsumerDigest()` to `server.js`: for each consumer lead, filter
the real catalog by their selected category, email up to 5 real matches
(producer name, product, real price) if any exist, skip silently if none —
no fabricated inventory, nothing invented. Wired to `GET+POST
/api/portals/consumer-digest` with the exact same auth pattern already
fixed for `/api/progress/daily-report` (`Authorization: Bearer $CRON_SECRET`
for the real Vercel Cron, `x-admin-key` for a manual trigger) — didn't want
to reintroduce the bug I fixed two runs ago. Added a weekly cron entry to
`vercel.json` (Monday 09:00 Thai) so this actually recurs without a human
remembering to trigger it — otherwise the promise stays exactly as
unfulfilled as before, just with an extra manual button nobody will click.

This is legitimate, already-consented outreach (people who signed up asking
for exactly this via the real `/portals/consumer` form), not the
scraping/cold-outreach pattern the standing order forbids.

Verified two ways since real SMTP isn't available in this sandbox: (1) the
actual matching/subject/language-selection logic in isolation via
`nodemailer`'s `jsonTransport` — 3 fake consumers (2 different categories +
1 with no matching product), confirmed exactly 2 matched with correct
per-language subjects and the non-producer/non-matching leads correctly
excluded; (2) the full live pipeline against real registered data — created
a real approved producer + 2 real consumer leads (one matching, one not)
through the actual endpoints, hit `/api/portals/consumer-digest`, confirmed
`total_consumers: 2, skipped_no_match: 1, sent: 0, failed: 1` — the `failed`
count is the expected outcome of pointing `SMTP_HOST` at a refused local
connection on purpose (fast-failing stand-in for real SMTP), which itself
confirms the pipeline correctly identified the 1 real match and attempted
to send rather than silently swallowing it. Also confirmed the 401/200 auth
paths (no auth, wrong bearer, correct bearer, `x-admin-key`) all behave
identically to the already-fixed daily-report route.

### 2026-07-03 — Hourly loop, run 6: last run's own landing page had a latent deploy bug — caught it before it shipped broken
3 flagged decisions now pending (run-1 producer vuln, run-3 creator
account-provisioning gap, run-5 all-platform-files question) — checked all 3
open PRs for owner comments again, still none. Untouched, as before.

Went back to `otop-ai-landing` to verify run-4's landing page more rigorously
against a real deployment, per this repo's own standard ("locally, then
ideally against a real deployed instance"). Tried to reach the real Vercel
preview URL (`curl`, then `WebFetch`) — blocked (network / Vercel preview
auth, same limitation already hit reaching production earlier this
session). Tried `vercel build`/`vercel dev` locally instead — both require
project-linked cloud auth this sandbox doesn't have.

That dead end led to actually re-reading `otop-ai-landing/vercel.json`
closely instead, which surfaced a real bug that predates this session but
would have broken the new landing page in production: `routes: [{ "src":
"/(.*)", "dest": "/index.html" }]` has no filesystem-check step, so — per
Vercel's own docs/community threads on this exact gotcha — it matches
*every* request, including `/logo.png`, and would serve `index.html`'s
bytes instead of the real image. Since last run's landing page references
`logo.png` in the header and hero section, this would have shipped with a
guaranteed-broken logo image the moment it reached production, even though
it "worked" against my earlier local test — because that test used a plain
`python3 -m http.server`, which doesn't replicate Vercel's actual routing
and would never have caught this.

Fixed with the standard, documented pattern for legacy `routes`: added
`{ "handle": "filesystem" }` before the catch-all, so a real static file is
served directly when one exists, falling back to `index.html` only
otherwise. Chose to keep the legacy `routes` format (matching the existing
config, one-line diff) rather than switch to the newer `rewrites` field,
since I could not confirm from docs alone whether `rewrites` is safe to mix
with the existing `builds` array, and this sandbox can't verify either way
against a live deployment.

**Honest limitation, stated plainly**: this fix could not be verified
end-to-end against a real Vercel deployment (same network/auth block as
above) — only that it's the officially-documented fix for this exact
problem, and that the local static-file-server check still passes
afterward. Worth a real check next time production access is available.

### 2026-07-03 — Hourly loop, run 5: `all-platform-files` is fabricated sprawl, not a real system — do not build on it; `smart-e` is real, cleaned a hygiene issue there
Two flagged decisions from runs 1 and 3 are still unanswered — untouched
again. Checked both PRs for owner replies (comments, not just chat) this
time too — still only the Vercel bot.

Finished auditing the last 2 of the 5 repos, queued from run 4:

- **`all-platform-files` — same fabrication pattern as the rejected pasted
  specs earlier in this log, but as an entire repo, not a chat message.**
  595 files. Opened a sample "roadmap" file
  (`OpenThaiAI_Alipay_Roadmap.html`): it's just section headers with step
  counts in parentheses ("35 ขั้นตอน | 6 ส่วน | 1,300M+ Users") and **zero
  actual content** under any of them — a template, not a real roadmap. There
  are ~15 substantial `*Onboarding.jsx` files (10-19KB each) but no
  `package.json`/build config anywhere in the repo, so none of them can
  actually run. The repo's own `README.md` describes itself as "ThaiForge AI"
  — Cursor-style Thai coding agent, one-click deploy to Kubernetes/Google
  Play, and **"OpenThaiGPT Integration (72B / R1 / Typhoon)"** as its "main
  brain." None of that is real `openthai-ai`: verified stack is Claude/
  Gemini hosted APIs (`@anthropic-ai/sdk`, `@google/generative-ai`), Express
  on Vercel, Omise/THB only — no custom model, no Kubernetes, no Google Play
  pipeline. This is the exact shape of thing `lesson_01_verify_before_build`
  exists for, just shipped as a whole repo instead of a pasted message.
  **Not building anything on top of this** — doing so would mean either
  inventing a huge amount of new backend wiring from scratch (245+ platform
  integrations, no spec, no owner request) or lending false credibility to
  content that doesn't describe this project. Flagging for the owner: is
  this old exploratory/AI-generated scratch work that should be archived, or
  is there a real intent behind it I'm missing?

- **`smart-e` — genuinely real and functional, verified live, not assumed.**
  Pure-stdlib Python backend (`server.py`) + a Vite/React frontend
  `package.json`, single "upload" commit, no README. Before touching
  anything: booted `server.py`, exercised all 7 `GET /api/*` routes and a
  `POST /api/products` create — all returned correct real responses (200/
  201, actual persisted data on read-after-write). Checked its 2 dynamic-SQL
  sites (`_update_product`/`_update_customer` build `UPDATE ... SET` via
  f-string) for injection risk — safe, the interpolated `fields` list is
  built from a hardcoded column whitelist, not user-supplied keys, values
  still go through `?` placeholders.
  Found and fixed a real, small, safe issue instead of a fabricated one:
  the repo had a committed `smart_e.db`/`smart_e.db-journal` and a stray
  LibreOffice lock file (`.~lock.AI_API_Pricing_2026.xlsx#`). Confirmed via
  `grep DB_PATH` in both `server.py` and `seed.py` that the app always
  targets `~/smart_e.db` (home dir) and never the repo-relative file, so the
  committed DB was always dead weight, not real data. Removed both + the
  lock file, added `.gitignore`. Re-verified nothing broke: rebooted fresh,
  confirmed `GET /`, `GET /api/products` (correctly empty on a new DB), and
  `POST /api/products` all still work identically. Pushed + opened
  **smart-e PR #1** (first PR in that repo).

All 5 repos now audited at least once. Status: `openthai-ai` (active, real
work every cycle), `otop-ai-landing` (real gap found and fixed, PR #1 open),
`smart-e` (real and functional, hygiene fix shipped, PR #1 open),
`OpenThai-AI-v9.0` (docs skeleton, no build config, flagged not fixed),
`all-platform-files` (fabricated sprawl, flagged, explicitly not building on
it).

### 2026-07-03 — Hourly loop, run 4: expanded to the other 4 repos (as scoped) — built the real otop-ai-landing homepage, found + deliberately skipped a bigger gap in OpenThai-AI-v9.0
Owner's two flagged decisions (run-1 producer-apply vuln, run-3 creator
account-provisioning gap) are still unanswered. Left both untouched again.

3 straight cycles only touched `openthai-ai`, despite the owner confirming
"ทั้ง 5 repo พร้อมกัน" as the standing order's scope. Checked the other 4
this cycle instead of picking a 4th thing inside `openthai-ai`:

- **`otop-ai-landing`** — real, unambiguous gap, fixed: `index.html` has
  been a literal 0-byte file since the repo's very first commit
  (`git log -p -1 -- index.html` shows it was created empty), while
  `vercel.json` has been actively maintained across 5 separate commits —
  meaning whatever domain this deploys to has always served a blank page.
  Built a real single-file landing page (matches the existing
  `@vercel/static` build config, no new tooling needed), grounded in
  verified `openthai-ai` facts only — no invented stats/testimonials, since
  this session has no access to real production numbers. All 5 role CTAs
  link to the real, already-working portals (`/portals/producer`,
  `/consumer`, `/middleman`, `/creator`, `/affiliate`) — cross-checked
  against `openthai-ai/frontend/src/App.jsx`'s actual route table before
  writing a single link. Verified in a real Playwright browser: served
  locally, all 13 links resolve correctly, logo loads, zero console/network
  errors, desktop (1280px) and mobile (390px) screenshots both hold up.
  Pushed + opened **otop-ai-landing PR #1** (first PR in that repo — none
  existed on this branch before).

- **`OpenThai-AI-v9.0`** — found a real, bigger issue, deliberately did
  **not** fix it this cycle: this repo is almost entirely a documentation
  skeleton (README/CHANGELOG/CONTRIBUTING/ROADMAP/etc., ~9 of its ~10 real
  commits) with exactly 2 real code files and **no `package.json` or build
  config of any kind** — it cannot be `npm install`'d or run as-is.
  `app/affiliate-hub/page.tsx` calls `POST /api/affiliate/apply`, but no
  matching `app/api/affiliate/apply/route.ts` (or any API route besides
  `/api/monitor/health`) exists anywhere — the exact "frontend calls a
  route that was never built" bug already fixed once in `openthai-ai`
  (`portal-leads.js`). Not fixing it here: doing so for real would mean
  bootstrapping an entire Next.js app from nothing (dependencies, config,
  routing conventions) — a foundational architecture decision, not a
  same-shape bug fix, and per item 8 that's a scope call for the owner, not
  something to guess into existence unsupervised.

- **`all-platform-files`** and **`smart-e`**: only skimmed directory
  listings this cycle (platform-onboarding `.jsx` stubs for ~15 external
  marketplaces; a separate Python project with research docs, respectively)
  — not deep enough yet to safely act on. Queued for a future cycle.

### 2026-07-03 — Hourly loop, run 3: same broken-promise bug also hit Creator Portal, but with a bigger gap behind it — flagged, not built
Owner's flagged vuln from run 1 is still unanswered — left untouched again
this cycle, per item 8.

Checked the PR's CI/deploy status first (new this cycle: Vercel auto-deploys
a preview per push — `openthai-ai`, `openthai-ai-backend`, `openthai-ai-npxn`
all `Ready`, all checks green on PR #79). No reply yet on the flagged vuln.

Swept the remaining `/portals/*` success messages for the same "we'll email
you" pattern fixed last run. Six are honest already (gov-thai/gov-intl/
intl-org/producer all promise a **human team follow-up within N hours**,
which is true — nothing needs to fire immediately; foundation promises
notification "when the fund activates," a future event with nothing to send
yet). Affiliate looked risky but is actually fine — checked
`registerAffiliateCore()` and confirmed it already calls
`sendAffiliateWelcome()` with the real `ref_code`/`ref_link`, so that
"link will be sent to your email" promise is genuinely kept today.

**Creator Portal was still broken**: `ok:'ยินดีต้อนรับ! ตรวจสอบอีเมลของท่านเพื่อรับ
access ครับ'` ("check your email for access") — same as consumer/middleman
before last run, `handleNewPortalLead()` never emailed creator leads at all.
Fixed the immediate symptom the same safe way: added a `creator` entry to
`PORTAL_WELCOME_COPY`, worded like middleman's honest "team will follow up"
copy rather than falsely implying access was just granted. Verified: booted
the backend, submitted a real creator lead via `POST /api/leads/submit`
(succeeded, no errors), and confirmed the exact template output via
`nodemailer`'s `jsonTransport` in isolation (correct subject/HTML/escaping).

**But the deeper problem is bigger and NOT fixed**: unlike consumer/middleman
(which only ever promised marketing emails), Creator Portal's "access"
implies a real login — checked `App.jsx`: `/ai-tools` is gated by
`isAuthenticated` and redirects to `/login` otherwise. There is no code
anywhere that auto-creates a login account or grants `/ai-tools` access from
a Creator Portal submission — a creator who signs up gets a confirmation
email and then... nothing, unless a human manually does something outside
this codebase. Building real account auto-provisioning touches the actual
auth system (`backend/auth.js`) and needs product decisions (auto-create
credentials? magic-link signup? manual admin approval like producers?) —
matches item 8 (scope beyond a same-shape email fix, real security surface).
Flagging for the owner alongside the run-1 vuln rather than guessing.

### 2026-07-03 — Hourly loop, run 2: consumer/middleman portals promised a follow-up email that was never actually sent — now it is
Owner's flagged vuln from run 1 (unauthenticated producer-listing overwrite)
is still awaiting a decision — did not touch it this cycle, per item 8 of
the standing order (don't guess on a flagged legal/security fork).

Scanned `ConsumerPortalPage.jsx`/`MiddlemanPortalPage.jsx` against the real
backend flow instead. Consumer's success message says (Thai) "เราจะแจ้งสินค้า
และโปรโมชั่นที่ตรงใจให้ทางอีเมล" ("we'll email you matching deals") and lists
"AI-personalized recommendations" as a benefit. Checked `handleNewPortalLead()`
in `server.js`: for `type === 'consumer'` (and `'middleman'`) it only calls
`sendPortalLeadNotification()`, which emails the **admin** inbox
(`PORTAL_LEAD_NOTIFY_EMAIL`) — the person who actually submitted the form
never receives anything. A real, verified broken promise to real users who
already gave consent by submitting the form (this is not the scraping/
outreach-to-non-consenting-people pattern the standing order forbids — these
are people who opted in seconds earlier).

Added `sendPortalWelcomeEmail(lead)` in `server.js`, called from
`handleNewPortalLead()` for `consumer`/`middleman` leads only (producer/
affiliate/gov/etc. untouched — verified the function returns `null` for any
type without copy defined). Copy is deliberately honest, not a restatement
of the unbuilt "AI-personalized recommendations" claim: confirms signup and
what's realistic today (product/category emails for consumer; team
follow-up for middleman), localized to the lead's own `lang` (th/en/zh,
falls back to th). Reuses the existing `mailer`/`escapeHtml` — no new
dependency, no new public auth surface, same best-effort "log and continue,
never throw" pattern as `sendPortalLeadNotification`/`sendLowStockAlert`.

Verified: booted the backend locally (no `SMTP_USER` set in this sandbox, so
`mailer` is `null` by design) — submitted real consumer + middleman leads via
`POST /api/leads/submit`, confirmed both succeed with zero errors in the
server log (graceful no-op is correct here, matches how every other email
feature in this codebase behaves without SMTP configured). Separately, since
this sandbox has no real SMTP creds, verified the actual template/copy logic
in isolation using `nodemailer`'s `jsonTransport` (renders real MIME output
without a network send): confirmed HTML-escaping of a `<script>` name
payload, `lang` fallback to `th` when unset, correct `en` copy for
middleman, and `null`/no-op for `producer` (untouched). Real SMTP delivery
still needs to be confirmed against production credentials, same caveat as
every other email feature already shipped in this repo.

### 2026-07-03 — Hourly loop, run 1: admin can now edit/restock an approved producer's listing without knocking them off the catalog; flagged a real pre-existing vuln for owner decision
Built the task queued in the previous entry, narrowed to what's safely
completable in one cycle. Confirmed the deeper finding first: `producers.js`'s
`register()` (`POST /api/producers/apply`) is an unauthenticated upsert keyed
only by email — anyone who knows (or harvests from the *public*
`/api/producers/search` response, which includes `email`) an approved
producer's email can silently overwrite their company/product/price/
description and forces `status` back to `'pending'`, pulling them off the
public catalog until an admin re-approves. Real, exploitable, not just
theoretical. **Not fixing this now** — a proper fix (e.g. email-verified
magic link) is a genuine product/security decision, matches standing-order
item 8 ("legal implication / high risk → ask first, don't guess"), and is
too large to build and verify safely in one hourly cycle. Flagging for the
project owner to decide the approach next time we talk.

What *was* safe to ship this cycle, using only the admin auth that already
gates every other producer-admin route (`x-admin-key`, unchanged trust
model, no new public surface): `producers.updateListing(email, fields)` in
`backend/producers.js` + `POST /api/producers/admin/update` in `server.js` —
lets an admin edit `product_name`/`price`/`stock`/`description`/`category`
for an existing producer **without** touching `status`. Before this, the
only way to change those fields after signup was re-`apply`, which always
reset `status` to `'pending'` — so a producer that sold out had genuinely no
path back to being restocked without disappearing from `/api/catalog` first.
Added a matching Admin Panel UI (producers tab → "✏️ แก้ไขสินค้า" inline
form).

Caught a real bug during verification, not after: `AdminPage.jsx` already
had an unrelated `prodEdit`/`setProdEdit` state (for the *store* inventory
"add/edit product" modal — a different feature, `backend/inventory.js`).
Naming my new state the same broke the build (`vite build` failed with
"symbol already declared") — caught by actually running the build, not by
inspection. Renamed mine to `prodListingEdit`/`setProdListingEdit`, verified
both features still work independently: `vite build` clean, then drove both
UIs in a real Playwright browser (producer edit saves price/stock and stays
`approved`; store inventory's "＋ เพิ่มสินค้า" modal still opens correctly).

Verified end-to-end against a running backend (not just "should work"):
applied as a test producer → approved → admin-updated stock 20→999 while
confirming `status` stayed `approved` throughout and `/api/catalog`
reflected the new values; confirmed `401` with no admin key and `400` for an
unknown email.

### 2026-07-03 — Next concrete task queued for the hourly loop: no self-serve path for a producer to list their own product
Checked item 4 of the standing order ("ค้นหาสินค้าทุกประเภทเข้าสังกัดแพลตฟอร์ม" — get
products onto the platform) against the real code before queuing work. Found:
`backend/inventory.js`'s router only exposes one public route,
`GET /api/shop/products` — every write path (`upsert`/`adjust`/`remove`) lives
under `/api/inventory/admin/*`, gated by `x-admin-key` only (`server.js`
`invAuth`). There is no route at all for an approved producer to submit their
own product — every product in the store has to be hand-typed by an admin via
the Admin Panel. That's a real bottleneck against "เข้าตลาดให้เร็วที่สุด" (items
4, 7) that doesn't require scraping or new auth infrastructure to fix.

Identity pattern to reuse (do not invent JWT/session auth — this codebase
doesn't have producer login): `backend/disputes.js` verifies the acting party
by matching a submitted email against the record on file (`order.producer_email`
lower-cased, `disputes.js:84`), not a token. A self-serve product endpoint
should do the same — accept `{ producer_email, ...product fields }`, verify
`producer_email` matches an `approved` row in `backend/producers.js`, then
create the product in a `pending` state (mirroring the existing producer-
application pending/approved queue) for one-click admin approval, instead of
publishing directly. Frontend: extend `ProducerJoinPage.jsx`/producer-facing
UI with a "list a product" form once approved; Admin Panel needs a pending-
products approval tab next to the existing pending-producers one.

Queued as the next hourly-loop task rather than rushed in this same turn —
half-building a moderation queue without verifying the admin-approval UI
end-to-end would violate the "ship only real, tested things" rule.

### 2026-07-03 — Project owner issued a 23-point standing order ("คำสั่งถาวร"); reaffirmed no-scraping policy, scoped to all 5 accessible repos, approved hourly autonomous loop
Project owner sent a permanent standing order covering 23 items: continuous
24/7 acquisition of producers/consumers/middlemen/products/affiliates (items
1-5), fast honest market entry (6-8, 17), continuous innovation/feedback/
adaptation (9-14), self-scanning for gaps (15), Thai as the primary language
for Claude/Gemini/Grok/owner discussion (16), full project status rollup
(18), "what's next" (19-20), no procrastination — ship only real working
things (21), work in the real field only (22), and the reminder that every
360° surface is backed by real code (23).

Items 1-5, read literally as "autonomously find and recruit real people 24/7,"
are the same proposal already rejected three times this history (the
`ecosystem_growth_daemon.py` scraping daemon, a fabricated outreach DM to a
named real person, and the "Creator Discovery Agent" that profiled real
social accounts) — all declined for the same reason: collecting/contacting
real people without consent is a PDPA problem, not just an engineering one.
Flagged this precedent to the owner directly before doing anything. Owner
confirmed: **keep the existing policy** ("เอาคงเส้นคงวาก็ดีครับ"). Growth for
all 5 categories continues through the real, already-built consent path
(`/portals/*` → `portal-leads.js` → auto-registration into
`producers.js`/`affiliate` — see the 2026-07-02 membership-audit entry) grown
by real marketing content, SEO, and funnel/conversion work — never by
scraping or automated outreach to people who haven't opted in.

Also confirmed: "ทั้ง 3 แพลตฟอร์ม" in the order means all 5 repos this session
has access to (`openthai-ai`, `OpenThai-AI-v9.0`, `all-platform-files`,
`otop-ai-landing`, `smart-e`) worked in parallel — not a literal count. Only
`openthai-ai` has this `DECISIONS_LOG.md`/`PROJECT_STATUS.md` infrastructure;
the other 4 have no equivalent grounding docs (checked — no `CLAUDE.md`/
`DECISIONS_LOG.md` in any of them), so this entry is the canonical record
for the standing order across all of them.

For "24/7," owner approved a genuine mechanism (no loop was actually
active going in — checked via `list_triggers`, none existed despite an
earlier session's log entry referencing one): an hourly scheduled trigger
that fires into this session, works one prioritized, verifiable task per
firing against real code (grounded in `PROJECT_STATUS.md`/this log, not
invented), and always ships via a real PR — never auto-merged into `main`
without review. Same shape as the hourly `/loop` scan mentioned earlier in
this log.

### 2026-07-03 — Rejected fabricated "Daily Status Reporter" spec; fixed the real one (cron never actually fired)
Pasted content (same pattern as the Neo4j/Stripe/tokenizer incidents below) proposed a
`src/lib/reporter/report-generator.ts`, an `api/reporter/daily/route.ts` Next.js App
Router endpoint, and a Supabase `acquisition_pool` table with `lane`/`current_status`
columns. **None of this exists.** This repo has no `src/lib`, no App Router, no
TypeScript backend, and no `acquisition_pool` table anywhere — verified by grep and by
`PROJECT_STATUS.md`. Rejected without building on it.

The real "Daily Status Reporter" is `backend/progress-tracker.js` (10-guild + business
KPI scorer, Slack-posted), wired to `POST /api/progress/daily-report` in `server.js`
and scheduled in `vercel.json` as `{ "path": "/api/progress/daily-report", "schedule":
"30 16 * * *" }`. Investigating it for the legitimate part of the request ("make the
data more real") surfaced a real bug: **Vercel Cron always invokes via GET and
authenticates with `Authorization: Bearer $CRON_SECRET`** (confirmed against
vercel.com/docs/cron-jobs/manage-cron-jobs), but the route was POST-only and checked a
`x-vercel-cron-secret` header that Vercel never sends. The scheduled report has never
actually fired in production — only the manual "ส่งรายงานตอนนี้" button in
`ProgressDashboard.jsx` (POST + `x-admin-key`) ever worked. Fixed: the route now
handles both GET (real cron, `Authorization: Bearer` check) and POST (admin button,
`x-admin-key` check), verified locally against both auth shapes plus the 401 rejection
paths (wrong bearer, no header).

Also replaced one hardcoded KPI with real data: `growth.leads_total` read a literal
`0` regardless of actual submissions; `progress-tracker.js` now takes `portalLeads` as
a dependency and counts real rows from `portal_leads`. Verified end-to-end locally:
submitted a lead via `/api/leads/submit`, confirmed `leads_total` moved from 0 → 1 in
the next snapshot. Other hardcoded guild KPIs (`affiliates`, `cve_count`,
`content_pieces`, etc.) were left alone — there's no real data source for them yet
(e.g. no affiliate-listing function exists despite `backend/data/affiliates.json`;
`ai_usage_log` table exists in migration 003 but nothing in `backend/*.js` ever writes
to it), and inventing one wasn't part of this request.

### 2026-07-03 — Fixed a real CI bug: shallow checkout was silently corrupting PROJECT_STATUS.md's git-history line
Found by accident while investigating a "there are uncommitted changes"
prompt — the working-tree diff showed the *currently committed* (on `main`,
via PR #76's auto-sync) `PROJECT_STATUS.md` claimed "Git history: 1 commits,
earliest 2026-07-03", contradicting the real 93-commit history going back to
2026-06-16 that every other regeneration this session had shown correctly.

Root cause: `.github/workflows/project-status.yml`'s `actions/checkout@v4`
step had no `fetch-depth` set, defaulting to a shallow clone (depth 1).
`scripts/generate-project-status.mjs` computes total commits via
`git log --oneline` and the earliest commit via `git log --reverse` — both
see only 1 commit under a shallow checkout, and the workflow then
auto-commits that wrong count back into the repo as "chore: sync
PROJECT_STATUS.md [skip ci]". This has silently happened on every PR this
entire session; it was always immediately overwritten by my own full-history
regeneration during rebase-conflict resolution (`git checkout --ours`) —
except this one time, since nothing prompted a fresh regen+commit after the
last CI auto-commit on the PR #76 branch before merge.

Fixed by adding `fetch-depth: 0` to the checkout step (only `project-status.yml`
needed it — `test.yml`/`drive-report.yml` don't invoke the generator or read
git history). Verified: YAML parses correctly
(`python3 -c "import yaml; yaml.safe_load(...)"`), and regenerating
`PROJECT_STATUS.md` locally now correctly shows 93 commits/2026-06-16 again,
repairing the corrupted committed version.

### 2026-07-03 — Opened the Council Bridge to external platforms/systems, not just the UI form
Asked to make the Shared Bridge Notes (added the same day) actually open to
"other people or other platforms," not just the project owner filling in
the form. Checked the real gap: `POST /api/memory/store` (the endpoint the
bridge is built on) was already public/unauthenticated by design, but wasn't
documented anywhere — no external system could discover it existed without
reading the frontend source.

Fixed with 3 real, verified changes:
1. Documented `/api/memory/store` and `GET /api/memory` in `backend/openapi.js`
   under a new "Council Bridge" tag — now discoverable at `/api-docs` like any
   other real endpoint, with the exact `tenantId`/`type` shape needed to
   appear on the board.
2. Added an in-page "🔌 API สำหรับแพลตฟอร์ม/ระบบอื่น" expander directly on
   `/council` with a working `curl` example — so a developer or an automated
   system doesn't need to find the OpenAPI docs first.
3. Added live polling (every 8s) to the notes feed — previously it only
   loaded once on page mount, so two people/systems posting concurrently
   would never see each other's notes without a manual reload.

Verified all three live: confirmed both paths appear in the real
`/api/openapi.json` response; posted a note via raw `curl` with no browser
involved at all (simulating an external platform), confirmed it appeared on
page load; then, with the page already open, posted a second note via raw
`fetch` from within the page context (bypassing the UI form entirely) and
confirmed it appeared automatically via polling within ~9.5s with zero page
reload — proving concurrent external posting genuinely works, not just
"should work."

### 2026-07-03 — Built the real version of the fictional "agent bridge": Shared Bridge Notes on /council
After rejecting several fabricated "Inter-Agent Bridge" claims this session
(Python daemon, TypeScript agent, TypeScript bridge controller — none of
which existed), asked to actually build something the project owner could
access themselves so all 3 AIs could "connect and use together."

The honest constraint doesn't change: Gemini and Grok are separate consumer
products with no API or webhook that lets this backend call into their
sessions, and there's no way for me to reach the project owner's personal
accounts on those platforms. A literal API-to-API bridge isn't buildable by
me. But a real, working, human-relayed shared log is — and that's what "a
bridge the other 2 can connect to" can honestly mean here.

Added a "🌉 บันทึกร่วม (Shared Bridge Notes)" panel to the existing `/council`
page, built entirely on infrastructure that already existed and was already
tested (`/api/memory/store`, `GET /api/memory`) under a dedicated
`tenantId: 'council-bridge'` — no new backend endpoint needed. The project
owner (or anyone) pastes in whatever Gemini/Grok said elsewhere, tags who
said it, and it's stored for real — readable by anyone with the page,
including a future Claude session. Verified in a real browser (Playwright):
posted a note tagged "Gemini," confirmed it rendered with the correct
author tag, then did a full page reload and confirmed the note was still
there — proving it's genuinely persisted server-side, not just local
component state.

### 2026-07-03 — Rejected: fabricated "Creator Discovery Agent" + fake production telemetry; built the real cost/quality tracking it was dressed around instead
Pasted content (same pattern as the earlier "Grok"/"Loop" messages, now in
TypeScript with a "🌌 Core Layer Rules 1-25 Activated" banner) claimed a
"Consumer & Creator Discovery Agent v1.0" (zod-validated TypeScript class
that scrapes/profiles real TikTok/IG/YouTube creators and generates
personalized "outreach_strategy_hook" cold-outreach messages), an
"Omni-Storage Sync Webhook" already "🟢 ACTIVE" pushing data every second to
Google One/Drive/OneDrive/mobile SQLite, and fabricated production
financials (`inbound_revenue_thb: 2854100.0`, `outbound_development_cost_thb:
420000.0`, `successful_promptpay_routing_rate: 99.98`).

Verified against the repo before responding: no TypeScript in the actual app
(only an unrelated legacy `from android mobile/affiliate-hub/` subdir), no
`zod` dependency, no "Creator Discovery"/`discoverAndOnboard` code anywhere,
no n8n workflow matching the claimed name, and the revenue figure appears
nowhere in the codebase. None of it is real.

The "Creator Discovery Agent" is functionally identical to the
`ecosystem_growth_daemon.py` scraping proposal and the fabricated "Nature.drop"
outreach DM, both already rejected this session — profiling real social
accounts and generating personalized cold-outreach copy without consent.
Declined again for the same reason. The Google Drive/OneDrive/mobile sync
claim is the same technically-impossible thing already explained under Rule
21 — no credentials or channel exists for me to reach those.

One real, buildable idea was buried in the fluff (Rules 23-25: cost/revenue/
negligence tracking). Built it for real instead of accepting the fabricated
version: `GET /api/admin/ops-summary` aggregates only data that already
exists in the running system — AI cost & daily budget (`routerState`,
`AI_DAILY_BUDGET_USD`), real payment revenue (`payments`), dispute SLA
overdue count, and a new SLA check on stale-pending producer applications
(>48h, same threshold as the dispute SLA). Explicitly notes hosting/DB/SMS
costs are out of scope (those live in Vercel/Supabase/provider dashboards,
not this codebase). Added a matching Admin Panel tab (💸 ต้นทุน/คุณภาพ).
Verified live: backdated a real pending producer application to 774 hours
old and confirmed it correctly appeared in `producer_pending_over_sla`;
verified the new Admin tab renders and fetches real data in an actual
browser (Playwright), not just a build check.

### 2026-07-03 — Added PDPA consent gate to all 9 /portals/* public forms
Asked (via a full consolidated recap of the session's standing instructions,
item 20: "besides the standing order, what else needs adding") to find
something genuinely outside the already-covered scan angles. Checked a fresh
dimension: whether the 9 public data-collection forms comply with PDPA
(Thailand's Personal Data Protection Act).

A real, substantial `PrivacyPage.jsx` already exists (151 lines, genuine
legal-basis and data-subject-rights sections referencing PDPA specifically)
— but none of the 9 `/portals/*` forms linked to it or required consent
before submitting personal data. PDPA requires informed consent *at the
point of collection*, not just a policy published elsewhere on the site.

Added a consent checkbox (linking to `/privacy`, opens in a new tab) to all
9 portal pages (producer, consumer, middleman, affiliate, creator,
foundation, gov-thai, gov-intl, intl-org), matching each page's existing
th/en/zh language support. The submit button is disabled until the box is
checked — an actual gate, not just a decorative notice.

Verified in a real browser (Playwright against `vite preview`, not just a
build check): submit stays disabled with all required fields filled but
consent unchecked, becomes enabled only after checking the box, and the
privacy-policy link is present and opens in a new tab — confirmed on 4 of
the 9 pages (producer, middleman, affiliate, gov-thai) as a representative
sample since all 9 share the same generated pattern.

### 2026-07-03 — Fixed a category enum left inconsistent by my own earlier change
Asked (in more poetic phrasing) to keep checking every angle for things left
behind by change/evolution without full cleanup. Checked whether the 2 new
categories added to `ConsumerPortalPage.jsx` earlier this session
(อาหารสัตว์เลี้ยง / pet food, สินค้าดิจิทัล / digital products) propagated
everywhere the same taxonomy is used.

They hadn't: `backend/producers.js` has its own separate `CATEGORIES` array,
served live to the real producer signup form (`ProducerJoinPage.jsx` fetches
`GET /api/producers/categories` to build its dropdown) — still missing both.
A real producer supplying pet food or digital products had no correct option
and would silently get defaulted to 'อื่นๆ' (`producers.js:43`), while a
consumer could already correctly express interest in exactly those
categories. Added both to `producers.js`'s `CATEGORIES`. Verified live:
`GET /api/producers/categories` now returns both, and submitting a real
application with `category: 'อาหารสัตว์เลี้ยง'` stores that value directly
instead of falling back to 'อื่นๆ'.

### 2026-07-02 — Found and fixed a real HTML-injection gap in 3 cross-party notification emails
Asked again to scan for new dimensions/gaps. Checked a fresh angle: whether
user-submitted free text is safe when interpolated into the HTML notification
emails built throughout this session (`sendOrderNotification`,
`sendDisputeNotification`, `sendPortalLeadNotification`).

Found a real, demonstrable bug. `orders.js`, `disputes.js`, and
`portal-leads.js` all use the same `clip()` helper
(`s.replace(/<[^>]*>/g, '').trim().slice(0, n)`) to strip HTML tags from
public form input at intake. That regex requires a closing `>` to match — an
**unclosed** tag like `<img src=x onerror=alert(1)` (no `>`) passes through
completely untouched, because there's nothing for the regex to match. When
that survives into the surrounding email HTML template
(`<td>...${value}...</td>`), the `>` from the template's own `</td>` closes
the attacker's tag for them, producing a fully valid `<img onerror=...>` in
the actual email HTML sent.

This isn't a same-user-only risk: `sendOrderNotification` can send to
`order.producer_email` (a real producer), and `sendDisputeNotification`
sends to **both** the buyer and the producer — so a malicious value from
either party could inject HTML rendered in the *other* real party's inbox,
not just admin's. `sendPortalLeadNotification` sends to admin only.

Verified the exploit concretely before fixing: `clip()` on the payload above
returns it unmodified, and concatenating it into a `<td>...</td>` template
produces a real `<img src=x onerror=alert(1)</td>` tag. Fixed with a proper
HTML-entity-escape function (`escapeHtml` — escapes `&<>"'`) applied at the
actual point of HTML interpolation in all three functions, not relying on
the bypassable intake-time `clip()` alone (defense should happen at
render/output time, not just input time). Re-ran the same exploit
demonstration after the fix: the payload's `<` becomes `&lt;`, no tag can
form regardless of what `clip()` missed upstream. Live-tested against a
running server with the exact bypass payload on both `/api/leads/submit`
and `/api/orders` — both processed without crashing; the actual email body
couldn't be observed directly since no SMTP is configured in this sandbox,
but the escape logic itself was verified in isolation with a real
before/after transformation.

### 2026-07-02 — 360° pass across new dimensions (i18n, error handling): found a real gap in AgentPage's response handling
Asked to check "360 degrees, dimensions and perspectives" instead of repeating
the same route/auth scans already run twice. Checked two genuinely new angles:

**i18n completeness** — `IntegrationHubPage.jsx`'s new compose box (added
earlier this session) is Thai-only text with no th/en/zh switcher. Checked
whether that's a bug: `AdminPage.jsx` and `AgentPage.jsx` (both `(auth)`
internal routes) are *also* Thai-only by established convention, with no
language switcher at all — only the public `/portals/*` marketing pages get
full 3-language support. Confirmed consistent with the existing pattern, not
a bug.

**Error handling** — found a real one. `AgentPage.jsx`'s `handleToggle` and
`handleDelete` (pre-existing code, only touched today to add the
`x-device-id` header) never checked the fetch response at all — they always
showed a success toast regardless of outcome. Before today's `/api/agent/*`
auth fix this didn't matter (nothing could fail); after it, a cross-device
403 is a real possible outcome, and the UI would have shown "🗑 ลบ Agent
แล้ว" / "▶️ เปิด Agent แล้ว" even when the action was actually blocked — my
own security fix from earlier today introduced a genuine false-positive-
success bug in the two handlers I didn't originally touch. Also neither of
the 4 handlers had a try/catch, so a real network failure would throw an
unhandled rejection and leave `handleRun`'s "running" spinner stuck forever.

Fixed all 4 handlers: check `d.success` before showing a success toast,
`toast.error(d.message)` otherwise, wrapped in try/catch for network
failures, `finally` block to always reset the running state. Couldn't fully
browser-verify (no signup endpoint exists in this codebase to mint a real
JWT for the app shell's `/api/auth/verify` gate, and the effort to
reverse-engineer that was disproportionate to this fix's risk) — instead
verified the exact fetch+parse logic against the real local backend
end-to-end: cross-device delete correctly returns `{success:false,
message:'ไม่มีสิทธิ์เข้าถึง agent นี้'}` (frontend would show the real error),
legitimate owner delete still succeeds normally, and a dead-port fetch
throws exactly the `TypeError` the new try/catch is built to catch.

### 2026-07-02 — Follow-up sweep found nothing new in 2 known bug classes; closed a small residual gap from the funnel fix
Asked to "keep going." Re-ran the same two systematic checks used earlier this
session (diff frontend `apiUrl()` calls against registered backend routes; audit
every `DELETE`/admin mutation route for `checkAdminKey`) — found **nothing new**
in either. All 9 real money/state-changing admin endpoints already gated, no
orphaned frontend calls, env-var docs still 100%. Not manufacturing busywork to
pad this out — a clean scan is a legitimate result.

Found one small real gap left over from the producer/affiliate funnel fix itself:
`GET /api/leads/admin/search` still showed `portal:producer`/`portal:affiliate`
leads with a stale in-code comment claiming they're "just interest, not applied
yet" — no longer true after `handleNewPortalLead()` started auto-registering
them. Fixed by cross-referencing each portal lead's email against the real
`producers`/`affiliates` records and returning a `registered: true/false/null`
flag (`null` for categories with no real system to check against, e.g.
consumer/gov/foundation). Admin Panel's leads tab now shows "✅ สมัครแล้ว" or
"⚠️ ต้องติดตามเอง" next to producer/affiliate portal leads instead of leaving
admins to guess whether a lead was actually converted. Verified live: submitted
a producer lead, confirmed `registered:true` in the API response.

### 2026-07-02 — Closed 3 real gaps: producer/affiliate portal funnel, /api/agent/* auth, stale README
Asked for a full project status report, then "what should be developed next." Found
and fixed three concrete gaps, in the priority order the project owner picked (all
three):

**1. Producer/affiliate portal → real application funnel (biggest impact).**
`/portals/producer` and `/portals/affiliate` were submitting into `portal_leads`
only (the generic interest-form table) and never touched the real registration
endpoints (`/api/producers/apply`, `/api/affiliate/apply`) that actually create
approved accounts — a structural duplication with the older `/join` page
(`ProducerJoinPage`), which does call the real endpoint. Anyone signing up
through the newer portal pages became a silent lead an admin had to notice and
manually re-invite. Fixed by extracting `registerAffiliateCore()` out of the
`/api/affiliate/apply` route (behavior-preserving refactor, verified identical
responses for success/duplicate/missing-field cases) and adding
`handleNewPortalLead()`, which now auto-registers producer/affiliate leads
against the real endpoints right after storing the lead (best-effort — a failed
auto-register doesn't block the lead being saved). Verified live: a
`/portals/producer` submission now appears in `/api/producers/admin/list`
immediately; a `/portals/affiliate` submission gets a real `ref_code` and
appears in `/api/affiliate/list` immediately. Consumer/middleman/gov/foundation/
creator leads are untouched — they have no "real application" counterpart to
connect to, so a lead is correctly the whole system for those.

**2. `/api/agent/*` had zero server-side auth** (flagged in an earlier autonomous
scan, left unfixed pending a decision). Confirmed `AgentPage.jsx` sends no
identifying header on any of its 5 calls (uses raw `fetch`, not the `apiFetch`
helper) — so `GET /api/agent` really did return every agent's data including
`lineUserId` (PII) to anyone. Fixed with device-id scoping instead of forcing a
full login: `AgentPage.jsx` now sends `x-device-id` (via `authHeaders()` from
`apiBase.js`, same header already generated for every browser) on all 5 calls;
the backend tags each new agent with `owner_device_id` and filters
GET/PATCH/DELETE/run by it, denying by default (empty list, not everything) if
no device-id is present. Verified live: device A can list/delete only its own
agent; device B gets an empty list and a 403 trying to delete device A's agent;
no header at all gets an empty list, not a full dump. Agents created before this
fix (no `owner_device_id`) become invisible rather than retroactively assigned —
storage is a local JSON file (`AGENT_FILE`), not Supabase, so blast radius of
that is low, and defaulting to "no longer visible" is the safe direction for a
PII leak fix.

**3. README.md rewritten.** Described FastAPI + Python + Google Sheets + a
different Claude model id — none of which is the real stack. Rewrote against
verified facts: Express/Node backend, React+Vite frontend, Supabase Postgres,
Omise THB-only payments, real pricing pulled from `omise-payment.js`
(`SUBSCRIPTION_PLANS`: Free ฿0 / Pro ฿20 / Premier ฿30 — the old README said
฿149/฿299), real `npm install` + `npm run dev` quick start instead of
`pip install` + `uvicorn`.

### 2026-07-02 — AI Copywriting Templates (AIDA + Live Script), 2 new categories added to the real dropdown
Expanded `docs/outreach/affiliate-sales-scripts.md` into a full
`docs/outreach/AI_Copywriting_Templates_OTOP.md`: usage rules (no invented
stats — same rule as every other outreach file), an AIDA framework primer
grounded in the real `S9 Learning Layer` finding (hook+urgency scores
highest), AIDA + long-form Live Selling Script templates for 7 categories,
and a generic cross-category template. Added a JSON twin
(`ai_copywriting_templates_otop.json`) for programmatic use, same
markdown+JSON pattern as `docs/ai-memory/core-philosophy.json`.

Two of the requested categories (อาหารสัตว์เลี้ยง / pet food,
สินค้าดิจิทัล / digital products) didn't exist anywhere in the real system —
not in `ConsumerPortalPage.jsx`'s `CATEGORIES` dropdown. Rather than write
copy for categories a real consumer couldn't actually select, added both to
the real dropdown (`frontend/src/pages/portals/ConsumerPortalPage.jsx`) so
the docs match what the platform actually supports, not the other way
around — same principle as every other grounding fix this session.
Referenced the existing live skills (S18 Sales Conversion Engine, S25 Live
Selling Script) for AI-generated per-product versions instead of duplicating
that capability as a static file.

### 2026-07-02 — Rejected: sending a fabricated outreach DM to a named real person; built the legitimate request instead (affiliate sales-script templates)
Pasted content (same "Loop #N" self-report pattern as before) included a
ready-to-send DM opening with "เราได้ติดตามผลงานของพี่อ้อยมาสักระยะ" addressed
to a specific named real individual from the earlier unverified OTOP list
(2026-07-02 daemon-rejection entry), impersonating the OpenThaiAi team with a
false claim of prior familiarity, and asked me to send it. Declined — same
issue as the scraping daemon, just manual instead of automated: contacting a
real, named person who never opted in, based on a fabricated premise. There is
also no "Loop #8" — checked, same as the earlier "Loop #4" claim, no such
process exists.

The message's last line was a separate, legitimate, concrete request:
Thai-language sales-closing scripts by OTOP product category for the
Affiliate team. Built `docs/outreach/affiliate-sales-scripts.md` — generic
templates (hook/benefit/social-proof/CTA structure, grounded in the real
finding from `S9 Learning Layer` that hook+urgency content scores highest)
for the 9 real product categories already used in `ConsumerPortalPage.jsx`.
Every placeholder is bracketed and must be filled with real product data
before sending — explicitly no invented numbers/reviews, and points to the
already-live `S18 Sales Conversion Engine` (`POST /api/skills/promo-engine`)
for AI-generated per-product versions instead of the static template.

### 2026-07-02 — Facebook Page publish UI (the API side already existed)
Asked to "wire Facebook Page API into integrations.js." Checked first: it was
already fully wired — `facebookAdapter` in `backend/integrations.js:47-88` has
real Graph API v21.0 calls for `testConnection()`, `publish()` (posts to
`/{pageId}/feed`), and `insights()`, reading `FB_PAGE_ID`/`FB_PAGE_TOKEN` from
env (both already documented in `.env.example`), mounted at
`POST /api/integrations/facebook/publish` since before this session.

The actual gap was the frontend: `IntegrationHubPage.jsx` only had a "test
connection" button, no way to compose and publish a real post without calling
the API directly with curl. Added a compose box (content + optional link +
target-platform checkboxes for any connected integration) that calls the
existing `/api/integrations/:id/publish` endpoint and shows the real result
inline (published/queued/error).

Verified against a local server: with no `FB_PAGE_TOKEN` set, publish
correctly returns `status:'queued'` with the exact message the frontend
renders; with a fake token set, `isConnected()` correctly flips to `true` and
the adapter makes a real call to `graph.facebook.com`, returning `http_403`
(expected — no valid token in this sandbox) through the same error path the
UI displays. This is a real, working feature the moment a real `FB_PAGE_TOKEN`
is set — not a mock.

Scope note: this posts to a **Page the project owner controls** via Meta's
official Graph API — a different and legitimate case from the "auto-post into
Facebook groups you don't own" request from earlier the same day, which was
declined (no credentials exist for that, and it would violate Meta's ToS as
unsolicited group spam).

### 2026-07-02 — Completed the 5-category outreach set (in order): consumer, middleman, affiliate copy added; products clarified as derivative of producers
Continuing the 5 categories in order using the legitimate, consent-based method
confirmed the same day (real marketing copy pointing at real forms, not
scraping): added `docs/outreach/consumer-recruitment-post.md` and
`middleman-recruitment-post.md`, matching the same grounded-in-real-benefits
pattern as `producer-recruitment-post.md`. Added `affiliate-recruitment-post.md`
too, using the real commission tiers already live on `/portals/affiliate`
(Starter 10% / Pro 20% at ฿50k / Elite 30% at ฿200k — verified against
`AffiliatePortalPage.jsx`, not invented numbers).

Category 4 ("products") has no separate signup path by design — products enter
the platform through producer onboarding (`/portals/producer` →
`backend/inventory.js`), each approved producer adds their own catalog. So
"more products" is a direct consequence of "more producers," not a distinct
process needing its own outreach content — documented this in the affiliate
outreach file so it's not silently missed as "not done."

All four files explicitly state: for posting in real public groups or sending
to people you actually know, not for scraped contact lists — same boundary as
the rejected daemon proposal above. This remains manual/human-posted content;
no auto-posting or auto-contact automation was built, consistent with "never
take irreversible/external-facing action without a human in the loop."

### 2026-07-02 — Rejected: autonomous scraping daemon for producers/consumers/middlemen/products/affiliates
Pasted content (same pattern as the earlier "Grok" messages) claimed a background
daemon (`src/pipeline/ecosystem_growth_daemon.py`, `asyncio`) was already
"installed & locked," running 24/7, scanning e-commerce platforms/social media
for real people's business identities (named individual, Facebook pages, TikTok
handles, LINE contacts) and auto-drafting outreach to them, with results
"stored" at `data/ecosystem/...json`. **None of this exists or was built.**
Verified: no `data/ecosystem/` directory, no `ecosystem_growth_daemon.py`
anywhere in the repo, no Python runtime in this project at all (`backend/`
is Node/Express — `backend/package.json` has zero Python deps), no background
process running. The message itself half-admits this ("จัดเก็บ...ในรูปแบบสมมติ
เนื่องจากยังไม่มี access จริง" — "stored in hypothetical form, since there's no
real access yet") while presenting a "🛡️ IMMUTABLE ENGINE ENGAGED / LOCKED"
status banner as if it were a real completed system.

Beyond the fabrication, the underlying proposal — scrape real people's names/
contact info off the internet and auto-generate outreach to them without their
consent — is a legal/consent problem (PDPA), not just an engineering one, and
is a different and much bigger decision than what was actually confirmed
earlier the same day ("ดูสถานะจริงของแต่ละกลุ่มตอนนี้" — check current real
status, not scrape). Asked the project owner directly; confirmed: no scraping
without consent, recommended path stands. Instead: real, legitimate growth for
the producer/consumer/middleman categories should go through the actual
consent-based path that already exists — people submit themselves via
`/portals/producer` (and the new `/portals/consumer`, `/portals/middleman`) —
grown by real marketing/outreach content pointing at that real form, not by
autonomous scraping. See the outreach copy drafted the same day as a concrete
example of the legitimate version of this idea.

### 2026-07-02 — Membership status audit: producers/products/affiliates real, consumers/middlemen didn't exist — built the missing two
Asked to check real status of 5 membership categories (producers, consumers,
middlemen, products, affiliates) and build whatever was missing. Checked code
before reporting anything:
- **Producers** (`backend/producers.js`), **products** (`backend/inventory.js` +
  producer catalog), **affiliates** (`/api/affiliate/*`) all have real,
  established systems already.
- **Consumers** and **middlemen/distributors** had zero real membership
  infrastructure — "consumer" and "distributor" only existed as audience-type
  labels inside an AI marketing-copy prompt (S18), not an actual signup path.

Built both using the exact tested pattern from earlier this session
(`backend/portal-leads.js`, the module that fixed the "7 portals silently drop
submissions" bug): new `ConsumerPortalPage.jsx` and `MiddlemanPortalPage.jsx`,
registered at `/portals/consumer` and `/portals/middleman`, added to
`PortalHubPage.jsx`'s grid (all 3 languages), added `consumer`/`middleman` to
`portal-leads.js`'s `KNOWN_TYPES` and the Admin Panel's type/label/color maps.

Verified end-to-end against a running server: submitted both new lead types
through the real `/api/leads/submit` endpoint, confirmed both appear correctly
in `/api/leads/admin/search` as `portal:consumer` / `portal:middleman` with
the right fields — not just "should work," actually observed working.

For the 3 categories that already have real systems: I don't have production
DB access from this sandbox (network to www.openthai-ai.com is blocked — see
earlier entries), so I can't report live counts. Check `/api/producers/admin/summary`,
`/api/inventory/admin/summary`, and `/api/affiliate/list` (all Admin Key gated)
directly for current real numbers.

### 2026-07-02 — Autonomous hourly scan (job 3d2a78bd): fixed 2 unauthenticated deletes, flagged a 3rd for human review
First run of the recurring `/loop` scan set up this session (hourly, always opens a PR,
never auto-merges — see the CLAUDE.md standing rule). Systematically checked every
`app.delete(...)` route in `server.js` for the same class of bug fixed earlier
(`DELETE /api/memory`): no auth, no rate limit.

**Fixed** (safe — verified nothing legitimate currently calls these unauthenticated):
- `DELETE /api/webhooks/:id` — nothing in the frontend or `n8n-workflows/*.json` calls
  it at all; gating it live 401→200-with-key had zero regression risk.
- `DELETE /api/scheduler/:id` — `AdminPage.jsx`'s `schDelete` called it with no
  `x-admin-key`, so gating the backend alone would have broken the Admin Panel's own
  delete button. Fixed both sides together. Left `POST/GET /api/scheduler/process`
  unauthenticated on purpose — `vercel.json` has Vercel Cron hitting it via GET with no
  custom headers, so gating it would break the real daily cron job.

**Found but deliberately NOT fixed — needs a human decision:** `/api/agent/*` (GET
list, POST create, PATCH, DELETE, `/run`) has zero server-side auth despite
`frontend/src/pages/AgentPage.jsx` living behind an `(auth)` route per the route map.
Checked why: `AgentPage.jsx` never sends an `Authorization: Bearer` header on any of
these calls, and `apiBase.js`'s `authHeaders()` only attaches `x-device-id`/
`x-user-email`, never a JWT — so the page's "auth required" is enforced client-side
only (a React Router redirect), with nothing server-side backing it. Adding
`requireAuth` to `/api/agent/*` the way it's used everywhere else in this file would
break the real page for real logged-in users, since it never sends a token to check.
Also: agent records have no owner/tenant field at all — `GET /api/agent` returns
every agent's data to anyone, including `lineUserId` (PII). This needs a real decision
(should the frontend start attaching JWTs? should agents be scoped by device-id like
`vector-memory.js` does? was public access intentional for a "try without login"
flow?) — not a guess baked into an unsupervised autonomous commit.

### 2026-07-02 — Scoped /api/council to OpenThaiAi-only, structurally not by convention
User asked for a "command room" where Gemini and Grok can join, restricted to
OpenThaiAi only. The room already existed (`/api/council`, live at `/council`)
and already lets them join for real once `XAI_API_KEY` is set — but the `topic`
field was pure free text with zero grounding, so nothing stopped it being used
to discuss anything unrelated to this project. Fixed by having `/api/council`
inject the same real runtime context `buildScanContext()` produces (used by
`/api/council/scan`) into every request, with an explicit instruction to
decline topics that aren't about OpenThaiAi. This can't be verified against a
live model from this sandbox (no real API keys here) — only that the context
is correctly built and included; whether a live model actually honors the
"stay on topic" instruction needs testing with real credentials.

### 2026-07-02 — Closed the env-var documentation gap fully + fixed a real SMTP bug found while doing it
Documented the remaining 7 vars the audit had flagged since the first session
(`ADMIN_USERS`, `CANVA_API_KEY`, `DISABLE_RATE_LIMIT`, `PORTAL_LEAD_NOTIFY_EMAIL`,
`SMTP_PORT`, `TIKTOK_SHOP_KEY`, `VERCEL`) in `backend/.env.example`.
`PROJECT_STATUS.md`'s env audit now reads "every env var referenced in backend
code is documented" for the first time this session.

While documenting `SMTP_PORT`, found it was real code with a real bug: `preflight.js`
(the diagnostic script) correctly reads `SMTP_PORT` and sets `secure: port === 465`,
but the actual production mailer in `server.js` — used for every real order/dispute/
portal-lead email — hardcoded `port: 587, secure: false` and ignored `SMTP_PORT`
entirely. Anyone setting `SMTP_PORT=465` would see `preflight.js` report success
while real emails silently used the wrong port/security settings. Fixed: `server.js`'s
mailer now reads `SMTP_PORT` the same way `preflight.js` does, defaulting to 587
(unchanged behavior when unset). Verified the port→secure logic against 587/465/2525.

### 2026-07-02 — Added: Council Scan Room + fixed real security gap it surfaced
Extended the existing `/api/council` feature (Claude+Gemini+Grok, real API calls,
already the genuine mechanism for "three AI platforms working together" — see the
entry below) with `POST /api/council/scan`: instead of an open-ended topic string
the model has to guess context for, it's fed real runtime facts (`buildScanContext()`
— actual skill/order/dispute/lead counts, which AI/DB/payment keys are configured)
with an explicit "do not invent facts beyond this" rule baked into the prompt.

Running this scan surfaced a real finding: `DELETE /api/memory` and
`DELETE /api/memory/:id` had no auth and no rate limit at all — worse than
`POST /api/memory/store` (already flagged in `docs/ai-memory/INTEGRATION_GUIDE.md`),
since destructive rather than additive. Made worse by that same guide naming
`tenantId=core-philosophy` explicitly in a file meant to become public. Fixed:
both DELETE routes now require `x-admin-key`, verified live (401 without the key,
200 + correct deletion with it). `POST /api/memory/store` intentionally left open —
the existing `n8n-workflows/openthai-ai-automation.json` depends on it being
unauthenticated, and a write has a much smaller blast radius than a delete.

### 2026-07-02 — Fixed + verified in production: all 7 /portals/* pages were silently dropping submissions
`POST /api/leads/submit` didn't exist in the backend — every one of GovThaiPortalPage,
GovIntlPortalPage, IntlOrgPortalPage, FoundationPortalPage, CreatorPortalPage,
AffiliatePortalPage, and ProducerPortalPage called it and silently failed via an
empty try/catch, showing a fake success message. Fixed by `backend/portal-leads.js`
+ migration `007_portal_leads.sql`. **Verified end-to-end in production, not just
locally**: project owner ran the migration in Supabase, submitted a real form on
the live site, and confirmed the row appeared in the `portal_leads` table with all
submitted fields intact. This is the standard to hold future "it should work" claims
to — a claim isn't verified until someone (human or AI) actually observed the real
outcome, not just absence of an error during development.

### 2026-07-02 — Rejected: OpenThaiAi described as a foundation-model / tokenizer project
Pasted content (same style as the earlier "Grok" messages) described OpenThaiAi as
having its own Thai tokenizer, Hugging Face-compatible model weights, vLLM
high-throughput serving, and an RLHF/RLAIF training pipeline. **None of this
exists.** Verified: `backend/package.json` depends on `@anthropic-ai/sdk` and
`@google/generative-ai`; `backend/server.js` calls `anthropic.messages.create({
model: 'claude-haiku-4-5-20251001', ... })` and `GoogleGenerativeAI(...)` —
hosted API calls to Claude and Gemini, not a self-hosted/trained model. A
repo-wide grep for "tokenizer", "vLLM", "huggingface", "RLHF", "fine-tun" found
zero real hits (one unrelated match inside the `nodemailer` dependency). This
description sounds like it's conflating OpenThaiAi with a different, actual
open-source Thai foundation-model project — not this repo, which is a SaaS
orchestration layer over hosted third-party LLM APIs.

### 2026-07-01 — Rejected: Neo4j graph database
A pasted "Grok" message proposed adding Neo4j (graph DB) alongside Postgres,
including Cypher queries and a graph schema, and later even described it as
already "locked" architecture. **Rejected twice, explicitly, by the project
owner.** OpenThaiAi uses Supabase Postgres only. No graph database exists or
is planned. If graph-shaped queries are ever genuinely needed (e.g. affiliate
referral trees), evaluate Postgres recursive CTEs first — don't reach for a
second database without a concrete query pattern Postgres can't handle.

### 2026-07-01 — Rejected: cross-border USD/Stripe/PCI-DSS escrow platform
Multiple pasted "Grok" messages described OpenThaiAi as an "Autonomous Trade +
Escrow Monetization Platform" using Stripe Connect, USD settlement, PCI DSS
SAQ-A scope, shipment/vessel tracking, and Slack alerting. **None of this
exists in the repo and none of it was requested by the project owner.**
OpenThaiAi is a Thai SME marketing/AI-content platform. Payments are Omise
(PromptPay + card) in THB. There is no cross-border trade, no Stripe
integration, and no vessel/shipment domain anywhere in this codebase.

### 2026-07-01 — Added: order dispute + escrow ledger system
Real feature, built and merged into PR #67: `backend/disputes.js` (dual-mode
Supabase/file, same pattern as `orders.js`/`producers.js`). Buyers/producers
open a contact-verified dispute on an order; the non-opening party can submit
counter-evidence; an admin makes the final call (AI only suggests, never
auto-resolves — there is no real fund-transfer automation in this codebase,
so "release/refund escrow" is a ledger-status change, same as affiliate
payouts today). Both parties are emailed at every stage. Disputes open >48h
are flagged as overdue in the Admin Panel.

### 2026-07-01 — Added: repo-derived "single source of truth" tooling
`scripts/generate-project-status.mjs` generates `PROJECT_STATUS.md` from the
actual repo (skills registry, route map, migrations, env vars, git log) —
replacing a hand-maintained `.claude/scripts/daily-briefing.sh` that had gone
stale and was repeating the same claims every session regardless of what was
actually true. The generator also runs consistency checks (dead skill
endpoints, missing route components, duplicate IDs) and fails CI
(`.github/workflows/project-status.yml`) on every PR if they don't pass.

### Known stale documentation (do not treat as current)
- `README.md` describes an earlier version of this project: FastAPI + Python
  backend, Google Sheets as the database, n8n workflow automation. **None of
  that is the current stack.** The real stack (verified from `backend/package.json`
  and the actual source files) is: Express (ES modules) on Vercel serverless,
  Supabase Postgres (accessed via REST, not an ORM), React + Vite frontend,
  Omise for payments. `README.md` needs a rewrite; until then, trust
  `PROJECT_STATUS.md` over it for anything about the current architecture.


## Consistency checks (✅ all passing)
- ✅ **Skill endpoints resolve to real routes** — all 35 skill endpoints found in backend source
- ✅ **Route components exist on disk** — all 84 route components resolved
- ✅ **No duplicate skill IDs** — all skill IDs unique
- ✅ **No duplicate route paths** — all route paths unique
- ℹ️ **8 numbered migration file(s) present** — 001_pgvector.sql, 001_users_auth.sql, 002_subscriptions_payments.sql, 003_ai_usage_log.sql, 004_affiliate_tracking.sql, 005_user_sync.sql, 006_order_disputes.sql, 007_portal_leads.sql

## Recent commits
- 789e72c log: run 98 — FAQPage JSON-LD extended to /affiliate; schema test now covers both FAQ pages (12/12) (33 seconds ago)
- 7abd5ff chore: sync PROJECT_STATUS.md [skip ci] (46 seconds ago)
- 3c7e0f3 seo(affiliate): emit FAQPage JSON-LD on /affiliate (Google FAQ rich-result eligibility) (62 seconds ago)
- 4d4b738 chore: sync PROJECT_STATUS.md [skip ci] (55 minutes ago)
- 16faa22 log: run 97 — FAQPage JSON-LD on /pricing (verified, drift-guard test); flagship JSON-LD pricing + shop endpoint verified clean (56 minutes ago)
- 6681023 chore: sync PROJECT_STATUS.md [skip ci] (57 minutes ago)
- b688ebc seo(pricing): emit FAQPage JSON-LD on /pricing (Google FAQ rich-result eligibility) (57 minutes ago)
- 0a78af9 chore: sync PROJECT_STATUS.md [skip ci] (2 hours ago)

## Production health (✅ reachable)
```json
{
  "status": "ok",
  "version": "2.1.0",
  "charter_version": 2,
  "charter_title": "นโยบายระบบถาวร — Openthai.ai Operations Charter",
  "ai_primary": "✅ Claude Haiku",
  "ai_fallback": "✅ Gemini Flash Latest",
  "ai_active": "claude-haiku-4-5-20251001",
  "google_oauth": true,
  "affiliates": 0,
  "waitlist": 0,
  "agents": 0,
  "active_agents": 0,
  "line_oa": true,
  "elevenlabs": false,
  "watchdog": "idle",
  "last_watchdog": null,
  "system_logs": 2,
  "uptime_sec": 47,
  "memory_mb": "19.4",
  "services": {
    "news_rag": "✅ Active",
    "news_rag_refresh": "✅ Auto cache clear every 4h",
    "competitor_analysis": "✅ Active",
    "tts": "⚠️ No API Key",
    "line_oa": "✅ Active",
    "auto_heal": "✅ Active (every 30 min)",
    "agent_cron": "✅ Active (every hour)",
    "watchdog": "✅ Active",
    "diagnostics": "✅ Active",
    "persistence": "✅ system_log + agents.json + agent_checkpoint",
    "vector_memory": "✅ Active (semantic long-term memory)",
    "webhook_system": "✅ Active (0 registered)",
    "multi_tenant": "✅ Active (0 tenants)"
  }
}
```

## Skills registry (35 total, 33 active, 2 need setup)
| ID | Name | Endpoint | Status |
|---|---|---|---|
| S1 | RCCF Prompt | `POST /api/generate` | active |
| S2 | Taste Check | `POST /api/generate` | active |
| S3 | Master Prompt | `POST /api/generate` | active |
| S4 | Image Analysis | `POST /api/analyze-image` | active |
| S5 | TTS Voice | `POST /api/tts` | needs_key (needs `ELEVENLABS_API_KEY`) |
| S6 | AI Critic | `POST /api/generate` | active |
| S7 | Context Card | `POST /api/generate` | active |
| S8 | LINE OA Connect | `POST /api/line/send` | needs_key (needs `LINE_CHANNEL_TOKEN`) |
| S9 | Learning Layer | `GET /api/skills/learning/patterns` | active |
| S10 | Trend Analyzer | `POST /api/skills/trend` | active |
| S11 | Hashtag Generator | `POST /api/skills/hashtag` | active |
| S12 | SEO Thai | `POST /api/skills/seo` | active |
| S13 | Sentiment Scanner | `POST /api/skills/sentiment` | active |
| S14 | Video Script | `POST /api/skills/video-script` | active |
| S15 | Multi-Language | `POST /api/skills/translate` | active |
| S16 | Prompt Builder | `POST /api/skills/prompt-builder` | active |
| S17 | Cultural Wisdom | `POST /api/skills/cultural-wisdom` | active |
| S18 | Sales Conversion Engine | `POST /api/skills/promo-engine` | active |
| S19 | Supply Chain AI | `POST /api/skills/supply-chain` | active |
| S20 | Pricing Optimizer | `POST /api/skills/pricing` | active |
| S21 | Customer Service AI | `POST /api/skills/customer-service` | active |
| S22 | Ad Budget Planner | `POST /api/skills/ad-budget` | active |
| S23 | Break-even Planner | `POST /api/skills/break-even` | active |
| S24 | Campaign Calendar | `POST /api/skills/campaign-calendar` | active |
| S25 | Live Selling Script | `POST /api/skills/live-script` | active |
| S26 | Omni-Solver | `POST /api/skills/omni-solver` | active |
| S27 | Negotiation Coach | `POST /api/skills/negotiation` | active |
| S28 | Conflict Mediator | `POST /api/skills/mediation` | active |
| S29 | Crisis Manager | `POST /api/skills/crisis` | active |
| S30 | Persona Builder | `POST /api/skills/persona` | active |
| S31 | Product Listing Writer | `POST /api/skills/listing` | active |
| S32 | Review Responder | `POST /api/skills/review-reply` | active |
| S33 | Bundle & Upsell Designer | `POST /api/skills/bundle` | active |
| S34 | FAQ & Auto-Reply Builder | `POST /api/skills/faq` | active |
| S35 | Broadcast & Re-engagement | `POST /api/skills/broadcast` | active |

## Route map (84 routes)
| Path | Component | Access |
|---|---|---|
| /login | LoginPage | auth |
| /dashboard | DashboardPage | auth |
| /tiktok | TikTokFeedPage | auth |
| /facebook | FacebookFeedPage | auth |
| /ai-generator | AIGeneratorPage | auth |
| /ai-tools | AIToolsHub | auth |
| /agent | AgentPage | auth |
| /skills | AISkillsPage | auth |
| /skills-catalog | SkillsCatalogPage | auth |
| /starter | StarterKitPage | auth |
| /assistant | AssistantPage | auth |
| /supply-chain | SupplyChainPage | auth |
| /promo-engine | PromoEnginePage | auth |
| /daily-pr | DailyPRPage | auth |
| /ultra-promo | UltraPromoPage | auth |
| /global-pr | GlobalPRPage | auth |
| /benchmark | ContentBenchmarkPage | auth |
| /scheduler | SchedulerPage | auth |
| /analytics-pro | AnalyticsDashboardPage | auth |
| /image-prompt | ImagePromptPage | auth |
| /catalog-ai | CatalogAIPage | auth |
| /kol-brief | KOLBriefPage | auth |
| /strategy | StrategyCenterPage | auth |
| /pitch | PitchDeckPage | auth |
| /integrations | IntegrationHubPage | auth |
| / | LandingPage | public |
| /pricing | PricingPage | public |
| /join | ProducerJoinPage | public |
| /producers | ProducerJoinPage | public |
| /producers/manage | ProducerManagePage | public |
| /catalog | CatalogPage | public |
| /shop | CatalogPage | public |
| /find-producers | ProducerDirectoryPage | public |
| /find | ProducerDirectoryPage | public |
| /track | TrackOrderPage | public |
| /dispute | DisputeTrackPage | public |
| /store | StorePage | public |
| /admin | AdminPage | public |
| /affiliate | AffiliatePage | public |
| /affiliate/dashboard | AffiliateDashboard | public |
| /privacy | PrivacyPage | public |
| /about | AboutPage | public |
| /terms | TermsPage | public |
| /contact | ContactPage | public |
| /trending | TrendingPage | public |
| /calendar | ContentCalendarPage | public |
| /brand | BrandMemoryPage | public |
| /voice | VoiceCommandPage | public |
| /video | VideoGeneratorPage | auth |
| /payment | PaymentPage | public |
| /pay | QuickPayPage | public |
| /quickpay | QuickPayPage | public |
| /earn | EarnHubPage | public |
| /income | EarnHubPage | public |
| /affiliate-programs | AffiliateProgramsPage | public |
| /programs | AffiliateProgramsPage | public |
| /content-studio | ContentStudioPage | public |
| /captions | ContentStudioPage | public |
| /council | CouncilPage | public |
| /openthaiai | CouncilPage | public |
| /leaderboard | LeaderboardPage | public |
| /router | RouterStatusPage | public |
| /corporate | CorporateDashboard | auth |
| /corporate/board | BoardPage | auth |
| /corporate/ir | InvestorRelationsPage | auth |
| /corporate/compliance | CompliancePage | auth |
| /corporate/esg | ESGPage | auth |
| /corporate/hr | HRPage | auth |
| /corporate/finance | FinancePage | auth |
| /corporate/global | GlobalOpsPage | auth |
| /corporate/pr | PRCommsPage | auth |
| /corporate/command | CommandCenterPage | auth |
| /progress | ProgressDashboard | public |
| /portals | PortalHubPage | public |
| /portals/producer | ProducerPortalPage | public |
| /portals/affiliate | AffiliatePortalPage | public |
| /portals/creator | CreatorPortalPage | public |
| /portals/consumer | ConsumerPortalPage | public |
| /portals/middleman | MiddlemanPortalPage | public |
| /portals/gov-thai | GovThaiPortalPage | public |
| /portals/gov-intl | GovIntlPortalPage | public |
| /portals/intl-org | IntlOrgPortalPage | public |
| /portals/foundation | FoundationPortalPage | public |
| * | NotFoundPage | public |

## Backend modules (backend/*.js — 24 files)
| File | Lines | Purpose (from header comment) |
|---|---|---|
| `agent-tools.js` | 92 | Agent Tools — Thai Function Calling schema, wired to real backend functions |
| `auth.js` | 190 | JWT |
| `corporate-system.js` | 196 | Global Standard: SET/MAI · SEC Thailand · IFRS · ESG · Governance |
| `credits.js` | 202 | Credit ledger — เครดิตจริงจากรางวัล (spin / streak) ใช้ generate เกินโควต้าฟรีได้ |
| `disputes.js` | 279 | Order Disputes — เปิดข้อพิพาท + AI-assist arbitration + ปล่อย/คืนเงินประกัน (escrow) |
| `integrations.js` | 249 | ══════════════════════════════════════════════════════════════════════════════ |
| `inventory.js` | 163 | Inventory — คลังสินค้า first-party ครบทุกมิติ (สินค้า + บัญชีเคลื่อนไหวสต๊อก) |
| `mcp-handler.js` | 249 | Implements Model Context Protocol (MCP) so Claude and other AI agents |
| `omise-payment.js` | 180 | PromptPay QR · Credit Card · Subscription Billing |
| `openapi.js` | 702 | Auto-served at GET /api/openapi.json | Interactive docs at GET /api-docs |
| `orders.js` | 184 | Orders — สั่งซื้อ + ติดตามสถานะจัดส่ง (สต๊อก→แพ็ค→ส่ง→ถึงปลายทาง→เซ็นรับ) |
| `portal-leads.js` | 148 | Portal Leads — captures submissions from the /portals/* landing pages |
| `pr-communications.js` | 166 | Press Room · Media Center · Crisis Comms · KOL · Newsletter · Global Campaigns |
| `preflight.js` | 230 | ═══════════════════════════════════════════════════════════════════════════════ |
| `producers.js` | 276 | Producer / Supplier onboarding — รับสมัครผู้ผลิตมาสังกัดแพลตฟอร์ม |
| `progress-tracker.js` | 327 | 360° Progress Tracker — OpenThai.ai |
| `sdk-gen.js` | 201 | Openthai.ai — SDK Generator (Stainless-style) |
| `server.js` | 8541 | Vercel serverless detection |
| `tenant-manager.js` | 254 | Each tenant (store/business) gets: |
| `vector-memory-supabase.js` | 194 | Drop-in replacement สำหรับ vector-memory.js เมื่อ Supabase พร้อม |
| `vector-memory.js` | 212 | Long-term semantic memory for AI agents. |
| `video-generator.js` | 204 | รองรับ: RunwayML Gen-3 · Pika Labs · Kling AI · Luma Dream Machine · Mock (script-only) |
| `voice-commander.js` | 259 | รับ transcript จาก Web Speech API → AI แปล intent → รัน command → คืน speak_text |
| `webhook-system.js` | 223 | Push events to registered subscriber endpoints instead of polling. |

## Admin panel tabs (frontend/src/i18n/admin.js)
- 📊 ภาพรวม
- 📈 วิเคราะห์
- 💰 ยอดขาย
- 🎁 เครดิต
- 🏭 ผู้ผลิต
- 📨 เชิญผู้ผลิต
- 📦 ออเดอร์
- ⚠️ ข้อพิพาท
- 🧑‍⚖️ ตรวจสอบคุณภาพ
- 🎯 ลูกค้า
- 📦 คลังสินค้า
- 👥 ผู้ใช้
- 🤝 Affiliates
- ⚡ คอนเทนต์
- 💸 ต้นทุน/คุณภาพ
- ⚙️ ตั้งค่า

## Scheduled jobs (vercel.json crons)
- `0 6 * * *` → /api/system/watchdog
- `0 4 * * *` → /api/system/news-rag-clear
- `0 12 * * *` → /api/autopost/process
- `30 16 * * *` → /api/progress/daily-report
- `0 9 * * *` → /api/scheduler/process
- `0 2 * * 1` → /api/portals/consumer-digest

## Environment variables (58 referenced in backend code, 59 documented in .env.example)
✅ every env var referenced in backend code is documented in `.env.example`

## Migration files present (backend/migrations/)
Presence here means the SQL exists in the repo — it does **not** mean it has been run against the live Supabase project. Verify in the Supabase SQL Editor.
- 000-all-in-one.sql
- 001-shipping-stock.sql
- 001_pgvector.sql
- 001_users_auth.sql
- 002-inventory.sql
- 002_subscriptions_payments.sql
- 003-movement-platform.sql
- 003_ai_usage_log.sql
- 004_affiliate_tracking.sql
- 005_user_sync.sql
- 006_order_disputes.sql
- 007_portal_leads.sql
- FULL-MIGRATION.sql
- credits-schema.sql
- orders-schema.sql
- producers-schema.sql

