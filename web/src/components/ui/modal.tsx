"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useRef, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { lockScroll } from "@/components/fx/smooth-scroll";
import { cn } from "@/lib/cn";

/** Shared dialog behaviour: focus moves in, Escape closes, page scroll locks, focus returns. */
export function useDialog(open: boolean, onClose: () => void, panel: RefObject<HTMLElement | null>, dismissible = true) {
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    lockScroll(true);
    const focusTarget = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current;
    focusTarget?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, dismissible, panel]);
}

export function Modal({
  open,
  onClose,
  labelledBy,
  dismissible = true,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  dismissible?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDialog(open, onClose, panel, dismissible);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-bg/80 backdrop-blur-md" onClick={dismissible ? onClose : undefined} aria-hidden />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            className={cn(
              "relative w-full max-w-md rounded-[28px] border border-line bg-surface p-8 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] outline-none",
              className,
            )}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full p-1.5 text-muted transition-colors hover:text-fg"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
