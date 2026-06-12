"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ApproveReportButton({
  reportId,
  token,
}: {
  reportId: string;
  token: string;
}) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  async function approve() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Approval failed (${res.status})`);
        return;
      }
      setRecipientCount(data.recipientCount ?? null);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-950">
        <p className="flex items-center gap-2 font-medium">
          <Check className="h-4 w-4" />
          Report sent to emailees
          {recipientCount != null ? ` (${recipientCount})` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button size="lg" onClick={approve} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Approve & send to emailees"
        )}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
