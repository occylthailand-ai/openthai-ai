# OpenThaiAi — Decisions Log

Append-only record of real architecture decisions **and rejected proposals**,
so Claude / Gemini / Grok (and any human) can check a claim about this
project's direction against what was actually decided, instead of trusting
whichever assistant last generated a confident-sounding paragraph.

Add a new dated entry at the top when a real decision is made or a scope-creep
proposal is rejected. Do not delete old entries — a wrong idea that was already
rejected once is worth remembering so it doesn't get silently re-proposed.

## 2026-08-09 — i18n(affiliate funnel): localize the affiliate welcome email (was Thai-only for en/zh creators)

Standing-order loop (consent signup funnel + market entry). Continuing the email-side audit from the
producer-approval fix: the **affiliate welcome email** (`sendAffiliateWelcome` → `affiliateWelcomeHtml`)
was **Thai-only** — hardcoded Thai subject ("🎉 ยินดีต้อนรับสู่ Openthai.ai Affiliate Program!") and a
fully Thai body (ยินดีด้วย, คุณเป็น Affiliate…, REF CODE ของคุณ, Affiliate Link ของคุณ, Commission เริ่มต้น,
ทุกจันทร์/จ่ายเงิน, สูงสุด Elite, เปิด Dashboard ของฉัน). It's sent the moment someone joins from
/affiliate, so a creator who applied in English/Chinese got a fully Thai welcome — affiliate is in the
standing order's funnel scope.

Same end-to-end gap as the producer email: /affiliate never sent `lang`, `registerAffiliateCore` never
took/stored it, and the builder/subject had no language branch. Fixed the whole chain:
- `frontend/src/pages/AffiliatePage.jsx` — the apply POST now sends `lang` (from useLang).
- `backend/server.js` — `registerAffiliateCore` destructures `lang` → `safeLang` (whitelist th/en/zh,
  default th), stores it on the affiliate record, and passes it to `sendAffiliateWelcome(...)`, which
  localizes the subject via `affiliateWelcomeSubject(lang)`. The portal-lead→affiliate auto-register
  path also forwards `lead.lang`.
- `backend/html-escape.js` — `affiliateWelcomeHtml({…, lang})` + new `affiliateWelcomeSubject(lang)`
  built from an `AFFILIATE_WELCOME_COPY` map (th/en/zh; unknown → th). The applicant-name escaping is
  unchanged (still escaped before interpolation).

**Verified by running (standing-order #4) + mutation-tested earlier for the sibling builder:**
- `test-html-escape.mjs` 50 → **57**: en welcome uses English copy with **no** Thai codepoints; en/zh
  subjects are English/Chinese; th unchanged; unknown/missing → th.
- **End-to-end** (booted server, file mode): POST /api/affiliate/apply with `lang:'en'` persists
  `record.lang === 'en'`; a no-lang apply persists `'th'` — proving the frontend→register→store→email
  wiring. The full affiliate-flow E2E (`test-affiliate-flow.mjs`, the sales/commission/tier path) still
  passes **28/0** against a booted server. (`npm run test:affiliate` standalone shows ECONNREFUSED
  because that E2E needs a live server on :8000 — CI boots one on :8897; not a code failure.)
- Full frontend suite **491/491**, `npm run build` ok; server boots & `/api/health` → 200;
  `node --check` clean on the edited backend files.

---


## 2026-08-09 — i18n(producer funnel): localize the producer-approval email (was Thai-only for en/zh producers)

Standing-order loop (consent signup funnel + market entry). Auditing the funnel's EMAIL side (which no
render-probe reaches) found a real gap: the /portals/* welcome emails localize by lead.lang, and the
producer "application received" email does too — but the producer **approval** email
(`sendProducerApproval` → `producerApprovalHtml`) was **Thai-only**: hardcoded Thai subject + body, no
lang parameter. A producer who applied via /join in English or Chinese and later got approved received
a fully Thai email — on the producer funnel the standing order prioritizes.

Root cause was end-to-end: /join never sent `lang`; `register()` never stored it on the producer
record; and the approval builder/subject had no language branch. Fixed the whole chain:
- `frontend/src/pages/ProducerJoinPage.jsx` — the apply POST now sends `lang` (from useLang). This also
  makes the existing "application received" email use the applicant's language (it read
  `req.body?.lang`, which was undefined → th, before).
- `backend/producers.js` — `register()` stores `lang` on the record (whitelist th/en/zh, default th),
  so it's available weeks later when an admin approves.
- `backend/server.js` — the approve route passes `prev.lang` to `sendProducerApproval(...)`, which now
  localizes the subject via `producerApprovalSubject(lang)`.
- `backend/html-escape.js` — `producerApprovalHtml({…, lang})` + new `producerApprovalSubject(lang)`
  built from a `PRODUCER_APPROVAL_COPY` map (th/en/zh); unknown → th. HTML-escaping of the
  company/product name is unchanged.

**Verified by running (standing-order #4) + mutation-tested:**
- `test-html-escape.mjs` 44 → **50**: en email uses English copy with **no** Thai codepoints; en/zh
  subjects are English/Chinese; th unchanged; unknown/missing lang → th. **Mutation:** forcing the
  builder to ignore `lang` (always th) turns **3** red; restored.
- `test-producers.mjs` 32 → **35**: `register()` stores lang (default th; en kept; unknown → th).
- Full frontend suite **491/491**, `npm run build` ok; server boots and `/api/health` → 200;
  `node --check` clean on all three edited backend files.

---


## 2026-08-09 — i18n(funnel): localize the homepage skills CTA + the /catalog category chips/tags (+ strengthen the landing guard)

Standing-order loop (market entry). Cleared the two behind-interaction leaks flagged as follow-up last
round, plus a third the fix surfaced:
1. **LandingPage** — the AI-skills section CTA was hardcoded `ดูทักษะทั้งหมด →`. It renders only after
   /api/skills resolves, and the landing Thai-leak guard read `textContent` synchronously (before that
   async load), so it never saw the button — the leak shipped past a green guard.
2. **CatalogPage** — the product-card category was `{p.category || 'สินค้าไทย'}` (raw Thai value +
   Thai fallback), AND the category filter chips rendered the raw value `{c}`. Both show the Thai
   PORTAL_CATEGORIES identifier to every visitor.

**Change (frontend; values unchanged, display localized):**
- `LandingPage.jsx` — CTA → `{t('home.skills.viewAll')} →`; added `home.skills.viewAll` (th/en/zh).
- `CatalogPage.jsx` — imports `producerCategoryLabel`, destructures `lang`; the card tag →
  `p.category ? producerCategoryLabel(p.category, lang) : t('mk.find.thaiProduct')` and the filter
  chips → `producerCategoryLabel(c, lang)`. The stored/filter value stays the Thai identifier.
- Strengthened `landingNoThaiLeak.test.jsx`: it now `await`s the /api/skills fetch (stub includes a
  skills list) before scanning, so the whole AI-skills section — including the CTA — is covered.

**Verified by running (standing-order #4) + mutation-tested:**
- Landing guard **2/2** (now with waitFor). **Mutation:** reverting the CTA to hardcoded Thai turns
  **both** red — proving the strengthened guard reaches the async section (the old sync guard would
  have stayed green). Restored.
- `catalogOrderA11y.test.jsx` 2 → **3**: a new en test asserts the card + chip show "Herbs"
  (getAllByText) with no raw "สมุนไพร". (This test is what surfaced the filter-chip leak.)
- Full frontend suite **491/491** (was 490, +1), `npm run build` ok. Frontend-only.

---


## 2026-08-09 — i18n/a11y(funnel): fix behind-interaction leaks — the modal close button rendered "mk.close", + Thai network errors

Standing-order loop (consent funnel / accessible platform). Systematic scan of the localized funnel
pages for hardcoded Thai *literals* in JSX (the render-probe can't see strings behind a click/error).
Two real defects surfaced:

1. **Broken close-button accessible name (a11y, current bug).** The checkout close buttons on /catalog
   and /store used `aria-label={t('mk.close') || 'ปิด'}` — but `mk.close` was **never defined**, so
   `t()` returned the raw key string and the modal's × button announced literally "mk.close" to screen
   readers (WCAG 4.1.2). (The `|| 'ปิด'` Thai fallback was dead code — t() never returns falsy.)
2. **Hardcoded Thai network errors.** The catch-block error on /catalog, /store and /join was
   `setErr('เชื่อมต่อไม่ได้ …')` — an en/zh user who lost connection mid-submit saw a Thai error.

**Change (frontend):**
- `src/i18n/index.jsx` — added `mk.close` (ปิด / Close / 关闭) and `mk.err.network`
  (เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง / Connection failed. Please try again. / 连接失败，请重试。) in all 3 languages.
- `CatalogPage.jsx` / `StorePage.jsx` — close button now `aria-label={t('mk.close')}` (dead Thai
  fallback dropped); the network catch-block error → `t('mk.err.network')`.
- `ProducerJoinPage.jsx` — network catch-block error → `t('mk.err.network')`.

**Verified by running (standing-order #4) + mutation-tested:**
- `storeOrderA11y.test.jsx` 3 → **4**: the en checkout test now also asserts the close button's
  accessible name is "Close" (not the raw key "mk.close", not Thai "ปิด"); a new test rejects the
  checkout fetch and asserts the localized "Connection failed…" error shows with no Thai
  "เชื่อมต่อไม่ได้". **Mutation:** deleting the `mk.close` en key makes the close-button assertion
  **red** (the raw key returns); restored. Full frontend suite **490/490** (was 489, +1),
  `npm run build` ok. Frontend-only, no behaviour change beyond the strings.

**Follow-up noted (not done — keeping this round tight):** a few more behind-interaction Thai literals
remain — LandingPage's "ดูทักษะทั้งหมด" skills CTA (renders only when live skills load) and the
/catalog product-card category fallback `{p.category || 'สินค้าไทย'}`. Small, same class; next round.

---


## 2026-08-09 — i18n(store): the checkout card payment option was hardcoded Thai for non-Thai buyers

Standing-order loop (consent funnel / market entry). Auditing the commerce checkout controls (a11y
pass) surfaced a Thai leak the earlier render-probe missed: StorePage's payment-method `<select>` had
its card option hardcoded as `💳 บัตรเครดิต/เดบิต`. The checkout form only renders after a product is
picked, so the page-level Thai-leak probe (which renders with no product selected) never reached it —
an English/Chinese buyer saw a Thai payment option **at the money step** of the first-party store.

**Change (frontend):**
- `StorePage.jsx` — the card `<option>` now renders `💳 {t('mk.store.method.card')}` (PromptPay stays
  as-is, a proper noun).
- `src/i18n/index.jsx` — new `mk.store.method.card` in th/en/zh (บัตรเครดิต/เดบิต · Credit/Debit card
  · 信用卡/借记卡), beside the existing `mk.store.method` label.

**Verified by running (standing-order #4) + mutation-tested:**
- Extended `storeOrderA11y.test.jsx` 2 → **3**: a new test forces lang=en, opens the buy modal, and
  asserts the card option resolves as "Credit/Debit card" (getByRole option) with no Thai `บัตรเครดิต`
  text. **Mutation:** reverting the option to the Thai literal turns it **red**; restored. Full
  frontend suite **489/489** (was 488, +1), `npm run build` ok. Frontend-only, checkout behaviour
  unchanged (the option value stays "card").

Aside (verified, no change needed): the rest of the commerce checkout is already accessible + localized
— /catalog and /store order forms each associate every input with a <label htmlFor>, /catalog search
carries an aria-label, and both order flows use t() everywhere else.

---


## 2026-08-09 — a11y(find-producers): give the search box + category filter accessible names

Standing-order loop (accessible platform — CLAUDE.md standing priority). Audited form-control
accessibility across the funnel after the i18n sweep. The producer signup form (/join) is correctly
associated (its Field wrapper injects the id via React.cloneElement, matching the label htmlFor), and
the /track + /dispute lookups already use htmlFor/id pairs. But **/find-producers**
(ProducerDirectoryPage) had two filter controls with NO accessible name: the free-text search box
carried only a placeholder (not an accessible name — it disappears on input and isn't reliably
announced by screen readers), and the category `<select>` had nothing at all. A screen-reader user
tabbing in heard "edit text" / "combo box" with no idea what either did — WCAG 4.1.2 (Name, Role,
Value), on a public funnel page.

**Change (frontend, a11y only — no visual/behaviour change):**
- `ProducerDirectoryPage.jsx` — added `aria-label` to the search `<input>` and the category
  `<select>`.
- `src/i18n/index.jsx` — new `mk.find.search.label` / `mk.find.cat.label` in th/en/zh (the label
  follows the page language, like the rest of the page).

**Verified by running (standing-order #4) + mutation-tested:**
- New guard `src/__tests__/producerDirectoryA11y.test.jsx` **2/2** — renders the page and resolves
  both controls by their accessible name (getByLabelText for "Search producers or products" → INPUT,
  "Filter by category" → SELECT). **Mutation:** removing the search aria-label makes getByLabelText
  fail (**1 red**); restored. Full frontend suite **488/488** (was 486, +2), `npm run build` ok.
  Frontend-only.

---


## 2026-08-09 — i18n(about): localize /about + finding: 6 more public content pages are still Thai-only

Standing-order loop (market entry). Extended the render-probe sweep to the sitemap-listed public
content pages (rendered under LanguageProvider forced to en/zh, Thai codepoints U+0E00–U+0E7F flagged).
Result: **/about, /ai-skills, /contact, /earn, /faq, /seasonal, /showcase all still render in Thai for
an en/zh visitor** — they have little or no i18n, while the homepage + producer funnel + portals are
now localized. A visitor who switches to English/Chinese on the homepage (persisted in `otai_lang`,
read by useLang across the SPA) keeps that language, so these pages are a real market-entry gap.

Fixed the smallest, highest-trust one this round — **/about** (AboutPage), a 62-line self-contained
page with no i18n and only 4 Thai strings (the tech-skills chips were already English):
- `AboutPage.jsx` — now uses `useLang()`/`t()`: back button, header title (reuses the existing
  `footer.link.about` key), hero title, hero subtitle, and `document.title` all follow the language.
- `src/i18n/index.jsx` — added `about.back`, `about.hero.title`, `about.hero.sub` in th/en/zh.

**Verified by running (standing-order #4) + mutation-tested:**
- New guard `src/__tests__/aboutNoThaiLeak.test.jsx` **2/2** — renders /about forced to en/zh, asserts
  no Thai run. **Mutation:** reverting the hero subtitle to its hardcoded Thai turns **both** red;
  restored. Full frontend suite **486/486** (was 484, +2), `npm run build` ok. Frontend-only.

**Flag to owner (standing-order #8 — larger scope than one task):** the other six content pages above
are still Thai-only. /faq, /showcase, /earn each carry a lot of copy (34–59 Thai fragments), so making
them trilingual is a multi-round effort and a content decision (do we want full en/zh content on the
marketing/FAQ pages, or is Thai-only intended there while only the funnel + homepage are trilingual?).
Not proceeding on those without a steer. I can localize them one page per round if you'd like — say
the priority order (my suggestion: /faq → /contact → /seasonal → /ai-skills → /earn → /showcase).

---


## 2026-08-09 — i18n(producer funnel): localize the product-category picker/tags (en/zh saw raw Thai)

Standing-order loop (consent signup funnel + market entry for non-Thai). Render-probed the public
funnel pages that use the global i18n and found the **producer funnel** leaking raw Thai to en/zh
visitors — the exact signup surface the order prioritizes:
- `/join` (ProducerJoinPage, producer signup): the listing-category `<select>` showed the 12 category
  values raw — อาหาร, ความงาม, สิ่งทอ, … — so a non-Thai producer picked their category from a
  Thai-only dropdown.
- `/find-producers` (ProducerDirectoryPage): the category filter dropdown AND every producer card's
  category tag (`{p.category || 'สินค้าไทย'}`) showed the raw Thai value.

The category values are the **canonical identifiers** the backend whitelist clamps to and the consumer
digest matches on (`p.category === category`), so they can't be translated in the data — the fix
localizes only the DISPLAY.

**Change (frontend):**
- `src/data/portalCategories.js` — added `CATEGORY_LABELS` (th/en/zh for all 12 values; OTOP kept as a
  proper noun) + `producerCategoryLabel(value, lang)` (falls back to the raw value for an unknown
  category, never blank) beside the existing single-source-of-truth `PORTAL_CATEGORIES`.
- `ProducerJoinPage.jsx` / `ProducerDirectoryPage.jsx` — `<option>`s and the card tag now display
  `producerCategoryLabel(value, lang)` while `value=` stays the Thai identifier; both pages now import
  the canonical `PORTAL_CATEGORIES` as their API-failure fallback instead of re-declaring the list
  (removes two drifting copies). Directory now destructures `lang`; the empty-category card fallback
  'สินค้าไทย' became a localized `mk.find.thaiProduct` (th สินค้าไทย / en Thai product / zh 泰国商品).

**Verified by running (standing-order #4) + mutation-tested:**
- New render guard `src/__tests__/producerFunnelNoThaiLeak.test.jsx` **4/4** — renders both pages under
  LanguageProvider forced to en/zh (with a stubbed producer whose category is 'สมุนไพร', so the card
  tag is exercised) and asserts no Thai run (U+0E00–U+0E7F) except the language-switcher 'ไทย'.
  **Mutation:** reverting the /join `<option>` to render the raw value turns **2** tests red; restored.
- `portalCategories.test.js` 3 → **6**: every PORTAL_CATEGORIES value must have a non-empty th/en/zh
  label (so a new category can't ship label-less and re-leak), no stray label keys, and the en/zh
  label must not equal the raw Thai value.
- Full frontend suite **484/484** (was 478, +6), `npm run build` ok. No backend change — category
  values, storage, and digest matching are unchanged.

---


## 2026-08-09 — test(pdpa): guard access↔erasure store parity (a new signup can't silently escape erasure)

Standing-order loop (consent/PDPA — the legal foundation of the /portals/* funnel). Scanned the two
data-subject-rights endpoints in `backend/server.js`: the right-of-access export
(`/api/privacy/access/confirm`) and right-to-erasure (`/api/privacy/erasure/confirm` → `performErasure()`).
They were consistent today — access exposes 11 stores; erasure deletes the 7 personal-data ones
(waitlist, consents, producers, portal_leads, affiliates, tenants, cloud_sync) and intentionally
retains the 4 financial ones (withdrawals, orders, payments, entitlements) under PDPA's legal-retention
exception. Verified this parity before assuming any bug (CLAUDE.md "verify before build") — no defect.

But that parity is hand-maintained across ~40 lines of two separate handlers. The silent, one-directional
risk: a future signup/store wired into the access export but **not** into `performErasure()` lets an
"erased" data subject still download their record — the system reports deletion while the data persists.
The existing `test-pdpa-tenant-erasure.mjs` boots the server and checks tenants + cloud_sync end-to-end,
but nothing pinned the *general* invariant across all stores.

**Change (test-only; no runtime change):**
- `backend/scripts/test-privacy-parity.mjs` (new) — source-parses server.js and asserts: (1) every
  `records.<key>` the access export populates is classified as `erased` or `retained`, so a NEW store
  added to access fails the build until its erasure treatment is decided; (2) each `erased` store has
  its deletion evidence present in `performErasure()`; (3) the `retained` set is EXACTLY the four
  financial records — nothing can be quietly parked there to dodge erasure. Slicing throws loudly if
  the handler anchors drift (a silently-empty slice would make the checks vacuously pass).
- Wired into `backend/package.json` (`test:privacy-parity`) and `.github/workflows/test.yml` beside the
  existing PDPA test.

**Verified by running (standing-order #4) + mutation-tested:** **31/31**. Mutation A — adding an
unclassified `records.newsletter_signups` to the access export turns it **red** (unclassified store);
Mutation B — removing the `producers.eraseByEmail` call from `performErasure()` turns it **red** (missing
erasure evidence). Both restored → 31/31, `git diff` on server.js clean. package.json valid JSON,
test.yml valid YAML. Pure source-parsing — no server boot, complements the end-to-end tenant test.

---


## 2026-08-09 — fix(seo): og:locale on the prerendered international portals said th_TH for English pages

Standing-order loop (market-entry / SEO). Continuing the international-portal thread from the
consent-funnel error-localization fix. The base `frontend/index.html` hardcodes
`<meta property="og:locale" content="th_TH" />`, and the per-route prerender transform
(`frontend/scripts/route-meta.mjs` `applyRouteMeta`) already rewrites `<html lang>` per route —
serving gov-intl / intl-org as `<html lang="en">` because they render English on first load — but it
**never touched og:locale**. So the two English international portals (gov-intl targets foreign
governments, intl-org targets UN/ASEAN/World Bank) were prerendered with an English title/description
and `<html lang="en">` yet still advertised `og:locale=th_TH` to Facebook/LINE crawlers — the exact
wrong-language signal the `<html lang>` swap exists to prevent, just for the social crawler instead of
the DOM.

**Change (build-script only, no runtime/UI change):**
- `frontend/scripts/route-meta.mjs` — `applyRouteMeta` now also rewrites `og:locale` from the page's
  language via a small `OG_LOCALE` map (th→th_TH, en→en_US, zh→zh_CN), falling back to th_TH for an
  unknown language. Uses the same `replaceOrThrow` helper as the other tags, so a base-template format
  drift fails the build loudly instead of silently re-serving th_TH.

**Verified by running (standing-order #4):**
- `routeMeta.test.js` **15/15** (was 13): a Thai route keeps `th_TH`; an en route emits `en_US` and no
  longer contains `th_TH`; and removing the og:locale line from the base makes the transform throw
  (fail-loud, matching the existing canonical/og:url/description drift guards).
- **Real build output** (`npm run build`, not assumed): `dist/portals/intl-org/index.html` and
  `dist/portals/gov-intl/index.html` now carry `og:locale=en_US` (+ `<html lang="en">`), while
  `dist/portals/producer/index.html` and the homepage root keep `og:locale=th_TH`.
- Full frontend suite **478/478** (was 476). Frontend-only, two files (transform + its test).

---


## 2026-08-09 — fix(portals): localize consent-funnel error messages (int'l applicants saw Thai errors)

Standing-order loop (consent-based signup funnel + market entry for non-Thai). Found by scanning the
/portals/* funnel: the backend `/api/leads/submit` (`backend/portal-leads.js`) returns **Thai-only**
error strings — consent missing ("ต้องยินยอมตามนโยบายความเป็นส่วนตัว…"), name/email missing
("กรอกข้อมูล…"), and the 429 rate limiter ("ส่งฟอร์มบ่อยเกินไป…"). The shared client helper
`leadError()` (`frontend/src/pages/portals/submitLead.js`) returned that raw `error` string **first**,
only falling back to a localized generic when it was absent. So an English/Chinese applicant on the
**international** portals — intl-org and gov-intl default to en/zh, and target UN/ASEAN/World Bank/etc.
— who tripped the rate limiter (10 submits / 15 min, easily reached) saw a **Thai** error on the signup
form. A market-entry defect on the exact consent funnel the standing order prioritizes, and on the
pages aimed at non-Thai institutions.

**Change:**
- `backend/portal-leads.js` — every error path now carries a stable machine `code` alongside the Thai
  string: `consent_required`, `missing_contact`, `rate_limited` (limiter message), `server_error`
  (route 500). The route forwards `code` in the JSON body.
- `frontend/src/pages/portals/submitLead.js` — `submitLead` captures `code`; `leadError(result, lang)`
  now localizes **by code** into th/en/zh and falls back to the localized generic for any unknown/absent
  code. It deliberately **never** surfaces the raw server string again, so no future backend message can
  leak untranslated Thai to a non-Thai visitor. All 9 portal pages already route through this one helper,
  so the fix reaches every portal (producer, consumer, creator, affiliate, middleman, foundation,
  gov-thai, gov-intl, intl-org) with no per-page change.

**Verified by running (standing-order #4):**
- Backend `test-portal-leads.mjs` **22/22** (was 20; +code assertions for consent_required & missing_contact).
- End-to-end HTTP (throwaway script, express app + real router): POST returns the code over the wire for
  400 consent_required, 400 missing_contact, 200 success, and — the real scenario — **429 rate_limited**. 4/4.
- Frontend `submitLead.test.js` **9/9** (was 8): new tests assert a known code is localized per lang, and
  that an en/zh applicant is NEVER shown raw Thai (checked against the U+0E00–U+0E7F range) even for an
  unknown/future code. **Mutation:** reverting `leadError` to "prefer raw backend error" turns **2** tests
  red; restored. Full frontend suite **476/476** (was 475), `npm run build` ok.

---


### 2026-08-06 — Hourly loop: guard every in-app navigation target against pointing at a non-existent route

The app is a client-rendered SPA, so an internal `navigate('/x')` / `<Link to="/x">` / `<NavLink to="/x">` whose path has **no** `<Route>` in App.jsx silently dumps the user on `NotFoundPage` — a dead CTA with no error anywhere. Routes and nav targets live in different files across dozens of pages, so a typo or a renamed route is easy to ship. I scanned the whole SPA first (all **39** distinct internal nav targets across pages + components) and every one resolves today — but nothing stopped a future dead nav.

**Change (test-only; no runtime change):**
- `frontend/src/__tests__/spaNavTargets.test.js` (new) — reads the real route table from `App.jsx` (`<Route path="…">`, incl. dynamic `:param` roots and `/*` wildcard prefixes) and every `navigate(...)`/`Link to`/`NavLink to` target across `src/` (excluding `__tests__`), then asserts each target resolves to a real route. Reduces a raw target to its path first (drops a `${…}` interpolation, `?query`, `#hash`, trailing `/`), so template-literal links like `/pay?amount=${a}` and `/affiliate-programs${q}` are checked by their true path. Pure source-parsing — no rendering, no route imports.

**Verified (run, not assumed) + mutation-tested:** **40/40** (39 targets + a sanity check). **Mutation:** adding `navigate('/totally-not-a-route')` to a page turns it **red** with a message naming the file and that "a click lands on NotFoundPage"; restored to 40/40. Full frontend suite **458/458** (47 files, +40). No backend change; Vitest auto-discovers the file.

### 2026-08-06 — Hourly loop: make the affiliate ref-capture testable + guard it (attribution linchpin)

Every affiliate share link is `…/?ref=<CODE>`, and the whole attribution chain depends on one line in `main.jsx` persisting that ref into `localStorage['otai_ref']` on page load — StorePage reads it at checkout, QuickPay/shop forward it, the backend credits the sale. That line was **inline in the bootstrap** (`try { const r = new URLSearchParams(...).get('ref'); if (r) localStorage.setItem('otai_ref', r.slice(0,20)); } catch {}`), so it was **un-importable and untested**: a refactor breaking it (wrong key, wrong param, or overwriting `otai_ref` on a ref-less load) would silently kill **all** affiliate attribution with nothing to catch it. (`utils.test.js` tests `buildRefLink` — the link-building side — but nothing tested the capture side.)

**Change (frontend; behaviour-identical extraction):**
- `src/lib/affiliateRef.js` (new) — pure, injectable `captureAffiliateRef(search, storage)`: reads `?ref=`, writes `otai_ref` (capped 20 chars) only when a ref is present (a ref-less load never wipes an earlier ref — last non-empty wins), swallows storage errors, returns the captured value. Byte-for-byte the old main.jsx behaviour.
- `src/main.jsx` — replaced the inline block with `captureAffiliateRef(window.location.search, window.localStorage)`.

**Verified (run, not assumed) + mutation-tested:** new `src/__tests__/affiliateRef.test.js` **7/7** — captures a ref; a ref-less load does NOT wipe a stored ref; a new ref overwrites (last-click); caps at 20; empty `?ref=` is a no-op; missing/undefined query never throws; a throwing storage is swallowed (returns null). **Mutations:** removing the "only write when ref present" guard turns **3** tests red (ref-less wipe, empty-ref, missing-query); dropping the 20-char cap turns **1** red. Restored to 7/7. Full frontend suite **418/418** (46 files, +7), `npm run build` ok. No backend change.

### 2026-08-06 — Hourly loop: guard the customer-facing status labels against backend↔i18n drift (no raw keys on the track pages)

The order-tracking (`/track` → `TrackOrderPage`) and dispute-tracking (`/dispute` → `DisputeTrackPage`) pages render a status/decision via `t('mk.track.st.'+status)` / `t('mk.dispute.st.'+status)` / `t('mk.dispute.dec.'+decision)` / `t('mk.dispute.openedby.'+role)`. i18n's `read()` **returns the raw key** when a translation is missing (`src/i18n/index.jsx`: `return key in translations.th ? … : key`), so a backend status with no label would show a customer a literal `mk.track.st.<status>` — on a money-sensitive page. The status lists are the **backend's** source of truth (`orders.js` `ORDER_STATUS`, `disputes.js` `DISPUTE_STATUS`/`DECISIONS`), the labels live in the **frontend** i18n — different files, easy to drift when a new status ships. All are currently covered (verified), but nothing stopped a future status/decision from shipping label-less.

**Change (test-only; no runtime change):**
- `frontend/src/__tests__/statusLabelCoverage.test.js` (new) — reads the backend `ORDER_STATUS` / `DISPUTE_STATUS` / `DECISIONS` arrays from source and asserts every value (plus the two `opened_by` roles) has its `mk.*` i18n key present in **all** languages (count == `LANGS.length`). Pure source-parsing — no heavy-module imports; same single-source discipline as `faqContent` / `portalCategories` tests.

**Verified (run, not assumed) + mutation-tested:** **18/18** (7 order + 5 dispute + 3 decision + 2 opener + 1 sanity). **Mutation A:** adding a backend `ORDER_STATUS` (`'awaiting_pickup'`) with no label turns it **red** (0/3 language blocks). **Mutation B:** deleting one i18n label (`th mk.track.st.packed`) turns it **red** (2/3). Both restored to 18/18. Full frontend suite **411/411** (45 files), `npm run build` ok. Backend files mutated-then-restored (git clean). Vitest auto-discovers the new test file (no wiring needed).

### 2026-08-06 — Hourly loop: add a grounded pricing/cost FAQ (market-entry friction + FAQPage rich-result content)

Market-entry/SEO task. The /faq content (`faqContent.js`, the single source for the visible accordion AND the prerendered FAQPage JSON-LD) covered what/data-safety/pay/track/dispute/producer/affiliate/AI-tools — but **not cost**, the single most common pre-signup question. Before writing anything I verified the real price model (CLAUDE.md's "verify before build"): the customer-facing PricingPage (`PP_META`) and PaymentPage both use free/pro ฿299/premier ฿599/enterprise ฿1299, and the backend charge path prices from `omise-payment.js` `SUBSCRIPTION_PLANS` — which carries **the same** ฿0/299/599/1299. (Aside verified along the way: `tenant-manager.js` `PLANS` — free/starter ฿299/pro ฿799/enterprise ฿2499 — is a **separate** corporate/multi-agent product, not the consumer subscription; the shared `pro`/`enterprise` plan IDs across the two namespaces are a naming overlap, not a mispricing. No pricing bug — glad I checked instead of "fixing" it.)

**Change (frontend content only):**
- `src/data/faqContent.js` — added one Q&A ("มีค่าใช้จ่ายไหม ราคาเท่าไหร่?" / "How much does it cost?" / "收费吗？价格是多少？") in all three languages, stating the free tier + Pro ฿299 / Premier ฿599 / Enterprise ฿1,299 per month, paid via PromptPay or card (Omise), with a pointer to /pricing. Every figure is grounded in `SUBSCRIPTION_PLANS`; no invented claims, no USD (the honesty guard forbids it).

**Verified (run, not assumed):** `faqContent.test.js` **8/8** (all langs stay equal-length at 9 items, JSON-LD still matches FAQ_ITEMS.th, no forbidden terms); `npm run build` regenerates `/faq/index.html` and the new pricing question is present in the prerendered FAQPage schema (`grep` count 1 — non-JS crawlers see it). Full frontend suite **393/393**. No backend change.

### 2026-08-06 — Hourly loop: /store checkout showed "🎉 ชำระเงินสำเร็จ!" even when the charge succeeded but the item sold out (refund pending)

Found scanning the first-party store's Omise checkout UI. `/api/shop/checkout` has an oversold-race branch (server.js:721-725): if the item sells out between the pre-check and the stock deduction, the charge already succeeded, so the order is cancelled and the response is `{ paid:true, fulfilled:false, refund_pending:true, message:'ชำระเงินสำเร็จ แต่สินค้าหมดสต๊อกพอดี ทีมงานจะติดต่อคืนเงินให้โดยเร็ว' }`. But `StorePage.jsx` rendered the success screen as `res.paid ? '🎉' + t('mk.store.paid') : ...` and only showed `res.message` **when `!res.paid`** — so a customer who **paid and won't get the product** saw a plain "🎉 ชำระเงินสำเร็จ!" with **no** refund notice at all. Misleading on the revenue path, and the exact case the backend carefully handles server-side was dropped in the UI.

**Change (frontend only):**
- `StorePage.jsx` — the success screen now branches on `res.refund_pending`: icon `↩️`, title `mk.store.refund` ("ชำระเงินแล้ว แต่สินค้าหมดสต๊อกพอดี — กำลังคืนเงิน"), and the backend's `res.message` (the refund explanation) is shown in amber. Normal paid (`🎉`) and pending-QR states are unchanged.
- `src/i18n/index.jsx` — new `mk.store.refund` in th/en/zh.

**Verified (run, not assumed) + mutation-tested:** `storeOrderA11y.test.jsx` 1 → **2**: a new test mocks the checkout returning `paid:true, refund_pending:true` and asserts the success screen shows the refund title (`/กำลังคืนเงิน/`) + the refund message, and that the plain "ชำระเงินสำเร็จ!" title is **absent**. **Mutation:** reverting the title back to the plain paid/pending logic flips the test **red**; restored. Full frontend suite **393/393** (was 392); `npm run build` ok (sitemap 26). No backend change (the server already returned the correct data — only the UI dropped it).

### 2026-08-06 — Hourly loop: show the buyer the authoritative order total at checkout (close a transparency gap from the price-authority fix)

Follow-up to the earlier "record the producer's authoritative price" fix. `place()` now records the producer's current server-side price (a stale catalog tab / tampered POST can no longer set the recorded `amount`), and the receipt email shows that authoritative figure — but `POST /api/orders` returned only `{ id, message }`, and CatalogPage's success screen showed nothing about the total. So a buyer whose order recorded a different amount than their (possibly stale) cart only learned the real total from the email — the on-screen confirmation was silent about money. Not a bug, but a transparency gap the previous change opened.

**Change (backend + frontend, additive):**
- `backend/orders.js` — `place()` now returns the recorded `amount`, and `POST /api/orders` includes it in the response (`{ success, id, amount, message }`). Backward compatible.
- `frontend/src/pages/CatalogPage.jsx` — captures `d.amount` and shows "รวม ฿X" on the success screen (only when the server sent a numeric amount), so the buyer sees the same authoritative total the receipt email carries — not the client-side `price × qty` guess.

**Verified (run, not assumed) + mutation-tested:** backend `test:order-price-authority` 8 → **9/9** (adds: `place()` returns the recorded amount). Frontend `catalogOrderA11y.test.jsx` 1 → **2**: a new test mocks the order POST returning `amount: 600` while the client total is ฿120, and asserts the success screen shows **฿600** (the server figure). **Mutation:** making CatalogPage never set the server amount flips that test **red**; restored. Regression-safe: full frontend suite **392/392** (was 391), `npm run build` ok (sitemap 26), backend `order-confirm` 11/11 · `order-cancel-restock` 12/12 · `order-stock-guard` 9/9 · `api-contract` 166/166; boot `/api/health` 200; `backend/data/` untouched.

### 2026-08-06 — Hourly loop: compare the master admin key in constant time (defence-in-depth, consistency)

Continuing the auth-path scan from the tenant-JWT fix. A systematic grep for hardcoded secret fallbacks (`process.env.X || 'const'`) across `backend/` found **no** remaining offenders (the one hit, `ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'`, is a public default voice id, not a secret) — so the tenant JWT was the last one. But `checkAdminKey()` (the single chokepoint gating **every** admin endpoint — inventory, producer approval, dispute resolution, broadcast, leads, KPI) compared the master key with a plain `provided === key`, which short-circuits at the first differing character. The repo already established constant-time comparison for its money/data confirm-link tokens (`token-verify.js` `safeTokenEqual`, imported in server.js) — the admin key, a higher-value secret, was the inconsistent one. `adminLimiter` (30/15min) makes a remote timing attack impractical, so this is low-severity defence-in-depth, not a live hole; comparing the master credential in constant time is simply the correct, free, consistent practice.

**Change (backend):**
- `server.js` `checkAdminKey()` — `provided === key` → `safeTokenEqual(provided, key)` (keeps the `!!key` guard so an unset/`null` admin key in prod still denies). Behavior-identical for accept/reject; only the timing side-channel closes.

**Verified (run, not assumed):** `test:token-verify` extended 14 → **19/19** — added arbitrary admin-key-style secrets (variable length, symbols, non-hex): exact key accepted, a same-length one-char-off key rejected, shorter/longer/empty rejected (confirms `safeTokenEqual` is correct for the admin-key shape, not just 16-hex tokens). Regression-safe (behavior preserved): `integrations-auth` 7/7, `corporate-auth` 9/9, `video-auth` 6/6, `admin-default-login` 5/5; and a **live** boot with `ADMIN_KEY` set → `/api/inventory/admin/list` returns 200 for the right key, **401** for a same-length wrong key / short wrong key / no key. `node --check` clean; `backend/data/` untouched. (A constant-time swap is behavior-identical to `===`, so no functional test can distinguish them — the guard is at the `safeTokenEqual`-primitive level, matching how token-verify.js itself was introduced.)

### 2026-08-06 — Hourly loop: SECURITY — tenant JWTs were signed with a source-visible constant (forgeable tenant auth)

Found scanning the tenant/corporate auth path. `tenant-manager.js` signed AND verified tenant login JWTs with `process.env.JWT_SECRET || 'openthai-jwt-secret-2026'`. Whenever `JWT_SECRET` is unset in production — **the current state**, per docs/OWNER-DECISIONS.md #3 — every tenant token was therefore signed with a secret **printed in this repo**, so anyone who reads the source could forge `{ tenantId, plan, role:'tenant' }` and authenticate as ANY tenant (full corporate-account takeover; the token drives `verifyToken` → the corporate/tenant endpoints). The main app's own confirm-link signing (`server.js` `UNSUB_SECRET`) was already hardened to **fail closed** for exactly this reason (server.js:1306: per-process random key in prod, never a hardcoded constant) — the tenant path was simply missed.

**Change (backend; mirrors server.js's UNSUB_SECRET exactly):**
- `tenant-manager.js` — the tenant-JWT secret is resolved once at module load: `JWT_SECRET` when set; in a production-like env (`VERCEL` / `NODE_ENV=production`) a **per-process `randomBytes(32)` key** (tokens fail closed — unforgeable, though a tenant may need to re-login across serverless invocations/restarts until `JWT_SECRET` is set); only local dev uses a clearly dev-only string. Emits the same `[SECURITY]` boot warning as the main app when prod-like without `JWT_SECRET`. `signTenantToken`/`verifyTenantToken` now use this resolved secret. No hardcoded production fallback remains anywhere.

**Verified (run, not assumed) + mutation-tested:** new `scripts/test-tenant-token-secret.mjs` (`test:tenant-token-secret`, self-contained — re-execs itself in child processes to control the load-time env) **6/6**: in prod-like + no `JWT_SECRET`, a real login token still verifies in-process while a token forged with the old `'openthai-jwt-secret-2026'` (or any other guess) is **rejected**; with `JWT_SECRET` set, a token signed with it verifies. **Mutation:** restoring the `|| 'openthai-jwt-secret-2026'` fallback flips the "forged-token rejected" assertion **red** (RC=1); restored to 6/6. Regression-safe: `tenant-login` 10/10, `corporate-auth` 9/9, `token-verify` pass; boot `/api/health` 200; `backend/data/` untouched. Wired into `package.json` + the self-contained CI block. (Reinforces OWNER-DECISIONS #3: once `JWT_SECRET` is set in the 3 Vercel projects, tenant tokens become both stable and unforgeable.)

### 2026-08-06 — Hourly loop: remove the invalid `twitter:site` handle from the social card (honest-meta cleanup)

Small correctness fix on the main app's share meta (resolves the long-standing 🔵 note in docs/OWNER-DECISIONS.md). `frontend/index.html` shipped `<meta name="twitter:site" content="@Openthai.ai">`, but `@Openthai.ai` is **not** a valid X/Twitter handle — handles are 1–15 chars of `[A-Za-z0-9_]`, no dots — and no real X account is referenced anywhere in the repo (grep: `twitter:site` existed only in this one file; no test asserts it; the prerender pipeline never touches it). An invalid handle provides no card attribution and just ships a malformed tag, which is exactly the "impressive-sounding but not real" the repo's standing priority warns against. The owner's note listed "remove" as an accepted resolution.

**Change (frontend only):** removed the `twitter:site` line (replaced with a one-line comment noting a real X @handle can be added there later). The Twitter card still renders fully from `twitter:card` (summary_large_image) + `title`/`description`/`image` — `twitter:site` is optional.

**Verified (run, not assumed):** `npm run build` succeeds; built `dist/index.html` now carries only `twitter:card`/`title`/`description`/`image` (no `twitter:site`); `routeMeta.test.js` 13/13 (it asserts `twitter:title`, unaffected); sitemap still 26 urls. No backend change.

### 2026-08-06 — Hourly loop: marketplace orders recorded the CLIENT-supplied price (stale-tab / tamper) instead of the producer's real price

Found scanning the order funnel. `/api/shop/checkout` (first-party store) correctly computes `amount` from the **server** price (`inventory.get(...).price`), but the **marketplace** path — `CatalogPage → POST /api/orders → orders.place()` — took `price` straight from the request body and recorded `amount = price * qty`. That amount is shown in the buyer's and producer's confirmation/receipt emails ("ยอดรวม") and stored on the order. So a stale catalog tab (producer changed their price after the page loaded) or a tampered POST recorded — and emailed a receipt for — the **wrong** total. No Omise charge rides this path (marketplace orders are producer-fulfilled requests, escrow starts `none`), so this is a data-integrity / wrong-receipt bug, not direct theft — but it is exactly the stale-data class the sibling server-side **stock** guard in the same function already defends against, and it was inconsistent to trust the client for price while distrusting it for stock.

**Change (backend; mirrors the existing getProducerStock guard):**
- `producers.js` — new `getPrice(email)` (companion to `getStock`): the producer's current authoritative price, or null if unlisted. Exported.
- `server.js` — pass `getProducerPrice: (email) => producers.getPrice(email)` into `createOrders(...)`.
- `orders.js` `place()` — prefer the authoritative server price over the client's when available; **fall back** to the client price when the producer lists none, the lookup throws, or no hook is wired — so the first-party store path (which passes its own verified price and has no producer record) and the always-degrade-never-lose-a-sale philosophy are both preserved. (Hoisted `producer_email`/`product_name` so the lookup can run before `amount` is set; rec fields otherwise unchanged.)

**Verified (run, not assumed) + mutation-tested:** new `scripts/test-order-price-authority.mjs` (`test:order-price-authority`, no-server) **8/8** — server price overrides a ฿1-for-฿500 tamper and fills a missing client price; falls back to the client price when the producer lists none / the lookup throws / no hook; null+null → amount null. **Mutation:** making `place()` ignore the authoritative price turns **2** assertions red (records ฿2 and null instead of ฿1000/฿1500); restored to 8/8. Regression-safe: `test:order-stock-guard` 9/9 (place() refactor intact), `order-confirm` 11/11, `order-cancel-restock` 12/12, `producers` 28/28, `shop-receipt` 46/46, `api-contract` 166/166, and the shop-commission E2E 8/8 (checkout path — STORE_EMAIL has no producer record, so its server-verified price is recorded unchanged). Boot `/api/health` 200; `backend/data/` untouched. Wired into `package.json` + the no-server CI block.

### 2026-08-06 — Hourly loop: guard the public producer-directory search against a producer-email harvest regression

Auditing the consent-based producer funnel. `/api/producers/search` (producers.js:235) is **public/unauthenticated**. It previously projected each approved producer's `email` into the response even though `ProducerDirectoryPage` used it only as a React key — so `GET /api/producers/search?q=` (empty query = match-all) let anyone harvest every approved producer's email in one call (PDPA: needlessly exposing personal contact data). That was fixed to project only company/category/product_name/price/description/website/stock — but the fix had **no test**, so a future refactor could silently re-add `email` and re-open the hole. (Sibling `/api/catalog` deliberately still returns `email` because `CatalogPage` sends `producer_email` back as the producer identifier at checkout; moving to an opaque id is a documented, larger, separate refactor — see producers.js:232-234. Left untouched — out of scope to refactor unilaterally.)

**Change (test-only; no runtime change):**
- `backend/scripts/test-producer-search-privacy.mjs` (new, `test:producer-search-privacy`, self-boot with `OPENTHAI_DATA_DIR` isolation + mock-payment mode) — registers + admin-approves a producer, then asserts the public search response carries the product data (company/name/price) but **never** an `email` field or the raw address, for **both** the empty-query match-all (the harvest case) and a keyword query. Also sanity-checks the product still appears in `/api/catalog` so the checkout path stays intact. Pins only the search endpoint's privacy guarantee — makes no assertion about `/api/catalog`'s email, so it neither blesses nor blocks the future opaque-id refactor.
- Wired into `package.json` + the self-contained CI block in `.github/workflows/test.yml`.

**Verified (run, not assumed) + mutation-tested:** **11/11**. **Mutation:** re-adding `email: p.email` to the search projection turns **2** assertions red (RC=1); restored to 11/11. `backend/data/` untouched; `package.json` re-parsed valid.

### 2026-08-05 — Hourly loop: (all-platform-files repo) repaired 205 dead "create content" CTAs across the platform hub

Cross-repo fix — logged here for the canonical loop history; full record is in the all-platform-files commit message (that repo has no DECISIONS_LOG.md). Every roadmap-section + affiliate page in `all-platform-files` carried a CTA ("สร้าง Affiliate Content →" / "สร้างคอนเทนต์ด้วย AI") pointing at a **root-relative** `href="/generate"`. Broken two ways: (1) those pages deploy on the dashboard domain where `/generate` is not a file, so Vercel's catch-all (`/(.*) → /index.html`) served the hub instead; (2) the main app has **no** `/generate` route anyway — its SPA sends unknown paths to NotFoundPage (the generator is the auth-gated `/ai-generator`). So all 205 action buttons were dead ends on the market-entry surface.

**Fix (all-platform-files):** repointed all 205 to `https://www.openthai-ai.com/ai-skills` — a real, **public**, robots-allowed route (`AiSkillsPublicPage`, the AI-content-tools catalog / pre-signup funnel page). Closest public match to the buttons' promise, avoids bouncing cold traffic into the `/login` wall that `/ai-generator` would, and matches the absolute-URL convention every other main-app link in those pages already uses. **Verified:** full local-link scan across all 516 html files → **0 broken** (was 205); one line changed per file; anchor markup otherwise unchanged. Committed + pushed to `all-platform-files@claude/daily-reporter-improvements-8vc9ct` (PR #1, open). Owner option noted in the commit: switch the target to `/ai-generator` if they'd rather drop users straight into the tool.

### 2026-08-05 — Hourly loop: guard against a portal type ever losing its signup-acknowledgment email (silent-funnel regression)

Auditing the consent-funnel acknowledgment path. `sendPortalWelcomeEmail(lead)` does `const copySet = PORTAL_WELCOME_COPY[lead.type]; if (!copySet ...) return;` — so a portal type with **no** entry in `PORTAL_WELCOME_COPY` sends **nothing**, silently. This is the exact bug the comment above `PORTAL_WELCOME_COPY` documents having already happened once: gov-thai/gov-intl/intl-org/foundation applicants got no confirmation at all while their `/portals/*` pages promised "we'll follow up within 48/72h". Today all 8 non-affiliate types have copy (affiliate is the deliberate exception — it's auto-registered and gets the affiliate-specific ref-link welcome instead, so generic copy there would double-mail). But `KNOWN_TYPES` (portal-leads.js) is the real source of truth for accepted types, and **nothing** stopped a future new portal type/page from shipping without welcome copy and silently swallowing those applicants' acknowledgment — a real funnel/market-entry regression with no test.

**Change (test-only; no runtime change):**
- `backend/scripts/test-portal-welcome-coverage.mjs` (new, `test:portal-welcome-coverage`, no-server) — imports the runtime `KNOWN_TYPES` (via `createPortalLeads` with a throwaway data dir) and statically extracts the top-level keys of `PORTAL_WELCOME_COPY` from server.js source (importing server.js would boot the server, so it parses source like test-api-contract/test-migration-coverage do). Asserts: every `KNOWN_TYPE` **except affiliate** has a copy entry; affiliate has **none** (pinning the "own welcome" intent so nobody adds a double-mailing generic entry); no stray copy exists for a non-accepted type; and each entry is complete — th/en/zh, each with subject+title+body.
- Wired into `package.json` + the no-server CI block in `.github/workflows/test.yml`.

**Verified (run, not assumed) + mutation-tested:** **25/25**. **Mutation:** adding a new type (`'newvendor'`) to `KNOWN_TYPES` with no copy turns the guard **red** (`❌ PORTAL_WELCOME_COPY has an entry for "newvendor"`, RC=1); restored to 25/25. `backend/data/` untouched; `package.json` re-parsed valid.

### 2026-08-05 — Hourly loop: consumer digest emailed duplicates to the same person once per re-signup (spam / deliverability risk)

Found scanning the consent-based signup → digest path (a top-priority market-entry surface). `sendConsumerDigest()` (server.js) builds its recipient list as `leads.filter(l => l.type === 'consumer' && l.email && !l.unsubscribed)` and then sends one email **per record**. But `portalLeads.submit()` creates a **fresh record per submission** (`id: lead_<ts>_<rand>`) with **no dedup by email** — so a consumer who submits `/portals/consumer` more than once (double-click, page refresh, "did it go through?") has 2+ `consumer` records for the same address, and this loop mails them the **same** promo once per duplicate. Real people receiving the identical email 2–3× per run reads as spam, hurts sender reputation/deliverability (Gmail/Outlook fold or flag repeated identical sends), and erodes exactly the trust the market-entry push depends on. Unsubscribe/erasure were already correct (they match on email across all records); only the send path over-counted.

**Change (backend; pure extraction + one call site, mirrors selectDigestMatches / ai-json extractions):**
- `backend/digest-match.js` — new pure `dedupeConsumerLeads(leads)`: collapses to **one record per email** (case-insensitive, trimmed). Among duplicates it keeps the most recent submission that **carries a category** (so `selectDigestMatches` can still match products); if none has a category, the most recent overall. Non-mutating. Does **not** delete duplicate records — the signup data stays intact; only the per-run send list is deduped.
- `backend/server.js` — `sendConsumerDigest()` now wraps the consumer filter in `dedupeConsumerLeads(...)`. `total_consumers` in the result is now the unique-address count (more meaningful).

**Verified (run, not assumed) + mutation-tested:** extended `scripts/test-digest-match.mjs` (`test:digest-match`, no-server) from 14 → **21/21** — 3 records over 2 addresses collapse to 2, latest-intent wins, a categorized record beats a newer blank one, and null/empty/whitespace/case robustness. **Mutation:** making `dedupeConsumerLeads` a passthrough (`return leads`) turns **5** assertions red (got 3 not 2, etc.); restored to 21/21. `node --check` clean; `test:api-contract` **166/166** (imports resolve); boot smoke `/api/health` 200. `backend/data/` untouched.

### 2026-08-05 — Hourly loop: make the shop-commission (#9) money-guard E2E hermetic via a data-dir override

The `#9` guard (`scripts/test-shop-commission.mjs`, wired into CI as the "E2E — shop-commission money guard" step) boots a real server and drives a full ref-link store purchase to prove `/api/shop/checkout` credits the affiliate their tier commission (฿1000 × 0.20 = ฿200) and credits nobody on a no-ref checkout. It was spawned with plain `node server.js` — no data isolation — so every run wrote the affiliate/product/order records it creates into the **tracked** `backend/data/*.json` seed files. Harmless in ephemeral CI, but it meant the guard **could not be run locally without dirtying tracked files** (exactly the snapshot/restore friction that has bitten this loop before, incl. the round-13 accidental delete of tracked seeds).

**Change (additive, no behaviour change in prod/dev):**
- `backend/server.js` — `WRITE_DATA_DIR` now honours an optional `OPENTHAI_DATA_DIR` env var: `process.env.OPENTHAI_DATA_DIR || (IS_VERCEL ? '/tmp/openthai-data' : STATIC_DATA_DIR)`. Unset (prod/dev) → **identical** to before. Set → **all** file-backed stores point at that throwaway dir, so a self-boot test can create products/affiliates/orders without ever touching the committed `backend/data/` files.
- `.github/workflows/test.yml` — the shop-commission E2E step now spawns with `OPENTHAI_DATA_DIR=/tmp/shopcomm-data`, so the guard is hermetic in CI too.
- `backend/scripts/test-shop-commission.mjs` — header comment updated to the hermetic local-run recipe (`OPENTHAI_DATA_DIR=/tmp/xxx` instead of the old `VERCEL=1`, which shared `/tmp/openthai-data` across all tests).

**Verified (run, not assumed) + mutation-tested:** booted `OPENTHAI_DATA_DIR=/tmp/shopcomm-verify ADMIN_KEY=ci-admin node server.js` and ran the guard → **8/8**, and `git status --short backend/data/` stayed **empty** (tracked seeds untouched — the whole point). **Mutation:** neutering the `if (ref) creditAffiliateSale(…)` call at `server.js:731` (the #9 credit) flips 3 assertions red (`total_sales`/`total_earned` → 0, RC=1); restored to 8/8. `node --check server.js` clean; `test:api-contract` **166/166**, `test:migration-coverage` **28/28**. `PROJECT_STATUS.md` regenerated (was 6 days stale) — committed separately.

### 2026-07-30 — Hourly loop: a11y — the public `/contact` form's labels weren't associated with their inputs

Continuing the a11y-label sweep from the catalog order form. Audited public form pages for the same "visible `<label>` but no `htmlFor`/`id`" gap and found it on `/contact` (`ContactPage.jsx`) — a real public funnel page (in the sitemap). All four fields (name / email / subject `<select>` / message `<textarea>`) rendered a styled label that was **not** associated with its control, so a screen reader announced each field with **no accessible name** (WCAG 1.3.1 Info & Relationships, 4.1.2 Name/Role/Value). Additive, no behaviour change.

**Change (frontend only):**
- `frontend/src/pages/ContactPage.jsx` — added `htmlFor="contact-<field>"` to each of the four labels and the matching `id` to each control (`contact-name` / `contact-email` / `contact-subject` / `contact-message`).

**Verified (run, not assumed) + mutation-tested:** new `frontend/src/__tests__/contactFormA11y.test.jsx` **1/1** — finds all four fields via `getByLabelText` and asserts the right control types (name=input, email type=email, subject=SELECT, message=TEXTAREA). Full frontend suite **295/295** (was 294; +1); `npm run build` ok (sitemap 26). **Mutation:** dropping the subject `htmlFor` makes `getByLabelText(/หัวข้อ/)` fail with "no form control was found associated to that label"; restored to green. No backend change. (Other pages the crude label-vs-input heuristic flagged are auth-gated internal tools — lower priority than the public funnel; left for a later pass.)

### 2026-07-30 — Hourly loop: robustness — harden `parseAIJson` (the parser 36 AI-skill endpoints + dispute arbitration depend on), which was untested and threw on common valid replies

Found auditing the core AI product path. Every skill endpoint (`/api/skills/*`, `/api/generate*`, `/api/council*`, `/api/pr/*`, … — **36 call sites**) plus disputes.js's AI arbitration funnels the model's raw text through `parseAIJson(text)` to get structured data; a throw sends the caller to a **generic mock**. The inline helper was `const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw …` — untested, with two real weaknesses that threw away valid model output into the mock: (1) a **null/undefined** reply (a provider returned nothing) hit `null.match` → a **TypeError**, not the intended clean error; (2) models very commonly wrap JSON in a **` ```json … ``` ` code fence** with trailing prose that also contains a `}`, so the **greedy** `{…}` over-matched across the fence and `JSON.parse` threw — a perfectly good reply silently degraded to mock output. Hardened it, behaviour-compatible for everything that parsed before.

**Change (backend; extract + harden, mirrors the escapeHtml / verifyOmiseWebhook extractions):**
- `backend/ai-json.js` (new, pure) — `parseAIJson`: rejects non-string/empty with a **clean `Error` mentioning "json"** (no more TypeError); prefers a ` ```json … ``` ` (or bare ` ``` `) fenced block's contents when present, then the greedy `{…}` fallback. Anything that parsed under the old rule parses to the **same value**; only previously-failing inputs (null, fenced-with-trailing-brace) now succeed/degrade cleanly.
- `backend/server.js` — imports it; removed the inline def. All 36 call sites + the `parseAIJson` passed into `createDisputes()` are unchanged (same function contract).

**Verified (run, not assumed) + mutation-tested:** new `scripts/test-ai-json.mjs` (`test:ai-json`, no-server) **14/14** — backward-compat (bare object, object-in-prose, nested, no-json→throw); the new null/undefined/empty/whitespace/non-string cases throw a **clean Error (asserted NOT a TypeError, message mentions "json")**; a ` ```json ` fenced block with a **stray trailing `}`** parses correctly (the case the old greedy scan broke on), a bare ` ``` ` fence works, and a truncated object still throws (mock fallback preserved). **Mutation:** reverting to the old `text.match`-only body flips the clean-Error assertion red (TypeError) and breaks the fenced case; restored to 14/14. **Boot smoke:** server loads with the new import → `/api/health` 200 (the 36 callers + disputes.js resolve the imported symbol). `node --check` clean on both; `backend/data` git-restored. Wired `test:ai-json` into `package.json` + the no-server CI block.

### 2026-07-30 — Hourly loop: a11y — the catalog order form's labels weren't associated with their inputs (nameless fields for screen readers)

Found auditing the public commerce funnel. `/catalog`'s `OrderModal` — the checkout every funnel path drives to — rendered a visible `<label>` before each field but **never associated them** (no `htmlFor`/`id`, no wrapping), so a screen reader announced each `<input>`/`<textarea>` with **no accessible name**. Worst was the quantity field: `<input type="number">` with **no placeholder either**, so it was a completely nameless spin button (WCAG 1.3.1 Info & Relationships, 4.1.2 Name/Role/Value, 3.3.2 Labels). A blind buyer literally couldn't tell which box was name / contact / qty / address / note. Purely additive, no behaviour change.

**Change (frontend only):**
- `frontend/src/pages/CatalogPage.jsx` — added `htmlFor="ord-<field>"` to each of the five order-form labels and the matching `id` to each control (`ord-name` / `ord-contact` / `ord-qty` / `ord-address` / `ord-note`). (The catalog search box already had `aria-label` from the search round; no `<img>` in the public pages lacks `alt`.)

**Verified (run, not assumed) + mutation-tested:** new `frontend/src/__tests__/catalogOrderA11y.test.jsx` **1/1** — opens the order modal and finds **every** field via `getByLabelText` (name/contact/qty/address/note), asserts the qty control is the `type="number"` one (the previously-nameless spin button) and that typing through the accessible handle reaches state. `catalogStock` 4/4 and `catalogSearch` 5/5 unaffected; full frontend suite **294/294** (was 293; +1); `npm run build` ok (sitemap 26). **Mutation:** dropping the `htmlFor="ord-qty"` makes `getByLabelText(/จำนวน/)` fail with "no form control was found associated to that label" — the test genuinely enforces the association; restored to green. No backend change.

### 2026-07-30 — Hourly loop: security — the email XSS sweep MISSED one: the consumer digest interpolated the consumer's category RAW in the `<h1>`

The 2026-07-30 sweep claimed "no notification email interpolates user input raw" — but it checked **direct** interpolations and missed one hidden inside a template-string map. `sendConsumerDigest` built `titleByLang = { th: \`…"${category}"…\` }` and then dropped `titleByLang[lang]` **raw** into the digest email's `<h1>`. `category` is `lead.form_data.category` — entered at consumer-portal signup and only `clip()`-sanitized (the same bypassable `/<[^>]*>/g`), so an unclosed `<img …onerror=…` category renders live in the consumer's digest email. (`introByLang` already escaped `name`; the product rows already escaped `product_name`/`producer`; only the **category-in-title** was raw — which is exactly why a direct-grep sweep skipped it.) Reachable via a direct `POST /api/leads/submit {type:consumer, category:"<img …"}`. This closes it and makes the sweep actually complete.

**Change (mirrors the low-stock / affiliate-welcome extractions):**
- `backend/html-escape.js` — new `consumerDigestHtml({name, category, matches, lang, domainUrl, unsubUrl})` → `{subject, html}`: escapes the category **inside the `<h1>`** (`escapeHtml(titleByLang[L])`), plus `name` and each match's `product_name`/`producer`. The **subject keeps the raw category** — an email subject is plain text, not HTML, so escaping it would surface literal `&quot;`. Localized th/en/zh; one-click unsubscribe link preserved.
- `backend/server.js` — `sendConsumerDigest` now calls the builder (`const {subject, html} = consumerDigestHtml(...)`) instead of assembling the HTML inline; behaviour otherwise identical (same matches, same skip-on-no-match, same recipients).

**Verified (run, not assumed) + mutation-tested:** extended `scripts/test-html-escape.mjs` to **36/36** (+9) — a malicious category yields no live `<img onerror>` and appears escaped in the `<h1>`; a `<script>` in a product name and a `"` in a producer name are escaped; the consumer name is escaped in the intro; **the subject stays plain text (raw category, no `&lt;`)**; the unsubscribe link is present; and a normal digest localizes (en title) with the formatted price. **Mutation:** reverting the `<h1>` to the raw `titleByLang[L]` makes the injected `<img onerror>` survive → **2 assertions red**; restored to 36/36. **Boot smoke:** server loads with the new import + refactored digest → `/api/health` 200. `node --check` clean on both; `backend/data` git-restored. (`test:html-escape` already wired into `package.json` + CI.)

### 2026-07-30 — Hourly loop: test gap (money-critical) — `verifyOmiseWebhook`'s fail-closed guard had no direct unit test

Found auditing which backend modules have no test that imports them: `omise-payment.js` was one. Its `verifyOmiseWebhook(rawBody, sig)` is the **only** thing separating a real cleared payment from an attacker curling `POST /api/payment/webhook` — the route trusts a valid webhook to mean "payment succeeded → grant the subscription/entitlement". The revenue self-boot test asserts a bad signature → 401 **through HTTP with the secret set**, but the pure function's most dangerous edge — **FAIL CLOSED when `OMISE_WEBHOOK_SECRET` is unset** (a common prod misconfig) — plus the length-mismatch / non-string cases that must reject **without throwing**, had no direct coverage. A refactor could silently turn the unset-secret path into fail-**open** (forged webhooks granting free subscriptions) and every existing test would still pass. No production code changed — this closes the coverage gap.

**Added (test only):**
- `backend/scripts/test-omise-webhook-verify.mjs` (`test:omise-webhook-verify`, no-server) — **13/13**. With the secret set: a valid HMAC over the raw body → true; wrong-secret / tampered-body / one-hex-flip (same length, exercises the `timingSafeEqual` path) → false. **Fail-closed:** secret unset **or** empty string → false even for an otherwise-valid signature. Malformed: empty / short (length-mismatch) / `undefined` / `null` / numeric / upper-cased-hex signatures all → false with no throw. Toggles `process.env.OMISE_WEBHOOK_SECRET` per case and restores it.
- Wired `test:omise-webhook-verify` into `package.json` + the no-server CI block in `test.yml`.

**Mutation-verified:** changing the `if (!secret) … return false` guard to `return true` (fail-open) turns exactly the **3 fail-closed assertions red** — proving the test guards the forged-payment hole; restored to 13/13. (A weaker mutation that swaps the missing secret for a hard-coded fallback stays green, correctly, because a signature forged under a different secret still fails the HMAC — the test targets the real failure mode: skipping verification entirely.) `node --check` clean; `omise-payment.js` unchanged (test-only).

### 2026-07-30 — Hourly loop: security — finished the email-escaping sweep: the affiliate welcome email interpolated the applicant's name RAW

Continuing the previous round's low-stock XSS fix, I swept **every** `mailer.sendMail` HTML template in `server.js` for raw user-input interpolation to make the escaping discipline complete (not one-off). Result of the audit: order-notify, buyer-confirm, dispute, portal-lead notification, and all 9 welcome/application emails already escape via `escapeHtml`; `shop-receipt.js` escapes via its own `esc()`. The **one straggler** was `sendAffiliateWelcome` — it dropped `${name}` straight into the `<h1>` (`🎉 ยินดีด้วย ${name}!`). `name` is applicant-entered (`registerAffiliateCore` trims/slices but does **not** HTML-escape), so a name like `<img src=x onerror=…>` rendered live in the welcome email. Lower severity than the low-stock case (the welcome email goes to the affiliate's own inbox → self-XSS), but it's the same discipline violation and the last raw interpolation in any notification email — worth closing so a future copy-paste doesn't spread it. Also hardened `ref_link` (which `registerAffiliateCore` accepts from caller input and renders in an `href` **and** as link text).

**Change (backend; mirrors the low-stock extraction):**
- `backend/html-escape.js` — new `affiliateWelcomeHtml({name, refCode, refLink, domainUrl})` builder: escapes `name` + `refLink` (+ `refCode` for uniformity, already charset-limited), keeps the dashboard link's `encodeURIComponent(refCode)` (URL context), `domainUrl` verbatim (trusted env). Byte-identical markup otherwise.
- `backend/server.js` — imports it; `sendAffiliateWelcome` now sets `html: affiliateWelcomeHtml({ name, refCode, refLink, domainUrl: DOMAIN_URL })` (removed the inline template). Subject unchanged (static string).

**Verified (run, not assumed) + mutation-tested:** extended `scripts/test-html-escape.mjs` to **27/27** (+7) — a malicious applicant name is escaped in the `<h1>` (no live `<img onerror>`), a `<script>` smuggled via `ref_link` is neutralized, the dashboard link uses the trusted domain + URL-encoded code, and a normal Thai name/code renders unchanged. **Mutation:** dropping the `escapeHtml` on `name` + `refLink` makes the injected tags survive → **4 assertions red**; restored to 27/27. **Boot smoke:** server loads with the new import → `/api/health` 200. `node --check` clean on both; `backend/data` git-restored after boot. (`test:html-escape` was already wired into `package.json` + the no-server CI block last round.) **Email-escaping sweep now complete** — no notification email interpolates user input raw.

### 2026-07-30 — Hourly loop: security — stored-XSS in the low-stock alert email (the one notification path that interpolated product name/sku RAW)

Found by code scan following the escaping note at `server.js` ("clip() ตัด <tag> ด้วย regex ที่ bypass ได้ถ้า input มี '<' ไม่ปิด … จึงต้อง escape ที่จุดแทรกลง HTML"). That note fixed the **order / dispute / portal-lead / buyer-confirm** emails — but **`sendLowStockAlert` was missed**: it interpolated `product.name` and `product.sku` straight into the alert email's HTML body (`<b>${product.name}</b> (SKU ${product.sku})`). Product name/sku are producer/admin-entered via `inventory.upsert()`, which sanitizes with the **same bypassable** `clip()` (`/<[^>]*>/g`) — an **unclosed** `<img src=x onerror=…` (no `>`) survives clip, reaches the email raw, and completes into a live tag against the template's next `>` (the `</b>`), firing in the **admin's** mail client when a product crosses its low-stock threshold. Same stored-XSS-to-email class the note already closed elsewhere; this was the remaining hole.

**Change (backend; behavior-identical for every existing email, one real fix):**
- `backend/html-escape.js` (new, pure) — exports `escapeHtml` (moved verbatim from the inline `server.js` def, same implementation) so the escaping **every** notification email depends on is finally unit-testable and reused without drift, plus `lowStockAlertHtml(product, domainUrl)` which builds the alert body with `escapeHtml(name)`/`escapeHtml(sku)` and numeric-coerced `stock`/`low_stock` (`domainUrl` is a trusted env origin, left verbatim).
- `backend/server.js` — imports both; removed the inline `escapeHtml` (all 42 other usages unchanged — identical function); `sendLowStockAlert` now sets `html: lowStockAlertHtml(product, DOMAIN_URL)`. The **subject** stays raw (plain-text, not HTML — same as `sendOrderNotification`).

**Verified (run, not assumed) + mutation-tested:** new `scripts/test-html-escape.mjs` (`test:html-escape`, no-server) **20/20** — `escapeHtml` covers all five entities (& first, no double-escape), the **unclosed-`<` bypass payload** reduced to inert `&lt;img…` text, a full `<script>` neutralized, and null/undefined/number inputs never throw; `lowStockAlertHtml` escapes a malicious name **and** sku (no un-escaped attacker tag survives anywhere in the body), renders numeric stock/low_stock as plain numbers, uses the domain URL verbatim, and passes a normal Thai name/sku through unchanged. **Mutation:** dropping the two `escapeHtml()` calls in `lowStockAlertHtml` makes the injected `<img …>` survive → **4 assertions red**; restored to 20/20. **Boot smoke:** real server boots with the new import → `/api/health` 200 (the escapeHtml relocation didn't break the 42 other email interpolations at module load). `node --check` clean on both files; `data/*.json` git-restored after boot. Wired `test:html-escape` into `package.json` + the no-server CI block.

### 2026-07-29 — Hourly loop: test gap — the content "learning"/feedback loop (rate → patterns → enhance) had NO test, incl. the NaN-poisoning guard

Found by code scan in the "improve on the platform's real feedback" lane. The learning loop lets a user rate a generated piece 1–5 (`POST /api/skills/learning/rate`), aggregates a running average per `content_type|platform` (`GET /api/skills/learning/patterns`), and feeds the best pattern back into the prompt (`POST /api/skills/learning/enhance`). It had **zero test coverage** — and it carries a subtle, already-fixed bug that nothing guards: the rate route must **coerce `Number(rating)` and check `Number.isFinite` BEFORE the 1–5 range check**, because the earlier version compared the raw string (`rating < 1 || rating > 5`) — a non-numeric `"abc"` slipped through (NaN comparisons are always false), `Number("abc")` = NaN was summed into `p.sum`, and that pattern's `avg_rating` went **NaN permanently**, corrupting `/patterns` and the enhance context. A future reorder of those two lines would silently reintroduce it, shipping green. No production code changed — this closes the coverage gap only.

**Added (test only):**
- `backend/scripts/test-learning-patterns.mjs` (`test:learning-patterns`, self-boot, rate limiter disabled, no Supabase/AI keys; snapshots + restores `learning-patterns.json` so it leaves no state) — **16/16**. Asserts the running average (5 then 3 → 4.0; a numeric-string `"4"` is coerced → (5+3+4)/3 = 4), `total_ratings` accumulation, the **NaN/range guard** (`"abc"` / `6` / `0` / missing `content_type` all → 400), and that `/patterns` reflects **only the valid ratings** — `count` = 3 (not 4), `avg_rating` a finite 4 (**not NaN**), `top_tone` = the most-frequent valid tone, sorted by avg desc (caption 4 before blog 2), `recent_feedback` populated, `total_ratings` = 4.
- Wired `test:learning-patterns` into `package.json` + a self-contained CI step in `test.yml` (next to the other self-boot tests).

**Mutation-verified (the discipline that proves the test bites):** reverted the guard to the pre-fix form (validate the raw `rating` before coercion + push `Number(rating)`) via `/tmp` backup + a python string-replace on `server.js`, re-ran → `"abc"` now returns **200**, `count` becomes 4, `avg_rating` serializes to **`null`** (JSON's rendering of NaN), the sort flips and `total` inflates — **5 assertions red**, exactly the poisoning the guard prevents. Restored `server.js` (`node --check` clean, 16/16 green again, no git diff on `server.js` or `backend/data`).

### 2026-07-29 — Hourly loop: UX — buyer catalog search + category filter (`/catalog` was an unfilterable grid that gets unusable as products grow)

Squarely in the "genuinely beneficial to the people who actually use it" standing priority. `/catalog` (the public buyer storefront fed by `GET /api/catalog`) rendered **every** product as one flat grid with no way to search or narrow down — fine with 1 product, unusable the moment producers list dozens. A shopper who wants "น้ำผึ้ง" or only "เครื่องดื่ม" had to eyeball the whole page. Added client-side search + category filtering; no backend change, no new dependency, and it can't break the existing order/sold-out funnel (that grid logic is untouched — it just iterates the filtered list instead of the full one).

**Change (frontend only):**
- `frontend/src/pages/CatalogPage.jsx` — added `query` + `cat` state. Categories are derived from the **live** catalog (`[...new Set(products.map(p => p.category).filter(Boolean))]`), so the chips only ever show categories that actually exist — nothing hard-coded to drift. A free-text `<input type="search">` matches across product name / producer / category / description (case-insensitive); a chip row filters by category with an "ทั้งหมด/All/全部" reset chip (`aria-pressed` on the active one). When a filter matches nothing, a helpful "ไม่พบสินค้า…" message shows instead of a blank page; the filter UI is hidden entirely when the catalog is empty (the existing "become the first producer" empty-state still owns that case). Sold-out badge / order-button logic is unchanged — it now maps over `shown` (the filtered list).
- `frontend/src/i18n/index.jsx` — `mk.cat.search` / `mk.cat.allcat` / `mk.cat.noresults` in th/en/zh.

**Verified (run, not assumed):** new `frontend/src/__tests__/catalogSearch.test.jsx` **5/5** — renders the search box + one chip per real category + the "all" chip; free-text query filters across name/producer/description and clearing it restores everything; a category chip narrows to that category and is announced `aria-pressed=true`; a non-matching query shows the "no results" message with **zero** product cards (never blank); and the filter UI is absent when the catalog is empty. `catalogStock` still **4/4** (the sold-out guard is intact under the new filtered render). Full frontend suite **293/293** (was 288; +5), `npm run build` ok (sitemap 26 urls intact). **Booted the real server** and curled `GET /api/catalog` → confirmed it returns each product's `category` (`"อาหาร"`) — the exact field the chips derive from, so the filter populates in production, not just under the test mock. `backend/data` restored (no git diff) after boot. No backend change.

### 2026-07-29 — Hourly loop: enhancement — climate-zone selector on `/seasonal` (international visitors can see their own region), using existing engine capability

Small, grounded enhancement rather than another new page. The `/seasonal` page hard-coded `zone=tropical`, but the deterministic engine already supports **three** climate zones (`tropical` / `north_temperate` / `south_temperate`) with the correct hemisphere inversion — capability that was live but unreachable from the UI. Added a zone selector so a visitor outside the tropics (the `/portals/gov-intl` + `/portals/intl-org` audiences, and anyone Google sends from a temperate country) sees the season/categories/plays for **their** region, matching the owner's worldwide-reach intent. (Verified first that the surrounding funnel is already sound and needed nothing — all 9 `/portals/*` pages are consent-gated via the shared `submitLead`, `portal-leads.submit` enforces `consent:true` server-side too, and `robots.txt` already carries the `Sitemap:` directive — so this was a real capability gap, not manufactured work.)

**Change (frontend only; the endpoint already accepts `zone`):**
- `frontend/src/pages/SeasonalPage.jsx` — added a `zone` state + a labelled `<select>` (tropical default, plus northern/southern temperate) with th/en/zh option labels; the fetch now uses the chosen zone and re-fetches on change (`useEffect` dep `[lang, zone]`). New `zonePick` i18n label in all three languages.

**Verified + booted (all 3 zones, real distinct data):** updated `frontend/src/__tests__/seasonalPage.test.jsx` **7/7** (+1) — switching the selector to `north_temperate` re-fetches with `zone=north_temperate` while the initial load still requested `zone=tropical`. **Booted the real server** and curled `/api/seasonal/recommend` for all three zones (lang=en): `tropical → Rainy season · rain_gear/quick_dry/moisture_control`, `north_temperate → Summer · cooling/hydration/sun_protection`, `south_temperate → Winter · heating/warm_apparel/hot_food` — the same late-July date yields opposite temperate seasons (the hemisphere inversion is correct), confirming the selector surfaces genuinely different, right answers. Full frontend suite **288/288** (was 287; +1), `npm run build` ok (sitemap 26 urls intact). `data/*.json` no diff after boot. No backend change.

### 2026-07-29 — Hourly loop: SEO/content — a public, indexable general `/faq` (FAQPage rich-result eligible), grounded in what the platform actually does

Continuing the marketing/SEO/content lane. `/pricing` and `/affiliate` already carry topic-specific FAQs with `FAQPage` JSON-LD, but there was **no general FAQ** answering the broad top-of-funnel questions — "what is this / is my data safe / how do I pay / how do I track an order / what if there's a problem / how do sellers join / how do affiliates get paid". Those are exactly the queries a hesitant first-time visitor (and Google) searches. Built `/faq` reusing the site's existing FAQ pattern.

**Honesty guardrail (the whole point):** every answer is grounded in what the platform **actually does** — consent-first funnels, **no scraping**, PromptPay + card in THB via Omise, PDPA access/erasure/unsubscribe, order tracking by id+contact, a dispute flow that holds funds in escrow and lets **both sides** submit evidence before an **admin** decides (AI only suggests, never moves money), producer apply→approve→self-restock, tier-based affiliate commission withdrawn to PromptPay with email confirmation, 35 AI skills, 3 languages. **No invented features** — a test asserts the answers never mention the repo's known-rejected phantoms (Neo4j / Stripe / USD / blockchain).

**Change (frontend only):**
- `frontend/src/pages/FaqPage.jsx` (new, th/en/zh) — 8 grounded Q&A in an accessible accordion (`role="button"` + `aria-expanded` + Enter/Space, matching the `/pricing` `/affiliate` a11y pattern), a CTA into `/portals` + `/privacy`, and **`FAQPage` JSON-LD derived from the SAME visible Q&A** (same client-side injection `/pricing` uses — Google renders the SPA and reads it, so the page is eligible for FAQ rich results and the schema can't drift from what's shown).
- `App.jsx` — lazy `<Route path="/faq">` (public).
- **SEO wired** (`seoInvariants` triple): `/faq` added to `scripts/seo-routes.mjs` + `public/robots.txt` → prerendered meta + sitemap.
- **Discoverability:** `footer.link.faq` i18n (th `❓ คำถามที่พบบ่อย`, en `❓ FAQ`, zh `❓ 常见问题`) + the homepage footer entry.

**Verified (run, not assumed):** new `frontend/src/__tests__/faqPage.test.jsx` **6/6** — renders the questions; emits **exactly one** valid `FAQPage` JSON-LD with 8 well-formed Question→Answer entries mirroring the visible Q&A; the answers are **honest** (contain consent/scrape/PromptPay/PDPA and do NOT contain Neo4j/Stripe/USD/blockchain); the accordion expands accessibly via keyboard (`aria-expanded` flips on Enter); funnels to `/portals` + `/privacy`; English toggle localizes both the page and the JSON-LD. `footerNavA11y` extended with `/faq`; `seoInvariants` green. Full frontend suite **287/287** (was 281; +6). `npm run build` ok — `/faq/index.html` prerenders with the right title, **sitemap 26 URLs**. No backend change.

### 2026-07-29 — Hourly loop: SEO/marketing — a public, indexable "AI tools" page (the "35 skills" headline finally has a page you can see without signing in)

Back to the marketing/SEO/content lane. The platform's headline selling point is its **35 AI skills**, but the only pages that list them — `/skills` and `/skills-catalog` — are **both auth-gated** (`isAuthenticated ? … : <Navigate to="/login" />`) and internal-facing (they expose each skill's endpoint/method and link into the dashboard). So a prospective user — or Google — literally **could not see what the tools are** without creating an account. That's a real top-of-funnel + SEO gap: no indexable proof of the product's core value.

**Change (frontend only; reads the already-public `GET /api/skills`):**
- `frontend/src/pages/AiSkillsPublicPage.jsx` (new, th/en/zh) — a marketing-only showcase: live `active/total` count badge, every skill's **name** grouped by **localized category** (31-category label map with icon, th/en/zh), a client-side search filter, and a CTA into the funnel (`/portals` + `/pricing`). It deliberately **omits the internal `endpoint`/`method`** the auth-gated catalog shows — this page sells, it doesn't document the API. Standalone-page resilience: on a fetch error it still renders its hero + a graceful "list unavailable" message. Execution stays behind login; this page only *shows* the catalog.
- `App.jsx` — lazy `<Route path="/ai-skills">` (public, not auth-gated; distinct from the auth-gated `/skills` tool).
- **SEO wired** (robots `Allow` == `ROUTES` == real public route, enforced by `seoInvariants`): added `/ai-skills` to `scripts/seo-routes.mjs` + `public/robots.txt` → prerendered social meta + sitemap.
- **Discoverability:** `footer.link.aiskills` i18n (th `🧠 เครื่องมือ AI`, en `🧠 AI tools`, zh `🧠 AI工具`) + the `[..., '/ai-skills']` entry in the homepage footer info column.

**Verified (run, not assumed):** confirmed `GET /api/skills` is **public** (booted the server, curled it with no token → 200, 35 skills, fields `id/name/category/endpoint/method/status`). New `frontend/src/__tests__/aiSkillsPublicPage.test.jsx` **6/6** — hero + live count + names grouped by localized category; **does NOT leak** `endpoint`/`method` (asserts `/api/generate` and `POST` are absent — the marketing/internal separation is guaranteed); search filters; funnels to `/portals` + `/pricing`; English toggle localizes the hero + category labels; graceful fetch-error state. `footerNavA11y` extended with `/ai-skills`; `seoInvariants` green. Full frontend suite **281/281** (was 275; +6). `npm run build` ok — `/ai-skills/index.html` prerenders with the right title, **sitemap 25 URLs**. No backend change.

### 2026-07-29 — Hourly loop: bug fix — cancelling an order didn't restore the producer's stock (leaked stock → false "สินค้าหมด")

A real bug surfaced by this week's stock work. `onNewOrder` decrements the producer's stock when a catalog order is placed (`producers.decrementStock`), but **cancelling an order never restored it** — the admin cancel path (`POST /api/orders/admin/status → 'cancelled'`) only emailed the customer. So every cancelled order permanently ate a unit of the producer's stock for a sale that never happened. With this week's additions (the catalog **"สินค้าหมด"** badge + the `POST /api/orders` stock guard), the damage is now *visible and blocking*: a producer whose orders get cancelled a few times drifts to `stock 0`, gets marked sold-out, and has real buyers turned away — despite having sold nothing.

**Change (symmetric with the decrement, centralized in the orders module so it covers every cancel path):**
- `backend/orders.js` — `setStatus` captures the previous status and fires a new `opts.onCancel(order)` hook **only on the transition into `'cancelled'`** (`prev !== 'cancelled'`), so stock is restored exactly once and re-cancelling is a no-op.
- `backend/producers.js` — added `incrementStock(email, qty)` (the mirror of `decrementStock`): restores only when the producer tracks stock (`stock != null`); an email that matches no producer — e.g. the platform store's `STORE_EMAIL`, whose stock lives in the separate `inventory` module — is left untouched, so the shop-checkout path is unaffected.
- `backend/server.js` — wired `onCancel: (order) => producers.incrementStock(order.producer_email, order.qty)` into `createOrders` alongside the existing `onNewOrder`/`getProducerStock`.

**Verified + mutation-tested + booted end-to-end:** new `scripts/test-order-cancel-restock.mjs` (`test:order-cancel-restock`, no-server) **12/12** — it wires the exact `onNewOrder→decrement` / `onCancel→increment` hooks server.js uses and asserts the round-trip (place qty 2: 5→3; cancel: 3→5), **idempotency** (re-cancelling doesn't over-restore; a `→confirmed` change doesn't restore; cancelling a previously-confirmed order still restores once), untracked(`null`) producers stay untracked, and an unknown/`STORE_EMAIL`-style producer cancels cleanly with nothing to restore. **Mutation:** dropping the `prev !== 'cancelled'` guard makes the re-cancel over-restore (5→7) and cascades 5 assertions red; restored to 12/12. **Booted the real server** with a seeded producer at `stock:5`: `POST /api/orders` qty 2 → `my-status` shows `stock 3`, then `POST /api/orders/admin/status status:cancelled` → `stock 5` (restored). `node --check` clean on all three files; `data/*.json` restored (no git diff) after the boot. Wired `test:order-cancel-restock` into `package.json` + the no-server CI block.

### 2026-07-29 — Hourly loop: funnel gap — the BUYER got no order-confirmation email (only an on-screen id that vanishes when the tab closes)

Continuing through the order funnel. On a successful `POST /api/orders`, `sendOrderNotification` emails the **producer** (and CCs the owner), but the **buyer received nothing** — just the order id shown in the OrderModal. Close the tab and that id (which, with the contact, is the only way to track the order at `/track`) is gone. The dispute-notification path already learned to notify **both** parties (incl. the buyer via `order.contact` when it's an email); the order-placed path hadn't. Added a transactional buyer confirmation.

**Consent note (checked against the standing order):** this is **not** the prohibited "contact people without consent". The buyer *initiated* the order and supplied this contact *for this order* — a one-off transactional receipt is exactly what they expect, and it carries no marketing. We email **only when the contact is an email** (many buyers give a phone → no email channel → we skip, no guessing/enrichment).

**Change:**
- `backend/order-confirm.js` (new, pure) — `buyerConfirmation(order, domainUrl)` returns `null` when the buyer gave no email (phone/blank/garbage), else `{ to, subject, trackUrl }`. The `trackUrl` is `<domain>/track?id=<id>&contact=<email>` with both params URL-encoded (so a weird id/contact can't break the link) and a trailing slash on the domain won't double up.
- `backend/server.js` — new `sendBuyerOrderConfirmation(order)` uses that helper: on an email contact it sends a Thai transactional receipt (product/qty/total + the order id + a one-click **"ติดตามสถานะคำสั่งซื้อ"** button to the track link); skips quietly with no SMTP or no email contact. Wired into `onNewOrder` alongside the existing producer notification (fire-and-forget, so it never blocks the order or stock decrement).

**Verified + booted:** new `scripts/test-order-confirm.mjs` (`test:order-confirm`, no-server) **11/11** — emails only on an email contact (phone/empty/garbage/`{}` → null, never throws), the track link encodes id+contact (special chars stay safe, trailing-slash domain doesn't double up), and the subject names the product + `×qty` (missing qty → `×1`). **Booted the real server** with a seeded in-stock producer and placed two real orders: an **email**-contact order → `success` (the new confirmation path runs, skipping the actual send only because this env has no SMTP), and a **phone**-contact order → `success` (buyer confirmation correctly skipped). No runtime error in the `onNewOrder` path (which now also calls the buyer confirmation). `node --check` clean on both files; `data/*.json` restored (no git diff) after the boot. Wired `test:order-confirm` into `package.json` + the no-server CI block.

### 2026-07-29 — Hourly loop: harden the order path — server-side stock guard in POST /api/orders (closes the direct-POST hole the previous round flagged)

The previous round fixed the **UI** (CatalogPage no longer shows an order button for sold-out products) but explicitly noted the **backend still accepted** an out-of-stock order — a direct `POST /api/orders`, a stale catalog tab, or a race between two buyers could still place an order the producer can't fulfil (`place()` only validated name/contact and then `decrementStock`'d, flooring at 0). Closed that hole so the guarantee holds regardless of the client.

**Change:**
- `backend/orders.js` — `place()` now consults an injected `opts.getProducerStock(email)` after field validation, before persisting: if the producer's stock is tracked and `< qty`, it rejects with `{ ok:false, out_of_stock:true, stock, error }` (`สินค้าหมด` when 0, `สต๊อกไม่พอ (เหลือ N ชิ้น)` when partial). `stock == null` (untracked) stays always-orderable — same semantics as `/api/catalog` and the digest selector. **Graceful:** if the lookup throws, the order is NOT blocked (degrade to prior behaviour rather than lose a sale); if no hook is injected, behaviour is unchanged (backward compatible). The route already maps `!ok → 400 { error }`, which the CatalogPage OrderModal surfaces as-is.
- `backend/producers.js` — added `getStock(email)` (returns current stock or `null` when untracked) + exported it.
- `backend/server.js` — one-line wiring: `createOrders(..., { getProducerStock: (email) => producers.getStock(email), onNewOrder: … })`.

**Verified + mutation-tested + booted end-to-end:** new `scripts/test-order-stock-guard.mjs` (`test:order-stock-guard`, no-server, file-store) **9/9** — stock 10/qty 3 accepted, untracked(null) always orderable, stock 0 → `out_of_stock` + `สินค้าหมด`, stock 2/qty 5 → `สต๊อกไม่พอ (เหลือ 2 ชิ้น)`, stock 2/qty 2 exactly-enough accepted, a throwing lookup does NOT block, no-hook stays backward compatible, and the guard runs only for well-formed orders (field validation still first). **Mutation:** neutering the `stock < qty` predicate flips the sold-out + insufficient assertions red; restored to 9/9. **Booted the real server** with a seeded approved producer at `stock:0` and one at `stock:5`: `POST /api/orders` for the sold-out one → `{"success":false,"error":"สินค้าหมด"}`, for the in-stock one (qty 2) → `{"success":true,...}`. `node --check` clean on all three files; `data/*.json` restored (no git diff) after the boot. Wired `test:order-stock-guard` into `package.json` + the no-server CI block.

### 2026-07-29 — Hourly loop: bug fix (buyer-facing twin) — the public catalog let buyers "order" SOLD-OUT products

Direct follow-up to the previous round's consumer-digest sold-out fix, closing the **buyer-facing** side of the same defect. `/api/catalog` already returns each product's `stock` (from `producers.catalog()`), but `CatalogPage.jsx` **ignored it entirely** — every product rendered an active "สั่งซื้อ" button regardless of stock, and the producer-catalog order path (`POST /api/orders`) doesn't reject out-of-stock (it only `decrementStock`s, flooring at 0, in the `onNewOrder` hook). So a buyer could open the order modal for a sold-out item and place an order the producer can't fulfil — a wasted order + a disappointed buyer, on the marketplace's core conversion surface.

**Change (frontend only — the data was already on the wire):**
- `frontend/src/pages/CatalogPage.jsx` — per product, `soldOut = p.stock != null && Number(p.stock) <= 0` (mirrors the digest rule: `stock == null` = producer doesn't track = always orderable; `> 0` = orderable; `<= 0` = sold out). A sold-out card is dimmed and shows a non-interactive **"สินค้าหมด"** badge in place of the order button, so it can't open the checkout modal.
- `frontend/src/i18n/index.jsx` — new `mk.cat.soldout` key (th `สินค้าหมด`, en `Sold out`, zh `已售罄`).

**Verified:** new `frontend/src/__tests__/catalogStock.test.jsx` **4/4** (mocks `/api/catalog`) — in-stock + untracked(null) products keep the order button (exact count), a `stock: 0` product shows "สินค้าหมด" and is **not** a button (can't open the modal), negative/garbage stock is also treated as sold out, and an all-untracked catalog stays fully orderable with no sold-out labels. `modalDialogA11y` (which imports `OrderModal` from this file) still 10/10. Full frontend suite **275/275** (was 271; +4), `npm run build` succeeds (prerender + sitemap 24 urls intact). Backend unchanged — `/api/catalog` already carried `stock`; the buyer UI just wasn't honouring it. (Noted for a possible later round: a server-side guard in `POST /api/orders` would harden against a direct out-of-stock POST, but the UX defect real buyers hit is the catalog button, which this fixes.)

### 2026-07-29 — Hourly loop: bug fix — the consumer digest featured SOLD-OUT products (funnel-quality defect in the real matching path)

Diversified off the seasonal thread to a real bug found by scanning the revenue-critical funnel. `sendConsumerDigest()` (the weekly category-matched "🛍️ new picks in your category" email) selected a consumer's products with `catalog.filter((p) => p.category === category).slice(0, 5)` — an **exact-category match that never checked stock**. `producers.catalog()` returns every approved producer with a `product_name`, **including ones whose `stock` is explicitly `0`**. So a consumer could be emailed "new picks in สมุนไพร", click through, and land on a sold-out product — a wasted click and a trust hit on the one proactive touch the funnel makes. (Audited the neighbours first and found them already sound: the `portal_leads` **unsubscribe is dual-mode** — PATCH Supabase + file fallback — so opt-outs are durable across redeploys; and the frontend/backend category whitelists are still identical + test-pinned. Not manufactured work — this was the one real defect.)

**Change:**
- `backend/digest-match.js` (new, pure) — `selectDigestMatches(catalog, category, limit=5)`: exact category match **and** exclude sold-out items — `stock === 0` (and negative/garbage) are dropped, while `stock == null` (producer doesn't track stock = always available) and any positive stock are kept. Null-safe (bad catalog / null entries never throw).
- `backend/server.js` — `sendConsumerDigest` now calls `selectDigestMatches(catalog, category, 5)` instead of the inline stock-blind filter. If nothing available remains, the consumer is skipped (no email) exactly as the no-match path already did — never an empty or all-sold-out digest.

**Verified + mutation-tested + booted:** new `scripts/test-digest-match.mjs` (`test:digest-match`, no-server) **14/14** — strict category match (other categories / empty category / no-producer category all excluded), in-stock + untracked(null) featured, `stock===0` and negative excluded, limit cap + a null catalog + null entries + zero-limit all safe. **Mutation:** dropping the stock predicate flips 3 assertions red (the two sold-out/negative exclusions + the exact-count) — the guard genuinely enforces it; restored to 14/14. **Booted the real server**: clean start, `/api/portals/consumer-digest` loads and enforces its cron/admin auth (proves the new import + wiring are intact; the actual send needs SMTP + auth, so the pure selector — the real logic — is what's unit+mutation-tested). `node --check` clean on both files; `data/*.json` no git diff after boot. Wired `test:digest-match` into `package.json` + the no-server CI block.

### 2026-07-29 — Hourly loop: public, indexable `/seasonal` content page — gives the richer `/api/seasonal/recommend` a real home + an evergreen SEO answer to "ช่วงนี้ขายอะไรดี"

Third seasonal follow-up, this time in the **marketing/SEO/content** lane. The deterministic engine now speaks th/en/zh (round 1) and is callable by the platform AI (round 2), but its **fuller** endpoint — `/api/seasonal/recommend` (the current solar term, the local season, **all** demand categories with a "why", a concrete action for **each of the five groups**, and a countdown to the next 节气) — was only reachable via raw API. The per-portal `SeasonalAnglesPanel` shows a 6-angle teaser; `/showcase` is a general tour. Nothing was an **indexable, evergreen page** answering the recurring buyer/seller question "what's in demand this season?" — a real, high-intent search query this platform should own.

**Change (frontend only — no backend change; the endpoint was built + booted in earlier rounds):**
- `frontend/src/pages/SeasonalPage.jsx` (new, th/en/zh) — fetches `/api/seasonal/recommend?zone=tropical&lang=<ui lang>` (re-fetches on language switch) and renders the full localized recommendation: season + solar-term header, the **next-term countdown** ("ปักษ์ถัดไป … ในอีก N วัน"), every category with its localized "why", and a play for each of the five groups. Because it is a **standalone page** (not the additive panel), on a fetch error it still renders its chrome + a graceful "live data unavailable, it computes from the calendar so it always answers when connected" message — never a blank page. Funnels into `/portals` + `/showcase`.
- `App.jsx` — lazy import + `<Route path="/seasonal">` (public, not auth-gated).
- **SEO wired correctly** (the `seoInvariants` triple: robots `Allow` == `ROUTES` == a real public App route): added `/seasonal` to `scripts/seo-routes.mjs` **and** `public/robots.txt`, so it is prerendered with its own social meta + listed in the sitemap.
- **On-site discoverability:** added a `footer.link.seasonal` i18n key (th `🌦️ สินค้าตามฤดูกาล`, en `🌦️ Seasonal demand`, zh `🌦️ 应季畅销`) and the `[..., '/seasonal']` entry to the homepage footer "info" column (same real-`<a href>` pattern the footer-a11y fix enforces), so it's reachable without knowing the URL — not just from search.

**Verified (run, not assumed):** new `frontend/src/__tests__/seasonalPage.test.jsx` **6/6** — renders the localized season + next-term countdown + every category/why; shows a play for all five groups; requests the endpoint with `zone=tropical` **and** the current `lang`; on switching to English it **re-fetches with `lang=en`** and renders en content (both the client-side-localized category names and the server-localized group actions); funnels into `/portals` + `/showcase`; and **degrades gracefully** on a fetch reject (hero + offline message, no blank). `footerNavA11y` extended with `/seasonal` (keyboard-focusable real `<a href>` guaranteed). `seoInvariants` stays green (robots/ROUTES/App-route triple consistent). Full frontend suite **271/271** (was 265; +6). `npm run build` succeeds — `/seasonal/index.html` prerenders with the right title, **sitemap grows to 24 URLs**. **Booted the real server** and curled `/api/seasonal/recommend?zone=tropical&lang=th|en|zh` → season/term/**next_term**/5 categories/group_actions all correct and localized in every language (default still Thai). `data/*.json` no git diff after boot.

### 2026-07-29 — Hourly loop: expose the seasonal engine as an agent tool (`seasonal_recommend`) — the platform's own AI can now answer "what should I sell this season?" in th/en/zh

**Follow-up to this morning's seasonal localization.** The deterministic seasonal engine is live, tested, and now trilingual — but the platform's conversational AI (`/api/agent/command`, native Claude/Gemini tool-use via `agent-tools.js`) could only `track_order` / `check_dispute_status` / `list_skills` / `trigger_automation`. It had **no way to surface the seasonal signal in chat**, so a producer/affiliate asking the assistant "ช่วงนี้ควรดันอะไร" got nothing, even though the answer already exists behind `/api/seasonal/angles`. Closed that gap by registering the engine as a fifth tool — squarely in the "make the platform genuinely useful / market-facing" lane.

**Change:**
- `backend/agent-tools.js` — added the `seasonal_recommend` tool (input: optional `group` [5-group enum] / `zone` [3-zone enum] / `lang` [th|en|zh] / `date`; **nothing required** — all have sensible defaults). Its `executeTool` case calls the injected seasonal engine's `productAngles` and returns a **compact, model-friendly slice** (date, zone, localized solar term + season labels, the play for THIS group, and the top ≤6 angles), not the whole payload. Honest tool description (names the 24 solar terms / 节气, deterministic, no scraping). Degrades cleanly (`{error}`) if the engine isn't in context, and a bad date/group falls back safely.
- `backend/server.js` — one-line wiring: `toolContext()` now injects `seasonal: { productAngles, recommend }` alongside the existing `orders/disputes/webhooks` (same dependency-injection pattern the other tools use). `toGeminiTools()` picks up the new tool automatically.

**Verified (run, not assumed):** new `scripts/test-agent-tools.mjs` (`test:agent-tools`, no-server) **26/26** — it injects the **real** seasonal engine as context (exactly the shape `toolContext()` builds) and asserts: the tool schema is well-formed (5-group/3-zone/th-en-zh enums, no required field); `executeTool` returns a compact 1–6-angle slice with the group-specific play; the **same call localizes** — th angle is Thai, en has no Thai chars, zh is CJK, and the season/term/zone labels localize; safe defaults (no group → producer, unknown group → producer, missing engine → clean error not a throw, bad date → "now"); Gemini adapter advertises it; existing tools still degrade cleanly. **Booted the real server**: `/api/health` ok, `/api/agent/command` loads and returns the expected 503 with no AI key (proves the new wiring doesn't crash module-load or route setup; the model-driven tool *selection* needs an API key, which CI/this env doesn't have — the deterministic test drives the exact `executeTool` path server.js calls instead). `test:seasonal` still 50/50, `test:openapi` 12/12 (agent tools are the internal function-calling surface, not the public REST spec, so — like `/api/corporate/officer*` — they're intentionally left out of OpenAPI). `node --check` clean on `agent-tools.js` + `server.js`; `data/*.json` no git diff after boot. Wired `test:agent-tools` into `package.json` + the no-server CI block.

### 2026-07-29 — Hourly loop: localize the seasonal engine (th/en/zh) — the "value in 10 seconds" hook now speaks to the en/zh markets, not just Thai

**Gap found by code scan (real, not spec-driven):** the deterministic seasonal engine (`seasonal-engine.js`) is the front-line "first encounter → real value in 10 seconds" hook — it's embedded in every `/portals/*` page **and** on `/showcase` via `SeasonalAnglesPanel`. But its output (`angle`, `why`, `group_plays`/`group_actions`, the season/zone/term display labels) was **Thai-only**, while the platform serves th/en/zh and the panel already had localized chrome (headings). So an en or zh visitor saw localized headings wrapped around Thai content they couldn't read — the hook was broken for two of the three supported markets. Fixing it is squarely in the "marketing/reach wider" lane of the standing order. Still deterministic — the translations are a static knowledge table, **no LLM, no scraping**.

**Design — additive & backward-compatible (the contract rule):**
- Fields suffixed `_th` / `.th` are, by contract, **always Thai** and were left byte-identical. Localized copies are offered next to them under neutral `label` / `*_label` names (`solar_term.label`, `local_season.label`, `zone_label`, `angle.category_label`, `angle.trend_label`, `zonesInfo().label`).
- Un-suffixed prose fields (`angle`, `why`, `group_plays`, `group_actions`, `note`) are localized **in place** to the requested `lang`. `lang` defaults to `th`, so every existing caller sees exactly what it saw before — the original 33 unit assertions stayed green untouched.
- Unknown language → safe fallback to `th` (never throws).

**Change:**
- `backend/seasonal-engine.js` — added zh names + en/zh `why` to all 35 category rows and en/zh label/modifier/why to the 5 trend directions; en/zh `SEASON_*` / `ZONE_*` tables; `recommend`/`productAngles` now take `lang` and emit the localized + `*_label` fields; new `zonesInfo(lang)` export (localized zone picker) + `_langs` export.
- `backend/server.js` — `/api/seasonal/recommend|angles|zones` accept `?lang=th|en|zh`; `/zones` now returns `{key, th, label}` objects via `zonesInfo`.
- `backend/openapi.js` — documented the `lang` param + the new localized/`*_label` response fields on all three seasonal paths.
- `frontend/.../SeasonalAnglesPanel.jsx` — fetches `?lang=<current UI lang>` (re-fetches on language change) and renders the `*_label`/`.label` fields with a fall-back to the Thai `_th` fields. The four portal pages and `/showcase` already pass `lang={lang}`, so the whole chain is live end-to-end.

**Verified (run, not assumed):** `test:seasonal` **50/50** (was 33; +17 localization assertions, incl. en has no Thai chars, zh is CJK, `_th`/`.th` stay Thai under `lang=en`, notes stay honest in every language, unknown-lang → th). **Mutation:** forcing `catName` to always return Thai flips 2 assertions red — the guard genuinely enforces the en/zh output; restored to 50/50. **Booted the real server** and curled `/api/seasonal/{zones,angles,recommend}` for th/en/zh — English & Chinese content served correctly, default (no `lang`) still Thai. `test:openapi` **12/12**. Frontend `SeasonalAnglesPanel` test file 6/6 (added an en-payload localization test + a `lang` reaches the URL test); full frontend suite **265/265** (was 264; +1). `npm run build` succeeds (prerender + sitemap 23 urls intact). `node --check` clean on all edited backend files; `data/*.json` no git diff after boot.

### 2026-07-24 — Follow-up: make /showcase discoverable — link it from the homepage footer (it existed but nothing linked to it)

Closed a gap the previous round introduced: `/showcase` was built + indexable (sitemap/robots) but **no page on the site linked to it**, so a visitor on the homepage couldn't find it — only someone handed the URL directly. Added a real footer entry point.

**Change (frontend):**
- `src/i18n/index.jsx` — new `footer.link.showcase` key in all three languages (th `🎬 ทัวร์นำชม`, en `🎬 Showcase tour`, zh `🎬 项目导览`).
- `src/pages/LandingPage.jsx` — added `[t('footer.link.showcase'), '/showcase']` as the first item in the footer "info" column (appears on the homepage footer). Uses the same real-`<a href>` link pattern the footerNav a11y fix already enforces.
- `src/__tests__/footerNavA11y.test.jsx` — added `/showcase` to `ROUTE_TARGETS` so the link is regression-guarded (must stay a real keyboard-focusable `<a href="/showcase">`).

**Verified:** `footerNavA11y` 3/3 (the new link renders as a real focusable anchor), full frontend suite **264/264**, `npm run build` succeeds (sitemap still 23 URLs — the page was already listed; this only adds the on-site link). No backend change.

### 2026-07-24 — Owner request: public /showcase tour page — "come see what we built", honestly

The owner asked for a single page a fan could bring people to — one that surfaces the real highlights and makes visitors like the platform more. Built `/showcase` as a public, indexable tour, and — per the owner's explicit steer — turned the three honest caveats (pending migrations, v9.0 scaffold, small-team-+-AI) into an on-page **"ready now vs in progress"** section, so transparency is a feature rather than fine print.

**Change (frontend):**
- `frontend/src/pages/ShowcasePage.jsx` — th/en/zh. Hero → a **live** seasonal highlight (reuses `SeasonalAnglesPanel`, fetches `/api/seasonal/angles`) → four trust differentiators (consent-first / no-scraping / works-without-LLM / transparent decision log) → an "explore" grid linking to real routes (SPA `<Link>` to `/portals`, `/privacy`; real `<a>` to the backend-served `/tool`, `/api-docs`) → the honest ready/in-progress roadmap → a CTA to `/portals`. Every link points at a real, working route/endpoint; nothing invented.
- `App.jsx` — lazy import + `<Route path="/showcase" element={<ShowcasePage />} />` (public, not auth-gated).
- **SEO integration done correctly** (the `seoInvariants` test enforces robots.txt `Allow` == `ROUTES` == a real public App route): added `/showcase` to `scripts/seo-routes.mjs` **and** `public/robots.txt` Allow, so the page is prerendered with its own social meta and listed in the sitemap.

**Verified:** new `frontend/src/__tests__/showcasePage.test.jsx` (5/5) — hero + the four differentiators render, the explore links point at the real SPA and backend routes, the honest roadmap actually shows (asserts the `v9.0` + `migration` lines are present — so the transparency can't silently be dropped), the live seasonal block calls `/api/seasonal/angles`, and the language toggle works. `seoInvariants` stays green (proves the robots/ROUTES/App-route triple is consistent). Full frontend suite **264/264** (was 259; +5), `npm run build` succeeds — `ShowcasePage` bundles, `/showcase/index.html` prerenders with the right title, and the sitemap grows to **23 URLs**. No backend change (the endpoints it uses were booted+curled in prior rounds).

### 2026-07-24 — Hourly loop: API surface — advertise the seasonal endpoints in the OpenAPI spec + add the first guard for the hand-maintained spec

The seasonal engine (a deterministic, market-facing set of endpoints built the last few rounds) was live but **not in the OpenAPI spec** served at `/api/openapi.json` / rendered by `/api-docs` Swagger UI — so external developers and agents couldn't discover it. The spec is a hand-maintained JS object in `openapi.js` and had **no test at all**: a malformed hand-edit could ship a broken spec that breaks every SDK/agent that reads it, with nothing catching it.

**Change:**
- `openapi.js` — added `GET /api/seasonal/recommend`, `/api/seasonal/angles`, `/api/seasonal/zones` with accurate parameters (zone/date) + response schemas, tagged `Seasonal`, descriptions stating they are **deterministic** (honest — no scraped/LLM claim). Left the `/api/corporate/officer*` routes OUT — those are auth-gated internal corporate endpoints, not part of the public developer API. (29 paths total now.)
- Added `scripts/test-openapi-spec.mjs` (`test:openapi`, no-server) that guards the whole spec: openapi 3.x + info.title present, the spec serializes to JSON without throwing, every path is rooted, **every operation has a summary + at least one response** (catches a malformed hand-edit anywhere in the spec), and the three seasonal endpoints are advertised with the documented `zone` param.

**Verified + booted:** `npm run test:openapi` → **12/12**. Then **booted the real server** and curled `GET /api/openapi.json` → 29 served paths, all three seasonal endpoints present in the live spec. `node --check` clean on `openapi.js`, `data/*.json` no git diff after. Wired `test:openapi` into the no-server CI block. Same source-structural drift-guard family as the homepage JSON-LD guard.

### 2026-07-24 — Owner request: AI department officers — a scoped AI specialist per corporate department (temporary team until real hires)

The owner asked to staff the org with **AI officers that have domain skill per department** now, and add real people once the platform grows. Built on the existing `corporate-system.js` `DEPARTMENTS` registry (15 depts) rather than inventing a parallel structure.

**Safety was the design driver** (do-no-harm + verify-before-build): an AI officer must never pose as a licensed professional giving binding advice. So for the high-stakes departments (compliance/legal, finance, audit, risk, board, IR, company-secretary, HR) the officer is flagged `professional`, its prompt explicitly **forbids binding rulings and tells the model to defer to licensed experts**, and every answer carries a mandatory Thai disclaimer. It is also **not LLM-dependent**: with no AI key configured the endpoint returns a deterministic scope-based fallback (honest `ai_used: "none"`), so it works offline and in CI.

**Change:**
- `backend/dept-officers.js` (pure module) — `officerFor(deptId)` (role + one-line scope + `professional` flag), `needsProfessionalDisclaimer(deptId)`, `buildPrompt(deptId, question)` → `{ prompt, fallback, professional }` (the prompt injects the scope + guardrail + caps the question at 2000 chars; the fallback answers offline), and the `DISCLAIMER` text.
- `server.js` — `GET /api/corporate/officers` (roster, `requireAuth`) and `POST /api/corporate/officer/:dept` (`requireAuth` + `corpLimiter`): validates the dept + a non-empty question, calls `callAI` (falls back to the deterministic message on `!ok`/throw), and attaches the disclaimer for professional depts. Imported `buildPrompt` **aliased** as `buildOfficerPrompt` to avoid colliding with server.js's existing `buildPrompt(form)`.

**Verified + mutation-tested + booted:** `scripts/test-dept-officers.mjs` (14/14, no-server) — every dept has a scoped officer, unknown → null, the professional set is exactly the 8 high-stakes depts, the disclaimer names "licensed professional", the professional prompt forbids binding advice, every officer has a non-empty offline fallback, and a 5000-char question is capped. `scripts/test-dept-officer-endpoint.mjs` (11/11, self-boot with a known `JWT_SECRET`, **no AI keys** → fallback path) — auth required (401 without a token), 15 officers listed, a compliance answer carries the disclaimer with `ai_used:"none"`, a marketing answer has `disclaimer:null`, and unknown-dept / missing-question → 400. **Mutation:** forcing `needsProfessionalDisclaimer` to return false fails BOTH the unit ("all need the disclaimer") and the endpoint ("compliance carries the disclaimer") — the safety guard is genuinely enforced end-to-end; restored to green. `corporate-auth` still 9/9, `node --check` clean, `data/*.json` no git diff after. Wired `test:dept-officers` into the no-server CI block and `test:dept-officer-endpoint` as a self-boot CI step. (Honest scope note kept from the stakeholder discussion: these AI officers substitute for *some* functions but are not a staffed org; real people still needed for licensed legal/finance/support work.)

### 2026-07-24 — Owner request (cont.): surface the seasonal engine in the portals — "first encounter → real value in 10 seconds"

After a stakeholder-POV reflection exercise, the owner approved wiring the (already-built, already-tested) seasonal engine into the front end so a first-time visitor from any of the four groups *sees* the value immediately instead of it living only behind an API. Built a reusable value panel and embedded it in each `/portals/*` page.

**Change (frontend only):**
- `frontend/src/pages/portals/SeasonalAnglesPanel.jsx` — a React panel that fetches `GET /api/seasonal/angles?zone=tropical` (the Thai/ASEAN audience these portals serve) and shows, for THIS group: the current solar term (节气) + local season, the group-specific **play** (`group_plays[group]`), and up to 6 product **angles** (trend tag + angle + why). Localized labels for th/en/zh (the angle text itself is Thai — the backend produces Thai; a later round can localize it). **Purely additive:** on any error/empty response it renders `null`, so it can never break the portal page it sits in.
- Embedded it in `ProducerPortalPage` (`group="producer"`), `ConsumerPortalPage` (`consumer`), `MiddlemanPortalPage` (`middleman`), `AffiliatePortalPage` (`affiliate`) — right under each hero.

**Verified:** new `frontend/src/__tests__/seasonalAnglesPanel.test.jsx` (5/5) mocks fetch with the **real** `/api/seasonal/angles` payload shape and asserts: it renders the season + the **group-specific** play (affiliate vs consumer pick different plays) + the angles/trend tags; it calls the endpoint with the given `zone`; and — the safety invariant — it renders **nothing** when the API returns no angles OR when fetch throws (never crashes the page). Full frontend suite **259/259** (was 254; +5) and `npm run build` succeeds (prerender + sitemap intact). The `/api/seasonal/angles` endpoint itself was already booted+curled last round; the component test drives its exact shape. No backend change.

### 2026-07-24 — Owner request (cont.): seasonal engine brick 2 — trend-direction overlay → concrete product angles

The owner said "1-3" (wants the whole seasonal set), so continued from brick 1 to the documented brick 2. Built the **trend-direction overlay** that fuses the seasonal categories with a small set of **structural macro consumer trends** (`value` / `digital` / `health` / `eco` / `local`) to produce concrete **product angles** + a play for each of the five groups — still deterministic, still no LLM, still no scraping.

**Honesty guardrail (important):** the trends are *durable, common-knowledge* directions, **not** scraped real-time data and **not** invented statistics — the code comment + the API `note` say so plainly. The output shape is stable so a later round can layer a real, owner-authorized trend API (legally-open signals only) on top without changing the contract. This keeps the verify-before-build discipline: I did not fabricate a "live global ad-trend feed," I encoded well-known macro trends as a labelled knowledge layer.

**Change:**
- `backend/seasonal-engine.js` — `productAngles({date, zone})`: for each of the top-3 seasonal categories, emit 3 angles (value + digital are near-universal; the third is health/local/eco chosen by the category's nature via a keyword rule), each with `category/trend/angle/why`; plus `group_plays` for all five groups. Exposed `_trends`.
- `server.js` — `GET /api/seasonal/angles?zone=&date=` (mirrors `/recommend`).
- `docs/SEASONAL_DEMAND_ENGINE.md` — brick 2 moved to BUILT & VERIFIED.

**Verified + booted:** extended `scripts/test-seasonal-engine.mjs` — **33/33** (was 24; +9 brick-2 assertions): 3 categories × 3 trends = 9 angles, each well-formed and referencing a defined trend; the meaningful fusion (rain-gear × eco → reusable/recyclable in tropical July); value+digital apply to every top category; a health-ish winter category picks up `health` as its third; all 5 group_plays present; the note stays honest (mentions not-scraped/not-LLM). Then **booted the real server** and curled `GET /api/seasonal/angles` → `success:true`, 大暑 / rainy / 9 angles with a real producer play string. `node --check` clean, `data/*.json` no git diff after. No new CI wiring needed — the brick-2 assertions live in the already-wired `test:seasonal`.

### 2026-07-24 — Owner request: seasonal demand engine — 24 solar terms (节气) × climate zone → product categories (brick 1 of the owner's "right product / right region / right people" vision)

The owner asked for a big vision: match products to the region/season/people who actually need them, anchored to the Chinese 24 solar terms + weather + global trends, so all five groups earn. **Stopped and scoped it (rule #8)** rather than lunging at the whole thing: refused the "scrape all the world's advertising data" part outright (rule #3 — non-consensual collection, rejected 3× before; also copyright/PDPA), and declined to promise "everyone earns income" (code can't guarantee outcomes). Asked the owner to confirm the concrete first brick via AskUserQuestion; they chose the **24-solar-terms → product-category engine** (then said "1-3" = wants the whole set), so I built brick 1 for real + tested, and documented bricks 2–3 as a grounded roadmap instead of shipping them half-done.

**Built (deterministic, NOT LLM-dependent, NO scraping):**
- `backend/seasonal-engine.js` — a pure module. `solarTermFor(date)` (the 24 terms on their standard Gregorian dates, ±1 day, offline, with the Jan 1–5 wrap back to the prior 冬至); `localSeasonFor(date, zone)` encoding **the core insight — the same term is a different LOCAL season per climate zone**: `north_temperate` = the term's own season, `south_temperate` = **inverted** (北 midsummer = 南 midwinter), `tropical` (ไทย/อาเซียน) = hot-dry / rainy / cool-dry by month while still surfacing the term as the China-facing export hook; and `recommend({date, zone})` returning in-demand categories (each `key/th/en/why`), a one-line action for **all five groups**, and the next term + day-countdown so sellers stock up before the peak. Category lists are common seasonal-demand patterns framed as guidance — not fabricated stats.
- `server.js` — `GET /api/seasonal/recommend?zone=&date=` + `GET /api/seasonal/zones` (deterministic, no auth, answers instantly even if every AI provider is down).
- `docs/SEASONAL_DEMAND_ENGINE.md` — the honest roadmap: brick 1 (built), brick 2 (trend-direction overlay on the existing `/api/skills/trend`, legally-open signals only, next round), brick 3 (real per-region weather API — needs an owner key/network decision, flagged not guessed), and the explicit out-of-scope list.

**Verified + booted:** `scripts/test-seasonal-engine.mjs` (24/24) pins the term-by-date table incl. the Jan wrap, the hemisphere **inversion** (same date → `summer` in the north, `winter` in the south, `rainy` in the tropics), zone-appropriate + well-formed recommendations, the 5-group actions, the next-term countdown incl. the year wrap, and the safe fallbacks (unknown zone → tropical, bad date → now, never throws). Then **booted the real server** and curled the endpoints: `2026-07-24` tropical → 大暑 / rainy / rain-gear with a real affiliate action string; `2026-12-22` south_temperate → 冬至 but **local summer → cooling/sun-protection** (inversion correct end-to-end); `/api/seasonal/zones` lists the three zones. `node --check` clean, `data/*.json` no git diff after. Wired `test:seasonal` into the CI no-server unit block.

### 2026-07-24 — Hourly loop: PDPA — the proof-of-consent record (GAP-001) was file-only (wiped every Vercel redeploy → all consent proof lost); made it durable

Continued the ephemeral-`/tmp` durability sweep onto the store that matters most for the platform's stated PDPA posture. `POST /api/privacy/consent` writes the record that **proves** a user consented (email, ip, purposes, version, ts) — and `/api/privacy/policy` publicly advertises "GAP-001: บันทึก consent record ✅" while both `/api/privacy/access` and `performErasure()` read it — **but it was stored file-only in `pdpa_consents.json`.** On Vercel that's `/tmp`, wiped on every redeploy (which happens on every push), so after any deploy **every recorded consent is gone** and the platform can no longer prove anyone consented — the exact thing GAP-001 exists to guarantee. Same class as the broadcast-opt-out / affiliate-consent rounds; this is the foundational consent record, so worth closing next. (The affiliate/producer/portal funnels store their own consent flag durably in their Supabase rows already; this is the separate general-purpose consent-log store, which had no Supabase copy.)

**Change (dual-mode + graceful degradation, identical shape to the broadcast round):**
- New migration `009_pdpa_consents.sql` — `create table if not exists public.pdpa_consents (email pk, id, ip, purposes jsonb, version, consented, ts)`, idempotent, RLS enabled; email PK matches the code's existing upsert-by-email ("latest consent per email").
- `server.js` — on boot, if Supabase is configured, hydrate the in-memory `consents` list from `pdpa_consents` (restores it after a `/tmp` wipe). On `POST /api/privacy/consent`, upsert the record to Supabase in addition to the file. In `performErasure()`, when a consent row is removed, also DELETE it from Supabase (so erasure clears the durable copy, not just the file). If the table doesn't exist yet (owner hasn't run 009), all three fail quietly and it stays file-only — **no regression**; durable the moment 009 runs.

**Verified + mutation-tested + booted:** new self-contained test `scripts/test-pdpa-consent-durability.mjs` (9/9) — spins up a **mock Supabase** + the real server (known `JWT_SECRET` for the access/erasure HMAC). Pre-seeds a consent that exists **only** in Supabase while the local file starts empty, so it can only appear via the boot hydrate = proof it survives the `/tmp` wipe (read back through `/api/privacy/access`). Asserts: the prior consent is restored on boot; a fresh `POST /api/privacy/consent` issues a Supabase upsert and is then readable via access; and erasure-confirm DELETEs the row from Supabase. **Mutation:** disabling the hydrate → the "restored" assertion fails (0 rows); disabling the upsert → the "POSTed to Supabase" assertion fails; disabling the erasure DELETE → the "DELETEd from Supabase" assertion fails; restored to green each time. Confirmed `test:pdpa-tenant` still 16/16 (the shared access/erasure paths still work in file mode), `node --check` clean, `data/*.json` no git diff after. Wired `test:consent-durability` into `package.json` + a self-contained CI step in `test.yml` (mirrors the broadcast + ai-usage "spawns server + mock Supabase" steps). NOTE unchanged: owner should run `009` so consent proof is durable in production; until then the fallback keeps today's file-only behavior.

### 2026-07-24 — Hourly loop: opt-out durability — the newsletter-broadcast unsubscribe list was file-only (wiped every Vercel redeploy → re-subscribes everyone who opted out); made it durable

Scanned the two marketing-email paths for opt-out handling. Both **honor** unsubscribe correctly at send time — `sendConsumerDigest()` filters `!l.unsubscribed` (portal_leads, which persists `unsubscribed` to Supabase) and `/api/leads/admin/broadcast` filters `!broadcastUnsubscribed.has(email)` — so no logic bug. **But the broadcast suppression list itself is stored file-only** in `broadcast_unsubscribed.json`, with no Supabase copy. On Vercel that file is under `/tmp` and is **wiped on every redeploy** (and Vercel redeploys on every push), so the moment we ship, everyone who clicked "ยกเลิกรับข่าวสาร" is silently re-subscribed and the next broadcast emails them again — a **legally-required opt-out** (PDPA ม.19 withdrawal of consent / anti-spam) that we were dropping. Same ephemeral-`/tmp` class the affiliate-consent / portal_leads rounds fixed, but higher-stakes because it's a mandatory opt-out, not just a provable-consent record. (`portalLeads.unsubscribe()` was already durable via a Supabase PATCH; only this separate broadcast list — whose recipients come from waitlist/affiliate/order, not portal leads — was file-only.)

**Change (dual-mode + graceful degradation, same shape as prior rounds):**
- New migration `008_broadcast_unsubscribes.sql` — `create table if not exists public.broadcast_unsubscribes (email text primary key, created_at timestamptz default now())`, idempotent, RLS enabled.
- `server.js` — on boot, if Supabase is configured, hydrate the in-memory `broadcastUnsubscribed` set from `broadcast_unsubscribes` (restores the list after a `/tmp` wipe). On each `/api/broadcast/unsubscribe`, besides writing the file, upsert the email to Supabase (`resolution=merge-duplicates`). If the table doesn't exist yet (owner hasn't run 008), both calls fail quietly and it stays file-only — **no regression**; it becomes durable the instant the migration runs.

**Verified + mutation-tested + booted:** new self-contained test `scripts/test-broadcast-unsub-durability.mjs` (7/7) — spins up a **mock Supabase** + spawns the real server pointed at it with a known `JWT_SECRET`. Pre-seeds the mock with an email that "unsubscribed in a prior deploy" while the **local file starts empty**, so the only way it can be suppressed is the Supabase hydrate = proof it survives the `/tmp` wipe. Asserts: boot hydrate suppresses the prior opt-out (broadcast audience of 2 → 1 recipient); a forged unsubscribe token → 403; a valid unsubscribe → 200 **and** issues a POST upsert to Supabase (captured by the mock); and end-to-end both opt-outs leave 0 recipients. **Mutation:** disabling the boot hydrate → the "prior opt-out survives" + "0 recipients" assertions fail (audience back to 2); disabling the upsert → the "POSTed to Supabase" assertion fails; restored to green both times. `node --check` clean, `data/*.json` no git diff after. Wired `test:broadcast-unsub` into `package.json` + a self-contained CI step in `test.yml` (mirrors the ai-usage "spawns server + mock Supabase" step). NOTE unchanged: the owner should run `008` so the list is actually durable in production; until then the fallback keeps today's (file-only) behavior.

### 2026-07-24 — Hourly loop: PDPA — the erasure (ม.33) + access (ม.30) data-subject-rights flow missed the tenant account + cloud-sync stores; completed the coverage

Audited every store that holds personal data against what the two PDPA endpoints actually reach. The erasure comment claims it deletes "ทุกที่ที่ funnel เก็บไว้จริง" and the access comment claims it returns "everything we hold about you, financial records included" — but both were built before some stores existed and silently missed them:

- **`tenants` (business-account funnel)** — `tenant-manager.js` stores real PII (`name`, `email`, `contactPhone`, `businessType`, `brand_name`) in `tenants.json`, but exposed no way to find/delete by email (only `getById`/`verifyApiKey`/`verifyToken`). So `performErasure` never touched it and `/api/privacy/access/confirm` never returned it: a tenant who exercised their rights got **"removed 0 / here's your data"** while their whole account sat untouched — the exact class the erasure code says it fixed for producers/portal-leads, just missed because tenants is a separate module.
- **`user_sync` (cloud-sync blob keyed by email)** — never erased, never surfaced in access.
- **`payments` + `entitlements`** — email-bearing financial records that the access endpoint's own contract says it includes ("financial records included"), yet it returned neither.

**Change (finish the job the two functions started, following their existing patterns):**
- `tenant-manager.js` — added `findByEmail(email)` (returns the **safeView**, so an access export never leaks `apiKeyHash`) and `eraseByEmail(email)` (`{ removed }`, same shape as `producers.eraseByEmail`).
- `performErasure()` — now also erases `tenants` (personal account) and the email-keyed `user_sync` blob (file + Supabase DELETE, mirroring the affiliates path). `withdrawals`/`payments`/`entitlements` stay **retained** (financial/contractual legal-retention exception) but are now visible via access — updated the function comment to say so.
- `/api/privacy/access/confirm` — now also returns `tenants` (safeView), `payments`, `entitlements`, and the `cloud_sync` blob (via `syncRead`, so it works in both Supabase and file mode).

**Verified + mutation-tested + booted:** new hermetic self-boot test `scripts/test-pdpa-tenant-erasure.mjs` (16/16) — snapshots `tenants.json`/`user_sync.json`, boots the real server with a known `JWT_SECRET` (so it computes the same HMAC access/erasure tokens), registers two tenants + seeds a cloud blob, and asserts: access returns the tenant account + blob and **never** the `apiKeyHash`; the erasure-confirm HMAC gate 403s a forged token on GET and POST; a valid POST erases the tenant + blob (`removed ≥ 2`) and a follow-up access shows them gone; and the erasure is **targeted** — a second tenant survives intact. **Mutation:** disabling the erasure line → the "removed count" + "tenant gone" assertions fail (`removed 1`, account still present); disabling the access line → the "access returns the tenant" assertions fail; restored to green both times. Confirmed `tenant-login` still 10/10 (the new methods didn't disturb auth), `node --check` clean, and `data/*.json` show no git diff after (CI wrapper also runs `git checkout -- data/`). Wired `test:pdpa-tenant` into `package.json` + a self-contained CI step in `test.yml` alongside the other self-boot tests. NOTE: `user_sync` blobs keyed by a **username** (not the email) belong to a different identity and are erased under that identity's own request — documented in the code.

### 2026-07-24 — Hourly loop: CI coverage — un-rotted the revenue-system E2E and wired it in (the dedicated rewrite flagged last round)

Last round found `test-revenue-system.mjs` (the broad money/revenue E2E — captions, model-router, council, affiliate attribution/tiers, leaderboard, scheduler, webhook-signature) was stale against two post-write flow changes and therefore unwired. Did the rewrite this round:

- **Consent drift:** its affiliate signup omitted `consent`, which `registerAffiliateCore` now hard-requires (a 400 otherwise) — added `consent: true`.
- **Withdraw-flow drift:** its Withdrawals section asserted the **old synchronous** withdraw (`POST /api/affiliate/withdraw` → `data.withdrawal.id`, then admin approve/paid). The flow is now email-confirm-first (the route emails an HMAC link, returns only `pending_balance`, and **503s without a configured mailer** — CI has no SMTP), so those assertions can't run green. Removed them and kept only the two guards that don't need a mailer: the request route validates the PromptPay number **before** the mailer check (a bad number is a clean 400 even with no SMTP), and the admin list route is key-gated (no key → 401). No coverage lost: the full request→email→confirm→approve/paid money-out path is already guarded end-to-end by `test-affiliate-withdraw-confirm.mjs` (added earlier this session), so this de-duplicates rather than drops.

**Verified + wired:** booted the real server (`OMISE_WEBHOOK_SECRET`/`ADMIN_KEY`, mock AI, no Supabase) and ran the whole E2E — **23/23 pass**, including the previously-unverified Scheduler and Webhook-signature-guard sections. Re-ran with the **exact CI invocation** (`ADMIN_KEY=ci-admin DISABLE_RATE_LIMIT=1`, boot→curl-health→run→exit) → 23/23, exit 0. Added a boot-server E2E step to `test.yml` mirroring the affiliate-flow step (own port 8896, dumps `rev-server.log` on failure). Confirmed the three `data/*.json` show no git diff after the run. This closes the last CI coverage gap on the revenue surface and clears the stale-test debt flagged in the previous entry — every `test:*` script is now either run by CI or (only `test:revenue` was the holdout) intentionally accounted for.

### 2026-07-24 — Hourly loop: CI coverage — the skills smoke test (all 35 /api/skills endpoints) existed but was never wired into CI; wired it. Full suite verified green.

Ran the whole accumulated suite to confirm this session's many additions are coherent: **backend 12/12 no-server unit tests + 5/5 self-boot tests pass; frontend 254/254 (23 files) pass.** Then cross-checked every `test:*` script in `backend/package.json` (38 of them) against `.github/workflows/test.yml`. Three weren't invoked by `npm run`: `test:shop-commission` (a false positive — CI runs it by direct path in the E2E money-guard step), and genuinely-unwired `test:smoke` and `test:revenue`.

**`test:smoke` (`smoke-skills.mjs`) — WIRED.** It self-boots the server and asserts **every one of the 35 skills at `/api/skills` returns 200** on the mock-AI fallback path (no external deps/keys). Verified it passes standalone (`✅ ALL PASSED`, 35/35) and via `npm run test:smoke` (exit 0), then added a self-contained CI step. Real coverage gain: a new skill wired without a working handler, or a broken skill route, would now fail CI instead of shipping — and this is the single broadest guard on the product's core surface.

**`test:revenue` (`test-revenue-system.mjs`) — deliberately NOT wired.** Verified by running it (booting a server with `OMISE_WEBHOOK_SECRET`/`ADMIN_KEY`): it's **stale against two flow changes this project made after the test was written.** (1) Its affiliate signup omits `consent`, which `registerAffiliateCore` now hard-requires — a one-line fix got it past signup/deals/leaderboard. (2) But its Withdrawals section still expects the **old synchronous** withdraw (`POST /api/affiliate/withdraw` → `data.withdrawal.id`, then admin approve/paid), whereas the flow is now **email-confirm-first** (`/withdraw` emails an HMAC link and returns only `pending_balance`; the withdrawal is created on a later `/withdraw/confirm` POST) **and the `/withdraw` route hard-returns 503 without a configured `mailer`** — so the withdraw path simply can't run green in a no-SMTP CI env. Wiring it would make CI red; fixing it properly needs a rewrite of that section plus an SMTP mock, out of scope for a clean round. Reverted the one-line consent probe so the file is left untouched, and flagged it here for a dedicated rewrite. (This is exactly why verify-before-wire matters — the test guards behaviour that no longer exists.)

### 2026-07-24 — Hourly loop: SEO test coverage — the hand-maintained homepage JSON-LD @graph (brand entity, copied to every page) had no guard; added one

Audited the market-entry SEO surface. The homepage `index.html` carries a JSON-LD `@graph` — `Organization` (name/url/logo → the brand logo + knowledge panel in Google results), `WebSite`, and `SoftwareApplication` (the plan offers) — linked by `@id`, and `prerender-meta.mjs` copies this block **verbatim onto every prerendered route page**. **Verified everything is currently correct:** valid JSON, all three entities present, both `publisher.@id` refs resolve to the Organization `@id`, and every referenced image resolves on disk (`icon-512.png` logo, `og-image.png` — actual pixel size **1200×630**, matching both the `og:image:width/height` meta and the manifest `screenshots` `sizes`; `icon-192/512` match the manifest icons). So **no bug** — but this block is **hand-maintained** and had **no test**: `pricingFaqSchema.test.jsx` only covers the PricingPage FAQ, `routeMeta.test.js` only covers the per-route rewrite transform, `seoInvariants` only covers sitemap/robots. A single hand-edit that breaks the JSON, drops an entity, or dangles a `publisher.@id` would make the browser silently drop the whole `ld+json` block → rich results die **site-wide** (it's on every page) with no visible error. Given how central the brand entity is to market entry, that gap was worth closing.

**Added** `frontend/src/__tests__/homepageStructuredData.test.js` (5 tests) — parses the real `index.html` `@graph` and asserts: valid JSON + `@graph` shape; Organization/WebSite/SoftwareApplication all present; **referential integrity** (every `publisher.@id` resolves to the Organization `@id`, no dangling ref); Organization has name/url/logo; and the **logo + og:image files actually exist in `public/`** (a 404 logo = no logo in search results). **5/5 pass.** **Mutation-tested:** typo'ing a `publisher.@id` → the referential-integrity assertion fails; pointing the logo at a nonexistent file → the files-exist assertion fails; restored to green (`index.html` shows no git diff after). No new CI wiring needed — it's a frontend vitest file, auto-discovered by the `npm test` step the frontend CI job already runs. Same source-structural drift-guard family as `seoInvariants` / `routeMeta` / `portalConsent`. **No SearchAction / Organization.sameAs added** — those need a real site-search endpoint and verified social-profile URLs respectively, neither of which exists yet; adding them would fabricate capability (declined, per the verify-before-build discipline).

### 2026-07-24 — Hourly loop: test coverage — the affiliate withdraw CONFIRM flow (money-out) had no HTTP test; added a self-boot regression guard. Also cross-repo audit: v9.0 CI YAML fix + all-platform-files verified (no PDPA gap)

Audited the money-out path this round. `POST /api/affiliate/withdraw` emails an HMAC-signed confirm link; the actual withdrawal is created only when the affiliate presses the button (a **POST** to `/api/affiliate/withdraw/confirm`) — a plain **GET** on the link only renders the page, precisely so an email link-scanner/prefetch that auto-issues GETs can't trigger a payout. `finalizeWithdraw()` splices the pending record before creating the withdrawal, so it's idempotent (a double-click can't double-withdraw), and it re-checks the affiliate's available balance at finalize time. **The code is correct** — but the only existing test (`test-affiliate-withdraw-math.mjs`) covers just the reservedFor/affAvailable math; the HTTP confirm flow (HMAC gate, GET-safety, POST-idempotency) — the part that actually guards real money leaving the platform — had **no test**. Given how many money bugs a silent regression here would cause, that gap was worth closing.

**Added:** `scripts/test-affiliate-withdraw-confirm.mjs` — a hermetic self-boot test (snapshots the three JSON state files, seeds a known pending confirmation + an affiliate with a ฿500 earned balance, boots the real server with a known `JWT_SECRET` so it can compute the same HMAC token, then restores the files byte-for-byte). Asserts: (1) a wrong/missing token → **403** on both GET and POST; (2) a valid **GET** → 200 page but **zero** withdrawals created (bot-safe); (3) a valid **POST** → 200 + creates exactly one withdrawal, and a **second** POST with the same token → **404** with still exactly one withdrawal (idempotent, no double-payout). **9/9 pass.** **Mutation:** removing the `splice` in `finalizeWithdraw` makes the second POST succeed and create a second withdrawal → the two idempotency assertions fail; restored to green. Verified the three `data/*.json` files show no git diff after the run. Wired into a self-contained CI step (`test:withdraw-confirm`) alongside the other self-boot tests.

**Cross-repo audit this round (verify-before-build):** (a) **all-platform-files** — the 35 `*Onboarding.jsx` files looked like consent-collecting signup forms (a repo-wide `consent` search returned 0), but verifying the actual code shows they contain **no `fetch`/POST and no email/tel inputs — only `type="checkbox"` checklists**: they're interactive setup GUIDES, not PII-collecting forms, so there is **no PDPA gap** (the earlier `email`/`phone` grep hits were instructional text). No change — avoided manufacturing a fix from a false-positive. (b) **OpenThai-AI-v9.0** (separate PR #5) — fixed `.github/workflows/deploy.yml`, which was **invalid YAML** (a stray commit-message line inside the Deploy step's `with:` block made GitHub Actions fail to parse the whole workflow); verified it now parses. The `deploy` check still fails at `npm ci` because the repo is an incomplete Next.js scaffold (no `package.json`/lockfile), and `app/affiliate-hub/page.tsx` POSTs to a `/api/affiliate/apply` route that doesn't exist there — both need an owner architecture decision (standalone vs. proxy to the openthai-ai backend), flagged not guessed.

### 2026-07-24 — Hourly loop: resilience — generalize the affiliate "retry without the missing column" so the portal_leads / producers / disputes migration fixes stop losing records in production BEFORE the owner runs the alters

The last three rounds added columns (`portal_leads.consent`/`unsubscribed`, `producers.consent`, `order_disputes.counter_response`) that the code already writes but the live Supabase tables lack. Those SQL changes only help **once the owner runs the alter by hand** — and until then the writes still fail PostgREST's PGRST204 (unknown column) and fall back to the **ephemeral file store** (`/tmp` on Vercel, wiped on redeploy), i.e. the records are still being lost in production right now. Only the affiliate path (previous round) had the graceful "strip the column and retry" fallback, so only it was actually safe pre-migration. This round generalizes that fallback to the other three dual-mode writers so they persist durably to Supabase **immediately**, without waiting on the manual migration.

**Also completed the audit of the two remaining direct Supabase writers** (`ai_usage_log`, `user_sync` in server.js) — both write only columns their migrations declare, so no drift. Combined with earlier rounds, **every** dual-mode / direct Supabase writer in the repo is now accounted for: fixed (portal_leads, disputes, producers, affiliates) or verified clean (orders, inventory, credits, ai_usage_log, user_sync). Separately audited **smart-e** end-to-end this round (auth on every mutating route, symmetric stock/customer-spend on order cancel/uncancel with an idempotent guard, PromptPay QR sub-tag/CRC, broadcast + QR amount validation, analytics/dashboard consistently excluding cancelled orders) — 112/112 tests pass, **no change needed**.

**Change:** new shared, pure module `sb-column-fallback.js` — `missingColumnFrom(message)` extracts the offending column from a PGRST204 / "column … does not exist" error (and returns null for anything else, so unrelated failures never trigger a strip), and `stripColumn(body, col)` returns a copy of the (array or single) row without that column (null when the column isn't present, to avoid a pointless retry, and it never mutates the original). `persist()` in `portal-leads.js` / `producers.js` / `disputes.js` now, on a write failure, retries **once** with the offending column stripped before giving up to the file store. Stripping is the safe direction: the row still persists; the missing value just takes the column default (e.g. `consent=false`), which under-claims rather than over-claims — and once the owner runs the alter, the full value persists with no code change. (`affiliate-row.js`'s consent-specific fallback from last round is left as-is; it already ships and passes.)

**Verified + mutation-tested + booted:** `scripts/test-sb-column-fallback.mjs` (12/12 — column extraction is correct and narrow; strip is immutable and no-ops when absent). `scripts/test-portal-leads-fallback.mjs` (6/6 — an **integration** test that stubs `global.fetch` to emulate PostgREST rejecting `consent` on the first insert and accepting the stripped body on the retry, then drives the real `createPortalLeads().submit()`: two POSTs happen, the retry drops only `consent`, the core lead data survives, and the lead lands in "Supabase" — not the file store). **Mutation:** forcing `missingColumnFrom` to return null makes the integration test fall back to the file store with a single POST → 4 assertions fail; restored to green. **Boot smoke:** real server — portal-lead submit with consent → 200, without → 400 (the modified modules load and behave in file mode). `node --check` clean on all four. Wired both into the no-server unit block in `package.json` + `test.yml`. NOTE unchanged: the owner should still run the pending `alter`s so the columns' real values persist — the fallback just stops the core records from being lost in the meantime.

### 2026-07-24 — Hourly loop: PDPA — affiliate consent was enforced + kept in the file record but never persisted to Supabase (couldn't be proven in production)

Finished the consent-durability audit across all signup funnels. `registerAffiliateCore()` enforces `consent:true` (400s otherwise) and stores it in the affiliate record, and `saveAffiliate()` writes the full record to the JSON file — **but the Supabase mapper `_affToRow()` never emitted `consent`, and neither affiliates-table migration (`004_affiliate_tracking.sql`, `FULL-MIGRATION.sql`) declared the column.** So in Supabase mode (production) an affiliate's consent was silently dropped at the row level — the exact "can't prove consent" gap the `producers` / `portal_leads` hardening was meant to close, still open for the affiliate funnel. (Unlike those two this was **not** a write-failure: because `_affToRow` omitted `consent`, the insert matched the schema and succeeded — it just persisted no consent. The file record has it, but `/tmp` on Vercel is wiped on redeploy and boot reloads from Supabase, so the durable copy has no consent.)

**Why this needed care, not just "add the column to the mapper":** Vercel auto-deploys on every push, but the owner runs DB migrations by hand, so the code can start writing `consent` **before** the live table has the column. An unknown-column write is a PostgREST 400 (PGRST204) that fails the *whole* insert — which would have **regressed a currently-working signup funnel** into the ephemeral-file-store fallback (affiliate then lost on redeploy). So the fix is sequenced to be safe in either order:

- **Schema:** idempotent `add column if not exists consent boolean not null default false` on the affiliates table — in `004_affiliate_tracking.sql` (the canonical numbered migration) and `FULL-MIGRATION.sql` (the all-in-one, which also carries a second affiliates-table definition — noted a pre-existing drift there: `004` uses a UUID `id` PK + `user_id` FK while `FULL-MIGRATION` uses `ref_code` as PK; both upsert fine on the unique `ref_code`, left as-is).
- **Code:** extracted the mapper into a small testable module `affiliate-row.js` (`affToRow` now emits `consent: r.consent === true`, plus `rowWithoutConsent` and a narrow `isMissingConsentColumnError`), same pattern as `affiliate-payout.js` / `openrouter-map.js`. `saveAffiliate()` now retries the insert **once without `consent`** iff the write fails specifically because the `consent` column is missing — so pre-migration a real signup still persists to Supabase (consent stays in the file record), and post-migration consent persists with no second deploy. `_affFromRow()` reads `consent` back so a Supabase-loaded affiliate keeps the flag.

**Verified + mutation-tested + booted:** new deterministic `scripts/test-affiliate-row.mjs` (12/12 — consent maps to a real boolean, `rowWithoutConsent` strips only consent, `isMissingConsentColumnError` matches PGRST204 for consent but not unrelated errors / other columns / empty) and `scripts/test-affiliates-schema.mjs` (19/19 — derives the required column set from `affToRow()` itself and asserts the migration union declares every one, incl. consent). **Mutations:** dropping `consent` from the mapper fails the row test; removing the `004` alter fails the schema test; both restored. **Boot smoke:** spawned the real server — `POST /api/affiliate/apply` without consent → 400, with consent → 200 + ref_code (refactor keeps the funnel working end-to-end). `node --check` clean. Wired both into the no-server unit block in `package.json` + `test.yml`. **NOTE (same as the migration rounds):** the owner still needs to run the `consent` alter in the Supabase SQL editor for the live affiliates table; until then the code's fallback keeps signups persisting (just without the consent column), and it upgrades automatically once the alter is run.

### 2026-07-24 — Hourly loop: BUG — two more Supabase migrations missing columns the code writes (order_disputes.counter_response, producers.consent) → silent write failure 🔴

Generalized last round's `portal_leads` finding into a **systematic sweep of every dual-mode module that POSTs a whole record to Supabase** (`disputes`, `orders`, `producers`, `inventory`, `credits`) — comparing the exact object each `persist()` sends against the columns its migration declares. PostgREST validates **every key** in a write payload against its schema cache (even a `null` value) and rejects an unknown column with PGRST204 / HTTP 400 rather than dropping it, so any drift silently sends the write to the ephemeral file-store fallback (`/tmp` on Vercel, wiped on redeploy). **Two real drifts found, verified against the code:**

- **`order_disputes.counter_response`** — `disputes.js` `open()` writes `counter_response: null` on every record (disputes.js:125) and `respond()` sets it to an object when the other party replies (disputes.js:157); both parties read it in the public view. But `006_order_disputes.sql` never declared the column. So on a Supabase instance **every dispute insert and every counter-response update 400'd → file store**. Disputes are the **escrow** safety mechanism (money is *held* while one is open), so silently losing them on redeploy is worse than ordinary data loss — an open, funded dispute just vanishes from the system of record.
- **`producers.consent`** — `producers.js` `register()` writes `consent: true` on every application (the producer PDPA consent funnel), but no migration declared `producers.consent` (the base `producers-schema.sql` predates the consent hardening; `stock` was added by `001-shipping-stock.sql` but `consent` never was). So **every producer signup 400'd → file store** → producer applications silently lost in production. This is the exact same omission as last round's `portal_leads` — the consent-hardening pass added `consent` to the record shapes across modules but only some tables' migrations were updated.

**Fix:** idempotent alters matching what the code writes — `alter table public.order_disputes add column if not exists counter_response jsonb;` and `alter table public.producers add column if not exists consent boolean not null default false;`. SQL-only; the code was already correct. **NOTE (same as last round):** a migration file in the repo is not proof it ran against the live Supabase project — the owner must run both `alter`s in the Supabase SQL editor for the production tables. The file + tests only guarantee code and schema *definitions* now agree.

**Audited clean this round (no change needed):** `orders` (every rec key — incl. escrow_status via 006 and the shipping fields via 001 — is declared), `inventory` (both `products` and `stock_movements` records fully match `002-inventory.sql`), and `credits` (writes via a `toRow()` mapper that emits only defined columns — the safe pattern that structurally can't drift).

**Verified + mutation-tested:** two new deterministic guards, `scripts/test-disputes-schema.mjs` (13/13) and `scripts/test-producers-schema.mjs` (14/14 — reads the union of `producers-schema.sql` + `001-shipping-stock.sql` since producer columns span both files), each parsing the migration's declared columns and asserting every column the backend writes is present. **Mutations:** removing each new `add column` line fails the relevant assertions; both restored to green. No server / no DB. Wired into the no-server unit block in `package.json` + `test.yml`. Same source-structural drift-guard family as `test-portal-leads-schema` / `seoInvariants` / `portalCategories`.

### 2026-07-24 — Hourly loop: BUG — portal_leads Supabase migration was missing `consent` + `unsubscribed` → every lead silently failed the Supabase write (PDPA) 🔴

Found auditing the consent-funnel end-to-end (the /portals/* → `submitLead` → `POST /api/leads/submit` → `portal-leads.js` → Supabase path). **Verified against the code:** `submit()` builds a record that includes `consent: true` (portal-leads.js:86) and `unsubscribe()` PATCHes `unsubscribed: true`; `sendConsumerDigest()` (server.js:1298) filters `!l.unsubscribed` before emailing. But `migrations/007_portal_leads.sql` created the table with only `id / type / lang / name / email / form_data / created_at` — **neither `consent` nor `unsubscribed` was ever a column.** PostgREST rejects any write that names a column not in its schema cache (PGRST204 / HTTP 400) — it does **not** silently drop the extra key. So on a Supabase-configured instance (production), the consent hardening that added `consent:true` to the record turned **every** `persist()` into a 400 → caught → fell back to the **ephemeral file store** (`/tmp` on Vercel, wiped on every redeploy) → portal leads silently lost. And `unsubscribe()`'s PATCH hit the same 400 → caught → fell through to the file loop, which matches nothing (the rows live in Supabase) → the user is shown "✅ ยกเลิกแล้ว" while the row is never marked → the weekly consumer digest keeps emailing someone who opted out (a real PDPA violation, not just data loss). This is the most impactful of the recent finds because it silently defeats the persistence + PDPA-unsubscribe the earlier consent work was built to guarantee.

**Fix:** add both columns to the migration as **idempotent** alters — `alter table public.portal_leads add column if not exists consent boolean not null default false;` and the same for `unsubscribed` — so the schema matches exactly what the code writes/filters, and re-running the migration is safe. (Also refreshed the `type` comment to include the `consumer`/`middleman` portals added since.) SQL-only change; no code change needed — the code was already correct, the schema had drifted behind it. **Note:** a migration file in the repo does not mean it has been run against the live Supabase project (per `PROJECT_STATUS.md`) — the owner still needs to run this `alter` in the Supabase SQL editor for the production table; the file + test guarantee code and schema now agree.

**Verified + mutation-tested:** new deterministic `scripts/test-portal-leads-schema.mjs` (no server, no DB) parses the migration's declared columns (create-table body + `add column` alters) and asserts every column the backend depends on is present — `consent` / `unsubscribed` included — plus that both were added as idempotent alters. **11/11** via `npm run test:portal-leads-schema`. **Mutation:** removing the two `add column` lines makes the four consent/unsubscribed assertions fail; restored to green. Wired into the no-server unit block in `package.json` + `test.yml`. Same source-structural drift-guard approach as `seoInvariants` / `portalCategories` / `portalConsent`. Also re-audited this round with **no change needed**: `pr-communications.js` (pure JSON getters/setters, hardcoded filenames — no path injection), the 9 `/portals/*` pages (all send `consent` in the `submitLead` body, gate submit on `!consent` — already guarded by `portalConsent.test.js`), `submitLead.js` (honest 4xx/5xx handling), the consumer-digest category matching (aligned across FE/BE, guarded by `portalCategories.test.js`), and the unsubscribe HMAC token flow (email is lowercased at storage so sign/verify agree).

### 2026-07-23 — Hourly loop: BUG — progress-tracker `updateManualKpi` guard was dead code → 500 + hung request on an unknown KPI key

Found continuing the module-by-module audit (`progress-tracker.js`, which backs the admin `PATCH /api/progress/kpi` manual-override route). **Verified against the code:** the intended "KPI key doesn't exist → return a clean error" guard was written as

```js
if (!snapshot.guilds[guildId].kpis[kpiKey] === undefined) return { ok: false, error: 'ไม่พบ KPI' };
```

which is an operator-precedence bug: `!x` binds tighter than `===`, so it evaluates `(!snapshot…kpis[kpiKey]) === undefined` — a boolean compared to `undefined`, **always false**. The guard was dead code (note the guild guard on the line above is written correctly, `if (!snapshot.guilds[guildId])`, so the `!`-then-`===undefined` form was clearly an accident). Consequence: a valid `guild_id` with a typo'd/unknown `kpi_key` falls straight through to `snapshot.guilds[guildId].kpis[kpiKey].value = value` → `undefined.value = …` → **TypeError**. The Express route handler is `async` with no try/catch, and Express 4 does not forward a thrown async rejection to the error middleware, so the request **hangs until timeout** and an `unhandledRejection` is logged (worse than a plain 500). Admin-key gated, so not a public exposure — a robustness/correctness bug on a real admin path.

**Fix:** drop the stray `!` so the guard reads `if (snapshot.guilds[guildId].kpis[kpiKey] === undefined) return { ok:false, error:'ไม่พบ KPI' }`, matching the guild guard directly above it. One character, restores the intended validation and removes the throw path.

**Verified + mutation-tested:** new deterministic `scripts/test-progress-kpi.mjs` (no server, no network — `createProgressTracker(tmpDir, {})` uses built-in defaults, writes only into a throwaway temp dir): valid guild + valid kpi → `{ ok:true }`; valid guild + **unknown kpi** → does not throw and returns `{ ok:false, error:'ไม่พบ KPI' }`; unknown guild → `{ ok:false, error:'ไม่พบ guild' }`. **4/4** via `npm run test:progress-kpi`. **Mutation:** restoring the stray `!` makes the unknown-kpi case throw `Cannot set properties of undefined (setting 'value')` again → the two relevant assertions fail; restored to green. `node --check` clean. Wired into the no-server unit block in `package.json` + `test.yml`. Also audited this round with **no change needed**: `vector-memory.js` (the `/api/memory` store/GET are intentionally public — CouncilPage uses them as a shared `council-bridge` collaboration board; delete/clear are already admin-key gated) and `agent-tools.js` (tools are read-only lookups plus a registered-webhook-only write path — the model never picks a destination URL).

### 2026-07-23 — Hourly loop: SECURITY — every corporate GET route was public while its PATCH required login (internal-data disclosure) 🔴

Found continuing the security-surface audit (`corporate-system.js` + its routes in server.js). **Verified against the code:** all the corporate *mutations* are properly gated — `app.patch('/api/corporate/*', requireAuth, corpLimiter, …)` (board / finance / hr / esg / ir / compliance / global / pr-releases / pr-contacts / pr-campaigns / pr-kols / tasks / kpis). But every corresponding **GET** was mounted with **no auth** — `app.get('/api/corporate/board', (req,res) => res.json({ data: corporate.getBoard() }))`, and the same for finance, hr, esg, ir, compliance, global, overview, and the PR sub-routes. So anyone unauthenticated could read internal governance data: the board roster (incl. the real Chairman/CEO name), finance, HR, investor-relations, ESG, compliance filing status, and — most sensitively — **PR media contacts** (journalist names/emails → PDPA personal data). The React corporate pages sit behind a client-side login guard, but the API itself was open. Same client-side-only-authorization shape as the video/integrations fixes, but read-side.

**Fix:** `requireAuth` on **all 16** corporate GET routes, matching their PATCH counterparts. The corporate pages already send `Authorization: Bearer <auth_token>` on their PATCH calls; their GET loads did not (the routes were public), so I added the same header to the 15 GET fetches across the 9 corporate pages (BoardPage, FinancePage, HRPage, ESGPage, InvestorRelationsPage, CompliancePage, GlobalOpsPage, CommandCenterPage, PRCommsPage), using `localStorage.getItem('auth_token')` uniformly (a couple of read-only pages had no `token` var). No data model change.

**Verified + mutation-tested:** new self-booting `scripts/test-corporate-auth.mjs` (spawns the real server with a known `JWT_SECRET`, signs a Bearer token): the sensitive reads (finance / hr / board / ir / pr/contacts / overview) all return **401** without a token and **200** with a valid one. **9/9** via `npm run test:corporate-auth`. **Mutation:** ungating one route (`/api/corporate/finance`) makes it readable unauthenticated → that assertion fails, restored to green. `node --check` clean; **frontend `npm run build` clean** (all 15 GET fetches updated, PATCH calls untouched — verified no bare corporate GET remains). Wired into `package.json` + a self-contained CI step.

### 2026-07-23 — Hourly loop: SECURITY — /api/video/generate was unauthenticated (paid-video budget drain) + a mock-provider 500 bug 🔴

Found continuing the security-surface audit (`video-generator.js` + its routes in server.js). **Two real issues, verified against the code:**

**(1) Auth — the money one.** `POST /api/video/generate` submits a real job to a paid video provider (Runway / Pika / Kling / Luma / Veo) using the **platform's own** API keys (`process.env.RUNWAY_API_KEY`, …) — video generation is expensive per clip. The route had only `videoLimiter` (10/min), no auth. The `/video` React page is behind a client-side login guard (`isAuthenticated ? … : <Navigate to="/login">`) and already sends the Bearer login token, but the API itself was public — so anyone bypassing the SPA could `POST /api/video/generate` up to 10/min and bill the platform's video budget (also `GET /api/video/jobs` leaked every job's product + generated script, and `/jobs/:id/status` polled providers with the platform key). Same client-side-only-authorization shape as the integrations fix. **Fix:** `requireAuth` middleware on all three routes (`generate`, `jobs`, `jobs/:id/status`) — it verifies the Bearer login JWT the page already sends, so no frontend change and no legit flow breaks. (Chose `requireAuth` over the `x-admin-key` gate here specifically because this page authenticates with the Bearer token, unlike the integrations page.)

**(2) Bug found while testing (1) — the default path 500'd.** The route defaults `provider` to `'mock'` when the caller doesn't pick one, but `submitToVideoAPI` did `const p = VIDEO_PROVIDERS[provider]; if (!p) throw` — and `'mock'` is **not** in `VIDEO_PROVIDERS`, so the script-only/mock path (the common default) **always threw → 500**. Writing the auth test surfaced it (an authorized call 500'd instead of returning the script). **Fix:** check `provider === 'mock' || !apiKey` FIRST and return the queued mock job, then validate a real provider — so script-only mode works and a genuinely unknown provider still errors.

**Verified + mutation-tested:** new self-booting `scripts/test-video-auth.mjs` (spawns the real server with a known `JWT_SECRET`, signs a Bearer token, no provider keys / no external calls): generate without a token → **401**, invalid token → **401**, valid token → **200 + script** (mock provider), `GET /api/video/jobs` → 401 without / 200 with. **6/6** via `npm run test:video-auth`. **Mutations:** dropping `requireAuth` makes the unauthenticated generate return 200 (auth assertions fail); reverting the mock-provider fix makes the authorized generate 500 again — each restored to green. `node --check` clean (server.js + video-generator.js); no frontend change. Wired into `package.json` + a self-contained CI step. Also confirmed **voice-commander.js is safe** this round: its `run_agent` / `memory_search` actions are advertised in the intent prompt but not implemented in the executor switch (they fall through to "unknown"), and the only costly action (`generate_content`) is rate-limited.

### 2026-07-23 — Hourly loop: SECURITY — the integration publish/test endpoints were unauthenticated (broadcast-spam vector) 🔴

Found continuing the security-surface audit (`integrations.js`, mounted at server.js `app.use(integrations.router)` with **no auth middleware**). **Verified against the code + the frontend:** `POST /api/integrations/:id/publish` acts with the platform's OWN server-side social tokens — for LINE it calls `https://api.line.me/v2/bot/message/broadcast`, i.e. a message to **every follower** of the OA; for Facebook it posts to the page feed. The route had only `generateLimiter` (rate limit), no authentication. The React page (`/integrations`) is behind a client-side login guard (`isAuthenticated ? … : <Navigate to="/login">`), but the API itself was public — so anyone bypassing the SPA could `POST /api/integrations/line/publish {"content":"spam"}` and broadcast to all followers using the platform's token (reputational damage, LINE OA / FB page ban, spam to real users). `:id/test` and `canva/export` were likewise open (both use the tokens/keys). Classic client-side-only authorization.

**Fix:** `createIntegrations` now takes a `requireAdmin` guard and enforces it on the three state-changing / token-using routes (`:id/test`, `:id/publish`, `canva/export`), using the SAME `x-admin-key` / `checkAdminKey` gate every `/api/*/admin/*` route already uses (server.js passes `invAuth`). The read-only status list (`GET /api/integrations`) and `analytics/live` stay public (used on page load; they expose only aggregate/connection state — a lower-priority hardening noted for later). Frontend: `IntegrationHubPage.jsx` now sends `x-admin-key` on test/publish the same way `AdminPage.jsx` does (`sessionStorage.admin_key` → build-time default for dev) — the page was already login-gated, so no legit flow breaks. Dev default key unchanged; on Vercel `ADMIN_KEY` must be set (no public fallback, per resolveAdminKey).

**Verified + mutation-tested:** new self-booting `scripts/test-integrations-auth.mjs` (spawns the real server with a known `ADMIN_KEY`, no external services): publish without the key → **401**, wrong key → **401**, correct key → **200 queued** (LINE has no token in-env, so an authorized publish is accepted+queued, proving it passed auth); `test` → 401 without / 200 with; `GET /api/integrations` still **200** public. **7/7** via `npm run test:integrations-auth`. **Mutation:** dropping `requireAdmin: invAuth` from the server.js wiring makes the unauthenticated publish/test return 200 → 3 assertions fail, restored to green. `node --check` clean (integrations.js + server.js); frontend `npm run build` clean + suite **249/249**. Wired into `package.json` + a self-contained CI step.

### 2026-07-23 — Hourly loop: hardening — the MCP endpoint had no batch-size cap (cost-amplification / resource exhaustion)

Found continuing the security-surface audit (`mcp-handler.js`, the `POST /mcp` JSON-RPC endpoint that lets external AI agents call Openthai.ai tools). **Verified against the code:** `handleMcp` supports JSON-RPC batches via `Promise.all(body.map(processOne))` with **no cap on `body.length`**. Several tools (`generate_content`, `generate_ab_test`, `analyze_image`, `competitor_analyze`) proxy to a real, **paid** AI call (Claude/Gemini). The route's `mcpLimiter` is `60 requests/min` — but it counts *requests*, not the tool calls *inside* a batch, so a single request carrying a 10,000-element array fanned out to 10,000 concurrent AI calls (real cost + event-loop / provider-quota exhaustion), entirely under the request limit. **Checked the two things that would have made it worse and found them OK:** `/mcp` *is* rate-limited (not unauthenticated-unlimited), and the internal `X-MCP-Client: mcp-internal` header is **not** trusted anywhere (`grep` across the backend is empty), so it's not an auth-bypass — the gap is purely the unbounded batch.

**Fix:** cap the batch at `MAX_BATCH = 20` (MCP clients like Claude Desktop send one request at a time; a real batch is tiny) and reject it **before** any element is processed — plus reject an empty `[]` batch, which JSON-RPC 2.0 defines as invalid. Both return a single `-32600` JSON-RPC error with HTTP 400. Non-batch requests and in-limit batches are unchanged.

**Verified + mutation-tested:** new `scripts/test-mcp-batch.mjs` drives `handleMcp` with a mock req/res using only local methods (`initialize` / `tools/list`, so nothing hits the network): a 21-element batch → 400 + a single `-32600` error (not a processed array); an empty batch → 400; a 20-element batch → an array of 20 real results; a 2-element batch and a single request still work. **9/9** via `npm run test:mcp-batch`. **Mutation:** disabling the size check lets the 21-element batch through (200, processed) → the three over-size assertions fail, restored to green. `node --check` clean on mcp-handler.js + server.js; **boot smoke** `/api/health` 200. Wired into `package.json` + the CI Unit-tests step. Backend-only.

### 2026-07-23 — Hourly loop: SECURITY — tenant login accepted an email with no secret (full authentication bypass) 🔴

**Highest-severity finding of the session — flagging explicitly for the owner.** Found auditing `tenant-manager.js` (multi-tenant system, previously untested). **Verified against the code AND the live route:** `POST /api/tenants/login` forwards `{email, apiKey}` straight to `tenants.login()`, whose old body was:
```
if (apiKey) tenant = verifyApiKey(apiKey);
else if (email) tenant = tenants.find(t => t.email === email…);   // ← no secret checked
… const token = signTenantToken(tenant);   // 30-day JWT
```
The tenant system has **no password** — the API key (shown once at register, stored only as a sha256 hash) is the *only* credential, and email is not secret. So `POST /api/tenants/login {"email":"victim@shop.co"}` returned a **valid 30-day tenant JWT for that tenant with no credential at all** — a complete authentication bypass. With that token an attacker could `GET/PATCH /api/tenants/me` (read + overwrite the victim's brand settings), **`POST /api/tenants/:id/rotate-key`** (rotate the victim's API key, locking them out), and burn their plan quota. Email addresses are semi-public and are the register input, so this is trivially exploitable.

**Fix:** `login()` now REQUIRES a valid API key (`const tenant = apiKey ? verifyApiKey(apiKey) : null; if (!tenant) throw`). Email, if supplied, is only an optional consistency check (`tenant.email !== email` → throw), never an auth path. No frontend used email-only login (grep of `frontend/src` for `tenants/login` is empty), so nothing legitimate breaks. **Note for the owner:** if you want an account-recovery path for a tenant who lost their API key, it needs a *real* verified mechanism (emailed magic-link / OTP) — not an unauthenticated email lookup. Not building that unprompted (rule #8); the bypass itself had to be closed now.

**Verified + mutation-tested:** new `scripts/test-tenant-login.mjs` (hermetic — temp `writeDir`, no state leak): email-only / email+empty-key / no-credential / wrong-key all **throw** (no token); a valid key issues a token that resolves back to the tenant; a matching email is fine (case-insensitive); a valid key + mismatched email throws. **10/10** via `npm run test:tenant-login`. **Mutation:** re-adding the `else … email` fallback makes the two email-only-bypass assertions fail (8/2), restored to green. `node --check` clean; **boot smoke** `/api/health` 200. Wired into `package.json` + the CI Unit-tests step. Backend-only.

### 2026-07-23 — Hourly loop: bug fix — a malformed `code` on POST /api/auth/recovery crashed with a 500 instead of a clean auth rejection

Found auditing `auth.js` (previously untested). **Verified against the code AND by running:** `useRecoveryCode(inputCode)` does `inputCode.trim()` after the `RECOVERY_CODES` presence check. The `/api/auth/recovery` route guards `if (!code)`, which blocks a *falsy* code — but a **truthy non-string** body value like `{"code":123}`, `{"code":{}}`, or `{"code":["x"]}` (all valid JSON) sails past `!code` and hits `.trim()` → **`TypeError: inputCode.trim is not a function`** → an unhandled **500** on an authentication endpoint. Reproduced directly against the exported function (RECOVERY_CODES set, feeding a number / object / array → all threw). Same "malformed input → clean rejection, not a 500" contract the rest of the codebase enforces (smart-e's non-object-body 400, the null-safety fixes).

**Fix (guard at the function boundary):** `if (typeof inputCode !== 'string') return false;` at the top of `useRecoveryCode` — a non-string code is simply invalid, so the route returns its normal 401 instead of crashing. Also added `.used-recovery-codes.json` (the runtime one-time-code state file written next to auth.js) to `backend/.gitignore` — it's per-deploy state like the other gitignored `data/*.json` files and must not be tracked.

**Verified + mutation-tested:** new `scripts/test-recovery-code.mjs` (hermetic — snapshots/restores `.used-recovery-codes.json` so it never leaks state): non-string inputs (number/object/array/undefined/null) all return false without throwing; no configured codes → always false; a valid code works exactly once and is case-insensitive; a reused or never-issued code → false. **11/11** via `npm run test:recovery-code`. **Mutation:** removing the `typeof` guard makes the five non-string cases throw again (**5 fail**), restored to green; hermetic restore confirmed (no stray state file). `node --check` clean; **boot smoke** `/api/health` 200 with auth.js in the graph. Wired into `package.json` + the CI Unit-tests step. Backend-only.

### 2026-07-23 — Hourly loop: robustness — the OpenRouter AI wrapper threw a cryptic TypeError on a malformed/content-filtered response

Found auditing the AI client selection in `server.js` (the Claude-via-OpenRouter fallback used when `OPENROUTER_API_KEY` is set). **Verified against the code:** the wrapper ended with `return { content: [{ text: data.choices[0].message.content }] }` — completely unguarded. Real OpenRouter failure shapes that don't populate `data.error` break it: an empty/omitted `choices` array → `data.choices[0]` is `undefined` → **`TypeError: Cannot read properties of undefined (reading '0')`**; and a **content-filtered** completion returns `message.content: null`, which the old code passed straight through as `{ text: null }` — later string handling (`.trim()`, etc.) then blew up somewhere less obvious. Either way the platform's hybrid AI fallback (Claude → Gemini → mock) still catches the throw, so users aren't hard-broken, but the error is cryptic and a content-filter is indistinguishable from an outage in the logs.

**Fix (extract pure logic + guard):** pulled the request/response mapping into `backend/openrouter-map.js` — `mapModel(model)` (the Anthropic→OpenRouter model-id map, previously an inline ternary) and `extractText(data)` (maps the OpenRouter chat-completions body to the Anthropic `{ content:[{text}] }` shape, and throws a **clear** Error on an error body / missing choices / empty choices / non-string content). server.js now calls those two. Same "pure logic in a module for deterministic unit testing" pattern as affiliate-payout.js / affiliate-withdraw-math.js. Behaviour on a valid response is unchanged; malformed responses now fail cleanly so the fallback logs something actionable.

**Verified by running + mutation-tested:** new `scripts/test-openrouter-map.mjs` (no network — pure functions): model-id mapping (known ids, unknown `claude-*` namespaced, non-claude passthrough, non-string no-throw) and `extractText` (good response → text; empty-string content valid; error body → its message; missing/empty choices → clear "no message content"; content-filtered `null` → throws not silent; null body → "empty response"). **14/14** via `npm run test:openrouter-map`. **Mutation:** deleting the `typeof text !== 'string'` guard makes the missing-/empty-choices/null-content cases stop throwing → **3 fail**, restored to green. `node --check` clean on server.js + the new module; **boot smoke** — server still answers `/api/health` 200 with the new import. Wired into `package.json` + the CI Unit-tests step. Backend-only.

### 2026-07-23 — Hourly loop: a11y — /portals/* didn't update <html lang> when switching language (WCAG 3.1.1 / 3.1.2)

Found auditing the multilingual consent funnel. **Verified against the code:** the global i18n already does the right thing — `i18n/index.jsx` sets `document.documentElement.lang = lang` whenever its language changes. But each `/portals/*` page manages its **own local** `lang` useState (it does not use the global `useLang()`), and its mount effect set only `document.title`, never `document.documentElement.lang`. So a visitor who opened `/portals/producer` and switched to English or 中文 saw English/Chinese copy under a stale `<html lang="th">`, and a screen reader applied **Thai** pronunciation rules to non-Thai text (WCAG 3.1.2 Language of Parts). The two English-default portals (`gov-intl`, `intl-org`) were even wrong on first paint — English content under `lang="th"`. Same "the global does it right, the inline portals regressed it" shape as the aria-pressed and role=status fixes.

**Fix:** each portal's existing title effect now also runs `document.documentElement.lang = lang` and lists `lang` in its deps — matching the global i18n pattern (same raw codes th/en/zh, so it stays consistent with what the global sets). No visual change.

**Verified by running + mutation-tested:** new `frontend/src/__tests__/portalHtmlLang.test.jsx` — a real **render** test (not a source scan): it mounts each of the 9 portals in a MemoryRouter, asserts `document.documentElement.lang` equals the portal's default language on mount, then fires the English / ไทย switch buttons and asserts the attribute updates live. **27/27** (9 × 3). **Mutation:** reverting one portal's effect back to `}, [t.title])` fails exactly that portal's 3 assertions (24/3), restored to green. Full frontend suite **249/249** across 22 files; `npm run build` clean (22-URL sitemap intact). CI runs it via the existing `npm test -- --run`.

**Also flagged to the owner (rule #8, awaiting decision):** `otop-ai-landing/index.html` ships `og:image`/`twitter:image` as root-relative URLs (`/og-image.png`), which Facebook/LINE/X cannot resolve → the share preview image is broken; the page also has no `<link rel="canonical">` and no `og:url`. All three need that site's own production domain, which is **not** determinable from the repo (robots.txt has no Sitemap/Host, the HTML has no self-referential absolute URL, the JSON-LD points only at the parent openthai-ai.com). Guessing the domain would be worse than the status quo (a wrong absolute URL fails 100% of the time; a relative one at least sometimes resolves), so this stays **deferred** pending the owner confirming the otop-ai-landing domain — not fixed this round.

### 2026-07-23 — Hourly loop: bug fix — an approved producer editing their listing could silently lose their category (self-serve funnel, file-store only)

Found auditing the producer self-serve path (`producers.js` — the "manage my own listing" funnel an approved producer reaches via `/api/producers/update-listing`, rule #2's producer/product scope). **Verified against the code AND by running:** `updateListing()` builds a partial patch, and its category line was `if (fields.category !== undefined) patch.category = CATEGORIES.includes(fields.category) ? fields.category : undefined;`. When a producer edits (say) only their **price** but the client also submits a category that is no longer in `CATEGORIES` (a renamed/removed category, or a stale value), `patch.category` became `undefined` — and the file-store apply `store[e] = { ...store[e], ...patch }` then **overwrote the producer's existing valid category with `undefined`**, silently dropping them out of `/api/producers/search?category=…`. It was invisible in the API response too: the returned `{ ...patch }` has `category: undefined`, which `JSON.stringify` omits, so the response looked clean. **This was also a file-vs-Supabase inconsistency:** in SB mode the same `undefined` is dropped by `JSON.stringify` before the PATCH, so Supabase left the category unchanged — only the file fallback wiped it. Notably `register()` already normalises an unknown category to `'อื่นๆ'` (never `undefined`), so the two paths disagreed.

**Reproduced before fixing** (temp file-store): register `category:'OTOP'` → approve → `updateListing({ price:120, category:'<invalid>' })` → category became `undefined`. **Fix:** treat an invalid category on a *partial* update as "leave the current one" — `if (fields.category !== undefined && CATEGORIES.includes(fields.category)) patch.category = fields.category;`. A valid category still changes; an unknown one is ignored instead of wiping. This makes file-mode match SB-mode. **Re-ran the repro → category preserved.**

**Considered but did NOT do (rule #8):** PR #79 queued "self-serve product listing for approved producers". On inspection the producer self-serve path already exists end-to-end (`/api/producers/apply` → `/my-status` → `/update-listing`, email-match identity like disputes.js, approved-only via `selfUpdate`). The remaining "gap" is that `inventory.js` **shop** products (the real-money `/api/shop/checkout` catalog) are a *separate* admin-only system from the producer catalog — merging them, or letting arbitrary approved producers inject real-money public shop products, is a moderation/consumer-protection **policy** decision on a real-money public surface. Not building that unilaterally; flagging it for the owner instead. Fixed the concrete, verifiable bug in the existing funnel this round.

**Verified + mutation-tested:** extended `scripts/test-producers.mjs` (deterministic file-store, no Supabase) with an `updateListing`/self-manage block: valid category change persists; an unknown category alongside a price edit is ignored and the existing category is preserved (not wiped); price ≤ 0 → null and negative stock → 0 on the self-serve path (same money guards `inventory.js` enforces); unknown-email update refused. **28/28** via `npm run test:producers`. **Mutation:** restoring the old `… : undefined` line fails exactly the "existing category preserved" assertion (27/1), restored to green. `node --check` clean on producers.js + server.js; `test:credits` / `test:inventory` still green. Backend-only, already wired in CI (`npm run test:producers`).

### 2026-07-23 — Hourly loop: a11y — the /portals/* language switcher exposed the active language by colour only (WCAG 1.4.1 / 4.1.2)

Found continuing the /portals/* funnel audit. **Verified against the code:** each of the 9 portal pages and the `/portals` hub renders its own inline language switcher — `['th','en','zh'].map(l => <button onClick={() => setLang(l)} style={{ background: lang===l ? '#…' : 'none' }}>ไทย/English/中文</button>)`. The currently-selected language was signalled **only by the button's background colour**: a screen-reader user tabbing across the three buttons heard "ไทย / English / 中文" as three identical plain buttons with no indication which was active, and a colour-blind user couldn't tell either. That's a **WCAG 1.4.1 (Use of Color)** + **4.1.2 (Name, Role, Value — toggle state not exposed)** failure on the platform's main onboarding surface. Notably the project **already ships the correct pattern** in `components/LanguageSwitcher.jsx` (`role="group"` + `aria-pressed`, and it varies `fontWeight` so state isn't colour-only) — these 10 inline copies had silently regressed it.

**Fix:** each inline switcher button now carries `aria-pressed={lang===l}` (a toggle-button state assistive tech announces as "pressed/selected") plus `type="button"`, matching the shared component. Colour still conveys the same state for sighted users — no visual change. Frontend-only.

**Verified by running + mutation-tested:** new `frontend/src/__tests__/portalLangSwitcherA11y.test.js` — source-structural drift guard (same no-render approach as portalStatusRegion / portalConsent / trackFormsA11y) over the 9 portals + the hub: every `<button …setLang(l)…>` must expose `aria-pressed`. Matched **line-wise** on purpose — a `<button[^>]*>` regex breaks because the `=>` in `onClick={() => setLang(l)}` contains a `>` that ends the match early (caught this while writing the test: the first version reported 0 buttons; fixed the matcher, re-confirmed it finds all 10). **20/20** (10 files × 2). **Mutation:** stripping `aria-pressed` from one portal fails exactly that portal's assertion (19 pass / 1 fail), restored to green. Full frontend suite **222/222** across 21 files; `npm run build` clean (prerender + 22-URL sitemap intact). CI runs it via the existing `npm test -- --run` (vitest auto-discovers `src/__tests__/*`).

### 2026-07-23 — Hourly loop: a11y — the consent-based signup confirmation was silent to screen readers on all 9 /portals/* pages (WCAG 4.1.3)

Found auditing the /portals/* signup funnel (the producer/consumer/middleman/affiliate/creator/foundation/gov/intl-org consent forms in rule #2's scope). **Verified against the code:** every portal renders `sent ? <success div> : <form>`. On submit, React swaps the whole `<form>` out for the success div ("ส่งคำขอเรียบร้อย! ทีมงานจะติดต่อกลับ…"). The submit button that had focus is now gone, so a **screen-reader user gets no announcement that their signup succeeded** — a silent visual-only change. The *error* path was already correct (`{err && <div role="alert">…}` — an assertive live region that announces), so the two outcomes were announced asymmetrically: failures spoke, successes were silent. That's a WCAG 2.2 **4.1.3 Status Messages** failure on the platform's primary onboarding surface — the exact users rule #2 is meant to serve.

**Fix (mirror the working error idiom):** the success container now carries `role="status"` — an implicit `aria-live="polite"` + `aria-atomic` region — on all 9 pages. This mirrors the error's `role="alert"`, the same conditionally-rendered live-region pattern already proven to announce on these pages, so it needs no structural rework and no always-mounted wrapper. Frontend-only, no behaviour change for sighted users.

**Verified by running + mutation-tested:** new `frontend/src/__tests__/portalStatusRegion.test.js` — a source-structural drift guard (same no-render approach as portalConsent / portalFieldCollision / trackFormsA11y) asserting, for each of the 9 portals, that the `sent ? <div …>` success container has `role="status"` AND the error region keeps `role="alert"`. **19/19** (1 count + 9×2). **Mutation:** stripping `role="status"` from one portal fails exactly that portal's success-container assertion (18 pass / 1 fail), restored to green. Full frontend suite **202/202** across 20 files; `npm run build` clean (prerender + sitemap intact). Vitest auto-discovers `src/__tests__/*` so CI's existing `npm test -- --run` runs it — no workflow change needed.

### 2026-07-23 — Hourly loop: bug fix — the Omise webhook receiver re-fired 'payment.completed' on every redelivery of a charge.complete event (idempotency)

Same class as the status-poll fix below, but on the `POST /api/payment/webhook` receiver. **Verified against the code:** inside `if (key === 'charge.complete' && data?.paid)`, the once-only work is properly guarded — the entitlement / receipt / affiliate-credit by `rec && !rec.paid_at`, the shop-order finalize by `ord.status === 'new'` — but `webhooks.dispatch('payment.completed', …)` sat **unguarded at the end of the block**, so it fired on *every* delivery. Omise webhooks are **at-least-once** (Omise retries and can resend the same event), so a redelivery re-emitted `payment.completed` to external subscribers, who then double-processed one payment.

**Why the naive fix was wrong (and what I did instead):** simply gating the dispatch on `rec && !rec.paid_at` would have DROPPED `payment.completed` for **recurring subscription cycles** — each monthly charge has its own `charge_id` that is never stored in `payments[]` (the record holds the `subscription_id`), so those events have no local record and no dedup anchor. Instead I anchored the dispatch to each case's existing dedup state: (1) inside the `rec && !rec.paid_at` block (plan/quickpay/first subscription charge — anchor: `paid_at`), (2) inside the shop finalize's `status === 'new'` guard (anchor: order status; fires on both the confirmed and the oversold-refund branch, since the charge was paid either way), and (3) for a charge with **neither** a record nor a shop order (a recurring cycle) it stays unconditional — at-least-once, behaviour deliberately unchanged since it can't be deduped locally.

**Also made `OMISE_API_URL` env-overridable** — already done in the status-poll commit; reused here. **Verified by running + mutation-tested:** new self-booting `scripts/test-webhook-idempotent.mjs` (mock-payment mode so quickpay stores a record without real Omise; `OMISE_WEBHOOK_SECRET` signs the event; a local collector is the registered `payment.completed` subscriber; hermetic clear of the gitignored `webhooks.json`/`payments.json`). A quickpay charge whose signed `charge.complete` is **delivered twice** yields `payment.completed` **exactly once**; an anchorless (recurring) charge delivered twice still yields **two** (unchanged). **7/7** via `npm run test:webhook-idempotent`. **Mutation:** making the anchorless dispatch unconditional makes the quickpay charge fire **three** times (fails exactly-once), restored to green. Also re-ran the **affiliate-flow E2E** (signup→quickpay→webhook→credit→tier) → **28/28**, confirming the credit path through this handler is intact. `node --check` clean; wired into `package.json` + a self-contained CI step. Backend-only.

### 2026-07-23 — Hourly loop: bug fix — the payment status poll re-fired the 'payment.completed' webhook on every poll after a charge was paid (idempotency)

Found auditing `/api/payment/status/:chargeId` (server.js). **Verified against the code:** when a polled charge is paid, everything that must happen once — marking the record paid, granting the entitlement, sending the receipt, crediting the affiliate — is guarded by `firstTime = rec && !rec.paid_at`. But `webhooks.dispatch('payment.completed', …)` sat **outside** that guard, so it fired on *every* poll where `status.paid` was true. The frontend polls this endpoint every few seconds until paid (and a page refresh re-polls an already-paid charge), so external subscribers to `payment.completed` received the event multiple times for a single payment — a real idempotency defect that can drive double-fulfillment / double-notification in whatever a tenant wires the webhook to. (The signed Omise webhook path already does all of this inside a `!rec.paid_at` guard; only the poll path leaked.)

**Fix (move one line):** the `payment.completed` dispatch now lives inside the `if (firstTime)` block alongside the other once-only side effects, so it fires exactly once — on the first transition to paid. No behaviour change for the first poll; later polls just return status. Also made `OMISE_API_URL` env-overridable in `omise-payment.js` (production default `https://api.omise.co` unchanged) so the paid-charge path can be driven by a local stub in a test.

**Verified by running + mutation-tested:** new self-booting `scripts/test-payment-status-idempotent.mjs` — a stub Omise returns a paid charge on the status GET, and a local collector is registered as a real `payment.completed` webhook subscriber; the test creates a PromptPay charge and polls the status endpoint **twice**, asserting the subscriber receives `payment.completed` **exactly once**. It is hermetic (snapshots + clears the gitignored `webhooks.json`/`payments.json` before boot and restores them after — otherwise stale subscribers from a prior run inflate the count). **6/6** via `npm run test:payment-status-idempotent`, stable across re-runs. **Mutation:** moving the dispatch back outside `if (firstTime)` makes two polls deliver the event **twice** (fails the exactly-once assertion), restored to green. `node --check` clean on both files; wired into `package.json` + a self-contained CI step; `backend/data` git-restored. Backend-only.

### 2026-07-23 — Hourly loop: bug fix — a spin discount was burned even when the payment request failed before any charge (money/revenue path)

Found auditing the payment path (`/api/payment/create`, server.js). **Verified against the code:** the route called `credits.consumeDiscount(identity)` at the very top — marking the one-time spin "X% off" reward `used: true` — and only *then* tried to create the Omise charge. So any path that failed **before** a charge existed still ate the discount with no payment made: a `card` request with a missing token 400s at the token check (before the charge), a thrown Omise error hits the catch → 500, and a declined card returns 402 — in every case `consumeDiscount` had already run, so on retry the user paid **full price**. A declined card / client glitch is common on the revenue path, so this silently overcharged real paying customers.

**Fix:** peek the discount to compute the discounted amount (`credits.peekDiscount`, which does NOT mark it used), and consume it (`burnDiscount()` → `consumeDiscount`) only on a genuine success path — the mock charge, a PromptPay QR actually issued, and a card charge that is not declined. The catch (thrown Omise error), the missing-token 400, and the card-declined 402 now leave the discount intact. Subscription charges never touch the discount (unchanged). `peekDiscount`/`consumeDiscount` return the same pct, so the amount and the later consume agree.

**Verified by running + mutation-tested:** new self-booting `scripts/test-discount-charge.mjs` (mock Supabase backs the credits store — seeds an unused 30%-off discount, no real Omise, doesn't touch `backend/data`). Scenario A: with `OMISE_SECRET_KEY` set, a `card` create with no token → 400, and `GET /api/credits` shows the discount **still 30%** (not burned). Scenario B: in mock-payment mode a PromptPay charge is issued at the 30%-off amount (`209` of `299`) and the discount is then **consumed** (→ 0). **8/8** via `npm run test:discount-charge`. **Mutation:** restoring the top-of-route `consumeDiscount` makes Scenario A show the discount burned to 0 on the 400 (7/1), restored to green. `node --check` clean; wired `test:discount-charge` into `package.json` + a self-contained CI step; `backend/data` git-restored. Backend-only.

### 2026-07-23 — Hourly loop: bug fix — dispute track() crashed (500) on an order with no producer_email; the opener couldn't even see their own dispute

Found auditing `disputes.js` (escrow/arbitration money path). **Verified against the code:** `track()` (the public `GET /api/disputes/:id/track` both parties use) computed the other party's contact as `(d.opened_by === 'buyer' ? order.producer_email : order.contact || '').toLowerCase()`. `||` binds tighter than `?:`, so this parsed as `(buyer ? order.producer_email : (order.contact || '')).toLowerCase()` — the **buyer branch `order.producer_email` had no `|| ''` guard**. This is the exact class the `respond()` fix already closed (run 10), but `track()` was missed. Worse than respond(): `track()` computes this value *before* the contact check, so a buyer-opened dispute on an order with a null `producer_email` (some order channels never set it) threw a `TypeError` → the route's wrap turned it into a 500 for **every** caller — the dispute's own opener couldn't even see its status, and neither could anyone else. A stored order read back from Supabase can also carry a null column.

**Fix (1 char class):** guard both branches — `(d.opened_by === 'buyer' ? (order.producer_email || '') : (order.contact || '')).toLowerCase()`, mirroring `respond()` (disputes.js:153). Now a mismatched/absent producer contact cleanly rejects with "ช่องทางติดต่อไม่ตรง…" and the opener can always track. No other behaviour change.

**Verified by running + mutation-tested:** extended `scripts/test-disputes.mjs` (+5, reusing the existing `makeDisputes()` stub whose order has no `producer_email`): the opener can now `track()` their own dispute without a crash and gets the sanitized party-facing view (no `opener_contact`/AI draft); a non-party contact and an empty contact are cleanly rejected; and with a `producer_email` present the producer can also track. **30/30** via `npm run test:disputes` (was 25). **Mutation:** restoring the bare `order.producer_email` makes `track()` throw `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` (the 500), exactly the assertion the fix protects, then restored to green. `node --check` clean. Backend-only.

### 2026-07-23 — Hourly loop: test — pin the inventory upsert create-vs-edit contract (no code change)

Audit round: verified the money paths are solid and, rather than force a change into hardened code, closed a real TEST gap. The single `POST /api/inventory/admin/upsert` route (server.js:677) handles BOTH create and edit of a shop product; `inventory.upsert()` tells them apart purely by whether the body carries an `id` (`id: existing?.id || <mint new>`). That create-vs-edit branch is money-adjacent (the shop lists/charges from these records) but `test-inventory.mjs` only pinned the negative-value rejection and the adjust/oversell ledger — not that **editing by id updates in place (same id, no duplicate)** and **a body with no id mints a new product**. A refactor of that one line could silently turn every edit into a duplicate (or a create into an overwrite) and no test would catch it.

**Considered but did NOT change** (logged so it isn't re-proposed): `upsert` given an `id` that doesn't exist mints a *new random* id (silent duplicate with a mismatched id) instead of erroring. Tempting to reject unknown ids, but in Supabase-primary mode `get(id)` falls back to the local file store on a transient SB error and can false-null an existing row — so a naive reject would drop legitimate edits during an SB outage. Low-probability edge (admin UI only ever edits ids from the list) + real regression risk ⇒ left as-is; only the correct-path contract is pinned.

**Verified by running + mutation-tested:** extended `scripts/test-inventory.mjs` (+5 asserts, carefully create-then-remove so the downstream single-product/`unitsSold` counts are undisturbed): editing by id returns the SAME id, the edited name/price persist to that record, the product count is unchanged (no duplicate), and an id-less upsert mints a new distinct id. **29/29** via `npm run test:inventory` (was 24). **Mutation:** forcing `upsert` to always mint a fresh id fails exactly the "same id" + "no duplicate" assertions (25/4), restored to green. Test-only; no production code touched.

### 2026-07-23 — Hourly loop: test — pin the affiliate withdraw-REQUEST reservation invariant (money-out; extracted the math for testability)

Audited the money-out path and found it correct but **untested on the request side**. `test-affiliate-payout.mjs` covers the admin PAY side (`payoutRemaining`/`canPayout`), but the withdraw-REQUEST math in `server.js` — `reservedFor` / `affPending` (lines ~1525) — had no unit test. That math is a real money invariant: `POST /api/affiliate/withdraw` rejects `amount > affPending(aff)`, where `affPending = earned − paid − reservedFor(ref)` and `reservedFor` sums the affiliate's still-open (`pending`/`approved`) requests. Without the `reservedFor` term an affiliate could fire several requests that each fit the earned balance but together exceed it, and the platform would owe more than was earned.

**What I did (behaviour-preserving extraction + test, no logic change):** moved the two inline functions into a new pure module `backend/affiliate-withdraw-math.js` (`reservedFor(withdrawals, ref)`, `affAvailable(aff, withdrawals)`) — byte-for-byte the same computation, including the deliberate *no clamp at 0* (server treats `amount > available` as a rejection, so a negative available just rejects everything — the safe direction). `server.js` now imports them and keeps two one-line closures binding the module-level `withdrawals` array, so all three call sites (withdraw request / finalize / dashboard) are unchanged. This follows the same extract-for-testability pattern already used for `affiliate-payout.js`.

**Verified by running + mutation-tested:** new `scripts/test-affiliate-withdraw-math.mjs` — 13 assertions: only `pending`/`approved` reserve (a `paid` request must not double-reserve on top of `paid_out`; `rejected` frees funds; reservation scoped per `ref_code`); `affAvailable = earned − paid − reserved`; the exact double-request over-withdraw scenario (a pending full-balance request drops available to 0 so any positive second request is refused); empty/undefined defensiveness; satang rounding. **13/13** via `npm run test:affiliate-withdraw-math`. **Mutation:** making `reservedFor` also count `paid` fails exactly the reservation + availability assertions (9/4), restored to green. `node --check` clean on both files; **booted the real server** (`/api/health` → 200) confirming the import + closures load; re-ran `test-affiliate-payout` (still green). Wired `test:affiliate-withdraw-math` into `package.json` + CI unit-tests. `backend/data` git-restored.

### 2026-07-23 — Hourly loop: data-loss fix — the Intl-Org portal's "Organization Type" was silently dropped on submit (form field named `type` collided with the portal discriminator)

Found auditing the consent funnel (standing-order priority #1): verified each `/portals/*` page submits the `type` value the backend expects (all 9 match `portal-leads.js` `KNOWN_TYPES`), and in doing so found a real data-loss bug in **`IntlOrgPortalPage.jsx`**. Every portal submits with `submitLead({ ...form, type:'<portal>', lang, consent })` — spread the form, then append `type`/`lang`/`consent`. Object-spread order means those appended keys OVERWRITE any same-named field in `form`. IntlOrg's form had a field literally named **`type`** (the "Organization Type" dropdown — UN / World Bank / WHO / ASEAN / ADB …), so `type:'intl-org'` clobbered it on every submit: the applicant's chosen organization type was **never sent to the backend** and never stored in the lead's `form_data`. The Partnerships team receiving the lead couldn't tell a UN agency from a development bank. (The other 8 pages were clean — Middleman uses `business_type`, not `type`.)

**Fix:** renamed that one field `type` → `org_type` (state key + the `<select>`'s `value`/`onChange` + its `id`/`htmlFor` so the label stays associated). The i18n label text (`t.form.type`, "Organization Type") is unchanged. Now the submit payload carries `org_type:'World Bank'` alongside the portal `type:'intl-org'`, and `portal-leads.js submit()` stores `org_type` in `form_data` like any other string field. Frontend-only; no backend/API change.

**Verified by running + mutation-tested:** added `src/__tests__/portalFieldCollision.test.js` — a structural guard (same no-render approach as portalConsent/seoInvariants) that, for all 9 pages, parses the `useState({...})` form object and asserts it declares no field named `type`/`lang`/`consent` (the keys the submit call appends), plus that each page appends a non-empty literal portal `type`. **19/19** via `npx vitest run portalFieldCollision`. **Mutation:** restoring the `type` field name makes the guard fail exactly `IntlOrgPortalPage.jsx … form field(s) type collide … would be dropped` and nothing else (1 failed / 18 passed), then restored to green. Full `npm test` → **183/183**; `npm run build` (vite prerender + sitemap) clean.

### 2026-07-22 — Hourly loop: bug fix — webhook delivery log grew UNBOUNDED in memory (only the on-disk copy was capped)

Follow-up audit of the same file (`backend/webhook-system.js`). **Verified against the code:** `MAX_DELIVERIES = 200` is enforced *only* on the disk write — `flushLog()` saves `deliveries.slice(0, MAX_DELIVERIES)` — but the in-memory `deliveries` array itself is only ever `unshift`'d (one entry per delivery, in `dispatch()`) and **never trimmed**. So on a long-running server process every webhook delivery permanently added an entry to the in-memory array; the file stayed at 200 but RAM grew without limit. On restart it reloads only the capped-200 file, which is exactly why the leak was easy to miss — it only manifests on a process that stays up (the standalone `node server.js`, not per-invocation serverless). `logs()` returns `deliveries.slice(0, limit)`, so the API output looked fine while memory quietly climbed.

**Fix (1 line):** after the `unshift`, `if (deliveries.length > MAX_DELIVERIES) deliveries.length = MAX_DELIVERIES;` — the in-memory log is now bounded to the same 200 most-recent entries as the file. No API/behaviour change (callers already only ever read the first `limit`).

**Verified by running + mutation-tested:** extended `backend/scripts/test-webhook-retry.mjs` — registers a fresh hook and fires **260** dispatches, then asserts `logs({limit: 100000}).length` (huge limit → the whole in-memory array) is `=== 200`, not 260+. Ran green **10/10** via `npm run test:webhook-retry`. **Mutation:** commenting out the cap makes the in-memory array grow to **313** and fails exactly the two new "delivery log is bounded" assertions (8 passed / 2 failed), restored to green. `node --check` clean. Test already wired into `package.json` + CI from the previous entry. Backend-only.

### 2026-07-22 — Hourly loop: bug fix — webhook auto-disable counted CUMULATIVE lifetime failures, not "20 consecutive" as its comment promised

Found auditing the webhook delivery path (`backend/webhook-system.js`). **Verified against the code:** the dispatch loop auto-disables a hook when `hook.failCount > 20`, and the surrounding code documents that threshold as **"20 consecutive failures"**. But `failCount` was only ever `++`'d on a failed delivery and **never reset on a successful one** — so it accumulated *lifetime* failures. A perfectly healthy webhook that merely blips occasionally (a transient network error now and then over weeks) would eventually cross 20 total failures and get silently `active = false`'d, even though it was mostly working and never failed 20 times in a row. The intended safety feature (drop a genuinely dead endpoint) was quietly mutating into "drop any endpoint that's been alive long enough to accumulate 21 blips".

**Fix (3 edits, all non-breaking):** (1) `else hook.failCount = 0;` — a successful delivery now resets the consecutive-failure counter, making the field mean what the auto-disable check and comment already assumed. (2) `RETRY_DELAYS` is now overridable via a `WEBHOOK_RETRY_DELAYS` JSON-array env var (read once at load) so a test can make the 0→5s→30s retry backoff instant; **production default `[0, 5000, 30000]` is unchanged**. (3) `dispatch()` now returns `Promise.all(jobs)` instead of nothing — it was already fire-and-forget for every production caller (all ignore the return), but returning the promise lets a test `await` the background deliveries deterministically instead of racing them. No caller passes the return anywhere, so this is additive.

**Verified by running + mutation-tested:** added `backend/scripts/test-webhook-retry.mjs` (8 assertions, stubs `global.fetch`, drives real `dispatch()` calls): 15 failures → `failCount 15`, still active; then 1 success → **`failCount` back to 0**; 30 lifetime failures but only 15 consecutive → **stays active** (the exact bug); 21 *consecutive* failures → **auto-disabled** (the feature is intact); `dispatch()` with no matching hook resolves to `[]` without throwing. Ran green **8/8** via `npm run test:webhook-retry`. **Mutation:** removing `else hook.failCount = 0;` fails exactly the reset + "occasional failures do NOT auto-disable" assertions (5 passed / 3 failed), restored to green. `node --check webhook-system.js` clean. Wired `test:webhook-retry` into `backend/package.json` and the CI "Unit tests" step in `.github/workflows/test.yml`. Backend-only; no route/behaviour change for callers.

### 2026-07-18 — Hourly loop: a11y fix — the public order/dispute tracking forms had labels not associated with their inputs

Found verifying the two customer-facing forms reached straight from a transactional email — `TrackOrderPage` (order id + contact, and the "open a dispute" reason/evidence) and `DisputeTrackPage` (dispute id + contact). **Verified against the code:** all six `<label style={lab}>` were styled text with **no `htmlFor`**, and the paired `<input>`/`<textarea>` had **no `id`** — so the label wasn't programmatically tied to its field (WCAG 1.3.1 / 4.1.2). Concrete effects: tapping the label didn't focus the input (worse on mobile, where the tap target matters), and a screen reader announced the field with no name. The portal funnel pages already do this correctly (`<label htmlFor>` + `<input id>`); these two public pages had drifted.

**Fix:** associated every label with its field on both pages — `dt-id`/`dt-contact` (DisputeTrack), `tk-id`/`tk-contact` and `dispute-reason`/`dispute-evidence` (TrackOrder). Attributes only; no layout/logic/behaviour change. Added `src/__tests__/trackFormsA11y.test.js` — a structural guard (same no-render approach as seoInvariants/portalConsent) asserting every `<label>` in these files carries an `htmlFor` and every `htmlFor` points at a real `id` in the same file, so a new unassociated label fails CI.

**Verified by running:** `npx vitest trackFormsA11y.test.js` → **4/4**. **Mutation-tested** — dropping one `htmlFor` makes the guard fail exactly `DisputeTrackPage > every <label> has an htmlFor`, restored to green. Full `npm test` → **153/153** (was 149); `npm run build` (vite) clean. Frontend-only; no backend/behaviour change.

### 2026-07-18 — Hourly loop: SEO/crawl-hygiene fix — ~30 login-gated console routes were crawlable (not in robots.txt Disallow) + added a self-maintaining guard

Found auditing robots.txt against App.jsx routes. **Verified against the code:** `robots.txt` Disallowed only a hand-picked few private routes (`/admin`, `/dashboard`, `/affiliate/dashboard`, `/track`, `/dispute`, `/producers/manage`, `/ai-generator`, `/ai-tools`, …), but App.jsx has **~32 routes gated with `element={isAuthenticated ? <X/> : <Navigate to="/login"/>}`** and most were **not** excluded — `/corporate` + its 9 sub-consoles (`/corporate/board|ir|compliance|esg|hr|finance|global|pr|command`), plus `/agent`, `/assistant`, `/analytics-pro`, `/benchmark`, `/catalog-ai`, `/daily-pr`, `/global-pr`, `/image-prompt`, `/integrations`, `/kol-brief`, `/pitch`, `/promo-engine`, `/scheduler`, `/skills`(+`/skills-catalog`), `/starter`, `/strategy`, `/supply-chain`, `/ultra-promo`, `/video`. A crawler hitting any of these gets a `/login` redirect — wasted crawl budget and a soft-404/duplicate-login risk that dilutes indexing of the public funnel pages (`/portals/*`, `/pricing`, …). The existing `seoInvariants` guard checked that *advertised* routes aren't auth-gated, but nothing checked the reverse — that *auth-gated* routes are excluded — so this drifted silently as consoles were added.

**Fix:** (1) added `Disallow:` lines to `frontend/public/robots.txt` covering every login-gated route (`/corporate` and `/skills` are prefixes covering their sub-routes — robots prefix matching, and longest-match wins over the blanket `Allow: /`). (2) added an **exhaustive, self-maintaining invariant** to `seoInvariants.test.js`: it parses every `<Route … Navigate to="/login">` out of App.jsx and asserts each is covered by some `Disallow` prefix — so any *new* login-gated dashboard that isn't excluded fails CI.

**Verified by running:** `npx vitest seoInvariants.test.js` → **7/7** (was 6). **Mutation-tested** — removing the `/corporate` Disallow makes the new guard fail listing all 10 uncovered `/corporate*` routes, then restored to green. Full `npm test` → **149/149** (was 148); `npm run build` clean and `dist/robots.txt` carries the new rules; sitemap unchanged at 22 public URLs (no advertised route touched, so the sitemap==Allow invariant still holds). Frontend-only (robots.txt + test); no code/behaviour change.

### 2026-07-17 — Hourly loop: gap fix — a QuickPay buyer who paid (and gave an email) got NO receipt

Found auditing the payment/money paths. **Verified against the code:** both charge-finalize paths — the webhook (`/api/payment/webhook`, `charge.complete`) and the status poll (`/api/payment/status/:chargeId`) — only email a receipt via `sendPaymentReceipt` when `rec.plan` is set (webhook: `if (email && rec.plan)`) / `rec.email` is set (poll: `if (firstTime && rec?.email)`). But a **QuickPay** charge (`POST /api/quickpay/create` — sell a package / single item) stores `plan: null` and `email: null`, keeping the buyer's address in `buyer_email`. So the plan branch is skipped and a paying QuickPay customer received nothing. Reusing `sendPaymentReceipt` would have been wrong anyway — it's subscription copy ("บัญชีของคุณถูกอัพเกรดเป็นแผน X … รายเดือน"), which misdescribes a one-time buy.

**Fix:** added `buildQuickpayReceipt({buyer, label, amount, charge_id, paid_at})` to `backend/shop-receipt.js` (one-time-purchase wording — label / amount / date / reference, no plan/subscription/upgrade language; reuses the shared `shell()`/`row()`/`esc()`), and `sendQuickpayReceipt(rec, {amount_thb, charge_id, paid_at})` in server.js (best-effort, gated on `isReceiptEmail(rec.buyer_email)` — QuickPay never validated the buyer email at capture). Wired into **both** finalize paths, right after the plan-receipt branch, guarded by `rec.kind === 'quickpay'` (+ `firstTime` on the poll path, matching the existing idempotency). Affiliate commission crediting on the same charge is untouched.

**Verified by running BOTH unit + live endpoints:** extended `scripts/test-shop-receipt.mjs` → **46/46** (was 37) — the receipt carries label / grouped ฿ total / buyer name / charge reference, **contains no subscription/plan/upgrade wording**, degrades with no `undefined` leak, and HTML-escapes buyer/label/charge. Then **booted the real server** (mock Omise + `OMISE_WEBHOOK_SECRET`, SMTP → fail-fast sink): created a QuickPay with an **email** buyer and one with a **phone**-as-email buyer, paid each via a signed `charge.complete` webhook — the email buyer → a `QuickPay receipt` send is attempted (+1 log line), the phone buyer → **0** (gated out); both webhooks 200. Re-ran the **affiliate-flow E2E** (quickpay→webhook→credit→tier) → **28/28**, confirming the webhook edit didn't disturb commission crediting. `node --check` clean; `test:shop-receipt` already in CI; `backend/data` git-restored. The paying-customer receipt is now complete across shop checkout, subscription plans, **and** QuickPay.

### 2026-07-17 — Hourly loop: refactor — collapsed the 9 duplicated portal consent-label maps into one shared source (kills the drift class behind the zh bug)

Follow-up to the previous entry, doing what it flagged: the missing-`zh` consent bug was possible only because the PDPA consent label was **copy-pasted as a per-page `CONSENT_TEXT` map in all 9 `/portals/*` pages** — nine copies of legally-significant, translated copy whose only real difference was the privacy-link accent color. Patching one page and adding a language guard treated the symptom; the root cause was the duplication. **Fix:** extracted `frontend/src/pages/portals/consentLabel.jsx` — `consentLabel(lang, color)` returns the th/en/zh label JSX (link color parameterized, Thai fallback for an unknown lang so the box is never blank), plus `CONSENT_LANGS`. Replaced every page's `const CONSENT_TEXT = {…}` + `<span>{CONSENT_TEXT[lang]}</span>` with an import and `<span>{consentLabel(lang, '<page-color>')}</span>` (each page's exact prior color preserved: producer `#a5b4fc`, affiliate `#fcd34d`, consumer `#67e8f9`, creator `#f9a8d4`, middleman `#fdba74`, foundation/gov-thai `#6ee7b7`, gov-intl `#93c5fd`, intl-org `#c4b5fd`). The copy itself is byte-identical to what each page rendered before — only the storage moved. Net −25 lines. Also normalized Gov-Thai's lone `{CONSENT_TEXT[lang] || CONSENT_TEXT.th}` (the others had no fallback) — the shared helper now does the Thai fallback for all nine.

**Guard updated** (`portalConsent.test.js`): the per-page "has all three languages" assertion (which read each page's now-removed `CONSENT_TEXT`) became "imports + renders `consentLabel(lang, …)` and no stray per-page `CONSENT_TEXT` map has crept back", plus one new top-level assertion that the shared `consentLabel.jsx` MAP defines th/en/zh. So a future dropped translation now fails at the single source, and a page re-inlining its own map also fails.

**Verified by running:** `npx vitest portalConsent.test.js` → **56/56**; full `npm test` → **148/148** (was 147); `npm run build` (vite) clean — all 9 pages compile and prerender. Frontend-only; no backend/API/behaviour change (identical rendered label, same colors).

### 2026-07-17 — Hourly loop: PDPA/i18n fix — the Gov-Thai portal's consent checkbox had a BLANK label in Chinese (missing `zh` translation)

Found auditing the consent funnel (standing-order priority #1). **Verified against the code:** all 9 `/portals/*` pages render the consent-checkbox label from a per-page `CONSENT_TEXT` map keyed by language (`<span>{CONSENT_TEXT[lang]}</span>`). Eight pages define `th`/`en`/`zh`; **`GovThaiPortalPage.jsx` defined only `th`/`en`** — so a visitor viewing that portal in Chinese got `CONSENT_TEXT['zh'] === undefined`, i.e. a consent checkbox with **no text at all** next to it. That's both a broken UI and a real PDPA problem: consent must be *informed*, and a blank label is not informed consent (the box still gates submit, so the zh user is asked to tick something unexplained). The existing `portalConsent.test.js` guard checked the four wiring pieces (default-false state, `consent` in the payload, the checkbox, the disabled-until-consent button) but **not the label copy**, so this drift passed CI.

**Fix:** (1) added the missing `zh` line to `GovThaiPortalPage.jsx` `CONSENT_TEXT`, matching the other 8 pages' wording (`同意根据…隐私政策（PDPA）…`) and the page's own link color `#6ee7b7`. (2) **extended the guard** — `portalConsent.test.js` now also asserts every page's `CONSENT_TEXT` block defines all three languages (`th`/`en`/`zh`), closing the drift class that let this through.

**Verified by running:** `npx vitest portalConsent.test.js` → **55/55** (was 46; +9, one per page for the new label-language check). **Mutation-tested** — deleting the restored `zh` line makes the guard fail exactly `GovThaiPortalPage.jsx > has a consent LABEL in all three languages` and nothing else, then restored to green. Full suite `npm test` → **147/147** (was 138), and `npm run build` (vite) clean. Frontend-only; no backend/API change. (The 9 near-identical `CONSENT_TEXT` copies remain a drift risk worth a future shared-module extraction — the new guard now catches language drift in the meantime; not extracted this round to keep the fix tight.)

### 2026-07-17 — Hourly loop: UX fix — the affiliate "ประวัติยอดขาย" table rendered blank columns (read fields the API never sends); now shows the real data

Closes the side-finding flagged in the previous (charge_id) entry, in the safe direction. **Verified against the code:** `AffiliateDashboard.jsx`'s recent-sales table read `s.id` (Order ID), `s.plan` (แพ็กเกจ) and `s.status`, but a stored recent_sale is `{ amount_thb, commission, source, at }` (server.js `creditAffiliateSale`) — it has **none** of those. So every row showed a blank Order ID + blank package and, because `STATUS_STYLE[undefined]` fell back to `pending`, a permanent "⏳ รอ" status — misleading for sales whose commission was already credited. The genuinely useful data the affiliate wants (which channel drove the sale, the sale value, the commission, the date) was all present but unshown. **Fix (frontend only, no invented semantics — show the fields that exist, drop the ones that never did):** columns are now **ช่องทาง · มูลค่าขาย · คอมมิชชั่น · วันที่** — `source` via a small friendly label map (`shop`/`store`→ร้านค้า, `direct`/`landing`→ลิงก์ตรง, else the raw platform), `amount_thb` and `commission` grouped in ฿, and `at` formatted as a Thai date. Removed the now-dead `STATUS_STYLE` (the invented status column) and the `Order ID`/`แพ็กเกจ` columns. This pairs with the prior entry where the API side of the same record stopped leaking `charge_id`.

**Verified by running:** `npm run build` (vite) clean — prerender + sitemap all wrote; `npm test` → **138/138** frontend tests pass. The fields the table now reads (`s.source`, `s.amount_thb`, `s.commission`, `s.at`) match exactly the live `recent_sales` shape captured last round against the real server (`{amount_thb:1000, commission:200, source:'direct', at, date}`), so the once-blank columns now render real values. Frontend-only change; no backend/API change.

### 2026-07-17 — Hourly loop: leak fix (3rd public-projection audit) — the unauthenticated affiliate stats endpoint exposed the referred buyer's Omise charge_id

Third pass of the "what does a public endpoint actually put on the wire" audit (after orders-track and disputes-track). **Verified against the code:** `GET /api/affiliate/stats/:ref_code` has **no auth** — the ref_code is the only gate, and a ref_code travels in the affiliate's shareable links (a buyer who clicks an affiliate link sees `?ref=CODE` in the URL), so the code is effectively public. Its `recent_sales` came straight from `aff.recent_sales`, whose entries `creditAffiliateSale` stores as `{ amount_thb, commission, charge_id, source, at }` (server.js ~7561) — i.e. the **Omise `charge_id` of the referred buyer's transaction** was handed to anyone holding the ref link. The frontend `AffiliateDashboard.jsx` never renders it (it reads `id/plan/commission/date/status`), so the charge_id was pure wire-leak. **(Side finding, flagged not fixed — needs owner input:** that same `AffiliateDashboard` recent-sales table reads `s.id`/`s.plan`/`s.date`/`s.status`, none of which the stored record provides, so the Order-ID / package / date / status columns render blank/"pending" today. Populating them truthfully needs a product decision on what an affiliate sale's "Order ID" and "package" are, and likely enriching the stored record at credit time — out of scope for a leak fix, so left for the owner.)

**Fix:** new pure module `backend/affiliate-public.js` — `publicAffiliateSale(sale)` / `publicAffiliateSales(list)` project each sale down to `{ amount_thb, commission, source, at, date:at }` and **drop `charge_id`** (same extract-for-testability pattern as `orders.publicOrderView` / `disputes.publicDisputeView`). The stats endpoint now maps `recent_sales` through it. The charge_id is **not deleted** — it stays in the stored `aff.recent_sales` for admin reconciliation; it just isn't exposed on the public endpoint. Also mirrors `at`→`date` so the dashboard's date column has the field it reads (a truthful, zero-guess bonus). No frontend change.

**Verified by running BOTH unit + live endpoint:** new `scripts/test-affiliate-public.mjs` → **16/16** — feeds the exact stored shape (with `charge_id: 'ch_test_…'`) and pins that neither the key nor the id string survives, while amount/commission/source/at/date do, plus null/empty/non-object defenses and the list mapper. Then **booted the real server** (mock mode + `OMISE_WEBHOOK_SECRET`), ran the real credit path — `POST /api/affiliate/apply` → `POST /api/quickpay/create` (charge_id `mock_qp_…`) → signed `charge.complete` webhook → `GET /api/affiliate/stats/:ref` — and observed `recent_sales = [{amount_thb:1000, commission:200, source, at, date}]` with **`any sale carries charge_id key? false` / `response contains the charge id string? false`**, commission 200 intact. `node --check` clean; wired `test:affiliate-public` into `package.json` + CI `test.yml`; `backend/data` git-restored.

### 2026-07-17 — Hourly loop: fairness fix — the public dispute-tracking endpoint leaked the ADMIN-ONLY AI arbitration draft (recommendation + "what proof would win") to both parties

Same class of leak as the order-track fix, in the escrow-dispute flow the buyer/producer reach from the delivered/cancelled emails. **Verified against the code:** `GET /api/disputes/:id/track` returned `ai_suggestion: d.ai_suggestion` and the full `resolution` object to whichever party's contact matched. But `ai_suggestion` is the AI arbitration draft written **for the human admin to decide on** — the module header says so explicitly ("การตัดสินเป็นหน้าที่ของ admin เสมอ — AI เป็นแค่ผู้ช่วยเสนอความเห็น … ไม่ auto-resolve"). It contains `recommendation` (favor_supplier/favor_buyer/refund), `confidence`, `reasoning`, and — worst — `missing_evidence`, which literally lists *what proof would swing the ruling*. Handing that to the two disputing parties lets a party game the arbitration (submit exactly the missing item) or contest the human's final call ("the AI said I should win"). The `resolution` object also carried the admin's internal `note` (rationale) and `resolved_by` (which staffer ruled) — while the resolved-notification email only ever reveals the `decision`. The frontend `DisputeTrackPage.jsx` happens to render only `counter_response.note` + `resolution.decision`, but that is **not** protection — the full `ai_suggestion`/note/identity were on the wire for anyone inspecting the response.

**Fix:** extracted a pure `publicDisputeView(d)` in `backend/disputes.js` (module-level export, same pattern as `orders.publicOrderView`) and switched `track()` to it. The party-facing view keeps `id, order_id, opened_by, reason, status, counter_response, resolution{decision, resolved_at}, created_at` and **drops `ai_suggestion` entirely**, plus the admin's `resolution.note` + `resolved_by` and `opener_contact`. Matches exactly what the resolved email reveals (the decision). Admin endpoints (`/api/disputes/admin/list|summary`) still use `all()`/`summary()` and see everything. No frontend change (it already only uses the two preserved fields).

**Verified by running BOTH unit + live endpoint:** extended `scripts/test-disputes.mjs` → **22/22** (was 10) — feeds a dispute with a fully-populated `ai_suggestion` (recommendation/confidence/reasoning/missing_evidence) + an internal `resolution.note`/`resolved_by`, and pins that none of it (nor `opener_contact`) survives the projection, while `reason`/`status`/`counter_response`/the final `decision`+`resolved_at` do (+ null/unresolved don't throw). Then **booted the real server**, created an order, had the buyer open a dispute via `POST /api/disputes`, and hit the **public** `/track`: the response keys were exactly `id,order_id,opened_by,reason,status,counter_response,resolution,created_at` with **`has ai_suggestion? false` / `leak missing_evidence? false`** — proving the endpoint routes through the projection (a populated suggestion structurally cannot leak, per the unit test). `node --check` clean; `test:disputes` already runs in CI; `backend/data` git-restored.

### 2026-07-17 — Hourly loop: privacy fix — the public order-tracking page leaked INTERNAL history notes to the buyer (Omise charge id, "race", admin remarks)

Found by scanning the order-tracking flow the cancelled-notice email points buyers to. **Verified against the code:** the public `GET /api/orders/track?id=&contact=` returned `history: o.history` **verbatim**, and `TrackOrderPage.jsx` (line ~125) renders each entry's free-text `note` straight to the buyer. But those notes are written for admins/the system, not the buyer: the oversold auto-cancel writes `"ชำระเงินสำเร็จแต่สต๊อกหมดพอดี (race) — ต้องคืนเงินลูกค้า · charge ch_xxx"` (embeds the Omise **charge id** + the internal word "race"), `setEscrowStatus` writes `escrow:held`/`escrow:released`, and `/api/orders/admin/status` stores **whatever the admin typed** as the cancel reason — which can be an internal remark (e.g. "สงสัยฉ้อโกง / fraud suspected"). All of it was visible to anyone with the order id + contact (the buyer). Meanwhile every buyer-facing detail (carrier, tracking no, delivery proof `received_by`/`drop_off`, `delivered_at`) is **already** returned as dedicated fields and rendered separately on the Track page — so the raw note in the timeline added nothing legitimate and leaked plenty.

**Fix:** extracted a pure `publicOrderView(o)` in `backend/orders.js` (module-level export, same extract-for-testability pattern as shop-receipt/affiliate-payout) and switched `track()` to return it. The public history now keeps only `{ status, at }` (the progression + when) and **drops the free-text note entirely**; internal-only fields (`contact`, `address`, `producer_email`) are likewise not echoed. Backend-authoritative — can't be bypassed by a frontend that forgets to hide it. No frontend change needed: `TrackOrderPage.jsx` already guards `{h.note ? … : ''}`, so a note-less entry just shows the status label + timestamp.

**Verified by running BOTH unit + live endpoint:** new `scripts/test-orders-track.mjs` → **15/15** — pins that the charge id, the "(race)" wording, and an admin "ฉ้อโกง" remark are all absent from the projection, that no history entry carries a `note` field, yet every timeline step (status+at), carrier/tracking, delivery proof, id/product/qty/amount/status survive, and that `contact`/`address`/`producer_email` are never echoed (+ null/missing-history don't throw). Then **booted the real server**, created an order, had the admin cancel it with an internal note `"สงสัยฉ้อโกง internal charge ch_secret_123"`, and hit the **public** track endpoint: history came back as `[{status,at},{status,at}]` with **`leak charge id? false` / `leak ฉ้อโกง? false`**, status still `cancelled`. `node --check` clean (server.js + orders.js); wired `test:orders-track` into `package.json` + CI `test.yml`; `backend/data` git-restored.

### 2026-07-17 — Hourly loop: gap fix — a CANCELLED order emailed the customer nothing (worst when they'd already paid + a refund was owed)

The one remaining hole in the shop customer-notification lifecycle. **Verified against the code:** three code paths move an order to `cancelled` — (1) `/api/orders/admin/status` (admin cancels), (2) `finalizePaid` card/mock path, and (3) the PromptPay Omise webhook — where (2)/(3) are the *paid-but-oversold race*: the customer's card/PromptPay **already charged**, stock ran out at the last moment, the order auto-cancels and a refund is owed. In all three the customer got **no email at all** — most damaging in (2)/(3) where money changed hands and the buyer was left not knowing a refund was coming. **Fix:** added `buildCancelledNotice({customer_name, product_name, order_id, amount, reason, refund_pending})` to `backend/shop-receipt.js` (reuses the shared `shell()`/`row()` helpers) and `sendShopCancelled(order)` in server.js, wired into all three sites. When the buyer had paid (`refund_pending` or `amount>0`) the email shows a **refund block** ("ยอดที่ชำระ ฿X กำลังดำเนินการคืนกลับช่องทางที่คุณชำระมา ทีมงานจะติดต่อกลับ") — matching the wording the checkout API already returns (server.js ~700), and **not** promising an automatic/instant refund (refunds here are manual + escrow-mediated). For the two auto-cancel sites the customer-facing `reason` is a clean "สินค้าหมดสต๊อกพอดีหลังชำระเงิน" — the raw internal note (which carries the Omise `charge` id) is **never** leaked into the customer email. Best-effort/fire-and-forget like the other shop mails; a mail failure never affects the cancel/refund flow.

**Verified by running BOTH unit + live endpoint:** `scripts/test-shop-receipt.mjs` → **37/37** (was 28) — cancelled notice carries order id + product, shows the reason row only when a reason is given, shows the refund block + grouped ฿ total only for paid orders (unpaid → no refund block), and HTML-escapes `reason` + `customer_name` (no email injection). Then **booted the real server** (SMTP → fail-fast sink), created an **email**-contact and a **phone**-contact order via `POST /api/orders`, and cancelled both via `/api/orders/admin/status` (status=`cancelled`): the email order → a `Cancelled notice` send is attempted (+1 log line), the phone order → **0** (gated out by `isReceiptEmail`); both status calls returned 200. `node --check` clean; `test:shop-receipt` already runs in CI; `backend/data` git-restored. The shop customer-notification lifecycle is now complete end to end: receipt → shipped → delivered, **and** cancelled/refund.

### 2026-07-17 — Hourly loop: gap fix — no delivery-confirmation email to the customer (completes the receipt→shipped→delivered trilogy)

The natural follow-up flagged in the previous entry. **Verified against the code:** `/api/orders/admin/deliver` calls `orders.deliver()` (records `received_by`/`drop_off`/`delivered_at`, status → `delivered`) but sent **no email** — so a customer was never told their parcel arrived, and the delivery-proof (signature / drop-off point) was recorded only for the admin. **Fix:** added `buildDeliveredNotice({customer_name, product_name, order_id, received_by, drop_off})` to `backend/shop-receipt.js` and `sendShopDelivered(order)` in server.js, wired into `/api/orders/admin/deliver` after a successful `deliver()` (emails the customer only when `contact` is an email; best-effort). Also **refactored `shop-receipt.js`** to share a `shell()`/`row()` helper across all three notices (receipt/shipped/delivered) — less duplicated HTML, same output (the existing 22 assertions stayed green through the refactor). The delivered notice invites the buyer to reply-to-dispute if they didn't actually receive it, tying into the escrow flow.

**Verified by running BOTH unit + live endpoint:** `scripts/test-shop-receipt.mjs` → **28/28** (was 22) — delivered notice carries order id + product, shows the `received_by` signature (or the `drop_off` location, or a plain "จัดส่งสำเร็จ" fallback with no `undefined` leak), and HTML-escapes `received_by`. Then **booted the real server** (SMTP → fail-fast sink), created two orders, hit `/api/orders/admin/deliver`: the **email**-contact order → a `Delivered notice` send is attempted (+1 log line), the **phone**-contact order → **0** (gated out); both deliver calls still returned 200. `node --check` clean; `test:shop-receipt` already runs in CI; `backend/data` git-restored. Shop fulfilment notifications to the customer are now complete: purchase receipt → shipped (+ tracking) → delivered.

### 2026-07-17 — Hourly loop: gap fix — customers got NO "your order shipped + tracking number" email

Follow-up to the shop-receipt gap, same fulfillment funnel. **Verified against the code:** `orders.ship()` (called by `/api/orders/admin/ship`) records the tracking number + carrier and flips status to `shipped`, but `createOrders` only has an `onNewOrder` callback (→ owner notification); `ship()`/`deliver()` have **no callback and send no email**. So when an admin enters a tracking number, the customer is never told the order shipped or given the tracking number — a real gap right at the moment a buyer most wants an update.

**Fix:** added `buildShippedNotice({customer_name, product_name, tracking_no, carrier, order_id})` to `backend/shop-receipt.js` (pure, self-contained escaping) and `sendShopShipped(order)` in server.js, wired into `/api/orders/admin/ship` after a successful `ship()` (fetches the order, emails the customer only when `contact` is an email — same gate/pattern as the purchase receipt; best-effort, never blocks the admin action). **Verified by running BOTH unit + live endpoint:** extended `scripts/test-shop-receipt.mjs` → **22/22** (was 15) — the notice carries order id / product / carrier / tracking number, degrades cleanly with no `undefined` leak when tracking/carrier are absent, and HTML-escapes the tracking number + carrier (no email injection). Then **booted the real server** (SMTP → fail-fast sink), created two shop orders, and hit `/api/orders/admin/ship`: the **email**-contact order → a `Shipped notice` send is attempted (+1 log line), the **phone**-contact order → **0** (gated out); both ship calls still returned 200. `node --check` clean; `test:shop-receipt` already runs in CI (added last round); `backend/data` git-restored. (Delivery-confirmation email on `/deliver` is a natural next follow-up — not done this round.)

### 2026-07-17 — Hourly loop: gap fix — shop customers got NO purchase confirmation email (only the shop owner was notified)

Revenue-path scan. **Verified the gap against the code:** `sendPaymentReceipt` is sent to the buyer only for subscription/plan payments (4 call sites), and the order-placed email (`to: order.producer_email || ORDER_NOTIFY_EMAIL`) goes to the shop **owner** — so a customer who pays via `/api/shop/checkout` (card or PromptPay) received **no confirmation of their own** (the `isEmailLike(order.contact)` recipient at server.js:987 is inside `sendDisputeNotification`, a different flow). A paying customer getting silence is a real trust gap on the store funnel.

**Fix:** added a customer-facing receipt. Extracted the pure logic to `backend/shop-receipt.js` (`isReceiptEmail` + `buildShopReceipt` → {subject, html}; self-contained HTML-escaping) — same extract-for-testability pattern as affiliate-tiers/affiliate-payout. Added `sendShopReceipt(order)` in server.js (best-effort, emails only when the buyer's `contact` is an email — checkout also accepts phone/LINE which can't be emailed) and called it at **both** finalize points: the sync card/mock path in `finalizePaid`, and the PromptPay path in the Omise webhook shop-finalize. Fire-and-forget like `creditAffiliateSale`, so a mail failure never affects the purchase.

**Verified by running BOTH the unit logic and the live endpoint:** `scripts/test-shop-receipt.mjs` (deterministic, no server) → **15/15** — receipt only for email contacts (phone/LINE/empty/undefined → false, no crash), body carries order id / product×qty / grouped ฿ total / customer name, and user fields are HTML-escaped (`<script>`, `&`, quotes) so nothing injects into the email. Then **booted the real server** (SMTP pointed at a fail-fast sink) and hit `/api/shop/checkout`: an **email** contact → a `Shop receipt` send is attempted (1 log line), a **phone** contact → **0** (correctly gated out); both checkouts still returned 200 (receipt never blocks the sale). `node --check` clean; wired `test:shop-receipt` into `package.json` + CI `test.yml`; `backend/data` git-restored after the boot.

### 2026-07-17 — Hourly loop: security fix — `/api/system/news-rag-clear` was also world-callable (cache-thrash); locked to cron/admin

Follow-up to the previous round's cron-auth audit. `/api/system/news-rag-clear` (a Vercel cron path, every 4h) had **no auth** — anyone could hit the public URL and clear the news RAG cache, forcing repeated external re-fetches (cache thrash / minor cost-DoS). **Verified before locking** it's caller-safe: grep found **no frontend/backend/internal caller** — cron-only. **Fix:** added the same `cronOk || adminOk` guard as daily-report / consumer-digest / autopost-process; unauthenticated → 401. **Verified by running** (booted the real server with `CRON_SECRET`+`ADMIN_KEY`): no auth → **401**, `Bearer $CRON_SECRET` → **200** (cron still fires), `x-admin-key` → **200**, wrong bearer → **401**; sanity-checked in the same boot that the prior round's `/api/autopost/process` guard is still active (401) and that `/api/system/watchdog` remains intentionally open (200, read-only, read by `AgentPage.jsx`). `node --check` clean.

**Cron-auth audit status:** of the 6 `vercel.json` cron endpoints, **5 now require cron/admin** (daily-report, consumer-digest, autopost-process, news-rag-clear, + scheduler-process is the remaining one). Still **owner-gated (unchanged):** `/api/scheduler/process` triggers `lineBroadcast()` and is intentionally left open for the cron AND called key-less by the admin panel (`AdminPage.jsx`/`SchedulerPage.jsx`) — securing it needs a coordinated frontend change (see prior entry). `/api/system/watchdog` is read-only and read by the frontend, so it's left open by design. Owner: confirm if you want scheduler-process locked (I'll add the guard + make the two admin buttons send `x-admin-key`).

### 2026-07-17 — Hourly loop: security fix — `/api/autopost/process` had NO auth; anyone could force-dispatch the whole social-post queue

Audited the 6 Vercel-cron endpoints in `vercel.json` `crons` for the auth shape PR #79 established (GET + `Authorization: Bearer $CRON_SECRET`, or `x-admin-key` for the manual admin trigger). Two are correct (`/api/progress/daily-report`, `/api/portals/consumer-digest`). The other four had **no auth at all**. `/api/autopost/process` is the dangerous one: it **dispatches queued social posts** (`dispatchAutoPost` — real outbound actions to connected channels), yet was world-callable, so anyone hitting the public URL could force-send the entire queued backlog on demand. **Verified before fixing** it's safe to lock down: grep found **no frontend, backend, or internal caller** — it's cron-only (unlike `scheduler/process`, which the admin panel calls). **Fix:** added the same `cronOk || adminOk` guard used by daily-report/consumer-digest; unauthenticated → 401. **Verified by running** (booted the real server with `CRON_SECRET`+`ADMIN_KEY`, hit the live endpoint): no auth → **401**, `Bearer $CRON_SECRET` → **200** (cron still fires), `x-admin-key` → **200** (admin still works), wrong bearer → **401**. `node --check` clean.

**Flagged for the owner (NOT changed — rule #8: touches a deliberate design choice + would need a coordinated frontend change):** two more open cron endpoints — (a) **`/api/scheduler/process`** triggers `lineBroadcast()` (sends a LINE broadcast to all followers for any due post) and is **intentionally left open** for the cron (documented in the comment at server.js ~8530), AND the admin panel (`AdminPage.jsx`, `SchedulerPage.jsx`) calls it with `POST` and **no admin key** — so locking it down requires also passing the admin key from those two frontend callers. Impact is bounded (an attacker can only trigger already-scheduled, already-due posts, not inject content), but an unauthenticated party can still force early sends / hammer processing. (b) **`/api/system/watchdog`** (read-only stats, read by `AgentPage.jsx`) and **`/api/system/news-rag-clear`** (clears a cache) are also open — lower risk (no outbound action). **Owner: want me to secure `scheduler/process` (I'll add the guard + make the two admin-panel buttons send `x-admin-key`), and/or watchdog/news-rag-clear?**

### 2026-07-17 — Hourly loop: guard — pin that every /portals/* lead type has a welcome email (no silent dead-end funnel)

Consent-funnel scan (priority #1). Re-verified the funnel is currently whole: all 8 lead types that reach `sendPortalWelcomeEmail()` (producer, consumer, middleman, creator, gov-thai, gov-intl, intl-org, foundation) have entries in `PORTAL_WELCOME_COPY`, and `affiliate` is intentionally excluded because it gets its own `sendAffiliateWelcome` via `handleNewPortalLead`'s auto-register — so no type submits into silence. But **only the code enforces this, nothing guards it**, and it's exactly a spot that shipped broken before: the comment above `PORTAL_WELCOME_COPY` records that gov-thai/gov-intl/intl-org/foundation once had **no** entry, so `sendPortalWelcomeEmail()` (which does `if (!copySet) return`) silently sent nothing while those portal pages promise "our team will contact you within 48/72h" — a real hit to the high-value B2G / international-org / foundation funnels. A future new portal type would re-introduce the same dead-end unnoticed.

**Change:** added `backend/scripts/test-portal-welcome.mjs` (source-structural, same approach as the frontend seoInvariants/portalConsent guards — no server boot): parses `KNOWN_TYPES` from `portal-leads.js` and the depth-1 keys of the `PORTAL_WELCOME_COPY` block in `server.js`, and asserts every known type **except** affiliate has welcome copy, that affiliate is absent (documents the intentional exemption), and that each entry carries all three languages (th/en/zh) each with subject/title/body. **Verified by running:** 59/59; **mutation-tested** — renaming the `gov-intl` key in `server.js` makes the guard fail exactly that assertion (58/59), restored to green. Test-only + wired into `package.json` and the CI `test.yml` unit-test step. No product code touched (the funnel copy is already complete — this locks it).

### 2026-07-17 — Hourly loop (cross-repo: smart-e): fix — product deletion faked success + destroyed sales history (orphaned order_items, lost reports)

Continued the smart-e scan (openthai-ai's own money/dispute paths re-verified as solid — e.g. `disputes.js` `open()`/`respond()` contact gates are correct, and `order.producer_email` is always a clipped string so no `.toLowerCase()` crash; verified before assuming a bug). Found a real data-integrity issue in `_delete_product()`: it ran a bare `DELETE FROM products` and **always returned `{success:true}`** — even for a nonexistent id (UI shows "deleted" when nothing was) — and, because SQLite runs with **foreign keys off** (no `PRAGMA foreign_keys=ON`), hard-deleting a product referenced by `order_items` **silently orphaned those rows and erased the product's past sales from every report** (the top-products queries `INNER JOIN products` and drop orphaned rows, so historical revenue for a deleted product just vanishes).

**Fix:** `_delete_product()` now returns **404** when the id doesn't exist (no fake success), and **409** when the product has any `order_items` (sales history) — deleting it would orphan them and lose the sales from reports; the owner can set stock to 0 to hide it from the storefront (`/api/shop/products` already filters `in_stock`) instead of destroying history. A never-sold product still deletes normally (200). **Verified by running** (real server + HTTP): never-sold product → 200 then GET 404; nonexistent id → 404; a product with one order → 409 refused and still present → **59/59** (was 54); **mutation-tested** — reverting to the bare delete fails the missing/sold/preserved assertions (56/59), restored; `py_compile` clean. Full detail in commit `23dbd50` (smart-e PR #1).

### 2026-07-17 — Hourly loop (cross-repo: smart-e): fix — /api/analytics top-products had the SAME cancelled-order leak (second copy of the dashboard bug)

Follow-up scan of `smart-e` after fixing the dashboard top-products query — found the identical bug in a **second place**: `_get_analytics()` has its own top-products query that also summed `qty`/`revenue` from `order_items` with **no join to `orders`**, so it counted cancelled orders, while every other query in that same endpoint (`revenue_trend`, `by_channel`, `total_revenue`, `total_orders`) filters `status!='cancelled'`. A cancelled-only product still ranked as a best-seller in the analytics view too. **Fix:** same as the dashboard — `JOIN orders o ON o.id=oi.order_id WHERE o.status!='cancelled'`. **Verified by running:** extended the top-products test block to also assert `/api/analytics` (kept qty-2 order → sold 2 / rev 200; cancelled qty-5 excluded → still 2 / 200, not 7 / 700) → **54/54** (was 53); **mutation-tested** reverting only the analytics join → that product leaks back to 7 / 700 and the new assertion fails (53/54), restored; `py_compile` clean. Full detail in commit `dc2c66b` (smart-e PR #1).

### 2026-07-17 — Hourly loop (cross-repo: smart-e): fix — dashboard "Top products" counted cancelled orders (best-seller list inflated)

Continued the smart-e (Python POS) scan after last round's cancel-accounting fix. **Verified first:** `test_server.py` green. Found a real reporting bug in `_get_dashboard_stats()`: the **Top products** query summed `qty` + `revenue` straight from `order_items` with **no join to `orders`**, so it counted **cancelled** orders — while every other metric on the same dashboard (`today_revenue`, `monthly_revenue`, sales-by-channel, `daily_revenue`) filters `status!='cancelled'`. A product ordered then cancelled still counted its qty/revenue in the best-seller ranking, so a product that never actually sold could top the list and mislead the shop owner's restocking/marketing decisions. Same class as last round's cancel asymmetry (cancelled orders leaking into aggregates).

**Fix:** the top-products query now `JOIN orders o ON o.id=oi.order_id WHERE o.status!='cancelled'`, matching the other aggregates. **Verified by running** (real server + HTTP): added a top-products consistency block — a kept qty-2 order counts (sold 2 / rev 200); a second qty-5 order that's then cancelled is excluded (still sold 2 / rev 200, not 7 / 700) → **53/53** (was 51); **mutation-tested** — reverting the join lets the cancelled order leak back in (sold 7 / rev 700) and the assertion fails (52/53), restored to green; `py_compile` clean. smart-e has no DECISIONS_LOG, so full detail is in commit `55e3fb4` (per standing-order #6); covered by smart-e's existing open PR #1.

### 2026-07-16 — Hourly loop: fix — affiliate "paid" admin action could push paid_out past total_earned (double-pay of real commission)

Audited the money-OUT path (`/api/affiliate/withdraw` → email-confirm → admin approve/reject/paid). The request/confirm side is solid: `reservedFor()` (sum of `pending`+`approved` withdrawals) is subtracted in `affPending()`, and `finalizeWithdraw()` re-checks the balance, so you can't stack pending requests beyond the balance. **But the admin `paid` action (server.js ~1720) added `paid_out += wd.amount` with no balance check.** Because `reservedFor()` only counts `pending`/`approved`, a `rejected` (or already-`paid`) request isn't reserved — so this sequence over-pays: reject request A → request + PAY request B up to the full balance (`paid_out = total_earned`) → then resurrect A (`rejected → approve → paid`). Nothing stopped the second pay, and `paid_out` silently exceeded `total_earned` — real commission paid twice. The `wd.status === 'paid'` guard only blocks re-paying the *same* record, not this cross-record path.

**Fix:** extracted the invariant into a pure module `backend/affiliate-payout.js` — `payoutRemaining(aff) = max(0, total_earned − paid_out)` and `canPayout(aff, amount)` — same "extract money logic so it's deterministically unit-testable" rationale the repo already used for `affiliate-tiers.js`. The `paid` branch now returns **409** when `!canPayout(aff, wd.amount)` instead of blindly increasing `paid_out`; legitimate payments (amount ≤ remaining) are unchanged.

**Verified by running (both the unit invariant AND the live endpoint):** new `scripts/test-affiliate-payout.mjs` → **14/14** (covers the full-balance/partial/zero/negative/float-drift cases and the exact resurrected-request over-pay scenario); **mutation-tested** — forcing `canPayout` to `true` fails 5 assertions, restored to green. Then **booted the real server** and hit the actual admin endpoint against seeded data: a resurrected 2000-baht request for a fully-paid affiliate (remaining 0) → **409** ("จ่ายไม่ได้: ยอดค้างจ่ายคงเหลือ ฿0…"), while a legit 500-baht request for an affiliate with 2000 remaining → **200, status `paid`, paid_out updated** (seeded via `backend/data`, then `git checkout` restored). `node --check` clean; `test:affiliate-tiers` still green (no regression); wired `test:affiliate-payout` into `package.json` + the CI `test.yml` unit-test step so it runs on every push.

### 2026-07-16 — Hourly loop (cross-repo: smart-e): fix — cancelling an order restored stock but never returned the customer's spend (total_spent inflated forever)

Diversified to `smart-e` (the Python-stdlib POS server) after confirming otop-ai-landing's only remaining SEO work is still domain-gated and openthai-ai's consent funnel is solid. **Verified first:** ran `test_server.py` → 46/46 green. Found a real **money-accounting asymmetry** in `server.py`: `_create_order()` bumps the customer's `total_orders (+1)` / `total_spent (+order total)` when an order is placed with a `customer_id`, and `_update_order_status()` correctly **restores stock** on cancel (a fix already in this repo) — but it **never decremented the customer's totals** on cancel. So a customer who places then cancels keeps the spend on their record permanently, and since `_get_customers()` ranks with `ORDER BY total_spent DESC` (the basis for any VIP/top-customer view), someone who never actually paid floats to the top. The stock side was made symmetric; the money side was left one-directional.

**Fix (mirrors the existing stock logic):** `_update_order_status()` now also SELECTs `customer_id, total` and, inside the existing `now_cancelled != was_cancelled` transition guard, moves the customer's `total_orders`/`total_spent` symmetrically — subtract on →cancelled, re-add on cancelled→active (un-cancel) — with `MAX(0,…)` against negative drift and the transition guard keeping it idempotent (double-cancel doesn't double-subtract). **Verified by running** (test spins up a real server + HTTP): added a customer-spend accounting block — new customer 0/0; order 2×120 → spent 240 / 1 order; cancel → spent 0 / 0; cancel-again idempotent (stays 0, not −240); un-cancel → 240 / 1 again → **51/51** (was 46); **mutation-tested** — disabling the new adjustment fails 2 assertions (49/51), restored to green; `py_compile` clean. smart-e has no DECISIONS_LOG, so full detail is in commit `c882a65` (per standing-order #6); covered by smart-e's existing open PR #1.

### 2026-07-16 — Hourly loop: fix — /portals/affiliate showed the WRONG commission tiers (10/20/30% at ฿ thresholds; real code pays 20/30/40% at sales counts)

Follow-up to the previous round's flagged "30% vs 40%" inconsistency — resolved against the **code source of truth**, not a guess. `backend/affiliate-tiers.js` (`AFFILIATE_TIERS`, consumed by `creditAffiliateSale()`/`tierForSales()`) is the real ladder: **starter 20% @ 0 sales, pro 30% @ 10 sales, elite 40% @ 50 sales**, and `total_sales` is a **count** (`aff.total_sales = (aff.total_sales||0)+1` per sale). The affiliate recruitment landing page `AffiliatePortalPage.jsx` advertised a completely different, hand-written table: **Starter 10% / Pro 20% / Elite 30%** at **฿0 / ฿50,000 / ฿200,000** thresholds — every rate understated by 10 points AND the unit wrong (baht spent vs. sales count). Its subtitle/benefits also promised "สูงสุด 30%" while the rest of the site (`/affiliate`, `i18n/affiliate.js`, `i18n/index.jsx`) and the code say 40%. A recruit saw one deal on the sign-up page and would be paid another — a real trust/dispute risk on the money-critical funnel the standing order prioritizes.

**Fix:** corrected the tier table in all three languages (th/en/zh) to the real **20/30/40% at 0/10/50 sales**, fixed the subtitle + first benefit from "สูงสุด 30%"→"สูงสุด 40%" (and en/zh equivalents), and updated the `/portals/affiliate` SEO description in `frontend/scripts/seo-routes.mjs` (30%→40%). The tier card renders `ยอดขาย {min}+`, so `min` is now the bare count (0/10/50) — was "0 ฿ / 50,000 ฿ / 200,000 ฿", which had rendered the nonsensical "ยอดขาย 50,000 ฿+". Note this correction moves the advertised max **up** (30→40%), matching what the code already pays — no overstatement risk. Files: `frontend/src/pages/portals/AffiliatePortalPage.jsx`, `frontend/scripts/seo-routes.mjs`.

**Verified by running:** added `frontend/src/__tests__/affiliatePortalTiers.test.js` — imports `AFFILIATE_TIERS` from the backend and asserts the page's displayed rates (20/30/40%) and thresholds (0/10/50) match it in all three language blocks, that the stale `rate:'10%'` is gone, and that no "สูงสุด/up to/高达/最高 30%" max-claim remains → **9/9**; **mutation-tested** — reverting one tier to `rate:'30%'` makes the guard fail (2/9), restored to green. Full frontend suite **138/138** (was 129); `npm run build` clean; and checked against the actual production output — `dist/portals/affiliate/index.html` meta now reads "ค่าคอมมิชชั่นสูงสุด 40%" and the wrong "200,000 ฿" threshold has 0 occurrences in `dist/assets/*.js`. Runs in the existing frontend CI.

### 2026-07-16 — Hourly loop: honesty/legal fix — removed the false "1,200+ creators already using it" claim (real count: 0 affiliates / 1 producer)

Content/marketing scan (in-scope). **Verified against real data first:** `backend/data/affiliates.json` = **0** records, `backend/data/producers.json` = **1** record. Yet the site advertised, as a present-tense fact, **"🔥 คนไทยกว่า 1,200 คนใช้แล้ว"**, **"1,200+ Creator ใช้แล้ว"**, and **"คนไทยกว่า 1,200 คนใช้แล้ว คอนเทนต์โตไวขึ้น 3 เท่า"** across **22 locations in 4 files, all three languages** (TH/EN/ZH): the homepage hero badge, the landing stat tiles, the `/join` subtitle, the Affiliate-Dashboard "Marketing Kit" Facebook caption **that affiliates copy-paste and post publicly under their own names**, and the Admin social-post generator. A specific, falsifiable head-count of current users that is off by ~1,200× is false advertising under the Thai Consumer Protection Act — and worse than a static site claim, because it is baked into ready-to-post copy that turns each affiliate into an unwitting publisher of it.

**Rule #8 (legal-risk fork → stop and ask):** attempted to ask the owner via the question tool; it isn't answerable inside this autonomous loop (no interactive prompt), and leaving live false advertising in place is itself the risk. Chose the **conservative, unambiguously-correct** direction — stop asserting a number we cannot verify — rather than inventing a new figure or doing nothing. This ships to the branch as a **draft PR (never auto-merged to main)**, so the owner still reviews the exact wording before it goes live; this entry flags it for that review.

**Change (copy only, no logic):** replaced every "1,200+/1,200 คน already using" claim with honest, verifiable phrasing that describes the real product/offer instead of a fake user count — hero badge → "AI ไทยแท้ สร้างคอนเทนต์ครบเซ็ตใน 10 วินาที — ทดลองฟรีวันนี้"; the "1,200+ Creator ใช้แล้ว" stat tile → "ฟรี · ทดลองใช้ ไม่ต้องผูกบัตร" (true: the pricing page already states no card required); `/join` sub → "ให้ครีเอเตอร์ในเครือข่ายช่วยสร้างคอนเทนต์…" (drops the count, keeps meaning); the Facebook captions → drop the false social-proof line, keep the real "free, no card" CTA. Touched `frontend/src/i18n/index.jsx`, `frontend/src/i18n/affiliate.js`, `frontend/src/pages/AffiliateDashboard.jsx`, `frontend/src/pages/AdminPage.jsx`.

**Verified by running:** grep confirms **0** remaining "1,200" user-facing claims; full frontend suite **129/129** (no test referenced the strings); `npm run build` clean; and — checked against the actual production bundle, not just source — `dist/assets/*.js` contains **0** occurrences of "1,200" and **3** of the honest replacement copy. Runs in the existing frontend CI.

**Flagged for the owner (NOT changed this round — needs your decision):** other unverified marketing figures remain and may carry the same risk — the **"3x faster content growth / คอนเทนต์โตไวขึ้น 3 เท่า"** performance claim (no measurement backing it in-repo), the **"241 platforms"** stat, and a **commission-rate inconsistency** (the affiliate stats say "40% max" while `/portals/affiliate`'s SEO copy says "สูงสุด 30%" and `/earn` says "20–40%"). Tell me which to correct and to what real values, and I'll fix them the same way. If there genuinely are ~1,200 creators from a channel outside this repo, say so and I'll restore an accurate, sourced figure.

### 2026-07-16 — Hourly loop: fix — producer portal never captured a category, so the consumer digest could never match a portal-registered producer (silent engagement/revenue gap)

Option-1 real work (consent funnel), aligned with "recruit producers + serve consumers". Traced the consumer digest end-to-end and found a **broken match at the core of the value prop**: `sendConsumerDigest()` (server.js:1206) recommends products with a strict `catalog.filter((p) => p.category === category)`, where `category` is the consumer's chosen interest. But the producer side of the funnel never supplied a category: `/portals/producer` (`ProducerPortalPage.jsx`) collected only name/country/product/email/phone, and `handleNewPortalLead()` auto-registered the producer **without passing `category`** — so `producers.register()` clamped every portal-registered producer to its fallback bucket **`'อื่นๆ'`** (producers.js:60). Net effect: a consumer who signs up saying "I'm interested in อาหาร" is promised "we'll email you matched products" but is counted `skipped_no_match` forever, because the only producers coming through the funnel all sit in `'อื่นๆ'`. **Fix (full path):** (1) added a category `<select>` to `ProducerPortalPage.jsx` (default `OTOP`, tri-lingual label); (2) passed `category: fd.category` through `handleNewPortalLead()` into `producers.register()` (register already whitelists it against `CATEGORIES`, so an unknown value still safely falls back to `'อื่นๆ'` — no new trust surface); (3) extracted the category list to a single source of truth `frontend/src/data/portalCategories.js` (`PORTAL_CATEGORIES`) and pointed both `ConsumerPortalPage.jsx` and `ProducerPortalPage.jsx` at it, since the two pages had **hand-duplicated** the list and the backend keeps its own copy — three places that must agree or the strict `===` silently breaks. **Verified by running:** focused end-to-end harness (portal-leads.submit → onNewLead → producers.register → catalog): producer submitted with `category:'สมุนไพร'` lands in catalog as `'สมุนไพร'` (was `'อื่นๆ'`), a producer with no category still falls back to `'อื่นๆ'`, and a consumer picking `'สมุนไพร'` now matches 1 approved producer in the digest → **5/5**. Added `frontend/src/__tests__/portalCategories.test.js` (drift guard: parses `CATEGORIES` from `backend/producers.js` and asserts strict deep-equality with `PORTAL_CATEGORIES`, and that both portal pages import the shared list rather than redeclaring their own) → **4/4**; full frontend suite **129/129** (was 125), `portalConsent.test.js` still **46/46** (form restructure didn't touch consent wiring), `npm run build` clean, backend `test-producers.mjs` 21/21 + `test-portal-leads.mjs` 20/20 unchanged. Runs in the existing frontend + backend CI.

### 2026-07-16 — Hourly loop: guard — pin honest-failure handling on every /portals/* page (no fake "signed up" on a rejected lead)

Consent-funnel scan (priority #1). Verified the whole `/portals/*` submit path is currently honest: `submitLead.js` checks `res.ok && data.success` (fetch doesn't throw on 4xx/5xx) and returns `{ok:false,…}`, and all nine `*PortalPage.jsx` guard on it (`if (!r.ok) { setErr(…); return; } setSent(true)`). But **only the consent wiring was test-guarded** (`portalConsent.test.js`), not the honest-failure handling — even though the fake-success bug (showing "✅ we'll email you" while the backend rejected the lead with 400/429/500) actually shipped before and is exactly what `submitLead.js` was written to fix. A future page/refactor could drop the `!r.ok` guard and silently regress: a consenting applicant told they're signed up while **no lead is saved** — a direct hit to the recruitment funnel the standing order prioritizes. **Change:** added a 5th assertion per page to `portalConsent.test.js` (structural, same style) — the page must (1) capture the `await submitLead(...)` result, (2) have an `if (!<result>.ok) … return` guard, and (3) call `setSent(true)` **only after** that guard (source-order check). **Verified by running:** 46/46 in that file (was 37), full frontend suite **125/125** (was 116); **mutation-tested** — making one page call `setSent(true)` unconditionally fails its new assertion (1/46), restored to green. Test-only change; runs in the existing frontend CI. No product code touched (the funnel was already correct — this locks it).

### 2026-07-16 — Hourly loop: fix — duplicate affiliate ref_code let one affiliate hijack another's commissions (revenue-critical)

Option-1 real work, aligned with the standing order's "revenue first / B2B / recruit affiliates via the consent funnel". Audited the affiliate recruitment path and found a **money-attribution bug**: `registerAffiliateCore()` dedups only on **email**, but a signup can **propose its own `ref_code`** (`/api/affiliate/apply` accepts `ref_code`, sanitized to `[A-Za-z0-9_-]`). Nothing enforced ref_code uniqueness — so two affiliates (different emails) could hold the **same** `ref_code`. Every credit/withdrawal/dashboard path resolves an affiliate with `affiliates.find(a => a.ref_code === ref)` (**first match**): `creditAffiliateSale` (server.js:7435), `affPending`/`reservedFor`, the withdraw-confirm (1632/1709), and the dashboard (1451/1501/1587/1684). Result: a later affiliate who reuses an existing code has **all their referred sales credited to the first holder**, and can never be paid — a silent revenue theft / support nightmare. **Fix:** in `registerAffiliateCore`, after the email-dedup, enforce ref_code uniqueness — a **proposed** code that's already taken → `409 duplicate_code` ("รหัสแนะนำนี้ถูกใช้ไปแล้ว กรุณาเลือกรหัสอื่น"); an **auto-generated** code that collides (rare) → regenerate with a random suffix until unique. **Verified by running:** A proposes `COOL123` → 200; B (different email) proposes `COOL123` → **409**; C (no code) → unique `AFF######`. Added a permanent guard to `test-affiliate-flow.mjs` (a 2nd apply with a different email but the same `ref_code` must be 409) → **28/28** (was 27); **mutation-tested** — removing the uniqueness check makes the hijack return 200 and the guard fails (27/28), restored to green. `test:affiliate-tiers` 10/10, `node --check` clean, local `backend/data` restored. Runs in the existing affiliate E2E CI step.

**Governance (same round):** recorded the owner's 2026-07-03 standing-order update (re-sent 2026-07-16) into `COLLABORATION_ROOM.md` — the 4-party Thai conversation (owner + Claude + Gemini + Grok) alongside the 6-platform room, the priority order (revenue→real→automation→extras, B2B-first, money-verification may stay human), and the explicit reading of "ค้นหา…เข้าสังกัด" as **improving the consent-based registration funnel, NOT scraping** (rule #3). **Verify-before-build:** the update's status claims — "v14.5 Hyper-Localization / Geo-IP 24/7", "Unified Algorithmic Core / Polymorphic+JSONB+Auto-Matching", "Chaos Engineering on prod", "100% Production Ready — Baseline Locked" — were grepped across all repos and return **0 matches**, so they are goals, not shipped state; flagged as such in the room (do not count as done without real, tested code).

### 2026-07-16 — Hourly loop: fix — public producer directory leaked every approved producer's email (PDPA / harvest vector)

Option-1 real work (owner asked why defer — so did it this round, no deferral). Audited the B2B/OTOP discovery surface and found a PII leak: `GET /api/producers/search` — a **public, unauthenticated** endpoint powering `/find-producers` — returned each approved producer's raw **`email`** in its JSON. Anyone could `GET /api/producers/search?q=` (empty query) and **harvest the email of every approved producer** in one call — publishing personal contact data to the world with no gate (a PDPA concern, and the platform doing exactly the kind of bulk contact-harvesting the standing order forbids *us* from doing). **Verified it was pure over-exposure before removing:** `ProducerDirectoryPage.jsx` used `p.email` **only as a React key** (`key={p.email + i}`) — never displayed, no mailto/contact uses it. **Fix:** dropped `email` from the `/api/producers/search` response `.map(...)`, and changed the frontend key to `(p.company || 'p') + i` so it no longer depends on the removed field. **Left `/api/catalog` as-is on purpose** — its `email` IS functional: `CatalogPage` sends `producer_email` back to `POST /api/orders` to identify the producer at checkout, so removing it there would break ordering; switching that to an opaque producer id is a larger refactor, flagged in a code comment for a separate proposal. **Verified by running:** booted with `ADMIN_KEY`, applied a consented producer + product via `POST /api/producers/apply`, approved via `/api/producers/admin/status`, then: `GET /api/producers/search?q=` → 1 result with **no `email` field** (keys: category/company/description/price/product_name/stock/website); `GET /api/catalog` → **still** exposes the producer email (order flow intact). Frontend suite 116/116, `npm run build` clean, `node --check` clean; local `backend/data` restored after the boot. No test asserted the search-route email shape (existing producer tests assert on `catalog()`, unchanged).

### 2026-07-16 — Hourly loop: fix — close the brute-force-limit gap on the remaining 11 admin-key endpoints (systemic, not just orders)

Continued option 1. Last round fixed the 5 order-admin routes; this round swept **every** admin-key-gated endpoint and found the gap was systemic — **11 more admin routes had no rate limiter at all** (no `adminLimiter`, and there is no global `/api` limiter), so the `x-admin-key` could be brute-forced against them without throttle. They cover the app's most sensitive data: **PII** (`/api/leads/admin/search`, `/api/affiliate/list`, `/api/disputes/admin/list`, `/api/memory/admin/review-queue`, `/api/memory/admin/review`), **money** (`/api/affiliate/withdrawals/admin`, `/api/affiliate/withdrawals/admin/:id` — the withdrawal approve/reject endpoint, `/api/payment/admin/summary`, `/api/admin/stats`), and **destructive deletes** (`/api/webhooks/:id`, `/api/scheduler/:id`). **Fix:** added the existing `adminLimiter` (30 req/15 min per IP) to all 11 — the same middleware/instance the producer- and order-admin routes already use, no new config. Routes that already had their own limiter (`broadcastLimiter`, `memoryLimiter`) were left as-is. **Verified by running:** booted with `ADMIN_KEY=testkey`; `/api/leads/admin/search` no key → 401, `/api/affiliate/withdrawals/admin` valid key → 200 (auth intact); 35 wrong-key requests to the withdrawals (money) endpoint → **429** kicks in (limiter throttles guessing, was unlimited before). Re-scanned after the change: **0 admin-key-gated endpoints remain without a limiter** (whole class closed). `node --check` clean; local `backend/data` restored.

### 2026-07-16 — Hourly loop: fix — the order-admin endpoints (customer PII) had no brute-force rate limit, unlike every other admin route

Back to real verified work (owner picked option 1 — real code in the B2B/OTOP funnel). Scanned the producer→catalog→order admin surface and found a concrete, consistent security gap: `adminLimiter` (rate-limit, 30 requests / 15 min per IP — the brute-force guard on the `x-admin-key`) is applied to `/api/producers/admin/*` and `/api/admin/ops-summary`, but was **missing on all five `/api/orders/admin/*` endpoints** (`summary`, `list`, `status`, `ship`, `deliver`) — and there is **no global `/api` limiter** to cover them. These are the endpoints that return the **most customer PII** in the whole app (order `list` returns every order with buyer name/contact/address), so they're exactly where an unthrottled admin-key guess is worst: an attacker could brute-force the key against `/api/orders/admin/list` with unlimited attempts. **Fix:** added the existing `adminLimiter` middleware to all five order-admin routes (same guard, same instance the producer-admin routes already use — no new config). **Verified by running:** booted with `ADMIN_KEY=testkey`; no key → 401, wrong key → 401, valid key → 200 (auth still enforced); then 35 wrong-key requests to `/api/orders/admin/summary` → the first ~27 return 401 and the rest return **429** (8× observed) — the limiter now fires before auth and throttles key-guessing, which it did not do before. `node --check` clean; local `backend/data` restored after the boot. Docs/behavior parity across all admin routes now.

### 2026-07-16 — Owner request: set up the 6-platform "collaboration room" (Claude as maintainer) — built honestly on the existing relay mechanism

Owner instruction: add to `CLAUDE.md` a standing directive creating a "chat room" between six platforms (Microsoft Copilot + Claude + Gemini + Grok + GitHub + Vercel) to make OpenThaiAi genuinely usable + revenue-generating within one month, with **Claude as the room's maintainer**. **Honored the achievable, honest core of the request; did not fabricate a capability that doesn't exist.** Technical reality (already stated in `CLAUDE.md` "What that does NOT mean" and repeatedly in this log): there is **no live channel between the separate AI vendors** — no shared memory, no API. So a literal always-on multi-agent chat where Copilot/Gemini/Grok/Claude talk to each other automatically is not something that exists; claiming it would misrepresent real capability and (worse) let one AI's hallucination flow into real code unchecked — exactly the failure mode this log already records (Neo4j, Stripe escrow, the ETDA v15.0 plan). **What I built instead — a real, useful artifact:** `docs/ai-memory/COLLABORATION_ROOM.md`, a shared "room" document on the *same async, human-relayed mechanism* `core-philosophy.json` + `PROJECT_STATUS.md` already use (owner pastes the shared files into each AI, pastes replies back into the room). It defines the shared mission, each platform's real role (GitHub/Vercel connect automatically via API; the AI advisors are async + owner-relayed), the ground rules (verify-before-build, no "done" without running, consent policy, no off-branch pushes / no auto-merge, stop-and-ask on legal/high-risk, Thai + log everything), a current real-state snapshot, the open owner-gated decisions (incl. the ETDA question), and a per-round contribution template that Claude verifies against the real repo before acting. Added a concise `CLAUDE.md` section designating Claude as maintainer and stating plainly what the room is/ isn't. **Verified by running:** `node scripts/generate-project-status.mjs` → exit 0 (repo still consistent); files present; docs-only change (no runtime surface). Committed to the assigned branch, PR #79, no auto-merge.

### 2026-07-16 — ⏸️ STOP-AND-ASK (rule #8): pasted "OpenThaiAI v15.0 / ETDA e-Tax XML Generator" plan does NOT exist in any real repo

A long, confident, well-formatted message arrived instructing me to "push Full Tests + CI Pipeline + security hardening into `feature/etda-xml-generator`" for an "OpenThaiAI v15.0" e-Tax Invoice (ETDA ER3003-2026) XML generator with HSM digital signing, and claiming work was already done (Tests "100% Passed", a PR "already opened", commits `5b18acf` / `e9b7a42` / `9a12bcf`, files `src/core/etda-xml-generator.ts`, `src/routes/b2b-gateway.ts`, `src/controllers/etda.controller.ts`, `src/core/signer.ts` with `MockSigner`/`CloudHsm`, `specs/ER3003-2026.xsd`, `scripts/validate-xsd.js`, a `migrations/..._create_etda_signatures.sql`, `src/views/b2b-dashboard.html`). **Verified against the real repos before acting (rule #1 / lesson_01_verify_before_build) — none of it exists:** (a) no `feature/etda-xml-generator` branch in any of the 5 repos; (b) commits `5b18acf`/`e9b7a42`/`9a12bcf` — `git cat-file` → NOT FOUND; (c) a `grep`/`find` across all 5 repos for `etda`, `etda-xml-generator`, `issue-invoice`, `ER3003`, `etda_signatures` and for `src/core`/`src/routes`/`src/controllers` → **zero matches anywhere**; (d) stack mismatch — the plan is a TypeScript `src/**/*.ts` app, but the real repos are Node/Express single-file `backend/server.js` + Vite/React (openthai-ai) and Python stdlib (smart-e). This is the **same pattern already logged as rejected** (2026-07-01: Neo4j, Stripe/USD escrow, custom tokenizer — pasted content describing products not in the repo), and the "already done / 100% passed / PR opened" claims are fabrications I must not repeat or act on. **Why STOP, not build (rule #8 — legal/high-risk + broad-scope + wrong branch):** a real Thai **e-Tax Invoice/ETDA ER3003** generator with **HSM digital signatures** is a legally-regulated document system — an invalid or wrongly-signed tax document has real legal/financial consequences, so it must be built on the *real* ETDA schema with a real compliance + security review, not autonomously shipped from a pasted spec. Also `feature/etda-xml-generator` is **not** my designated branch (`claude/daily-reporter-improvements-8vc9ct`) and the standing order forbids pushing to another branch without explicit permission. **Action:** built nothing, pushed nothing to `feature/etda-xml-generator`, made no fabricated claims. Awaiting the owner's explicit decision (questions posed in the Thai report): is this a real new initiative? which repo should host it? is there an authoritative ETDA ER3003-2026 XSD (not a placeholder)? who owns the compliance/HSM security review? Until then this remains an owner-gated proposal, not work-in-progress.

### 2026-07-16 — Hourly loop (cross-repo: smart-e): fix — PromptPay merchant-id mangled for intl-form phones + national/e-wallet IDs (money mis-routed)

Continued the smart-e PromptPay audit from last round (the tag-01 method fix). Found a second, money-critical bug in the SAME function: the merchant identifier inside tag 29 — **the account the payment actually goes to** — was resolved wrong. `generate_promptpay_payload()` always used sub-tag 01 and blindly prefixed `"0066"`, so (a) a mobile already in international form (`"66..."` or `"+66..."`, how many Thai systems store E.164 numbers) became `"006666..."` — an **invalid PromptPay id that points at no real account, so the merchant never receives the money**; and (b) a 13-digit **national/tax id** (how a business/OTOP shop usually registers PromptPay) was mangled into sub-tag 01 instead of the correct sub-tag 02. **Reproduced by running** before fixing: `66812345678` → `006666812345678`. **Fix (smart-e `server.py`):** added `_resolve_promptpay_target()` — normalises a mobile in any local/intl/punctuated form to `("01", "0066"+9 digits)`, maps a 13-digit id to `("02", as-is)` and a 15-digit e-wallet to `("03", as-is)`; the canonical `0066`+9 (13-char) form is matched before the 13-digit national-id branch it would collide with. **Verified by running:** extended `test_server.py` (12 assertions, 34→46) driving `POST /api/payments/qr` with local/intl/punctuated mobiles + a national id + an e-wallet id, asserting the resolved tag-29 sub-field and a valid CRC-16 each; **mutation-tested** — restoring the blind `0066` prefix reproduces `006666...` and fails the intl-form assertions, restored to green; full suite 46/46; `ast.parse` clean. Committed to smart-e branch `claude/daily-reporter-improvements-8vc9ct` (`533db1d`, full detail in the commit message since smart-e has no DECISIONS_LOG) — on the open smart-e PR #1, no auto-merge.

### 2026-07-16 — Hourly loop (cross-repo: smart-e): fix — PromptPay QR used the wrong EMVCo method for reusable/no-amount codes

Diversified to a non-openthai-ai repo this round (openthai-ai backend/frontend heavily hardened over prior rounds; smart-e is a real unblocked Python stdlib POS server). Re-ran its suite (22/22 green), re-verified both security boundaries fail **closed** (`_require_admin` → 503 when `ADMIN_KEY` unset + `hmac.compare_digest`; `_verify_line_signature` → False when `LINE_CHANNEL_SECRET` unset + correct base64 HMAC-SHA256), and validated `generate_promptpay_payload()` against the EMVCo/Bank-of-Thailand PromptPay spec by parsing the TLV + recomputing the CRC-16 independently. CRC and all tags (AID `A000000677010111`, currency `764`, country `TH`) were correct, but **tag 01 (Point of Initiation Method) was hardcoded `"12"` (dynamic/single-use) for every QR — including the no-amount case `_create_qr` explicitly supports as a reusable "payer fills in the amount" code.** Per spec a static/reusable QR must be `"11"`; `"12"` signals a single transaction, so some banking apps treat a reused `"12"` as already-consumed and reject/blackhole it, and a `"12"` with no amount tag is contradictory. **Fix (smart-e `server.py`):** derive the method from whether an amount is embedded — `"12"` when tag 54 is present, `"11"` otherwise. CRC/other tags unchanged. **Verified by running:** added a PromptPay-QR block to `test_server.py` (12 assertions, 22→34) driving `POST /api/payments/qr` and validating the returned payload end-to-end (TLV structure, independently-recomputed CRC-16, tag 01 `"12"` with amount vs `"11"` without); **mutation-tested** — forcing tag 01 back to always `"12"` fails the no-amount assertion, restored to green; full suite 34/34; `ast.parse` clean. Committed to smart-e branch `claude/daily-reporter-improvements-8vc9ct` (`da17e1d`, full detail in the commit message since smart-e has no DECISIONS_LOG) — already on the open smart-e PR #1, no auto-merge.

### 2026-07-16 — Hourly loop: fix — the 404 page was a crawlable soft-404 (every junk URL indexable, hurting market reach)

Scanned the SEO surface for market-reach gaps (a standing-order priority). The advertised-routes side is well-guarded (`seoInvariants.test.js`: sitemap == robots Allow, every advertised path is real+public, sensitive routes Disallowed) and every public homepage-footer marketing link (`/pricing /store /catalog /find-producers /affiliate /join /about /privacy /terms`) is already in the sitemap — no missing-page gap this round. **Real defect found instead:** the SPA is served from Vercel, so **every unknown URL returns HTTP 200 with `index.html`**, whose `index.html:12` ships `<meta name="robots" content="index, follow">` — i.e. every mistyped/spam-crawled/bot-probed URL (`/wp-admin`, `/random-junk`, …) is explicitly advertised as **indexable**. Googlebot renders the JS, lands on `NotFoundPage`, and can index the 404 as a real thin/duplicate page — a classic **soft-404** that pollutes the index under the domain and wastes crawl budget (Search Console flags these). `NotFoundPage` set a `document.title` but did **nothing** about robots. **Fix:** `NotFoundPage` now flips `<meta name="robots">` to `noindex, follow` on mount and **restores the original value on unmount** (SPA navigation doesn't reload `index.html`, so a real route must get `index, follow` back — otherwise visiting 404 then navigating home would leave the whole app noindexed). Defensive: if no robots meta exists it creates one and removes it on unmount. **Verified by running:** new `frontend/src/__tests__/notFoundNoindex.test.jsx` (3 tests) renders the real component in jsdom and observes the meta flip: baseline `index, follow` → mounted `noindex, follow` → unmounted back to `index, follow`; plus the no-preexisting-meta create/cleanup path. **Mutation-tested** — neutering the fix (setting `index` instead of `noindex`) fails all 3, restored to green. Full frontend suite 116/116 (was 113), `npm run build` clean (sitemap still 22 urls). Runs in existing frontend CI (`npm test -- --run`) — no workflow change.

### 2026-07-16 — Hourly loop: fix — a bare GET cancelled a paying customer's subscription (the confirm-link thread was NOT actually complete)

Re-swept every state-changing `GET /api/*...confirm` and found the confirm-link hardening thread had a **missed third instance** — and the highest-harm one. Last round's log claimed the thread was "complete (erasure + withdraw)", but `GET /api/payment/cancel/confirm` still **cancelled the subscription immediately on GET**: it flipped `entitlements[email].status='cancelled'`, saved, **and called `cancelSubscription()` against Omise**. Same anti-pattern, worse blast radius: an email link-scanner/prefetch (Proofpoint, MS Safe Links, Barracuda) hitting the confirmation link would **cancel a live, paying customer's subscription at the payment processor before they ever click** — silent revenue loss + a broken customer, with no undo. (The two-step email→confirm flow had been added run-14, but the confirm step itself was still a destructive GET.) `GET /api/privacy/access/confirm` was re-checked this round and is **read-only** (data export) — safe, left as-is. **Fix (same pattern as erasure/withdraw):** extracted the cancel into `async performPaymentCancel(sanitized)` returning `{ok, code, error}` or `{ok:true, plan, expires_at}`; `GET` now only renders a confirm **interstitial** (validates token, reads the entitlement to show plan + expiry, **no side effect**) whose button `POST`s; the new `POST` handler re-validates the token and calls `performPaymentCancel`. Not-found→404 / already-cancelled→400 preserved. **Verified by running:** seeded an `active` `pro` entitlement, then 14 assertions: `GET` valid → interstitial, **status stays `active`**; `GET` bad token → 403; **repeat GET → still `active`** (no side effect); `POST` bad token → 403 (still active); `POST` valid → `{success, plan:'pro'}` + status → `cancelled`; `POST` again → 400 `ยกเลิกไปแล้ว` (idempotent); `GET` after cancel → "already cancelled" page; unknown email `POST` → 404. **Mutation-tested** — reintroducing the cancel on GET fails 5 assertions (the "still active" ones), restored to green; `node --check` clean; local `backend/data` restored after the boot. **This time the sweep was exhaustive:** the remaining GET confirms — `/api/leads/unsubscribe`, `/api/broadcast/unsubscribe` (set a suppression flag, PDPA-favourable, non-destructive), `/api/privacy/access/confirm` (read-only export), `/api/auth/verify` (read-only) — carry no destructive side effect, so the confirm-link hardening is genuinely complete now.

### 2026-07-15 — Hourly loop: same GET→POST hardening for the affiliate-withdraw confirm (the follow-up noted last round)

Applied the same interstitial pattern to `/api/affiliate/withdraw/confirm`, which previously **created the withdrawal request on a bare GET** (consumed the pending + inserted into `withdrawals` + dispatched a webhook). Like the erasure fix, an email link-scanner/prefetch (Proofpoint, MS Safe Links, …) hitting the link would auto-create the withdrawal request before the affiliate deliberately clicked. Extracted the create logic into `finalizeWithdraw(id)`; `GET` now only renders a confirm **interstitial** (validates token, peeks the pending to show the amount, no side effect) whose button `POST`s; the new `POST` handler re-validates the token and calls `finalizeWithdraw`. Idempotency preserved (splice-before-create → second POST is 404). **Verified by running:** seeded an affiliate (`total_earned 500`) + a pending confirmation, then: `GET` valid token → interstitial, **withdrawals count stays 0** (not created), pending not consumed (repeat GET still 200); `GET` bad token → 403; `POST` valid → `{success, amount:200}`, withdrawals count → 1; `POST` again → 404 (idempotent); `node --check` clean. This completes the confirm-link hardening (erasure + withdraw); unsubscribe/broadcast confirms are non-destructive (just set a flag) so they don't need it.

### 2026-07-15 — Hourly loop: fix — PDPA erasure deleted user data on a bare GET (email link-scanners could auto-delete before the user clicks)

Continuing the confirm-link audit: `GET /api/privacy/erasure/confirm?email&token` performed the **irreversible PDPA deletion immediately on GET** (waitlist, consents, producers, portal leads, affiliates). Destructive state change on GET is unsafe — corporate email link-scanners/prefetchers (Proofpoint, Microsoft Safe Links, Barracuda, etc.) fetch every link in an inbound email, so a user's data could be **deleted the moment the confirmation email arrives, before they read or click it** — irreversible, and PDPA erasure must be the user's deliberate act. (The affiliate-withdraw confirm has the same GET shape but is low-harm — it only creates an admin-reviewed *request*, is idempotent via splice-before-process — so left as-is this round; noted for a follow-up.) **Fix:** extracted the deletion into `performErasure(sanitized)`; `GET` now only renders a confirm **interstitial** (validates token, no side effect — safe for scanners) whose button `fetch()`es `POST /api/privacy/erasure/confirm?email&token`; the new `POST` handler re-validates the token and performs the deletion. Bots that only GET can't trigger it. Same token/scope preserved (withdrawals still not deleted). **Verified by running:** booted, seeded a consented producer, then: `GET` valid token → interstitial HTML, record NOT deleted (proven — the later `POST` returned `removed:1`); `GET` bad token → 403; `POST` valid → `{success,removed:1}`; `POST` again → `removed:0` (idempotent); `POST`/`GET` bad token → 403; `node --check` clean.

### 2026-07-15 — Hourly loop: warn in prod when JWT_SECRET is unset (security-token confirm links use a public fallback) — ⚠️ owner action

Traced the one-click confirm-link security while auditing the unsubscribe/PDPA flow. `unsubToken()` is a **stable** HMAC (`HMAC-SHA256(email:type, UNSUB_SECRET)`, no time component — good, so emailed links stay valid), and the broadcast unsubscribe suppression is case-consistent (PDPA honored). BUT `UNSUB_SECRET = process.env.JWT_SECRET || 'openthai-jwt-secret-2026'` — the fallback is a **public, source-visible constant**, and this token signs **security-sensitive** links: unsubscribe, **PDPA data-erasure** (`/api/privacy/erasure/confirm` — destructive), and **affiliate-withdraw** confirms. If `JWT_SECRET` is unset in production, anyone with repo access can forge those links (e.g. delete another user's data, confirm a withdrawal). Can't read/verify the prod env or set env vars from here (owner's job), and can't change the token derivation without invalidating in-flight emailed links — so shipped a **non-breaking guard**: a loud `[SECURITY]` `console.warn` at boot **only when `!JWT_SECRET && IS_VERCEL`**, so it surfaces in the Vercel production logs. **Verified by running:** `VERCEL=1` + no `JWT_SECRET` → warning prints; `VERCEL=1` + `JWT_SECRET` set → silent; local dev boot → silent (0); `node --check` clean. **⚠️ Owner action:** confirm `JWT_SECRET` is set in the Vercel environment for all three OpenThaiAi Vercel projects — if it isn't, set it (any long random string); existing emailed links keep working as long as the value is stable going forward.

### 2026-07-15 — Hourly loop: extend the plan-pricing guard to the index.html JSON-LD offers (the price Google shows)

Scan of the pricing sources found the `planPricingConsistency` guard covered PaymentPage/PricingPage/LandingPage against canon (free/pro/premier/enterprise = 0/299/599/1299) but **not the `<script type="application/ld+json">` `SoftwareApplication.offers` in `frontend/index.html`** — the structured-data prices Google reads for rich results. Those are hand-maintained, so a drift there would make Google advertise a price that no longer matches checkout (a real trust/SEO defect: rich-result price ≠ what we charge). Also verified this round (no change needed): `/api/quickpay/create` amount is clamped 1–100000/rounded/NaN-defaulted; the spin-discount math floors at ฿1 and maxes at 50%; disputes `resolve()` is idempotent with the old money-losing 'split' decision already removed; `orders.track` matches contact case-insensitively and `place()` requires contact so the match can't throw. **Change:** added a 4th assertion to `planPricingConsistency.test.js` that parses the ld+json `@graph`, finds the SoftwareApplication offers, and pins each `name→price` (and `priceCurrency:THB`) to canon. **Verified by running:** 4/4 in that file, full frontend suite 113/113; **mutation-tested** — drifting the JSON-LD Pro price to 399 fails it, restored to green. Runs in the existing frontend CI (`npm test -- --run`).

### 2026-07-15 — Hourly loop: fix — a non-numeric rating corrupted the learning-patterns feedback averages (NaN poisoning)

Code scan of the in-system feedback loop (`/api/skills/learning/rate` → aggregated into `/api/skills/learning/patterns`, which also feeds the `/learning/enhance` prompt context). Real bug: the handler validated `rating < 1 || rating > 5` **before** coercing to a number, so a non-numeric `rating` such as `"abc"` slipped through (both comparisons are `false` against NaN), and then `Number("abc")=NaN` was added to `p.sum` → the pattern's `avg` became NaN **permanently** (serialized as `null`), corrupting `avg_rating` in the patterns report and the "learning from real users" context the enhance endpoint injects. **Reproduced live** before fixing: POST `rating:"abc"` returned HTTP 200 and the pattern's `avg_rating` flipped to `null`. **Fix:** coerce first (`const ratingNum = Number(rating)`) then validate `Number.isFinite(ratingNum) && 1 ≤ ratingNum ≤ 5`, and store `ratingNum`. **Verified by running:** after the fix, `rating:"abc"` → 400, `rating:0`/`6` → 400, valid `5` and numeric-string `"4"` → 200 with a correct numeric avg (4.5); `node --check` clean. Prevention-only — it stops new corruption; any already-NaN pattern from before would need a manual reset (noted, not auto-healed to keep the fix minimal).

### 2026-07-15 — ⏸️ Verified finding (OWNER DECISION): all-platform-files links users to a DIFFERENT domain than the rest of the ecosystem

Scanned the 516 static HTML pages in `all-platform-files` (catalog/roadmap output). Their a11y/meta is fine, and the remaining SEO work (canonical/OG) is domain-blocked like otop-ai-landing. But found a real **cross-repo brand-domain inconsistency**: **231 of those pages put `www.openthaiai.com` (NO hyphen) in their footer/links**, while the **entire rest of the ecosystem uses `www.openthai-ai.com` (WITH hyphen)** — verified in-repo: `openthai-ai/frontend/index.html` canonical + `robots.txt` Sitemap + `seo-routes.mjs` `DOMAIN`, and `otop-ai-landing/index.html` preconnect + every CTA, all use the hyphenated `openthai-ai.com`. Zero files in all-platform-files use the hyphenated form; zero files elsewhere use the un-hyphenated form. So these 231 pages send visitors to a domain that is either wrong (dead/typo) or a second domain the owner also controls — I can't tell which from inside the repo, and can't resolve DNS reliably through the agent proxy. **Why flagged, not fixed (standing-order #8 — scope-broad + the production-domain question is already an open OWNER decision):** the fix is a mechanical find-replace of `openthaiai.com` → `openthai-ai.com` across 231 files, but doing it on an assumption is exactly the kind of broad, domain-sensitive change I must confirm first — if `openthaiai.com` is a real domain the owner registered (even one that 301-redirects), rewriting is wrong. **Owner: is the canonical domain `openthai-ai.com` (hyphen, used by the app + landing)? If yes, I'll normalize the 231 all-platform-files pages to it in one pass. If `openthaiai.com` is intentional/owned, I'll leave them and note it.** No code changed this round — the consent funnel (backend gate, frontend wiring, and form-label a11y) was re-verified end-to-end and is solid, so there was no unblocked openthai-ai change worth manufacturing.

### 2026-07-15 — Hourly loop: frontend guard that every /portals/* page keeps its PDPA consent wiring

The nine `/portals/*` pages are the consent funnel's UI. Their backend (`/api/leads/submit` → portal-leads.js:71) **hard-rejects any lead without `consent:true`**, so if a page loses its consent wiring a real applicant who ticks the box is silently 400'd — the page shows only a generic error and nobody realizes the checkbox is the cause. The affiliate E2E rotted this exact way (consent requirement added, caller never updated). All nine pages are currently uniform (consent state, payload field, checkbox, submit gate) but **nothing guarded that uniformity**. Added `frontend/src/__tests__/portalConsent.test.js` (37 assertions — structural, over page source, same approach as `seoInvariants.test.js`) pinning on every `*PortalPage.jsx`: (1) `const [consent,setConsent]=useState(false)` — defaults false so the applicant must actively opt in; (2) `consent` is included in the `submitLead({...})` payload (so the server actually receives it); (3) a checkbox bound to the state (`type=checkbox` + `checked={consent}` + `onChange…setConsent`); (4) submit button `disabled={!consent…}` so an un-consented lead can't be sent. **Verified by running:** 37/37 pass, full frontend suite 112/112; **mutation-tested** — dropping `consent` from a page's submitLead payload fails it, and removing the `disabled={!consent}` gate fails it, both restored to green. Runs automatically in the existing frontend CI (`npm test -- --run`) — no workflow change.

### 2026-07-15 — Hourly loop: deterministic guard for the producer registration funnel (producers.js — main funnel + PDPA)

`producers.js` is the platform's **main onboarding funnel** and PDPA-critical, but had no dedicated test. Added `backend/scripts/test-producers.mjs` (21 assertions, file-store temp dir, no Supabase) pinning the invariants that matter for consent, public safety, and data-subject rights: (1) **consent gate** — `register` without `consent:true` is refused (PDPA); (2) required fields (company/contact/email); (3) field normalization (unknown category → `อื่นๆ`, price ≤0 → null, negative stock → 0); (4) **public catalog shows ONLY `approved` producers that actually have a `product_name`** — a pending/rejected applicant's product, or an approved producer with no product, must never be publicly listed (real safety property — unvetted goods must not appear in `/api/catalog`); (5) **re-applying with an already-approved/suspended email is refused (`already_registered`) and does NOT reset it to pending** — otherwise a duplicate application would silently pull a live product offline; re-apply while pending/rejected IS allowed (resets to pending); (6) `setStatus` rejects invalid statuses/unknown emails; (7) **PDPA erasure (มาตรา 33)** — `eraseByEmail` removes the record from `all()` and the catalog. Wired `test:producers` into the deterministic backend CI step. **Verified by running:** 21/21 pass; **mutation-tested** — removing the consent gate fails it, and letting the catalog filter drop the `status==='approved'` check (leaking unapproved producers publicly) fails it, both restored to green; `node --check` clean.

### 2026-07-15 — Hourly loop: revive the affiliate E2E guard (was silently broken + never in CI) + pin the tier-promotion rate-timing invariant

Found that `scripts/test-affiliate-flow.mjs` — the E2E money guard for affiliate signup→QuickPay→webhook→commission — **was not wired into CI at all** (only the pure `test:affiliate-tiers` unit test was), and when run it **failed 13/22**: STEP 1 signup broke because `/api/affiliate/apply` now enforces PDPA consent (`registerAffiliateCore`: `if (consent !== true) return 400`, added a later run) but the test never sent `consent:true`. So a whole affiliate money E2E existed but protected nothing and had rotted. Fixed the test (send `consent:true` — exercising the real consent gate, not bypassing it) and **wired it into the deterministic-ish backend CI as a booted-server E2E step** (own port 8897 + `OMISE_WEBHOOK_SECRET=testsecret` so the signed-webhook path is real), mirroring the shop-commission step. Also added **STEP 9** pinning the subtle rate-timing invariant that had no coverage: `creditAffiliateSale` computes commission at the **current** rate *before* the tier bump, so a promotion applies to the NEXT deal, not the one that triggers it (a 2-line reorder would silently overpay a just-promoted affiliate). Drives the affiliate across the starter→pro boundary (10 deals) and asserts by exact money math: 10 deals × 20% = ฿2,000 (promotion NOT retroactive), tier now pro/30%, then the 11th deal → +฿300 = ฿2,300 (new rate applies to the next deal). **Verified by running:** 27/27 pass against a booted server; **mutation-tested** — making the commission use the post-sale tier rate yields ฿2,100/฿2,400 and fails STEP 9, restored to green; `node --check` clean. Now every push/PR runs the full affiliate money path, including double-credit idempotency (STEP 8) and signature rejection (STEP 6) that were previously unguarded in CI.

### 2026-07-15 — Hourly loop: deterministic guard for the inventory ledger's never-oversell invariant (inventory.js)

Follow-up that locks the exact contract the previous round's shop-checkout fix depends on. `inventory.js` (first-party stock ledger — sales, movements, affiliate attribution) had **no test**, yet `/api/shop/checkout` charges the customer and only THEN calls `adjust(id,-qty,'sale')`; the whole oversell-safety rests on `adjust` refusing to go below zero and returning `{ok:false, error:'สต๊อกไม่พอ', stock:before}` (inventory.js:101) so the paid-but-no-stock branch fires. Added `backend/scripts/test-inventory.mjs` (18 assertions, file-store temp dir, no Supabase) pinning: sale never goes negative (oversell → refused, stock unchanged, no partial deduct; exact-to-zero ok; sale at 0 refused), zero-delta/unknown-id/fractional guards, restock raises stock + `low` flag tracks the threshold, **type `adjust` is NOT the guarded path — it clamps to 0** (only `type:sale` returns the error — locked so nobody assumes otherwise), and sale attribution feeds affiliate reporting (`productSales.byPlatform['ref:AFF1']`, `salesReport.totalSold`, `summary.unitsSold`). Wired `test:inventory` into the deterministic backend CI step. **Verified by running:** 18/18 pass; **mutation-tested** — removing the `type==='sale' && before+d<0` guard fails it, restored to green.

### 2026-07-15 — Hourly loop: shop checkout ignored a failed stock deduction after a successful charge (paid-but-unfulfilled → wrong commission + silent oversell)

Code scan of the money path in `/api/shop/checkout`. `inventory.adjust(id, -qty, 'sale', …)` correctly refuses to go negative (`inventory.js:101` → returns `{ok:false, error:'สต๊อกไม่พอ'}`), **but both places that call it after a payment has already succeeded ignored that return value**: (a) the card/mock `finalizePaid` (`server.js:~678`) and (b) the PromptPay Omise-webhook finalize (`server.js:~7889`). The pre-check at request time (`server.js:671`) reads stock and passes, but there's an `await orders.place()` yield between it and the actual deduction, so a **concurrent order can exhaust stock in between**. When that happens the customer's charge is already captured, yet the old code marked the order `confirmed`, **credited affiliate commission on a sale that never shipped**, and returned `success:true` — a silent "paid, no stock deducted, wrong commission paid" corruption. **Fix:** both call sites now capture the result; on `!ok` they set the order to `cancelled` with a "ต้องคืนเงิน" note, **skip the affiliate credit**, log an `OVERSOLD` error for the admin to action, and (card path) return `{paid:true, fulfilled:false, refund_pending:true, message:…}` instead of a fake success. Happy path now also returns `fulfilled:true` and reports `stock_left` from the real post-deduct value (`adj.stock`) instead of a stale recompute. **The automated *refund itself* is intentionally NOT implemented — that's a money-movement business decision for the owner (standing-order #8); the fix's job is to stop the silent corruption and surface it. Owner: do you want an automated Omise refund on this race, or keep it manual (admin sees the cancelled+flagged order)?** **Verified by running:** booted server (mock mode), created a stock=1 product, fired 5 then 50 concurrent card checkouts → **exactly 1 `fulfilled:true`, final stock 0 (never negative), zero oversell**; the per-IP shop rate-limit (12/10min) + fast serialization kept the race window closed so the losers were caught at the pre-check (409) rather than the new branch — so I separately verified the exact `{ok:false}` contract the new branch keys on via the admin adjust endpoint (`adjust(-5,'sale')` → `400 สต๊อกไม่พอ`, stock unchanged at 2). `node --check` clean.

### 2026-07-15 — Hourly loop: stop search engines from indexing the /admin console (robots.txt gap + regression guard)

SEO/exposure scan of the crawl surface. `frontend/public/robots.txt` curates the crawlable set (`Allow:` list == sitemap, enforced by `seoInvariants.test.js`), and private consoles are excluded via `Disallow:` (`/dashboard`, `/producers/manage`, `/track`, `/dispute`, `/login`, …). But **`/admin` — a real public route (`App.jsx` `<Route path="/admin" element={<AdminPage/>}>`, no `/login` gate; it's gated server-side by `ADMIN_KEY`, not at the router) — was in neither list**, so under `Allow: /` it was crawlable: Google could index the admin console's entry point. Root cause: the existing invariant test only checked that the *advertised* set stays correct (sitemap↔Allow, advertised routes are public), so a sensitive route could silently become crawlable just by never being added to `Disallow`. **Fix (verified, unblocked — nobody wants their admin page indexed, no owner decision needed):** added `Disallow: /admin` to robots.txt, and added a 6th assertion to `seoInvariants.test.js` pinning that a curated sensitive set (`/admin`, `/dashboard`, `/affiliate/dashboard`, `/track`, `/dispute`, `/producers/manage`, `/login`) stays Disallowed AND never leaks into the sitemap/Allow list. The generated `dist/sitemap.xml` (built from `seo-routes.mjs` `ROUTES`, which never contained `/admin`) was already correct — the gap was purely the missing Disallow. **Verified by running:** full frontend vitest suite 75/75 pass (seoInvariants now 6/6, was 5); mutation-tested — removing `Disallow: /admin` fails the new guard, restored to green. Note (not changed — SEO judgment left to owner): the transactional pages `/payment` `/pay` `/quickpay` are also public and not Disallowed; they're thin rather than sensitive, so I left them.

### 2026-07-15 — Hourly loop: guard the credit ledger's abuse-critical invariants (credits.js)

Continued the "money-critical module with no test" scan (same pattern as the affiliate-tiers guard). `backend/credits.js` is money-adjacent: bonus credits from spin/streak/claim let a **Free user generate PAST the daily quota** (server.js ~7443: `hasCredit` → allow, `consumeCredit` → decrement), yet it had **no deterministic test**. The abuse-critical invariants were unguarded: `addCredits` **source-dedup** (`if (source && a.claims[source]) return {added:0, duplicate:true}` — stops re-claiming the same spin/streak/welcome reward to farm unlimited credits), `consumeCredit` **never going negative**, the `MAX_CLAIM`(50)/`MAX_BALANCE`(200) clamps, `checkin` once-per-day idempotency, and `spin` once-per-identity. Those three (`addCredits`/`checkin`/`spin`) were internal-only (reachable just via HTTP routes), so I exposed them **additively** on the factory's return object (server.js uses none of the new keys — no behavior change) to make them unit-testable without booting a server. Added `backend/scripts/test-credits.mjs` (18 assertions, file-store fallback in a temp dir, no Supabase — spin's random prize never affects the asserted properties) and wired `test:credits` into the deterministic backend CI step. **Verified:** 18/18 pass; **mutation-tested** — disabling the source-dedup fails it, and letting `consumeCredit` go negative fails it, both restored to green; `credits.js`/`server.js` `node --check` OK; server boots to `/api/health` 200 and `/api/credits` responds (`mode:file`) after the change.

### 2026-07-15 — Hourly loop: guard the affiliate commission tier boundaries (extracted to a testable module)

Reviewed the affiliate commission core (`creditAffiliateSale` + `tierForSales`) — logic is correct (current deal uses the old rate, promotion is upgrade-only, affects the next deal) but the money-critical tier boundaries lived inline in the 8500-line `server.js` with **no deterministic test**: a wrong `min` or a reordered `AFFILIATE_TIERS` array would silently pay the wrong commission. Extracted the pure `AFFILIATE_TIERS` + `tierForSales` to `backend/affiliate-tiers.js` (imported back; both call sites — the credit path and the "next tier" hint at line 1443 — use the import) and added `backend/scripts/test-affiliate-tiers.mjs` pinning: starter 0–9→20%, pro 10–49→30%, elite 50+→40% (inclusive), undefined/null/negative→starter (no crash), rate monotonic non-decreasing 0..60 (never demoted), each tier selected at its own min. Wired into the deterministic backend CI step. **Verified:** 10/10 pass; shifting the pro boundary 10→20 fails it 1/10; `server.js` `node --check` + boots to `/api/health` 200 after the extraction (no import break). `c1ea06a`.

### 2026-07-15 — 🔎 Verified finding (needs owner go-ahead): Free daily quota isn't enforced on the serverless backend

Code scan of the quota path found a real **revenue/fairness leak in production**. The backend runs serverless on Vercel (`IS_VERCEL` gates `app.listen` — it exports the app per-request). Paid status is durable: `getEntitlement()` reads `entitlements` which is **loaded from Supabase `/entitlements` on every boot** (+ file fallback), so Pro/Premier/Enterprise correctly resolve to unlimited on any instance. **But the Free daily counter is `const _usage = new Map()` — in-memory only, never persisted** (the `ai_usage_log` table is cost logging, not the quota counter). On serverless, each cold start / concurrent instance has its own empty Map, so the advertised **Free = 3/day (FREE_DAILY_LIMIT, shown on the Pricing page)** resets constantly and a Free user can generate well past 3/day. This directly undercuts the paid tier (why buy Pro "unlimited" if Free is effectively unlimited?). Verified by reading the code, not guessing: confirmed serverless export gating, `_usage` is the only quota store, and entitlements (paid) ARE Supabase-backed for contrast.

**Why flagged, not shipped (standing-order #8 — money-sensitive + needs a prod migration):** the correct fix is to persist the daily counter like entitlements — a `usage_daily(key, day, count)` table with an **atomic** increment (a Postgres RPC / upsert-returning-count, because a REST read-then-write races across concurrent instances and would over- or under-count a money-gating limit), keeping the in-memory Map as a fast-path cache and the sole path when `!_useSB`. That needs (a) a new migration the **owner must apply to the real DB** (I can't), and (b) money-sensitive atomicity I can only verify against a mock, not real concurrent serverless load. So: **owner go-ahead requested** before I implement — approve the approach (new migration + Supabase-backed atomic quota) and I'll ship it with a mock-Supabase regression test in the `test-ai-usage.mjs` style. Added as item 6 in the backlog below.

### 2026-07-15 — ⏸️ Consolidated OWNER-DECISION backlog (blocks the next wave before the 30 Jul deadline)

After a long series of autonomous rounds this session shipped verified work across **all 5 repos** — openthai-ai (Enterprise-checkout gap, ฿20/฿30 price drift, dispute-split money safety, ai-usage logging, shop-commission crediting, plan-price consistency guard, PDPA consent + unsubscribe + erasure test guards, funnel/SEO audit), otop-ai-landing (preconnect + social-card SEO), all-platform-files (mobile/SEO on 217 roadmap + 13 catalog pages), smart-e (phantom-stock inventory fix + first regression test + CI). The readily-available, *verifiable, unblocked* work is now largely done or audited-clean. What remains is genuinely **owner-gated** (standing-order #8) — verified real, but each needs a decision I must not guess:

1. **otop-ai-landing production domain** — canonical `<link>`, absolute `og:image`/`og:url`, and a sitemap are ready to add but need the site's own deployed domain, which appears **nowhere in the repo**. Matters because `vercel.json` routes every path to index.html, so without a canonical any URL under the domain is an indexable duplicate. → *What is the production domain?*
2. **all-platform-files generator reconcile** — the 217+13 standalone pages were fixed **in place**; their generators (`create_*.js` in openthai-ai) still emit the malformed head AND have drifted to a different output filename/branding (`Openthai.ai_*` vs committed `OpenThaiAI_*`), so re-running them makes differently-named duplicates. → *Reconcile generators + filename/branding, or freeze the generators and keep editing output in place?*
3. **OpenThai-AI-v9.0** — real code exists (`app/api/monitor/health`, `app/affiliate-hub`) but there is **no `package.json`/`tsconfig`**, so nothing there is buildable/verifiable (can't satisfy standing-order #4). README parks it to Q2-2026. → *Activate v9.0 now (add build tooling) or keep parked?*
4. **PDPA erasure scope for affiliate withdrawals** — `/api/privacy/erasure/confirm` intentionally **keeps** `withdrawals` (financial transaction records) while deleting all other PII, per legal-retention exception. → *Confirm this is the intended scope.*
5. **`/api/skills/*` free-quota policy** — the ~30 skill tools currently do **not** count against the Free 3/day limit (only `/api/generate*` does). → *Intended, or should skills also consume quota?*

No code diff this round — this is the disciplined outcome (CLAUDE.md: don't manufacture a low-value diff). Once any of the above is answered I can proceed immediately with a verified change.

### 2026-07-15 — Hourly loop (cross-repo: smart-e): wired the regression guard into CI so it actually runs

Completes the fix→guard→enforce arc for smart-e (a test only protects if CI runs it — the same principle applied to openthai-ai's money guards). smart-e had no CI at all, so last round's `test_server.py` could only catch a regression by hand. Added `.github/workflows/test.yml`: on every push + PR it `py_compile`s `server.py`+`test_server.py` then runs the guard (which boots the real server on a throwaway db + alt port; pure stdlib, no pip install). **Verified** by running the exact workflow steps locally: compile passes; guard 15/15 (exit 0); YAML parses. smart-e commit `bef027a`; covered by its open PR #1. (Verifying the first hosted Actions run is green is tracked below.)

### 2026-07-15 — Hourly loop (cross-repo: smart-e): first automated regression guard (auth + order validation + phantom-stock)

smart-e had **no tests at all** (just an empty `test.txt`), yet this branch shipped a stack of live-verified fixes (auth gate, malformed-body crash class, data-integrity, and the phantom-stock inventory bug from the previous round) — any of which could silently regress. Added the first automated guard. Made `DB_PATH`/`PORT` env-overridable (`SMART_E_DB`/`PORT`, defaults unchanged — also helps real deploys with a custom data dir) so the test runs against a throwaway db on an alt port without touching `~/smart_e.db` or port 8000. `test_server.py` (pure stdlib, no framework) boots the real server and asserts **15 invariants**: auth (no/ wrong key → 401, correct → 200); order validation (items-not-a-list, non-numeric qty, qty<1, negative price → 400); the phantom-stock guard (oversell → 400 stock-unchanged; valid order deducts; cancel restores symmetrically; duplicate line items summing over stock → 400); nonexistent-payment confirm → 404. **Verified real guard:** 15/15 pass; deleting the stock-availability check fails it 6/15. smart-e commit `358630a` (full detail in the commit message per standing-order #6); covered by its open PR #1. (CI wiring is a possible follow-up — smart-e has no GitHub Actions workflow yet.)

### 2026-07-15 — Hourly loop (cross-repo: smart-e): fixed a phantom-stock inventory bug (oversell + cancel inflated stock)

First **verified the /portals funnel in openthai-ai is healthy** (all 9 role routes have components + internal links; the bare `/portals` hub `PortalHubPage` surfaces all 9 roles) — audited clean, no diff manufactured there. Then diversified to `smart-e` (Python store server) and found a real inventory-integrity bug by code scan + live repro: `_create_order` deducts stock with `MAX(0, stock-qty)` (clamps to 0 on oversell) while `_update_order_status` restores a cancelled order with an unclamped `stock+qty`. So **ordering more than is in stock and cancelling conjures stock from nothing**: 5 → order qty 10 → `MAX(0,5-10)=0` → cancel → `0+10=10` (+5 phantom) — the mirror of the negative-qty attack the file already defends against. Reproduced live (5→0→10). Fixed by validating stock availability before accepting an order (qty summed per `product_id` so duplicate line items can't oversell in aggregate; missing product or `qty > stock` → 400, nothing written), making deduct/restore always symmetric. **Verified live** (ADMIN_KEY set, fresh db, restored after): oversell qty10/stock5 → 400 (stays 5); valid qty3 → 201 (5→2); cancel → 2→5 (symmetric); two qty-3 line items of one product vs stock5 → 400 (stays 5). smart-e commit `df4d3d4` (no DECISIONS_LOG there — full detail in commit message per standing-order #6); covered by its open PR #1.

### 2026-07-15 — Hourly loop: guard the PDPA data-subject-rights helpers (unsubscribe + right-to-erasure)

Verified the funnel/SEO first (all 10 `/portals/*` routes are in `seo-routes.mjs` → in the sitemap; consent gate uniform across all 9 pages — audited clean) and confirmed `OpenThai-AI-v9.0` is a non-runnable skeleton (no `package.json`/`tsconfig`) so any TS change there can't be verified per standing-order #4 — deliberately not touched. Then closed a real coverage gap in the #1 priority area: `portal-leads.js` has two legally load-bearing PDPA helpers with **no test** — `unsubscribe(email, type)` (consent withdrawal) and `eraseByEmail(email)` (right to erasure, มาตรา 33; a prior fix made `/api/privacy/erasure/confirm` actually delete `portal_leads`, which it never used to touch). Extended `backend/scripts/test-portal-leads.mjs` (+8 assertions, deterministic file store): unsubscribe rejects empty email, marks every email+type match `unsubscribed:true` (case-insensitive input, correct count) and leaves a same-email/different-type lead untouched (scoping); eraseByEmail rejects a non-email (removes nothing), deletes every lead for the email across all types (case-insensitive, no trace in `all()`), and leaves a different person's lead intact. **Verified real guard:** 20/20 pass (was 12); making unsubscribe ignore `type` fails 2/20 and making eraseByEmail a no-op fails 2/20. Runs in CI via the existing `test:portal-leads` step (no workflow change). `7081432`.

### 2026-07-15 — Hourly loop (cross-repo: all-platform-files): finished the mobile/SEO batch — 13 standalone product-catalog pages

Follow-through on the roadmap-guides fix: the sibling **13 `OpenThaiAI_*Products_Catalog.html`** standalone docs had the identical malformed head (`<html><head><meta charset><style>` — no doctype/lang/viewport/title) and were fixed in place the same way (doctype, `lang="th"`, viewport, `<title>` from `<h1>`, description). **Verified before scoping:** the other catalog set `products-*-catalog.html` was left untouched — 10 are already properly formed, and the 3 anomalies (`products-{indonesia,oceania,vietnam}-catalog.html`) are `<section>` **fragments**, not standalone pages (wrapping them would be wrong; they're also unreferenced, part of the same generator-drift/duplicate mess already flagged for owner reconciliation). **Verified:** 13/13 now have doctype+viewport+title; git shows exactly 13 files changed and 0 others; served one → 200 with tags present and the Thai description meta intact; the indonesia fragment stayed a bare `<section>`. all-platform-files commit `1f19277`; covered by its open PR #1.

### 2026-07-15 — Hourly loop (cross-repo: all-platform-files): mobile/SEO fix for 217 standalone roadmap guides + flagged generator drift

Audited `all-platform-files` (516 static HTML files). **Verified the structure before touching anything:** the deployed dashboard `index.html` injects the 82 `*-roadmap-section.html` **fragments** (correctly headless `<section>` — wrapping them would break injection), and that batch was already SEO'd. The gap: the **217 `OpenThaiAI_*_Roadmap.html`** standalone guides (directly URL-accessible on the deployed static site, not linked from index.html) were generated with a malformed head — `<html><head><meta charset><style>`, i.e. **no `<!DOCTYPE>`, no `lang`, no `viewport`, no `<title>`** — so they rendered in quirks mode and zoomed-out/tiny on mobile. Fixed all 217 **in place, additively** (no filename/URL change): doctype, `lang="th"`, `viewport`, `<title>` from the page's `<h1>`, and a `<meta name="description">`. **Verified:** 217/217 now have doctype+viewport+title; git shows exactly 217 files changed and 0 others; the section fragments stayed headless; served `OpenThaiAI_Stripe_Roadmap.html` → 200 with the tags present. all-platform-files commit `773d217` (no DECISIONS_LOG there — full detail in the commit message per standing-order #6); covered by its open draft PR #1.

**Flagged, not touched (scope-broad, owner-level — #8):** these files are generated by this repo's `create_*.js` scripts, whose standalone-guide template still emits the malformed head AND has drifted to a different output filename (`Openthai.ai_*_Roadmap.html`) and branding than the committed `OpenThaiAI_*` files — so re-running them would create differently-named duplicates rather than update these. Reconciling the generators + their output naming (and the `OpenThaiAI` vs `Openthai.ai` branding) is a separate decision; the in-place fix deliberately avoids that risk.

### 2026-07-15 — Hourly loop (cross-repo: otop-ai-landing): SEO/perf polish on the funnel front-door + flagged the domain-gated items

Diversified to `otop-ai-landing` (the OTOP-AI marketing landing that feeds the /portals funnel). **Verified first:** og-image.png is genuinely 1200×655 (declared dims correct — no bug), and prior commits already added Twitter cards/robots/theme-color. Real remaining wins split in two: (a) **domain-independent, shipped** — added `preconnect`+`dns-prefetch` to `https://www.openthai-ai.com` (every CTA on the page hands off there, so the handshake starts while the user reads), plus `og:site_name` and `og:image:alt`/`twitter:image:alt` for better+accessible social cards. **Verified by serving locally:** GET / → 200, all 5 new tags present in served HTML, og-image.png still 200. otop-ai-landing commit `31d3d73` (that repo has no DECISIONS_LOG — full detail is in the commit message per standing-order #6); already covered by its open PR #1. (b) **domain-gated, deliberately NOT guessed** (standing-order #8) — `rel=canonical`, absolute `og:image`/`og:url`, and a sitemap all need the landing site's own production domain, which appears nowhere in the repo. This matters because `vercel.json` routes every path to index.html, so without a canonical any URL under the domain is an indexable duplicate. **Owner input needed:** what is otop-ai-landing's production domain? Ready to finish the SEO the moment it's confirmed.

### 2026-07-15 — Hourly loop: guard against frontend plan-price drift (locks in both money fixes from this session)

Both money bugs fixed earlier today (stale ฿20/฿30 Pro/Premier prices; unpurchasable Enterprise) shared one root cause: the frontend duplicates the canonical plan set (backend `SUBSCRIPTION_PLANS` = free/pro/premier/enterprise at 0/299/599/1299 THB) across **three** hand-maintained arrays — `PaymentPage.PLANS` (checkout), `PricingPage.PP_META` (/pricing cards routed to /payment), `LandingPage.PLAN_META` (marketing) — with nothing tying them together, so one drifting shipped a silent money bug. Rather than the larger refactor of collapsing them to one shared source (scope-broad — left for owner), added a deterministic guard: `frontend/src/__tests__/planPricingConsistency.test.js` asserts (1) every source lists exactly the canonical plan keys, (2) each source prices every plan at the canonical THB amount, (3) every plan advertised on /pricing exists in checkout (the advertised-but-unpurchasable guard). Only page change is adding `export` to the existing const arrays (default exports/behaviour untouched). **Verified real guard:** 74/74 frontend tests + build pass; mutating a price (599→20) fails it 1/3 and removing the enterprise checkout entry fails it 3/3, then restored to green. `eebcdd7`.

### 2026-07-15 — Hourly loop: fixed a live money-funnel gap — the Enterprise ฿1,299 tier couldn't actually be purchased

Code-scan gap-fix (standing-order category 2), verified against 4 sources before touching anything. `/pricing` advertises 4 plans incl. **Enterprise ฿1,299** and its CTA routes to `/payment?plan=enterprise` (`PricingPage.jsx:88`); the backend `SUBSCRIPTION_PLANS.enterprise` (฿1299) + `index.html` JSON-LD + i18n `plans.enterprise`/`pp.plans.enterprise` (TH/EN/ZH) all define it — **but `PaymentPage`'s hardcoded `PLANS` only had free/pro/premier.** The unknown-plan fallback (`PLANS.some(...) ? param : 'pro'`) therefore silently loaded the **฿299 Pro** checkout for anyone who selected Enterprise: the highest-value tier was clickable across the whole site but impossible to buy, and the funnel silently downgraded the customer with no error. Added the Enterprise entry to `PaymentPage.PLANS` at ฿1,299 with the canonical features/colour already defined in i18n + PricingPage. The charge amount is **server-authoritative** (`/api/payment/create` derives it from `SUBSCRIPTION_PLANS.price_thb`), so this only unblocks the frontend selection — it can't set a wrong price.

**Verified end-to-end against a booted server:** `POST /api/payment/create` `plan=enterprise` → `amount_thb 1299` / `plan "enterprise"`; `plan=pro` → 299 (baseline intact); an unknown plan still → HTTP 400 Invalid plan. Frontend 71/71 tests + build pass. `9e523ec`.

### 2026-07-15 — PR #79: addressed 5 Copilot review findings (verified each against real code first)

Copilot left a `commented` (non-blocking) review with 5 inline findings on PR #79. **Verified all 5 against the actual source before touching anything** (per the verify-before-build rule) — all real:
- **`progress-tracker.js` ×3** — `collectLiveData()` catch blocks only reset *some* siblings, leaving `producers_approved` / `orders_shipped` / `products_total` / `units_sold` `undefined` on a subsystem failure. `JSON.stringify` **drops** undefined fields, so a failed collection silently changed the snapshot schema and could blank downstream UI. Fixed by zeroing every related counter in each catch. **Verified** by driving `buildSnapshot()` with all four subsystems throwing: all 9 KPI counters come back `0` and survive a JSON round-trip (none dropped) — before the fix, 4 were dropped.
- **`DisputeTrackPage.jsx`** — the `document.title` effect read `t()` but had `[]` deps, so the tab title never updated on a language switch. Split into two effects (title → `[t]`; auto-check-once-on-mount stays `[]`).
- **`PaymentPage.jsx`** — `PLANS` still carried placeholder prices (Pro `20`, Premier `30`) while the backend `SUBSCRIPTION_PLANS`, `index.html` JSON-LD offers, and this log all use the canonical **299 / 599 THB** — and `plan.price` is the amount actually charged, so this was a **live user-facing money discrepancy**. Aligned the frontend to the canonical prices. (Note: adding an Enterprise tier to the payment UI is a separate product decision, left out of this fix.)

**Verified:** frontend 71/71 tests pass + build OK; backend `node --check` + the failure-path snapshot-shape assertion pass. `6415306`.

### 2026-07-15 — Hourly loop: deterministic guard for the portal-lead PDPA consent gate (standing-order #3, the legal foundation of the funnel)

The `/portals/*` registration funnel exists **only** because of the standing rule that no real producer/consumer/creator is contacted without their consent — so the server-side gate in `backend/portal-leads.js` `submit()` (`if (input?.consent !== true) return { ok:false, ... PDPA }`) is the single most legally load-bearing line in the funnel, and it had **no test**. Added `backend/scripts/test-portal-leads.mjs` + `test:portal-leads` npm script (pure/deterministic — a `mkdtemp` file store, no Supabase or network) pinning the contract: missing consent / `consent:false` / `consent:'true'` (string, not boolean) are **all** rejected and **nothing is persisted or notified**; consent-but-no-name/email rejected; a valid consenting lead is saved carrying `consent:true` (auditable proof) with email lowercased, string form fields kept, non-string fields dropped, and appears in `all()`; name falls back to agency when absent. Wired into the backend CI job's "Unit tests (deterministic, no server)" step alongside `test:disputes`. **Verified real guard:** 12/12 pass (exit 0); loosening the strict `consent !== true` to a truthy `!consent` test fails it 2/12 (exit 1) — i.e. it actually catches a weakening of the consent boundary. `7c422fd`.

### 2026-07-11 — Hourly loop: verified CI green + registry-consistency clean; added a guard for the consent-funnel honest-feedback helper (standing-order #1)

First verified the prior round: `test.yml` run for `f2cb210` (the self-contained `test:ai-usage` step) = **completed/success** — so all three money/cost guards (#9/#10/#11) now run green in CI. Also ran `generate-project-status.mjs` → **exit 0** (every backend env var documented, route/skill/migration registries agree — no drift after this session's many changes).

Then moved to the standing order's #1 area (consent funnel): `submitLead` — the shared `/portals/*` submit that a prior run added specifically to kill a fake-success bug (fetch doesn't throw on 4xx/5xx, so a naive `try/catch; setSent(true)` told a consenting applicant they were signed up even when the backend rejected the lead) — had **no test**. Added `frontend/src/__tests__/submitLead.test.js` pinning the contract: `ok:true`+id only on a genuinely saved lead; 400 surfaces the backend Thai message; 429/500/network and a 200-with-`success:false` all → `ok:false`; `leadError` prefers the server message, falls back to a localized generic by lang (unknown→th). **Verified:** 8/8 pass; full frontend suite 11 files / 71 tests pass; runs in the existing frontend CI (no workflow change). `66168bf`.

### 2026-07-11 — Hourly loop: completed test coverage — self-contained regression guard for #11 AI-usage logging + spend tracking

The third money/cost change (#11 AI-usage logging + the shared-budget spend tracking) was the only one still lacking a committed test. Added `backend/scripts/test-ai-usage.mjs` + `test:ai-usage` + a CI step. **Fully self-contained** (no external services): starts an in-process mock Supabase, spawns the real server pointed at it, drives 3× `/api/generate`, then asserts the mock received 3 `ai_usage_log` inserts (each with endpoint + valid ai_source), `/api/ai-usage/admin/summary` reports `by_endpoint['/api/generate'].requests === 3`, and `/api/router/status.calls ≥ 3` (generate now feeds the shared budget counter). Wired into the backend CI job as a single command. **Verified real guard:** 6/6 pass; disabling `recordAiUsage` in `/api/generate` fails it 3/3 (exit 1), catching both the logging and spend-tracking regressions. `f2cb210`. → All three money/cost fixes (#9 shop-commission, #10 dispute-split, #11 ai-usage) now have committed regression guards, and #10/#11 + shop-commission all run in CI.

### 2026-07-11 — Hourly loop: also wired the shop-commission E2E money guard into CI (verified the prior CI run went green first)

First **verified** the previous round's CI change actually works: the `test.yml` runs for `75ff505` (test:disputes wiring) and `2bc3261` both **completed / success** — the workflow with the new deterministic unit-test step passed. Then completed the money-guard CI coverage: added a self-contained "E2E — shop-commission money guard" step to the backend job (boots the server on its own port + admin key, waits for `/api/health`, runs `test:shop-commission`, kills the server, propagates exit code, dumps the log on failure). Only this E2E test is wired — it passes reliably in mock mode (8/8); the **pre-existing** `test:affiliate` is intentionally left out because it needs a full Omise/webhook env and fails in plain mock mode (9/22), so wiring it would make CI red. **Verified locally** against one booted server: `/api/health` 200, `test:shop-commission` 8/8. `626bc0a`.

### 2026-07-11 — Hourly loop: wired the dispute-split guard into CI so it actually runs

A regression test only protects if CI runs it. The `test.yml` backend job did syntax + boot/health smoke only — it never ran the backend `test:*` scripts, so the money-safety `test:disputes` guard added earlier could only catch a regression when run by hand. Added a "Unit tests (deterministic, no server)" step to the backend job running `npm run test:disputes` (pure/deterministic — no server/network/env, so a fast reliable gate on every push+PR). The E2E money guards (`test:affiliate`, `test:shop-commission`) need a booted server + admin/webhook env, so wiring those into CI is left as a separate, more involved change. **Verified:** `npm run test:disputes` exits 0; the workflow YAML parses and the new step appears in the backend job. `75ff505`.

### 2026-07-11 — Hourly loop: added E2E regression guard for #9 shop-commission crediting

Completed regression coverage for the second money-safety fix. Added `backend/scripts/test-shop-commission.mjs` + `test:shop-commission` npm script (E2E, same convention as `test:affiliate`). Boots against a running server (mock mode): registers an affiliate (rate 0.20), creates a ฿500 product, checks out qty 2 **with** the ref → asserts the affiliate gets `total_sales 1` / `total_earned 200` (฿1000×0.20); a second checkout **without** a ref → asserts the affiliate is unchanged (no spurious credit). **Verified it's a real guard:** 8/8 pass (exit 0) with the fix; disabling the `creditAffiliateSale` call in `finalizePaid` fails it 3/8 (exit 1, earned → 0). Data writes reverted after the run (note: local boot writes to tracked `backend/data`; `VERCEL=1` would isolate to /tmp but disables `app.listen`, so revert-after is the clean path). `3a46361`.

### 2026-07-11 — Hourly loop: added the first backend regression test — guards the dispute-split money-safety fix

The backend has no test runner (only standalone `scripts/test-*.mjs` E2E scripts run via `test:affiliate`/`test:revenue`), so the money-safety fixes shipped this session had no automated guard. Added `backend/scripts/test-disputes.mjs` + `test:disputes` npm script in that same convention, but pure/deterministic (exercises the real `disputes.js` factory with an in-memory orders stub — no server/network). Asserts: `DECISIONS` no longer contains `split` (keeps the 3 real decisions); `resolve('split')` → rejected `invalid decision`; open holds escrow; favor_supplier → resolved_supplier+released; favor_buyer → resolved_buyer+refunded; refund → refunded; already-resolved can't be re-resolved. **Verified it's a real guard:** 10/10 pass (exit 0) with the fix, and re-adding `split` to `DECISIONS` makes it fail 2/10 (exit 1). `1f895c6`.

### 2026-07-11 — Hourly loop: audited two areas clean (no diff manufactured) — flagship SEO route curation + smart-e security

Diversified off the AI-cost thread. Two areas scanned and **verified clean**, recorded so future cycles don't re-scan (and to avoid manufacturing a low-value diff in already-hardened code):

**openthai-ai SEO/sitemap curation — sound.** Compared `frontend/scripts/seo-routes.mjs` ROUTES (21 public entries) against the full `App.jsx` route table (~90). The one tempting "missing" page, `/ai-generator` (the free-tool funnel destination), is actually **auth-gated** (`isAuthenticated ? <AIGeneratorPage/> : <Navigate to="/login"/>`) — adding it would create the soft-404 the `seoInvariants` test guards against. `/income` is an **alias of the already-listed `/earn`** (both render `EarnHubPage`) and is linked nowhere, so correctly not double-listed (no duplicate-content URL in the sitemap). `/starter` is auth-gated; the rest are interactive app tools, not shareable marketing pages. `seoInvariants.test.js` passes 5/5 (sitemap == robots Allow == real public routes). No gap.

**smart-e security/SQL/validation — hardened.** Fresh pass over `server.py` (1022 lines): all SQL is parameterized; the two dynamic `UPDATE` SET-clauses (`_update_product`, `_update_customer`) build columns from a **whitelist**, values via `?` — no SQLi. Search filters (`q` LIKE) are parameterized. Numeric query inputs are validated (`?limit`, `?days` both try/except→default+clamp). Admin auth is fail-closed (503 when `ADMIN_KEY` unset) with `hmac.compare_digest`. LINE webhook verifies `X-Line-Signature` as base64(HMAC-SHA256(secret, raw_body)) with `compare_digest` — correct per LINE spec. **Run-verified** the fail-closed path against a booted server: `GET /api/products` with no `ADMIN_KEY` → **503**, static `/` → **200** (remaining boundaries confirmed by reading the unambiguous code; the sandbox reaped the second bound-server boot). No code changed in smart-e (working tree clean).

### 2026-07-11 — Hourly loop: made the daily AI-cost metric + budget guard count the main generate endpoints (were blind to them)

Code-scan finding: `ops-summary.ai_spent_today_usd`, `/api/router/status.spent_usd`, and the Eco-mode budget guard (`routerEco`) all read `routerState.spentUsd`, which was only incremented inside `routeAI`. But the three main content endpoints (`/api/generate`, `-ab`, `/stream`) use `smartGenerate`, **not** routeAI — so their spend never counted. Effect: the owner's "AI cost today" excluded the biggest consumer, and a heavy generate day never tripped the daily budget (cost control blind to it). The ops note also didn't disclose this.

Fix: added `trackGenerateSpend()` and call it from `recordAiUsage()` (which all three generate endpoints already invoke) to attribute estimated token cost to `routerState`. Restructured `recordAiUsage` so this **in-memory accounting runs even when Supabase logging is off** (independent of migration 003), and updated the ops note to say the figure now includes generate + router estimated cost. **Verified** on a booted server (no Supabase, mock, FREE_DAILY_LIMIT=3): router/status calls 0 → 3 after 2 generate + 1 ab (the 4th, a stream, correctly hit the 3/day quota → 429 → not counted), with logging off; spent_usd stays 0 under free mock; cost formula matches the proven routeAI path. `d2542e5`.

### 2026-07-11 — Hourly loop: surfaced the #11 AI-cost breakdown in the Admin OPS tab (made the data usable)

The #11 endpoint `/api/ai-usage/admin/summary` had no UI consumer — the owner couldn't actually see the per-endpoint token/cost data. Added an "🧮 ต้นทุน AI แยกตาม endpoint" panel to the Admin **OPS tab** (`AdminPage.jsx`): fetches the summary alongside ops-summary, renders a per-endpoint table (requests / total tokens / USD cost) sorted by token usage + a totals line, and degrades cleanly to the "run migration 003" note when logging isn't enabled (and "ยังไม่มีข้อมูล" when zero rows). **Verified** in vitest/jsdom (new `adminAiUsagePanel.test.jsx`): driving the authed AdminPage to the OPS tab renders the endpoint rows from the real summary shape, and shows the migration note when `enabled:false`. Full suite **10 files / 63 tests pass**; vite build clean. `6140adc`.

### 2026-07-11 — Hourly loop: completed the #11 AI-usage logging across all three generate endpoints

Follow-up consistency fix to #11 (which only instrumented `/api/generate`): its two siblings `/api/generate-ab` and `/api/generate/stream` also consume the daily quota, so the per-endpoint cost summary was undercounting them. Wired `recordAiUsage()` into both — generate-ab logs one row per request (input tokens ×2 for the two variants; output = both A+B); stream accumulates its SSE text via a small `emit()` helper and logs on successful completion (skipped on client abort, same guard as the quota consume). Same fire-and-forget + self-disabling path. **Verified** on a booted server + mock Supabase (FREE_DAILY_LIMIT=3): 2 generate-ab + 1 stream logged → summary `{/api/generate-ab:2, /api/generate/stream:1}`; the quota-exhausted 4th/5th calls returned 429 and correctly did NOT log. `9522f9e`.

### 2026-07-11 — Owner set a 30 Jul 2026 deadline to finish the backlog; owner-decided #10, completed #10 + #11

Owner instruction: complete the pending mission before 30 ก.ค. 2569 (2026), and "ทำต่อเนื่องอัตโนมัติทั้งหมด" (proceed through it autonomously). Surfaced the 4 stop-and-ask forks (#9/#10/#11/#12) for decisions; the interactive prompt failed in this background run, but the owner replied for **#10** = "ปิด/เปลี่ยนป้ายปุ่มก่อน" (relabel/disable until a real split exists). Executed:

**#10 dispute "split" (owner-decided) — shipped `5bb244a`.** The admin "แบ่งครึ่ง" button mapped to a `split` decision that `disputes.resolve()` turned into escrow `released` + `resolved_supplier` — i.e. released the **full** escrow to the supplier, buyer got nothing, opposite of the label (a live money bug). Removed `split` from `DECISIONS` (resolve() now returns `invalid decision` for it — defense in depth vs old clients/direct API), simplified the now-exhaustive escrow mapping over {favor_supplier, favor_buyer, refund}, dropped `split` from the AI-suggest enum, and removed the button in `AdminPage.jsx`. **Verified** against the real module: open→escrow `held`; favor_buyer→`resolved_buyer`+`refunded`; split→rejected `invalid decision`; frontend build clean.

**#11 AI-usage logging — shipped `ea60d8d`.** migration 003's `ai_usage_log` was dead schema (nothing wrote to it). Added `recordAiUsage()` wired into `/api/generate` (success + mock-fallback) + `GET /api/ai-usage/admin/summary` (Admin Key) that aggregates per-endpoint/per-source token+cost totals (answers run-71's "what uses the most tokens"). Ships safely without confirming prod migration state because it's **fire-and-forget** (never awaited → no latency / can't fail a generation) and **self-disabling** (first INSERT against a missing table flips logging off for the process; applying migration 003 re-enables on reboot). **Verified** against a booted server + mock Supabase: table present → 3 generates = 3 rows, summary aggregates correctly; table missing → generate still 200, logging self-disables, summary returns `enabled:false` + "run migration 003" note; admin endpoint 401 without key. Tokens/cost are estimates (same basis as the router cost model).

**#9 affiliate commission on shop — shipped `b964385`.** Turned out NOT to need a rate decision: the commission rate is already an established platform constant (tiered starter 20% / pro 30% / elite 40%), and `creditAffiliateSale()` already fires on subscription/quickpay Omise success. The real gap was that `/api/shop/checkout` captured the affiliate `ref` (as the stock `channel`) but never credited it. Wired `creditAffiliateSale()` into both shop payment paths — card/mock in `finalizePaid()`, PromptPay in the Omise webhook's shop-finalize block (parsing ref from `metadata.channel` `'ref:CODE'`, guarded by the existing `status==='new'` idempotency) — mutually exclusive per order, no double credit. **Verified** on a booted server: affiliate rate 0.20, ฿500 product, checkout qty 2 with ref → `total_sales 1`, `total_earned 200` (฿1000 × 0.20). (Note: the run wrote a test affiliate into the tracked `backend/data/affiliates.json`; reverted before commit so no test data shipped.)

**#12 v9.0 build-out — NOT done unilaterally (standing-order #8).** Unlike #9–#11 (a money-safety bug, a dead-schema wiring, and a ref-attribution wiring — all bounded), #12 means standing up an entire Next.js application stack (package.json + deps + next.config + tsconfig + a new `/api/affiliate/apply` route) for a repo whose own README deliberately parks it until **Q2 2026**. That's a large architecture commitment against a documented parking decision, so — even under "ทำต่อเนื่องอัตโนมัติทั้งหมด" — it warrants an explicit go/no-go rather than a guess. Completed the three tractable backlog items before the 30 Jul deadline; #12 awaits the owner's explicit "activate v9.0 now" (with scope: Next version, and whether `/api/affiliate/apply` should proxy the existing openthai-ai backend or be standalone).

### 2026-07-11 — Owner request: Data Classification Framework — built a self-verifying tool grounded in real fields; caught 7 fabricated fields in the pasted spec

Owner asked (in Thai) to build a "data connector/classification tool" organizing system fields by the 6 statistical data types (Quantitative/Qualitative × Nominal/Ordinal/Discrete/Continuous), seeded from a detailed pasted spec citing the "MVP AI Income Starter" and "LLM Router". Per CLAUDE.md (verify-before-build), **grepped every field against the real repo first** — and the spec was the classic mixed real+fabricated paste:

- **Real (14 fields, kept):** `revenue_thb`, `latency_ms`, `model_accuracy`, `ai_calls_today`, `orders_total` (progress-tracker.js); `criticScore`, `caption`, `hashtags`, `platform`, `costPer1k`, `AI_DAILY_BUDGET_USD`, `ROUTER_PROVIDERS` (claude/gemini/grok), `ROUTER_TIERS` (heavy›bulk›eco), `privacy_level` (server.js).
- **Fabricated (7, verified 0 hits, NOT built):** `est_margin_pct`, `cost_thb`, `fairnessScore`, `journey_progress`, `local-llama`, `mistral`, `competition_level`. The spec's `provider: ['grok,claude,gemini,local-llama,mistral']` is wrong — the real Router has only **3** providers; the real cost field is `costPer1k` (per-model USD), not a product `cost_thb`; `privacy_level` is a **TikTok publish-visibility constant** (`'PUBLIC_TO_EVERYONE'`), not the `['low,med,high]` router weight the spec claimed (no `local-llama +25` logic exists).

**Built:** `scripts/data-classification.mjs` + generated `docs/DATA_CLASSIFICATION.md`. Each classified field is anchored to a source file + a token that must appear in it; the script reads the real files and **exits non-zero on drift** (same contract as `generate-project-status.mjs`), and records the 7 fabricated tokens as verified-absent so they can't be built on by mistake. **Verified by running:** clean run classifies 14 / confirms 7 absent / writes doc / exit 0; a deliberately broken anchor → exit 1 naming the field; `--check` and write modes both exercised. Committed + pushed `26521d1` → draft **PR #79**.

### 2026-07-11 — Hourly loop, run 100: fixed the frontend fallout of run 99 — the live-stream generator sent no identity headers and mishandled the new 429

openthai-ai synced (HEAD 95d431d). Direct, high-impact follow-up to run 99: once `/api/generate/stream` started enforcing the daily quota, its **frontend caller** (`AIGeneratorPage.jsx` `handleStream`, the "เขียนสด/Live" button) had two real defects that enforcement exposed. First **verified the quota model** to avoid over-reaching: `checkQuota`/`consumeQuota` are enforced on exactly the three generate endpoints (`/api/generate`, `-ab`, `/stream`); the ~30 `/api/skills/*` tools are deliberately NOT quota-gated — whether they should be is a **product decision left for the owner**, not guessed here.

**Two bugs fixed (both mirror the already-correct non-stream path):**
- The stream `fetch` sent only `Content-Type` — **no `x-user-email` / `x-device-id`**. So the backend saw the stream as anonymous: a **paying user was wrongly quota-limited** on streaming, and spin/streak **bonus credits were ignored** on that path. Now uses `authHeaders()` like `/api/generate` and `/api/generate-ab`, so plan + credit identity are honored consistently. (This is a paying-customer-blocking bug, the inverse of the run-99 leak.)
- A **429** showed a generic `สตรีมไม่สำเร็จ` toast instead of the upgrade CTA. Now parses the 429 body and routes to `upgrade_url` (`/payment?plan=pro`), matching `handleGenerate` — the stream path drives the same Pro upsell instead of looking broken. Also added `refreshUsage()` after a successful stream so the remaining-quota chip stays accurate.

**Verified by running the real component in vitest/jsdom** (new `src/__tests__/aiGeneratorStreamQuota.test.jsx`), not by inspection: rendering the actual page, filling the product field, and clicking the Live button issues the `/api/generate/stream` request **carrying `x-user-email` + `x-device-id`**, and a 429 response **navigates to `/payment?plan=pro`**. Full frontend suite **9 files / 61 tests pass**; `vite build` clean (dist removed after). Committed + pushed `475c6ab` to `claude/daily-reporter-improvements-8vc9ct` → draft **PR #79**.

**Owner-decision backlog unchanged:** whether `/api/skills/*` should count against the free quota; otop-ai-landing domain; all-platform-files domain (sitemap) + orphan-file cleanup; openthai-ai #9 (affiliate commission on shop), #10 (dispute split), #11 (AI-usage-log migration), #12 (v9.0 build-out).

### 2026-07-11 — Hourly loop, run 99: closed a freemium-bypass bug — /api/generate-ab and /api/generate/stream skipped the daily quota that /api/generate enforces

openthai-ai synced. Code scan of the three AI generation endpoints in `backend/server.js` found a real **monetization-critical bug**: only `/api/generate` (line ~343) enforced the daily plan quota (`checkQuota` → 429, `consumeQuota` on success). Its two siblings — `/api/generate-ab` (A/B variants, line ~1841) and `/api/generate/stream` (SSE streaming, line ~1870) — had **only the burst rate-limiter, no quota check**. A Free user could bypass `FREE_DAILY_LIMIT` (3/day) entirely just by hitting those endpoints, and `/generate-ab` even returns **two** variants per call. This defeats the core freemium upgrade lever (the 3/day cap is what drives the ฿299 Pro upsell).

**Fix (mirrors /api/generate exactly):**
- `/api/generate-ab`: added `checkQuota()` → 429 `QUOTA_EXCEEDED` gate before generating; `consumeQuota()` on success (one A/B request = one use). **Not** consumed on the AI-failure mock fallback (same as /api/generate — a failed generation shouldn't burn quota).
- `/api/generate/stream`: added the same 429 gate **before** opening the SSE stream (so a rejected request gets a clean JSON 429, not a half-open stream); `consumeQuota()` on successful completion, wrapped best-effort/guarded so a bookkeeping error can never break a stream that already delivered content, and **skipped if the client aborted** (`!closed`).

**Verified by actually running the real server** (`PORT=8199`, no API keys → `smartGenerate` returns mock success, `FREE_DAILY_LIMIT=3`), not by inspection: boot 1 — `/api/generate-ab` calls 1/2/3 → HTTP 200, call 4 → HTTP 429 `QUOTA_EXCEEDED`, and a subsequent `/stream` after exhaustion → 429. Boot 2 (fresh quota) — `/api/generate/stream` calls 1/2/3 → streamed `done`, call 4 → HTTP 429. `git status` clean (only `backend/server.js`, no data-file pollution). Committed + pushed `ad0c517` to `claude/daily-reporter-improvements-8vc9ct` → draft **PR #79**.

**Owner-decision backlog unchanged:** otop-ai-landing domain, all-platform-files domain (sitemap) + orphan-file cleanup, and openthai-ai #9 (affiliate commission on shop), #10 (dispute split), #11 (AI-usage-log migration), #12 (v9.0 build-out).

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

### 2026-07-22 — PR review triage across smart-e#1, otop-ai-landing#1, openthai-ai#79
Worked the three open PR review queues (CI was already green on all three —
Vercel deploys only; no test CI on these repos). Verified every finding against
the real code before acting.

- **smart-e#1** (fixed, commit 48a0c4a on `claude/daily-reporter-improvements-8vc9ct`):
  (1) `read_body()` returned any parsed JSON, so a valid-but-non-object body
  (`[]`, `"x"`, `5`) slipped past the `is None` guard and later hit
  `body.get(...)` → AttributeError → `_guard` turned a client mistake into a
  500 (PUT even fell through to 200). Now returns the same `None` sentinel the
  POST/PUT dispatchers map to a clean 400 — one fix covers every
  object-expecting endpoint. (2) `toast()` inserted `data.error` via
  `innerHTML`; some server errors interpolate DB-backed values (e.g. a product
  name in "สต๊อกไม่พอสำหรับ …"), an XSS path — now escaped with the existing
  `escapeHtml()`. `test_server.py` +6 assertions → 83 passed / 0 failed;
  mutation-tested (removing the isinstance guard reproduced the exact 500/200).
  The reviewer's third ask (require `product_id` on every order item) was
  **declined by design**: a product_id-less item is an intentional ad-hoc/custom
  line (total still = price×qty; no catalog stock to touch) — requiring it would
  break a legit POS case. Replied on-thread with the rationale.

- **otop-ai-landing#1** (fixed, commit 41b80b3): the real bug was `vercel.json`
  building only `index.html`, so `og-image.png`/`logo.webp`/`robots.txt` were
  never in the deploy output — the `filesystem` route missed them and the
  `/(.*) → /index.html` rewrite served HTML for those paths (broken favicon,
  broken social image, robots.txt returning HTML). Added each asset to `builds`.
  Also: made og:image/twitter:image/favicon + the two logo `<img>` srcs
  root-relative (not absolute — no production domain hard-coded, so no deindex
  risk), added `type="image/webp"` to the favicon, added a
  `prefers-reduced-motion: reduce` override (WCAG 2.3.3), and marked the 9
  decorative `.icon` emoji divs `aria-hidden="true"`. All 9 review threads
  resolved; all 4 Vercel previews redeployed Ready.

- **openthai-ai#79** (no code change): the flagged plan-price mismatch
  (backend ฿299/599/1299 vs. a claimed frontend ฿20/฿30) was **already resolved**
  on this branch — `PaymentPage.jsx` `PLANS` matches the backend and
  `planPricingConsistency.test.js` guards it. Other four threads were already
  auto-marked outdated. Resolved the price thread with a note; nothing to build.

### 2026-07-22 — Hardened: per-route SEO prerender now fails loudly on template drift
The prerender step (`frontend/scripts/prerender-meta.mjs`) rewrites the homepage's
`<title>`/OG/canonical/Twitter tags into per-route copies so LINE/Facebook link
previews of every `/portals/*` + funnel page show that page (not the homepage's
TikTok pitch) — this is the app's main acquisition surface. It did this with a set
of `String.replace(regex, …)` calls against the built `dist/index.html`. Verified by
running a real `npm run build`: the transform currently works (Vite preserves the
` />` tag format, so all replaces match — canonical/og:url/description/breadcrumb are
correct per route). **But** `String.replace` silently returns the input unchanged on
a miss, so a future base-template format drift (a Vite upgrade reordering attributes,
dropping the space before `/>`, etc.) would make every funnel page quietly fall back
to serving the homepage's preview again — the exact bug this step exists to prevent —
and it would ship green. This was the one step in an otherwise fail-loud SEO system
(the PROJECT_STATUS generator and `seoInvariants.test.js` both fail loudly) that
degraded silently.

Change: extracted the transform into a pure, side-effect-free `frontend/scripts/
route-meta.mjs` (`applyRouteMeta` + `breadcrumbJsonLd` + `escapeAttr`) where each
replacement now throws a descriptive error naming the missing tag if its pattern
doesn't match. `prerender-meta.mjs` imports it (output byte-identical when the
template is correct — proven with md5sum before/after across producer/contact/sitemap).
Added `frontend/src/__tests__/routeMeta.test.js` (11 tests): rewrites the real
`frontend/index.html` base, asserts per-route title/canonical/og swap with no
cross-contamination, one emitted BreadcrumbList, 3-level vs 2-level crumb trails,
"<"-escaping in JSON-LD, and — the point — that a base missing canonical/og:url/
description makes `applyRouteMeta` throw. Full frontend suite 164 passed (was 153;
+11). End-to-end mutation proof: dropping the space before `/>` on the base canonical
tag and running the real prerender now exits 1 with
`[route-meta] /portals: expected canonical link not found …`, instead of silently
emitting the homepage canonical. No behaviour change on the happy path; a real future
regression now blocks the build.

### 2026-07-22 — Hardened: constant-time comparison for one-click confirm-link tokens
Every security-sensitive one-click link in server.js (unsubscribe, broadcast
unsubscribe, affiliate-withdraw confirm GET+POST, PDPA data-erasure confirm
GET+POST, PDPA data-access confirm, payment-cancel confirm GET+POST — 9 sites)
verified its HMAC token with a plain `token !== unsubToken(...)`. A `!==` string
compare short-circuits at the first differing character — the textbook
non-constant-time secret comparison every security linter flags. The tokens are
16-hex-char truncated HMACs delivered in URLs, so a remote timing attack is
impractical, but several of these links move money (withdraw) or delete a user's
data (PDPA erasure), so comparing them in constant time is the correct
defence-in-depth. `timingSafeEqual` was already imported and used for the LINE
webhook signature, just not for these.

Change: added a pure `backend/token-verify.js` exporting `safeTokenEqual(provided,
expected)` — `crypto.timingSafeEqual` with a length guard, because `timingSafeEqual`
THROWS `ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH` on unequal-length buffers (a wrong-length
`?token=` would otherwise become a 500 on these links) and `provided` comes straight
off a query param so it can be undefined or an array (`?token=a&token=b`). Migrated all
9 comparison sites to `!safeTokenEqual(token, unsubToken(...))`. Added
`backend/scripts/test-token-verify.mjs` (14 assertions: accepts the exact token,
rejects wrong email/type/flipped-char, and never throws on undefined/null/array/
empty/wrong-length/number inputs), wired into `package.json` (`test:token-verify`)
and the CI unit-test list in `.github/workflows/test.yml`.

Verified by running: `node --check server.js` clean; the 14-assertion unit test
passes; mutation proof that the length guard is load-bearing (raw `timingSafeEqual`
on a length mismatch throws `ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH`). Booted the real
server (PORT=8791) and hit the live endpoints: broadcast-unsubscribe with the correct
HMAC → 200, wrong token → 403, missing → 400, array token → 403 (not 500);
affiliate-withdraw-confirm / PDPA-erasure-confirm / leads-unsubscribe with a bogus or
array token → 403 (not 500). Restored test-dirtied data afterwards. No behaviour
change on valid/invalid tokens; only the comparison is now constant-time and
crash-proof against odd query-param shapes.

### 2026-07-22 — Test: pin the spin-discount one-time-use invariant (money path)
The spin wheel can award a "30% off" / "50% off" prize (credits.js), stored as
`claims._discount = {pct, used:false}`. The card/PromptPay payment route
(/api/payment/... in server.js) calls `credits.consumeDiscount()` and cuts the
real Omise charge by that percentage. So the discount MUST apply exactly once —
if `consumeDiscount()` ever returned the pct a second time, the user would get
30–50% off *every* payment forever (a direct revenue leak). The behaviour was
correct (it marks `used:true`) but nothing pinned it: test-credits.mjs covered
add/clamp/consume/checkin/spin-once but never the discount lifecycle.

Added a discount block to scripts/test-credits.mjs. spin's prize is server-random,
so it stubs `Math.random` to land squarely on the first "% off" prize (found via
`SPIN_PRIZES.findIndex`, robust to prize reordering), then asserts: the forced spin
yields that discount; `peekDiscount` shows it; `consumeDiscount` returns the pct the
first time and 0 the second; `peekDiscount` is 0 afterwards; and a credits (non-
discount) prize leaves `peekDiscount` 0. Restores `Math.random` in a finally.

Verified by running: `node scripts/test-credits.mjs` → 25 passed, 0 failed (was
~18). Mutation-tested: dropping the `d.used = true` line (discount stays claimable)
makes the second `consumeDiscount` return the pct again and fails exactly the two
new one-time-use assertions. No production code changed — this locks in an existing
money invariant so a future refactor can't silently reopen the leak. CI already runs
test:credits (.github/workflows/test.yml).

### 2026-07-22 — Fix: inventory.upsert rejects negative price/cost/stock/low_stock
inventory.js `upsert()` (behind POST /api/inventory/admin/upsert) validated the
product name but ran price/stock/cost/low_stock through `num()`, which passes a
negative straight through (`num(-50, …)` → -50). So an admin typo like price -50
persisted a negative-priced product. That is a money bug, not just cosmetic:
`/api/shop/checkout` computes the Omise charge as `(p.price||0) * qty` directly
from the stored product, so a negative price makes a negative charge, and
`/api/shop/products` lists the product publicly with that negative price. The
sibling smart-e fix (2026-07-22, _create_product) closed the same class of gap on
that repo; this is the openthai-ai equivalent, at the single write path (upsert is
the only way products are created/edited).

Fix: after the name check, reject when any of price/cost/stock/low_stock is < 0
(`{ok:false}` → the route returns 400). price 0 / stock 0 stay valid (free sample /
out of stock). scripts/test-inventory.mjs +7 assertions (each negative field
rejected; price 0/stock 0 accepted; nothing negative ever persisted; an edit that
would push an existing product negative is refused and leaves it unchanged; the
temp free-sample product is removed afterward so the downstream summary asserts
still see a single product). Verified by running: node scripts/test-inventory.mjs
→ 25 passed, 0 failed (was 18). Mutation-tested: dropping the guard lets the
negatives persist and fails the new assertions. CI already runs test:inventory
(.github/workflows/test.yml).

### 2026-07-22 — Fix: dispute respond() crash when the order has no producer_email
disputes.js `respond()` computes the "other party" a counter-response must come
from. The line was `(d.opened_by === 'buyer' ? order.producer_email : order.contact
|| '').toLowerCase()`. `?:` binds looser than `||`, so the buyer-opened branch was a
bare `order.producer_email` with no `|| ''` fallback (only the producer-opened branch
got one). On an order with no producer_email, that branch is `undefined` and
`.toLowerCase()` throws a TypeError — a 500 — instead of the intended clean "contact
doesn't match the other party" rejection. `open()` already guards both sides
(`(order.producer_email || '')` / `(order.contact || '')`); `respond()` just missed it.

Fix: `(d.opened_by === 'buyer' ? (order.producer_email || '') : (order.contact || '')).toLowerCase()`
— null-guarded on both sides, matching open(). scripts/test-disputes.mjs +3
assertions: a buyer-opened dispute on an order with no producer_email → respond()
returns a clean {ok:false} (no crash); with a producer_email present the producer's
matching contact (case-insensitive) is accepted; a third party matching neither side
is rejected. Verified by running: node scripts/test-disputes.mjs → 25 passed, 0
failed (was 22). Mutation-tested: restoring the bare producer_email makes respond()
throw `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` and the
run exits 1. CI already runs test:disputes (.github/workflows/test.yml).

### 2026-07-22 — Fix: orders.track() crash when a stored order has a null contact
orders.js `track()` gates the public /api/orders/track endpoint on the caller's
contact matching the order's: `if (!c || o.contact.toLowerCase() !== c)`. The input
side `c` is null-guarded (`(contact || '')…`) but `o.contact` was not. Orders created
via place() always carry a non-empty string contact, but a row read back from Supabase
can have a null `contact` column — `o.contact.toLowerCase()` then throws a TypeError
(a 500) instead of the intended clean "contact doesn't match" rejection. Same null-
safety class as the disputes.respond() fix earlier today.

Fix: `(o.contact || '').toLowerCase()`. scripts/test-orders-track.mjs now also
exercises track() (it previously only unit-tested the pure publicOrderView): +4
assertions seeding the file store with a null-contact order and a normal one — the
null-contact order tracks to a clean {ok:false} (no crash), a wrong contact is
rejected, the correct contact (case-insensitive) returns the sanitized view with no
`contact` echoed back, and an empty contact can't bypass the gate. Verified by
running: node scripts/test-orders-track.mjs → 19 passed, 0 failed (was 15). Mutation-
tested: restoring the unguarded o.contact.toLowerCase() throws "Cannot read properties
of null (reading 'toLowerCase')" and the run exits 1. CI already runs test:orders-track.

### 2026-07-22 — Null-safety sweep: string methods on record fields (+1 fix)
Follow-up to the disputes.respond() and orders.track() fixes earlier today (both
were `x.toLowerCase()` on a value that a Supabase row can return null). Swept the
whole backend for the same crash class — string methods (toLowerCase/trim/split/
replace/…) called on a record field without a null guard:
- `.toLowerCase()` on record fields: the only remaining hits are server.js:819–821
  (broadcast recipient set), each already gated by `if (isEmail(...))`, so they only
  run on a validated string — safe.
- `.replace()` on record fields: server.js:371 `form.product.replace(...)` in
  mockGenerate — every content route validates `product?.trim()` before calling it
  (30+ call sites checked), so it's not reachable with a null product; left as-is.
- server.js:1794 `w.promptpay.replace(...)` in GET /api/affiliate/withdrawals — this
  one IS reachable: withdrawals persist to a JSON file across restarts, and a legacy/
  hand-edited row lacking promptpay makes the mask throw, 500-ing an affiliate's whole
  withdrawals page. Fixed with `(w.promptpay || '').replace(...)`.

Verified by running the real server (PORT=8795): seeded data/withdrawals.json with a
withdrawal whose promptpay is null and hit /api/affiliate/withdrawals?ref_code=… →
HTTP 200 with promptpay masked to "" (was a 500). Mutation-tested: reverting to the
unguarded `w.promptpay.replace(...)` returns HTTP 500 on the same request. (The seed
file is gitignored local scratch — file mode; production withdrawals live in Supabase
— and was reset to [] afterward.) No dedicated unit test added; this is a one-line
route guard verified live. Sweep conclusion: this null-crash class is now clean across
the backend.

---

## 2026-07-30 — a11y: associate the public /store checkout (BuyModal) labels with their inputs

Continuation of the public-form label-association sweep already shipped for /catalog
(commit 6993130) and /contact (commit aee90ea). StorePage's `BuyModal` — the checkout
the public /store funnel drives to (in the sitemap) — rendered a visible `<label>` before
each of its five controls but never associated any of them: name/contact/qty/address
inputs plus the payment-method `<select>` had no `htmlFor`/`id`, so a screen reader
announced them with no accessible name. The qty spin button had neither placeholder nor
label, so it was fully nameless (WCAG 1.3.1 Info & Relationships, 4.1.2 Name/Role/Value,
3.3.2 Labels or Instructions).

Fix: added `htmlFor="store-name|store-contact|store-qty|store-address|store-method"` to
the five labels and the matching `id` to each control. The dialog wrapper already had
`role="dialog"`, `aria-modal`, `aria-label`, and useDialog (Escape/focus-trap), so this
was the last a11y gap on the modal.

Verified: new `frontend/src/__tests__/storeOrderA11y.test.jsx` renders StorePage (useLang
returns a Thai-default `t` with no provider needed), mocks /api/shop/products, opens the
buy modal, and finds all five fields via `getByLabelText`, then types into qty via its
accessible label to prove the association is real. Full frontend suite 296/296 (33 files),
`npm run build` clean. Mutation-tested: dropping the `store-qty` htmlFor turns the test red
(getByLabelText can no longer reach the spin button); restored → green.

Sweep conclusion: the three public order/checkout forms (/catalog, /contact, /store) now
all associate every field with its label; TrackOrderPage and the /portals/* funnel forms
were already correct in prior rounds.

---

## 2026-07-30 — SEO: enrich the Organization JSON-LD entity (description + ContactPoint)

The Organization node in `frontend/index.html`'s `application/ld+json` @graph — the entity
Google reads to build the site's Knowledge Graph presence (Knowledge Panel, contact
surfacing) — carried only name/url/logo. It advertised no description and no way to reach
the org, which is a real discoverability gap for a platform trying to enter the market
quickly. WebSite/SoftwareApplication/FAQPage/BreadcrumbList structured data already existed
and is well-tested; only Organization was thin.

Change (grounded entirely in already-verified repo facts, no new external claims):
- `description`: reused the exact SoftwareApplication description already in the same block
  ("AI ไทยแท้ สร้างคอนเทนต์ TikTok …") — no new marketing copy invented.
- `email` + `contactPoint` (ContactType "customer support"): email is `support@openthai.ai`,
  the same support address the public /contact page (ContactPage.jsx) already renders as its
  mailto: Email channel — not a new address.
- `availableLanguage: [Thai, English, Chinese]`: matches i18n LANGS (th/en/zh), the verified
  trilingual support the platform actually offers.
- `areaServed: TH`.

Verified: new `frontend/src/__tests__/organizationSchema.test.js` (2 tests) parses the
index.html ld+json, asserts the Organization node's description + ContactPoint shape, and
pins the ContactPoint email to the support address read out of ContactPage.jsx so the two
hand-maintained copies can't silently drift (same drift-guard pattern as
planPricingConsistency.test.js). Full frontend suite 298/298 (34 files), `npm run build`
clean, and the built dist/index.html Organization node re-parsed as valid JSON-LD with all
three new fields present. Mutation-tested: drifting the ContactPoint email → drift-guard
red; removing the description → shape test red; both restored → green.

---

## 2026-07-30 — escape producer company/product in the approval email (last raw-interpolation email)

Scanning the backend money paths for the NaN/Infinity class just fixed in smart-e confirmed
openthai-ai is already safe there (inventory.js `num()` uses Number.isFinite; shop-checkout
computes the charge from the stored, validated price × a clamped qty; the affiliate-withdraw
amount is caught by its `>avail` / `!(amount>0)` guards). No change needed — reported "no gap"
rather than manufacturing one.

The real gap found in the same sweep: `sendProducerApproval` was the ONE notification email in
server.js still interpolating producer-entered fields (`company`, `product_name`) RAW into the
HTML — every other email here already escapes user data (portal-welcome copy, lead-detail rows,
affiliate-welcome, consumer-digest, low-stock). Beyond the XSS class the module header describes
(clip()'s /<[^>]*>/g is bypassable by an unclosed `<`), this is a plain correctness bug for
LEGITIMATE producers: a Thai shop name with `&` (e.g. "S & P") or `<`/`>` renders garbled in the
very email that tells them "your shop is approved" — a key trust moment in the producer funnel.

Fix: extracted the body into `producerApprovalHtml({ to, company, productName, domainUrl })` in
html-escape.js (same "pure builder + unit test" pattern as lowStockAlertHtml / affiliateWelcomeHtml
/ consumerDigestHtml), escaping company + productName at the insertion point; `to` only lands in the
manage-link URL via encodeURIComponent. server.js now imports and calls it (inline HTML removed).

Verified: test-html-escape.mjs +7 assertions (escaped `<img onerror>`/`<script>` payloads, an "S & P"
ampersand rendering as `S &amp; P`, empty company/product degrading to generic wording, and the
URL-encoded manage link) → 43/43 pass. Mutation-tested: reverting to raw company/productName turns
4 assertions red; restored → green. `node --check server.js` clean and the server boots with
/api/health → 200 (the new import resolves). test:html-escape is already wired into CI.

---

## 2026-07-30 — fix CSV formula-injection in the admin leads export (untrusted public input → admin's spreadsheet)

Continuing the untrusted-input sweep (email escaping the round before), the admin
"⬇️ CSV" leads export (AdminPage.jsx) was found to be vulnerable to CSV Injection /
Formula Injection (OWASP). It serialized name/contact/detail — fields filled in by
PUBLIC portal-form submitters — with only `"${v.replace(/"/g,'""')}"` quoting. That
makes the file PARSE correctly but does NOT stop a spreadsheet from EXECUTING a cell:
Excel/LibreOffice/Google Sheets strip the CSV quotes, then evaluate any cell whose text
starts with `=`, `+`, `-`, `@` (or a tab/CR) as a formula. So a submitter entering a name
like `=HYPERLINK("http://evil","click")` or a DDE payload `=cmd|'/c calc'!A1` gets it run
on the admin's machine the moment they open the exported leads file. The victim is the
platform operator, through the very data the consent funnel collects.

Fix: extracted the serialization into `src/lib/csv.js` (`csvCell` + `toCsv`), which prefixes
any cell beginning with a formula-trigger char with a single quote (the OWASP mitigation —
Excel hides the leading `'` on display, so a `+66…` phone still reads as `+66…`), then applies
the existing CSV quoting. AdminPage imports `toCsv`; the inline serializer is gone. This was
the only CSV export in the frontend.

Verified: new `src/__tests__/csvInjection.test.js` (9 tests) pins that `=/+/-/@`/tab/CR-leading
cells are defused, ordinary values (Thai names, emails with a non-leading @, phones, null/undefined)
are untouched, embedded quotes still escape, and full rows serialize correctly. Full frontend suite
307/307, `npm run build` clean. Mutation-tested: disabling the formula-lead guard turns the injection
assertions red; restored → green. (Frontend CI runs every vitest file, so this is covered automatically.)

---

## 2026-07-30 — add /.well-known/security.txt (RFC 9116 responsible-disclosure channel)

Sweep of the security/compliance surface confirmed the high-impact paths are already solid this
session (money paths guard NaN/Inf via Number.isFinite; all notification emails now escape; the
admin CSV export defuses formula-injection; the PDPA access-download's Content-Disposition filename
is header-injection-safe in practice — token-gated and Node rejects CR/LF in header values). One
genuine gap remained: the platform handles PDPA-covered PII + PromptPay/card payments but published
no security contact, so a researcher who found a bug had no clear way to report it privately.

Added `frontend/public/.well-known/security.txt` (RFC 9116) with the real privacy inbox
(mailto:privacy@openthai.ai — the same address ContactPage publishes for PDPA/Privacy), the /contact
page, a required Expires, Preferred-Languages th/en, Canonical, and Policy → /privacy. No new
external claims: every URL/email already exists in the repo.

Verified: confirmed at authoring time that Vite copies public/.well-known → dist (probe file), and
`npm run build` emits dist/.well-known/security.txt. New `src/__tests__/securityTxt.test.js` (3 tests)
asserts the RFC-required Contact (incl. the real privacy mailto) and exactly one Expires, and — as a
renewal alarm — that Expires is still in the FUTURE, so CI fails before the published policy silently
lapses. Full frontend suite 310/310, build clean. Mutation-tested: setting Expires to a past date
turns the alarm assertion red; restored → green. (Runs in CI via vitest.)

---

## 2026-07-30 — fix the 404 page's recovery CTA sending anonymous visitors into a login wall

Audit of the funnel/recovery paths (portal consent-gating and category capture verified consistent
across all 9 /portals/* pages; LINE webhook signature verify in smart-e confirmed fail-closed +
constant-time; all-platform-files' 192 "missing viewport" files verified to be HTML fragments
injected into parent pages, correctly headless — not a bug) surfaced one real conversion defect:
NotFoundPage's secondary CTA ("⚡ ลอง AI Generator") navigated to /ai-generator, which App.jsx
gates behind auth (`isAuthenticated ? <AIGeneratorPage/> : <Navigate to="/login"/>`). The typical
404 hitter is an ANONYMOUS visitor (mistyped/old/spam-crawled URL), so that CTA dead-ended them on
the login wall instead of guiding them into the funnel.

Fix: point the CTA at /ai-skills — the PUBLIC showcase of the same 35+ AI tools (App.jsx route has
no auth gate; it's in ROUTES + robots Allow, and itself carries sign-up CTAs) — relabeled
"⚡ ดูเครื่องมือ AI". Now every 404 recovery path is public and never bounces to /login. One-line
target change; the noindex soft-404 guard is untouched.

Verified: new `src/__tests__/notFoundRecoveryLinks.test.jsx` (2 tests) renders the page inside a
router that MIRRORS the real auth gate (/ai-generator → Navigate to /login), clicks each CTA, and
asserts the primary reaches home and the secondary reaches the public page — NOT the login wall.
Full frontend suite 312/312, `npm run build` clean. Mutation-tested: reverting the CTA to
/ai-generator makes the anonymous visitor land on /login and the secondary test fails. Runs in CI.

---

## 2026-07-30 — homepage "ดูทักษะทั้งหมด" CTA dead-ended anonymous visitors at /login

Continuing the public-CTA→login-wall audit started with the 404 fix, I enumerated all 32
login-gated routes (App.jsx `isAuthenticated ? … : <Navigate to="/login"/>`) and grepped the
public marketing pages for CTAs pointing at them. Findings:

- **Real bug (fixed):** LandingPage's AI-skills showcase had a "ดูทักษะทั้งหมด →" (See all skills)
  button → /skills-catalog, which is auth-gated. Its intent is EXPLORE, not sign-up, and there is a
  dedicated PUBLIC page for exactly this — /ai-skills ("ดูรายการทั้งหมดก่อนสมัคร", in ROUTES + robots
  Allow, itself carrying sign-up CTAs). On the highest-traffic page, a curious anonymous visitor was
  bounced to the login wall instead of the public list. Changed the target to /ai-skills.
- **Left as-is (intended funnel, NOT bugs):** the "เริ่มฟรี / Start Free" CTAs (LandingPage
  handleFreeStart, the free-plan buttons, PricingPage free tier) go to /ai-generator → /login. That
  is the intended sign-up entry, not a dead-end — changing it would depend on the registration model
  (LoginPage offers password-login/Google/recovery but no self-serve username sign-up; whether Google
  OAuth self-registers vs. an allowlist is a product decision), which is owner-gated (rule 8). Not touched.
- **Not added (unverified data):** the repo has no real brand social profiles — the only social
  strings are a LINE share deep-link, a Facebook sharer URL, and `tiktok.com/@yourhandle` (a form
  PLACEHOLDER). So no Organization `sameAs` was added — that would be building on unverified data.

Verified: new `src/__tests__/landingSkillsCta.test.jsx` mocks /api/skills, renders LandingPage in a
router that MIRRORS the real gate (/skills-catalog → Navigate to /login), clicks the CTA, and asserts
it reaches the public list — not the login wall. Full frontend suite 313/313, `npm run build` clean.
Mutation-tested: reverting the target to /skills-catalog makes the anonymous visitor hit /login and
the test fails. Runs in CI.

---

## 2026-07-30 — add a PDPA consent notice to the homepage newsletter signup (the one PII capture missing it)

Continuing the funnel/consent audit: the homepage hero email capture (`/api/waitlist`, source
'landing-hero') is a WEEKLY MARKETING newsletter (i18n email.desc: "เคล็ดลับ TikTok + แนวโน้มเทรนด์
ไทย ส่งทุกอาทิตย์"). It collected the subscriber's email (PII, for marketing follow-up) with NO
consent notice or privacy-policy reference at the point of collection — the privacy link lived only
in the far-away footer. This was the ONE PII-collection point in the app lacking a notice: the
/portals/* signups gate on an explicit consent checkbox (backend enforces consent:true), and the
/contact form already shows "โดยการส่งข้อความ คุณยอมรับ[นโยบายความเป็นส่วนตัว]". For a project whose
whole ethos is consent-first (owner standing order, rule 3), a marketing newsletter with no notice
is a real PDPA gap.

Fix: added a consent microtext directly under the join form — "เมื่อกดสมัคร คุณยอมรับ [นโยบายความ
เป็นส่วนตัว]" linking to /privacy — mirroring the /contact pattern exactly. Localized in all three
languages (th/en/zh) via new i18n keys email.consentPre / email.consentLink. This is notice-based
informed consent (the user's affirmative action is typing their email to subscribe); it deliberately
does NOT add a blocking checkbox, which would add friction to a hero capture — same balance the
/contact form strikes. Backend waitlist handler already validates/sanitizes/dedups the email and
sends a confirmation email; no backend change needed.

Verified: new `src/__tests__/landingConsentNotice.test.jsx` (2 tests) asserts the notice renders at
the capture point and the privacy link navigates to /privacy. Full frontend suite 315/315,
`npm run build` clean. Mutation-tested: removing the notice block turns both assertions red;
restored → green. Runs in CI.

---

## 2026-07-30 — add a PDPA privacy notice to the /store and /catalog order forms (completes the transparency sweep)

Completed the point-of-collection transparency audit begun with the newsletter fix. Confirmed every
other PII capture already informs the user: /portals/* gate on a consent checkbox, /contact and the
homepage newsletter show a privacy microtext, /affiliate has a consent checkbox + PDPA link, and the
marketplace/store order backends already email the buyer a confirmation (sendBuyerOrderConfirmation /
sendShopReceipt). The only remaining PII-collection surfaces WITHOUT any notice were the two order
modals (/store BuyModal and /catalog OrderModal), which collect name/contact/address.

Fix: added a transparency notice under the submit button in both modals — "ข้อมูลของคุณใช้เพื่อ
ดำเนินการและจัดส่งคำสั่งซื้อ ตาม[นโยบายความเป็นส่วนตัว]" with a /privacy link (opens in a new tab so it
doesn't discard the in-progress order). Both forms already share the `mk.*` i18n system, so this is a
single new key pair (mk.ord.privacyPre / mk.ord.privacyLink) localized th/en/zh, used in both. Order
data is processed on a contract-necessity basis (fulfilment), so this is a transparency notice, not a
blocking consent checkbox — matching the newsletter/contact pattern.

Verified: new `src/__tests__/orderPrivacyNotice.test.jsx` (2 tests) opens each modal (mocking
/api/catalog and /api/shop/products) and asserts the notice text plus a link whose href is /privacy.
Full frontend suite 317/317, `npm run build` clean. Mutation-tested: removing the notice from StorePage
turns the store assertion red (catalog still green); restored → green. Runs in CI.

Transparency sweep conclusion: every PII-collection point in the app now carries a consent checkbox or
a privacy notice at the point of collection.

---

## 2026-07-31 — full-surface audit: code verified solid; the remaining high-impact work is owner-gated

This round I ran a wide verification pass instead of shipping a change, because the readily
completable, high-impact gaps have now been closed over the preceding rounds and I would otherwise
be manufacturing low-value edits (which this repo's rules explicitly warn against). What I checked
this round and confirmed already-solid, each verified against the actual code (not assumed):

- **Injection/security**: smart-e's two dynamic `UPDATE … SET {fields}` build `fields` from a FIXED
  column allowlist (values via `?`), so no SQL injection; LINE webhook is HMAC-verified + constant-time;
  the admin CSV export defuses formula-injection; every notification email escapes user input.
- **Money**: NaN/Inf rejected in smart-e; openthai-ai checkout derives the charge from stored,
  validated price × clamped qty; affiliate withdraw is caught by its `>avail` / `!(amount>0)` guards.
- **Consent/PDPA**: every PII-collection point now carries a consent checkbox or a privacy notice
  (portals, /contact, /affiliate, homepage newsletter, /store + /catalog order forms); the /privacy
  page is a complete PDPA policy AND wires self-service Access + Erasure to the real endpoints.
- **Funnel/UX**: no public CTA dead-ends into /login (404 + landing fixed); all navigate()/href
  targets resolve to real routes; ErrorBoundary + Suspense fallback wrap the app.
- **AI cost/abuse**: every AI/generate endpoint has an appropriate limiter (generate/competitor/
  voice/video/admin); recovery-codes/generate is override-key gated.
- **SEO/PWA**: robots↔sitemap↔routes invariant enforced by test; Organization/WebSite/SoftwareApplication/
  FAQPage/BreadcrumbList JSON-LD present; manifest + icons valid; security.txt published. (No
  Organization `sameAs` and no WebSite `SearchAction` were added — the repo has neither real brand
  social profiles nor a URL-driven search endpoint, so adding them would fabricate capability.)

**Owner decisions needed to unblock the next tier of high-impact work** (I cannot do these without
owner input — they need production credentials or a product/architecture call, per rule 8):

1. **Run Supabase migrations 008_broadcast_unsubscribes.sql + 009_pdpa_consents.sql** — HIGHEST impact
   & concrete. The code falls back to a local file, but on Vercel's ephemeral FS the unsubscribe
   suppression list is wiped on every deploy (server.js:805), so people who opted out get re-subscribed
   — a real PDPA problem. Running the two migrations makes opt-outs + proof-of-consent durable. Needs
   someone with Supabase access to apply them.
2. **otop-ai-landing production domain** — to finish its SEO: point og:image back at the OTOP-branded
   image and add og:url + canonical (all need the real deploy domain; I shipped an interim absolute
   og:image to the shared brand asset so sharing works now).
3. **all-platform-files duplicate content** — 199/217 `OpenThaiAI_*_Roadmap.html` duplicate the
   `-roadmap-section.html` set. Decide delete / add rel=canonical / keep.
4. **OpenThai-AI-v9.0** — it's a Next.js scaffold (2 real files, no package.json, not runnable). Needs
   an architecture decision before it can be built out and verified.

No code shipped this round by design; this entry is the deliverable (a verified status + a decision
menu). Recommended next action: (1) above — it's the only one that's a pure ops task with clear PDPA value.

---

## 2026-07-31 — verify migrations 008/009 against the code + add a schema drift-guard (de-risks the owner's #1 action)

Follow-up to yesterday's blocker list: before the owner runs migrations 008/009 in Supabase, I
verified the SQL actually matches what the code reads/writes, so the migration works first try:
- `008_broadcast_unsubscribes.sql` — code only touches `email` (hydrate `select: email`, upsert
  `{email}`); migration = `email` PK + `created_at` default. Match.
- `009_pdpa_consents.sql` — the consent record POSTed to PostgREST is `{id, email, ip, purposes,
  version, consented, ts}`; migration defines exactly those 7 columns. Exact match.
Both use `create table if not exists` (idempotent) and `enable row level security` with no policy —
correct here, since only the `service_role` key (which the backend uses) bypasses RLS, so anon access
is denied by default.

To keep that match from silently drifting (a field added to the record with no column → PostgREST
400 → silent fall back to the ephemeral /tmp file → consent proofs wiped every redeploy, the exact
bug 009 fixes), I extracted the consent-record construction into `backend/pdpa-consent.js`
(`buildConsentRecord` + `CONSENT_COLUMNS`) — same "pure module + test" pattern as html-escape.js /
ai-json.js — and server.js now imports it (inline object removed). New
`scripts/test-pdpa-consent-schema.mjs` (16 checks) pins the record shape, its value normalisation
(email lowercased/trimmed/capped-254, scalar purpose → array, consented always true, id/ts from an
injectable clock), and — the point — parses the migration SQL and asserts every column the code
writes exists in 009, plus that 008 has `email`. Wired into package.json + CI (test.yml no-server block).

Verified: `node --check` clean; schema test 16/16; the app boots and `POST /api/privacy/consent`
returns success with the email lowercased and purposes preserved (buildConsentRecord works live); the
existing self-boot `test:consent-durability` (real endpoint + mock Supabase upsert/delete) still
9/9; sibling unit tests unaffected. Mutation-tested BOTH drift directions: adding a `device_id` field
to the record (not in the migration) → red; dropping the `purposes` column from 009 → red; restored → green.

---

## 2026-07-31 — CRITICAL schema landmine: two incompatible `payments` tables in migrations; guard the money path

Extending the schema-drift audit to the money tables, I found a real, latent, money-critical bug:
the migrations define the `payments` table TWICE with INCOMPATIBLE schemas.

- `migrations/FULL-MIGRATION.sql` → FLAT: `charge_id` (PK), email, plan, method, amount_thb, status,
  paid, paid_at, mock_mode, created_at. **This is exactly what the code writes** (server.js
  savePayments → `_sbReq('POST','/payments', on_conflict=charge_id)`), verified column-by-column.
- `migrations/002_subscriptions_payments.sql` → NORMALIZED: id (uuid PK), user_id NOT NULL FK →
  users(id), subscription_id FK, plan_id, omise_charge_id UNIQUE, metadata, updated_at, etc. It has
  NONE of `charge_id / email / plan / paid / mock_mode`. The code never writes this shape.

Impact: if Supabase is set up by running the numbered migrations (…002…) rather than
FULL-MIGRATION.sql, every payment upsert fails at PostgREST (missing charge_id/mock_mode columns +
`user_id NOT NULL` with no value), so the code silently falls back to the ephemeral /tmp
payments.json — and every payment/revenue record is lost on the next Vercel redeploy. A money-data-loss
landmine hiding in the migration set.

What I did (safe + non-gated): extracted the upsert-row builder into `backend/payment-row.js`
(`buildPaymentRow` + `PAYMENT_COLUMNS`), server.js imports it (inline object removed), and added
`scripts/test-payments-schema.mjs` (18 checks) that (a) pins the row shape + coercions, (b) asserts
FULL-MIGRATION.sql's payments defines every column the code writes, and (c) explicitly documents the
002 mismatch — it lists the columns 002 is missing so the incompatibility can never be silently
forgotten. Wired into package.json + CI.

Verified: node --check clean; schema test 18/18; server boots (/api/health 200); the existing
payment self-boot tests still green (payment-status-idempotent 6, webhook-idempotent 7,
discount-charge 8). Mutation-tested both ways (drop mock_mode from FULL-MIGRATION → red; add a bogus
column to the code row → red).

**OWNER DECISION NEEDED (adds to the 2026-07-31 blocker list):** reconcile the two payments schemas —
the safe path is to set up Supabase from FULL-MIGRATION.sql (matches the code) and treat 002's
`payments` table as superseded, OR migrate the code to 002's normalized schema (much larger change).
Until then: **when creating the Supabase tables, use FULL-MIGRATION.sql's flat `payments` table, not
002's.** I did not alter either .sql file — which schema is canonical is a data-model decision (rule 8).

---

## 2026-07-31 — CORRECTION: FULL-MIGRATION.sql alone is NOT the complete Supabase set-up

Following the payments-schema finding, I audited whether FULL-MIGRATION.sql (which the previous entry
recommended running) actually creates EVERY table the backend upserts to. It does not. Parsing all
`[_]sbReq('POST','/<table>')` call sites gives 14 code-upserted tables; FULL-MIGRATION.sql defines 11
of them and is MISSING three:
- `ai_usage_log` → defined only in `003_ai_usage_log.sql`
- `broadcast_unsubscribes` → defined only in `008_broadcast_unsubscribes.sql`
- `pdpa_consents` → defined only in `009_pdpa_consents.sql`

So running FULL-MIGRATION alone leaves those three uncreated, and the code keeps falling back to the
ephemeral /tmp files: AI-usage logging stays off, and the newsletter-unsubscribe list + PDPA consent
proofs are wiped on every Vercel redeploy (the exact PDPA durability bug). (ai_usage_log fails safe —
the code detects the missing table and disables logging — but 008/009 are the real PDPA gap.)

**CORRECTED, COMPLETE Supabase set-up (run all four, in the Supabase SQL editor):**
`FULL-MIGRATION.sql` + `003_ai_usage_log.sql` + `008_broadcast_unsubscribes.sql` + `009_pdpa_consents.sql`
(all are idempotent `create table if not exists`, safe to run/re-run in any order). Use FULL-MIGRATION's
flat `payments` table, NOT 002's (see the prior payments entry).

Codified this so the guidance can't silently drift: new `scripts/test-migration-coverage.mjs` (18 checks)
parses the code's POST-upsert targets and asserts every one is created by that four-file set, and
explicitly documents the three tables FULL-MIGRATION lacks + which file supplies each. It auto-catches a
future upsert to a table no migration covers. Wired into package.json + CI.

Verified: coverage test 18/18; parsed all 14 tables correctly. Mutation-tested: dropping 009 from the
recommended set makes `pdpa_consents` uncovered → red; restored → green. No SQL files were altered — I
did not consolidate the tables into FULL-MIGRATION to avoid a risky hand-transcription of DDL; the
four-file recipe + the test are the safe, verified deliverable. (This sharpens blocker #1 from
2026-07-31: it is not one migration to run, it is these four.)

---

## 2026-07-31 — schema audit COMPLETE: FULL-MIGRATION verified complete for the money path (+ column guard)

Finished the money/data-table schema audit begun with the payments landmine. Verified — column by
column against the actual code — that the recommended file FULL-MIGRATION.sql carries every column the
backend upserts for: orders (orders.js place → 19 fields incl escrow_status), producers (needs stock),
products + stock_movements (inventory.js), credits (credits.js toRow), entitlements + user_sync
(server.js). All match. credits-schema.sql is identical to FULL-MIGRATION's credits.

Two more (smaller) incremental-path gaps found, both already folded into FULL-MIGRATION so they only
bite if you run the OLD standalone files instead:
- `orders-schema.sql` alone lacks `orders.escrow_status` (added later by 006_order_disputes.sql; present
  in FULL-MIGRATION).
- `producers-schema.sql` alone lacks `producers.stock` (added by 001-shipping-stock.sql; present in
  FULL-MIGRATION).
Conclusion: **FULL-MIGRATION.sql + 003 + 008 + 009 is complete and correct for the entire code write
path** — the only true conflict remains the payments 002-vs-FULL one (guarded 2026-07-31). Do NOT run
the superseded 000-all-in-one.sql / 002 / *-schema.sql files; they are older/partial.

New `scripts/test-full-migration-columns.mjs` (67 checks) pins that FULL-MIGRATION (the file the owner
runs) contains every column the code writes for orders/producers/products/stock_movements/credits/
entitlements/user_sync — so a future edit that drops one (silently breaking the Supabase upsert → data
lost on redeploy) fails CI. Wired into package.json + CI.

Verified: 67/67; mutation-tested (drop orders.escrow_status from FULL-MIGRATION → red; restored → green).
No SQL files altered. Together with the payments + migration-coverage guards, the Supabase set-up recipe
(FULL-MIGRATION + 003 + 008 + 009) is now CI-verified end-to-end for table presence AND column completeness.

---

## 2026-07-31 — SEO: /faq FAQPage structured data now in the prerendered HTML (rich-result eligibility for non-JS crawlers)

The /faq page already emitted FAQPage JSON-LD, but ONLY client-side (FaqPage.jsx, via
dangerouslySetInnerHTML after hydration). The prerendered /faq/index.html — the first HTML byte a
non-JS crawler actually reads (Bing, the LINE link-preview bot, Googlebot's first HTML pass) — carried
Organization + WebSite + SoftwareApplication + BreadcrumbList but NO FAQPage schema, so the page's
eligibility for Google's FAQ rich result (the expandable Q&A accordion in search results — major SERP
real estate + CTR for organic discovery) depended entirely on Google's slower, unreliable second
render pass, and non-Google engines never saw it at all.

Fix: prerender the FAQPage schema into /faq/index.html, the same way BreadcrumbList is already injected
per route. To keep the visible Q&A and the structured data from drifting (Google drops the rich result
when they disagree), the 8 Q&A pairs (th/en/zh) were extracted to a single source of truth,
`frontend/src/data/faqContent.js` (`FAQ_ITEMS`), which BOTH FaqPage.jsx renders AND
`scripts/route-meta.mjs` builds the injected JSON-LD from. New `faqPageJsonLd()` in route-meta.mjs
builds it from FAQ_ITEMS.th (the language /faq defaults to on first load, so the schema matches
first-paint content); applyRouteMeta injects it for path === '/faq' only, reusing the existing
throw-on-no-op guard.

Verified: full frontend suite 324/324 green; real `npm run build` writes dist/faq/index.html with
exactly one FAQPage schema (8 questions) + its BreadcrumbList, first question present verbatim, and the
JSON-LD parses cleanly out of the served file; dist/contact/index.html has NO FAQPage (no
cross-contamination). New `src/__tests__/faqContent.test.js` (7 tests) pins: all 3 languages have the
same non-empty Q&A count, FaqPage imports the shared list (no hardcoded `faqs: [[...` literal that
could drift), faqPageJsonLd matches FAQ_ITEMS.th question-for-question, "<" is escaped so the schema
can't break out of its <script>, and /faq gets the schema while /contact does not. Mutation-tested:
disabling the /faq injection (`&& false`) turns the guard red; restored → green. Same
single-source-of-truth + fail-loud discipline as portalCategories / seoInvariants / route-meta.

---

## 2026-07-31 — FOLLOW-UP/CORRECTION: /faq now emits exactly ONE FAQPage (removed the duplicate client-side copy)

The previous entry added a prerendered FAQPage schema into /faq/index.html. But FaqPage.jsx STILL
emitted its own FAQPage JSON-LD client-side, so after hydration a direct-loaded /faq (exactly what a
crawler does) carried TWO identical FAQPage blocks — duplicate structured data, which Google's
guidelines discourage. That duplication was introduced by the prerender addition.

Fix: make the prerendered copy authoritative (Google's own recommendation is to server-render
structured data — present in the first HTML byte, no wait on the render pass) and remove the now-
redundant client-side `<script type="application/ld+json">` from FaqPage.jsx. Result: exactly one
FAQPage on the page. Both the visible list and the prerendered schema still read the single
FAQ_ITEMS source (src/data/faqContent.js), so no drift. The client-side block wasn't needed for SEO:
FAQ rich results are Google-only (social crawlers ignore FAQPage — noted in PricingPage.jsx), Google
crawls /faq by direct URL load (getting the prerendered schema), and the language toggle is client
state with no separate crawlable URL.

Note on scope: /pricing and /affiliate also emit FAQPage only client-side, but their FAQ content
comes from the i18n layer (already single-sourced) and PricingPage.jsx documents a deliberate choice
that client-side is sufficient for a Google-only, JS-rendered feature. Left as-is — not duplicating,
and not worth overriding a documented decision. Only /faq had the duplicate, because only /faq had
BOTH a client-side block AND the newly-added prerendered one.

Verified: full frontend suite 324/324 green; real `npm run build` → dist/faq/index.html has exactly
ONE "@type":"FAQPage" and the FaqPage JS bundle contains no FAQPage schema at all (no client-side
duplicate). faqPage.test.jsx now asserts the component emits ZERO client-side FAQPage blocks (guarding
against re-introducing the duplicate); the schema shape + honesty checks (consent/no-scrape/PromptPay/
PDPA present; no Neo4j/Stripe/USD/blockchain/crypto) moved to faqContent.test.js over FAQ_ITEMS.
Mutation-tested: re-injecting a client-side FAQPage into FaqPage.jsx turns the new guard red;
removed → green.

---

## 2026-07-31 — a11y/i18n: localized "← Back" on all nine /portals/* pages (was hardcoded per page)

Code scan of the consent funnel found the back control at the top of every /portals/* page was
hardcoded and did NOT follow the page's language toggle: the seven Thai-default portals (producer,
consumer, creator, affiliate, middleman, foundation, gov-thai) showed "← กลับ" and the two
international ones (gov-intl, intl-org) showed "← Back", in both cases fixed regardless of the
selected language. So a Chinese/English visitor on a Thai-default portal saw "← กลับ", and a
Thai/Chinese visitor on the international-org portal saw "← Back". The button is also visually just an
arrow + word with no aria-label, so a screen-reader user got only the bare word with no destination.

Fix: new shared helper frontend/src/pages/portals/backLabel.js (same single-source pattern as the
existing consentLabel.jsx in that folder) — backLabel(lang) returns the localized "← กลับ / ← Back /
← 返回" and backAria(lang) returns a localized accessible name stating the destination (the /portals
hub). All nine pages now import it and render {backLabel(lang)} with aria-label={backAria(lang)};
falls back to Thai for an unknown language so the control is never blank.

Verified: full frontend suite 354/354 green (was 324; +30 from the new guard). Real `npm run build`
passes. Functional render test (temporary, not committed) confirmed the ACTUAL behavior: the consumer
portal shows "← กลับ" by default and "← Back" after switching to English (with aria-label "Back to the
portal hub"); the intl-org portal shows "← Back" by default and "← กลับ" after switching to ไทย. New
src/__tests__/portalBackLabel.test.js (30 checks) pins, on all nine pages: imports the shared helper,
renders {backLabel(lang)} + aria-label={backAria(lang)}, and has no hardcoded "← กลับ"/"← Back" left;
plus the helper covers th/en/zh distinctly and falls back to Thai. Mutation-tested: reverting one page
to a hardcoded "← กลับ" turns the guard red (2 checks); restored → green.

---

## 2026-07-31 — a11y/i18n: localized the "Benefits" section heading on six /portals/* pages

Follow-up scan (after the back-button fix) found the same hardcoded-string-ignores-language-toggle bug
in the main content: the "Benefits" section heading was a hardcoded Thai "สิทธิประโยชน์" on the six
consumer-facing portals (producer, consumer, creator, affiliate, middleman, foundation) even though the
benefit ITEMS below it (t.benefits) are fully localized. So an English/Chinese visitor saw localized
✓-bullets under a Thai heading.

Fix: new shared helper frontend/src/pages/portals/sectionTitle.js (same pattern as backLabel.js /
consentLabel.jsx) — benefitsTitle(lang) → 'สิทธิประโยชน์' / 'Benefits' / '权益', falling back to Thai.
All six pages import it and render {benefitsTitle(lang)}.

Scope note (deliberately NOT in this commit — distinct, page-specific strings, logged as follow-up):
the three government/international portals use their OWN service headings that are hardcoded and also
don't follow the toggle — GovThai "บริการสำหรับภาครัฐ", GovIntl "Services", IntlOrg "Partnership Areas"
— and Foundation has a bilingual-but-not-zh "วิธีการทำงาน / How It Works". These are different labels
(not the shared "Benefits") and each needs its own localized wording, so they belong in a separate
coherent change rather than being forced through the Benefits helper.

Verified: full frontend suite 374/374 green (was 354; +20 from the new guard). Real `npm run build`
passes. Functional render test (temporary, not committed) confirmed the ACTUAL behavior: the producer
portal heading shows "สิทธิประโยชน์" by default, "Benefits" after switching to English, "权益" after
Chinese. New src/__tests__/portalSectionTitle.test.js (20 checks) pins, on all six pages: imports the
helper, renders {benefitsTitle(lang)} above the t.benefits list, and has no hardcoded ">สิทธิประโยชน์<"
left; plus the helper covers th/en/zh distinctly and falls back to Thai. Mutation-tested: reverting one
page to the hardcoded heading turns the guard red (2 checks); restored → green.

---

## 2026-07-31 — a11y/i18n: localized the remaining page-specific /portals/* section headings (follow-up)

Completed the follow-up flagged in the previous entry: the government/international/foundation portals
had section headings that were hardcoded and ignored the language toggle, the same bug class as the
back button + Benefits heading:
  GovThai   "บริการสำหรับภาครัฐ"  (over t.services)  → {t.svcTitle}
  GovIntl   "Services"            (over t.services)  → {t.svcTitle}
  IntlOrg   "Partnership Areas"   (over t.services)  → {t.svcTitle}
  Foundation "วิธีการทำงาน / How It Works"           → {t.howTitle}

Unlike the six shared "Benefits" pages (which use the benefitsTitle() helper), these are DISTINCT
per-page strings, so each was localized in that page's own T object (colocated with its services/how
arrays) rather than forced through a shared helper. GovThai deliberately ships only th/en (its toggle
offers just those two, and t = T[lang] || T.th) so its svcTitle has th/en; the others have th/en/zh.
Also confirmed in passing that GovThai's th/en-only T is intentional, not a missing-zh bug (its toggle
never offers zh).

Verified: full frontend suite 389/389 green (was 374; +15 from the new guard). Real `npm run build`
passes. Functional render test (temporary, not committed) confirmed the ACTUAL behavior: IntlOrg's
heading shows "Partnership Areas" (en default) → "ด้านความร่วมมือ" (th) → "合作领域" (zh); Foundation's
shows "วิธีการทำงาน" (th default) → "How It Works" (en) → "运作方式" (zh). New
src/__tests__/portalServiceTitle.test.js (15 checks) pins each page renders {t.svcTitle}/{t.howTitle},
defines the key once per supported language, sits over t.services where applicable, and has no
hardcoded heading left. Mutation-tested: reverting IntlOrg to the hardcoded "Partnership Areas" turns
the guard red (2 checks); restored → green. With this, every /portals/* section heading + control now
follows the language toggle (back button, Benefits, and these service/how headings all done).

---

## 2026-07-31 — SECURITY: LINE webhook signature check was fail-OPEN (event-injection bypass) — now fail-closed

Code scan of the signed webhooks (prompted by the smart-e webhook-hardening work) found the LINE
webhook signature verification in server.js was:
  `if (process.env.LINE_CHANNEL_SECRET && signature) { ...verify... }`
i.e. verification ran only when the secret was set AND an `x-line-signature` header was present. With
the secret configured but the header simply OMITTED, `signature` is '' (falsy), the whole block was
skipped, and the forged events were processed. So an unauthenticated attacker could inject fake LINE
events — fake `follow`/`message` events with attacker-chosen userIds — straight into the CRM
(line_followers / line_messages) just by NOT sending a signature header. This is the same class the
Omise webhook already fails-closed against (verifyOmiseWebhook rejects a missing sig via a length
mismatch), and smart-e's LINE webhook was hardened for earlier.

Fix: extracted the check into a tested pure module `backend/line-signature.js` — `verifyLineSignature
(rawBody, signatureHeader, secret)` returns `null` only in dev mode (no secret), `true` on a valid
signature, and `false` when the secret is set but the signature is missing/empty/wrong-length/
mismatched. server.js now drops the request on an explicit `false`; the old `&& signature` guard is
gone. Dev mode (no secret) still processes, matching prior local-testing behaviour.

Verified: new `scripts/test-line-signature.mjs` (12 checks) — valid sig accepted; empty / missing /
null / garbage / wrong-length / wrong-body signatures all rejected; no-secret returns the null dev
sentinel; and structural asserts that server.js wires it fail-closed and the old guard is removed.
Wired into package.json + CI. Sibling test:omise-webhook-verify still 13/13; server still boots +
/api/health 200. ALSO verified against the REAL running server (E2E, not committed — spawns server +
mock Supabase, LINE_CHANNEL_SECRET set): a signed follow persists user_id to line_followers, while an
UNSIGNED follow and a wrong-signature follow are both dropped (never reach the mock). Mutation-tested:
making the empty-sig case return null (fail-open, the old bug) makes the forged unsigned event get
persisted again and turns the E2E red; restored → green.

---

## 2026-07-31 — SECURITY: confirm-link tokens no longer signed with a hardcoded fallback secret in prod

Continuing the webhook/signature audit, found that `UNSUB_SECRET` in server.js — the HMAC key for
every one-click confirm link (unsubscribe, PDPA data-erasure/access, AFFILIATE WITHDRAWAL = moves
money, payment-cancel) — was `process.env.JWT_SECRET || 'openthai-jwt-secret-2026'`, a hardcoded,
source-visible constant. If JWT_SECRET was unset, anyone with repo access could forge those links —
delete another user's data (PDPA erasure/access) or confirm an affiliate withdrawal. There was already
a console.warn acknowledging this, but the code still USED the forgeable fallback (failed OPEN).
Notably auth.js already avoids this — its JWT fallback is `crypto.randomBytes(32)` (unforgeable).

Fix: mirror auth.js. `IS_PROD_LIKE = IS_VERCEL || NODE_ENV==='production'`; `UNSUB_SECRET =
JWT_SECRET || (IS_PROD_LIKE ? randomBytes(32).toString('hex') : 'openthai-dev-only-unsub-secret')`.
So: prod with JWT_SECRET set → stable + unforgeable (unchanged, correct config); prod WITHOUT
JWT_SECRET → per-process RANDOM key, so forged links are rejected and legit links simply stop
verifying across restarts/serverless invocations (fails CLOSED, not forgeable) + a loud warning; local
dev → a stable dev-only constant so hand-tested links survive a restart. The old guessable constant is
gone from source entirely.

Verified against the REAL running server — new `scripts/test-confirm-token-secret.mjs` (8 checks)
boots server.js in each config and probes GET /api/broadcast/unsubscribe: NODE_ENV=production without
JWT_SECRET rejects a token forged with the old hardcoded secret (403); prod WITH JWT_SECRET accepts a
correctly-signed token (200) and rejects the old-hardcoded one (403); dev accepts the dev-fallback
token (200) and rejects the removed constant (403); plus source asserts IS_PROD_LIKE covers Vercel,
uses randomBytes(32), and the old constant is gone. (VERCEL=1 can't be boot-probed — the server
doesn't app.listen() under Vercel — so the identical IS_PROD_LIKE branch is exercised via
NODE_ENV=production + a source assert for the Vercel arm.) Wired into package.json + CI. Existing
confirm-link tests unaffected (they set their own JWT_SECRET): withdraw-confirm 9/9, broadcast-unsub
7/7, consent-durability 9/9, pdpa-tenant 16/16; server boots + /api/health 200. Mutation-tested:
reinstating the hardcoded prod fallback makes the forged token accepted (200) and turns the test red;
restored → 8/8 green.

---

## 2026-07-31 — SECURITY: guessable default admin (admin/1234) was a live login in production — now fail-closed

Continuing the auth audit, found getAdminUsers() in auth.js created the dev-fallback admin account
(ADMIN_USERNAME||'admin' / ADMIN_PASSWORD_PLAIN||'1234') UNCONDITIONALLY when neither ADMIN_USERS nor a
real password was set — and pushed it BEFORE the environment check, which only console.error'd on
Vercel. So a production deploy that forgot to configure admin credentials shipped a live, publicly-
guessable `admin` / `1234` login (POST /api/auth/login → getAdminUsers() → match → JWT), i.e. a full-
access admin auth bypass. Same fail-OPEN class as the LINE webhook and confirm-link-secret fixes.

Fix: fail closed in a prod-like env (VERCEL or NODE_ENV=production). When the password is the weak
default ('1234' / 'change-me-admin-password') AND the env is prod-like, DO NOT create the account —
leave the admin list empty so password login is rejected until real credentials are configured
(ADMIN_USERS or a strong ADMIN_PASSWORD_PLAIN). Emergency access is unaffected (ADMIN_OVERRIDE_KEY /
RECOVERY_CODES remain). Local dev still gets admin/1234 for convenience, and a real ADMIN_PASSWORD_PLAIN
in prod still logs in normally.

Verified against the REAL running server — new scripts/test-admin-default-login.mjs (5 checks) boots
server.js per-config and probes POST /api/auth/login: NODE_ENV=production + admin/1234 → 401 (rejected);
prod + a real ADMIN_PASSWORD_PLAIN + correct creds → 200 + token, and admin/1234 → 401; dev + admin/1234
→ 200 + token, dev + wrong password → 401. (VERCEL=1 can't be boot-probed — no app.listen() under
Vercel — so the identical isProdLike branch is exercised via NODE_ENV=production.) Wired into
package.json + CI. Existing auth tests unaffected (they gate on ADMIN_KEY, not the default password
login): corporate-auth 9/9, integrations-auth 7/7, video-auth 6/6, tenant-login 10/10, recovery-code
11/11; server boots + /api/health 200. Mutation-tested: making the account always be created (the old
bug) lets admin/1234 log in under NODE_ENV=production (200) and turns the test red; restored → 5/5.

---

## 2026-07-31 — a11y/SEO: prerendered <html lang> now matches each page's actual language (intl portals were mislabeled Thai)

Code scan found the two international portals — /portals/gov-intl and /portals/intl-org — default to
ENGLISH content (useState('en'), and their prerendered title/description are English), but their
prerendered HTML inherited the base template's `<html lang="th">` because the prerender transform
(scripts/route-meta.mjs) never touched the html lang. So the first (pre-JS) byte a crawler or screen
reader sees declares Thai on English content: screen readers mispronounce the page, and Google gets a
wrong language signal. (The SPA sets document.documentElement.lang at runtime, so this only affected the
crawler/first-paint view — exactly what the prerender exists to serve.)

Fix: add an optional `lang` field to the SEO route list (seo-routes.mjs) — set `lang:'en'` on the two
international portals; everything else defaults to Thai. applyRouteMeta now rewrites `<html lang="…">`
to the route's language (throw-on-no-op guard like the other tag rewrites).

Verified: frontend suite 391/391 green (was 389; +2 checks). Real `npm run build` → dist/portals/
gov-intl and dist/portals/intl-org serve `<html lang="en">`, while producer/contact/faq stay
`<html lang="th">`. routeMeta.test.js now asserts a Thai route keeps lang="th", an en route is served
lang="en" (and not th), and the two intl portals carry lang:'en' in the route list. Mutation-tested:
forcing pageLang='th' (ignoring the route's lang) serves the English page as lang="th" and turns the
test red; restored → green.

---

## 2026-07-31 — DATA-LOSS: landing-page waitlist was file-only (wiped every Vercel redeploy) — now Supabase-durable

Code scan of the marketing funnel found POST /api/waitlist — the landing-page hero email capture, the
very TOP of the funnel — persisted signups to waitlist.json ONLY (loadWaitlist/saveWaitlist). On Vercel
that file is under /tmp and wiped on every redeploy (Vercel redeploys on every push), so every captured
email was silently lost each ship. This is the exact ephemeral-data class already fixed for portal_leads
/ broadcast_unsubscribes / pdpa_consents / payments — the waitlist was simply missed. (PDPA access +
erasure already covered the waitlist array, so rights were fine; DURABILITY was the gap.)

Fix: make the waitlist dual-mode (Supabase primary + file fallback), mirroring the broadcast_unsubscribes
pattern exactly — hydrate from Supabase into memory on boot (deduping by email, restoring after a
redeploy), upsert each new signup (on_conflict email), and — critically — DELETE from Supabase on PDPA
erasure so an erased email can't re-hydrate on the next boot. Before the owner runs the migration it
fails quietly and stays file-only (no regression). New migration backend/migrations/010_waitlist.sql
(email PK, source, joined_at; RLS enabled — service_role only, matching the others).

CORRECTION to the recommended Supabase set-up: it is now FIVE files —
`FULL-MIGRATION.sql + 003_ai_usage_log.sql + 008_broadcast_unsubscribes.sql + 009_pdpa_consents.sql +
010_waitlist.sql`. test-migration-coverage.mjs was updated (RECOMMENDED_MIGRATIONS + the "missing from
FULL-MIGRATION" documentation list) and now auto-verifies waitlist is covered — 20/20 (was 18).

Verified against the REAL running server — new scripts/test-waitlist-durability.mjs (8 checks) starts a
mock Supabase, spawns server.js pointed at it (waitlist.json seeded EMPTY so recognition can only come
from the hydrate): a prior-deploy signup (Supabase-only) is recognized as already-registered after boot
(survived the /tmp wipe); a fresh signup is POSTed to Supabase; PDPA erasure issues a DELETE for the
email (won't re-hydrate) and a forged erasure token → 403. Wired into package.json + CI. Sibling schema
tests unaffected: migration-coverage 20/20, full-migration-columns 67/67, payments-schema 18/18,
pdpa-tenant 16/16; server boots + /api/health 200. Mutation-tested: pointing the boot hydrate at a wrong
table stops the seeded email from being recognized and turns the test red; restored → 8/8.

---

## 2026-08-05 — DATA-LOSS/CORRECTNESS: scheduled auto-posts silently never fired on Vercel — now Supabase-durable

Standing-order loop, marketing lane. Code scan of the auto-marketing engine found POST /api/autopost/queue
(the "schedule a social post" feature) stored the queue in autopost_queue.json ONLY. On Vercel that file
is under /tmp, which is (1) wiped on every redeploy (Vercel redeploys on every push) AND (2) private to
each serverless lambda instance — so a post the POST invocation queued is invisible to the later
/api/autopost/process cron invocation that is supposed to send it. The in-process cron.schedule fallback
is also gated `if (!IS_VERCEL)`, so it never runs in production either. Net effect: any post scheduled
for a future time was silently never sent on prod — a whole marketing-automation feature dead in the
water. (Immediate posts, schedule_at ≈ now, still worked: they dispatch synchronously inside the POST
handler before any /tmp/instance boundary matters. Only the SCHEDULED path was broken.) This is the same
ephemeral-/tmp class already fixed for waitlist / broadcast_unsubscribes / pdpa_consents / payments — the
autopost queue was simply missed, and here the /tmp being per-instance made it worse than pure redeploy
loss.

Fix: make the queue dual-mode (Supabase primary + file fallback), mirroring the waitlist pattern but for
a store with MUTABLE status — hydrate the queue into memory on boot, upsert on every queue/status-change
(persistAutopost, one item at a time so a queued→sent/failed transition is persisted immediately), and —
the actual correctness fix — have /api/autopost/process (and the local cron) pull DUE items
(status=queued & schedule_at≤now) straight from Supabase via a new dueAutopostItems() helper, so the cron
sees posts queued by ANY instance and after ANY redeploy, not just what happens to be in this lambda's
memory. Before the owner runs the migration it fails quietly and stays file-only (no regression). New
migration backend/migrations/011_autopost_queue.sql (id PK, content/platforms/results jsonb, status,
schedule_at, a (status, schedule_at) index for the due-query; RLS enabled — service_role only, matching
the others).

CORRECTION to the recommended Supabase set-up: it is now SIX files —
`FULL-MIGRATION.sql + 003_ai_usage_log.sql + 008_broadcast_unsubscribes.sql + 009_pdpa_consents.sql +
010_waitlist.sql + 011_autopost_queue.sql`. test-migration-coverage.mjs was updated
(RECOMMENDED_MIGRATIONS + the "missing from FULL-MIGRATION" documentation list) and — because it
auto-parses every `sbReq('POST', '/<table>')` call site — now auto-verifies autopost_queue is covered:
22/22 (was 20).

Verified against the REAL running server — new scripts/test-autopost-durability.mjs (10 checks) starts a
mock Supabase, spawns server.js pointed at it (autopost_queue.json seeded EMPTY so any due item can only
have come from Supabase): (1) /api/autopost/process with no key → 401 (it dispatches real outbound posts,
must stay cron-only); (2) a post queued in a PRIOR deploy (Supabase-only) fires after the /tmp wipe —
processed≥1 and its Supabase status flips off 'queued'; (3) a post queued by ANOTHER instance directly in
Supabase AFTER this server booted (never in this process's memory) is still found and dispatched — the
cross-invocation guarantee the file-only queue could never give; (4) a FUTURE-scheduled post is upserted
to Supabase (durable) but NOT sent until due (processed=0). Wired into package.json + CI. Sibling suites
unaffected: migration-coverage 22/22, waitlist-durability 8/8, broadcast-unsub 7/7, payments-schema
18/18, withdraw-confirm 9/9; server boots + /api/health 200. Mutation-tested: forcing dueAutopostItems()
back to the old in-memory-only filter makes the cross-instance post invisible (processed=0) and turns the
test red; restored → 10/10. (Dispatch itself marks items 'failed' in the test since no LINE/FB tokens are
set — irrelevant; the fix is about the queue being FOUND and processed after a wipe, not the send.)

NOTE (still open, unchanged): the affiliate-payout double-payout finding from the prior round
(withdrawals + withdraw_confirmations file-only, and _affFromRow resets paid_out to 0 on Supabase reload)
is a MONEY path with legal implications — left untouched, awaiting the owner's go-ahead per standing-order
rule 8. This round deliberately picked a non-money durability bug instead.

---

## 2026-08-05 — DATA-LOSS/CORRECTNESS: /api/scheduler/* scheduled posts silently never processed on Vercel — now Supabase-durable

Standing-order loop, marketing lane. Follow-up to the same-day autopost_queue fix. Code scan found a
SECOND, parallel "schedule a post" feature — /api/scheduler/* (the live Scheduler page, SchedulerPage.jsx,
also surfaced on Admin/Dashboard/StrategyCenter/ContentStudio/AIToolsHub) — with the identical serverless
bug. /api/scheduler/create stored the queue in scheduler.json ONLY; on Vercel that file is under /tmp:
wiped on every redeploy AND private to each lambda instance. Vercel Cron fires GET /api/scheduler/process
daily (09:00 UTC, confirmed in vercel.json crons), but that is a DIFFERENT invocation from the one that
created the post, so it reads an empty/stale /tmp file and sees nothing → scheduled posts (including the
auto LINE OA broadcast when due, via lineBroadcast) were silently never processed in production. Verified
by grep + reading the endpoints: processScheduler filtered the in-memory schedulerStore.posts; the cron
lambda's copy is always empty on a cold start.

Fix (mirrors the autopost_queue durability fix exactly): make the scheduler queue dual-mode (Supabase
primary + file fallback) — new _schToRow/_schFromRow mappers, hydrate on boot, persistScheduler(post)
upserts one post at a time on create/status-change/execute, DELETE removes from Supabase, and — the
actual correctness fix — a new dueSchedulerPosts() pulls due posts (status=pending & scheduled_at≤now)
straight from Supabase, used by BOTH /api/scheduler/process (the daily cron + the SPA "process now"
button) and /api/scheduler/due (the SPA's due-count badge, which was also wrong on Vercel). Fails quietly
/ stays file-only before the migration is applied (no regression). New migration
backend/migrations/012_scheduler_posts.sql (id PK; platform/content/audience/language, scheduled_at,
status, channel/error/reach_mock, published_at/ready_at; (status, scheduled_at) index; RLS service_role
only). DID NOT change auth on /api/scheduler/process — SchedulerPage.jsx calls it unauthenticated ("process
now" button), so it is intentionally SPA-callable; it only processes already-due owner content, and adding
auth would break the page (kept out of scope per standing-order rule 8).

CORRECTION to the recommended Supabase set-up: it is now SEVEN files —
`FULL-MIGRATION.sql + 003 + 008 + 009 + 010 + 011 + 012_scheduler_posts.sql`.
test-migration-coverage.mjs updated (RECOMMENDED_MIGRATIONS + the "missing from FULL-MIGRATION" doc list)
and — because it auto-parses every `sbReq('POST', '/<table>')` call site — now auto-verifies
scheduler_posts is covered: 24/24 (was 22).

Verified against the REAL running server — new scripts/test-scheduler-durability.mjs (12 checks) starts a
mock Supabase, spawns server.js pointed at it (scheduler.json seeded EMPTY so any due post can only have
come from Supabase): (1) a post scheduled in a PRIOR deploy (Supabase-only) is processed after the /tmp
wipe and its status flips off 'pending'; (2) a post created by ANOTHER instance directly in Supabase AFTER
this server booted (never in memory) is still found and processed — the cross-invocation guarantee the
file-only queue could never give; (3) a FUTURE post is upserted (durable) but NOT listed by /due and NOT
processed until due; (4) admin delete removes it from Supabase (won't re-hydrate) and delete without the
admin key → 401. Wired into package.json + CI. Sibling suites unaffected: migration-coverage 24/24,
autopost-durability 10/10, waitlist 8/8, broadcast-unsub 7/7; server boots + /api/health 200. Mutation-
tested: forcing dueSchedulerPosts() back to the in-memory-only filter makes the cross-instance post
invisible (processed=0) and turns the test red; restored → 12/12. (No LINE token in the test, so a due
LINE post resolves to 'ready' — irrelevant; the fix is about the post being FOUND and processed after a
wipe, not the broadcast.)

NOTE (still open, unchanged): the affiliate-payout double-payout finding (withdrawals + withdraw_
confirmations file-only, _affFromRow resets paid_out to 0 on Supabase reload) is a MONEY path with legal
implications — still untouched, awaiting the owner's go-ahead per standing-order rule 8.

---

## 2026-08-05 — DATA-LOSS: submitted (paid) video jobs became unpollable after a Vercel redeploy — now Supabase-durable

Standing-order loop. Before picking this, verified the other lanes are already solid so this was the
genuine highest-impact REAL remaining bug: the /portals/* consent funnel is fail-closed + PDPA-covered;
robots.txt ↔ sitemap ↔ prerender ROUTES are consistent (homepage included, line 61); Organization/WebSite/
SoftwareApplication/FAQPage/BreadcrumbList structured data all present; credits/orders/producers/payments/
entitlements/user_sync are all dual-mode Supabase and migration-covered. What remained was /api/video/*.

Bug (verified from code): POST /api/video/generate submits a job to a paid video provider (Runway/Pika/
Kling/Luma/Veo — real per-clip spend on the PLATFORM's keys) and stored the job record in video_jobs.json
ONLY. On Vercel that file is under /tmp: wiped on every redeploy AND private to each lambda instance, so
GET /api/video/jobs/:id/status did `videoJobs.find(...)` on an empty in-memory array and returned 404
"job not found" after any redeploy or on any other instance — the user could no longer retrieve the video
they (the platform) already paid a provider to render. Same ephemeral-/tmp class as the autopost/scheduler
fixes; narrower blast radius (only when a real provider key is set), but a real paid-work loss.

Fix (mirrors the autopost/scheduler durability fixes): dual-mode the job store (Supabase primary + file
fallback) — _videoToRow/_videoFromRow mappers, hydrate on boot, persistVideoJob() upserts one job at a
time on create + on each status poll, and a new findVideoJob() looks a job up in Supabase when it isn't in
this lambda's memory (the poll-after-redeploy / cross-instance path). Fails quietly / stays file-only
before the migration is applied (no regression). New migration backend/migrations/013_video_jobs.sql
(id PK; form/script/job jsonb; created_at desc index; RLS service_role only).

CORRECTION to the recommended Supabase set-up: it is now EIGHT files —
`FULL-MIGRATION.sql + 003 + 008 + 009 + 010 + 011 + 012 + 013_video_jobs.sql`.
test-migration-coverage.mjs updated (RECOMMENDED_MIGRATIONS + the "missing from FULL-MIGRATION" doc list)
and — because it auto-parses every `sbReq('POST', '/<table>')` call site — now auto-verifies video_jobs is
covered: 26/26 (was 24).

Verified against the REAL running server — new scripts/test-video-jobs-durability.mjs (7 checks) starts a
mock Supabase, spawns server.js pointed at it (video_jobs.json seeded EMPTY so any found job can only have
come from Supabase; provider:'mock' jobs so the poll returns without any external call): (1) /status
without a token → 401, unknown id → 404; (2) a job from a PRIOR deploy (Supabase-only) is still pollable
after the /tmp wipe — 200, not 404; (3) boot hydrate lists it; (4) a job created by ANOTHER instance
directly in Supabase AFTER this server booted (never in memory) is found via findVideoJob and merged into
memory. Wired into package.json + CI. Sibling suites unaffected: migration-coverage 26/26, scheduler 12/12,
autopost 10/10, waitlist 8/8; server boots + /api/health 200. Mutation-tested: forcing findVideoJob back
to memory-only makes the cross-instance job 404 and turns the test red; restored → 7/7. (The prior-deploy
case is covered by the boot hydrate, so it stays green under that mutation — the cross-instance checks are
the discriminating guard for the findVideoJob Supabase lookup.)

NOTE (still open, unchanged): the affiliate-payout double-payout finding (withdrawals + withdraw_
confirmations file-only; _affFromRow resets paid_out to 0 on Supabase reload) is a MONEY path with legal
implications — still untouched, awaiting the owner's go-ahead per standing-order rule 8.

---

## 2026-08-05 — Cross-repo (smart-e): reject a QR/payment that references a nonexistent order

Standing-order loop. Diversified away from openthai-ai after re-verifying its high-traffic paths are
already solid this session: pricing is consistent across PricingPage PP_META / backend SUBSCRIPTION_PLANS
/ index.html SoftwareApplication offers (Free/Pro 299/Premier 599/Enterprise 1299 all agree); og-image.png
exists (330KB) and is referenced absolutely; i18n is key-complete across th/en/zh (index.jsx 260/260/260,
affiliate.js 25/25/25, admin.js 5/5/5 — no drift that would show Thai to en/zh visitors); robots↔sitemap↔
prerender ROUTES consistent; Organization/WebSite/SoftwareApplication/FAQPage/BreadcrumbList structured
data all present. otop-ai-landing's remaining SEO (canonical/og:url) is still the domain-gated owner
decision; all-platform-files domain normalization likewise owner-gated; the affiliate double-payout money
path stays owner-gated per rule 8.

Unblocked, verifiable work was in smart-e (the Python-stdlib POS). Ran test_server.py first (134/134
green), then audited the money paths (_create_order, _update_order_status, _confirm_payment, _create_qr,
dashboard aggregation) — all well-hardened by earlier rounds (stock/customer-total symmetry on cancel/
un-cancel, finite-amount guards, 404/400 on missing refs, cancelled-excluded revenue). Found ONE real
remaining gap: _create_qr stored body.order_id into the payments row WITHOUT checking the order exists, so
a QR/payment could be recorded against a "ghost" order (typo'd/nonexistent id). That payment can never move
an order's status (_confirm_payment's `UPDATE orders ... WHERE id=<ghost>` no-ops, order_updated stays
False) and pollutes any payments↔orders join — inconsistent with the file's own pattern (_confirm_payment
404s on a missing payment; _create_order 400s on a missing product id).

Fix (smart-e server.py): in _create_qr, when order_id is not None, SELECT the order and 404 if missing;
order_id=None (standalone QR) still allowed; a real order_id still succeeds. Verified by running — added 4
assertions to test_server.py's payments/QR block (nonexistent order_id → 404, real → 200, none → 200); full
suite 138/138 (was 134); ast.parse clean. Mutation-tested: neutering the existence check makes the
ghost-order QR return 200 and turns the new test red; restored → 138/138. Committed to smart-e branch
claude/daily-reporter-improvements-8vc9ct (ba28dc6; smart-e has no DECISIONS_LOG so full detail is in the
commit message) — on the open smart-e PR #1, no auto-merge.

---

## 2026-08-05 — OPEN FINDING (owner-gated, rule 8): affiliate double-payout after a Vercel redeploy — verified, NOT yet fixed

Consolidating into ONE authoritative entry a HIGH-severity financial-integrity finding that until now
lived only as trailing "NOTE (still open)" lines on unrelated entries. No money-path code has been changed
— this is a money movement with legal implications, so per standing-order rule 8 it waits for the owner's
go-ahead. This entry records the verified evidence and a concrete fix plan so it's actionable the moment
the owner decides (and so a future session/AI doesn't have to re-investigate).

WHY THIS ROUND IS A LOG ENTRY, NOT A CODE FIX: surveyed all 5 repos and re-confirmed the unblocked,
verifiable work is already done — openthai-ai pricing/OG/i18n(th/en/zh 260/260/260)/SEO/structured-data
solid; smart-e money paths hardened (last round's QR→ghost-order fix, 138/138); all-platform-files domain
fully normalized (0 un-hyphenated) and the 192 "*-section.html" are by-design embed FRAGMENTS (start with
<section>, no <html>/<body> — one literally says "วาง <section> นี้ใน landing/index.html"), so adding
doctype/viewport there would be WRONG (verified, not assumed); otop-ai-landing canonical still domain-gated;
OpenThai-AI-v9.0 has no package.json so it's unbuildable/unverifiable (rule 4). The genuinely
highest-impact remaining item is this money bug — and the most useful safe action on it is a durable,
accurate record, not a unilateral money-path edit.

THE FINDING (verified against current code, this commit's tree):
- `affiliate-row.js:22` `affToRow` persists to Supabase `pending_payout = (total_earned - paid_out)`, but
  NOT `paid_out` itself as a column.
- `server.js:1416` `_affFromRow` hard-sets `paid_out: 0` on EVERY load from Supabase, and never reads
  `pending_payout` back to reconstruct it.
- `server.js:1515` `WD_FILE` (withdrawals) and `server.js:1686` `WD_CONFIRM_FILE` (withdraw_confirmations)
  are file-only under WRITE_DATA_DIR (= /tmp on Vercel); grep confirms ZERO `_sbReq(...,'/withdrawals')` or
  `/withdraw_confirmations` — no Supabase persistence at all.
- `server.js:1531` the withdraw gate is `affPending = affAvailable(a, withdrawals)` =
  `total_earned - paid_out - reservedFor(withdrawals)` (reservedFor sums this affiliate's pending/approved
  withdrawal amounts from the file store).

THE MECHANISM (double-payout): Vercel redeploys on every push and wipes /tmp. After a redeploy: (a)
affiliates re-hydrate from Supabase through `_affFromRow` → `paid_out` becomes 0; (b) withdrawals.json is
gone → `reservedFor` becomes 0. So `affPending = total_earned - 0 - 0 = total_earned`. An affiliate who was
already paid now sees their ENTIRE lifetime earnings as "available" again and `POST /api/affiliate/withdraw`
(gate `amount > avail`, server.js ~1196 region) accepts a fresh request for it. The only remaining guard is
manual admin approval — the automated money-integrity control is gone.

PROPOSED FIX (for owner approval — do NOT build without go-ahead):
- Part A (low-risk, no migration, self-contained): stop resetting paid_out; reconstruct it on load from the
  value Supabase ALREADY stores — in `_affFromRow`, `paid_out = max(0, (total_earned) - (pending_payout))`.
  Uses the `pending_payout` column `affToRow` already writes, so no schema change. A legacy row missing
  `pending_payout` → paid_out = total_earned → affPending = -reserved ≤ 0 → fail-CLOSED (shows ฿0 available,
  never over-pays). This closes the "paid_out resets to 0" half at the root.
- Part B (broader scope — needs a migration decision): make the withdrawals + withdraw_confirmations ledger
  durable in Supabase (new tables + migration + dual-mode hydrate/upsert/DELETE, exactly like the
  waitlist/autopost_queue/scheduler_posts/video_jobs durability work already shipped this session), so
  `reservedFor` survives a redeploy. Requires the owner to run the migration (like the existing 8-file set).

QUESTION FOR THE OWNER: approve shipping Part A now (safe, closes the main double-payout root, no migration)?
And do you want Part B (durable withdrawals ledger + a new migration) in the same change or staged after?
Until you say go, the affiliate money path stays untouched per rule 8.

---

## 2026-08-05 — Guard the AI-skills catalog against "phantom endpoint" drift (core-product regression class)

Standing-order loop (money path still owner-gated, untouched). This round audited the CORE product — the
AI-skills grid on /ai-skills. The catalog (frontend/src/pages/AISkillsPage.jsx) advertises 26 skill
buttons, each with an `endpoint: '/api/skills/...'`. Verified — by parsing both files — that all 26 map to
a real `app.get`/`app.post` handler in server.js (server.js registers 31 such routes; the extra 5 aren't
surfaced in this grid, which is fine). So there is NO current phantom-endpoint bug.

But this is exactly the bug class the repo was already bitten by (7 /portals/* pages POSTed to
/api/leads/submit, which didn't exist → every form silently failed; see the portal-leads entry). The
frontend catalog and the backend routes can silently drift as skills are renamed/added, and a mismatch
only surfaces as a 404 the moment a user clicks a paid feature — no existing unit test would catch it.

Added scripts/test-skills-endpoints.mjs: parses AISkillsPage.jsx for every advertised
`/api/skills/...` endpoint and server.js for every `app.get/post('/api/skills/...')` route, and asserts
each advertised endpoint is a real handler. Static cross-file guard (no server boot), so it's fast,
deterministic, and can't drift. Wired into package.json (test:skills-endpoints) + CI.

Verified by running: 28/28 pass. Mutation-tested: injecting a phantom catalog entry
(endpoint '/api/skills/ghost-nonexistent') turns the guard red; removing it → 28/28 green. No app code
changed — this is a regression guard for the core product, in the spirit of the existing seoInvariants /
migration-coverage / portalFieldCollision guards.

---

## 2026-08-05 — Guard the WHOLE-APP frontend↔backend API contract (generalizes the skills guard)

Standing-order loop (money path still owner-gated, untouched). Extended last round's per-catalog skills
guard to the entire app. Every endpoint the React app calls goes through apiUrl()/apiFetch(); if the
frontend calls an /api path no backend route serves (a route renamed/removed, or a new call with a typo),
the feature 404s the moment a user touches it and no unit test catches it — the exact class the repo was
bitten by (7 /portals/* pages → /api/leads/submit, which didn't exist; every form silently failed).

First VERIFIED the current contract is fully intact: extracted all 165 distinct /api endpoints the
frontend passes to apiUrl/apiFetch and cross-checked against all backend routes — every one resolves to a
real handler (the lone raw-grep miss, `/api/usage${email?…}`, was an extraction artifact of a ternary
query-string, not a real gap: backend has app.get('/api/usage') at server.js:464). Reliable because the
routing is flat — every router mounts via app.use(x.router) with NO path prefix and every route (server.js
+ the router modules) is declared with a full '/api/...' literal, so a static scan of
app|router.<verb>('/api/...') is the complete authoritative route set.

Added scripts/test-api-contract.mjs: scans every .jsx/.tsx under frontend/src for apiUrl/apiFetch calls
(parsing template literals via balanced-brace ${…} handling so `/api/usage${…}` → /api/usage and
`/api/orders/${id}/status` → a wildcard segment), scans all backend .js for app|router routes, and asserts
each frontend endpoint matches a route (path params :id and ${id} both normalized to one wildcard segment;
query strings ignored). Wired into package.json (test:api-contract) + CI. Complements — doesn't replace —
test-skills-endpoints (which pins the visible skills catalog specifically).

Verified by running: 165/165 pass. Mutation-tested: injecting apiFetch('/api/phantom-does-not-exist') in a
page turns the guard red; removing it → 165/165 green. No app code changed — a regression guard for the
core customer-facing contract, in the spirit of the existing seoInvariants / migration-coverage guards.

---

## 2026-08-05 — Extend the API-contract guard: forbid raw fetch('/api/...') that bypasses apiUrl/apiFetch

Standing-order loop (money path still owner-gated — I said I'd wait for the Part A green light and I'm
keeping that; not touched). Closed the one remaining gap in yesterday's whole-app contract guard. apiBase.js
exists so EVERY API call gets the production API base (VITE_API_URL) prepended and the x-user-email /
x-device-id identity headers attached; a raw fetch('/api/...') skips both — it works in local dev (Vite
same-origin proxy) but in production hits the wrong origin and sends no identity, a prod-only break that
never surfaces in dev. Verified the codebase currently has ZERO such raw calls (grep + the test), so the
frontend is clean; the guard locks it so a future raw call can't slip in.

Extended scripts/test-api-contract.mjs with a check that scans frontend/src for `fetch('/api/...')` /
`fetch(\`/api/...\`)` not routed through apiUrl/apiFetch (regex excludes apiFetch via a preceding-char
guard) and fails with the offending file:line. Verified by running: 166/166 (was 165; +1). Mutation-tested:
injecting fetch('/api/raw-bypass') fails the guard and names AIGeneratorPage.jsx:460; removing it → 166/166.
No app code changed; already wired into CI as test:api-contract.

---

## 2026-08-05 — Add an owner-facing migration runbook (unblocks the durability work already shipped)

Standing-order loop (money path still owner-gated — waiting for the Part A green light as promised, not
touched). This round audited SEO meta first: all 25 routes have a unique, per-audience `desc` — 0 missing,
0 duplicate description, 0 duplicate title (my first pass used the wrong field name `description` and
false-alarmed; the real field is `desc`). Five descs run >160 chars (SERP truncation) but they're copied
verbatim from each page's i18n source, so trimming them here would desync from that source — deliberately
left alone.

The real, high-leverage gap: everything durable shipped this session (waitlist / autopost_queue /
scheduler_posts / video_jobs — plus broadcast_unsubscribes / pdpa_consents / ai_usage_log) only becomes
durable ONCE the owner runs the Supabase migrations. But docs/DEPLOYMENT.md tells the owner to set
SUPABASE_URL/SERVICE_KEY and NOWHERE lists which .sql files to run, and there was no runbook in
backend/migrations/. So a deployer sets the env vars, skips the SQL, and every "durable" feature silently
falls back to the ephemeral /tmp store — i.e. the exact data-loss bugs those migrations fix stay unfixed in
practice. The code was done; the activation step was undocumented.

Added backend/migrations/README.md — a Thai runbook: run these 8 files in the Supabase SQL editor, in
order, with a one-line purpose each and what breaks if you skip it; notes that FULL-MIGRATION.sql
intentionally does NOT include 003/008/009/010/011/012/013 (so all 7 supplements are required), and that
the older/overlapping files need not be re-run. Guarded against drift (the codebase's core principle —
derived/checked over hand-maintained): test-migration-coverage.mjs now parses the README's bold-code file
list and asserts it equals RECOMMENDED_MIGRATIONS exactly (both directions), so a future migration added to
the recommended set but not the runbook (or vice-versa) fails CI.

Verified by running: migration-coverage 28/28 (was 26; +2). Mutation-tested: un-bolding the 013 entry in
the README makes the guard report "MISSING: 013_video_jobs.sql" and turns it red; restored → 28/28. No app
code changed; the guard rides the existing test:migration-coverage CI step.

---

## 2026-08-05 — Document 3 env vars the code reads but .env.example omitted (deployability gap)

Standing-order loop (money path still owner-gated; waiting on Part A). Ran the rule-1 tool
`scripts/generate-project-status.mjs` — it exits clean (no code↔registry drift) but flagged one real gap:
3 env vars are read by backend code yet absent from backend/.env.example, so a deployer configuring from
the example would never know they exist. Verified each is real and optional (safe default), then documented
it in the right section (commented-out, since all three are optional):
- `OMISE_API_URL` (omise-payment.js:9) — Omise API base, default https://api.omise.co; override only for
  test/mock. Documented under the Omise section.
- `WEBHOOK_RETRY_DELAYS` (webhook-system.js:77) — JSON array of retry backoff ms for outgoing tenant
  webhooks; default lives in code. New "Outgoing webhooks" section.
- `NODE_ENV` (auth.js:72, server.js:1302) — usually platform-set; =production turns on prod-like guards
  (e.g. the guessable-default-admin block) on non-Vercel hosts. Documented under Server.

Verified by running: re-running generate-project-status now prints "✅ every env var referenced in backend
code is documented in .env.example" (was ⚠️ 3 missing). No code changed — documentation only; PROJECT_STATUS.md
left un-committed as usual (it carries a per-run timestamp + a live prod-health probe).

---

## 2026-08-05 — Consolidate the pending owner-decisions into one verified, current doc

Standing-order loop. The genuinely highest-leverage work left is unblocking the OWNER — but the pending
"needs the owner's call" items are scattered across ~5000 lines of DECISIONS_LOG and, critically, several
are STALE (already fixed). Verifying each against the current code before listing it (rule 1 / "verify
before believing") found:
- #9 affiliate commission on shop sales — ALREADY DONE (server.js:728 calls creditAffiliateSale on a ref
  checkout). Old log said "open".
- #10 dispute "split" that didn't split — ALREADY DONE (the "แบ่งครึ่ง" button removed, disputes.resolve()
  rejects `split`). Old log said "open".
- all-platform-files un-hyphenated domain — ALREADY DONE (0 files left).
So the "12 owner-decision items" impression the old log gives is wrong; only a handful are genuinely open.

Added docs/OWNER-DECISIONS.md — a prioritised, verified-current snapshot the owner can act on in one pass:
🔴 high-impact open — (1) the double-payout Part A/B (money), (2) run the 8 Supabase migrations to activate
the durability work, (3) set JWT_SECRET in the 3 Vercel projects; 🟡 needs-info open — (4) otop-ai-landing
production domain, (5) whether to build out v9.0 so it deploys; 🟢 already-fixed (recorded so the stale log
doesn't mislead); 🔵 minor notes. Each 🔴/🟡 item states why it matters, the safe options, and what I ship
the moment it's approved.

Every technical claim verified before writing: JWT_SECRET behaviour corrected — the code is fail-CLOSED
(unset in prod → per-process RANDOM key → links unforgeable but flaky across invocations), NOT the old
"forgeable constant" the first draft said; fixed the doc to describe the real impact (links won't verify
reliably until JWT_SECRET is set). Confirmed: migrations/README.md exists, v9.0 still has no package.json,
shop-checkout credit line present. Documentation only; no code changed.

---

## 2026-08-05 — SECURITY/COST: rate-limit the admin-credential auth endpoints + the paid TTS endpoint (were unthrottled)

Standing-order loop (money path still owner-gated). Audited rate-limit coverage on public/costly endpoints
(backend/CLAUDE.md: "every route group must go through express-rate-limit"). Every AI-generation endpoint is
already capped (generateLimiter/competitorLimiter/voiceLimiter). Found FOUR that were not:
- `/api/auth/override` — returns an ADMIN token on a correct override key. No limiter → the override key was
  brute-forceable with no throttle.
- `/api/auth/recovery` — returns an ADMIN token on a valid recovery code. No limiter → recovery codes
  brute-forceable.
- `/api/auth/recovery-codes/generate` — issues fresh recovery codes on the override key. No limiter.
  (`/api/auth/login` already had authLimiter — these three siblings were missed.)
- `/api/tts` — calls the PAID ElevenLabs API on the platform key; public (VoiceCommander runs on public
  pages) with no throttle → loopable to drain the ElevenLabs budget, the exact real-money exposure the
  AI/voice/competitor endpoints already cap.

Fix (matches the existing pattern, non-breaking — limiters allow normal use): add `authLimiter` (20/15min
per IP, same as login) to the three auth endpoints; add a new `ttsLimiter` (20/min, defined before the
route since voiceLimiter is declared later in the file) to /api/tts. No auth added to /api/tts so the
public VoiceCommander keeps working — a throttle is the right, non-breaking control there.

Verified against the REAL running server: hammering /api/auth/override 25× with a wrong key returns 20×401
then 429 (authLimiter engaged); /api/tts returns 20×503 (no key configured — but the limiter runs first)
then 429. Existing auth flows unaffected: recovery-code 11/11, corporate-auth 9/9, video-auth 6/6 (all make
< 20 requests). New scripts/test-auth-ratelimit.mjs (5 checks) boots the server and asserts each endpoint
starts 429-ing once its limiter trips; wired into package.json + CI. Mutation-tested: removing authLimiter
from /api/auth/override makes the 429 never appear and turns the test red; restored → 5/5. node --check clean.

---

## 2026-08-05 — SECURITY: rate-limit /api/system/auto-heal (unthrottled manual watchdog → agent re-runs = AI spend)

Standing-order loop (money path owner-gated). Continued last round's rate-limit audit of public/costly
endpoints. Verified the rest of the flagged set is safe: /api/n8n/trigger fails CLOSED (401 if
N8N_WEBHOOK_SECRET unset or wrong), /api/webhooks/:id/test is admin-gated (webhooksAuth), /api/agent/:id/run
is device-ownership gated, /api/scheduler/execute/:id is unauth but its ids are unguessable
(sch_<ts>_<rand>) so the practical risk is low. The real outlier: /api/system/auto-heal had NO auth and NO
limiter, yet runWatchdog() loops all agents and re-runs any stale scheduled one (runAgent → real AI spend +
outbound webhooks). Every SIBLING system/cron endpoint (news-rag-clear / daily-report / consumer-digest /
autopost-process) is already cron-or-admin gated — auto-heal was the one left world-callable.

It's a UI button on the (non-admin, device-scoped) Agent page, so requiring the admin key would break that
button. The right non-breaking control is a rate limiter (same call last round made for TTS): add
autoHealLimiter (max 6 / 15 min per IP) so the occasional legitimate click works but a loop that thrashes
agent re-runs / log spam is capped. (runWatchdog is partly self-limiting anyway — it only re-runs agents
stale >26h/8d — but an unthrottled public trigger of ANY agent run + checkpoint-file ops still warranted a
cap and consistency with its siblings.)

Verified against the REAL running server: POST /api/system/auto-heal 8× → 6×200 then 429. Existing auth
flows unaffected. Extended scripts/test-auth-ratelimit.mjs (now 6 checks) to assert auto-heal 429s within 8
calls; already wired into CI. Mutation-tested: removing autoHealLimiter makes the 429 never appear and turns
the check red; restored → 6/6. node --check clean. No tracked data files committed (restored data/ after
the test runs, which exercise runWatchdog).

## 2026-08-06 — CONTENT/SEO: add a grounded consumer/buyer Q&A to the /faq single source (consent-funnel gap)

Standing-order loop (money path still owner-gated; waiting on Part A). Rule-1 tool
`generate-project-status.mjs` exits clean (no code↔registry drift). Picked a real content/consent-funnel gap:
`frontend/src/data/faqContent.js` (the ONE source that feeds both the visible /faq page and the prerendered
FAQPage JSON-LD) answered producer-join and affiliate-earn but had NO entry for the consumer/buyer side —
the very consent group the standing order lists first. A prospective buyer reading /faq found nothing about
what signing up gets them, and Google's FAQ rich result was missing that Q entirely.

Added one Q&A per language (th/en/zh → 10 items each, equal-length invariant preserved), grounded strictly
in verified features: consent-based signup at /portals/consumer (route confirmed in App.jsx:239) with PDPA
consent + category selection; category-matched new-product digest from verified producers with sold-out
items skipped automatically (sendConsumerDigest); unsubscribe anytime; buy at /catalog (App.jsx:185) via
PromptPay/card; track at /track. No invented features — no USD/Neo4j/Stripe/blockchain/crypto (the file's
own rule + faqContent.test.js forbid-list).

Verified by running: `vitest run faqContent.test.js` → 8/8 (equal-length across langs, JSON-LD⇄FAQ_ITEMS.th
match, forbid-list clean); full frontend suite `npm test -- --run` → 47 files / 458 tests pass; `npm run build`
prerenders and the new consumer Q&A (/portals/consumer) is present in dist/faq/index.html's FAQPage schema —
so the rich-result entry ships in the first HTML byte a non-JS crawler reads, no second render pass needed.

---

## 2026-08-06 — DEPLOYABILITY: document OPENTHAI_DATA_DIR in .env.example (close the one rule-1 drift the generator flagged)

Standing-order loop (money path still owner-gated). Ran the rule-1 tool `generate-project-status.mjs` first:
its env-var consistency check was the ONE thing flagging a real gap — `OPENTHAI_DATA_DIR` is read by backend
code (server.js:90, the WRITE_DATA_DIR override) yet was absent from backend/.env.example, so the generator
printed "⚠️ 1 missing" on every run. Everything else scanned this round came back solid: all 9 /portals/*
pages share an identical consent+submit funnel (2 consent refs + submitLead each); SEO single-source
seo-routes.mjs covers every public route incl. all portals; base index.html carries an honest
Organization+WebSite+SoftwareApplication @graph (Offers match Free/299/599/1299, no invented aggregateRating);
grep for TODO/FIXME/placeholder found only legit UI input placeholders — no unfinished work.

OPENTHAI_DATA_DIR is a TEST-ONLY override (points every file-backed store at a throwaway dir so self-boot
tests skip snapshot/restore on tracked files). Documented it in the existing "Dev / Testing เท่านั้น — ห้ามตั้ง
ใน production" section (commented-out, matching the DISABLE_RATE_LIMIT precedent) WITH an explicit
production-safety warning: setting it in prod to an ephemeral dir (e.g. /tmp) would silently lose all data on
restart. So the doc isn't box-ticking — it also prevents a real data-loss footgun.

Verified by running: `generate-project-status.mjs` now prints "✅ every env var referenced in backend code is
documented in .env.example" (was ⚠️ 1 missing) and exits 0 (no code↔registry drift anywhere). `node --check
backend/server.js` clean. Docs-only change — no code/behaviour touched; PROJECT_STATUS.md left un-committed as
usual (per-run timestamp + live prod-health probe).

---

## 2026-08-06 — CONTENT/SEO: add middleman/distributor Q&A to /faq — completes consent-group FAQ coverage

Standing-order loop (money path still owner-gated). Ran rule-1 `generate-project-status.mjs` — exits 0, no
drift. Surveyed for the round's task: openthai-ai's SEO/structured-data is exhaustive (Org+WebSite+
SoftwareApplication @graph, per-route BreadcrumbList, FAQPage, per-route <html lang> already fixed for the two
English portals); otop-ai-landing's remaining SEO gaps (canonical / og:url / sitemap) all require the landing
page's production domain, which is explicitly UNCONFIRMED in-repo (index.html:21-23 note) and on the owner-
gated list — a wrong canonical actively harms SEO, so per standing-order point 8 I did NOT guess it; verified
the landing page's in-page anchors (#how/#main/#roles) and all CTAs point at real portal routes (clean).

Picked the one real content gap: the /faq single source covered producer-join, consumer, and affiliate but
NOT the middleman/distributor consent group — one of the primary consent groups the standing order lists.
Added one Q&A per language (th/en/zh → 11 items each, equal-length invariant preserved), grounded strictly in
MiddlemanPortalPage's real content: signup at /portals/middleman with PDPA consent + business-type
(distributor/wholesaler/broker/reseller) + territory/channel; benefits = special wholesale pricing from
verified producers, territory/channel rights, marketing/content support, direct producer connection (no
redundant middlemen); team confirms network membership. No invented features; no forbidden terms. This
completes FAQ coverage of all four primary consent groups (producer/consumer/middleman/affiliate) — a
bounded completeness goal, not open-ended churn.

Verified by running: `vitest run faqContent.test.js` → 8/8 (equal-length across langs, JSON-LD⇄FAQ_ITEMS.th
match, forbid-list clean); full frontend suite `npm test -- --run` → 47 files / 458 tests pass; `npm run build`
prerenders and the new middleman Q&A (/portals/middleman) is present in dist/faq/index.html's FAQPage schema.

---

## 2026-08-06 — TEST/DRIFT-GUARD: pin FAQ answer text to real routes (unguarded dead-link risk)

Standing-order loop (money path still owner-gated). Rule-1 `generate-project-status.mjs` exits 0. Scanned
broadly this round and confirmed maturity everywhere: all 9 /portals/* pages link from the /portals hub;
all-platform-files' 13 region product JSONs share one schema AND every one's totalProducts exactly equals its
actual categories[].items count (verified by running — my first traversal assumed the wrong shape and falsely
flagged all 13, so I re-checked before believing it: no data bug); the onboarding components have no images/
external-links/forms to mis-wire.

Found one REAL unguarded gap: FAQ answers embed in-app paths as plain text ("(/portals/consumer)",
"ซื้อสินค้าได้ที่ตลาด (/catalog)", "ติดตามคำสั่งซื้อได้ที่ /track" — 8 distinct paths: /ai-skills /catalog /join
/portals/{consumer,middleman,producer} /pricing /track). The /faq page is public, indexable, 3-language help
content whose FAQPage schema is also prerendered — so a renamed route would silently send users AND crawlers
to a dead /path. The existing spaNavTargets guard does NOT cover this: it only parses navigate()/<Link>/<NavLink>
targets, never route paths sitting inside FAQ answer strings. All 8 resolve today, so this locks in a passing
invariant rather than fixing a live break.

Added src/__tests__/faqRouteTargets.test.js — reuses spaNavTargets' exact route-table parsing + resolve logic
(static routes, dynamic roots, wildcard prefixes), extracts /paths from every Q&A string (lookbehind excludes
matches inside URLs/emails), and asserts each resolves against App.jsx. Verified by running: 9/9 pass;
full frontend suite 48 files / 467 tests pass (was 47/458). Mutation-tested: rewriting "/catalog" to a
nonexistent path turns the guard RED (1 failed), restoring → GREEN — so it genuinely catches the drift it
claims to. Test-only change; faqContent.js untouched (git diff = the one new file).

---

## 2026-08-06 — [smart-e] fix: reject NaN/Infinity product price (was persisted → invalid catalog JSON)

Standing-order loop, this round in the smart-e repo (Python POS). Full detail lives in the smart-e commit
message (569886a) since that repo has no DECISIONS_LOG; recorded here too so the central decision history stays
complete.

Found by code scan: smart-e's order path (_create_order) and QR path (_create_qr) both guard math.isfinite()
on incoming amounts (a NaN/Infinity slips past `x < 0` since nan<0 and inf<0 are both False), but the product
create/update path did NOT. Verified LIVE against a throwaway SQLite db: POST /api/products {price: Infinity}
→ HTTP 201 and the product is PERSISTED; GET /api/products then emits a literal `Infinity` token = invalid
JSON, so a strict client (browser JSON.parse) throws on the WHOLE catalog — one bad product breaks the entire
product list for every client. POST {price: NaN} → HTTP 500 (unhandled). Both inconsistent with the clean 400
the sibling money paths return.

Fix: added the same math.isfinite() guard to _create_product (POST) and _update_product (PUT) → clean 400.
Verified after fix (live): Infinity/NaN on POST+PUT → 400; valid finite prices still create (201); catalog stays
valid JSON. Added a 'product input validation' section to test_server.py (7 checks incl. a catalog-finiteness
assertion); full harness 145 passed / 0 failed (was 138). Mutation-tested: removing either guard turns the new
checks red, restoring → green. Pushed to smart-e branch claude/daily-reporter-improvements-8vc9ct (PR #1).

---

## 2026-08-06 — MONEY-PATH: reject non-finite (NaN/Infinity) producer price (generalized from the smart-e fix)

Standing-order loop. After finding the NaN/Infinity money bug in smart-e last round, scanned openthai-ai's
backend for the same class (client-supplied numbers → money math without a finiteness check). Verified the
affiliate WITHDRAW path is already safe (Infinity > avail → 400; !(NaN > 0) → 400). But the producer PRICE
path was not: producers.js register/update and getPrice all used `Number(x) > 0 ? Number(x) : null`, and in
JS `Number("Infinity"/"1e999") === Infinity` with `Infinity > 0 === true`, so a non-finite price passed.

Reproduced LIVE against the real module (file-store, isolated tmp dir): register({price: 1e999}) → ok:true,
and getPrice() returns **Infinity in memory**, while the persisted producers.json stores **"price": null**
(JSON.stringify(Infinity) === "null"). That split means: until the next restart, orders on that product take
Infinity as the authoritative amount (orders.js place() → order.amount = Infinity → serialised to null on the
JSON-file write = a null-amount order + poisoned in-memory revenue sums); after a restart the price is silently
null. Same root cause as smart-e: no finiteness guard at the write boundary.

Fix: added `Number.isFinite(Number(x))` to the price guard at all four spots — producers.js register (write),
updateListing (write), getPrice (read-back defense for legacy/tampered rows), and orders.js place() for both
the client price and the authoritative price (belt-and-suspenders). NaN was already nulled (NaN > 0 is false);
this closes +Infinity/1e999.

Verified by running: reproduced the bug, applied the fix, re-ran → Infinity/1e999 price now normalises to null
(register + updateListing), and an order given a non-finite client OR authoritative price records amount null,
never Infinity. Extended two existing deterministic tests: test-producers.mjs (32 passed, +3 finiteness checks)
and test-order-price-authority.mjs (14 passed, +5). Mutation-tested: reverting the guards turns exactly those
new checks red (producers 3 fail, order 3 fail incl. "got Infinity"); restoring → green. Sibling suites still
green: order-confirm 11, stock-guard 9, cancel-restock 12, orders-track 19, producers-schema 14. node --check
clean on both changed files.

---

## 2026-08-06 — TEST/PDPA: guard the /join (ProducerJoinPage) consent funnel — was uncovered

Standing-order loop. Prompted by the v9.0 finding (its affiliate-hub collects PII with NO consent gate AND
posts to a non-existent endpoint — flagged to the owner, awaiting a decision; not touched, per point 8),
audited the MAIN platform's consent funnels for the same class. Result: strong. All 9 /portals/* pages gate
submit on consent (`disabled={!consent || busy}`) and portalConsent.test.js pins 6 PDPA invariants on each,
incl. the exact "fake success on a failed submit" bug — so the main portals are bulletproof.

Found one real COVERAGE gap: /join (ProducerJoinPage) is the second producer onboarding entry (the /faq itself
tells producers to use "/portals/producer หรือ /join"), collects the same PII, and POSTs to
/api/producers/apply (which also requires consent:true) — but portalConsent.test.js only scans *PortalPage.jsx,
so /join was UNGUARDED. This page shipped once with NO PDPA UI at all (per its own top comment) and uses its
own CONSENT_TEXT map (not the shared consentLabel()), so its 3-language copy can drift the way the per-page
maps did before. Verified the page is currently correct: consent defaults false, sent in the POST body,
checkbox bound, submit disabled without consent, 3-lang label present, and setDone(true) is gated on d.success
(no fake success). But nothing pinned it.

Added src/__tests__/producerJoinConsent.test.js — 6 structural asserts mirroring portalConsent.test.js
(consent-state-defaults-false, consent-in-body, checkbox bound, submit disabled without consent, CONSENT_TEXT
has th/en/zh, success screen gated on .success). Verified by running: 6/6 pass; full frontend suite 473 passed
(was 467). Mutation-tested: dropping the `!consent` submit gate and making setDone(true) unconditional turns
2 checks red; restoring → green. Test-only; ProducerJoinPage.jsx untouched (git diff clean).

PENDING OWNER DECISION (unchanged): OpenThai-AI-v9.0 app/affiliate-hub/page.tsx posts to a non-existent
/api/affiliate/apply (dead form) and collects name/email/phone with no PDPA consent. Options given: (ก) point
it at the real consent-gated /portals/affiliate [recommended], (ข) build a real consent-gated endpoint
[owner-gated build-out], (ค) hide the page until v9.0 is built out. Awaiting the owner's choice.

---

## 2026-08-06 — DOC: refresh OWNER-DECISIONS.md — add the v9.0 affiliate-hub finding + consent/money status

Standing-order loop. Completed the consent-surface audit that motivated the /join guard: verified EVERY
PII-collecting form on the main platform is consent-correct — 9 /portals/* (portalConsent.test.js), /join
(producerJoinConsent.test.js, added this session), ContactPage (privacy-notice model + success-gated, not an
opt-in list so no checkbox needed), LandingPage waitlist (res.ok && data.success gated + consent notice, the
fake-success bug already fixed). The main platform's consent + money paths are now fully verified and guarded.

No new code gap remained, so the highest-value action was keeping the owner's consolidated decision queue
accurate (docs/OWNER-DECISIONS.md — the single place the owner acts on, per point 8). It was dated 2026-08-05
and missing the v9.0 affiliate-hub finding I surfaced this session. Before editing, re-verified every existing
item still matches the code: #1 double-payout (_affFromRow still `paid_out: 0`, server.js:1425 — still open),
#3 JWT_SECRET fail-closed (auth.js:12 + server.js:1312 prod warning — accurate), #5 v9.0 (still 2 files, no
package.json). Updated the doc: (1) snapshot date → 2026-08-06; (2) added item #6 = v9.0 affiliate-hub form
POSTs to a non-existent /api/affiliate/apply (dead form, verified: only /api/monitor/health exists) AND
collects name/email/phone with no PDPA consent — distinct from #5 because option (ก) [point it at the real
consent-gated /portals/affiliate] fixes it WITHOUT the full build-out; options ก/ข/ค laid out; (3) added to
the "done" section the NaN/Infinity money-path guards and the now-complete consent-funnel verification/guards.

Verified: doc re-read, Thai intact (fixed a transient typo in the H1), item #6 + status notes render, no
`รอเจ้าอง` typo remains. Docs-only. v9.0 itself NOT touched — still awaiting the owner's ก/ข/ค (point 8).

---

## 2026-08-06 — [all-platform-files] add validate-products.mjs — guard the 13 regional catalog counts

Standing-order loop, in the all-platform-files repo (full detail in commit d972a7c there, since that repo has
no DECISIONS_LOG). This round audited more of the main platform first and confirmed maturity: the seasonal
engine (a key SEO differentiator — 24 solar terms, computed live) is correct incl. the Jan 1–5 → previous 冬至
year-wrap and the 冬至→小寒 next-year wrap, and is well-tested (50 checks pass); the UTC vs Thai-TZ term boundary
is a defensible choice given the term table is ±1-day approximate, so NOT changed.

Picked a real unguarded invariant: all-platform-files' 13 products-<region>.json each declare a hand-maintained
`totalProducts` and a `categories[].items[]` list, but nothing checked the header count against the actual item
count and the repo has no build/test step — so a file could silently claim the wrong number of products
(misleading any seed/import that trusts the header). Verified all 13 currently hold (totalProducts === items,
consistent 4-key schema). Added validate-products.mjs (pure stdlib) pinning: valid JSON, the schema, integer
totalProducts, every category has a name + non-empty string items[], and totalProducts === Σ items. Exit 0/1
so it can join CI later.

Verified by running: 13/13 valid (exit 0). Mutation-tested: bumping a totalProducts, and separately adding an
item without updating the count, each make it exit 1 with a precise per-file message; restoring → exit 0.
Pushed to all-platform-files branch (PR #1). No main-platform code touched this round.

---

## 2026-08-06 — [all-platform-files] wire validate-products.mjs into CI (enforce the catalog invariant)

Standing-order loop. This round also re-audited smart-e's money/data paths and confirmed maturity:
_confirm_payment (404 on missing payment, advances order pending→paid only, idempotent — 'paid' touches no
stock), _get_dashboard_stats and _get_analytics (COALESCE null-safety, consistent status!='cancelled' filters,
best-seller lists JOIN orders to exclude cancelled, ?days=abc handled, no server-side avg division). smart-e
has no discount/promo logic at all, so no negative-total risk. No new bug.

Follow-through on last round's validator: all-platform-files had NO CI, so validate-products.mjs only ran when
invoked by hand. Added .github/workflows/validate.yml (mirrors openthai-ai's test.yml style — checkout@v4 +
setup-node@v4) that runs `node validate-products.mjs` on every push and PR. Now a regional catalog whose
totalProducts drifts from its real item count, or whose JSON/schema breaks, fails a check instead of shipping
silently — the guard actually enforces.

Verified: the workflow YAML parses (1 job, 3 steps) and the exact command it runs (node validate-products.mjs)
exits 0 against the current 13 catalogs. Pushed to all-platform-files branch (PR #1). No main-platform code
touched.

---

## 2026-08-06 — [otop-ai-landing] unify Organization JSON-LD with the main site (shared @id + contactPoint)

Standing-order loop, in otop-ai-landing (full detail in commit 1814672 there — no DECISIONS_LOG in that repo).
The landing page's remaining SEO gaps (canonical / og:url / sitemap) all still need its production domain, which
is unconfirmed (owner-decision #4) — NOT guessed. But one real, domain-INDEPENDENT fix: the landing page emitted
an Organization JSON-LD with the same url as the main site (www.openthai-ai.com) yet a thinner, different shape
(no @id, no contactPoint), so a crawler saw two inconsistent entities for one brand. Added the main site's exact
Organization @id (…/#organization) so both resolve to a single brand entity, plus the same verified email +
ContactPoint (support@openthai.ai / areaServed TH / Thai-English-Chinese) — all copied from the main site's
existing Organization, nothing invented, no domain dependency.

Verified by running: the landing JSON-LD parses; its @id byte-matches the main site's Organization @id; the
email matches the main site's support address (present there). Pushed to otop-ai-landing branch.

---

## 2026-08-07 — VERIFY: confirm PR #79 is fully mergeable after ~20 commits (+ seasonal flake investigated)

Standing-order loop. With the non-gated code surface exhaustively covered over the recent rounds (money-path
finiteness fixed + swept, consent funnel verified+guarded incl. /join, region-catalog validator+CI, landing
Organization schema unified), this round's highest-impact action was confirming the accumulated work hasn't
broken the branch — a hidden red would block the eventual merge that unblocks the owner-gated go-live.

Ran the CI-equivalent on HEAD (c0a974c): frontend `npm test -- --run` → 473/473 pass; `node --check server.js`
clean; backend deterministic tests incl. every file I touched this session — producers 32/0, order-price-
authority 14/0, orders-track (exit 0), digest-match 21/0, disputes 30/0, portal-leads 20/0, credits 25/0,
inventory 29/0, affiliate-payout (exit 0), seasonal 50/0.

One investigation: test-seasonal-engine.mjs exit-1'd ONCE inside a sequential `>/dev/null` loop, then passed
5/5 in isolation. Audited it for hidden time-dependence: every assertion uses fixed dates (D(2026,…)); the
only "now"-fallback call (bad-date → new Date()) asserts merely that solar_term.cn is non-empty, never a
date-specific value. So the test is deterministic and the one-off was an environmental blip, not a real
test/engine bug — recorded here so a future transient flake is understood, not chased. No code change.

---

## 2026-08-07 — i18n(footer): localize the homepage "About" link (was hardcoded Thai for en/zh visitors)

Standing-order loop (content/market-entry, point 2). Auditing internal linking of the key SEO/funnel routes
found /faq and /seasonal ARE discoverable (homepage footer, LandingPage.jsx:365 — my first grep just missed
the array-literal form), so no orphan-page gap. But the audit surfaced a real i18n bug in that same footer:
every link label uses t('footer.link.X') EXCEPT "About", which was a hardcoded Thai literal 'เกี่ยวกับเรา'. So
an English or Chinese visitor to the homepage — the #1 market-entry page, and the platform explicitly targets
"คนไทยและตลาดโลก" — saw Thai text for that one footer link while every sibling localized.

Fix: added footer.link.about to all three language dicts (th 'เกี่ยวกับเรา' / en 'About us' / zh '关于我们') and
switched LandingPage.jsx to t('footer.link.about'). Verified by running: grep confirms the key in all 3 dicts;
read() (i18n/index.jsx:950) is a plain `key in dict` lookup so each lang resolves to its own string (no more
raw-key/Thai fallback); full frontend suite 473/473 pass (49 files — the suite renders LandingPage, so the new
t() call is exercised at runtime); `npm run build` succeeds. Frontend-only, two files.

---

## 2026-08-07 — i18n(home): localize the hero "Earn" CTA + AI-skills section (were hardcoded Thai)

Standing-order loop (content/market-entry, point 2). Continuing the footer-About i18n fix, scanned the
LandingPage (#1 market-entry page, targets "คนไทยและตลาดโลก") for the same class. It calls t() 62× — clearly
meant to be fully localized — yet a few prominent strings were hardcoded Thai, so en/zh visitors saw Thai:
(1) the header "💸 หารายได้" (/earn) CTA, whose sibling buttons all use t('nav.*'); (2) the AI-SKILLS section
title "ทักษะ AI ครบจบในที่เดียว" and its three stat labels "ทักษะ AI / พร้อมใช้งาน / หมวดหมู่".

Added 5 keys in all three languages — nav.earn (💸 หารายได้ / 💸 Earn / 💸 赚钱) and home.skills.{title,total,
active,categories} (e.g. en "All the AI skills in one place / AI skills / Ready to use / Categories") — and
switched LandingPage to t() for each. Scoped to these clear outliers, not a full-page rewrite.

Verified by running: each of the 5 keys present in all 3 lang dicts (grep = 3 each); the 5 hardcoded Thai
literals gone from LandingPage (grep = 0); full frontend suite 473/473 (the suite renders LandingPage, so the
new t() calls are exercised at runtime); npm run build succeeds. Frontend-only, two files.

---

## 2026-08-07 — i18n(home): localize the "Start earning ฿1,000/day" hero CTA + verify no other Thai leaks

Standing-order loop (content/market-entry). Capstone of the homepage i18n pass. A source scan of JSX text
misses strings that a real render exposes, so I wrote a throwaway render-probe test (renders LandingPage under
LanguageProvider forced to 'en'/'zh', reads container.textContent, flags Thai codepoints U+0E00–U+0E7F). It
caught one more hardcoded-Thai leak the earlier scans missed: the green hero CTA "💸 เริ่มหารายได้ ฿1,000/วัน",
shown verbatim to English AND Chinese visitors.

Added hero.ctaEarn in all three languages (th '💸 เริ่มหารายได้ ฿1,000/วัน' / en '💸 Start earning ฿1,000/day' /
zh '💸 每天赚 ฿1,000') and switched LandingPage to t('hero.ctaEarn'). Re-probed: the EN and ZH homepage now
render only two Thai fragments, both LEGITIMATE — "อ" is inside an SVG <text> (the logo glyph / brand mark)
and "ไทย" is the language-switcher's own button label (a language picker correctly shows each language's name
in its own script). So no incorrect Thai remains on the homepage for en/zh visitors.

Verified by running: hero.ctaEarn present in all 3 dicts; the hardcoded literal is gone from LandingPage (only
the th i18n value remains); render-probe shows no incorrect Thai in the en/zh render; full frontend suite
473/473; npm run build succeeds. Frontend-only, two files. (This completes the LandingPage localization begun
with the footer-About and hero/skills fixes.)

---

## 2026-08-07 — test(i18n): permanent render-based guard against stray Thai on the homepage for non-Thai visitors

Standing-order loop (content/market-entry quality). The three homepage i18n fixes (footer About, hero/skills
labels, the "เริ่มหารายได้" CTA) were each found only by a real render, never by a source scan — so a source-level
drift guard would not protect them. Turned the throwaway render-probe into a permanent test:
`frontend/src/__tests__/landingNoThaiLeak.test.jsx`. It renders LandingPage under LanguageProvider forced to
'en' and 'zh', collects visible text while skipping any <svg> subtree, strips the ฿ currency sign, and fails if
any Thai run (U+0E00–U+0E7F) remains — with two by-design exceptions that are NOT bug-allowlisting: the logo is
an inline <svg> whose glyph is the Thai letter "อ" (brand art, excluded by skipping svg subtrees), and the
language switcher shows each language's name in its own script so "ไทย" is the one permitted bare-Thai token.

Verified by running: the guard passes 2/2 (en + zh) on current main; mutation test — temporarily injecting a
hardcoded Thai <span> into LandingPage turned it RED (both langs), reverted → GREEN; full frontend suite now
475/475 (was 473, +2 from this guard). Frontend-only, one new test file, no source changes. Now any future
hardcoded Thai on the homepage fails CI instead of silently shipping to English/Chinese visitors.

---
