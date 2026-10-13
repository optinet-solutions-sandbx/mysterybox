"use client";

import { useState, type ReactNode } from "react";
import { boxApi, type OpenResolved } from "@/box-api";
import { bands, verifyOpen, type VerifyResult } from "@/engine/draw";
import { formatCredit, formatPercent, formatUsd } from "@/domain/money";
import type { CatalogBox } from "@/services/catalog";
import { Button } from "@/components/ui/button";

/** Shown to players unless NEXT_PUBLIC_SHOW_ANALYSIS=off (part (a) shows the operator's margin). */
export const SHOW_ANALYSIS = process.env.NEXT_PUBLIC_SHOW_ANALYSIS !== "off";

const cents = (c: number) => formatUsd(Math.round(c));

/** After an open: the maths of the box, how this result was decided, and whether it checks out. */
export function BoxAnalysis({ box, last }: { box: CatalogBox; last: OpenResolved }) {
  const { maths } = box;
  const band = bands(box.outcomes).find((b) => b.entry.id === last.outcome.id);
  const worth = last.outcome.kind === "item" ? formatUsd(last.outcome.valueCents ?? 0) : formatCredit(last.creditsAwarded);

  return (
    <section aria-labelledby="analysis" className="mt-8">
      <h2 id="analysis" className="font-display text-2xl font-semibold">
        Analysis
      </h2>
      <div className="mt-4 grid gap-3">
        <Section title="The maths of this box">
          <table className="w-full table-fixed text-left text-xs sm:text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-1.5 pr-2 font-semibold">Outcome</th>
                <th className="w-24 py-1.5 text-right font-semibold sm:w-32">Worth × chance</th>
                <th className="w-20 py-1.5 text-right font-semibold sm:w-28">Per open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {maths.rows.map((r) => (
                <tr key={r.id}>
                  <td className="truncate py-1.5 pr-2" title={r.label}>
                    {r.label}
                  </td>
                  <td className="py-1.5 text-right text-muted tabular">
                    {cents(r.worthCents)} × {formatPercent(r.percent)}
                  </td>
                  <td className="py-1.5 text-right tabular">{cents(r.costCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-semibold">
              <tr className="border-t border-line">
                <td className="pt-2" colSpan={2}>
                  Pays back per open
                </td>
                <td className="pt-2 text-right tabular">{cents(maths.payFaceCents)}</td>
              </tr>
              <tr>
                <td colSpan={2}>Price</td>
                <td className="text-right tabular">{formatUsd(box.priceCents)}</td>
              </tr>
              <tr>
                <td colSpan={2}>Kept per open ({(100 - maths.returnFace * 100).toFixed(1)}%)</td>
                <td className="text-right tabular">{cents(box.priceCents - maths.payFaceCents)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-3 text-xs text-subtle">Credit counts at $1 per credit; a free spin counts at its table&rsquo;s average ({formatCredit(Number(maths.bonusEvCredits.toFixed(2)))}).</p>
        </Section>

        <Section title="How this result was decided">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            <li>You paid {formatUsd(last.priceCents)}.</li>
            <li>Your roll landed at {(last.roll * 100).toFixed(4)} on a line from 0 to 100.</li>
            {band && (
              <li>
                That is inside the band from {band.from.toFixed(3)} to {band.to.toFixed(3)}, which belongs to {last.outcome.label} ({formatPercent(last.outcome.percent)} wide).
              </li>
            )}
            {last.bonusSpins.length > 0 && (
              <li>
                It carried {last.bonusSpins.length === 1 ? "a free spin" : `${last.bonusSpins.length} free spins`}: {last.bonusSpins.map((b) => `+${formatCredit(b.credits)}`).join(", ")}.
              </li>
            )}
            <li>It is worth {worth}.</li>
          </ol>
        </Section>

        <Section title="Was it fair">
          <FairCheck box={box} last={last} />
        </Section>
      </div>
    </section>
  );
}

function FairCheck({ box, last }: { box: CatalogBox; last: OpenResolved }) {
  const [state, setState] = useState<{ local: VerifyResult; api: VerifyResult | null; error: string | null } | null>(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    // The table frozen onto this open (by its hash), not today's catalogue.
    const pinned = await boxApi.getTable(last.tableHash).catch(() => null);
    const spinsOf = new Map(box.outcomes.map((o) => [o.id, o.freeSpins]));
    const table = pinned ? pinned.entries.map((e) => ({ ...e, freeSpins: spinsOf.get(e.id) ?? 0 })) : box.outcomes;
    const bonusCredits = last.bonusSpins.map((b) => b.credits);
    const local = await verifyOpen({
      slug: last.boxSlug,
      priceDollars: (pinned?.priceCents ?? box.priceCents) / 100,
      serverSeed: last.serverSeed,
      clientSeed: last.clientSeed,
      serverHash: last.serverHash,
      tableHash: last.tableHash,
      table,
      bonus: box.bonus,
      bonusHash: last.bonusHash,
      outcomeId: last.outcome.id,
      bonusCredits,
    });
    try {
      const api = await boxApi.verify({ slug: last.boxSlug, serverSeed: last.serverSeed, clientSeed: last.clientSeed, tableHash: last.tableHash, bonusHash: last.bonusHash, serverHash: last.serverHash, outcomeId: last.outcome.id, bonusCredits });
      setState({ local, api, error: null });
    } catch {
      setState({ local, api: null, error: "The server check didn't answer; the check in your browser stands on its own." });
    } finally {
      setChecking(false);
    }
  }

  const ok = state && state.local.ok && (state.api ? state.api.ok && state.api.digest === state.local.digest : true);
  return (
    <div className="text-sm">
      <p>
        <span className="font-semibold">What this proves:</span> the secret was fixed before you paid and the roll comes from it, so the result
        wasn&rsquo;t changed afterwards.
      </p>
      <p className="mt-1">
        <span className="font-semibold">What it doesn&rsquo;t prove:</span> that every player gets the same table.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => void check()} disabled={checking}>
          {checking ? "Checking…" : "Check this open"}
        </Button>
        {state && (
          <p role="status" className={ok ? "font-semibold text-success" : "font-semibold text-danger"}>
            {ok ? "Matches: your browser got the same roll, outcome and free spins." : `Doesn't match: ${state.local.reason ?? state.api?.reason ?? "the results differ"}`}
          </p>
        )}
      </div>
      {state?.error && <p className="mt-2 text-xs text-subtle">{state.error}</p>}
      <details className="mt-4 rounded-xl bg-surface-2 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-muted">Technical values</summary>
        <dl className="mt-3 grid gap-2 font-mono text-[11px] break-all">
          <Value label="Seal (server hash)">{last.serverHash}</Value>
          <Value label="Secret (server seed)">{last.serverSeed}</Value>
          <Value label="Your seed (client seed)">
            {last.clientSeed}
            {last.clientSeedSource === "server-default" ? " (published default)" : ""}
          </Value>
          <Value label="Nonce">1</Value>
          <Value label="Digest">{last.digest}</Value>
          <Value label="Roll">{last.roll}</Value>
          <Value label="Table hash">{last.tableHash}</Value>
        </dl>
        <a href={last.verifyUrl} className="mt-3 inline-block text-xs font-semibold text-accent underline-offset-4 hover:underline">
          Open in the verifier
        </a>
      </details>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-surface px-5 py-4">
      <summary className="cursor-pointer list-none font-semibold marker:hidden">
        <span className="mr-2 inline-block text-accent transition-transform group-open:rotate-90">›</span>
        {title}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function Value({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-sans text-[10px] font-semibold tracking-wide text-subtle uppercase">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
