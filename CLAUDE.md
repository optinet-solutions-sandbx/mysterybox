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

- **No real money yet; the UI runs on a browser mock.** A "Prototype" banner is always visible.
  Registration and sign-in are a **front-end mock** of MISTY's flow (details + phone, then a
  one-time email code, plus a password): accounts live in this browser only, and the code is shown
  on screen because no email is sent.
- **Three roles:** `player`, `admin`, `super_admin`. Players sign up on the site; staff use the
  **back office at `/admin`** (dashboard, players, boxes & odds, staff & roles, audit log). The
  team's super admins (Alex, Meny, Ivan, Chris, John: `<name>@grailnoir.com`) are seeded from
  `config/staff.ts`, **hashes only; never put a password in the repo (it is public)**. Super admins
  add admins from Staff & roles. Each account has its own wallet. Data is per browser until Supabase
  is wired, and the back office says so. Sample players are off unless `NEXT_PUBLIC_DEMO_PLAYERS=on`;
  "Clear test data" (Staff & roles) wipes this browser's players for a fresh run.
- **Box system on the backend developer's kit (2026-10-13).** A separate developer owns the backend. The
  box system follows their Misty-style kit v1.0 (https://mys-sim.vercel.app/docs/misty/dev): an open is
  created with a sealed secret (its SHA-256 is shown), the player may add a seed, pays, spins, and the
  secret is revealed so anyone can recompute the roll. It runs on an in-browser mock of their API
  (`web/src/box-api/`, `NEXT_PUBLIC_BACKEND=mock`); `api` points it at their server. The Supabase draft
  is superseded for the box system. Handoff, rulings and open items:
  [docs/10-box-system-handoff.md](docs/10-box-system-handoff.md). Live: https://mysterybox-seven.vercel.app.
- **Accounts on Supabase, behind their own switch (2026-10-14).** `NEXT_PUBLIC_ACCOUNTS=supabase` (plus
  the URL and anon key) moves **login and identity** to Supabase Auth: sign-up with the 6-digit code,
  sign-in, roles, status, locks, tags, comments, staff and the audit log, all shared across devices.
  Wallets, opens and credit stay on the box system's per-account storage until the kit's API is
  live (`NEXT_PUBLIC_BACKEND`). Keep the two switches separate.
- **Catalog from Supabase: off.** `NEXT_PUBLIC_CATALOG=supabase` would serve items, boxes and odds from the
  database and let staff edit them in the back office (Items, Configure, Configuration). It stays off
  until the team decides whether the catalogue lives in Supabase or behind the kit's API. Until then
  those pages are read-only views of the built-in catalogue. See [docs/08-backend.md](docs/08-backend.md).
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
npx vitest run src/backend   # Supabase migrations + RLS + RPCs in PGlite (no Docker needed)
WRITE_SEED=1 npx vitest run src/backend/catalog-seed.test.ts   # regenerate supabase/seed.sql after editing data/
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
| `domain/` | **Pure, unit-tested logic.** Types, money (incl. `formatPercent`, `formatOneIn`, `formatCredit`), odds (normalize, price, `pickByRoll`, `rollRanges`, rarity, sell-back, `tradeInCredits`), the legacy HMAC rolls, reel strip building. |
| `engine/` | **The backend kit's draw recipe** on Web Crypto: `draw.ts` (seal, `digestOf`, `rollOf`, bands in stored order, `tableHash` with the price in dollars, `bonusHash`, `drawOpen` with free spins at nonce 2+, `verifyOpen`) and `maths.ts` (per-open maths). Pinned by their `test-vectors.json`. |
| `box-api/` | **Their API as the front end uses it.** `contract.ts` (shapes, `BoxApi`, `BoxApiError`; additions marked "pending the backend"), `mock-server.ts` (their server rules as pure functions over the account's state; every open pins a copy of its table), `mock.ts` (serialised, in the browser), `http.ts` (their server), `index.ts` (`NEXT_PUBLIC_BACKEND`: `mock` default, `api`). |
| `data/` | Mock catalog: `items.ts` (52 pieces + credits, plus 12 credit + free-spin rows; bags, watches, jewelry, eyewear, beauty, accessories) and `boxes.ts` (8 boxes, $29 → $11,767; `defineBox` adds each box's free-spin rows and free-spin table `bonus` and prices at the target RTP counting free spins; each box has a leather `material`). |
| `services/` | `catalog.ts` (synchronous reads, plus `catalogBox`/`boxOutcomes` in the kit's format and `outcomeArt`, which never throws) and `play.ts` (`drawFromBox`, legacy: the box page now opens through `box-api`). |
| `store/session.ts` | Zustand mock session persisted to localStorage (`skipHydration`; `useSessionHydrated()` gates UI; persist v3). Also holds, per account, the box API mock's tables (`boxApi`: opens, credit ledger, pay keys), `pendingOpens` and `preferredClientSeed`. |
| `store/auth.ts`, `domain/auth.ts` | Mock accounts (`grailnoir-auth`): `register` → pending 6-digit code → `verify`; `signIn` (salted SHA-256), `signOut`, `setMarketing`; `useAuthHydrated()` / `useCurrentUser()`. `domain/auth.ts` holds the pure validation (email, US phone, password rules, `safeNextPath`). |
| `components/auth/` | `AuthShell`, `RegisterForm`, `VerifyStep`, `SignInForm`, field primitives, `AuthPrompt` (signed-out stand-in for inventory, wallet, account), `useNextPath` (reads `?next=` after hydration; `useSearchParams` would need Suspense under Cache Components). |
| `components/box3d/` | **`Box3D`**, the CSS-3D box (leather faces, gold piping, foil monogram, hinged lid, inner light, beam and gold dust). `open`, `viewX` and `viewY` accept numbers (sprung) or MotionValues (scroll-driven). |
| `components/fx/` | `SmoothScroll` (Lenis; `lockScroll`, `scrollToElement`), `Cursor` (gold ring, `data-cursor` / `data-cursor-label`), `LineReveal`, `RollingNumber`, `CountUp`, `GoldDust`. |
| `components/landing/` | `Hero` (load sequence + looping box), `VaultMarquee` (scroll-velocity strip), `Ritual` (pinned, scroll opens the box), `TierShelf` (spotlit shelf, rolling prices), `OddsProof`, `Modes`, `Faq`, `Keyhole` (pinned zoom finale). |
| `components/box/` | `BoxStage` (core loop on the box API: seal + Your seed → Open → shake → lid → the outcome rises → `ResultOverlay`; "Sign in to open" when signed out), `useBoxOpen` + `open-flow.ts` (prepare, resume, open) + `guards.ts` (one action at a time), `BoxOdds` ("Box content and odds" + free-spin table), `BoxAnalysis` (maths, how decided, "Check this open"), `SessionCounters`, `OddsAtAGlance`, `HowItWorksStrip`, `BoxCard`, `BoxCatalog`, `InsideGrid`, `Reel` (idle contents strip only), `OddsTable` (back-office odds in weights, used by `/admin/boxes`). |
| `components/item/` | `ItemArt` (photo if `item.image`, else the gold-line drawing from `item-drawings.tsx`), `RarityTag`. |
| `components/layout/` | Header (transparent, then glass; hides on scroll down), footer, prototype banner, age gate, `SessionHydrator`. |
| `store/ledgers.ts`, `components/layout/session-hydrator.tsx` | One wallet per account: `useSession` is the signed-in account's working copy, swapped on sign-in/out and mirrored into `useLedgers` (`grailnoir-ledgers`). The hydrator guards against Strict Mode's double effect (a stale run must not subscribe). |
| `store/backoffice.ts`, `store/staff-actions.ts` | Demo-player status overrides and the audit log; staff actions (`setPlayerStatus`, `setRole`, `addStaff`, `settleWithdrawal`) with the **same rules as the SQL functions**. |
| `domain/analytics.ts`, `data/demo-players.ts` | Back-office numbers (`overviewRow`, `kpis`, `dailyMetrics`, `boxPerformance`) with the SQL's definitions; 240 deterministic demo players per UTC day, drawn with the real odds. |
| `components/admin/`, `app/admin/` | Back office, **structured after the team's casino back office** ([docs/09-backoffice-reference.md](docs/09-backoffice-reference.md)): `AdminShell` top bar (Dashboard, Players▾, Boxes▾, Payments▾, Feed, Bonuses▾, Battles▾, user menu), `PageTitle` breadcrumb band, dashboard, players list, full **player page** `/admin/players/view?id=<player number>` (Accounts row, loyalty points, issued bonuses, status, CS/SB locks, tags, groups, payments, openings, comments), groups, box openings, payments, feed, bonuses/battles placeholders, staff & roles, audit log. Client-gated (`instant = false`); pages reading the query string wrap their view in `<Suspense>`. Avoid dynamic `[id]` admin routes: unknown params make every `usePathname` layout suspend. |
| `services/catalog.ts`, `services/catalog-source.ts`, `components/catalog-provider.tsx` | `createCatalog(data)` over plain data. Server pages `await getCatalog()`; client components `useCatalog()`; stores use `activeCatalog()`. Never import `data/items|boxes` in UI code (mock-only code and tests may use `staticCatalog`). |
| `backend/remote-player.ts`, `remote-admin.ts`, `remote-catalog.ts`, `server-auth.ts`, `app/api/*` | Supabase wiring (see Backend above). API routes verify the caller's role server-side; the service-role key is server-only. |
| `components/admin/catalog-admin.tsx` | Items (`/admin/items`), box configuration (`/admin/boxes/configure?id=`; price and odds editable only as a draft, publish re-checks the weights) and Configuration (`/admin/settings`, super admin). Read-only on the mock. |
| `domain/player-insights.ts` | Player-page numbers (`accountSummary`, `loyaltyPoints`), `playerNumber`, `maskEmail`, automatic tags and the 14 rule-based `SEGMENTS` (groups). |
| `backend/` | `contract.ts` (methods, shapes, error codes, `PERMISSIONS` + `can()`), `supabase-api.ts` (placeholder adapter), `catalog-sql.ts` (generates `supabase/seed.sql`), `test-db.ts` + `schema.test.ts` (PGlite). |
| `app/` | Routes. `/register`, `/sign-in`, `/account` and `/admin/*` are built (mock). Battles, deals, rewards, leaderboard and affiliates are `ComingSoon` stubs listing planned behavior. |

**Core loop:** the box page prepares an open (`boxApi.createOpen`: the server picks a secret and shows its
seal) → **Open** runs `setClientSeed` (if set) → `pay` (the demo balance as the card, or site credit; one
idempotency key per attempt) → `spin` (resolves once against the open's pinned table; free spins at nonce
2, 3; reveals the secret) → only then the box shakes (0.8 s; 0.25 s with Quick open), the lid opens and
the outcome rises out → `ResultOverlay` (piece: Ship it / Trade in for credit / Keep for now; credit:
Done; free spins one after another) → the next open is prepared. **The server decides the outcome before
anything moves; the browser only animates and verifies it.**

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
5. **Odds are authored as integer weights summing to `economy.oddsScale`** (via `defineBox`; the catalog
   tests enforce the sum and the RTP band) and served in the kit's format as percents
   (`percent = weight / 1000`, in stored order). Player screens use `formatPercent` (enough digits, never
   "0%" or "<0.01%") and `formatOneIn`; the exact stored percent (`formatExactPercent`) is in tooltips;
   the admin `OddsTable` still shows weights. All are views of the **same** numbers. Never configure a
   displayed number that differs from what the draw uses.
6. **Hydration-safe numbers:** round anything computed with `Math.sin` / `Math.cos` or long decimals
   that ends up in SSR markup. Node and browsers differ in the last digits (see `gold-dust`,
   `item-drawings`).
7. **Honest reveal:** the reel no longer spins during an open (the backend kit forbids anything that
   suggests a near win); it stays as the idle contents strip, and its fillers follow the real odds. The
   reveal starts only after the spin response, ends on the server's outcome and treats every outcome the
   same. Offer Quick open and an instant reduced-motion path. MISTY shows ~33% Grails on its reel against
   0.05% odds; we do not.
8. **Compliance copy** ([docs/07-compliance-ux.md](docs/07-compliance-ux.md)): no "win", "profit",
   "investment" or "guaranteed". No fake live feeds or testimonials. Odds are always reachable from a
   box. Keep the 18+ and responsible-play lines. State the trade-in rate wherever trade-in is offered,
   and that site credit buys boxes and can't be withdrawn.
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
11. **Roles and money rules live in three places that must agree:** the SQL functions
   (`supabase/migrations`), `PERMISSIONS` in `backend/contract.ts`, and `store/staff-actions.ts`.
   Change all three together and extend `schema.test.ts`. Never read a role from user metadata;
   sign-up always creates a player. Clients never write ledger tables directly. **For the box system the
   backend developer's kit is the contract:** `box-api/contract.ts` and `box-api/mock-server.ts` mirror
   their API and server rules (client seed only before payment, pay idempotent, spin once, the secret only
   after the spin, each open pinned to its table). Change them only to match their API, and keep
   `engine/test-vectors.json` passing.
12. **`supabase/seed.sql` is generated** from `web/src/data`; regenerate it (command above) whenever
   items, boxes, prices or weights change, or `catalog-seed.test.ts` fails. Free-spin rows appear in it as
   credit items; the draft is superseded for the box system.

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
   `python scripts/e2e_flow.py http://localhost:3210 <out_dir>` from the repo root. It needs Python
   Playwright 1.51 or newer; the shared machine's global one is 1.42, so use a venv with
   `playwright==1.62.0` (it matches the installed chromium-1234). It covers the age gate, catalog filter,
   registration, opening with the seal shown first (full and quick), the result (trade-in or Done, Keep
   for now), Analysis "Check this open" (and that a verdict clears on the next open), inventory
   ship/cancel and trade-in, wallet, and the verify page reproducing the first open and agreeing with the
   API, at 1440×900 and 390×844. Expected console output: the two 404s from its deliberate
   `/does-not-exist` check (a logo preload warning was also seen on 2026-10-13; not investigated).
3. **Look at the motion, not just the log.** Capture frames through the landing scroll (hero, ritual
   at several progress points, shelf, keyhole) and the open sequence (shake, lid and rise, result), and view
   them. Text-only checks missed every visual bug so far (unstyled 3D box, invisible foil numbers,
   tile seams).
4. **Back office** (`scripts/e2e_admin.py` is **not yet updated for the new open flow**: it still clicks
   "Open for" and "Keep it"): with the same server,
   `E2E_SUPERADMIN_EMAIL=… E2E_SUPERADMIN_PASSWORD=… python scripts/e2e_admin.py http://localhost:3210 <out_dir>`
   (a team super admin; ask the user for a password) registers a player, opens boxes, requests a
   withdrawal, then as super admin pays it out, suspends the player, adds an admin and checks the
   audit log; the new admin finds Staff & roles locked; the suspended player can't sign in; the
   super admin clears the test data. Runs at 1440 (both themes) and 390.
5. Report results per flow with evidence, and say plainly what was not tested (e.g. nothing runs
   against a live Supabase project yet).

## Docs

[docs/README.md](docs/README.md) is the index: brief and roadmap, research digest, product spec,
design system, motion spec, architecture, compliance UX, backend (schema, roles, endpoint
contract, open questions), and the icybox and MISTY reference teardowns. The box system's handoff (what
changed on 2026-10-13, rulings, open items) is [docs/10-box-system-handoff.md](docs/10-box-system-handoff.md);
its spec and plan are in `docs/superpowers/`.
