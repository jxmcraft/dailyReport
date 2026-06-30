"use client";

import { useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Plus, X } from "lucide-react";

import type { ScrapeCheckResult } from "@/lib/scrape-validation";
import { inputClass } from "@/components/ui/form-classes";

export interface ScrapeUrlRow {
  url: string;
  checking: boolean;
  result: ScrapeCheckResult | null;
}

export const emptyScrapeRow = (): ScrapeUrlRow => ({
  url: "",
  checking: false,
  result: null,
});

export function rowsToUrls(rows: ScrapeUrlRow[]): string[] {
  return rows.map((r) => r.url.trim()).filter(Boolean);
}

export function urlsToRows(urls: string[]): ScrapeUrlRow[] {
  if (urls.length === 0) return [emptyScrapeRow()];
  return urls.map((url) => ({ url, checking: false, result: null }));
}

export function ScrapeUrlEditor({
  rows,
  onRowsChange,
  checkUrl,
  formMode = false,
}: {
  rows: ScrapeUrlRow[];
  onRowsChange: (rows: ScrapeUrlRow[]) => void;
  checkUrl: (url: string) => Promise<ScrapeCheckResult>;
  formMode?: boolean;
}) {
  const [, startTransition] = useTransition();

  const update = (i: number, patch: Partial<ScrapeUrlRow>) =>
    onRowsChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const check = (i: number) => {
    const url = rows[i].url.trim();
    if (!url) return;
    update(i, { checking: true, result: null });
    startTransition(async () => {
      const result = await checkUrl(url);
      onRowsChange(
        rows.map((r, idx) =>
          idx === i ? { ...r, checking: false, result } : r
        )
      );
    });
  };

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex gap-2">
            <input
              {...(formMode ? { name: "scrapeUrl" } : {})}
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
                onClick={() =>
                  onRowsChange(rows.filter((_, idx) => idx !== i))
                }
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
        onClick={() => onRowsChange([...rows, emptyScrapeRow()])}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Plus className="h-4 w-4" />
        Add another URL
      </button>
    </div>
  );
}
