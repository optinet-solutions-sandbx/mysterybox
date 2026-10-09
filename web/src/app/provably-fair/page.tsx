import type { Metadata } from "next";
import { FairnessPanel } from "@/components/account/fairness-panel";
import { Container, PageHeader } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Provably fair" };

const steps = [
  ["Commit", "Before you open anything we show the SHA-256 hash of a secret server seed. The hash locks the seed in without revealing it."],
  ["Mix", "Each opening combines that server seed with your client seed (change it any time) and a nonce that counts up by one per opening."],
  ["Roll", "HMAC-SHA256(server seed, “client seed:nonce”) gives a number from 0 to 99,999. The box’s odds table maps every number to exactly one item."],
  ["Reveal", "Rotate your seeds to publish the old server seed. Hash it yourself to confirm it matches the commitment, then recompute any result below."],
];

export default function ProvablyFairPage() {
  return (
    <>
      <PageHeader
        eyebrow="Verification"
        title="Provably fair"
        intro="Every result is decided by seeds committed before you open, so neither side can change it afterwards."
      />
      <Container className="py-10">
        <ol className="mb-12 grid gap-4 md:grid-cols-4">
          {steps.map(([title, body], i) => (
            <li key={title} className="rounded-card bg-surface p-6 ring-1 ring-line">
              <span className="font-display text-sm text-foil">{["I", "II", "III", "IV"][i]}</span>
              <h2 className="mt-3 font-display text-2xl">{title}</h2>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ol>
        <FairnessPanel />
        <p className="mt-6 text-xs text-subtle">
          Prototype note: the mock keeps the server seed in your browser. In production it stays on the server until rotation.
        </p>
      </Container>
    </>
  );
}
