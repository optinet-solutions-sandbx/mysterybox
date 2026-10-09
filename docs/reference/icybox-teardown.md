> Captured 2026-10-09 by a research agent (curl + Playwright). Reference for **feel and pacing only**. Nothing here (copy, assets, colors, fonts) may be reused. Selected frames: [icybox-frames/](icybox-frames/). The full 64-frame capture and DOM probe logs were kept outside the repo. Re-capture if needed.

# icybox.io: design and motion teardown

Captured 2026-10-09 with curl, Playwright (Chromium) and a read of the minified JS and CSS. Statements come from that code or from the screenshots unless marked **guess**. We are studying the feel only: none of their colors, copy, fonts or assets are to be reused.

## 1. Stack (with evidence)

- **Next.js 16.3.5, App Router, Turbopack.** Evidence: `window.next={version:"16.3.5",appDir:!0}`, `/_next/static/chunks/turbopack-0g1od-lycx1ss.js`, `/_next/image?url=…`.
- **Motion (the framer-motion API)** drives every animation. Evidence: `MotionConfig`, `framerAppearId`, `useScroll`, `useSpring`, `useAnimationFrame`, `AnimatePresence`, `whileInView` in `/_next/static/chunks/204jfmvmws4la.js`.
- **Tailwind v4.** Evidence: `--spacing:.25rem`, `@property --tw-*` and `lab()` colors in `/_next/static/chunks/18zo3s5wmcvmc.css`.
- **shadcn-style UI on Base UI.** Evidence: `data-slot="button|accordion"`, `id="base-ui-…"`, lucide icons.
- **WebGL2 shader for the CTA rim-light.** The `SpecularButton` GLSL uses `sdRoundedRect`. The renderer appears to be **OGL** (**guess**: its signature matches OGL's Renderer).
- **Liquid-glass footer.** `GlassCard` is loaded client-only with `displacementScale:48, saturation:140, aberrationIntensity:1.5`. Those props match the `liquid-glass-react` package (**guess**).
- **Fonts** are self-hosted through next/font: `<html class="manrope_… specialgothic_… doto_… inter_… jetbrains_mono_… dm_mono_… poppins_…">`.
- **Analytics:** GTM `G-8FWQ703QNY`.
- **Not found:** GSAP, ScrollTrigger, Lenis (scrolling is native), Lottie, Rive, three.js, Spline, the Framer site builder, Webflow.

**The hero phone is DOM, not video or canvas.** It is two static WebP screenshots (`/assets/hero/watches.webp`, `bags.webp`) that crossfade over 300 ms, with an `<img>` cursor animated on top. The DOM probes on the burst frames show the cursor `left` moving 37% → 67% while the image opacities flip. The only canvas on the page is the CTA shader.

**Real `<video>` appears in one place only:** the UGC reel (`/assets/unboxes/01–05.mp4`, muted, looped, inline). The clips play only when within 200 px of the viewport. They show as grey tiles in the screenshots because Playwright's Chromium cannot play H.264.

## 2. Section inventory (top to bottom)

**Global behavior**
- Every section fades up 40 px over 0.8 s with a 0.3 s delay (`whileInView`, fires once, when 30% into the viewport).
- One easing curve is used everywhere: `[0.22, 1, 0.36, 1]`.
- **Custom pixel-arrow cursor** (fine pointers only). It squishes to 0.85 on press. Over the hero phone it rescales to match the demo cursor, so the real cursor "becomes" the demo cursor.
- Every loop pauses when off-screen or when the tab is hidden.
- Every effect has a `prefers-reduced-motion` fallback.
- An **exit-intent "Get 10% off" email dialog** exists in the code but is set to `enabled:false`.

**0. Header**
- **Desktop:** a fixed, floating dark pill nav (`#262626`, radius 16). It has a fading 1 px gradient border and nudges up 8 px on scroll.
- **"Get the app" CTA:** a WebGL **specular rim-light** runs around the pill. Its angle follows the pointer within 250 px. The button also has a hover scale of 1.03 and an active scale of 0.97.

**1. Hero**
- **Background:** a vertical sky gradient.
- **Headline:** white, condensed and uppercase, "THE NEW WAY TO GET YOUR HANDS ON LUXURY", with the subline "Pick a box, open it, keep it or sell it back."
- **Load sequence:**
  1. The text rises 30 px.
  2. The phone rises 60 px at 0.35 s.
  3. The product strip appears at 0.7 s.
- **Phone demo loop** (about 3 s):
  1. The scripted cursor glides to the other tab (0.7 s).
  2. It "clicks" with a scale of 0.85.
  3. The screenshot crossfades.
- The phone is interactive: hovering hides the scripted cursor, and clicking a tab switches the category. Its bottom fades out through a `mask-image`.
- **Infinite product-card marquee** behind the phone:
  - It runs on a requestAnimationFrame drift with a loop of about 50 s, and the strip is duplicated for a seamless wrap.
  - When the category changes, cards swap in a **left-to-right wave**: a per-card delay of 0–240 ms by x position, with a scale 0.96 plus opacity crossfade.
  - Cards are 55% translucent white. Prices are set in mono ("$250.0k").

**2. "Unboxed on screen, delivered to your door"**
- A row of portrait video cards (308×465, radius 16).
- The row moves horizontally with **scroll**, not on an auto-loop: `useScroll` is spring-smoothed (stiffness 140, damping 30) and translates the row by up to 2.5 tiles.

**3. "IcyBox makes owning luxury simple": sticky stacked cards**
- Three 619 px cards, each `position:sticky; top:0; height:100svh`, so each card slides over the previous one. This is pure CSS.
- **"Pick a box":**
  - An automatic **tier carousel** of five 3D-rendered chests cycles every 3.15 s. They move through vertical slots (horizontal on mobile) at scales 0.55 / 0.72 / 1.
  - A white price pill morphs its width (`layout`) while the price **rolls** vertically.
  - A strip of example items slides in from the right with a 60 ms stagger.
- **"Unbox it":** three phone renders fly from a stack into a fan (0.9–1.1 s, staggered). They then **float** idly: 8–12 px bob and ±0.8° rotation on 5.5–7 s loops.
- **"Keep it, sell it, ship it":** an animated WebP of a shipping "Success" screen.
- The H3s are very large (68–72 px), and the body copy is **32 px muted grey**.

**4. "More than a box": three cards**
- **Drops:** a red countdown pill loops 10 s → 0. Each digit rolls on a spring (stiffness 420, damping 34), and a ring pulses outward every tick.
- **Growing catalog:** a blue gradient card with dot-matrix **dashed SVG pills** reading "WATCHES / BAGS / ???".
- **Access:** a grid of product tiles around an unlocked-padlock disc.

**5. "Real pieces, real numbers"**
- Four outlined tiles: a laurel rating of 4.3, "75K+ grails pulled", "3,500+" and a black App Store tile that scales up on hover.
- The numbers **count up** over 1.6 s with tabular figures. An invisible copy of the final value reserves the width so the layout doesn't shift.

**6. Pinned "pill zoom" into the final CTA** (a 400 svh section with a sticky 100 svh stage)
1. **0–30% of scroll:** 15 rows of white dashed pills slide sideways in alternating directions.
2. **30–68%:** the camera **zooms into the "ICYBOX" pill** nearest the center. The transform origin is computed live, and the scale grows exponentially with easeInOut.
3. The pill fills the screen and a white overlay snaps on.
4. **62–82%:** "What will you unbox?" (92 px), the CTA and a QR code scale from 0.75 → 1.

**7. FAQ**
- White Inter text on brand blue, "+" icons, a Base UI accordion and a "Show all" pill.

**8. Footer**
- A liquid-glass card with a full-width italic wordmark, links, socials and an App Store badge.

**Copy tone:** short, plain and confident, in the second person. It uses imperative triplets ("Keep it, sell it, ship it") and collector slang ("grails pulled"). There are almost no adjectives.

## 3. Typography

| Role | Font and style | Size |
|---|---|---|
| Display (H1 only) | **Special Gothic** variable at `font-stretch:75%`, bold, uppercase, line-height 0.8, tracking −0.01em | 48 / 72 / 117.6 px |
| H2 | Manrope 600, line-height 0.99, tracking −0.02em | 34 → 56 px (CTA 92 px) |
| Card H3 | Manrope 700 | 32 → 72 px |
| Body | Manrope 600–700, tracking −0.03em | 15–20 px (card body 32 px) |
| Prices | JetBrains Mono 700 with slashed zero | 14–28 px |
| Pills | Doto (dot-matrix) 800 | 42 px |
| Stats / FAQ | Poppins 600 / Inter 500 (+0.02em) | 28–40 / 17–24 px |

Fractional sizes such as 117.56 px suggest the values were copied straight from Figma (**guess**).

## 4. Color (reference only)

| Token | Value |
|---|---|
| Brand | `#0532ff` |
| Sky gradient | `#012fff → #4667ff → #acc6ff → #d6e6f2 → #fff` |
| Ink / surface | `#000` / `#fff` |
| Nav and CTA | `#101010` / `#262626` |
| Muted | `#9e9e9e` |
| Cards | `#efefef` |
| Hairline | `#dfdfdf` |
| Danger (timer) | `#f62451` |
| Success | `#22c97b` |

The energy comes from one saturated accent against large white fields. Black is used only for CTAs and the nav.

## 5. Mobile (390×844)

- **Header:** a static dark top bar replaces the floating pill. The pill slides in only after the hero has scrolled out.
- **Hero:** the H1 wraps to 3 lines and the product cards shrink to about 72 px.
- **Tier carousel:** runs horizontally, with the text above the visual. The visual canvases scale down to fit.
- **"More than a box":** becomes a scroll-snap swipe carousel (85% width) with arrows and a dot pager whose active dot widens.
- **Stats:** a 2×2 grid.
- **Pill zoom:** kept, with smaller pills.
- **Turned off on touch:** the custom cursor and the specular pointer-follow.
- **Page height:** about 9,850 px on mobile versus about 11,890 px on desktop.

## 6. What makes it feel premium

1. **One accent color, used with restraint,** against generous white space.
2. **Specificity:** real cut-out grails with exact prices in mono, everywhere.
3. **One motion vocabulary:** the same ease and timing everywhere, with springs reserved for numbers. Nothing bounces for show.
4. **One "toy" per section** (demo cursor, tier carousel, countdown, count-up, zoom). Toys never compete.
5. **Extreme type contrast:** a 117 px condensed H1 against small body text.
6. **Invisible craft:** the shader rim-light, liquid glass, dashed borders computed per pixel, and the cursor hand-off into the demo.
7. **Performance discipline:** off-screen loops pause, video is lazy and every effect has a reduced-motion path. The page feels smooth, not heavy.

## 7. Patterns to reinterpret originally

| Their effect | Original alternative for our luxury mystery box |
|---|---|
| Phone mockup with scripted cursor | Our **web reveal** as the hero: a sealed box opens on a loop (lid lifts, light bloom, spec card rises), driven by Bags / Watches / Sneakers chips |
| Marquee with wave swap | A **vault-wall grid** that re-sorts with shared-layout (FLIP) motion when the filter changes |
| Scroll-linked UGC reel | A **"Recent reveals" filmstrip** with value-delta badges ("$250 → $1,900"), built from our own captures |
| Sticky stacked steps | **One pinned box** that progresses Pick → Open → Keep/Sell, with the lid angle tied to scroll |
| Tier carousel and rolling price pill | A **spotlit tier shelf** in our own materials (walnut, carbon, onyx, gold leaf) with split-flap prices |
| Fanned floating phones | **Authenticity certificate cards** (serial, retail value) dealt like a hand |
| Countdown with digit roll | A **watch-bezel ring** timer or a Solari split-flap drop board |
| Pill wall zooming into the logo | A **keyhole dive**: scroll pushes the camera through a vault-door keyhole into the CTA |
| Count-up stats with laurels | **Odometer serif numerals** and authentication-partner proof |
| WebGL rim-light CTA | A **metallic-foil sheen** done in CSS (conic gradient following the pointer) |
| Liquid-glass footer | A **smoked-glass or lacquer panel** with an embossed wordmark |
| Pixel cursor | Optional: a **gold ring** that becomes "Open" over boxes |
| Sky gradients and a condensed sans | Our own palette ("vault lighting", ink to champagne) and a serif display, grotesk and tabular mono |

## 8. Artifacts

- `raw/` (not kept): downloaded HTML, CSS and JS (untrusted, never executed)
- `shots/` (6 frames kept in icybox-frames/): screenshots plus `*-log.json` DOM probes recording, per frame: videos, canvases, marquee transform and cursor position
- `scripts/` (not kept): the capture and extraction scripts
