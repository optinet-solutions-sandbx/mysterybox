import { ShieldCheck } from "lucide-react";
import { authenticitySummary } from "@/domain/authenticity";
import type { Item } from "@/domain/types";
import { cn } from "@/lib/cn";

/**
 * The authenticity details staff entered for a product (back office → Items): reference and
 * condition, plus how it was authenticated when `full`. Renders nothing when none are set, and
 * never adds a claim of its own.
 */
export function Authenticity({ item, full = false, className }: { item: Item; full?: boolean; className?: string }) {
  const summary = authenticitySummary(item);
  const how = full ? item.authentication : undefined;
  if (!summary && !how) return null;
  return (
    <div className={cn("text-xs leading-relaxed text-muted", className)}>
      {summary && <p className="truncate">{summary}</p>}
      {how && (
        <p className="flex items-start gap-1.5">
          <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <span>Authentication: {how}</span>
        </p>
      )}
    </div>
  );
}
