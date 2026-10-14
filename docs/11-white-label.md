# 11 · Running the site without a developer: products, brands and niches

The site is built so that the things that change often never need code:

- **Products and boxes** are edited by staff in the back office, saved in Supabase, and shown on the
  site at once.
- **Brand and niche** (name, logo, colours, fonts, slogan, product categories) live in one folder per
  brand: a *brand pack*. Switching brands is one setting.

Layout, animation, the 3D box, the odds and fairness logic, and the back office are shared by every
brand.

## Add or change products (back office)

Needs a staff account (admin or super admin) and, on the server, `NEXT_PUBLIC_CATALOG=supabase`
(on in production since 2026-10-14). Without it, Items and Boxes are read-only views of the built-in
catalogue.

### Items: Back office → Boxes → Items

1. **Add item.** Fill in the brand, name, category and listed value. The value drives the odds
   maths, the return and the trade-in amount, so use the real retail value.
2. **Upload photo.** Any PNG, WebP or JPEG. The browser trims empty edges, scales it down and
   uploads it, so every piece shows at the same visual size. Use a **cut-out on a transparent
   background**; the form warns you if the photo has a solid background. Without a photo the site
   shows the category's line drawing.
3. **Save.** The item ID is made from the brand and name and can't change later.
4. **Credit outcomes** use the category *Credit*: the value is the credit amount, and you can add
   free spins (one free spin replays the box for credit).
5. **Retire** an item by unticking *Active*. Players who own it still see it; it can't go into new
   boxes.

Changing an item's value changes the return of every box that contains it. Check those boxes after
saving.

### Boxes: Back office → Boxes → Boxes & odds → New box (or Configure)

1. **Details:** name, tagline, category (or *Mixed*), finish (leather colour), featured on the home
   page.
2. **Odds:** add items one by one. The draw walks them in the order shown. Type a weight per item:
   the weights must add up to **100,000** (each 1,000 is 1%). **Scale weights to 100,000** keeps
   your proportions and fixes the total.
3. **Price:** the Return panel shows what the box pays back per open and its return. **Use the target
   price** sets the price for the target return (90% today, `config/economy.ts`). If the box has
   free-spin outcomes, its free-spin table is created from the price automatically.
4. **Create draft** saves without showing it. **Save and publish** puts it on the site; the database
   re-checks that the weights add up.
5. **A live box's price, free-spin table and odds are frozen** (the database refuses changes), so
   what players see always matches what the draw uses. To change them: **Unpublish to edit**,
   change, publish again. **Retire** removes a box from the site but keeps its history.

## Rebrand or start a new niche (brand pack)

A brand pack is a folder: `web/public/brands/<id>/`.

| File | What it is |
|---|---|
| `brand.json` | Everything brand-specific (below). Editors such as VS Code autocomplete and check it against `brand.schema.json`. |
| `mark.webp` | The logo symbol on a transparent background. |
| `lockup.webp` | Optional: the full logo (symbol and name) for the footer. Without it the footer uses the mark. |
| `icon.png`, `apple-icon.png` | Browser tab icon (square, e.g. 512×512) and home-screen icon (180×180). |

### Steps

1. In `web/`, run `npm run brand:new -- velvet "Velvet Drop"`. This copies the default pack to
   `public/brands/velvet/` with the new name and placeholder domain and email.
2. Replace `mark.webp`, `icon.png` and `apple-icon.png` with the new logo. Put the mark's pixel width
   and height in `brand.json` → `logo`.
3. Edit `brand.json`:

   | Field | Where it shows |
   |---|---|
   | `name`, `domain`, `supportEmail`, `legalEntity`, `minimumAge`, `market` | Header, page titles, footer, legal lines. |
   | `tagline`, `taglineLines` | The slogan: page titles; the hero and footer as two lines (setup, then the large punchline). |
   | `descriptor`, `description`, `sideline` | Hero line, footer and search engines, the side of the 3D box. |
   | `fonts` | `inscription` (Cinzel + Jost, engraved capitals), `editorial` (Playfair Display + Source Sans 3) or `modern` (Sora + Manrope). |
   | `categories` | The niche's product categories, in display order. Each has an `id` (lowercase, dashes), a `label`, a line `drawing` for products without a photo, and `showcase: true` to feature it in the home-page hero. `credit` and `mixed` are built in. |
   | `themeColor`, `theme.dark`, `theme.light` | Phone toolbar colour and every colour token. `dark` is the base; `light` overrides it in light mode. Change the palette (`--obsidian`, `--navy`, `--indigo`, `--sapphire`, `--gold`, `--ivory`) and the foil stops (`--foil-1` … `--foil-5`, `--foil-btn`) first; most other tokens are mixed from those. |

4. Set `NEXT_PUBLIC_BRAND=velvet`: in `web/.env.local` to preview with `npm run dev`, and in Vercel
   (Project → Settings → Environment Variables) for the live site, then redeploy.
5. `npm run brands` (it also runs before every `dev` and `build`) checks every pack and stops with a
   plain message if a field, file or category is wrong.

### A new niche

A niche is a brand pack with its own categories (e.g. `sneakers`, `streetwear`). The database accepts
any category id, so no migration is needed. Then add the niche's products and boxes in the back
office. Line drawings exist for: watch, smartwatch, bag-flap, bag-top, bag-tote, bag-pouch, sneaker,
ring, bracelet, pendant, phone, laptop, headphones, earbuds, controller, perfume, sunglasses, belt,
scarf, card, coin.

### A second live brand

The catalogue lives in the database, so **one Supabase project per brand**. For a second site next to
Grail Noir:

1. Create a Supabase project and apply the schema (docs/08, checklist steps 1–3). Skip `seed.sql`
   unless you want Grail Noir's catalogue as a start.
2. Create a second Vercel project from the same repository with that project's keys,
   `NEXT_PUBLIC_BRAND=<id>`, `NEXT_PUBLIC_ACCOUNTS=supabase` and `NEXT_PUBLIC_CATALOG=supabase`.
3. Provision its staff (`scripts/provision_staff.mjs`), sign in to `/admin` and add products.

## Switches (environment variables)

| Variable | Values | Controls |
|---|---|---|
| `NEXT_PUBLIC_BRAND` | a pack id (default `grailnoir`) | Which brand pack the site shows. |
| `NEXT_PUBLIC_CATALOG` | `supabase` or empty | Catalogue from the database with back-office editing, or the built-in catalogue (read-only). |
| `NEXT_PUBLIC_ACCOUNTS` | `supabase` or empty | Accounts on Supabase, or in the browser (mock). |
| `NEXT_PUBLIC_BACKEND` | `mock` or `api` | The box system: in the browser, or the backend developer's server. |
| `NEXT_PUBLIC_REFERENCE_IMAGES` | `on` / `off` | The borrowed product photos of the built-in catalogue (CLAUDE.md rule 9). Photos uploaded in the back office are not affected. |
| `NEXT_PUBLIC_SHOW_ANALYSIS`, `NEXT_PUBLIC_DEMO_PLAYERS` | `on` / `off` | Box-page maths section; generated sample players in the back office. |

## Still needs a developer

- New page layouts, sections or animations, and new line drawings or font pairs.
- The 3D box's leather finishes (obsidian, navy, sapphire, ivory, gold) are shared by all brands.
- Marble textures: a pack can point `--marble-img` at its own file, but the default files are Grail
  Noir's.
- Economy settings that are shown to players (target return, trade-in rate) change with a release.
- Payments, the email provider and the box system's live API.

## How it's built (for developers)

- `web/scripts/brands.mjs` validates the packs and writes `src/config/brands.generated.ts` (an import
  per pack, committed). `src/config/brand-pack.ts` picks the active pack, and exposes
  `categoryLabel()`, `productCategories`, `brandAsset()` and `themeCss()`. `config/brand.ts` keeps its
  old shape, derived from the pack.
- The layout injects the pack's colours (`themeCss`) after `globals.css`, whose values stay as
  fallbacks. Fonts come from `src/app/fonts.ts`; only the inscription pair is preloaded.
- Categories are plain strings (`domain/types.ts`). In the database they are `text` with a format
  check (migration `20261014120000_catalog_editing.sql`, which also adds `items.free_spins`,
  `items.image_aspect`, `boxes.bonus`, the price freeze and the `catalog` storage bucket).
- `services/catalog-rows.ts` maps database rows for both the site and the back office. Every
  function in `services/catalog.ts` reads the active catalogue, which is the database one when
  switched on, so the box system prices and draws newly added boxes too.
- `domain/box-pricing.ts` (`priceBox`, `freeSpinTable`) prices the built-in boxes and the back-office
  editor the same way. `schema.test.ts` checks that the database copy gives identical tables and maths.
