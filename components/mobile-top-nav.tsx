"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV } from "@/components/sidebar";
import { cn } from "@/lib/utils";

export function MobileTopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/95 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-base font-semibold text-foreground">NewsAgent</p>
          <p className="text-xs text-muted-foreground">Intelligence platform</p>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Mobile navigation">
        {NAV.flatMap((group) => group.items).map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/70 text-muted-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
