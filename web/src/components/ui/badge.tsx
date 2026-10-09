import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill bg-surface-2 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted uppercase ring-1 ring-line",
        className,
      )}
    >
      {children}
    </span>
  );
}
