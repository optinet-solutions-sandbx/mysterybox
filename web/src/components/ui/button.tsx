import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,opacity] duration-300 ease-snap active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  /** Gold foil with a light sweep on hover (see .btn-foil). */
  primary: "btn-foil text-on-accent shadow-[0_10px_40px_-12px_rgb(194_164_110/0.6)]",
  secondary: "border border-line bg-surface/60 text-fg backdrop-blur hover:border-accent/70",
  ghost: "text-fg underline-offset-8 decoration-accent/60 hover:underline",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[15px]",
  lg: "h-14 px-8 text-base",
};

export function buttonClasses({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}) {
  return cn(base, variants[variant], sizes[size]);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClasses({ variant, size }), className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonClasses({ variant, size }), className)} {...props} />;
}
