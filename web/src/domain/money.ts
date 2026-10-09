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
