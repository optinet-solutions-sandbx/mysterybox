"use client";

import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo-mark";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Signed-out stand-in for pages that need an account (inventory, wallet, account). */
export function AuthPrompt({ title, body, className }: { title: string; body: string; className?: string }) {
  const pathname = usePathname();
  const next = encodeURIComponent(pathname);
  return (
    <div className={cn("mx-auto max-w-xl rounded-card border border-line bg-[image:var(--card)] px-6 py-12 text-center sm:px-12", className)}>
      <LogoMark className="mx-auto w-16" sizes="64px" />
      <h2 className="mt-6 font-display text-3xl font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href={`/sign-in?next=${next}`}>Sign in</ButtonLink>
        <ButtonLink href={`/register?next=${next}`} variant="secondary">
          Create an account
        </ButtonLink>
      </div>
    </div>
  );
}
