# Motion spec

Motion is the reason this project exists. The first skeleton was rejected as "a normal AI-generated
website". The lesson from icybox still holds: **one vocabulary, used with restraint**. That means one
easing curve, springs only for numbers and reveals, one "toy" per section, every loop paused
off-screen, and a reduced-motion path for everything.

Libraries:
- **Motion 14** (`motion/react`) for all animation.
- **Lenis** for inertial scrolling, so scroll-scrubbed scenes stay smooth on Windows mouse wheels.
- CSS keyframes for infinite strips and gold dust.

## Vocabulary

| Token | Value | Use |
|---|---|---|
| `ease-snap` | `cubic-bezier(0.22, 1, 0.36, 1)` | All UI transitions, line reveals, the lid |
| `ease-reel` | `cubic-bezier(0.08, 0.82, 0.17, 1)` | Reel deceleration |
| Lid spring | stiffness 85, damping 15 | `Box3D` open/close (numbers are sprung; MotionValues are smoothed) |
| Reveal spring | stiffness 110, damping 14 | The item plate turning in |
| Digit spring | stiffness 380, damping 34 | `RollingNumber` |
| Press | scale 0.97 | Buttons |

## Built (2026-10-09)

| Where | The "toy" | Implementation |
|---|---|---|
| **Hero** | The one orchestrated load moment: "More than / a box." rises out of masks; the box settles; at 1.5 s the lid opens with a light beam and gold dust, and a real piece (photo, brand, price) springs out. Then it loops (3.6 s open, 0.9 s closed) through Bags, Watches, Jewelry and Beauty. The box tilts toward the pointer and floats | `Hero`, `LineReveal`, `Box3D` (`tilt`, `float`) |
| **Vault strip** | Two rows of pieces drift in opposite directions; scrolling surges them and flips their direction | `VaultMarquee`: `useScroll` → `useVelocity` → spring → `useAnimationFrame` + `wrap` |
| **Ritual** (pinned, 340vh) | Scroll drives the box: it turns to face you (I), the lid lifts and a Kelly rises (II), then "Ship it to me" and "Sell back · $31,050" appear (III). The step list and a gold progress line follow | `Ritual`: `useScroll` on the section → `useTransform` into `Box3D` `open`, `viewX`, `viewY` |
| **Tier shelf** | Eight boxes in their finishes on a spotlit shelf; the lit box sits ajar; it auto-turns every 3.4 s while visible and not hovered; the price rolls digit by digit | `TierShelf`, `RollingNumber foil` |
| **Odds proof** | A real box's odds drawn as gold bars (log scale) that grow in view; the economy numbers count up | `OddsProof`, `CountUp foil` |
| **Modes** | Rows rather than cards; a sapphire light follows the pointer; the title slides | `Modes` (CSS variables from `pointermove`) |
| **FAQ** | Height-animated accordion; the "+" rotates into "×" | `Faq` |
| **Keyhole** (pinned, 300vh) | The lid fills the screen (foil M, keyhole escutcheon). Scrolling zooms through the keyhole (cubic ease to 42×) into the lit interior, where "What's in yours?" waits. Light shows through the hole from the first frame | `Keyhole`: masked SVG + `useScroll` |
| **Header** | Transparent over the hero, smoked glass after 24px, hides while reading down | `SiteHeader` |
| **Cursor** | A gold ring that swells into a label ("Open", "Tilt", "Preview") over `data-cursor` targets; fine pointers only | `Cursor` |
| **Catalog** | Filter and sort re-flow with shared layout; each card's lid lifts with light on hover | `BoxCatalog`, `BoxCard` |
| **Box page** | **The core moment:** Open → the box trembles while the draw is made (at least 0.8 s) → the lid bursts open with light as the drum reel spins below (6 s; tiles turn and shrink toward the edges; velocity blur; Skip available) → the winner glows | `BoxStage`, `Reel` (`DrumTile` with `rotateY` and `scale` from position) |
| **Reveal** | Full screen: rarity-colored rays turn slowly, a 28-spark burst, a white-gold flash for epic/legendary, the plate turns in from −95°, rarity and name rise, the value counts up in foil, then the actions | `RevealOverlay` |

## Reduced motion

- **Reel:** duration 0, and Skip is moot.
- **Hero:** no loop; the box stays open.
- **Ritual:** unpinned and fully open.
- **Keyhole:** unpinned, showing the CTA.
- **Reveal:** no rays, burst or flip.
- **Smooth scroll:** off.
- **Count-ups:** final value only.
- **Cursor:** off.

A global CSS rule also clamps CSS animations.

## Next (Phase 2b)

1. **Battle room:** synced multi-reel spin, running totals ticking on springs, and a winner takeover.
2. **Deals dial:** a chance arc you drag; the price rolls live; the needle sweeps on Open.
3. **Real "recent reveals" filmstrip**, from real or clearly labeled demo data only.
4. **Page transitions:** a lid-close / lid-open wipe between routes.
5. **Hero:** let the visitor press the box to open it, not just watch it loop.

## Performance budget

- Animate only `transform`, `opacity` and `filter` (the reel blur only).
- No opacity, filter or overflow on `preserve-3d` containers.
- Use radial gradients instead of large blurs.
- Pause loops off-screen (`useInView`).
- About 10 `Box3D` instances on the landing page is fine; measure before adding more per view.
- Targets: 60 fps on a mid-range laptop and a Lighthouse performance score of at least 85 on landing.
  This is **not measured yet**.
