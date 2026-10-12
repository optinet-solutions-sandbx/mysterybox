# Product spec

Status key: **Built** = works end to end in the mock. **Stub** = the route exists and shows its planned
behavior via `ComingSoon`. **Planned** = no route yet.

## Sitemap

| Route | Purpose | Status |
|---|---|---|
| `/` | Landing: hero (load sequence + looping 3D box), vault strip, pinned ritual, tier shelf, odds proof, modes, FAQ, keyhole finale | Built |
| `/boxes` | Catalog of 3D box cards (lid lifts on hover), category filter and price sort with animated re-flow | Built |
| `/boxes/[slug]` | Box stage (3D box + stats + Open + odds-at-a-glance bar), **shake → lid → drum reel (Skip) → full-screen reveal**, "How it works" strip, "What's inside" grid with odds pills, odds table with **displayed and back-office odds**. Signed out, Open becomes "Sign in to open" | Built |
| `/register` | MISTY-style "Create your account": email, first/last name, country code + phone, password (live rules), 18+/terms (required), marketing opt-in (unchecked), then a 6-digit email code (shown on screen in the prototype) | Built (mock) |
| `/sign-in` | Email + password, "Forgot password?" note, unverified accounts go to the code step; returns to `?next=` | Built (mock) |
| `/inventory` | Held / Shipping / Sold tabs; sell back, sell all, request shipping, cancel while pending | Built |
| `/wallet` | Demo balance, quick top-ups, activity log, reset session | Built |
| `/provably-fair` | Explainer, active seeds, client-seed edit, rotate and reveal, verifier | Built |
| `/how-it-works` | Steps, trust pillars, full FAQ | Built |
| `/battles` | Multiplayer openings | Stub |
| `/deals` | Pick an item and set a chance | Stub |
| `/rewards` | Daily free box by level | Stub |
| `/leaderboard` | Daily, weekly and monthly races | Stub |
| `/affiliates` | Referral code and earnings | Stub |
| `/account` | Profile (name, verified email, phone), marketing switch, balance and pieces, sign out; KYC, addresses and play limits listed as coming | Built (mock) |
| `/legal/[slug]` | terms, privacy, odds-disclosure, responsible-play, shipping (placeholder outlines) | Built (placeholder) |
| Global | Prototype banner, sticky header with live balance and inventory count, age gate, footer with responsible-play line, smooth scroll, gold cursor | Built |

## Core flow: open a box (Built)

```
Box page ──Open for $X──▶ charge + reserve nonce ──▶ box trembles (≥0.8 s) while the draw is made
   ▲                                                         │  (HMAC roll → item → inventory)
   │                                                         ▼
   │                         lid bursts open with light; drum reel spins 6 s (1 s Quick open; Skip)
   │                                                         ▼
   └──Open again◀── full-screen reveal (rays, burst, plate turn, value count-up)
                     │        │
                Keep it   Sell back (credit = 90% of value → balance)
```

**Acceptance criteria**

- The open button is disabled until the session has hydrated and seeds exist, and while a spin runs.
  If the balance is too low, an inline error and a "Top up" link appear.
- Balance and nonce update **before** the draw resolves, so double clicks cannot reuse a nonce.
- The reel's filler tiles are sampled with the **box's real odds**. The marker lands inside the
  winning tile at a random offset; the winner is highlighted and the others dim.
- The reveal shows the rarity glow, brand, name, value and rarity. **Keep**, **Sell back for $Y** and
  **Open again for $X** all work. Escape or the backdrop means Keep.
- Under the controls: the server-seed hash, client seed, nonce and a link to verify.
- With `prefers-reduced-motion`, the reel jumps straight to the result and the reveal does not
  animate.

## Inventory (Built)

- Statuses: `held` → `sold`, or `held` → `shipping_pending` → `shipping_processing` → `shipped`.
  Only `pending` can be cancelled by the user (per the vendor demo).
- Site-credit items cannot be shipped.
- "Sell all" sells every held item in one transaction.
- **Planned:** a shipping address form, US state validation, and a status timeline.

## Wallet (Built as a demo)

- Quick top-ups ($50, $100, $250, $1,000) and an activity list (deposits, openings, sell-backs,
  shipping events).
- **Production:** card and crypto deposits through the chosen processor (not Stripe; see the digest),
  plus deposit limits, cool-off and self-exclusion in Account. Withdrawals go "through items" if the
  vendor model is kept.

## Provably fair (Built)

- roll = `floor(uint32(HMAC_SHA256(serverSeed, clientSeed + ":" + nonce)[0..8]) / 2^32 × 100000)`.
  The item is the entry whose roll range contains the roll (ranges are shown in each box's odds
  table).
- Rotating seeds reveals the old server seed and keeps the client seed. The verifier recomputes the
  hash, the roll and the item for any box.
- **The mock keeps the server seed in localStorage. Production must keep it server-side until it is
  rotated.**

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
