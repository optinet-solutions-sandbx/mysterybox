# Box API showcase: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** make the box system run the backend developer's logic (kit v1.0) end to end on a browser
mock of their API, without removing anything from the site.

**Architecture:**
- **Engine:** a pure engine (`web/src/engine`) ports their recipe onto Web Crypto.
- **API layer:** a typed contract (`web/src/box-api/contract.ts`) with two implementations, chosen
  by `NEXT_PUBLIC_BACKEND`.
  - The **mock** is pure server functions over each account's `SessionSnapshot`, behind a serialising
    wrapper.
  - The **http** client is a thin `fetch` client.
- **Catalogue:** our catalogue gains free-spin rows and per-box free-spin tables. A synchronous
  converter turns it into their outcome format, so pages still prerender.
- **Box page:** it drives create, seed, pay and spin through the API, then plays the reveal.

**Tech stack:** Next 16.4 (App Router, Cache Components), React 19.3, TypeScript strict, Zustand 5,
Motion 14, Vitest 5, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-10-13-box-api-showcase-design.md`

## Global constraints

- **Their recipe, exactly:**
  - `key = "DRAW-" + slug + "-" + serverSeed + "-" + clientSeed + "-" + nonce`;
  - `digest = HMAC-SHA256(key, "")`, in hex;
  - `roll = parseInt(digest.slice(0, 13), 16) / 2 ** 52`;
  - the bands follow the stored order and are never sorted.
- **Table hash:** `sha256(canonicalJson({ slug, price, table: [{ id, percent }] }))`, with the price
  in **dollars** and the keys sorted.
- **Money:** integer cents. Site credit is in whole credits, 1 credit = $1 on screen.
- **Odds:** percents with a sum of 100 ± 1e-6. They are displayed without "<0.01%" and never as "0%".
  1 in N = `Math.round(100 / percent)`.
- **Secrets:** a server seed never reaches the UI before the spin response.
- **Pay:** one idempotency key per pay attempt, reused on retry.
- **Copy:** no "win", "winner", "profit", "guaranteed" or "jackpot". Wherever credit appears, say it
  "buys boxes and can't be withdrawn".
- **Styling:** tokens only. Every effect needs a reduced-motion path. Never put opacity, filter or
  overflow on a `preserve-3d` container. Use the ease `[0.22, 1, 0.36, 1]`.
- **Commands:**
  - run from `web/`: `npx vitest run`, `npx tsc --noEmit`, `npx eslint`, `npx next build`;
  - run from the repo root: `python scripts/e2e_flow.py http://localhost:3210 <out>`.

## Review focus

1. **Double click on Open:** it must never create two payments. The button is disabled while a flow
   runs, and the mock serialises calls. Test: two concurrent `pay` calls with the same key charge once.
2. **Reload mid-open:** a `paid` but unspun open must resolve to the same result as before the reload,
   never a new roll. Test: calling `spin` twice returns an identical record.
3. **The prepared open expires (15 minutes):** it is replaced by a fresh one with a new seal, with no
   charge. Test: `getOpen` after expiry returns `expired`, and `pay` returns 409.
4. **Switching accounts:** must never carry one account's credit into another. Test: hydrating with a
   snapshot that has no `boxApi` field gives an empty ledger.
5. **Not enough USD for a card payment:** gives a 402 and a top-up hint, and no state changes. Test:
   `pay` with a short balance throws 402 and leaves the balance and opens unchanged.

---

### Task 1: Engine (their recipe) and test vectors

**Files:**
- Create `web/src/engine/draw.ts`, `web/src/engine/maths.ts` and `web/src/engine/test-vectors.json`
  (copied from the kit with the `label`/`outcomeLabel` fields removed).
- Test: `web/src/engine/draw.test.ts`.

**Interfaces:**
- Consumes `sha256Hex` and `hmacSha256Hex` from `@/domain/fair` (Web Crypto).
- Produces:

  ```ts
  export const DEFAULT_CLIENT_SEED = "grailnoir-default";
  export function canonicalJson(v: unknown): string;
  export function drawKey(slug: string, serverSeed: string, clientSeed: string, nonce: number): string;
  export function digestOf(slug: string, serverSeed: string, clientSeed: string, nonce: number): Promise<string>;
  export function rollOf(digest: string): number;                       // [0, 1)
  export interface Band<T> { entry: T; from: number; to: number }        // percent line 0..total
  export function bands<T extends { percent: number }>(rows: T[]): Band<T>[];
  export function resolve<T extends { percent: number }>(rows: T[], roll: number): T;
  export function tableHash(slug: string, priceDollars: number, table: { id: string; percent: number }[]): Promise<string>;
  export function bonusHash(slug: string, bonus: { credits: number; percent: number }[]): Promise<string>;
  export interface BonusSpinResult { nonce: number; digest: string; roll: number; credits: number }
  export function drawOpen<O extends { id: string; percent: number; freeSpins: number }>(a: {
    slug: string; serverSeed: string; clientSeed: string; outcomes: O[]; bonus: { credits: number; percent: number }[];
  }): Promise<{ digest: string; roll: number; outcome: O; bonusSpins: BonusSpinResult[] }>;
  ```

- `maths.ts`:

  ```ts
  export interface MathsRow { id: string; label: string; kind: "item" | "credit" | "bonus"; percent: number; worthCents: number; costCents: number }
  export interface BoxMaths { pItem: number; evItemsCents: number; evCredits: number; bonusEvCredits: number; payFaceCents: number; returnFace: number; rows: MathsRow[] }
  export function bonusEv(bonus: { credits: number; percent: number }[]): number; // credits per free spin
  export function boxMaths(o: { priceCents: number; outcomes: { id: string; label: string; kind: "item" | "credit" | "bonus"; credits: number; freeSpins: number; valueCents: number | null; percent: number }[]; bonus: { credits: number; percent: number }[] }): BoxMaths;
  ```

- [ ] **Step 1: Copy the vectors fixture (labels stripped)**

  ```bash
  node -e "const f=require('fs');const t=JSON.parse(f.readFileSync(process.argv[1]));for(const e of t.box.entries)delete e.label;for(const v of t.vectors)for(const s of v.spins)delete s.outcomeLabel;delete t.fullOpen.spin.label;f.writeFileSync(process.argv[2],JSON.stringify(t,null,2)+'\n')" "<scratchpad>/mys-sim-kit-zip/extracted/misty-backend-kit/test-vectors.json" web/src/engine/test-vectors.json
  ```

- [ ] **Step 2: Write the failing test** (`draw.test.ts`). It covers:
  - for every vector, every spin: `drawKey`, `digestOf`, `rollOf`, and `resolve(entries, roll).id === outcomeId`;
  - `resolve(bonus mapped to {credits: mistees, percent: weight}, roll).credits === bonusIfFreeSpin`;
  - `await sha256Hex(serverSeed) === serverHash`;
  - `tableHash("timepiece-suite", 10, entries)` equals `box.tableHash`;
  - `fullOpen`: the digest and the outcome;
  - `bands` (the first band starts at 0 and the last ends at the total), and `resolve` skipping
    `percent <= 0`;
  - `boxMaths` on a hand-made 3-row box: price $10, a $400 piece at 1%, a $50 piece at 4%, 2 credits
    at 95%, so `payFaceCents === 790` and `returnFace === 0.79`, plus a free-spin row adding
    `freeSpins × bonusEv`.
- [ ] **Step 3:** `npx vitest run src/engine`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement `draw.ts` and `maths.ts`**, per the kit's code in the spec.
  - `resolve` uses `pos = roll × total`, takes the first band with `pos < acc`, and falls back to the
    last row.
  - `drawOpen` runs `nonce 1`, then `nonce 2..1 + min(outcome.freeSpins, 3)` against the bonus rows.
  - In `boxMaths`:
    - items: `worth = valueCents`;
    - credit and bonus rows: `worth = (credits + freeSpins × bonusEv) × 100`;
    - `cost = worth × percent / 100`;
    - `pItem` = the sum of item percents / 100;
    - `returnFace = payFaceCents / priceCents`.
- [ ] **Step 5:** `npx vitest run src/engine`. Expected: PASS (81 or more checks).
- [ ] **Step 6:** commit with `feat(engine): port the backend kit's draw recipe with test vectors`.

### Task 2: Catalogue in their format (free spins, tables, conversion)

**Files:**
- Modify:
  - `web/src/domain/types.ts`: `Item.freeSpins?: number`; `Box.bonus?: BonusRow[]`; `InventoryStatus`
    gains `"traded"`; `InventoryItem.openId?: string`.
  - `web/src/data/items.ts`: 12 free-spin credit items.
  - `web/src/data/boxes.ts`: `defineBox` carves the free-spin rows, builds `bonus` and prices with
    the bonus EV.
  - `web/src/services/catalog.ts`: `boxStats` uses `boxMaths`; add `boxOutcomes`, `apiBox` and
    `outcomeArt`.
- Test: `web/src/services/catalog.test.ts` (extended).
- Regenerate: `supabase/seed.sql`.

**Interfaces:**
- Consumes `boxMaths` and `bonusEv` from Task 1.
- Produces, in `services/catalog.ts`:

  ```ts
  export type OutcomeKind = "item" | "credit" | "bonus";
  export interface CatalogOutcome { id: string; label: string; rarity: Rarity; kind: OutcomeKind; credits: number; freeSpins: number; valueCents: number | null; percent: number }
  export interface CatalogBox { slug: string; name: string; tagline: string; priceCents: number; outcomes: CatalogOutcome[]; bonus: { credits: number; percent: number }[]; maths: BoxMaths }
  export function boxOutcomes(box: Box): CatalogOutcome[];   // stored = authored order; percent = weight / 1000
  export function catalogBox(box: Box): CatalogBox;          // synchronous, prerender-safe
  export function outcomeArt(id: string): Item;              // local photo/drawing lookup, never throws (fallback coin)
  ```

- [ ] **Step 1: Extend the failing tests** in `catalog.test.ts`. For each box:
  - Σ outcome percent is within 1e-6 of 100;
  - when present, the bonus percents sum to 100;
  - each `bonus` row has `credits >= 1`;
  - every box that has credit rows (all except `grail-reserve`) has exactly one `freeSpins: 1` row
    and one `freeSpins: 2` row, and `grail-reserve` has none;
  - `catalogBox(box).maths.returnFace` is in `(0.85, 0.9]`;
  - `boxStats(box).rtp === catalogBox(box).maths.returnFace`;
  - outcome ids are unique per box;
  - `outcomeArt("nope")` returns a credit coin item and doesn't throw.
- [ ] **Step 2:** `npx vitest run src/services`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Items:** `credit-N-fs1` is "$N Site Credit + Free Spin" and `credit-N-fs2` is
    "$N Site Credit + 2 Free Spins", for N in 2, 5, 10, 25, 50, 100. Each has `category: "credit"`,
    `value` = N×100 and `freeSpins` 1 or 2.
  - **`defineBox`:**
    - find the credit row with the highest authored weight, take 9 and 2 points from it, and insert
      `credit-N-fs1` and `credit-N-fs2` straight after it;
    - normalise;
    - `prePrice = priceForRtp(EV without bonus)`;
    - `bonus = [0.1, 0.2, 0.5, 1, 2].map((f, i) => ({ credits: Math.max(1, Math.round(prePrice / 100 * f)), percent: [70, 22, 6, 1.8, 0.2][i] }))`;
    - `price = priceForRtp(EV with bonus)`, where a free-spin row's value is
      `value + freeSpins × bonusEv × 100`.
  - **Conversion in `catalog.ts`:**
    - kind is `item` unless the category is `credit`, in which case it is `bonus` when `freeSpins`
      is set and `credit` otherwise;
    - `credits = value / 100` for credit rows, otherwise 0;
    - `valueCents` is null for credit rows;
    - `label` is the item name for credit rows, otherwise `brand + " " + name`.
- [ ] **Step 4:** `npx vitest run`. Expected: PASS, including `catalog-seed` after
  `WRITE_SEED=1 npx vitest run src/backend/catalog-seed.test.ts`. The `schema.test.ts` publish check
  still sums to 100,000.
- [ ] **Step 5:** commit with `feat(catalog): free-spin rows, per-box free-spin tables, outcome conversion`.

### Task 3: Box API contract and mock server (with session storage)

**Files:**
- Create:
  - `web/src/box-api/contract.ts`;
  - `web/src/box-api/mock-server.ts` (pure);
  - `web/src/box-api/mock.ts` (wires to `useSession`, serialised);
  - `web/src/box-api/http.ts`;
  - `web/src/box-api/index.ts`.
- Modify:
  - `web/src/store/session.ts`: `SessionSnapshot` gains `boxApi: MockState`, `pendingOpen` and
    `preferredClientSeed`; persist goes to v3 with a migrate; `freshSnapshot` and `snapshotOf`
    include the new fields.
  - `web/src/store/ledgers.ts`: v2, with a migrate that fills the defaults.
  - `web/src/components/layout/session-hydrator.tsx`: `setState({ ...freshSnapshot(), ...stored })`.
- Test: `web/src/box-api/mock-server.test.ts`.

**Interfaces:**
- `contract.ts`:
  - `Outcome = CatalogOutcome`;
  - `ApiBox = CatalogBox & { tableHash: string; bonusHash: string }`;
  - `OpenCommitted { openId, boxSlug, status: "created" | "paid" | "expired", priceCents, serverHash, tableHash, bonusHash, nonce: 1, clientSeed: string | null, expiresAt }`;
  - `OpenResolved = OpenCommitted & { status: "resolved"; serverSeed; digest; roll; outcome: Outcome; bonusSpins: BonusSpinResult[]; creditsAwarded: number; itemAward: { awardId: string; valueCents: number; tradeInCredits: number } | null; verifyUrl: string }`;
  - `Open = OpenCommitted | OpenResolved`;
  - `LedgerEntry { id: number; delta: number; reason: "box-award" | "bonus-award" | "trade-in" | "box-payment"; refType: string | null; refId: string | null; createdAt: string }`;
  - `VerifyResult { ok, serverHash, digest, roll, outcomeId, bonusSpins, reason: string | null }`;
  - `TableSnapshot { boxSlug, version: 1, tableHash, priceCents, entries: { id, percent }[] }`;
  - `class BoxApiError extends Error { status: 401 | 402 | 404 | 409 | 422; code: string }`;
  - `interface BoxApi { listBoxes(); getBox(slug); createOpen(boxSlug); setClientSeed(openId, seed); pay(openId, { method: "card" | "credit"; idempotencyKey: string; paymentToken?: string }); spin(openId); getOpen(openId); tradeIn(awardId); myCredits(); verify(q); getTable(hash); tableLog(); listAwards() }`.
    `listAwards` is marked pending the backend.
- `mock-server.ts`:
  - `MockState { opens: StoredOpen[]; ledger: LedgerEntry[]; payKeys: Record<string, string>; nextLedgerId: number }`;
  - `MockWorld { now: number; accountId: string | null; usd: number; transactions: Transaction[]; inventory: InventoryItem[]; box: MockState }`;
  - every operation is `op(world, args, deps: { randomHex(n): string }) => Promise<{ world: MockWorld; result }>`.
- `index.ts`: `export const boxApi: BoxApi` (mock unless `process.env.NEXT_PUBLIC_BACKEND === "api"`).

- [ ] **Step 1: Write the failing tests** (`mock-server.test.ts`) against pure ops with a fake world.
  1. **Create:** returns `status "created"` and a `serverHash` equal to `sha256(seed)`; the seed
     appears nowhere in the result; `expiresAt = now + 15 min`.
  2. **Client seed:**
     - `setClientSeed` works while `created`;
     - it throws 409 after `pay`;
     - it throws 422 for `""` or 65 characters.
  3. **Pay by card:**
     - debits `usd` by the price and adds a `box_open` transaction;
     - the same key twice charges once (Review focus 1);
     - a short balance throws 402 and leaves the world unchanged (Review focus 5);
     - an expired open throws 409 (Review focus 3).
  4. **Pay with credit:** debits the ledger and keeps the balance at 0 or more. Short credit throws
     402.
  5. **Spin:**
     - throws 409 when not paid;
     - when paid, resolves with `serverSeed`, matches `drawOpen` exactly, and fills in
       `clientSeedSource` / `DEFAULT_CLIENT_SEED` when unset;
     - an item outcome adds an `InventoryItem` with the `openId`, plus an `itemAward` with
       `tradeInCredits = floor(value × 0.9 / 100)`;
     - a credit or bonus outcome adds `box-award` / `bonus-award` ledger entries summing to
       `creditsAwarded`;
     - a second spin returns the identical record (Review focus 2).
  6. **`getOpen`:** has no `serverSeed` before the spin and has it after.
  7. **Trade-in:**
     - credits the ledger and sets the inventory status to `"traded"`;
     - a second time throws 409;
     - also works on a legacy item with no `openId`.
  8. **Verify:**
     - returns `ok: true` for a resolved open;
     - returns `ok: false` with a reason for a tampered seed or a wrong `serverHash`.
  9. **Hydrator default:** `freshSnapshot().boxApi.ledger` is empty, and `{ ...freshSnapshot(), ...legacySnapshot }`
     has `boxApi` defined (Review focus 4).
- [ ] **Step 2:** `npx vitest run src/box-api`. Expected: FAIL.
- [ ] **Step 3: Implement the contract, `mock-server`, the store changes, `mock.ts` and `http.ts`.**
  - **`mock.ts`:**
    - reads `useSession.getState()` and `useAuth.getState()` (the current account id);
    - runs the op and writes back `balance`, `transactions`, `inventory` and `boxApi`;
    - calls are serialised through one promise chain;
    - adds a 120–250 ms simulated latency (0 in tests).
  - **`http.ts`:** `fetch(NEXT_PUBLIC_BOX_API_URL + "/v1" + path)` with JSON. A non-2xx response
    becomes `BoxApiError(status, body.code ?? "http_" + status)`.
- [ ] **Step 4:** `npx vitest run`. Expected: PASS (all suites).
- [ ] **Step 5:** commit with `feat(box-api): contract, in-browser mock server, per-account storage`.

### Task 4: Odds and credit formatters

**Files:**
- Modify: `web/src/domain/money.ts`.
- Test: `web/src/domain/money.test.ts`.
- Produces:

  ```ts
  formatPercent(pct)       // ≥10 → toFixed(2) trimmed; >0 → toPrecision(3) trimmed; 0 → "0%"
  formatExactPercent(pct)  // up to 8 decimals, trimmed
  formatOneIn(pct)         // "1 in 24,691"
  formatCredit(credits)    // "$12 credit"
  ```

- [ ] **Step 1: Write the failing tests:**
  - `formatPercent(0.00405)` is `"0.00405%"`; `(30.83042)` is `"30.83%"`; `(9)` is `"9%"`;
    `(0.0154)` is `"0.0154%"`;
  - `formatOneIn(0.00405)` is `"1 in 24,691"`; `formatOneIn(30.83)` is `"1 in 3"`;
  - `formatExactPercent(0.015365)` is `"0.015365%"`;
  - `formatCredit(12)` is `"$12 credit"`.
- [ ] **Step 2:** run. Expected: FAIL.
- [ ] **Step 3:** implement.
- [ ] **Step 4:** run. Expected: PASS.
- [ ] **Step 5:** commit with `feat(money): percent, 1-in-N and credit formatters`.

### Task 5: Box page on the API (stage, reveal, result, counters, odds, analysis)

**Files:**
- Create:
  - `web/src/components/box/use-box-open.ts` (the flow: prepare, resume, open, idempotency);
  - `web/src/components/box/result-overlay.tsx` (a neutral reveal with free spins and kind actions);
  - `web/src/components/box/box-odds.tsx` ("Box content and odds" plus the free-spin table);
  - `web/src/components/box/box-analysis.tsx` (three `<details>` sections);
  - `web/src/components/box/session-counters.tsx`.
- Modify:
  - `web/src/components/box/box-stage.tsx`: uses `useBoxOpen`; rise-out sibling over `Box3D`; the
    reel is idle-only (`spin` stays `null`);
  - `web/src/app/boxes/[slug]/page.tsx`: passes `catalogBox(box)`; renders `BoxOdds` (replacing
    `OddsTable` on this page only) and `BoxAnalysis`;
  - `web/src/components/box/inside-grid.tsx`: `formatPercent`.
- **Interfaces:**
  - `useBoxOpen(slug)` returns `{ phase: "loading" | "ready" | "working" | "revealing" | "result" | "error"; open: OpenCommitted | null; result: OpenResolved | null; credit: number; error: string | null; seed: string; setSeed(s); start(method); dismiss(); history: OpenResolved[] }`.
  - `start()`:
    - disables itself while working;
    - calls `setClientSeed` if `seed` is set, then `pay({ method, idempotencyKey })` with a key stored
      on the pending open and reused on retry, then `spin`;
    - after the result, it prepares the next open.
  - On mount, the pending open for this slug is read and continues from its status (`created` →
    ready; `paid` → spin; `resolved` → result; `expired` → message plus a fresh open).
  - Reveal timings: shake 800 ms (250 ms quick, 0 reduced) → the lid opens → the piece rises
    (the hero pattern, 120/17 spring) → the overlay appears. Free spins reveal every 600 ms (200 ms
    quick, 0 reduced).
- [ ] **Step 1:** implement `use-box-open.ts` over `boxApi`, with the error copy for 402 ("Not enough
  demo balance. Top up or pay with credit."), 409 (reload the open, then continue) and expired
  ("This open expired before payment. A new one is ready.").
- [ ] **Step 2:** `result-overlay.tsx`.
  - It uses the same neutral tone for every outcome, with no rarity flash. It keeps `#reveal-title`
    and `role="dialog"`.
  - A piece gets "Ship it" (`requestShipping(uid)` stub), "Trade in for $N credit" (`tradeIn`),
    "Keep for now" and "Open again".
  - Credit gets "Done" and "Open again".
  - It shows "Site credit buys boxes and can't be withdrawn."
- [ ] **Step 3:** `box-odds.tsx`.
  - Columns are Outcome, Value, Odds and 1 in. Rows sort by percent ascending. Names are truncated
    with a `title` showing the full name, value and odds. There is no horizontal scroll at 360 px
    (the columns collapse under `sm`).
  - Below it, a "What a free spin pays" list.
- [ ] **Step 4:** `session-counters.tsx`: Opens, Paid, Credit received, Pieces, Return (value back ÷
  paid; "—" before the first open).
- [ ] **Step 5:** `box-analysis.tsx`. It renders only after the first open, and only when
  `NEXT_PUBLIC_SHOW_ANALYSIS !== "off"`.
  - (a) The maths: rows of worth × chance = cost, a total, the price and the difference.
  - (b) How it was decided: plain steps for the last open.
  - (c) Was it fair: two lines, a "Check this open" button that runs local `verifyOpen` together with
    `boxApi.verify` and shows "Matches" / "Doesn't match", and technical values inside a `<details>`.
- [ ] **Step 6:** wire `box-stage.tsx`.
  - The header shows the name and price (the tagline stays). Under the button it shows the seal
    ("Seal" plus `serverHash.slice(0, 12)…` and the table hash) and the "Your seed" input.
  - The pay method toggle appears when the credit balance is at least the price.
  - Run `npx tsc --noEmit` and `npx eslint`. Expected: clean.
- [ ] **Step 7:** commit with `feat(box): open flow on the box API, neutral reveal with free spins, odds and analysis`.

### Task 6: Header credit, inventory trade-in, verify page

**Files:**
- Modify:
  - `web/src/components/layout/site-header.tsx`: `BalancePill` adds the site credit;
  - `web/src/components/account/inventory-view.tsx`: "Sell back" becomes "Trade in · $N credit"
    (`boxApi.tradeIn(uid)`); the "traded" status sits in the Sold tab, labelled "Traded in";
  - `web/src/components/account/fairness-panel.tsx`: "Your recent opens" plus the new verifier;
  - `web/src/app/provably-fair/page.tsx`: the steps text for the new recipe.
- [ ] **Step 1:** the header pill shows `formatUsd(balance)` plus `formatCredit(credit)` when the
  credit is above 0. The credit comes from the sum of `boxApi.ledger`.
- [ ] **Step 2:** inventory trade-in, with the rate shown: "Trades in at 90% of listed value, as site
  credit that buys boxes and can't be withdrawn."
- [ ] **Step 3:** the verifier.
  - Inputs: box (select), secret (server seed), your seed, table hash.
  - Values are prefilled from `?slug&serverSeed&clientSeed&tableHash`, read from
    `window.location.search` after mount, or from a recent open's "Check" button.
  - It shows the hash of the secret, the roll, the band, the outcome and the free spins, computed
    locally and by `boxApi.verify`, plus "Matches the API".
- [ ] **Step 4:** run `npx tsc --noEmit`, `npx eslint` and `npx vitest run`. Expected: clean.
- [ ] **Step 5:** commit with `feat: credit in header, trade-in in inventory, verifier on the kit recipe`.

### Task 7: End-to-end script and full verification

**Files:**
- Modify `scripts/e2e_flow.py`:
  - opening waits for `^Open the box`; the reveal is `#reveal-title`;
  - full open, then trade-in (`^Trade in for`), then quick open, then "Keep for now";
  - the inventory section drops the credit-shipping assertion, and the injected inventory item keeps
    the `InventoryItem` shape;
  - provably fair: "Your recent opens" → the first "Check" → assert "Matches the API" and that the
    outcome equals the first opening's title.
- [ ] **Step 1:** update the script.
- [ ] **Step 2:** in `web/`, run `npx vitest run && npx tsc --noEmit && npx eslint && npx next build`.
  Expected: all clean, and every route prerenders.
- [ ] **Step 3:** run `npx next start -p 3210` (in the background), then
  `python scripts/e2e_flow.py http://localhost:3210 <scratchpad>/e2e`. Expected: passes at
  1440×900 and 390×844. The only console errors are the 2 deliberate 404s.
- [ ] **Step 4:** capture and view frames: box idle with the seal, the shake, the lid open with the
  piece rising, the result overlay (piece and credit), and the free-spin sequence when one occurs.
  Check light and dark.
- [ ] **Step 5:** commit with `test(e2e): flow script on the new open; verification`.
