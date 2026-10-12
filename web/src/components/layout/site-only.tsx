"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Public-site chrome (header, footer, age gate, smooth scroll, cursor) stays out of the back office. */
export function SiteOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname === "/admin" || pathname.startsWith("/admin/") ? null : children;
}
