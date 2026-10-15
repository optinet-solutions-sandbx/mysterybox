"use client";

import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { categoryLabel } from "@/config/brand-pack";
import type { Box, Item } from "@/domain/types";
import { cn } from "@/lib/cn";
import { SelectMenu } from "@/components/ui/select-menu";
import { BoxCard } from "./box-card";

type Filter = string;
type Sort = "featured" | "price-asc" | "price-desc";

const sorts: { id: Sort; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
];

/** Client-side filter and sort; the grid re-flows with shared-layout motion. */
export function BoxCatalog({ boxes }: { boxes: { box: Box; top: Item }[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("featured");

  const filters: Filter[] = ["all", ...new Set(boxes.map(({ box }) => box.category))];
  const visible = boxes
    .filter(({ box }) => filter === "all" || box.category === filter)
    .sort((a, b) => {
      if (sort === "price-asc") return a.box.price - b.box.price;
      if (sort === "price-desc") return b.box.price - a.box.price;
      return Number(!!b.box.featured) - Number(!!a.box.featured);
    });

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn("relative rounded-pill px-4 py-2 text-sm transition-colors", filter === f ? "text-on-accent" : "text-muted hover:text-fg")}
            >
              {filter === f && <motion.span layoutId="catalog-filter" className="absolute inset-0 -z-10 rounded-pill bg-foil" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              {f === "all" ? "All" : categoryLabel(f)}
            </button>
          ))}
        </div>
        <SelectMenu label="Sort" value={sort} options={sorts.map((s) => ({ value: s.id, label: s.label }))} onChange={setSort} />
      </div>

      <LayoutGroup>
        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(({ box, top }) => (
            <motion.div
              key={box.id}
              className="h-full min-w-0"
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              <BoxCard box={box} top={top} />
            </motion.div>
          ))}
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
