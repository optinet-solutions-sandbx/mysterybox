import { Box, Crown, LayoutGrid, Vault, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** The four sections of the app, as in the IcyBox tab bar. */
export const NAV: NavItem[] = [
  { href: "/", label: "Boxes", icon: Box },
  { href: "/showroom", label: "Showroom", icon: LayoutGrid },
  { href: "/collection", label: "Collection", icon: Vault },
  { href: "/rewards", label: "Rewards", icon: Crown },
];

/** Slide direction for a tab change: forward when the target tab is to the right. */
export function navDirection(pathname: string, href: string): string[] {
  const from = NAV.findIndex((n) => isActive(pathname, n.href));
  const to = NAV.findIndex((n) => n.href === href);
  if (from === -1 || to === from) return [];
  return [to > from ? "nav-forward" : "nav-back"];
}

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/box/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
