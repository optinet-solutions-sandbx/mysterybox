# FLEXD

The third site in this repo: a copy of `play/` (the IcyBox-style app) re-branded as **FLEXD** and
re-skinned in matte velvet purple and gold, after the client's screens (2026-10-15). It is a
separate product and may drift from `play/`; fixes to `play/` are not copied over automatically.

Spec: `docs/superpowers/specs/2026-10-15-flexd-design.md`. Plan: `docs/superpowers/plans/2026-10-15-flexd.md`.

## How it differs from play/

- Name FLEXD (`src/config/brand.ts`); no slogan; domain, support email and legal entity are placeholders.
- Dark only. Colours are the client's Velvet & Gold sheet, in `src/app/globals.css`.
- Less shiny: velvet buttons are a near-flat fill; boxes are matte velvet (`src/components/chest/chest-finishes.ts`).
- Cinzel gold headlines with one amethyst word (`AccentName`, `.accent-word`); prices in Playfair Display (`font-price`).
- Logo: the client's crown-and-mask in the lilac chrome of their screens (`public/brand/flexd-mark-<fingerprint>.webp`, traced
  outline in `src/config/mark.json`); `npm run brand:assets -- <artwork.png> [--tint]` puts in new artwork (`--tint`
  recolours it to that lilac) and redraws the icons. The box lids keep their gold inlay (only the logo's shape is used).
- Loyalty levels follow the box finishes: Lilac, Amethyst, Plum, Royal, Gold.
- Floating tab bar. The spaced wordmark shows from 380px when signed out and from 640px when signed in
  (the balance pill grows with the balance); otherwise the mark alone.
- Storage keys start with `flexd`.

## Commands (from flexd/)

    npm ci
    npm run dev                 # http://localhost:3000
    npx vitest run              # includes the no-Grail-Noir, palette, contrast, matte, type and shell checks
    npx tsc --noEmit
    npx eslint
    npx next build
    npm run brand:assets -- <artwork.png> [--tint]   # new logo artwork; re-render the chest stills if its shape changed

From the repo root:

    python scripts/render_box_stills.py http://localhost:3000 flexd   # after changing the chest; restart the dev server after
    python scripts/e2e_flexd.py http://localhost:3312 <out_dir>       # against `npx next start -p 3312`

Both need Python Playwright 1.62 (a venv; the machine's global 1.42 is too old) and Pillow.

## Deploy

Branch `flexd`. A third Vercel project from this repo with Root Directory `flexd` and Production
Branch `flexd`; no environment variables are needed. The product photos are the same MISTY cut-outs
as `play/` and must be replaced with licensed photography before a real launch
(`NEXT_PUBLIC_REFERENCE_IMAGES=off` shows the line drawings).
