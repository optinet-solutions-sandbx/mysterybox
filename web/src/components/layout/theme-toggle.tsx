"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { readTheme, setTheme, subscribeTheme } from "@/lib/theme";

/** Light/dark switch. The icon shows the mode you'd switch to. */
export function ThemeToggle() {
  // Server snapshot is null so the first client render matches; the real icon appears after hydration.
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => null);
  const next = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={theme ? `Switch to ${next} mode` : "Switch colour mode"}
      className="relative grid size-10 place-items-center overflow-hidden rounded-full text-muted transition-colors hover:text-fg"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {theme && (
          <motion.span
            key={theme}
            initial={{ y: 18, rotate: -60, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -18, rotate: 60, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="grid place-items-center"
          >
            {theme === "light" ? <Moon className="size-[18px]" strokeWidth={1.5} /> : <Sun className="size-[18px]" strokeWidth={1.5} />}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
