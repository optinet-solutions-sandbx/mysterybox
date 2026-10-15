import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * Deterministic pseudo-random in [0, 1), rounded to 3 decimals: Math.sin differs in the last digits
 * between Node and browsers, and the browser also shortens long decimals in style attributes, so
 * unrounded values cause a hydration mismatch.
 */
function rand(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return Math.round((x - Math.floor(x)) * 1000) / 1000;
}

/** Motes of gold rising out of a light source. Pure CSS animation; stops under reduced motion. */
export function GoldDust({ count = 26, className }: { count?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute", className)}>
      {Array.from({ length: count }, (_, i) => {
        const size = `${(1.5 + rand(i, 1) * 3).toFixed(2)}px`;
        const style = {
          left: `${(rand(i, 2) * 100).toFixed(1)}%`,
          bottom: `${(rand(i, 3) * 20).toFixed(1)}%`,
          width: size,
          height: size,
          "--rise-duration": `${(4 + rand(i, 4) * 5).toFixed(2)}s`,
          "--rise-delay": `${(-rand(i, 5) * 9).toFixed(2)}s`,
          "--drift": `${((rand(i, 6) - 0.5) * 80).toFixed(1)}px`,
        } as CSSProperties;
        return (
          <span
            key={i}
            style={style}
            className="absolute animate-rise rounded-full bg-[var(--dust)] shadow-[0_0_6px_2px_rgb(226_196_127/0.55)]"
          />
        );
      })}
    </div>
  );
}
