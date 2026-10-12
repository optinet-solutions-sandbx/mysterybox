# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## What this project is

A **front-end mock-up of a luxury mystery-box website for the US market**. Users buy a box with
published odds, watch it open, then **keep** the piece (ship it later) or **sell it back** for
credit.

The motion bar is set by [icybox.io](https://www.icybox.io/), and [themistybox.com](https://themistybox.com/)
is a second reference for listing and box-page UX. We study both and build our **own** design; we
never copy their copy, layout compositions, palettes or fonts. On 2026-10-09 the team called the
first skeleton "a normal AI-generated website". **Motion and craft are the point of this project,
not decoration.**

- **No real money, accounts or backend.** Everything runs on mock data and a browser-persisted mock
  session. A "Prototype" banner is always visible. Registration and sign-in are a **front-end mock**
  of MISTY's flow (details + phone, then a one-time email code, plus a password): accounts live in
  this browser only, and the code is shown on screen because no email is sent.
- **Brand: Grail Noir** (grailnoir.com). Slogan "Life is too short. Go Noir." (a two-tier lockup:
  setup line, then a foil punchline). Logo: the **gold crown-and-mask** artwork supplied 2026-10-12,
  extracted onto transparency in `public/brand/` (mark + lockup), used through
  `components/brand/logo-mark.tsx`, with a traced silhouette for ink on light box finishes. App icons
  are `app/icon.png` and `app/apple-icon.png`. Palette from the "Royal Blue
  Luxury" board: obsidian, navy, indigo, sapphire, champagne gold, ivory.
- **Light and dark mode.** The `[data-theme]` attribute on `<html>` is set before first paint by
  `themeBootScript` (`lib/theme.ts`): the saved choice wins, otherwise the system preference.
  `ThemeToggle` sits in the header. Every surface, glow, shadow, marble and foil stop is a token that
  changes per mode.
- **Phase:** skeleton (Phase 0), brand pass and core motion (Phase 1/2) are built. See
  [docs/01-brief.md](docs/01-brief.md) for the roadmap and the open decisions.

The source research lives in the Google Drive folder **MysteryBox Research** (owner
ivan@optinetsolutions.com, shared with the team). It is distilled in
[docs/02-research-digest.md](docs/02-research-digest.md). Read the digest before changing product
behavior.

## Commands

All app commands run from `web/`:

```bash
cd web
npm run dev            # http://localhost:3000
npx vitest run         # unit tests (domain + catalog integrity)
npx tsc --noEmit       # typecheck (run `npx next typegen` first if a new route's PageProps errors)
npx eslint             # lint (React Compiler rules: no mutation during render, no setState in effect bodies)
npx next build         # production build; every route must prerender
```

## Stack

Next.js 16.4 (App Router, **Cache Components + Partial Prefetching on**), React 19.3, TypeScript strict,
Tailwind v4, Motion 14 (`motion/react`), Lenis 1.3 (smooth scroll), Zustand 5, Vitest 5,
lucide-react. Icybox runs on the same Next, Tailwind and Motion stack.

> **Next 16 has changed APIs.** Before using a Next API, read the bundled docs in
> `web/node_modules/next/dist/docs/` (see `web/AGENTS.md`). `params` is a Promise, and dynamic routes
> need `generateStaticParams` (or Suspense). No `Math.random()`, `Date.now()` or
> `crypto.randomUUID()` while a Server Component renders.
>
> **CSS modules do not work here.** The Turbopack rule in `next.config.ts` compiles every `.css` file
> as global CSS, so `import s from "./x.module.css"` returns empty class names. Use Tailwind, or a
> plain global `.css` with prefixed classes (see `components/box3d/box-3d.css`).

## Architecture (web/src)

| Path | Role |
|---|---|
| `config/brand.ts` | Every brand string: name, domain, tagline and `taglineLines`, descriptor, box side line, entity, age. |
| `components/brand/logo-mark.tsx` | `LogoMark` (foil or solid) plus `LOGO_PATH` / `LOGO_VIEWBOX` for inline SVG use (keyhole, coin). |
| `lib/theme.ts`, `components/layout/theme-toggle.tsx` | Light/dark boot script, storage key, toggle. |
| `config/economy.ts` | Mock economy: target RTP (90%), sell-back rate (90%), starting balance ($10k), top-ups, odds scale (100,000). |
| `config/media.ts` | `referenceImage()` / `NEXT_PUBLIC_REFERENCE_IMAGES`, the switch for the third-party photos (see Rules). |
| `domain/` | **Pure, unit-tested logic.** Types, money, odds (normalize, price, `pickByRoll`, `rollRanges`, rarity, sell-back), provably-fair HMAC rolls, reel strip building. |
| `data/` | Mock catalog: `items.ts` (52 pieces + credits; bags, watches, jewelry, eyewear, beauty, accessories) and `boxes.ts` (8 boxes, $28 → $11,767, priced by `defineBox` at the target RTP, each with a leather `material`). |
| `services/` | **The backend seam:** `catalog.ts` (synchronous reads), `play.ts` (`drawFromBox`). Swap the bodies for the platform API and keep the signatures. |
| `store/session.ts` | Zustand mock session persisted to localStorage (`skipHydration`; `useSessionHydrated()` gates UI). |
| `store/auth.ts`, `domain/auth.ts` | Mock accounts (`grailnoir-auth`): `register` → pending 6-digit code → `verify`; `signIn` (salted SHA-256), `signOut`, `setMarketing`; `useAuthHydrated()` / `useCurrentUser()`. `domain/auth.ts` holds the pure validation (email, US phone, password rules, `safeNextPath`). |
| `components/auth/` | `AuthShell`, `RegisterForm`, `VerifyStep`, `SignInForm`, field primitives, `AuthPrompt` (signed-out stand-in for inventory, wallet, account), `useNextPath` (reads `?next=` after hydration; `useSearchParams` would need Suspense under Cache Components). |
| `components/box3d/` | **`Box3D`**, the CSS-3D box (leather faces, gold piping, foil monogram, hinged lid, inner light, beam and gold dust). `open`, `viewX` and `viewY` accept numbers (sprung) or MotionValues (scroll-driven). |
| `components/fx/` | `SmoothScroll` (Lenis; `lockScroll`, `scrollToElement`), `Cursor` (gold ring, `data-cursor` / `data-cursor-label`), `LineReveal`, `RollingNumber`, `CountUp`, `GoldDust`. |
| `components/landing/` | `Hero` (load sequence + looping box), `VaultMarquee` (scroll-velocity strip), `Ritual` (pinned, scroll opens the box), `TierShelf` (spotlit shelf, rolling prices), `OddsProof`, `Modes`, `Faq`, `Keyhole` (pinned zoom finale). |
| `components/box/` | `BoxStage` (core loop: shake → lid opens → drum `Reel` → `RevealOverlay`; "Sign in to open" when signed out), `OddsAtAGlance` (rarity bar under the Open button), `HowItWorksStrip`, `BoxCard`, `BoxCatalog`, `InsideGrid`, `OddsTable` (displayed **and** back-office odds; cards below `lg`). |
| `components/item/` | `ItemArt` (photo if `item.image`, else the gold-line drawing from `item-drawings.tsx`), `RarityTag`. |
| `components/layout/` | Header (transparent, then glass; hides on scroll down), footer, prototype banner, age gate, `SessionHydrator`. |
| `app/` | Routes. `/register`, `/sign-in` and `/account` are built (mock). Battles, deals, rewards, leaderboard and affiliates are `ComingSoon` stubs listing planned behavior. |

**Core loop:** `BoxStage.handleOpen` → `session.openBox` charges the balance and reserves the nonce
synchronously → `drawFromBox` (HMAC roll → `pickByRoll`), while the box shakes for at least 800 ms →
`buildReel` puts the drawn piece at index 56 → the lid opens and the reel spins (6 s; 1 s with Quick
open; Skip completes it) → `RevealOverlay` (rays, burst, plate flip, value count-up) → Keep, Sell back
or Open again. **The outcome is decided before anything moves.**

## Rules

1. **Tokens only, in both modes.** Style with the semantic utilities in `globals.css` (`bg-surface`,
   `text-muted`, `border-line`, `text-foil`, `bg-foil`, `btn-foil`, `bg-marble`, `text-rarity-*`,
   `font-display`), plus the mode tokens:
   - `--plate`, `--card`, `--reel-bg` / `--reel-edge`;
   - `--shadow-strong`, `--floor-shadow`;
   - `--aurora-a` / `--aurora-b`, `--dust`;
   - `--foil-1..5` for SVG gradient stops.

   Never use raw hex in components; `Box3D` materials (the box is an object, the same in both modes)
   are the exception. Check every visual change in **light and dark**.
2. **Gold is foil, not paint.** Use `text-foil` / `bg-foil` on type, edges and the primary button.
   `background-clip:text` does **not** reach transformed or absolutely positioned children, so animated
   numbers take `foil` themselves (`<RollingNumber foil>`, `<CountUp foil>`).
3. **Type:** Cinzel (`font-display`) for headings, prices and the monogram; Jost for text. Geist Mono
   is only for seeds and hashes. Readability pass (2026-10-12): body Jost at weight 450, h1–h3 at 600
   (base layer, so utilities still win), buttons semibold, prices and labels semibold; `--muted` and
   `--subtle` were lifted in both modes. Don't drop secondary text below `text-muted` on cards.
   Box sizes come from `BOX_WIDTH` (`tile` for catalog and shelf, `stage` for hero, ritual and box
   page); product photos are trimmed and drawn at equal visual area (`imageAspect`, `fitToArea`). No tracked-caps label above every heading, and no accenting a single
   word in a headline.
4. **Brand strings come from `config/brand.ts`. Money is integer cents** (`formatUsd` at the edge).
5. **Odds are integer weights summing to `economy.oddsScale`.** Author boxes via `defineBox`; the
   catalog tests enforce the sum and the RTP band. **Displayed odds** (`formatDisplayedOdds`: two
   decimals, `<0.01%`, never "0%") and **back-office odds** (`formatExactOdds`: the weight / 100,000)
   are two views of the **same** weights. Never configure a displayed number that differs from what
   the draw uses.
6. **Hydration-safe numbers:** round anything computed with `Math.sin` / `Math.cos` or long decimals
   that ends up in SSR markup. Node and browsers differ in the last digits (see `gold-dust`,
   `item-drawings`).
7. **Honest reel:** fillers are sampled with the real odds, with no engineered near-misses. MISTY shows
   ~33% Grails on its reel against 0.05% odds; we do not. Always offer Skip and an instant
   reduced-motion path.
8. **Compliance copy** ([docs/07-compliance-ux.md](docs/07-compliance-ux.md)): no "win", "profit",
   "investment" or "guaranteed". No fake live feeds or testimonials. Odds are always reachable from a
   box. Keep the 18+ and responsible-play lines.
9. **Third-party product photos are live by the team's choice** (2026-10-09, at their risk).
   `web/public/reference/misty/` holds 52 cut-outs taken from themistybox.com (a competitor; the
   copyright belongs to MISTY and/or the brands), with sources in `SOURCES.md`. Replace them with
   licensed photography before a real launch; `NEXT_PUBLIC_REFERENCE_IMAGES=off` switches the site to
   the gold-line drawings. Never add more third-party assets without asking. The crown-and-mask logo
   was supplied by the team (traced from an image captioned "Royal Gypsy"), so confirm the rights
   before launch.
10. **Motion** follows [docs/05-motion-spec.md](docs/05-motion-spec.md):
   - Use one ease, `[0.22, 1, 0.36, 1]`, and one "toy" per section.
   - Give every effect a `useReducedMotion` path and pause loops off-screen.
   - Use radial gradients instead of large `blur()` filters.
   - Never put opacity, filter or overflow on a `preserve-3d` container (it flattens `Box3D`).

## Performance rules (phones were at 40 s of main-thread blocking before these)

Lighthouse on the live site, mobile home: 25 → 84 (blocking 39,970 ms → 260 ms, largest paint
21.6 s → 3.2 s) on 2026-10-12. Keep it there:

- **No runtime SVG filters for textures.** Marble and leather are static files in
  `public/textures/`, regenerated by a script if the look changes. Never use `feTurbulence`
  data-URIs on large or repeated elements.
- **No blend modes on large or fixed layers.** The full-screen `.grain` overlay uses plain opacity.
- **No `filter: blur()` or `backdrop-filter` on moving or repeated elements.** Use radial gradients
  and solid fills.
- **Mount heavy below-the-fold scenes with `<Deferred placeholderClassName="h-[…]">`** (ritual, shelf,
  odds, keyhole). Keep the placeholder heights equal to the real section heights; measure at 390,
  768 and 1440 when a section changes.
- **Infinite decoration only while visible:** `Box3D` mounts its gold dust only while open; the shelf
  renders only the 5 visible boxes; the idle reel renders only enough tiles to fill the strip.
- **First paint must not wait for JS:** the hero entrance uses CSS keyframes (`animate-rise-in`,
  `animate-fade-up`, `animate-drop-in`). Pass `sizes` to `ItemArt`/`LogoMark` that match the
  rendered width.
- Re-run Lighthouse (mobile and desktop) on the live URL after any visual-heavy change.

## Verification (do not claim "done" without it)

1. `npx vitest run`, `npx tsc --noEmit`, `npx eslint` and `npx next build` must all be clean.
2. **Run the real flow in a browser.** Run `npx next start -p 3210` in `web/`, then
   `python scripts/e2e_flow.py http://localhost:3210 <out_dir>` from the repo root (Python Playwright).
   It covers the age gate, catalog filter, opening (full and quick), reveal, sell back and keep,
   inventory ship/cancel, wallet, and provably fair (nonce 0 must reproduce the first opening), at
   1440×900 and 390×844. The only expected console errors are the two 404s from its deliberate
   `/does-not-exist` check.
3. **Look at the motion, not just the log.** Capture frames through the landing scroll (hero, ritual
   at several progress points, shelf, keyhole) and the open sequence (shake, spin, reveal), and view
   them. Text-only checks missed every visual bug so far (unstyled 3D box, invisible foil numbers,
   tile seams).
4. Report results per flow with evidence, and say plainly what was not tested.

## Docs

[docs/README.md](docs/README.md) is the index: brief and roadmap, research digest, product spec,
design system, motion spec, architecture, compliance UX, and the icybox and MISTY reference
teardowns.
