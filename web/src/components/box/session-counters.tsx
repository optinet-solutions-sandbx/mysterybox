import type { OpenResolved } from "@/box-api";
import { formatCredit, formatUsd } from "@/domain/money";

/** This visit to this box: what was paid and what came back (pieces at listed value, credit at $1). */
export function SessionCounters({ history }: { history: OpenResolved[] }) {
  const paid = history.reduce((s, r) => s + r.priceCents, 0);
  const credit = history.reduce((s, r) => s + r.creditsAwarded, 0);
  const pieces = history.filter((r) => r.outcome.kind === "item");
  const back = pieces.reduce((s, r) => s + (r.outcome.valueCents ?? 0), 0) + credit * 100;
  const stats: [string, string, string?][] = [
    ["Opens", String(history.length)],
    ["Paid", formatUsd(paid)],
    ["Credit received", formatCredit(credit)],
    ["Pieces", String(pieces.length)],
    ["Return", paid > 0 ? `${((back / paid) * 100).toFixed(1)}%` : "—", "Value back (pieces at listed value, credit at $1) divided by what you paid, this visit."],
  ];
  return (
    <dl aria-label="This visit" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-5">
      {stats.map(([label, value, hint]) => (
        <div key={label} className="bg-surface px-4 py-3" title={hint}>
          <dt className="text-xs font-semibold text-muted">{label}</dt>
          <dd className="mt-0.5 font-display text-lg font-semibold tabular">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
