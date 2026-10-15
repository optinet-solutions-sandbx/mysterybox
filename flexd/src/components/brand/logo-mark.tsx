import Image from "next/image";
import { LOGO_SIZE, LOGO_SRC, MARK } from "@/config/mark";
import { cn } from "@/lib/cn";

export { LOGO_ASPECT, LOGO_SIZE, LOGO_SRC } from "@/config/mark";

/** FLEXD crown-and-mask. `foil` is the lilac-chrome artwork; `solid` draws its traced outline in currentColor. */
export function LogoMark({
  className,
  tone = "foil",
  title,
  sizes = "96px",
  priority = false,
}: {
  className?: string;
  tone?: "foil" | "solid";
  title?: string;
  /** Rendered width hint for the image optimiser. */
  sizes?: string;
  priority?: boolean;
}) {
  if (tone === "solid") {
    return (
      <svg
        viewBox={`0 0 ${MARK.viewBox.width} ${MARK.viewBox.height}`}
        className={cn("h-auto", className)}
        role={title ? "img" : undefined}
        aria-hidden={title ? undefined : true}
      >
        {title && <title>{title}</title>}
        {MARK.paths.map((p) => (
          <path key={p.d} d={p.d} fillRule={p.rule} fill="currentColor" />
        ))}
      </svg>
    );
  }
  return (
    <Image
      src={LOGO_SRC}
      width={LOGO_SIZE.width}
      height={LOGO_SIZE.height}
      sizes={sizes}
      {...(priority ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      className={cn("h-auto", className)}
      draggable={false}
    />
  );
}
