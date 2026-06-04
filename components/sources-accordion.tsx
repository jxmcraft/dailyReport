"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, type SourceView } from "@/lib/agents";

export function SourcesAccordion({ sources }: { sources: SourceView[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
      >
        <span className="text-muted-foreground">
          Sources <span className="text-foreground">({sources.length})</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <ul className="divide-y divide-border/60 border-t border-border/60">
          {sources.map((s) => (
            <li key={s.url} className="space-y-1.5 px-4 py-3.5">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {s.title}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {s.snippet}
              </p>
              <p className="text-xs text-muted-foreground/80">
                Fetched {formatDate(s.timestampFetched)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
