# 10 · Box system on the backend kit: handoff

Written on 2026-10-13 by the second developer (ramiel@optinetsolutions.com) with Claude Code, for the
developer who built this front end, so you can check what changed while you were away and carry on.

**Where it stands**
- **Live:** https://mysterybox-seven.vercel.app, the public production URL.
- **Commits:** `08bb15a..e03ecb3` on `main`, plus the docs commit that adds this file.
- **Demo:** shown to the client on 2026-10-13.

## In one paragraph

A separate developer now owns the backend. They documented their logic as a "Misty-style" kit, v1.0
of 13 October 2026:
- the mechanism in plain words: https://mys-sim.vercel.app/docs/misty
- the developer notes, with an API sandbox: https://mys-sim.vercel.app/docs/misty/dev
- the kit zip (engine, `openapi.yaml`, `schema.sql`, `test-vectors.json`):
  https://mys-sim.vercel.app/downloads/misty-backend-kit.zip

The client wants the mystery box system working the way that kit says, so the box system now runs
their logic end to end:
1. the open is created with a sealed secret;
2. the player may add a seed;
3. they pay, then spin;
4. the secret is revealed, and anyone can recompute the roll.

It runs against an **in-browser mock of their API** that follows their contract, so it can switch to
their server later. Nothing on the site was removed.

## Read these first

1. The approved spec: [superpowers/specs/2026-10-13-box-api-showcase-design.md](superpowers/specs/2026-10-13-box-api-showcase-design.md).
2. The plan it was built from (7 tasks): [superpowers/plans/2026-10-13-box-api-showcase.md](superpowers/plans/2026-10-13-box-api-showcase.md).
3. `web/README.md`, the section "Box system (the backend developer's kit)".
4. The root `CLAUDE.md`, updated for the new model (rules 5, 7, 8, 11 and 12, the architecture table,
   the core loop and verification).

## Decisions made with the user (2026-10-13)

- **Approach.** We took approach A: their API, mocked in the browser, behind the existing switch
  `NEXT_PUBLIC_BACKEND`. `mock` is the default; `api` points at their server through
  `NEXT_PUBLIC_BOX_API_URL`. Two approaches were rejected:
  - copying their simulator with MISTY's 13 boxes: a competitor's catalogue with no photos, and the
    kit itself says not to reuse it;
  - swapping only the draw: it would show no credit, free spins or trade-in, and wouldn't plug into
    their API.
- **Catalogue.** Our 8 boxes and 52 pieces stay. They are converted to the kit's format, with free
  spins added (see "Catalogue" below).
- **Paying.** The demo USD balance acts as the card. Site credit is a second balance, and an open can
  be paid with credit when there is enough.
- **The reel.** It no longer spins during an open, because the kit forbids anything that looks like a
  near win. It stays on the page as the idle "what's inside" strip.
- **Analysis.** The section is shown to players; `NEXT_PUBLIC_SHOW_ANALYSIS=off` hides it. Part (a)
  shows the operator's margin.
- **Scope.** This round covered the box system only. The back office, the wallet credit page, the
  sell-back to trade-in wording sweep and most docs were deferred (see "Not done yet").
- **Questions.** The user said the backend developer already knows the contract gaps. Gaps get a
  sensible default, marked "pending the backend", instead of questions. What we found was sent to
  the backend developer as an FYI (summarised under "Pending the backend").

## What changed, by area

| Area | Files | What |
|---|---|---|
| Engine | `web/src/engine/draw.ts`, `maths.ts`, `test-vectors.json` | Their recipe on Web Crypto: seal = `sha256(serverSeed)`; digest = `HMAC-SHA256("DRAW-<slug>-<serverSeed>-<clientSeed>-<nonce>", "")`; roll = first 13 hex digits / 2^52; bands in stored order (never sorted); `tableHash` (price in **dollars**, raw percents); `bonusHash` (ours); `drawOpen` (free spins at nonce 2+); `verifyOpen`, which checks the seal, table, free-spin table, outcome and each free spin's credits. `boxMaths` is worth × chance, with credit at $1 and a free spin at its table's average. The vectors are the kit's, with MISTY's product names removed. |
| Box API | `web/src/box-api/contract.ts`, `mock-server.ts`, `mock.ts`, `session-host.ts`, `http.ts`, `index.ts` | Their OpenAPI as the front end uses it (13 calls, `BoxApiError`); additions are marked "pending the backend". The mock server is pure functions over the signed-in account's state, and each open stores a copy of its table (`snapshot`). `mock.ts` runs state-changing calls one at a time and doesn't write back after read-only calls. `http.ts` is their server. `index.ts` is the switch. |
| Catalogue | `web/src/data/items.ts`, `data/boxes.ts`, `services/catalog.ts`, `supabase/seed.sql` | 12 free-spin credit items, `credit-N-fs1` and `-fs2` for N in 2, 5, 10, 25, 50 and 100. `defineBox` takes 9 and 2 weight points from each box's commonest credit row for those two rows. It builds a free-spin table (70 / 22 / 6 / 1.8 / 0.2 %, paying 0.1× to 2× the price before free spins, in whole credits, at least 1) and prices at 90% return counting free spins. Grail Reserve has no credit rows, so it has no free spins. `catalogBox` / `boxOutcomes` give the kit's format synchronously (`percent = weight / 1000`, stored = authored order); `outcomeArt` returns local art and never throws. `seed.sql` is regenerated. |
| Storage | `web/src/store/session.ts` (persist v3), `store/ledgers.ts` (v2), `components/layout/session-hydrator.tsx` | `SessionSnapshot` gains `boxApi` (the mock's tables: opens, credit ledger, used pay keys), `pendingOpens` (per box) and `preferredClientSeed`. Migrations fill in defaults. Account switching spreads `freshSnapshot()` first, so no field carries over between accounts. |
| Box page | `components/box/box-stage.tsx`, `use-box-open.ts`, `open-flow.ts`, `guards.ts`, `result-overlay.tsx`, `box-odds.tsx`, `box-analysis.tsx`, `session-counters.tsx`, `how-it-works-strip.tsx`, `inside-grid.tsx`, `odds-at-a-glance.tsx`; `app/boxes/[slug]/page.tsx` | Before paying: the seal, the table hash, "Your seed" and the pay method. The flow (`open-flow.ts`): prepare or resume, then seed → pay → spin, with the pay key saved before paying. `guards.ts`: one action at a time, and only the newest prepare may land. The reveal: shake → lid → the outcome rises out (a sibling over `Box3D`, the hero's pattern) → the neutral `ResultOverlay`, with free spins one after another. Also visit counters, "Box content and odds" with the free-spin table, and Analysis (the maths, how the result was decided, "Check this open", keyed per open). A "Try again" button appears on errors. |
| Elsewhere | `components/layout/site-header.tsx`, `components/account/inventory-view.tsx`, `fairness-panel.tsx`, `app/provably-fair/page.tsx`, `domain/odds.ts` | Credit appears in the header pill. The inventory offers trade-in instead of sell-back, through a shared `tradeInCredits`. The verify page has "Your recent opens" and a verifier that compares the outcome, the free spins and the free-spin table, in the browser and through the API. |
| Back office | `domain/analytics.ts`, `components/admin/boxes-view.tsx` | `boxPerformance` takes `configuredReturn(box)` from `catalogBox` maths. It showed 84.7% for a box priced at 90%, because free spins were valued at credit face only. |
| Formats | `domain/money.ts` | `formatPercent`, `formatExactPercent`, `formatOneIn` and `formatCredit` are new. The old odds formatters are kept for the admin `OddsTable`. |
| Docs, scripts | `web/.env.example`, `web/README.md`, `scripts/e2e_flow.py`, docs 03, 05, 06, 07, 08 and this file | The new switches are documented, the end-to-end script covers the new open flow, and the doc passages made wrong by this change are updated. |

## How an open works now

1. **Load.** The box page calls `prepareOpen`. That resumes the pending open for this box, or calls
   `createOpen`: the server picks a 32-byte secret and returns its seal, the price, `tableHash` and
   `bonusHash`. The page shows them.
2. **Open.** "Open the box" saves a pay key on the pending open, then runs `setClientSeed` (if the
   player typed one), then `pay` (`card` = the demo balance, `credit` = site credit), then `spin`.
   `spin` resolves once, against the open's own table copy; free spins use nonces 2 and 3, and the
   secret is revealed. A piece lands in the inventory. Credit goes to the credit ledger, and free
   spins add a `bonus-award` entry.
3. **Reveal.** Only after the spin response does the box shake (800 ms; 250 ms with Quick open; none
   under reduced motion). Then the lid opens, the outcome rises, and the result overlay appears.
4. **Result.** A piece offers Ship it (a stub that reuses the demo shipping request), "Trade in for $N
   credit" (90% of listed value, whole credits) or "Keep for now". Credit offers Done. Either way, the
   next open is prepared with a new seal.
5. **Reload.** A created open is kept, a paid one is spun to the same result, and a resolved one shows
   its result again. An expired one is replaced quietly; a notice appears only if the player had
   tried to pay.

**Rules the mock server enforces, as their kit specifies:**
- the client seed is 1–64 characters and accepted only while the open is `created` (409 after
  payment);
- with no seed, the published default `grailnoir-default` is used and recorded as
  `server-default`;
- `pay` is idempotent on its key, and 402 when the balance is short, with nothing changed;
- an unpaid open expires after 15 minutes (409);
- `spin` resolves once, and a retry returns the stored result;
- the secret appears only in the spin response, and in `getOpen` after resolution;
- a trade-in happens once per piece (409 after that);
- `verify` and `getTable` look tables up by hash, including the copies pinned on opens.

## Rulings made during the build

These are the calls the implementer made on the user's behalf, each with what it costs if wrong.

1. **Worked on a feature branch in this checkout, with no separate worktree.** The user's dev server
   ran from here. Cost if wrong: half-finished states were visible at localhost:3000 during the
   build.
2. **Added `verifyOpen` to the engine in Task 1.** A later task used it, but the plan left it out.
   Cost: none.
3. **The back office's `boxPerformance` now takes `configuredReturn(box)`.** It showed 84.7% for a
   box priced at 90%. Cost if wrong: one signature to revert.
4. **Added the `traded` inventory status label early,** to keep `tsc` clean. Cost: none.
5. **Moved the open flow out of React into `open-flow.ts`,** with its own tests. Cost: one more file.
6. **Kept the box page's stats row, tagline and "What's inside" grid,** although the kit says the
   header should be "name and price only", because nothing is removed. Cost if wrong: a busier header
   than the kit's.
7. **Put `tradeInCredits` in `domain/odds.ts`,** so the inventory and the mock use one formula. Cost:
   none.
8. **Ran the end-to-end script from a venv with Playwright 1.62,** because the global 1.42 lacks
   `Locator.filter(visible=…)`. Cost: none to the repo.
9. **Documented the new switches** in `.env.example` and the web README. Cost: none.
10. **Left the back office's plays built from inventory** (review finding 2), as the user approved for
    this pass. Cost if wrong: back-office openings, played, earned and actual return are wrong for
    credit and free-spin opens until the next pass.

## Review of the whole branch

A fresh reviewer (Opus) went over `1b0811b..1b76347`: 0 Critical, 6 Important, 9 Minor.

**Fixed, each with a test that failed first:**
1. Opens were bound to the live catalogue. Each open now pins a copy of its table; open-flow and
   mock tests.
2. Analysis's verdict outlived its open. It's now keyed per open; e2e assertion.
3. The checks ignored free spins and the free-spin table, and the verify page compared no outcome.
   Both checks are now complete; engine test.
4. Actions weren't guarded: a double click on "Open again" could show a seal for a different open.
   Fixed with `guards.ts`; tests.
5. The box page's "How it works" strip still said "reel" and "sell it back for 90%". Rewritten; copy
   test.
6. Every return visit after 15 minutes showed a red "expired" notice, which would show in a demo.
   Re-graded from Minor; open-flow test.

**Deferred minor issues (next pass):**
- The mock's write-back doesn't re-check the account during a call's awaits (very rare).
- The inventory trade-in shows no error message and no busy state.
- The reveal tints piece art by rarity, has no running free-spin total and no Skip for the 2–4 s
  sequence. Unknown ids reveal as "Site credit". A resumed result can offer Ship or Trade for a piece
  already handled.
- With `NEXT_PUBLIC_BACKEND=api`, credit, pay-with-credit and recent opens would show empty, because
  the UI reads the mock's storage.
- Odds of 10% and up show 2 decimals, so 37.004% reads 37%; the exact value is in the tooltip.
- Resolved opens, the ledger and pay keys are never pruned, so localStorage fills after about 2,000
  opens.
- Test gaps: the hydrator migration isn't exercised directly, a retry test's bound is loose, removing
  the queue isn't detected, `prepareOpen`'s "paid" branch is untested, and the e2e title check matches
  a substring.
- The header hides credit on phones, and the "Add demo funds" link beside Open is gone; the 402
  notice links to Top up instead.

## Pending the backend (sent to them as an FYI on 2026-10-13)

Until they say otherwise, these defaults stand:

- **Table hash.** Their vector matches only with the price in **dollars** and the **raw** percents.
  Cents don't match, and rounding to 8 decimals (as the README suggests for `numeric(12,8)`) changes
  the hash. So what the database stores must be exactly what gets hashed.
- **`bonusHash`.** The kit has no recipe. Ours is `sha256(canonicalJson({ slug, bonus: [{ credits,
  percent }] }))`.
- **Outcome kinds.** The OpenAPI says `item | credit | bonus`, the sandbox sends free-spin rows as
  `credit` with `freeSpins` set, and the vectors say `oroos`. We use `item | credit | bonus`, where
  bonus means credit plus free spins. The bonus table uses `credits` and `percent`, as in the OpenAPI
  (the vectors say `mistees` and `weight`).
- **Missing fields.** Outcomes have no image, brand or category, so we look photos up locally by
  outcome id. The sandbox's box response lacks `rarity`, `tagline`, `bonusHash` and `maths`.
- **Missing endpoints.**
  - There is no list of a player's awards: `listAwards`, `GET /v1/me/awards`, is our placeholder.
  - There is no list of a player's opens: the verify page reads recent opens locally.
  - There is no shipping endpoint: "Ship it" is a stub.
- **The verifier needs more.** `GET /v1/tables/{hash}` returns only the main table, and verifying free
  spins also needs the open's bonus table. `GET /v1/verify` doesn't compare the outcome or the free
  spins; the browser does.
- **Credit units.** Credits are whole numbers (1 credit = $1 on screen); their $25 and $50 tables
  have fractional amounts. Trade-in pays 90% of listed value; MISTY pays 100%.
- **Catalogue.** Their seed data must be our catalogue, not the MISTY capture.
- **Still open on their side:** who issues the bearer token, and the error body shape. We read a
  `code` field.

## Not done yet (next pass)

- [x] **Back office (done 2026-10-15).** Plays come from `boxApi.opens` (2026-10-14), with what each
  open was paid with ("Paid with" on Box openings). The player page has a CREDIT account row (site
  credit; "Not visible yet" for database players not used in this browser). The box system's trade-ins
  count as trade-ins (`sell_back` money events at $1 a credit; the dashboard says "Traded in"). The
  odds view shows the players' percent, the exact stored value and the weight, plus the bonus-open
  table. Sample players trade in for site credit, spend credit on boxes first and roll their bonus
  opens.
- [x] **Wallet (done 2026-10-15).** `/wallet` lists site credit (balance and every movement) through
  `boxApi.myCredits()`, so it keeps working on their API. The inventory already lists the pieces from
  opens; moving it onto `listAwards` waits for their endpoint (see "When their API is live").
- [x] **Wording (done 2026-10-14, `c3950a3`).** "Trade in", "bonus open" and "draw" on every player
  screen.
- [x] **Admin end-to-end script (2026-10-15).** `scripts/e2e_admin.py` uses the new open flow and
  makes its own throwaway super admin in the test browser, so it runs without a team password.
- [ ] **The deferred minor issues** listed above.
- [ ] **Lighthouse** on https://mysterybox-seven.vercel.app, mobile and desktop (CLAUDE.md performance
  rules).
- [ ] **Trade-in switch (2026-10-14).** The `trade_in_enabled` setting (super admins, Configuration
  page) hides trade-in on every player screen (the team is weighing it against the legal research). If the team drops it, the API should
  refuse `POST /awards/{id}/trade-in` too; until then only the screens hide it. The player-facing words
  are now "bonus open" (not "free spin") and "draw" (not "spin"); the API and code names are unchanged.
- [x] **A logo warning (2026-10-15).** No longer reproduced: the header logo's preload is used on every
  public page. Two other preload warnings were checked: the marble texture was preloaded in the back
  office, which never shows it (fixed in `lib/theme.ts`), and on `/inventory` and `/sign-in` Next
  prefetches the Boxes page's stylesheet for the header link (harmless, left as is).
- [ ] **When their API is live:**
  - set `NEXT_PUBLIC_BACKEND=api`;
  - provide the bearer token;
  - point the prebuilt pages (landing, box list, box page layout) at the API rather than our local
    catalogue;
  - replace the UI's direct reads of the mock's storage (header credit, recent opens, pay-with-credit
    balance).

## How to check it

From `web/`:

```bash
npx vitest run                 # 190 tests, all green on e03ecb3 (engine vectors, mock lifecycle, open flow, guards, catalogue, formats)
npx tsc --noEmit && npx eslint # both clean
npx next build                 # 45 of 45 pages prerendered
npx next start -p 3210         # then, from the repo root, the end-to-end flow:
```

```bash
# The global Python Playwright here is 1.42, too old for the script (it needs 1.51+). Use a venv:
python -m venv <scratch>/pwvenv
<scratch>/pwvenv/Scripts/python -m pip install playwright==1.62.0   # uses the installed chromium-1234
<scratch>/pwvenv/Scripts/python scripts/e2e_flow.py http://localhost:3210 <out_dir>
```

It covers, at 1440×900 and 390×844:
- the age gate, registration, and the seal shown before paying;
- a full open with frames at the shake and the rise, then trade-in or Done;
- a quick open, and Analysis "Check this open" (including that a verdict clears on the next open);
- the inventory's ship, cancel and trade-in;
- the wallet top-up;
- the verify page reproducing the first open and agreeing with the API.

The console should show only its two deliberate 404s, plus the logo preload warning above.

**Where the data lives:** the browser's localStorage. `mock-session` (v3) is the signed-in account,
with its `boxApi` tables, and `grailnoir-ledgers` (v2) holds every account in this browser. The
secret sits there before the spin; that is inherent to a browser mock and disclosed on
`/provably-fair`.

## Environment notes

These were checked on 2026-10-13 on the shared machine.

- **Deploying.** A push to `main` deploys to Vercel production, team `optinet-solutions-ais-andbox`,
  project `mysterybox`. `main` has no branch protection.
  - Public URL: **https://mysterybox-seven.vercel.app**.
  - Per-deployment URLs and the team alias `mysterybox-optinet-solutions-ais-andbox.vercel.app`
    redirect to the Vercel login.
- **GitHub.** Pushes go through the shared account `optinet-solutions-sandbx` (Git Credential
  Manager), and local commits are authored "Optinet Sandbox".
- **Vercel CLI.** On that machine it is logged in as `ivanapexai`, whose only team is "Flint", so it
  can't deploy this project.
- **Branch.** `feat/box-api-showcase` is kept at `e03ecb3`, the same commit as the code on `main`. It
  is safe to delete.
