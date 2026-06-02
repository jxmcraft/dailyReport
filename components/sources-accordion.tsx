"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, type SourceView } from "@/lib/agents";

export function SourcesAccordion({ sources }: { sources: SourceView[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span>Sources Audited ({sources.length})</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {sources.map((s) => (
            <li key={s.url} className="space-y-1 px-4 py-3">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {s.title}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="text-xs text-muted-foreground">{s.snippet}</p>
              <p className="text-[11px] text-muted-foreground">
                Fetched {formatDate(s.timestampFetched)} &middot;{" "}
                <span className="break-all">{s.url}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
