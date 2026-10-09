# Brief and roadmap

## Goal

Build a **clickable front-end mock-up of a luxury mystery-box website for the US market**. It should
look and feel launch-quality, so stakeholders can judge the product, the brand direction and the
motion before anyone commits to a platform vendor, a legal structure or an assortment.

The site sells **boxes with published odds**. Opening a box reveals one item (bags, watches, jewelry, eyewear,
beauty and similar). The user then keeps it and ships it home later, or sells it back
instantly for site credit.

## What was said vs. what we assume

| Said (by the team) | Assumed (correct us) |
|---|---|
| Mock-up front end only | No backend, auth or payments. A mock session lives in the browser |
| Luxury brands, US market | English and USD only; US-only shipping copy |
| No name yet; color scheme given as the "Royal Blue Luxury" board (2026-10-09) | Placeholder name `BRAND`, the board's M monogram, its palette, and its tagline and side line |
| Items not specified yet; "get the images" from themistybox.com | A mock catalog of 52 luxury pieces with MISTY's cut-out photos (internal review only) and 8 boxes from $28 to $11,767 |
| "Not like icybox, it looks like a normal AI-generated website" (2026-10-09) | Motion and craft are the core of the mock-up, not decoration |
| Like icybox.io's animation and graphics, but our own | Same stack class (Next.js, Tailwind, Motion), original art direction |
| Interactive: users buy and open boxes | The full single-box loop works; the other modes are specced stubs |
| Build the skeleton first | Phase 0 below |

## Success criteria for the mock-up

1. A first-time visitor understands the offer in about 5 seconds from the hero.
2. Opening a box feels exciting but honest: the odds sit one scroll away, and the reel cannot be
   rigged visually.
3. The loop from browse to open, reveal, keep or sell, inventory and wallet works on desktop and on a
   390 px phone.
4. The brand name, palette, fonts and items can each be swapped without touching component code.
5. Nothing in the copy would have to be retracted for compliance reasons (see
   [07-compliance-ux.md](07-compliance-ux.md)).

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| **0. Skeleton** | Next.js app, token system, mock catalog and economy, provably-fair draws, the full open loop (reel and reveal), inventory, wallet, verifier, age gate, all routes (stubs for secondary modes), docs | **Done 2026-10-09** |
| **1. Brand pass** | "Royal Blue Luxury" palette, Cinzel and Jost, foil system, marble, CSS-3D monogram box in five finishes, gold-line drawings, catalog rebased on 52 photographed pieces (reference images, internal only) | **Done 2026-10-09**, except the trading name, logo, licensed photography and copy pass |
| **2. Motion** | Hero load sequence, scroll-velocity strip, pinned ritual, tier shelf, odds proof, keyhole finale, smooth scroll, cursor, shake → lid → drum reel → cinematic reveal | **Done 2026-10-09.** Phase 2b (battle room, deals dial, page transitions) is listed in [05-motion-spec.md](05-motion-spec.md) |
| **3. Secondary modes** | Battles (lobby, create, synced room), Deals (chance slider), Daily rewards, Leaderboard races, Referrals, Account and limits UI | Spec in [03-product-spec.md](03-product-spec.md) |
| **4. Handoff** | Map the services seam onto the chosen platform's API, or hand designs to the vendor; deploy a shareable preview | Depends on the vendor decision |

## Open decisions (owner: business, unless noted)

1. **Brand name and domain.** This blocks the logo and final copy voice. The palette and the M monogram
   are decided by the board; if the name doesn't start with M, the monogram changes in
   `config/brand.ts`.
2. **Photography.** The current product photos are a competitor's (internal review only). Choose a
   source for licensed cut-outs (suppliers, brand press kits under license, or our own shoot) before
   any external preview.
3. **Assortment and price points.** The mock now leans luxury (bags, watches, jewelry, eyewear,
   beauty). Its 8 boxes run $28 to $11,767 (icybox runs about $50 to $1,000). Confirm the categories,
   hero pieces and box ladder.
4. **Economy.** Confirm the 90% RTP (vendor default) and the sell-back rate (the mock uses 90% of
   listed value). Confirm whether list prices carry a margin over cost (the vendor's example: list a
   Rolex at $11k, buy it at $10k).
5. **Currency model.** USD balance vs. site credits. Dual-currency sweepstakes models are banned in
   several states (see the digest), so counsel decides this.
6. **Platform.** Buy a turnkey B2B platform (the vendor demoed on 2026-10-06; €35k setup plus 10% of
   GGR, and it ships its own front end) or build custom. This decides whether this mock-up becomes
   production code or a design spec for the vendor.
7. **Which secondary modes ship at launch.** Battles drive about 90% of wagering on the vendor's
   platform.
8. **Legal.** The US legal opinion (about $15k), the permitted states list, age (18+ vs 21+) and KYC
   levels. Owner: counsel.

## Out of scope for the mock-up

Real payments, KYC, geolocation, shipping integrations, a CMS or back office, and SEO.
