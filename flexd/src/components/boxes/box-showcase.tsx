"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Chest } from "@/components/chest/chest";
import { ItemArt } from "@/components/item/item-art";
import { AccentName } from "@/components/ui/accent-name";
import { formatUsd, formatUsdCompact } from "@/domain/money";
import { SHELVES, type Box, type Shelf } from "@/domain/types";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";
import { useMedia } from "@/lib/use-media";
import { boxesOnShelf, resolveEntries, valueRange } from "@/services/catalog";
import { BuyButton } from "./buy-button";
import { FORWARD } from "@/components/shell/page-transition";
import { DropTimer } from "./drop-band";
import { OddsButton } from "./odds-sheet";

const SHELF_LABEL: Record<Shelf, string> = {
  all: "All",
  bags: "Bags",
  watches: "Watches",
  jewelry: "Jewelry",
  beauty: "Beauty",
  eyewear: "Eyewear",
};

export function ShelfSwitch({ value, onChange }: { value: Shelf; onChange: (s: Shelf) => void }) {
  return (
    <div role="tablist" aria-label="Category" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {SHELVES.map((s) => (
        <button
          key={s}
          type="button"
          role="tab"
          aria-selected={value === s}
          onClick={() => onChange(s)}
          className={cn(
            "h-10 shrink-0 rounded-pill border px-4 text-sm font-medium transition-colors",
            value === s ? "btn-primary border-transparent text-on-primary" : "glass text-fg/90 hover:border-fg/40",
          )}
        >
          {SHELF_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

/**
 * The app's main screen: pick a category, swipe through its boxes, see what is inside and its
 * value range, buy. Only the current box and its two neighbours are rendered.
 */
export function BoxShowcase({ className }: { className?: string }) {
  const [shelf, setShelf] = useState<Shelf>("all");
  const [index, setIndex] = useState(0);
  const list = boxesOnShelf(shelf);
  const i = Math.min(index, list.length - 1);
  const box = list[i];

  return (
    <div className={className}>
      <ShelfSwitch
        value={shelf}
        onChange={(s) => {
          setShelf(s);
          setIndex(0);
        }}
      />
      <Carousel boxes={list} index={i} onIndex={setIndex} />
      <BoxDetails box={box} />
    </div>
  );
}

function Carousel({ boxes, index, onIndex }: { boxes: Box[]; index: number; onIndex: (i: number) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const wide = useMedia("(min-width: 768px)");
  const go = (d: number) => {
    sfx.swish();
    onIndex((index + d + boxes.length) % boxes.length);
  };

  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  }

  const visible = boxes.length === 1 ? [0] : boxes.length === 2 ? [0, 1] : [-1, 0, 1];

  return (
    <div className="relative mt-4">
      <motion.div
        ref={stage}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${boxes[index].name}, box ${index + 1} of ${boxes.length}`}
        tabIndex={0}
        onKeyDown={onKey}
        onPanEnd={(_, info) => {
          if (info.offset.x < -50) go(1);
          else if (info.offset.x > 50) go(-1);
        }}
        className="relative h-[330px] touch-pan-y overflow-hidden rounded-[32px] outline-none md:h-[380px]"
      >
        <div aria-hidden className="absolute inset-x-[6%] bottom-[4%] h-1/2 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--velvet-500)_32%,transparent),transparent)]" />
        <AnimatePresence initial={false}>
          {visible.map((offset) => {
            const k = boxes.length === 2 ? offset : (index + offset + boxes.length) % boxes.length;
            const b = boxes.length === 2 ? boxes[(index + offset) % 2] : boxes[k];
            const pos = boxes.length === 2 ? (offset === 0 ? 0 : 1) : offset;
            return (
              <motion.button
                key={b.id}
                type="button"
                tabIndex={-1}
                aria-hidden={pos !== 0}
                onClick={() => pos !== 0 && go(pos)}
                className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", pos === 0 ? "z-10" : "z-0")}
                initial={{ opacity: 0, scale: 0.5 }}
                // The neighbours wait behind the current box, smaller and darker (the screens).
                animate={{ x: `${pos * (wide ? 46 : 40)}%`, y: pos === 0 ? "6%" : "-16%", scale: pos === 0 ? 1 : 0.6, opacity: pos === 0 ? 1 : 0.5 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
              >
                <Chest finish={b.material} still float={pos === 0 && inView} tilt={pos === 0} priority={pos === 0} sizes={pos === 0 ? "(min-width: 768px) 390px, 85vw" : "(min-width: 768px) 240px, 50vw"} className={wide ? "h-[320px] w-[390px]" : "h-[275px] w-[330px]"} label={`${b.name} box`} />
              </motion.button>
            );
          })}
        </AnimatePresence>
        {boxes.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous box" className="absolute top-1/2 left-2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/70 md:grid">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next box" className="absolute top-1/2 right-2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/70 md:grid">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </motion.div>
      {boxes.length > 1 && (
        <div className="mt-1 flex justify-center gap-1.5" aria-hidden>
          {boxes.map((b, j) => (
            <span key={b.id} className={cn("h-1.5 rounded-full transition-all duration-300", j === index ? "w-6 bg-hot" : "w-1.5 bg-fg/25")} />
          ))}
        </div>
      )}
    </div>
  );
}

function BoxDetails({ box }: { box: Box }) {
  const { min, max } = valueRange(box);
  const pieces = resolveEntries(box).slice(0, 8);
  return (
    <div className="mt-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-punch text-[34px] leading-tight md:text-4xl">
            <AccentName name={box.name} />
          </h2>
          <p className="mt-1 text-muted">{box.tagline}</p>
        </div>
        <OddsButton box={box} className="mt-1 h-11 shrink-0 rounded-pill border border-edge px-5 text-[15px] font-medium text-fg transition-colors hover:border-fg/70" />
      </div>
      {box.drop && <DropTimer className="mt-3" />}

      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="font-medium text-fg">Inside</span>
        <Link href={`/box/${box.slug}`} transitionTypes={FORWARD} className="inline-flex items-center gap-1 font-medium text-fg hover:text-hot">
          Details <ChevronRight className="size-4" />
        </Link>
      </div>
      <ul className="no-scrollbar -mx-4 mt-2 flex gap-2.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {pieces.map((e, j) => (
          // The top piece is lit and priced in gold, as in the screens; the rest are quiet glass.
          <li key={e.item.id} className={cn("flex w-[188px] shrink-0 items-center gap-3 rounded-2xl p-2", j === 0 ? "glass-lit" : "glass")}>
            <ItemArt item={e.item} rarity={e.rarity} showBrand={false} sizes="56px" className="size-14 shrink-0 rounded-xl" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{e.item.brand}</p>
              <p className={cn("font-price text-lg font-semibold tabular", j === 0 ? "text-accent" : "text-fg")}>{formatUsdCompact(e.item.value)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="glass-lit mt-4 grid grid-cols-2 rounded-[22px] py-4 text-center">
        <div>
          <p className="text-sm text-muted">Min value</p>
          <p className="font-price text-[26px] leading-tight font-semibold tabular">{formatUsd(min)}</p>
        </div>
        <div className="border-l border-fg/25">
          <p className="text-sm text-muted">Max value</p>
          <p className="font-price text-[26px] leading-tight font-bold tabular text-accent">{formatUsd(max)}</p>
        </div>
      </div>
      <BuyButton box={box} className="mt-4 w-full" />
    </div>
  );
}
