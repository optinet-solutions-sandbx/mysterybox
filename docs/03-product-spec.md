# Product spec

Status key: **Built** = works end to end in the mock. **Stub** = the route exists and shows its planned
behavior via `ComingSoon`. **Planned** = no route yet.

## Sitemap

| Route | Purpose | Status |
|---|---|---|
| `/` | Landing: hero (load sequence + looping 3D box), vault strip, pinned ritual, tier shelf, odds proof, modes, FAQ, keyhole finale | Built |
| `/boxes` | Catalog of 3D box cards (lid lifts on hover), category filter and price sort with animated re-flow | Built |
| `/boxes/[slug]` | Box stage on the backend kit's logic: the open's **seal** and table hash shown before paying, optional **Your seed**, pay method (demo balance or site credit), **Open the box** (seed → pay → spin through `box-api`), then **shake → lid → the outcome rises out → neutral result** (free spins one after another; Ship it / Trade in / Keep for now), visit counters, the idle contents strip (the reel no longer spins), "How it works" strip, "What's inside" grid, **Box content and odds** (exact percent, 1 in N) with the free-spin table, **Analysis** after an open. Signed out, Open becomes "Sign in to open" | Built (mock API) |
| `/register` | MISTY-style "Create your account": email, first/last name, country code + phone, password (live rules), 18+/terms (required), marketing opt-in (unchecked), then a 6-digit email code (shown on screen in the prototype) | Built (mock) |
| `/sign-in` | Email + password, "Forgot password?" note, unverified accounts go to the code step; returns to `?next=` | Built (mock) |
| `/inventory` | Inventory / Shipping / Traded in tabs; trade in for site credit (90% of listed value), trade in all, request shipping, cancel while pending | Built |
| `/wallet` | Demo balance (it pays for opens as the "card"), quick top-ups, activity log, reset session. A site-credit ledger page is next pass | Built |
| `/provably-fair` | The kit's recipe explained, **Your recent opens** (each with its revealed secret), and a verifier (box, secret, your seed, table hash; prefilled from an open or a verify link) that recomputes in the browser and through the API | Built |
| `/how-it-works` | Steps, trust pillars, full FAQ | Built |
| `/battles` | Multiplayer openings | Stub |
| `/deals` | Pick an item and set a chance | Stub |
| `/rewards` | Daily free box by level | Stub |
| `/leaderboard` | Daily, weekly and monthly races | Stub |
| `/affiliates` | Referral code and earnings | Stub |
| `/account` | Profile (name, verified email, phone), marketing switch, balance and pieces, sign out; KYC, addresses and play limits listed as coming | Built (mock) |
| `/wallet` withdrawals | Request a withdrawal (min $20): held as pending until staff pay it out or the player cancels | Built (placeholder) |
| `/admin` | Back office (admin, super admin): KPI band (new players, players who played, boxes opened, played, earned, house net and hold), sign-ups vs first plays and played vs earned per day, top players, latest openings, pending-withdrawal callout; 7/30/90 days or all time | Built (mock) |
| `/admin/players` | Every player: registered, last played, opened, played, earned, house net, balance, status; search, filters, sort; player card drawer with activity, suspend/reactivate, pay out or cancel withdrawals | Built (mock) |
| `/admin/boxes` | Configured vs actual return per box, with the displayed/back-office odds table | Built (mock) |
| `/admin/staff`, `/admin/audit` | Super admin only: role matrix, staff list and role changes, add staff, promote a player; audit log | Built (mock) |
| `/legal/[slug]` | terms, privacy, odds-disclosure, responsible-play, shipping (placeholder outlines) | Built (placeholder) |
| Global | Prototype banner, sticky header with live balance (plus site credit) and inventory count, age gate, footer with responsible-play line, smooth scroll, gold box cursor over boxes | Built |

## Core flow: open a box (Built, on the backend kit's logic)

The box system follows the backend developer's Misty-style kit v1.0; see
[10-box-system-handoff.md](10-box-system-handoff.md) for what changed on 2026-10-13.

```
Box page loads ──▶ createOpen: the server picks a secret, returns its seal (sha256), price, table hash
   │                (shown under the button, with an optional "Your seed")
   ▼
"Open the box · $X" ──▶ setClientSeed (if any) → pay (demo balance as card, or site credit; idempotent key)
                        → spin (resolves once on the open's pinned table; free spins at nonce 2, 3; reveals the secret)
   ▼
box shakes (0.8 s; 0.25 s Quick open) → lid opens → the outcome rises out → result overlay
   │   piece: Ship it (stub) · Trade in for $N credit (90%) · Keep for now
   │   credit: Done · free spins revealed one after another, then the credit total
   └──▶ Open again / the next open is prepared (a new seal)
```

**Acceptance criteria**

- The open exists, with its seal shown, before the player pays; the secret appears only in the spin
  result.
- One action at a time: a double click can't pay twice or show a seal for a different open.
- The reveal starts only after the spin response and ends on the server's outcome. No near-miss
  visuals; every outcome gets the same neutral treatment.
- A reload mid-open resumes from the open's status (created → ready, paid → spin, resolved → result) and
  never charges twice. An unpaid open expires after 15 minutes and is replaced quietly (a notice only if
  the player had tried to pay).
- Each open pins a copy of its table; spin and verify use that copy, never today's catalogue.
- A low demo balance shows an inline error with a "Top up" link; pay with site credit when it covers
  the price.
- With `prefers-reduced-motion`, nothing shakes or waits; the piece and the result appear without
  motion.

## Inventory (Built)

- Statuses: `held` → `traded` (traded in for site credit), or `held` → `shipping_pending` →
  `shipping_processing` → `shipped`. `sold` remains for pieces sold back before the box API. Only
  `pending` can be cancelled by the user (per the vendor demo).
- Credit from opens goes straight to site credit; it no longer lands in the inventory. Older credit
  items can't be shipped.
- "Trade in all" trades in every held piece.
- **Planned:** a shipping address form, US state validation, and a status timeline.

## Wallet (Built as a demo)

- Quick top-ups ($50, $100, $250, $1,000) and an activity list (deposits, openings paid by card,
  shipping events). Trade-ins and credit from opens go to site credit, not the balance.
- **Production:** card and crypto deposits through the chosen processor (not Stripe; see the digest),
  plus deposit limits, cool-off and self-exclusion in Account. Withdrawals go "through items" if the
  vendor model is kept.

## Provably fair (Built, the kit's recipe)

- seal = `sha256(serverSeed)`, shown before payment. digest =
  `HMAC-SHA256(key "DRAW-<slug>-<serverSeed>-<clientSeed>-<nonce>", message "")`; roll = the first 13 hex
  digits / 2^52; the outcome is the first band, in stored order, whose upper edge is above roll × 100.
  Free spins use nonce 2, 3, … on the box's free-spin table. Pinned by the kit's test vectors
  (`web/src/engine/test-vectors.json`).
- Every open has its own secret (no seed rotation). With no client seed, the published default
  `grailnoir-default` is used and recorded.
- The verifier recomputes the seal, the roll, the outcome and each free spin in the browser and through
  the API, against the table frozen for that table hash.
- **The mock keeps the secret in localStorage until the spin; the backend developer's server keeps it
  server-side.**

## Secondary modes (Stubs; build in Phase 3)

### Battles
- **Lobby:** open, live and finished battles. Each row shows boxes, rounds, mode, seats filled, entry
  price and creator.
- **Create:** choose boxes (one round each), mode (standard / lowest-wins / jackpot; confirm the list
  with the vendor) and seats (1v1, 1v1v1, 1v1v1v1, 2v2). Show the total entry price.
- **Room:** one reel per player per round, spinning in sync, with running totals. Bots can be called
  into empty seats. At the end the winner takes all the items, and an animated payout is shown.
- **Archive:** replay any finished battle and verify each roll.

### Deals
- Item picker with search and filters, plus a chance slider from 1% to 80%.
- Price = value × chance ÷ RTP, shown live. A dial shows the target arc and a pointer that lands
  inside it (hit) or outside it (miss).
- The miss copy must say plainly that nothing is returned.

### Daily rewards
- XP from openings fills a level ladder, and each tier unlocks a better daily box.
- A 24 h claim window; boxes do not stack. A countdown shows after claiming.

### Leaderboard
- Tabs for daily, weekly and monthly, each with a reset countdown.
- The top 10 with masked names, the user's own row pinned, the prize ladder and an archive.

### Referrals
- Code and link with copy and share buttons.
- Referred users get 3 free boxes (vendor default).
- An earnings dashboard, and the required promoter disclosure.

### Account
- Sign-up captures date of birth and state.
- KYC levels gate high-value shipping and withdrawals.
- Addresses (US only).
- Responsible-play limits.

## Mock data

- **8 boxes**, priced automatically at 90% RTP, each in a leather finish:

  | Box | Price | Finish |
  |---|---|---|
  | The First Edition | $28 | obsidian |
  | Beauty Cabinet | $110 | ivory |
  | Sun Club | $314 | sapphire |
  | The Atelier | $1,941 | navy |
  | The Flap Room | $1,973 | obsidian |
  | The Jewel Vault | $3,837 | sapphire |
  | The Time Room | $5,308 | obsidian |
  | Grail Reserve | $11,767 | gold |

- **52 pieces** across bags, watches, jewelry, eyewear, beauty and accessories, plus site credit ($2 to
  $100 fillers). Every piece has a cut-out photo (reference images, internal only).
- The demo session starts with **$10,000**; top-ups are $100, $500, $2,500 and $10,000.
- **Rarity is relative to the box price:** below 0.5× common, from 0.5× uncommon, 1.5× rare, 5× epic,
  25× legendary.
