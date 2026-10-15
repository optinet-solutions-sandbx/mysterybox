import type { Cents } from "./types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** $1,234.50, dropping the cents when they are zero. */
export function formatUsd(cents: Cents): string {
  return cents % 100 === 0 ? usdWhole.format(cents / 100) : usd.format(cents / 100);
}

/** Always two decimals, for balances ($2,500.00). */
export function formatBalance(cents: Cents): string {
  return usd.format(cents / 100);
}

/** $950, $10.5k, $1.2M, for cards and tickers. */
export function formatUsdCompact(cents: Cents): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) < 1_000) return formatUsd(Math.round(cents));
  if (Math.abs(dollars) < 1_000_000) return `$${trim(dollars / 1_000)}k`;
  return `$${trim(dollars / 1_000_000)}M`;
}

function trim(n: number): string {
  return n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, "");
}

/** Displayed odds: rounded to 2 decimals and never shown as 0%; under 0.01% reads "<0.01%". */
export function formatDisplayedOdds(p: number): string {
  const pct = p * 100;
  if (pct > 0 && pct < 0.01) return "<0.01%";
  return `${Number(pct.toFixed(2))}%`;
}

/** "1 in 2,500" for a probability in (0, 1]. */
export function formatOneIn(p: number): string {
  if (!(p > 0)) return "never";
  return `1 in ${Math.round(1 / p).toLocaleString("en-US")}`;
}
