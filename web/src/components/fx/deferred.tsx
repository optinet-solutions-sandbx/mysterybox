"use client";

import { startTransition, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts heavy below-the-fold sections (3D boxes, pinned scroll scenes) only when they come within
 * `margin` of the viewport. Until then a placeholder of similar height holds the space, so the
 * first load hydrates far less and nothing visible shifts when the section mounts. The mount is a
 * transition: React renders the section in small slices, so scrolling stays smooth while it builds.
 */
export function Deferred({
  children,
  placeholderClassName,
  // Huge top margin: anything already scrolled past (fast scroll, restored position) also mounts.
  margin = "10000% 0px 120% 0px",
}: {
  children: ReactNode;
  /** Height-reserving classes for the placeholder, e.g. "h-[340vh]". */
  placeholderClassName: string;
  margin?: `${number}% ${number}px ${number}% ${number}px`;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        startTransition(() => setNear(true));
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near, margin]);

  if (near) return <>{children}</>;
  return <div ref={ref} aria-hidden className={placeholderClassName} />;
}
