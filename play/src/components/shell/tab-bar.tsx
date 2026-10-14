"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, NAV } from "./nav";

/** Phone navigation, pinned to the bottom like the app's tab bar. Hidden from lg up. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-bg pb-safe lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 px-2 pt-1.5 pb-1.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "mx-1 flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition-colors",
                  active ? "bg-surface text-fg" : "text-subtle",
                )}
              >
                <Icon className={cn("size-[22px]", active && "text-accent")} strokeWidth={active ? 2.1 : 1.7} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
