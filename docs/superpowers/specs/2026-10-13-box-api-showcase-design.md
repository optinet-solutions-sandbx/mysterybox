# Box API showcase: design

2026-10-13. Status: approved in conversation; this is the written spec.

## Goal

The mystery box system runs the backend developer's logic end to end in a showcase. That logic is
the "Misty-style" kit v1.0 of 13 October 2026, with reference pages at
https://mys-sim.vercel.app/docs/misty and /docs/misty/dev, plus `openapi.yaml` and
`test-vectors.json`.

The showcase runs against a browser mock that follows their API contract, so it can switch to their
API later. Nothing on the site is removed.

## Architecture

- **`web/src/engine/`** is a pure port of their recipe, using Web Crypto. It has no I/O.
  - `commit(seed) = sha256Hex(seed)`.
  - `digest = HMAC-SHA256(key = "DRAW-<slug>-<serverSeed>-<clientSeed>-<nonce>", message "")`.
  - `rollOf = parseInt(digest[0:13], 16) / 2^52`.
  - `resolve` walks the bands in stored order and never sorts. `resolveBonus` does the same for the
    free-spin table.
  - `tableHash`, `bonusHash`, `boxMaths` and `verifyOpen` complete the module.
  - **Test:** every check in their vectors (81 of them), from `engine/test-vectors.json`. That file is
    copied from the kit with MISTY's product names removed.
- **`web/src/box-api/contract.ts`** holds their OpenAPI shapes, the `BoxApi` interface (their 12
  player and public calls) and `BoxApiError { status, code }`.
  - These additions are marked as pending the backend: an optional `Outcome.imageUrl`, and
    `listAwards()`, because no endpoint in their contract lists a player's awards.
- **Implementations:**
  - `box-api/mock.ts` is the in-browser server.
  - `box-api/http.ts` is a fetch client for `NEXT_PUBLIC_BOX_API_URL` + `/v1`.
  - `box-api/index.ts` chooses between them on `NEXT_PUBLIC_BACKEND`: `mock` (the default) or `api`.
- **Mock server rules**
  - **Create:** the secret is 32 CSPRNG bytes as hex, and only its SHA-256 is shown. The price,
    `tableHash` and `bonusHash` are pinned at creation. An unpaid open expires after 15 minutes.
  - **Client seed:** 1 to 64 characters, accepted only while the open is `created`; after that the call
    returns 409. If the player never sets one, the server uses the published default
    `grailnoir-default` and records `clientSeedSource: "server-default"`.
  - **Pay:** idempotent on its key. `card` debits the demo USD balance and adds a `box_open`
    transaction. `credit` debits site credit. Either returns 402 when the balance is short.
  - **Spin:** happens once; a retry returns the stored result. It resolves against the pinned snapshot.
    Free spins use nonces 2 and up, with a maximum depth of 1. The award or credit is written in the
    same state update.
  - **Secret:** it appears only in the spin response, and in `getOpen` after the open is resolved.
  - **Trade-in:** at most once per award; a second attempt returns 409.
- **Data:** the signed-in mock account is the bearer. Each account's opens, credit ledger and awards
  live in its `SessionSnapshot`. Swapping accounts fills missing fields from defaults, so no value
  carries over from one account to another. Persist versions are bumped, and existing demo data is
  kept.

## Catalogue

- **Source:** `data/items.ts` and `data/boxes.ts` stay the source of truth.
- **Free spins:**
  - New credit items carry `freeSpins` (1 or 2): "$N Site Credit + Free Spin" and
    "+ 2 Free Spins".
  - Every box that has credit rows gets these two rows. They are carved out of its most common credit
    row, taking 9 and 2 of the relative weight points authored in `boxes.ts` (before normalising to
    100,000).
  - Each such box also gets a free-spin table at 70 / 22 / 6 / 1.8 / 0.2 %, paying 0.1×, 0.2×, 0.5×,
    1× and 2× the box price, rounded to whole credits with a minimum of 1. The price used here is the
    one computed before free spins.
  - Grail Reserve has no credit rows, so it gets no free spins.
- **Conversion:** a pure, synchronous function, so pages still prerender. Each entry becomes an outcome:
  `{ id: itemId, label, rarity, kind: item | credit | bonus, credits, freeSpins, valueCents (null for credit), percent: weight / 1000 }`.
  Stored order is the authored order. One credit counts as $1.
- **Price:** `defineBox` keeps a 90% return and counts free spins at their expected value.
  `boxStats` uses the same maths, so the "average return" shown is the number the draw uses.
- **Hashes:**
  - `tableHash = sha256(canonicalJson({ slug, price, table: [{ id, percent }] }))` with the price in
    dollars. Their vectors match only with dollars, not cents.
  - `bonusHash = sha256(canonicalJson({ slug, bonus }))` is our own placeholder until the backend
    defines theirs.
- **Presentation:** the photo, drawing, box finish and category are looked up locally by id or slug.
  An unknown id falls back to a drawing and never throws.
- **Supabase seed:** `supabase/seed.sql` is regenerated (rule 12). The free-spin rows appear in it as
  credit items.

## Box page

- **Before paying:** the secret's fingerprint (`serverHash`), the table hash, and an optional
  "Your seed" field, remembered per account.
- **The Open button:** "Open the box · $X" runs create, then seed, then pay, then spin.
  - It is disabled while a request is in flight.
  - Each pay attempt has one idempotency key, reused on retry.
  - After a reload, `GET /opens/{id}` resumes the open from its status:
    - `created`: continue, or start over;
    - `paid`: spin;
    - `resolved`: show the result;
    - `expired`: show a message and offer a new open.
  - No second open is ever created silently.
- **Reveal:** it starts only after the spin response arrives.
  - The box shakes (800 ms, 250 ms with Quick open, none under reduced motion), the lid opens, and the
    outcome rises out of the box. The outcome is a sibling element drawn over `Box3D`, the same pattern
    the hero uses.
  - Then the result overlay appears, with the same neutral treatment for every outcome and no rarity
    flash. Free spins reveal one after another, with a running credit total.
  - **For a piece:**
    - "Ship it" reuses today's shipping request, so it stays a stub;
    - "Trade in for $N credit" pays 90% of the listed value, rounded down to whole credits (1 credit =
      $1), and the rate is shown;
    - "Keep for now".
  - **For credit:** "Done" and "Open again".
- **The reel:** no longer spins during an open. It stays on the page as the idle "what's inside"
  strip.
- **Session counters:** cover this visit to this box: Opens, Paid, Credit received, Pieces, and Return
  (value back ÷ paid, explained in a tooltip).
- **"Box content and odds" table:** columns are Outcome, Value, Odds and 1 in.
  - Rows run rarest first, and the whole table shows with no scrollbar. Long names are cut with an
    ellipsis and have a tooltip.
  - Odds are shown exactly as given, with enough decimals (0.004%), never "<0.01%". 1 in N is
    100 ÷ percent, rounded.
  - The free-spin table sits below it.
- **Analysis:** appears after the first open, as collapsed sections. It is on by default and can be
  hidden with `NEXT_PUBLIC_SHOW_ANALYSIS=off`. It has three parts:
  - the maths of this box;
  - how this result was decided;
  - was it fair: what the check proves and what it does not, a "Check this open" button that
    recomputes in the browser and through the API, and the technical values behind a details toggle.
- **Copy:** follows `docs/07-compliance-ux.md`, so no "win". Wherever credit appears, the page says it
  buys boxes and can't be withdrawn. "Free spin" matches the backend's term and goes to counsel review
  later.

## Elsewhere in the showcase

- **Header:** a site credit pill next to the demo balance.
- **`/provably-fair`:**
  - The verifier takes the slug, the secret, your seed and the table hash, prefilled from an open. It
    recomputes in the browser and through the API.
  - The seed-rotation panel is replaced by "Your recent opens", each with its revealed secret.
- **Inventory:**
  - New pieces still land there as today, so the back office keeps counting them.
  - Its "Sell back" action becomes "Trade in for credit", which credits the same ledger.

## Not in the showcase (next pass)

- Back office: credit and free-spin metrics, and the odds page in percent.
- Demo players drawing on the percent tables.
- The wallet's credit-ledger page, and an inventory view of awards.
- The sell-back to trade-in wording on the landing page, FAQ and legal pages.
- Docs and the `CLAUDE.md` rules (5, 7, 11, 12).
- `scripts/e2e_admin.py`.

## Testing and checks

- **Vitest:**
  - the engine against their vectors;
  - the mock lifecycle: created, paid, resolved and expired; the seed rules; idempotency; 402 and 409;
    the secret absent before the spin;
  - the catalogue: every table sums to 100 ± 1e-6, every free-spin table sums to 100, the return stays
    in its band, and ids are stable;
  - the odds formatters.
- **Static checks:** `tsc`, `eslint` and `next build` must be clean.
- **End to end:** update `scripts/e2e_flow.py` for the new open (full and quick, trade-in, and verify
  reproducing the first open), then run it at 1440 and 390.
- **Visual:** capture frames of the reveal and look at them.

## Pending the backend (we follow these defaults until told otherwise)

- **Table hash price unit:** dollars, per their vectors.
- **`bonusHash` recipe:** ours, as above.
- **Outcome `kind` values:** item, credit or bonus.
- **Image fields:** none in their contract; we use the local lookup.
- **Awards listing:** `listAwards()`, which their contract lacks.
- **Bearer token issuer:** unknown; the mock uses the signed-in account.
- **Error body shape:** unknown; we use `BoxApiError { status, code }`.
