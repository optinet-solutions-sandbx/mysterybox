import { cn } from "@/lib/cn";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,opacity] duration-200 ease-snap active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45";

const variants = {
  /** Glowing violet: opening a box and every primary action. */
  primary: "btn-primary",
  /** Dark violet pill with a lit rim (Sign up). */
  velvet: "btn-velvet",
  /** Champagne foil: money actions (balance, selling). */
  foil: "btn-foil text-on-accent shadow-[0_10px_28px_-14px_var(--shadow-strong)]",
  /** Ivory pill: the confident secondary action (Keep, Done). */
  solid: "bg-fg text-bg hover:opacity-90",
  outline: "border border-edge bg-[image:var(--glass-fill)] text-fg hover:border-fg/60",
  ghost: "text-muted hover:text-fg",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
} as const;

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-7 text-base",
} as const;

export function button({
  variant = "primary",
  size = "md",
  className,
}: { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}
