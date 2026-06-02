"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Plug, ScrollText, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Agents Dashboard", icon: LayoutGrid },
  { href: "/integrations", label: "Global API Integrations", icon: Plug },
  { href: "/logs", label: "Activity Logs", icon: ScrollText },
  { href: "/settings", label: "System Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
        <span className="text-lg font-semibold">PulseAgent</span>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
