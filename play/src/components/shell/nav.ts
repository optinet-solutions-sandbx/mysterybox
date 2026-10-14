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

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/box/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
