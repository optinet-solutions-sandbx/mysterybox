"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, NAV, navDirection } from "./nav";

/** Phone navigation, pinned to the bottom like the app's tab bar. Hidden from lg up. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      style={{ viewTransitionName: "tab-bar" }}
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-[28px] border border-line bg-surface lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 p-1.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                transitionTypes={navDirection(pathname, href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[22px] py-2 text-[11px] font-medium transition-colors",
                  active ? "bg-[image:var(--primary-btn)] text-fg shadow-[var(--velvet-inset)]" : "text-muted hover:text-fg",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.7} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
