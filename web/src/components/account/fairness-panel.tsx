"use client";

import { useState, type ReactNode } from "react";
import { computeRoll, sha256Hex } from "@/domain/fair";
import { pickByRoll } from "@/domain/odds";
import { formatUsd } from "@/domain/money";
import { listBoxes, resolveEntries } from "@/services/catalog";
import { useSession, useSessionHydrated } from "@/store/session";
import { Button } from "@/components/ui/button";

const field = "w-full rounded-xl bg-surface-2 px-3 py-2.5 font-mono text-sm ring-1 ring-line";

export function FairnessPanel() {
  const hydrated = useSessionHydrated();
  const seeds = useSession((s) => s.seeds);
  const revealed = useSession((s) => s.revealedSeeds);
  const setClientSeed = useSession((s) => s.setClientSeed);
  const rotateSeeds = useSession((s) => s.rotateSeeds);
  const [draft, setDraft] = useState<string | null>(null);

  if (!hydrated || !seeds) return <div className="h-64 animate-pulse rounded-card bg-surface" />;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-card bg-surface p-6 ring-1 ring-line">
        <h2 className="text-lg font-semibold">Your active seeds</h2>
        <dl className="mt-5 grid gap-4 text-sm">
          <Row label="Server seed (hashed)">{seeds.serverSeedHash}</Row>
          <Row label="Next nonce">{seeds.nonce}</Row>
        </dl>
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft !== null) setClientSeed(draft);
            setDraft(null);
          }}
        >
          <label className="text-xs font-semibold tracking-wide text-subtle uppercase" htmlFor="client-seed">
            Client seed
          </label>
          <div className="mt-1.5 flex gap-2">
            <input id="client-seed" className={field} value={draft ?? seeds.clientSeed} onChange={(e) => setDraft(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={draft === null}>
              Save
            </Button>
          </div>
        </form>
        <Button className="mt-6" onClick={() => void rotateSeeds()}>
          Rotate seeds and reveal current server seed
        </Button>

        {revealed.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold">Revealed seeds</h3>
            <ul className="mt-3 grid gap-3">
              {revealed.map((s) => (
                <li key={s.serverSeedHash} className="rounded-xl bg-surface-2 p-3 font-mono text-[11px] break-all text-muted">
                  <p>server: {s.serverSeed}</p>
                  <p>hash: {s.serverSeedHash}</p>
                  <p>
                    client: {s.clientSeed} · nonces 0–{Math.max(0, s.nonce - 1)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Verifier key={revealed[0]?.serverSeedHash ?? "none"} defaults={revealed[0]} />
    </div>
  );
}

function Verifier({ defaults }: { defaults?: { serverSeed: string; serverSeedHash: string; clientSeed: string } }) {
  const boxes = listBoxes();
  const [serverSeed, setServerSeed] = useState(defaults?.serverSeed ?? "");
  const [clientSeed, setClientSeed] = useState(defaults?.clientSeed ?? "");
  const [nonce, setNonce] = useState("0");
  const [slug, setSlug] = useState(boxes[0].slug);
  const [result, setResult] = useState<{ hash: string; roll: number; item: string; value: number } | null>(null);

  async function verify() {
    const box = boxes.find((b) => b.slug === slug)!;
    const roll = await computeRoll(serverSeed, clientSeed, Number(nonce));
    const entry = pickByRoll(resolveEntries(box), roll);
    setResult({ hash: await sha256Hex(serverSeed), roll, item: entry.item.name, value: entry.item.value });
  }

  return (
    <section className="rounded-card bg-surface p-6 ring-1 ring-line">
      <h2 className="text-lg font-semibold">Verify a result</h2>
      <p className="mt-1 text-sm text-muted">Recompute any opening from its seeds. Server seeds become public after rotation.</p>
      <div className="mt-5 grid gap-3">
        <input className={field} placeholder="Server seed" value={serverSeed} onChange={(e) => setServerSeed(e.target.value)} />
        <input className={field} placeholder="Client seed" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className={field} type="number" min={0} placeholder="Nonce" value={nonce} onChange={(e) => setNonce(e.target.value)} />
          <select className={field} value={slug} onChange={(e) => setSlug(e.target.value)}>
            {boxes.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => void verify()} disabled={!serverSeed || !clientSeed}>
          Verify
        </Button>
      </div>
      {result && (
        <dl className="mt-6 grid gap-3 text-sm">
          <Row label="SHA-256 of server seed">{result.hash}</Row>
          <Row label="Roll (0–99,999)">{result.roll.toLocaleString("en-US")}</Row>
          <Row label="Item">
            {result.item} · {formatUsd(result.value)}
          </Row>
        </dl>
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
