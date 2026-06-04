"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutGrid,
  Plug,
  ScrollText,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutGrid },
      { href: "/reports", label: "Daily Reports", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/logs", label: "Activity Logs", icon: ScrollText },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[15.5rem] shrink-0 flex-col border-r border-border/80 bg-white">
      <div className="flex h-[4.25rem] items-center gap-2.5 border-b border-border/80 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        </span>
        <div>
          <span className="block text-base font-semibold leading-none">
            PulseAgent
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Intelligence platform
          </span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-6 p-4">
        {NAV.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
