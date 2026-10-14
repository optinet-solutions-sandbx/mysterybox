"use client";

import { Check, Copy, Download, Share } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { brand } from "@/config/brand";
import { economy } from "@/config/economy";
import { button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatUsd } from "@/domain/money";
import { useCurrentAccount, type Pull } from "@/store/app";
import { boxBySlug, getItem } from "@/services/catalog";

const noop = () => () => {};

export function pullLink(origin: string, itemId: string, boxSlug: string, ref: string | undefined) {
  const url = new URL(`/pull/${itemId}`, origin);
  url.searchParams.set("from", boxSlug);
  if (ref) url.searchParams.set("ref", ref);
  return url.toString();
}

/**
 * Share a pull. Phones get the system share sheet (TikTok, Instagram, Messages…) with the story
 * image attached when the browser allows files; everyone gets the link, the image and direct
 * buttons for X, Facebook and WhatsApp.
 */
export function ShareSheet({ open, onClose, pull, boxSlug }: { open: boolean; onClose: () => void; pull: Pull; boxSlug: string }) {
  const account = useCurrentAccount();
  const item = getItem(pull.itemId);
  const box = boxBySlug(boxSlug)!;
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);
  const [copied, setCopied] = useState(false);

  const link = origin ? pullLink(origin, item.id, boxSlug, account?.referralCode) : "";
  const text = `I pulled a ${item.brand} ${item.name} (${formatUsd(item.value)}) from ${box.name} on ${brand.name}.`;
  const storyUrl = `/pull/${item.id}/story`;

  async function systemShare() {
    try {
      const blob = await fetch(storyUrl).then((r) => r.blob());
      const file = new File([blob], `${item.id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text} ${link}` });
      } else {
        await navigator.share({ text, url: link });
      }
    } catch {
      // Closing the share sheet rejects the promise; nothing to do.
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const enc = encodeURIComponent;
  const targets = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(link)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${link}`)}` },
  ];

  return (
    <Sheet open={open} onClose={onClose} title="Share your pull">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[150px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated PNG, already sized */}
        <img src={storyUrl} alt={`Story card for ${item.brand} ${item.name}`} className="mx-auto aspect-[9/16] w-36 rounded-2xl border border-line object-cover sm:w-full" />
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Friends who sign up from your link get {formatUsd(economy.referralReward)} of credit{account ? `, and code ${account.referralCode} is in it` : ""}.
          </p>
          {canShare && (
            <button type="button" onClick={systemShare} className={button({ className: "w-full" })}>
              <Share className="size-4" />
              Share to TikTok, Instagram…
            </button>
          )}
          <a href={storyUrl} download={`${brand.name.replace(/\s+/g, "-").toLowerCase()}-${item.id}.png`} className={button({ variant: canShare ? "outline" : "foil", className: "w-full" })}>
            <Download className="size-4" />
            Save image for Stories
          </a>
          <button type="button" onClick={copy} disabled={!link} className={button({ variant: "outline", className: "w-full" })}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Link copied" : "Copy link"}
          </button>
          <div className="grid grid-cols-3 gap-2">
            {targets.map((t) => (
              <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" className={button({ variant: "outline", size: "sm" })}>
                {t.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
