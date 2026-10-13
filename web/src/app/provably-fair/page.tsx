import type { Metadata } from "next";
import { FairnessPanel } from "@/components/account/fairness-panel";
import { Container, PageHeader } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Provably fair" };

const steps = [
  ["Seal", "Before you pay, we choose a secret and show its SHA-256 hash: the seal. It locks the secret in without revealing it."],
  ["Your seed", "Add your own seed before paying and it goes into the roll, so neither side decides it alone. With none, we use the published default, grailnoir-default."],
  ["Roll", "HMAC-SHA256 of “DRAW-box-secret-seed-1” gives a number from 0 to 1. Times 100, it lands in exactly one band of the box’s odds table. Free spins use spin numbers 2 and 3."],
  ["Check", "After the spin we show the secret. Hash it to match the seal and recompute the roll here. This proves the result wasn’t changed after you paid; it doesn’t prove every player gets the same table."],
];

export default function ProvablyFairPage() {
  return (
    <>
      <PageHeader
        eyebrow="Verification"
        title="Provably fair"
        intro="Every open is decided by a secret sealed before you pay and your own seed, so the result can’t be changed afterwards."
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
          Prototype note: the showcase runs the backend’s logic in your browser, so a tester could read a secret in dev tools before the spin. The backend developer’s server keeps it on the server until the spin.
        </p>
      </Container>
    </>
  );
}
