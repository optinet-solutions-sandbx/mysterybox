"use client";

import { useEffect, useState, type ReactNode } from "react";
import { boxApi } from "@/box-api";
import { bands, verifyOpen, type VerifyResult } from "@/engine/draw";
import { formatCredit, formatPercent, formatUsd } from "@/domain/money";
import { catalogBox, listBoxes } from "@/services/catalog";
import { useSession, useSessionHydrated } from "@/store/session";
import { Button } from "@/components/ui/button";

const field = "w-full rounded-xl bg-surface-2 px-3 py-2.5 font-mono text-sm ring-1 ring-line";

interface Inputs {
  slug: string;
  serverSeed: string;
  clientSeed: string;
  tableHash: string;
  serverHash: string;
  /** What the open showed, so the check compares the result itself, not only the seal and table. */
  outcomeId?: string;
  bonusHash?: string;
  bonusCredits?: number[];
}

/**
 * The public check on the backend's recipe: recompute any open from its secret, your seed and the
 * table hash, in this browser and through the API, and compare. Recent opens fill it in.
 */
export function FairnessPanel() {
  const hydrated = useSessionHydrated();
  const opens = useSession((s) => s.boxApi.opens);
  const [inputs, setInputs] = useState<Inputs | null>(null);
  const [fromUrl, setFromUrl] = useState<Inputs | null>(null);

  // A verify link (?slug&serverSeed&clientSeed&tableHash) prefills the form; read after mount.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const slug = q.get("slug");
    if (!slug) return;
    const next = {
      slug,
      serverSeed: q.get("serverSeed") ?? "",
      clientSeed: q.get("clientSeed") ?? "",
      tableHash: q.get("tableHash") ?? "",
      serverHash: q.get("serverHash") ?? "",
      outcomeId: q.get("outcomeId") ?? undefined,
      bonusHash: q.get("bonusHash") ?? undefined,
    };
    void Promise.resolve().then(() => setFromUrl(next));
  }, []);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-card bg-surface" />;
  const resolved = opens.filter((o) => o.status === "resolved" && o.resolved).sort((a, b) => b.resolved!.resolvedAt - a.resolved!.resolvedAt).slice(0, 10);
  const active = inputs ?? fromUrl;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-card bg-surface p-6 ring-1 ring-line">
        <h2 className="text-lg font-semibold">Your recent opens</h2>
        <p className="mt-1 text-sm text-muted">Every open has its own secret. Once the draw is done, the secret is shown here so you can check the result.</p>
        {resolved.length === 0 ? (
          <p className="mt-6 text-sm text-subtle">No opens yet. Open a box, then come back to check it.</p>
        ) : (
          <ul className="mt-5 grid gap-3">
            {resolved.map((o) => {
              const box = catalogBox(listBoxes().find((b) => b.slug === o.boxSlug)!);
              const outcome = box.outcomes.find((x) => x.id === o.resolved!.outcomeId);
              return (
                <li key={o.openId} className="rounded-xl bg-surface-2 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{outcome?.label ?? o.resolved!.outcomeId}</p>
                      <p className="text-xs text-muted">
                        {box.name} · {new Date(o.resolved!.resolvedAt).toLocaleString("en-US")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setInputs({
                          slug: o.boxSlug,
                          serverSeed: o.serverSeed,
                          clientSeed: o.clientSeed ?? "",
                          tableHash: o.tableHash,
                          serverHash: o.serverHash,
                          outcomeId: o.resolved!.outcomeId,
                          bonusHash: o.bonusHash,
                          bonusCredits: o.resolved!.bonusSpins.map((b) => b.credits),
                        })
                      }
                    >
                      Check
                    </Button>
                  </div>
                  <p className="mt-2 truncate font-mono text-[11px] text-subtle" title={o.serverHash}>
                    seal {o.serverHash}
                  </p>
                  <p className="truncate font-mono text-[11px] text-subtle" title={o.serverSeed}>
                    secret {o.serverSeed}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Verifier key={active ? `${active.slug}-${active.serverSeed}-${active.clientSeed}` : "empty"} defaults={active} />
    </div>
  );
}

function Verifier({ defaults }: { defaults: Inputs | null }) {
  const boxes = listBoxes();
  const [slug, setSlug] = useState(defaults?.slug ?? boxes[0].slug);
  const [serverSeed, setServerSeed] = useState(defaults?.serverSeed ?? "");
  const [clientSeed, setClientSeed] = useState(defaults?.clientSeed ?? "");
  const [tableHash, setTableHash] = useState(defaults?.tableHash ?? "");
  const [result, setResult] = useState<{ local: VerifyResult; api: VerifyResult | null; apiError: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const box = catalogBox(boxes.find((b) => b.slug === slug) ?? boxes[0]);

  async function verify() {
    setBusy(true);
    const hash = tableHash || (await boxApi.getBox(slug)).tableHash;
    // The table frozen for that hash (fetched by hash, as the backend's verifier does).
    const pinned = await boxApi.getTable(hash).catch(() => null);
    const spinsOf = new Map(box.outcomes.map((o) => [o.id, o.freeSpins]));
    const table = pinned ? pinned.entries.map((e) => ({ ...e, freeSpins: spinsOf.get(e.id) ?? 0 })) : box.outcomes;
    const expected = { outcomeId: defaults?.outcomeId, bonusHash: defaults?.bonusHash, bonusCredits: defaults?.bonusCredits };
    const local = await verifyOpen({
      slug,
      priceDollars: (pinned?.priceCents ?? box.priceCents) / 100,
      serverSeed,
      clientSeed,
      serverHash: defaults?.serverHash || undefined,
      tableHash: hash,
      table,
      bonus: box.bonus,
      ...expected,
    });
    let api: VerifyResult | null = null;
    let apiError: string | null = null;
    try {
      api = await boxApi.verify({ slug, serverSeed, clientSeed, tableHash: hash, serverHash: defaults?.serverHash || undefined, ...expected });
    } catch {
      apiError = "The API couldn't check this table hash; the result below is your browser's own.";
    }
    setResult({ local, api, apiError });
    setBusy(false);
  }

  const outcome = result ? box.outcomes.find((o) => o.id === result.local.outcomeId) : undefined;
  const band = outcome ? bands(box.outcomes).find((b) => b.entry.id === outcome.id) : undefined;
  const agrees = result?.api ? result.api.digest === result.local.digest && result.api.outcomeId === result.local.outcomeId && result.api.ok === result.local.ok : false;

  return (
    <section className="rounded-card bg-surface p-6 ring-1 ring-line">
      <h2 className="text-lg font-semibold">Check a result</h2>
      <p className="mt-1 text-sm text-muted">Recompute any open from its secret, your seed and the table hash. Your browser does the maths itself.</p>
      <div className="mt-5 grid gap-3">
        <select aria-label="Box" className={field} value={slug} onChange={(e) => setSlug(e.target.value)}>
          {boxes.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
        <input aria-label="Secret (server seed)" className={field} placeholder="Secret (server seed)" value={serverSeed} onChange={(e) => setServerSeed(e.target.value)} />
        <input aria-label="Your seed (client seed)" className={field} placeholder="Your seed (client seed)" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} />
        <input aria-label="Table hash" className={field} placeholder="Table hash (empty: this box's current table)" value={tableHash} onChange={(e) => setTableHash(e.target.value)} />
        <Button onClick={() => void verify()} disabled={!serverSeed || !clientSeed || busy}>
          {busy ? "Checking…" : "Verify"}
        </Button>
      </div>
      {result && (
        <>
          <p role="status" className={result.local.ok ? "mt-5 text-sm font-semibold text-success" : "mt-5 text-sm font-semibold text-danger"}>
            {result.local.ok ? "This open checks out." : `This open doesn't check out: ${result.local.reason}`}
            {result.api && (agrees ? " Matches the API." : " The API's answer differs.")}
          </p>
          {result.apiError && <p className="mt-1 text-xs text-subtle">{result.apiError}</p>}
          <dl className="mt-4 grid gap-3 text-sm">
            <Row label="SHA-256 of the secret (the seal)">{result.local.serverHash}</Row>
            <Row label="Roll (0 to 1)">{result.local.roll}</Row>
            {band && <Row label="Band on the 0–100 line">{`${band.from.toFixed(4)} to ${band.to.toFixed(4)} (${formatPercent(band.entry.percent)})`}</Row>}
            <Row label="Outcome">
              {outcome ? `${outcome.label} · ${outcome.kind === "item" ? formatUsd(outcome.valueCents ?? 0) : formatCredit(outcome.credits)}` : result.local.outcomeId}
            </Row>
            {result.local.bonusSpins.length > 0 && (
              <Row label="Bonus opens">{result.local.bonusSpins.map((b) => `draw ${b.nonce}: +${formatCredit(b.credits)}`).join(" · ")}</Row>
            )}
          </dl>
        </>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-subtle uppercase">{label}</dt>
      <dd className="mt-1 font-mono text-[13px] break-all">{children}</dd>
    </div>
  );
}
