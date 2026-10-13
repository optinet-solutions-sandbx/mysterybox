import type { Cents } from "./types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** $1,234.50 — drops the cents when they are zero. */
export function formatUsd(cents: Cents): string {
  return cents % 100 === 0 ? usdWhole.format(cents / 100) : usd.format(cents / 100);
}

/** $950, $10.5k, $1.2M — for cards and tickers. */
export function formatUsdCompact(cents: Cents): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) < 1_000) return formatUsd(Math.round(cents));
  if (Math.abs(dollars) < 1_000_000) return `$${trim(dollars / 1_000)}k`;
  return `$${trim(dollars / 1_000_000)}M`;
}

function trim(n: number): string {
  return n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, "");
}

/** 0.0123 → "1.23%", tiny values keep enough digits to stay non-zero. */
export function formatProbability(p: number): string {
  if (p === 0) return "0%";
  const pct = p * 100;
  const digits = pct >= 10 ? 1 : pct >= 1 ? 2 : pct >= 0.01 ? 3 : 4;
  return `${pct.toFixed(digits).replace(/\.?0+$/, "")}%`;
}

/**
 * Displayed odds (what players see on cards and the box page): rounded to 2 decimals and never
 * shown as 0%; anything under 0.01% reads "<0.01%".
 */
export function formatDisplayedOdds(p: number): string {
  const pct = p * 100;
  if (pct > 0 && pct < 0.01) return "<0.01%";
  return `${Number(pct.toFixed(2))}%`;
}

/** Back-office odds: the exact configured probability, always 3 decimals (e.g. "0.040%"). */
export function formatExactOdds(p: number): string {
  return `${(p * 100).toFixed(3)}%`;
}

const trimZeros = (s: string) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);

/**
 * Box API odds, which arrive as percents (0–100): 2 decimals from 10% up, otherwise 3 significant
 * digits, so a rare piece reads "0.00405%", never "0%" or "<0.01%".
 */
export function formatPercent(pct: number): string {
  if (pct === 0) return "0%";
  return `${trimZeros(pct >= 10 ? pct.toFixed(2) : pct.toPrecision(3))}%`;
}

/** The stored percent itself, to at most 8 decimals (the backend's numeric(12,8)). */
export function formatExactPercent(pct: number): string {
  return `${trimZeros(pct.toFixed(8))}%`;
}

/** "1 in 24,691": 100 divided by the percent, rounded. */
export function formatOneIn(pct: number): string {
  if (!(pct > 0)) return "never";
  return `1 in ${Math.round(100 / pct).toLocaleString("en-US")}`;
}

/** Site credit counts 1 credit = $1 on screen; it buys boxes and can't be withdrawn. */
export function formatCredit(credits: number): string {
  return `${formatUsd(Math.round(credits * 100))} credit`;
}
