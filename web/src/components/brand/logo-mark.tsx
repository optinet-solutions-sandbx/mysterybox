import Image from "next/image";
import { brandAsset, brandPack } from "@/config/brand-pack";
import { cn } from "@/lib/cn";

/**
 * The brand mark from the active brand pack (public/brands/<id>/). `foil` shows the artwork as
 * supplied; `solid` is a one-colour version in currentColor for ink on light finishes: the pack's
 * traced silhouette when it has one, otherwise the artwork's shape used as a mask.
 */
const logo = brandPack.logo;
export const LOGO_SRC = brandAsset(logo.mark);
export const LOGO_SIZE = { width: logo.markWidth, height: logo.markHeight };
export const LOGO_ASPECT = logo.markWidth / logo.markHeight;
export const LOGO_LOCKUP_SRC = logo.lockup ? brandAsset(logo.lockup) : LOGO_SRC;
export const LOCKUP_SIZE = logo.lockup && logo.lockupWidth && logo.lockupHeight ? { width: logo.lockupWidth, height: logo.lockupHeight } : LOGO_SIZE;

/** Height of the mark at a given width, rounded for SSR-stable SVG attributes. */
export const logoHeightAt = (width: number) => Math.round((width / LOGO_ASPECT) * 10) / 10;

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
  if (tone === "solid" && logo.silhouette) {
    return (
      <svg viewBox={logo.silhouette.viewBox} className={cn("h-auto", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
        {title && <title>{title}</title>}
        <path fillRule="evenodd" d={logo.silhouette.path} fill="currentColor" />
      </svg>
    );
  }
  if (tone === "solid") {
    const mask = `url("${LOGO_SRC}") center / contain no-repeat`;
    return (
      <span
        role={title ? "img" : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
        className={cn("block bg-current", className)}
        style={{ aspectRatio: `${logo.markWidth} / ${logo.markHeight}`, mask, WebkitMask: mask }}
      />
    );
  }
  return (
    <Image
      src={LOGO_SRC}
      width={LOGO_SIZE.width}
      height={LOGO_SIZE.height}
      sizes={sizes}
      priority={priority}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      className={cn("h-auto", className)}
      draggable={false}
    />
  );
}
