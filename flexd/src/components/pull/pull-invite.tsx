"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { economy } from "@/config/economy";
import { BuyButton } from "@/components/boxes/buy-button";
import { button } from "@/components/ui/button";
import { normalizeReferralCode } from "@/domain/account";
import { formatUsd } from "@/domain/money";
import { useCurrentAccount, useHydrated } from "@/store/app";
import { openAuth } from "@/store/ui";
import { boxBySlug, boxesHolding } from "@/services/catalog";

const noop = () => () => {};

/**
 * The call to action on a shared pull: the box it came from (`?from=`) and the sharer's code
 * (`?ref=`, remembered for sign-up by the app hydrator). Read from the URL after hydration so the
 * page itself stays static.
 */
export function PullInvite({ itemId }: { itemId: string }) {
  const search = useSyncExternalStore(noop, () => window.location.search, () => "");
  const hydrated = useHydrated();
  const account = useCurrentAccount();
  const params = new URLSearchParams(search);
  const fromBox = boxBySlug(params.get("from") ?? "");
  const ref = normalizeReferralCode(params.get("ref"));
  const box = fromBox && boxesHolding(itemId).some((h) => h.box.id === fromBox.id) ? fromBox : boxesHolding(itemId)[0]?.box;

  return (
    <div className="mt-7 space-y-4">
      {box && (
        <div className="rounded-3xl border border-line/80 bg-surface/50 p-4">
          <p className="text-sm text-muted">{fromBox ? "Pulled from" : "Found in"}</p>
          <p className="font-display text-xl">{box.name}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <BuyButton box={box} />
            <Link href={`/box/${box.slug}`} className={button({ variant: "outline", size: "lg" })}>
              See the odds
            </Link>
          </div>
        </div>
      )}
      {hydrated && !account && ref && (
        <div className="rounded-3xl border border-dashed border-accent/50 p-4">
          <p className="font-medium">
            {ref} invited you: sign up with their code and get {formatUsd(economy.referralReward)} of credit.
          </p>
          <button type="button" onClick={() => openAuth("sign-up")} className={button({ size: "md", className: "mt-3" })}>
            Create an account
          </button>
        </div>
      )}
    </div>
  );
}
