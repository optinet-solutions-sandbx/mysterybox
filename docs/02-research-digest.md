# Research digest

A distillation of the Google Drive folder **MysteryBox Research** as read on 2026-10-09. Go back to
the sources for anything you are going to quote.

| Source (Drive) | What it is |
|---|---|
| `Recordings/2026-10-06/transcript` | A call in which a B2B case-opening platform vendor demos its product. **Our main product reference.** |
| `Research Notes/GrailTurf/legal_and_regulatory_risks.md` | Legal and regulatory research, as of 2026-10-07 |
| `Research Notes/GrailTurf/industry_and_affiliate_programs.md` | Operators, mechanics, economics and affiliate programs |
| `Reports/GrailTurf mystery box affiliate research.md` | Summary report for the earlier affiliate-site brief |
| `Research Notes/GrailTurf/grailturf_site_map.md`, `betterchecked_site_map.md` | Teardowns of two affiliate and review sites |
| `LINKS` (doc) | One link to a spreadsheet that is **not shared with the team account**, so the connector could not open it |
| `Frontend Designs/Color Schemes` | Empty as of 2026-10-09 |

> **Context shift.** The earlier research was written for an **affiliate or comparison site** (a
> GrailTurf rebuild). The current goal is the **operator** site itself, the place where people buy
> and open boxes. The mechanics, economics and legal analysis still apply, and the legal exposure is
> *higher* for an operator than for an affiliate.

## 1. How the product works (vendor demo, 2026-10-06)

- **Mystery boxes.** The operator creates boxes and items in a back office (single entry or bulk
  spreadsheet upload; themed boxes in minutes, for example for the World Cup). Each box shows **every
  item, its price and its odds**. An opened item goes straight to the user's cart or inventory.
- **Sell back.** This happens in about 99.9% of cases, and the money returns to the balance so it can
  be played again. Most drops are items nobody wants shipped (for example a $100 G-Shock out of a $300
  box).
- **Shipping.** The user requests shipping and enters an address. They **can cancel only while the
  request is pending**; after that, cancellation goes through support. Even large operators see
  about 200 orders a month and dropship them.
- **Battles.** Multiplayer openings: the creator picks several boxes (one round each), a mode and a
  seat count. The battle sits in a lobby, others pay the entry, and **bots can fill empty seats**.
  Everyone watches the same screen, and the **highest total takes all the items**. Finished battles
  are browsable. Battles generate **about 90% of wager and GGR**, because the average bet is higher.
- **Deals.** The user picks a target item and sets a chance (**max 80%**). The price scales with the
  chance (example: an item worth about $50k costs about $44k at 80%).
- **Leaderboards (wager races).** Daily, weekly or monthly, with tiered prizes and a history.
- **Rewards.** A **free daily box** whose quality depends on the user's tier. It expires after **24 h
  and does not stack**.
- **Affiliates.** A built-in referral code. Referred users get **3 free boxes**, and the referrer earns
  a tiered share, mostly of deposits.
- **Ops stack.** Intercom (support chat), Customer.io (CRM), a country-restriction module, and
  configurable KYC levels. Payments: **Coinflow** (fiat) and **CT Payment / Fireblocks** (crypto).
  **Stripe will not work.**
- **Withdrawals** happen only "through items": the item's value is paid to a crypto wallet. Balance
  cannot be withdrawn directly.

## 2. Economics

| Metric | Value | Source |
|---|---|---|
| RTP per box (average value returned ÷ price) | **90%** site-wide default; configurable on request | Vendor |
| Hold (net revenue ÷ deposits) | 15–30%, depending on how aggressive the bonuses are | Vendor |
| US lifetime value per player | More than $200 | Vendor |
| List price vs. cost | Items are listed above cost (Rolex listed $11k, bought $10k) | Vendor |
| Platform fee | €35k setup plus 10% of GGR; fiat processing up to 3% | Vendor |
| Competitor buyback | About 70–90% of listed value; IcyBox "up to 90%" | Industry research |
| Competitor expected return | About 75–90% (HypeDrop about 74–80%, LuxDrop about 90%) | Industry research |
| Free-box cost | The bonus costs the expected payout, not the box price | Vendor |

**Mock-up settings:** 90% RTP on listed value and 90% sell-back, so cashing out everything returns
about 81% on average. Both values live in `web/src/config/economy.ts`.

## 3. Market and competitors

- **Physical-goods boxes:** HypeDrop, LuxDrop (renamed boxes to "packs" in Jul 2026; about 90%
  return), RillaBox, JemLit, Cases.gg, PackDraw.
- **CS2 skins:** Clash.gg, CSGORoll, Key-Drop, Hellcase.
- **Card "rips":** Courtyard (about $200M annualized revenue), Arena Club, Collector Crypt. This is the
  fastest-growing segment.
- **IcyBox:** a US luxury "rip" app (watches and bags) on iOS and web, with in-app sell-back. It is our
  visual reference (see [reference/icybox-teardown.md](reference/icybox-teardown.md)).
- **Shared mechanics:** provably-fair hash commit and reveal, instant buyback, upgraders, battles,
  free daily boxes, VIP rakeback and races. Operators avoid the word "gambling" ("entertainment
  shopping", "packs", sweepstakes "no purchase necessary").
- **Acquisition:** mostly streamers and creators (Kick, YouTube), plus SEO on brand-plus-modifier
  searches. **Google and Meta ads are effectively closed. Twitch bans skin-gambling sponsorship. Kick
  allows only approved, 18+-verified platforms.**

## 4. Legal and regulatory picture (US focus; not legal advice)

- **Classification is unresolved.** Paid box + chance + a prize of value = gambling under most tests.
  **Convertibility (instant buyback) is the fact regulators lean on** (UKGC, Denmark, NY AG v. Valve,
  filed Feb 2026). No court has ruled on a physical-goods box site.
- **US is state-by-state.** No federal statute; UIGEA only applies where state law makes the bet
  unlawful.
  - Bans on dual-currency sweepstakes casinos: CA (AB 831, 1 Jan 2026), NY (S5935A, Dec 2025), NJ, CT,
    MT, IN, ME, TN, LA, OK (from 1 Nov 2026). CA and NY extend liability to "media affiliates".
  - The research suggests excluding at least **WA, ID, NV and LA** pending counsel. HypeDrop restricts
    WA.
- **The vendor's model** is a US legal opinion (about $15k, one per operation) that positions the
  product as e-commerce or sweepstakes. This is the business's call with counsel.
- **Applies regardless of classification:** FTC endorsement and fake-review rules (up to $53,088 per
  violation), substantiated value and odds claims, and state privacy law (CCPA/CPRA).
- **Payments and platforms:** Stripe prohibits games of chance with material prizes. Google and Meta
  require licensing.

What this means for the UI is spelled out in [07-compliance-ux.md](07-compliance-ux.md).

## 5. MISTY (themistybox.com): competitor UX, 2026-10-09

Full notes are in [reference/misty-teardown.md](reference/misty-teardown.md). The essentials:

- **The model differs.** MISTY is a UK prize-competition operator (VGT Ventures Ltd). Boxes pay entry
  credits and sometimes a physical piece; there is **no cash sell-back**, plus a free postal entry
  route. Its US availability looks closed (a guess). Our model, with instant sell-back, is the one the
  research flags as closer to gambling.
- **Box page order:** title, a one-line prize ladder, the reel with a centre needle, an action row
  (info · open · price · free demo spin · provably fair), then a "What's inside" grid next to a sticky
  purchase panel.
- **Item card:** a rarity bar, rarity label, odds pill (`<0.001%`), cut-out photo, name, and a value
  floor ("$26K+ · minimum retail value; the piece that ships is this or better").
- **Demo spins** (three free, nothing saved) bridge visitors into the real box.
- **Dark pattern to avoid:** reel fillers do not follow the odds (about 33% Grails shown against about
  0.05% published), and Grails land beside the needle.
- **Two-layer verify:** a seed modal, plus a per-draw page with a SHA-256 commitment and a code
  snippet.
- **Social proof** ("Live pulls" toasts, "VERIFIED" reviews) must be real and linked to verify records
  if we ever do it.

## 6. Lessons from the GrailTurf and BetterChecked teardowns

- Don't fake liveness. GrailTurf's "Live Now", "The Wire" and pull feeds were labelled illustrative, and
  invented "SOMEONE JUST PULLED A ROLEX" events read as fabricated testimonials.
- A "Claim bonus" CTA with no bonus behind it is an unsubstantiated offer.
- GrailTurf's look (near-black, violet `#8b32ff`, uppercase Space Grotesk) is something to **avoid**
  resembling as well.
