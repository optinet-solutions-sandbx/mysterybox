"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/** The option a navigation key moves to, or null for any other key. */
export function nextIndex(key: string, current: number, count: number): number | null {
  if (key === "ArrowDown") return Math.min(count - 1, current + 1);
  if (key === "ArrowUp") return Math.max(0, current - 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/**
 * A select whose list opens directly below the button, as wide as it and aligned to its border
 * (a native select's list is placed by the browser and overlapped the button; QA 2026-10-15).
 * Listbox pattern: arrows, Home/End, Enter or Space to choose, Escape to close.
 */
export function SelectMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const openList = () => {
    setActive(selected);
    setOpen(true);
  };
  const choose = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
    button.current?.focus();
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openList();
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    const next = nextIndex(e.key, active, options.length);
    if (next !== null) {
      e.preventDefault();
      setActive(next);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-3 text-sm text-muted", className)}>
      <span id={`${id}-label`}>{label}</span>
      <div ref={root} className="relative">
        <button
          ref={button}
          id={`${id}-button`}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? `${id}-list` : undefined}
          aria-labelledby={`${id}-label ${id}-button`}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onButtonKey}
          className={cn(
            "flex min-w-48 items-center justify-between gap-3 rounded-pill border bg-surface px-4 py-2 text-left text-fg transition-colors",
            open ? "border-accent/60" : "border-line hover:border-accent/60",
          )}
        >
          <span>{options[selected]?.label}</span>
          <ChevronDown aria-hidden className={cn("size-4 text-muted transition-transform duration-300", open && "rotate-180")} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.ul
              ref={list}
              id={`${id}-list`}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={`${id}-label`}
              aria-activedescendant={`${id}-option-${active}`}
              onKeyDown={onListKey}
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-line bg-surface p-1 shadow-[0_18px_40px_-12px_var(--shadow-strong)] outline-none"
            >
              {options.map((o, i) => (
                <li
                  key={o.value}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={i === selected}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2",
                    i === active ? "bg-accent-soft text-fg" : "text-muted",
                  )}
                >
                  {o.label}
                  {i === selected && <Check aria-hidden className="size-4 shrink-0 text-accent" />}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
