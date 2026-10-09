> Captured 2026-10-09 by a research agent (Playwright, read-only; nothing purchased or submitted) from a Philippines IP. Reference for **UX patterns only**; MISTY is a competitor, so none of its copy, layout compositions, palette or assets may ship. The 178 screenshots were kept outside the repo; recapture if needed.

# MISTY (themistybox.com) teardown

Captured 2026-10-09 (PH IP), desktop and mobile (`shots/`). No sign-up or payment. The only clicks were the info modals and the **demo** spin ("Demo · nothing is saved"). `(guess)` marks inference.

## Stack evidence
- **Next.js App Router**: `x-powered-by: Next.js`, RSC `self.__next_f`, `x-matched-path: /mystery/[slug]`. Turbopack build (guess, from chunk/CSS-module naming).
- **Hosting**: **Vercel** (`lhr1`). No robots.txt or sitemap.
- **Styling**: **Tailwind v4** (`lab()` colors, `@theme` tokens `--color-volt-400`, `--color-grail-400`). Fonts via next/font: Montserrat 300–600, Cormorant Garamond italic, Geist Mono. Images via next/image.
- **Services**: Stripe Express Checkout, Amazon Pay, hCaptcha, GA4, Meta Pixel + CAPI.
- **Their APIs**: `/api/box-commit`, `/api/credits`, `/api/fomo`.

## Model
This is a UK prize-competition site. **Boxes pay entry credits** ("1 credit = 1 entry… They never expire"), and some opens also yield a piece. Nothing is ever cashed out, and there is no sell-back.

## Page inventory
- **Home**:
  - Sticky header (spaced wordmark `M I S T Y`, 4 links, outlined Sign in) over a trust strip ("AUTHENTIC, ALWAYS • DELIVERED TO YOUR DOOR • HUMAN-RUN · REAL REPLIES").
  - Hero "WIN THE DREAM" with "1 COMPETITION AND 12 BOXES LIVE" and a cream CTA. On the right, a **"NOW SERVING" rotator** with turntable motion, caption "VALUE $31,850 · ENTER FROM $1" and a VIEW/OPEN chip.
  - **LIVE PULLS**: a scrollable row (tier tag, item or "+15 CREDITS", flag + first name, time ago).
  - "LIVE NOW": filter chips (All/Competitions/Boxes/Free) over a 3-column card grid with a split "OPEN $10 | ODDS" button.
  - Box picker that drives an **embedded reel demo**, then How it works, reviews, FAQ.
- **Listing `/mystery`**: H1 "MYSTERY BOXES." with the line "PUBLISHED ODDS ON EVERY BOX". Live pulls, a **5-column grid of 3:4 cards** (2 columns on mobile), and a "OPEN YOUR FIRST BOX FREE" panel.
- **Box page**:
  1. Eyebrow "HANDBAG BOX", H1 "THE HANDBAG SUITE." (88px), and ladder copy: "A Hermès Kelly and a Chanel Classic Flap wait at the top… Every box holds at least 3 credits."
  2. **Reel**: about 7 cards visible, a center needle, a "TAP TO SPIN" chip, and an idle 60s drift.
  3. Action row: Box info · **OPEN THE BOX · $10** · FREE DEMO SPIN · PROVABLY FAIR.
  4. Two columns. Left, "WHAT'S INSIDE": a 4-column grid ordered by value, a free-spin payout line ("3 (70%) · 5 (22%)…"), and "Exact published odds…". Right, a **sticky "OPEN ONE" rail**: "$10 USD" in huge light numerals, ×1/×3/×5 tiles, Amazon Pay, "PAY WITH CARD · $10", the 18+ line, the credits explainer, and "Secure payment · Stripe · instant reveal".
  5. Mobile swaps in a carousel and a sticky CTA.
- **Competition `/campaigns/suite-707`**:
  - "DRAW · TUESDAY, DECEMBER 15" and "Limited to 10,000 guests. One of them takes it home."
  - Gallery next to tiles "10,000 ENTRANTS MAX" / "DEC 15 THE DRAW".
  - Entry picker: slider, −/+, presets 5/10/15/**25 MOST POPULAR**/50, "$0.95 × 10 · 5% OFF PER ENTRY".
  - Checkout: "SECURE MY ENTRIES", an unchecked 18+ box, and the "Draw commitment (SHA-256)".
  - Below: a provenance 3-step section and the FAQ. The skill question appears after this page (guess: `/checkout`).
- **Free entry**: a **postcard illustration**, with five dashed fields on the left and a stamp box and address on the right.
- **Verify**: "DON'T TRUST US. VERIFY US." Numbered sections: 01 Commitment (hash as 8×8 hex groups), 02 entrant list + client seed (JSON), 03 Result ("AWAITING DRAW"), 04 a Node HMAC snippet.
- **Account**: needs login. Registration uses a one-time email code, with an **unchecked** marketing opt-in.

## Item card anatomy
- **Size**: 150×205 (grid/carousel) or 128×172 (reel). Radius 12px.
- **Surface**: a tier tint (alpha .10–.26, fading out at 42%) over a green-black gradient `#171d17→#090c09`, 1px tier border, inset glow, shadow `0 10px 26px rgba(0,0,0,.55)`.
- **Order, top to bottom**:
  1. A 3px tier top bar.
  2. A header row: **tier label** (mono 8px, uppercase, .2em) and **odds pill** (mono 10px tabular, `<0.001%`). Mobile shows "Most boxes" instead of 62%.
  3. An **88×88 product** with drop shadow, or a **46px light numeral** for credit outcomes.
  4. A footer band in a tier gradient: name (12px uppercase, truncated) and value (mono 11px: `$26K+` / `5 CREDITS`).
- **Tier colors**: Common `#9aa394`, Uncommon `#c9d0c3`, Rare/Free Spin `#8ac6ff`, Epic `#c9a4ff`, Legendary `#e3d8c6`, Grail `#c9a46b`.
- **Hover**: 3D tilt (about ±5°) with a pointer-tracked sheen; Grails get a foil sweep.
- **Detail modal**: tier-tinted header, full name, and two tiles:
  - "ODDS PER BOX <0.001% / 1 in 150,150"
  - "VALUE $26,000+ / Minimum retail value. The piece that ships is this or better."

**Listing card**: 3:4 with a per-box staged scene photo dimmed to 45%. The product cutout takes up 66% of the height, with the title bottom-left and a cream price pill bottom-right. The border is a 1.5px iridescent holo border with a sweep, and hover lifts it 6px. **Bug:** long titles collide with the pill ("PENTHOUSE$50").

## Odds, opening, verify
- Each outcome is listed with a %. Handbag Suite sums to about 100%. Any physical piece comes out at about 0.52%. The common outcome is 5 credits (62%) on a $10 box, so the floor is about half the price (rough).
- **Demo**: the reel decelerates for about 3–5s. Then a **result overlay**: dimmed page, tier-tinted rotating rays, a big card, "DEMO SPIN 1 OF 3", "OPEN THE REAL BOX · $10" and "SPIN AGAIN".
- **Watch-out:** reel filler isn't weighted by the odds. About 33% of sampled tiles were Grail against about 0.05% published. The landing showed Grails beside the result (one sample).
- **Provably-fair modal**: client seed (editable, regenerate, copy), server seed hash, nonce, and "They lock the moment you pay."

## Motion
- Turntable (6s, pauses on hover), reel drift, rotating rays, flash and spring pop on results, foil and holo sweeps.
- Social-proof toasts ("Samantha from AU opened Welcome · +1 credit · VERIFIED").
- Reduced-motion is only partly honored.

## Visual reference (not to copy)
- **Colors and type**: `#18060a` page, ivory `#f1e8d8`. Montserrat Light uppercase at 0.16em, mono micro-labels.
- **Tone**: a hotel metaphor ("Room service for your dream box", "guests") and plain trust lines ("The draw date is a promise.").

## Compliance patterns
- **Footer**: "18+ only. MISTY runs skill-based prize competitions with a free entry route. No purchase necessary", plus the company number and registered office.
- **Box rail**: "By opening a box you confirm you are 18+ and accept the competition terms."
- **Free entry**:
  - "SAME DRAW · SAME ODDS AS PAID ENTRIES"
  - "ONE ENTRY PER POSTCARD · UNLIMITED POSTCARDS"
  - "It is part of the competition terms, not a loophole."
  - A postcard can also get one free box open.
- **Terms**: credits "have no cash value" and are "never exchanged for cash"; a 500-entry cap, a guaranteed draw date, VPN forfeiture.
- **Brand disclaimer**: "…not affiliated with MISTY and do not sponsor or endorse it."
- **Geo**: the US isn't named among open markets (guess: closed). No age gate appeared.

## What works
- **Odds on the card face, "1 in N" in the detail view.** Transparency is the core design idea.
- **3 free demo spins** right next to the paid CTA, ending on "OPEN THE REAL BOX".
- **Ladder copy** sells the range and the floor in one sentence.
- **A sticky purchase rail** with quantity tiles and the consent line next to the pay buttons.
- **Value as a floor**: "$26,000+ … this or better".
- **A tangible free-entry page** (the postcard).
- **A per-draw verify page** (commitment published before sales), plus company details and a response-time promise.

## Their pattern → our original alternative
| Their pattern | Ours (obsidian/sapphire/gold, Cinzel + Jost) |
|---|---|
| Oxblood page, green-black wells, "suite" naming | Obsidian `#0B0B0D` page, midnight-navy `#0F1C3F` radial wells. Our own metaphor (e.g. a vault or night sky) |
| Gamer tiers, color-only | Our own gem ladder (e.g. Ivory → Pearl → Sapphire → Indigo → Champagne → Crown), label + icon |
| 8px mono tier + % pill | Cinzel small-caps tier, Jost tabular **% and "1 in N" on the face** |
| `$26K+` | "From $26,000" with a retail-value source |
| Top bar + green gradient | 1px champagne `#C2A46E` hairline, sapphire `#1E3A8A` inner glow, gold foil only on the top tier |
| Grail-heavy reel filler | **Odds-weighted filler**, a skip control, and an instant reveal under reduced-motion |
| Rays result overlay | An original reveal (seal break or lid lift, gold on navy), ~2s, with a "verify this open" link |
| Title/pill collision | Price on its own row, plus a top-prize and floor line |
| UK postcard | US mail-in AMOE and Official Rules: sponsor, ARV, odds, eligible states, "Void where prohibited" (needs counsel) |
| "VERIFIED" toasts/reviews | Real events only, each linked to its verify record (FTC review rule) |
| Node snippet | In-browser "Verify now" (WebCrypto) plus JSON |
