# OpenThaiAi — Decisions Log

Append-only record of real architecture decisions **and rejected proposals**,
so Claude / Gemini / Grok (and any human) can check a claim about this
project's direction against what was actually decided, instead of trusting
whichever assistant last generated a confident-sounding paragraph.

Add a new dated entry at the top when a real decision is made or a scope-creep
proposal is rejected. Do not delete old entries — a wrong idea that was already
rejected once is worth remembering so it doesn't get silently re-proposed.

---

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
