# Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.4 App Router, Turbopack, **Cache Components + Partial Prefetching** (create-next-app defaults) | Same class as the reference site; static shells make navigation instant; a straightforward path to production |
| UI | React 19.3, TypeScript strict | `useEffectEvent` and `useSyncExternalStore` are used for hydration-safe client state |
| Styling | Tailwind v4 with CSS-variable tokens | Theme swap without touching components |
| Motion | Motion 14 (`motion/react`) + Lenis 1.3 (smooth scroll) | Same API family the reference uses; Lenis keeps scroll-scrubbed scenes smooth |
| State | Zustand 5 + `persist` (localStorage) | A tiny mock "backend" that survives reloads |
| Tests | Vitest 5 (node env) | Pure domain logic and catalog integrity |
| Icons | lucide-react | |

## Folder map

```
web/src
├─ app/                 routes (server components by default)
│  ├─ layout.tsx        fonts, theme boot script, banner, header, footer, age gate, palette, hydrator
│  ├─ page.tsx          landing
│  ├─ boxes/            catalog + [slug] (generateStaticParams → fully prerendered)
│  ├─ inventory/ wallet/ provably-fair/ how-it-works/
│  ├─ register/ sign-in/ account/   mock accounts (client forms, static shells)
│  ├─ admin/            back office (staff-gated in the browser; instant = false)
│  ├─ battles/ deals/ rewards/ leaderboard/ affiliates/   (ComingSoon stubs)
│  └─ legal/[slug]/     placeholder outlines
├─ backend/             contract.ts, supabase-api.ts (placeholder), seed generator, PGlite schema tests
├─ box-api/             the backend developer's API: contract.ts, mock-server.ts + mock.ts (in-browser server,
│                       the default), http.ts (their server), index.ts (NEXT_PUBLIC_BACKEND switch)
├─ components/{ui,layout,landing,box,item,account,auth,admin,common}
├─ config/              brand.ts, economy.ts, nav.ts
├─ data/                items.ts, boxes.ts (mock catalog)
├─ domain/              types, money, odds, fair, reel (+ *.test.ts)
├─ engine/              the backend kit's draw recipe on Web Crypto: draw.ts, maths.ts, test-vectors.json
├─ lib/                 cn, theme
├─ services/            catalog.ts, play.ts (+ catalog.test.ts): the backend seam
└─ store/               session.ts (signed-in wallet), ledgers.ts (every account's wallet), auth.ts (accounts + roles),
                        backoffice.ts (audit, demo statuses), staff-actions.ts (role rules)

supabase/               migrations (schema, RLS, RPCs), seed.sql (generated), config.toml (see 08-backend.md)
```

## Data model (`domain/types.ts`)

- `Item { id, name, brand, category, value: Cents, image? }`
- `Box { id, slug, name, tagline, category, price: Cents, entries: BoxEntry[], badge?, featured?, material }` (`material`: obsidian, navy, sapphire, ivory or gold)
- `BoxEntry { itemId, weight }`. The weights of a box sum to `economy.oddsScale` (100,000).
- `Item.freeSpins?` (credit rows that carry free spins), `Box.bonus: BonusRow[]` (the free-spin table),
  `InventoryStatus` adds `traded`, `InventoryItem.openId?` (the box API open a piece came from).
- The box API's shapes live in `box-api/contract.ts`: `CatalogOutcome { id, label, rarity, kind
  (item | credit | bonus), credits, freeSpins, valueCents (null for credit), percent }`, `OpenCommitted`,
  `OpenResolved`, `LedgerEntry`, `VerifyResult`, `TableSnapshot`.
- `ResolvedEntry { item, weight, probability, rarity }`
- `Draw { serverSeedHash, clientSeed, nonce, roll }`: everything needed to re-verify one opening.
- `InventoryItem { uid, itemId, boxId, acquiredAt, status, draw }`
- `Transaction { id, type, amount (signed cents), at, label }`

## The services seam

Components never read `data/` directly. They go through:

- `services/catalog.ts`: `listBoxes`, `listFeaturedBoxes`, `getBox`, `getItem`, `resolveEntries`,
  `boxStats`, `topItemsIn`, `listShowcaseItems`. These are **synchronous** so pages prerender.
- `services/catalog.ts` also has `catalogBox(box)` / `boxOutcomes(box)` (the kit's format, synchronous,
  `percent = weight / 1000`) and `outcomeArt(id)` (local photo or drawing, never throws).
- `services/play.ts`: `drawFromBox(box, seeds) → { entry, draw }`. **Legacy:** only `session.openBox`
  uses it; the box page opens through `box-api`.
- `box-api` (`boxApi` from `@/box-api`): `listBoxes`, `getBox`, `createOpen`, `setClientSeed`, `pay`,
  `spin`, `getOpen`, `tradeIn`, `myCredits`, `verify`, `getTable`, `tableLog`, `listAwards` (pending the
  backend). The mock stores its tables in the session (`boxApi`), next to `pendingOpens` and
  `preferredClientSeed`.
- `store/session.ts` actions: `openBox`, `sellBack`, `requestShipping`, `cancelShipping`, `deposit`,
  `setClientSeed`, `rotateSeeds`, `ensureSeeds`, `confirmAge`, `reset`.

- `store/auth.ts` actions: `register`, `verify`, `resendCode`, `signIn`, `signOut`, `setMarketing`.
  The mock keeps one shared session for every account in the browser; a real backend scopes balance,
  inventory and seeds per user, sends the code by email and never returns it to the page.

**To connect the backend developer's API:** set `NEXT_PUBLIC_BACKEND=api` and
`NEXT_PUBLIC_BOX_API_URL`. Still to do then: the bearer token, pointing the prebuilt pages (landing, box
list, box page layout) at the API instead of the local catalogue, and replacing the UI's direct reads of
the mock's storage (header credit, recent opens). See [10-box-system-handoff.md](10-box-system-handoff.md).

## State and hydration

- The session store uses `skipHydration: true`. `SessionHydrator` (in the root layout) calls
  `persist.rehydrate()` after mount, then `ensureSeeds()`.
- `useSessionHydrated()` (`useSyncExternalStore` over the persist API) is `false` on the server and on
  the first client render. Balance, inventory and wallet UI show a skeleton until it is `true`. This
  prevents hydration mismatches.
- **Smooth scroll:** Lenis runs from `SmoothScroll` in the root layout (off under reduced motion). Dialogs call `lockScroll` through `useDialog`.

## Motion and 3D building blocks

- `components/box3d/`: `Box3D` + `box-3d.css` (**global** classes prefixed `b3d-`). The faces are leaves;
  `.b3d-scene` and `.b3d-lid` are `preserve-3d` containers, so never give them opacity, filter or
  overflow.
- `components/fx/`:
  - `SmoothScroll` (a Lenis instance; `lockScroll` for dialogs; `scrollToElement`);
  - `Cursor`, `LineReveal`, `RollingNumber`, `CountUp`;
  - `GoldDust` (deterministic pseudo-random, so there is no hydration drift).
- Scroll scenes (`Ritual`, `Keyhole`) use `useScroll({ target, offset: ["start start", "end end"] })`
  on a tall section with a `sticky h-[100svh]` stage, and feed `useTransform` values straight into
  `Box3D` props.

## Next 16 gotchas (learned in Phases 0–2)

- **CSS modules return empty class names.** The create-next-app Turbopack rule in `next.config.ts`
  sends every `.css` file through `@tailwindcss/turbopack` as global CSS. Use Tailwind or prefixed
  global classes.
- **The previous route stays mounted (hidden) after client navigation** (React Activity). In tests,
  select `:visible` elements or counts will include the old page.
- **`background-clip: text` does not reach transformed or absolutely positioned descendants.** Put
  `text-foil` on the animated glyphs themselves.

- `params` is a `Promise`. Use `PageProps<"/route/[slug]">`. After adding a route, run
  `npx next typegen` so the route types exist for `tsc`.
- Dynamic routes use `generateStaticParams` so they prerender. Without it, param access must sit
  inside `<Suspense>`.
- No `Math.random()`, `Date.now()` or `crypto.randomUUID()` while a Server Component renders. Randomness
  lives in client event handlers (`BoxStage.handleOpen`) and the store.
- React Compiler lint rules are on: no reassigning variables during render (see `rollRanges`), and no
  synchronous `setState` in effect bodies. Use `useEffectEvent` for callbacks read inside effects.
- Bundled framework docs: `web/node_modules/next/dist/docs/`.

## Testing

- `domain/*.test.ts` cover normalization, pricing, `pickByRoll` boundaries, roll ranges, rarity,
  sell-back, SHA-256 and HMAC test vectors, roll mapping, determinism, and that reel fillers follow
  the real odds.
- `services/catalog.test.ts` checks that ids and slugs are unique, every box's odds sum to 100%, and
  RTP sits in (target − 5%, target].
- `engine/draw.test.ts` runs every check in the backend kit's test vectors (seal, key, digest, roll,
  outcome, free spins, table hash, the full open) plus the per-open maths.
- `box-api/mock-server.test.ts` covers the open lifecycle (created, paid, resolved, expired), seed rules,
  idempotent pay and spin, 402 and 409, the secret hidden before the spin, trade-in, verify and the
  pinned table; `http.test.ts` covers paths and errors.
- `components/box/open-flow.test.ts` and `guards.test.ts` cover prepare, resume, retry and one action at
  a time.
- Browser verification: see "Verification" in the root `CLAUDE.md`.

## Deploying a preview (when asked)

Vercel or any Node host: build root `web/`, `npm run build`, `npm start`. `robots` is set to noindex
in the root metadata. Keep it that way until launch.
