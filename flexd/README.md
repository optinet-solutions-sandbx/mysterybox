# FLEXD

The third site in this repo: a copy of `play/` (the IcyBox-style app) re-branded as **FLEXD** and
re-skinned 1:1 after the client's screens (2026-10-15; matte velvet first, then holographic and glass the same day). It is a
separate product and may drift from `play/`; fixes to `play/` are not copied over automatically.

Spec: `docs/superpowers/specs/2026-10-15-flexd-design.md`. Plan: `docs/superpowers/plans/2026-10-15-flexd.md`.

## How it differs from play/

- Name FLEXD (`src/config/brand.ts`); no slogan; domain, support email and legal entity are placeholders.
- Dark only, as in the client's screens (`src/app/globals.css`): near-black lit with soft purple, glass cards with lit
  edges (`glass`, `glass-lit`), a glowing violet primary button, gold for money. Glows sit about a third softer than
  the screens (the client asked for a little less shine).
- Boxes: the client's own box picture, cut from their first screen ("The Time Room") by `npm run box:art -- <screen.png>`
  into `public/boxes/flexd-box-<fingerprint>.webp` with its lid seam in `src/components/chest/box-art.ts`. Every box
  uses it. The opening is 2D (`chest.tsx`): the lid half lifts along the seam with light in the gap, the box shakes, a
  beam rises from the lit velvet inside. No WebGL. A sharper export of the same screen drops straight in.
- Big headlines in Playfair Display capitals (`font-hero`), names and section titles in Cinzel (`font-punch`), both
  ivory with one lilac word (`AccentName`, `.accent-word`); prices in Playfair Display (`font-price`).
- Logo: the client's crown-and-mask in the lilac chrome of their screens (`public/brand/flexd-mark-<fingerprint>.webp`, traced
  outline in `src/config/mark.json`); `npm run brand:assets -- <artwork.png> [--tint]` puts in new artwork (`--tint`
  recolours it to that lilac) and redraws the icons. The box lids print the logo's shape in dark ink (lilac on the black box).
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
    npm run brand:assets -- <artwork.png> [--tint]   # new logo artwork
    npm run box:art -- <screen.png>                  # the box picture, from the client's first screen

From the repo root:

    python scripts/e2e_flexd.py http://localhost:3312 <out_dir>       # against `npx next start -p 3312`

It needs Python Playwright 1.62 (a venv; the machine's global 1.42 is too old) and Pillow.

## Deploy

Branch `flexd`. A third Vercel project from this repo with Root Directory `flexd` and Production
Branch `flexd`; no environment variables are needed. The product photos are the same MISTY cut-outs
as `play/` and must be replaced with licensed photography before a real launch
(`NEXT_PUBLIC_REFERENCE_IMAGES=off` shows the line drawings).
