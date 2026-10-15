# FLEXD: design

2026-10-15. Status: approved in conversation; this is the written spec.

## Goal

The client asked for "an additional version, purple, following the look and feel on those screens,
but the purple should be less shiny". FLEXD is that version: a **separate product** built as a copy
of the IcyBox-style site in `play/`, re-branded and re-skinned in matte velvet purple and gold. It
is expected to drift away from Grail Noir over time, so it is a copy, not a theme switch.

The repo then holds three sites:

| Folder | Site | Branch | Live |
|---|---|---|---|
| `web/` | Grail Noir, long-scroll site and back office | `main` | https://mysterybox-seven.vercel.app |
| `play/` | Grail Noir, IcyBox-style app (burgundy) | `play` | https://grailnoir-app.vercel.app |
| `flexd/` | FLEXD, IcyBox-style app (velvet purple) | `flexd` | third Vercel project, not created yet |

## References

The client's files are in `docs/reference/2026-10-15/flexd/` on the machine that received them.
They are **not committed**: the repo is public and they are unreleased brand mockups
(`.git/info/exclude` keeps them out locally). They are:

- **Three photo mockups** (phone frames): age gate, home, box page ("The Time Room"). Rich lighting,
  glossy satin drapes, holographic and lacquered boxes, a purple crown-and-mask.
- **"FLEXD Velvet Screens" (PDF, 3 pages):** the same three screens drawn flat: velvet curtain
  background, flat velvet box with a gold crown clasp, gold-sheen Cinzel headlines with one
  amethyst word, velvet pill buttons, gold-outline secondary pills, a floating bottom tab bar.
- **"FLEXD Velvet and Gold palette" (PDF, 2 pages):** the colour, type, spacing and radius tokens
  used below, with drop-in CSS.

The screens use `play/`'s own copy and structure word for word (age gate text, "Every box holds a
real piece.", category chips, Boxes / Showroom / Collection / Rewards), which is why FLEXD starts
from `play/`.

**Open with the client** (a message was drafted for the user): whether "less shiny" means what we
assumed below, whether FLEXD is the final name, and whether a logo file exists. The defaults below
stand until they answer.

## Scope

**Same as `play/` today, unchanged in behaviour:** age gate; home (headline, category chips, box
carousel); box page and odds sheet; the opening with swipe-to-sell, share sheet and keep; Collection
(7-day vault, combined insured shipping, timeline); Wallet (Credit and Withdrawable, mock top-ups and
cash-outs); Rewards (levels, referrals, sample leaderboard); Showroom; Help; `/pull/<piece>` share
pages with their link preview and story image; the 8 boxes, the 52-piece catalogue, odds, draw and
90% sell-back; mock accounts in the browser; motion and sound.

**Changes:**

- **Name:** FLEXD in every user-facing string (`config/brand.ts`, page titles, legal lines, box side
  line, share images, comments that name the brand).
- **No slogan:** the references show none, so Grail Noir's "Life is too short. Go Noir." does not
  carry over. The default title is "FLEXD: open a box, keep the piece or sell it back".
  `domain`, `supportEmail` and `legalEntity` are placeholders marked TBD.
- **Dark only:** remove the light colour set, the theme boot script's light branch and the theme
  toggle. `<html data-theme="dark">` is fixed; `theme-color` is `#0A0510`.
- **Storage keys** move from `grailnoir-play*` to `flexd*` (session store, sound, returning-visitor
  flag).

**Not new:** FLEXD reuses the 52 MISTY product cut-outs that `play/` already ships
(`public/reference/misty/`). No new third-party assets are added, but this is a third public site
showing them, under the same caveat as the other two: replace them with licensed photography before
a real launch (`NEXT_PUBLIC_REFERENCE_IMAGES=off` switches to the line drawings).

## Look

### Colours

`play/` styles everything through semantic roles in `src/app/globals.css`; FLEXD replaces the
burgundy and champagne ramps with the palette sheet's and remaps the roles. Components keep using
only the semantic utilities, never raw hex.

| Role (token) | FLEXD value |
|---|---|
| `--bg` | ground `#0A0510` |
| `--surface` | surface `#160A22` |
| `--surface-2` | surface-raised `#22112F` |
| `--line` | hairline `#3D2152` |
| `--fg` | champagne `#F4E9D2` |
| `--muted` | `#B3A3C4`; `--subtle` a step darker, still readable on surface |
| `--primary`, `--on-primary` | velvet-500 `#5B1E92`, gold-300 `#E6CF9A` |
| `--primary-hi` (hover, pressed) | velvet-700 `#3F1366` |
| `--hot` (active tab, chip, dots, swipe cue) | velvet-700 / velvet-900 `#2A0B45` fills; amethyst for thin marks |
| `--accent`, `--foil-*` | gold-500 `#C2A05A`; foil stops from the gold sheen (gold-700 `#8C6A2E` → gold-300 → `#B08A45` → gold-100 `#F0DDAE` → `#9C7838`) |
| accent word, focus ring, icons | amethyst velvet-300 `#A374E0`, never a fill |
| small badges | velvet-100 `#DCC8F0`, never a large fill |
| `--success`, `--danger` | `#7FB89A`, `#E07A86` |
| `--glow`, `--aurora-*` | velvet-500 / velvet-900, at lower strength than `play/`'s burgundy |
| rarity ladder | lilac-stone, champagne, antique gold, amethyst, gold sheen (common → grail) |

`--plate`, `--card`, `--reel-bg`, `--floor-shadow` and the other surface tokens are rebuilt from
ground, surface and velvet-900.

### Less shiny

The client's one explicit instruction. Applied on top of the palette sheet:

- **Buttons:** the sheet's `--velvet` radial (bright `#6E2BA8` top to `#34105A`) becomes a near-flat
  velvet-500 fill with a faint lighter top edge (a lift of a few percent, not a highlight). No purple
  outer glow; a soft dark drop shadow and the sheet's thin gold inset line only.
- **Boxes:** matte velvet materials (see Box finishes): high roughness, soft sheen at grazing angles
  only, no clear coat, no iridescence.
- **Glow:** one soft violet pool behind the chest on the stage and box page, weaker than `play/`'s.
  None behind buttons, chips or cards.
- **Background:** the sheet's vertical drape folds at about half its contrast.
- **Gold stays metallic** (sheen on type, crown, clasp); the instruction was about the purple.

Exact values are tuned against screenshots at 390 and 1440, next to the reference screens.

### Type

- **Display:** Cinzel, uppercase, gold sheen, `letter-spacing: .04em`. Headlines may set one word in
  amethyst, as every reference screen does ("REAL", "18", "ROOM").
- **Prices and values:** Playfair Display (added through `next/font/google`), gold, e.g. "$15.6K",
  "$5,250".
- **Body:** Jost; large body at weight 300 as the sheet specifies, normal body 400.
- Sizes follow the sheet (display-xl 56/60, display-l 40/46, price 28/32, title 24/30, body-l 18/28,
  body 16/24, small 14/20, label-caps 13/16) where `play/` has a matching role; layout and spacing
  otherwise stay `play/`'s.

### Box finishes

The chest stays `play/`'s WebGL model (`components/chest/chest-scene.ts`). Every finish becomes
matte; the crown inlay, piping and lock plate stay metallic gold. The finish keys stay the same, so
the catalogue does not change.

| Key | FLEXD finish | Boxes |
|---|---|---|
| `ivory` | lilac velvet | Vanity |
| `navy` | royal velvet | First Edition, The Flap Room |
| `sapphire` | amethyst velvet | Sun Club |
| `obsidian` | black velvet (ink with a purple cast) | The Atelier, The Time Room |
| `bronze` | plum velvet | Jewel Vault |
| `gold` | brushed gold, satin rather than mirror | Grail Reserve |

The six WebP stills in `public/boxes/` are re-rendered from the model with
`scripts/render_box_stills.py`, which updates `stills-version.ts`.

### Logo (placeholder)

- **Mark:** a gold crown above a masquerade mask, drawn as SVG after the PDF's mark. It is
  rasterised to `public/brand/flexd-mark.webp` because the chest lid uses the mark's alpha as its
  crown inlay, and `next/image` renders the foil version. The same SVG path replaces
  `SILHOUETTE_PATH` in `logo-mark.tsx` for the `solid` (ink) tone.
- **Wordmark:** "FLEXD" in Cinzel with wide tracking, set in type (no image).
- **Icons:** `app/icon.png` and `app/apple-icon.png` from the mark on ground.
- Grail Noir's mark and lockup files are removed from `flexd/public/brand/`.
- Replaced on 2026-10-15 by the client's crown-and-mask artwork, kept in gold (see `flexd/README.md`).

### Motion and sound

Unchanged from `play/`.

## Repository

- **Branch `flexd`**, cut from `origin/play` (the newest `play/`). It does not track `play`; it is
  pushed to `origin/flexd`. `main` and `play` are not touched.
- **`flexd/`** is a copy of `play/` (without `node_modules`, `.next` or local env files). `play/` and
  `web/` on this branch stay as they are.
- **`scripts/render_box_stills.py`** takes an optional app folder argument, default `play`, so the
  existing usage is unchanged: `python scripts/render_box_stills.py [base_url] [app]`.
- **`scripts/e2e_flexd.py`** is a copy of `scripts/e2e_play.py` with FLEXD wording and storage keys,
  without the light-mode step.
- **Docs:** `flexd/README.md` (what it is, commands, how it differs from `play/`); one line in the
  root `CLAUDE.md` listing the three sites; this spec.

## Verification

Not done until all of these pass, with evidence:

1. In `flexd/`: `npx vitest run`, `npx tsc --noEmit`, `npx eslint`, `npx next build`, all clean.
2. `scripts/e2e_flexd.py` against `npx next build && npx next start -p 3312`, at 1440×900 and
   390×844 plus reduced motion, through the Playwright 1.62 venv.
3. Frames viewed, not just logged: age gate, home and box page at 390 beside the three PDF screens;
   the opening sequence (drag, lid, reveal); every other page.
4. No leftover brand: `grep -riE "grail ?noir|grailnoir|go noir|burgundy"` over `flexd/src` and
   `flexd/public` returns nothing user-facing, and the frames show no burgundy.
5. Lighthouse mobile and desktop on the local production build (no live URL yet).
6. `play/` still builds and `scripts/render_box_stills.py` without the new argument still targets
   `play/`.

## Going live

- The `flexd` branch is pushed only after the user confirms.
- Someone in the `optinet-solutions-ais-andbox` Vercel team creates a third project from
  `optinet-solutions-sandbx/mysterybox` with **Root Directory `flexd`** and **Production Branch
  `flexd`**. No environment variables are required; the site URL comes from
  `VERCEL_PROJECT_PRODUCTION_URL`. The Vercel CLI on this machine has no access to that team.

## Out of scope

- A back office, Supabase accounts or the backend developer's box API for FLEXD (it keeps `play/`'s
  in-browser logic).
- A FLEXD catalogue, new boxes or new product photos.
- Light mode.
- Merging `flexd` into `main`.
