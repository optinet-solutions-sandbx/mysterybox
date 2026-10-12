# Compliance UX guardrails

This is **not legal advice.** These are product rules taken from the research
([02-research-digest.md](02-research-digest.md) §4) so the mock-up never shows something that would
have to be pulled later. Counsel signs off before any public launch.

## Always on

| Rule | Where in the mock-up |
|---|---|
| "Prototype, demo credits only" banner on every page | `PrototypeBanner` |
| Age confirmation on entry (18+ placeholder; 21+ may be required by state or counsel) | `AgeGate`, `brand.minimumAge` |
| Responsible-play line with a US helpline in the footer | `SiteFooter` ("1-800-GAMBLER") |
| Full odds disclosure one scroll from every Open button: item, value, probability, roll range | `OddsAtAGlance` under the button, `OddsTable` on `/boxes/[slug]` |
| Displayed odds and back-office odds shown side by side, both derived from the same weights (never a separate "display" number) | `OddsTable` ("Operator view" column) |
| Account needed to open; 18+ and terms accepted at registration; marketing opt-in unchecked by default | `/register`, `BoxStage` "Sign in to open" |
| Return-to-player shown and defined, with "most openings return less than the price" | Box page stats and footnote, FAQ |
| Verifiable draws (seed commitment before opening) | `/provably-fair`, the seed line under the opener |
| Sell-back rate stated wherever sell-back is offered | Reveal dialog, inventory, FAQ |
| Shipping cancellation rules stated (pending only) | Inventory messages, FAQ |

## Copy rules

- **Don't say:** "win", "winner", "jackpot" (outside a battle mode name to be reviewed), "profit",
  "investment", "guaranteed", "risk-free", "free money", "can't lose", "worth up to $X" as a promise.
- **Do say:** "open", "reveal", "pull", "top item", "keep", "sell back", "odds", "return to player".
  State value claims as listed values with the odds next to them.
- **Never show fabricated activity** ("@user just pulled a Rolex!", "Live now", fake counters or
  testimonials). Use real data, or label it as demo data in plain view. (The FTC Consumer Review Rule
  and GrailTurf's lesson.)
- **Never show offers that don't exist** ("Claim bonus" with no bonus behind it).
- **No near-miss engineering:** reel fillers follow the real odds (enforced by `buildReel` and its
  test).
- **No content aimed at minors:** no cartoon mascots, school themes or youth-coded slang.
- Referral and creator pages must carry a paid-relationship disclosure.

## Third-party images (internal review only)

- `web/public/reference/misty/` holds **52 product cut-outs downloaded from themistybox.com**, a
  competitor, at the team's request on 2026-10-09. Their copyright belongs to MISTY and/or the brand
  owners. Origin URLs are listed in `SOURCES.md` in that folder.
- They are placeholders for internal review. **Before any public preview, shared link or deploy:** set
  `NEXT_PUBLIC_REFERENCE_IMAGES=off` (items fall back to our gold-line drawings) or delete the folder,
  and source licensed photography.
- Brand names on items are used to identify genuine resale pieces (nominative use). Never imply
  partnership or endorsement, and never use brand logos as our own graphics.

## Patterns to borrow from MISTY (with counsel)

- A value floor rather than a promise: "Minimum retail value. The piece that ships is this or
  better."
- Free demo spins clearly marked "Demo · nothing is saved", if counsel allows them for our model.
- A free-entry (AMOE) page, but only if the model is structured as a sweepstakes. Counsel decides.

## Needed before launch (out of scope for the mock-up)

- Real age and identity verification (KYC levels) and **geolocation blocking** for excluded states.
  The research suggests at least WA, ID, NV and LA, plus a review of the sweepstakes-ban states (CA, NY,
  NJ, CT, MT, IN, ME, TN, LA, OK). Counsel decides.
- A decision on the currency model (USD balance vs. credits or sweepstakes coins) and any free-entry
  (AMOE) route.
- Responsible-play tools in Account: deposit, loss and time limits, cool-off, self-exclusion.
- Terms, privacy (CCPA/CPRA), odds disclosure, shipping and responsible-play pages written by
  counsel, naming the legal entity.
- A cookie consent banner if tracking pixels are added.
- A payments provider that accepts the category (the vendor named Coinflow, CT Payment and
  Fireblocks; Stripe prohibits it).
- Acquisition plan without Google or Meta ads (creator partnerships under Kick's rules, SEO, email).
