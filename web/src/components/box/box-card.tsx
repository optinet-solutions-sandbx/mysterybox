"use client";

import Link from "next/link";
import { useState } from "react";
import type { Box, Item } from "@/domain/types";
import { formatUsd } from "@/domain/money";
import { Box3D } from "@/components/box3d/box-3d";
import { ItemArt } from "@/components/item/item-art";

const badgeLabel = { new: "New", hot: "Most opened", limited: "Limited" } as const;

/** Catalog card: the box itself, lid lifting toward you on hover, with its top piece below. */
export function BoxCard({ box, top }: { box: Box; top: Item }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/boxes/${box.slug}`}
      data-cursor
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group relative flex flex-col overflow-hidden rounded-[28px] border border-line bg-[image:var(--card)] transition-[transform,border-color] duration-500 ease-snap hover:-translate-y-1.5 hover:border-accent/60"
    >
      {box.badge && (
        <span className="absolute top-5 left-5 z-10 rounded-pill border border-accent/40 bg-bg/50 px-3 py-1 text-xs text-accent backdrop-blur">
          {badgeLabel[box.badge]}
        </span>
      )}
      <div className="relative h-72 overflow-hidden">
        <div aria-hidden className="absolute inset-x-0 -top-16 mx-auto h-72 w-72 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--glow)_35%,transparent),transparent)] opacity-60 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute top-[64%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.72]">
          <Box3D width={240} material={box.material} open={hover ? 0.42 : 0} viewY={hover ? -24 : -32} />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-6 pb-6">
        <h3 className="font-display text-2xl">{box.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{box.tagline}</p>
        <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
          <ItemArt item={top} rarity="legendary" showBrand={false} className="size-11 shrink-0 rounded-[10px]" />
          <p className="min-w-0 flex-1 text-xs text-subtle">
            Top piece
            <span className="block truncate text-sm text-fg">
              {top.brand} {top.name}
            </span>
          </p>
          <span className="shrink-0 rounded-pill bg-foil px-4 py-2 font-display text-sm text-on-accent tabular">{formatUsd(box.price)}</span>
        </div>
      </div>
    </Link>
  );
}
