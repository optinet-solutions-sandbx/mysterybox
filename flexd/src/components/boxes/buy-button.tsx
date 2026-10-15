"use client";

import { useState } from "react";
import { preloadChest } from "@/components/chest/chest";
import { button } from "@/components/ui/button";
import { formatUsd } from "@/domain/money";
import type { Box } from "@/domain/types";
import { buyBox } from "@/store/flows";

export function BuyButton({ box, size = "lg", className }: { box: Box; size?: "md" | "lg"; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onPointerEnter={preloadChest}
      onTouchStart={preloadChest}
      onFocus={preloadChest}
      onClick={async () => {
        preloadChest();
        setBusy(true);
        await buyBox(box.slug);
        setBusy(false);
      }}
      className={button({ size, className })}
    >
      {busy ? "Opening…" : `Buy for ${formatUsd(box.price)}`}
    </button>
  );
}
