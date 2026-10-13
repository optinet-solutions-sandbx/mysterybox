# Web app (mock-up)

The luxury mystery-box front-end mock-up. Project context, rules and docs are in the repo root:
[../CLAUDE.md](../CLAUDE.md) and [../docs/](../docs/README.md).

```bash
npm install
npm run dev          # http://localhost:3000
npx vitest run       # unit tests
npx next build       # production build
```

## Box system (the backend developer's kit)

The box system follows the backend developer's Misty-style kit v1.0 (https://mys-sim.vercel.app/docs/misty/dev):
an open is created with a sealed secret, the player may add a seed, pays, then spins; the secret is revealed and
anyone can recompute the roll on `/provably-fair`.

- `src/engine/` is their recipe on Web Crypto, pinned by their test vectors (`engine/test-vectors.json`).
- `src/box-api/contract.ts` is their API as the front end uses it. `NEXT_PUBLIC_BACKEND` picks the
  implementation: `mock` (default, `box-api/mock.ts`, in the browser) or `api` (`box-api/http.ts`, their server).
- Pending the backend (defaults we use until they decide): price in dollars inside the table hash (their vectors);
  our own `bonusHash` recipe; outcome kinds `item | credit | bonus`; no image fields (photos come from our
  catalogue by id); an awards listing (`listAwards`, not in their contract); who issues the bearer token; the
  error body (`{ code }`); no shipping endpoint ("Ship it" reuses the demo shipping request).
- The prebuilt pages (landing, box list, box page layout) read our catalogue at build time; when the real API is
  switched on they need to read it from the API too.
