"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Plus, X } from "lucide-react";

import { validateScrapeUrl, type ScrapeCheckResult } from "@/app/agents/new/actions";
import { inputClass } from "@/components/ui/form-classes";

interface Row {
  url: string;
  checking: boolean;
  result: ScrapeCheckResult | null;
}

const emptyRow = (): Row => ({ url: "", checking: false, result: null });

export function WebSourcesSection() {
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [, startTransition] = useTransition();

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const check = (i: number) => {
    const url = rows[i].url.trim();
    if (!url) return;
    update(i, { checking: true, result: null });
    startTransition(async () => {
      const result = await validateScrapeUrl(url);
      update(i, { checking: false, result });
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Built-in sources (News, Reddit, Hacker News, and Google) run automatically
        from your topic keywords. Optionally add specific webpage URLs to scrape —
        just paste the link, no API needed.
      </p>

      {rows.map((row, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex gap-2">
            <input
              name="scrapeUrl"
              value={row.url}
              onChange={(e) => update(i, { url: e.target.value, result: null })}
              placeholder="https://example.com/blog/article"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => check(i)}
              disabled={row.checking || !row.url.trim()}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              {row.checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Check link
            </button>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input hover:bg-accent"
                aria-label="Remove URL"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {row.result && (
            <div
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                row.result.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {row.result.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                {row.result.message}
                {row.result.title ? ` (\u201c${row.result.title}\u201d)` : ""}
              </span>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, emptyRow()])}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Plus className="h-4 w-4" />
        Add another URL
      </button>
    </div>
  );
}
