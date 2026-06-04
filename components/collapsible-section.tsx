"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type CollapsibleVariant = "standalone" | "nested" | "inset";

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  badge,
  children,
  className,
  variant = "standalone",
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: CollapsibleVariant;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const isStandalone = variant === "standalone";
  const isInset = variant === "inset";

  return (
    <div
      className={cn(
        isStandalone &&
          "overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm",
        isInset && "rounded-lg bg-slate-50/80",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-start gap-3 text-left transition-colors",
          isStandalone && "px-5 py-4 hover:bg-slate-50/60",
          variant === "nested" && "px-5 py-4 hover:bg-slate-50/60",
          isInset && "px-4 py-3 hover:bg-slate-100/60"
        )}
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-semibold text-foreground",
                isInset ? "text-sm" : "text-base"
              )}
            >
              {title}
            </span>
            {badge}
          </div>
          {subtitle ? (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
      </button>
      {open ? (
        <div
          className={cn(
            "border-t border-border/70",
            isStandalone && "px-5 py-5",
            variant === "nested" && "bg-slate-50/30 px-5 py-5",
            isInset && "px-4 py-4"
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
