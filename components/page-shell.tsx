import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
  size = "lg",
}: {
  children: ReactNode;
  className?: string;
  size?: "md" | "lg" | "xl";
}) {
  return (
    <div
      className={cn(
        "mx-auto px-6 py-8 sm:px-8 sm:py-10",
        size === "md" && "max-w-3xl",
        size === "lg" && "max-w-5xl",
        size === "xl" && "max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  backHref,
  backLabel = "Back",
  title,
  description,
  badges,
  actions,
}: {
  backHref?: string;
  backLabel?: string;
  title: string;
  description?: string;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-10 space-y-6">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {badges}
          </div>
          {description ? (
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function SectionLabel({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-3 mt-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground/80">{description}</p>
      ) : null}
    </div>
  );
}

export function CollapsibleGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm",
        className
      )}
    >
      <div className="divide-y divide-border/70">{children}</div>
    </div>
  );
}

export function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/80 bg-white/60 px-8 py-14 text-center text-sm leading-relaxed text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
