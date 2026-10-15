import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Grail Noir mark: the gold crown-and-mask from the supplied logo (2026-10-12), extracted onto
 * transparency in public/brand/. `foil` shows that rendered gold; `solid` is a traced silhouette in
 * currentColor for ink on light finishes.
 */
export const LOGO_SRC = "/brand/grail-noir-mark.webp";
export const LOGO_LOCKUP_SRC = "/brand/grail-noir-lockup.webp";
export const LOGO_SIZE = { width: 711, height: 472 };
export const LOCKUP_SIZE = { width: 955, height: 663 };
export const LOGO_ASPECT = 711 / 472;

export const SILHOUETTE_VIEWBOX = "0 0 177 118";
export const SILHOUETTE_PATH =
  "M49.21 113.42C40.95 109.3 36.85 103.62 25.49 80.5C19.81 68.95 12.25 54.78 8.68 49C5.12 43.22 2.37 38.33 2.56 38.12C2.76 37.91 5.95 39.03 9.64 40.6C13.34 42.17 18.08 43.45 20.18 43.45C22.28 43.45 24 43.56 24 43.69C24 43.82 23.24 45.53 22.31 47.47C20.69 50.87 20.7 51.13 22.63 53.76C27.06 59.8 37.37 61.9 43.7 58.04C47.59 55.67 49.85 52.35 52.09 45.72L53.8 40.69L55.9 44.8C57.05 47.06 59.73 50.73 61.84 52.96C65.18 56.47 66.26 57 70.02 57C73.81 57 74.85 56.47 78.45 52.71C82.39 48.6 85 42.76 85 38.03C85 35.47 78.99 29 76.6 29C74.19 29 74.67 27.51 77.58 25.96C80.23 24.54 84.24 18.47 85.49 14C86.77 9.42 89.33 4.09 90.04 4.53C90.81 5 94.92 13.27 97.41 19.35C98.27 21.46 100.11 24.08 101.49 25.17C104.79 27.77 104.67 28.36 100.49 29.87C92.12 32.89 92.15 43.95 100.55 52.71C104.03 56.35 105.26 57 108.62 57C113.67 57 117.92 53.5 121.94 46.02C123.78 42.61 125.07 41.11 125.37 42.02C125.63 42.84 126.36 45.16 126.98 47.18C127.6 49.21 129.8 52.77 131.85 55.09C135.24 58.9 136.12 59.34 141.05 59.71C147.32 60.17 152.13 58.18 155.37 53.76C157.3 51.13 157.31 50.87 155.69 47.47C154.76 45.53 154 43.82 154 43.69C154 43.56 155.71 43.45 157.8 43.45C159.89 43.45 164.42 42.19 167.87 40.64C171.33 39.09 174.37 38.03 174.63 38.3C174.89 38.56 173.13 41.86 170.71 45.64C163.91 56.24 159 65.49 159 67.7C159 68.8 157.88 71.23 156.52 73.1C155.16 74.97 151.35 81.95 148.06 88.62C134.97 115.17 121.89 121.51 100.37 111.7C95.9 109.67 90.82 108 89.07 108C87.33 108 81.67 109.8 76.5 112C64.63 117.05 57.27 117.44 49.21 113.42ZM77.46 95.25C75.03 89.43 73.29 87.22 68.79 84.25C64.78 81.6 64.15 81.5 51.45 81.5L38.28 81.5L40.83 85C49.55 96.97 53.43 98.95 68.26 98.98L79.03 99L77.46 95.25ZM126.78 95.77C129.05 94.26 132.66 90.66 134.82 87.77L138.73 82.5L134.11 81.84C115.07 79.1 105.72 82.84 100.53 95.27L99 98.93L110.83 98.71C121.85 98.51 122.93 98.32 126.78 95.77Z";

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
      <svg viewBox={SILHOUETTE_VIEWBOX} className={cn("h-auto", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
        {title && <title>{title}</title>}
        <path fillRule="evenodd" d={SILHOUETTE_PATH} fill="currentColor" />
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
