import type { ReactNode } from "react";
import type { ItemArtKey } from "@/domain/types";

/**
 * Engraved line drawings (viewBox 0 0 100 100) used until licensed product photography
 * exists. Strokes inherit the foil gradient from <ItemArt>; `f` marks a faint fill.
 */
export type ArtKey = ItemArtKey;

const f = "fill-[color:var(--art-fill)]";

/** Trig results differ in the last digits between Node and browsers; round so SSR and hydration agree. */
const r2 = (n: number) => Math.round(n * 100) / 100;

export const drawings: Record<ArtKey, ReactNode> = {
  watch: (
    <>
      <path d="M41 29 L43 9 Q50 6 57 9 L59 29" />
      <path d="M41 71 L43 91 Q50 94 57 91 L59 71" />
      <circle cx="50" cy="50" r="23" className={f} />
      <circle cx="50" cy="50" r="18.5" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        const r1 = i % 3 === 0 ? 13.5 : 15.5;
        return (
          <line
            key={i}
            x1={r2(50 + Math.sin(a) * r1)}
            y1={r2(50 - Math.cos(a) * r1)}
            x2={r2(50 + Math.sin(a) * 17.5)}
            y2={r2(50 - Math.cos(a) * 17.5)}
          />
        );
      })}
      <path d="M50 50 L50 37 M50 50 L59 54" strokeLinecap="round" />
      <circle cx="50" cy="50" r="1.4" />
      <rect x="72.5" y="46.5" width="4" height="7" rx="1" />
    </>
  ),
  smartwatch: (
    <>
      <path d="M38 27 L40 8 L60 8 L62 27 M38 73 L40 92 L60 92 L62 73" />
      <rect x="30" y="26" width="40" height="48" rx="11" className={f} />
      <rect x="35" y="31" width="30" height="38" rx="7" />
      <rect x="70" y="40" width="4" height="9" rx="1.5" />
      <path d="M43 50 L48 50 L50 44 L53 56 L55 50 L58 50" />
    </>
  ),
  "bag-flap": (
    <>
      <path d="M24 40 Q22 12 50 10 Q78 12 76 40" strokeDasharray="2.5 2" />
      <rect x="16" y="40" width="68" height="46" rx="6" className={f} />
      <path d="M16 48 Q50 72 84 48" />
      <path d="M26 58 L40 72 M40 58 L26 72 M60 58 L74 72 M74 58 L60 72" opacity="0.6" />
      <circle cx="50" cy="61" r="5" />
    </>
  ),
  "bag-top": (
    <>
      <path d="M34 44 Q34 18 50 18 Q66 18 66 44" />
      <path d="M38 44 Q38 24 50 24 Q62 24 62 44" />
      <path d="M18 44 L82 44 L88 88 L12 88 Z" className={f} />
      <path d="M18 44 L50 60 L82 44" />
      <rect x="45" y="60" width="10" height="11" rx="1.5" />
      <path d="M47 60 Q47 55 50 55 Q53 55 53 60" />
    </>
  ),
  "bag-tote": (
    <>
      <path d="M30 40 Q31 16 40 16 Q47 16 46 40 M54 40 Q53 16 60 16 Q69 16 70 40" />
      <path d="M16 40 L84 40 L77 88 L23 88 Z" className={f} />
      <path d="M16 40 L23 50 M84 40 L77 50" />
      <path d="M30 64 L70 64" opacity="0.5" />
    </>
  ),
  "bag-pouch": (
    <>
      <path d="M22 44 Q14 26 30 18 L70 18 Q86 26 78 44" strokeDasharray="2.5 2" />
      <rect x="16" y="42" width="68" height="40" rx="10" className={f} />
      <path d="M20 50 L80 50" />
      <rect x="66" y="47" width="8" height="5" rx="1" />
      <path d="M26 72 L74 72" opacity="0.4" />
    </>
  ),
  sneaker: (
    <>
      <path d="M8 74 L92 74 Q94 82 86 84 L14 84 Q6 82 8 74 Z" className={f} />
      <path d="M10 74 Q10 54 28 52 L44 49 Q50 38 60 40 L72 52 Q88 56 92 74" />
      <path d="M44 49 L52 62 M50 46 L58 59 M56 43 L64 56" />
      <path d="M22 66 Q46 58 70 66" opacity="0.55" />
      <path d="M8 78 L92 78" opacity="0.4" />
    </>
  ),
  ring: (
    <>
      <circle cx="50" cy="62" r="24" />
      <circle cx="50" cy="62" r="18.5" className={f} />
      <path d="M38 34 L44 24 L56 24 L62 34 L50 46 Z" className={f} />
      <path d="M38 34 L62 34 M44 24 L50 34 L56 24 M50 34 L50 46" opacity="0.7" />
    </>
  ),
  bracelet: (
    <>
      <ellipse cx="50" cy="52" rx="34" ry="20" className={f} />
      <ellipse cx="50" cy="52" rx="27" ry="13" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i * Math.PI) / 4;
        return <circle key={i} cx={r2(50 + Math.cos(a) * 30.5)} cy={r2(52 + Math.sin(a) * 16.5)} r="1.6" />;
      })}
    </>
  ),
  pendant: (
    <>
      <path d="M18 10 Q50 52 82 10" />
      <circle cx="50" cy="50" r="2" />
      <g className={f}>
        <circle cx="50" cy="60" r="8" />
        <circle cx="59" cy="69" r="8" />
        <circle cx="50" cy="78" r="8" />
        <circle cx="41" cy="69" r="8" />
      </g>
      <circle cx="50" cy="69" r="6" />
    </>
  ),
  phone: (
    <>
      <rect x="30" y="10" width="40" height="80" rx="9" className={f} />
      <rect x="35" y="16" width="16" height="16" rx="5" />
      <circle cx="40" cy="21" r="2.6" />
      <circle cx="46" cy="27" r="2.6" />
      <circle cx="46" cy="21" r="1.2" />
      <path d="M70 30 L72 30 L72 42 L70 42" />
    </>
  ),
  laptop: (
    <>
      <rect x="18" y="22" width="64" height="44" rx="4" className={f} />
      <rect x="23" y="27" width="54" height="34" rx="1.5" />
      <path d="M8 70 L92 70 L88 78 L12 78 Z" />
      <path d="M44 70 Q50 73 56 70" />
    </>
  ),
  headphones: (
    <>
      <path d="M22 60 Q20 16 50 16 Q80 16 78 60" />
      <path d="M27 58 Q26 24 50 24 Q74 24 73 58" opacity="0.5" />
      <rect x="14" y="54" width="16" height="28" rx="7" className={f} />
      <rect x="70" y="54" width="16" height="28" rx="7" className={f} />
    </>
  ),
  earbuds: (
    <>
      <rect x="26" y="34" width="48" height="44" rx="18" className={f} />
      <path d="M26 50 L74 50" />
      <circle cx="50" cy="64" r="2" />
      <path d="M36 34 Q36 20 44 22 L44 34 M64 34 Q64 20 56 22 L56 34" />
    </>
  ),
  controller: (
    <>
      <path d="M24 42 Q34 34 50 38 Q66 34 76 42 L86 70 Q88 82 76 78 L64 64 L36 64 L24 78 Q12 82 14 70 Z" className={f} />
      <path d="M30 48 L30 58 M25 53 L35 53" />
      <circle cx="68" cy="49" r="2.2" />
      <circle cx="74" cy="55" r="2.2" />
      <circle cx="62" cy="55" r="2.2" />
      <circle cx="68" cy="61" r="2.2" />
      <circle cx="42" cy="60" r="4" />
      <circle cx="58" cy="60" r="4" />
    </>
  ),
  perfume: (
    <>
      <rect x="38" y="12" width="24" height="16" rx="2" className={f} />
      <rect x="44" y="28" width="12" height="9" />
      <path d="M26 42 Q26 37 32 37 L68 37 Q74 37 74 42 L74 84 Q74 90 68 90 L32 90 Q26 90 26 84 Z" className={f} />
      <rect x="37" y="56" width="26" height="18" rx="1.5" />
      <path d="M42 63 L58 63 M45 68 L55 68" opacity="0.6" />
    </>
  ),
  sunglasses: (
    <>
      <path d="M10 42 L44 42 Q45 64 28 64 Q11 64 10 42 Z" className={f} />
      <path d="M56 42 L90 42 Q89 64 72 64 Q55 64 56 42 Z" className={f} />
      <path d="M44 46 Q50 41 56 46" />
      <path d="M10 42 L4 38 M90 42 L96 38" />
    </>
  ),
  belt: (
    <>
      <path d="M4 44 Q50 36 96 44 L96 58 Q50 50 4 58 Z" className={f} />
      <rect x="36" y="36" width="28" height="26" rx="4" />
      <rect x="41" y="41" width="18" height="16" rx="2" />
      <path d="M50 41 L50 57" />
    </>
  ),
  scarf: (
    <>
      <path d="M8 66 Q28 30 50 50 T92 34" />
      <path d="M8 74 Q28 38 50 58 T92 42" />
      <path d="M8 66 L8 74 M92 34 L92 42" />
      <path d="M22 60 Q30 50 38 54 M58 52 Q68 44 78 42" opacity="0.5" />
    </>
  ),
  card: (
    <>
      <rect x="18" y="30" width="64" height="42" rx="6" className={f} />
      <path d="M18 42 L82 42 M18 52 L82 52" />
      <path d="M44 42 Q50 47 56 42" />
    </>
  ),
  coin: (
    <>
      <circle cx="50" cy="50" r="32" className={f} />
      <circle cx="50" cy="50" r="26" />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * Math.PI) / 12;
        return <line key={i} x1={r2(50 + Math.cos(a) * 29)} y1={r2(50 + Math.sin(a) * 29)} x2={r2(50 + Math.cos(a) * 31)} y2={r2(50 + Math.sin(a) * 31)} />;
      })}
    </>
  ),
};
