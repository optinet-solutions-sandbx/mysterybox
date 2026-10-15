"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useSyncExternalStore, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const noop = () => () => {};

/** True on the client after hydration (portals need document.body). */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/**
 * Bottom sheet on phones, centred dialog from md up. Escape, the backdrop and a downward drag
 * (phones) close it; the page behind doesn't scroll while it is open.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const mounted = useMounted();
  const reduce = useReducedMotion();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const drag = useDragControls();

  // Parents pass a fresh onClose on every render (some re-render each second for countdowns);
  // reading it through a ref keeps the open effect, and its focus move, to once per opening.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[color-mix(in_oklab,var(--ground)_78%,transparent)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface shadow-[0_-20px_60px_-20px_var(--shadow-strong)] outline-none md:rounded-[28px]",
              wide ? "md:max-w-2xl" : "md:max-w-md",
              className,
            )}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag={reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            dragControls={drag}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            <SheetHeader titleId={titleId} title={title} onClose={onClose} onGrab={(e) => drag.start(e)} />
            <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-7 md:pb-7">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SheetHeader({
  titleId,
  title,
  onClose,
  onGrab,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  onGrab: (e: PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onGrab}
      className="flex shrink-0 touch-none items-center justify-between gap-4 px-5 pt-3 pb-3 md:touch-auto md:px-7 md:pt-6"
    >
      <span aria-hidden className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line md:hidden" />
      <h2 id={titleId} className="mt-3 font-punch text-xl md:mt-0">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="mt-3 grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg md:mt-0"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
