"use client";

import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

import { formatDate, type SourceDiagnostic } from "@/lib/agents";

function StatusIcon({ status }: { status: "ok" | "error" }) {
  return status === "ok" ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
  ) : (
    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
  );
}

export function SourceHealthCard({
  diagnostics,
}: {
  diagnostics: SourceDiagnostic[] | null;
}) {
  if (!diagnostics || diagnostics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No source diagnostics from the latest run.
      </p>
    );
  }

  return (
    <div className="space-y-3">
        {diagnostics.map((d) => (
          <div
            key={d.sourceId}
            className="flex items-start gap-3 rounded-lg border border-border/60 bg-white p-4"
          >
            <StatusIcon status={d.status} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{d.sourceType}</span>
                {d.httpStatus !== undefined && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-mono ${
                      d.httpStatus >= 200 && d.httpStatus < 300
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    HTTP {d.httpStatus}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {d.itemsIngested} item{d.itemsIngested !== 1 ? "s" : ""} ingested
                </span>
                {d.retriedWithBroaderQuery && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                    <RefreshCw className="h-3 w-3" />
                    retried with broader query
                  </span>
                )}
              </div>
              {d.errorReason && (
                <p className="text-xs text-red-600">{d.errorReason}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {d.endpoint}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Checked {formatDate(d.checkedAt)}
              </p>
            </div>
          </div>
        ))}
    </div>
  );
}
