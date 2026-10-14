"use client";

import { Check, Copy, Share } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { brand } from "@/config/brand";
import { economy } from "@/config/economy";
import { Avatar } from "@/components/shell/account-menu";
import { ItemArt } from "@/components/item/item-art";
import { button } from "@/components/ui/button";
import { sampleBoard } from "@/data/sample-leaderboard";
import { formatUsd } from "@/domain/money";
import { LEVELS, levelFor, pointsFor } from "@/domain/wallet";
import { cn } from "@/lib/cn";
import { useCurrentAccount, useHydrated, type Account } from "@/store/app";
import { openAuth } from "@/store/ui";
import { getItem } from "@/services/catalog";

const noop = () => () => {};

export function RewardsView() {
  const hydrated = useHydrated();
  const account = useCurrentAccount();
  return (
    <div className="space-y-6">
      {!hydrated ? (
        <div className="h-64" aria-busy="true" />
      ) : account ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LevelCard account={account} />
          <ReferralCard account={account} />
        </div>
      ) : (
        <div className="rounded-[32px] border border-line/80 bg-[var(--card)] p-6 md:p-10">
          <h2 className="font-display text-2xl">Earn as you open</h2>
          <p className="mt-2 max-w-lg text-muted">
            Every dollar you spend on boxes is a point toward the next level, and every friend you bring adds{" "}
            {formatUsd(economy.referralReward)} of credit to both of you.
          </p>
          <button type="button" onClick={() => openAuth("sign-up")} className={button({ size: "lg", className: "mt-6" })}>
            Create an account
          </button>
        </div>
      )}
      <Leaderboard account={account} />
    </div>
  );
}

function LevelCard({ account }: { account: Account }) {
  const points = pointsFor(account.spent);
  const { level, next, progress } = levelFor(points);
  return (
    <section aria-labelledby="level" className="rounded-[32px] border border-line/80 bg-[var(--card)] p-5 md:p-8">
      <p className="text-sm text-muted">Your level</p>
      <h2 id="level" className="mt-1 font-display text-3xl text-foil">
        {level.name}
      </h2>
      <p className="mt-1 text-sm text-muted">
        <span className="font-semibold text-fg tabular">{points.toLocaleString("en-US")}</span> points, one for every dollar spent on
        boxes.
      </p>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-bg/60" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={next ? `Progress to ${next.name}` : "Top level"}>
        <div className="h-full rounded-full bg-foil" style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }} />
      </div>
      <p className="mt-2 text-sm text-subtle">
        {next ? `${(next.from - points).toLocaleString("en-US")} points to ${next.name}` : "You've reached the top level."}
      </p>
      <ol className="mt-6 space-y-2">
        {LEVELS.map((l) => {
          const reached = points >= l.from;
          return (
            <li key={l.name} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", l.name === level.name ? "bg-accent-soft" : "")}>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", reached ? "border-accent bg-accent text-on-accent" : "border-line")}>
                {reached && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="w-20 shrink-0 font-display text-sm">{l.name}</span>
              <span className="min-w-0 flex-1 text-sm text-muted">{l.perk}</span>
              <span className="shrink-0 text-xs text-subtle tabular">{l.from.toLocaleString("en-US")}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ReferralCard({ account }: { account: Account }) {
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = origin ? `${origin}/?ref=${account.referralCode}` : "";

  async function copy(what: "code" | "link") {
    await navigator.clipboard.writeText(what === "code" ? account.referralCode : link);
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section aria-labelledby="refer" className="rounded-[32px] border border-line/80 bg-[var(--card)] p-5 md:p-8">
      <h2 id="refer" className="font-display text-2xl">
        Bring a friend
      </h2>
      <p className="mt-2 text-muted">
        Friends get {formatUsd(economy.referralReward)} of credit when they sign up with your code. You get{" "}
        {formatUsd(economy.referralReward)} when they open their first box.
      </p>
      <div className="mt-6 flex items-center justify-between gap-3 rounded-3xl border border-dashed border-accent/50 bg-bg/40 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs text-muted">Your code</p>
          <p className="truncate font-display text-2xl font-semibold tracking-[0.08em]">{account.referralCode}</p>
        </div>
        <button type="button" onClick={() => copy("code")} className={button({ variant: "outline", size: "sm" })} aria-label="Copy code">
          {copied === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied === "code" ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => copy("link")} disabled={!link} className={button({ variant: "outline" })}>
          {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied === "link" ? "Link copied" : "Copy invite link"}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={() => navigator.share({ text: `Open a box with me on ${brand.name}. Use code ${account.referralCode} for ${formatUsd(economy.referralReward)} of credit.`, url: link }).catch(() => {})}
            className={button()}
          >
            <Share className="size-4" />
            Share invite
          </button>
        )}
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-bg/40 p-4">
          <dt className="text-sm text-muted">Friends who opened a box</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tabular">{account.referral.invited}</dd>
        </div>
        <div className="rounded-3xl bg-bg/40 p-4">
          <dt className="text-sm text-muted">You earned</dt>
          <dd className="mt-1 font-display text-2xl font-semibold text-foil tabular">{formatUsd(account.referral.earned)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Leaderboard({ account }: { account: Account | null }) {
  const best = account?.pulls.reduce<Account["pulls"][number] | null>((top, p) => (!top || p.value > top.value ? p : top), null) ?? null;
  return (
    <section aria-labelledby="board" className="rounded-[32px] border border-line/80 bg-surface/40 p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="board" className="font-display text-2xl">
          This week&apos;s leaderboard
        </h2>
        <span className="rounded-pill border border-line px-3 py-1 text-xs font-semibold text-muted">Sample data</span>
      </div>
      <p className="mt-1 text-sm text-muted">Points from boxes opened this week, with each player&apos;s best pull. Live once accounts move to the server.</p>
      <ol className="mt-5 divide-y divide-line/70">
        {sampleBoard.map((row, i) => {
          const item = getItem(row.itemId);
          return (
            <li key={row.name} className="flex items-center gap-3 py-3">
              <span className={cn("w-6 shrink-0 text-center font-display font-semibold tabular", i < 3 ? "text-accent" : "text-subtle")}>{i + 1}</span>
              <Avatar name={row.name} className="size-9 text-sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
              <ItemArt item={item} showBrand={false} sizes="40px" className="hidden size-10 shrink-0 rounded-xl sm:grid" />
              <span className="hidden w-40 truncate text-sm text-muted md:block">
                {item.brand} {item.name}
              </span>
              <span className="w-20 shrink-0 text-right font-display text-sm font-semibold tabular">{row.points.toLocaleString("en-US")}</span>
            </li>
          );
        })}
        {account && (
          <li className="flex items-center gap-3 rounded-2xl bg-accent-soft px-2 py-3">
            <span className="w-6 shrink-0 text-center text-xs font-semibold text-muted">You</span>
            <Avatar name={account.username} className="size-9 text-sm" />
            <span className="min-w-0 flex-1 truncate font-medium">{account.username}</span>
            {best && (
              <span className="hidden truncate text-sm text-muted md:block">
                Best pull {formatUsd(best.value)}
              </span>
            )}
            <span className="w-20 shrink-0 text-right font-display text-sm font-semibold tabular">{pointsFor(account.spent).toLocaleString("en-US")}</span>
          </li>
        )}
      </ol>
    </section>
  );
}
