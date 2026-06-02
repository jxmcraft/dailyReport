"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TriggerButton({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipeline/${agentId}/run`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Run failed (${res.status})`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={run} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Zap className="mr-1.5 h-4 w-4" />
        )}
        {loading ? "Running…" : "Trigger Instantly"}
      </Button>
      {error && <span className="max-w-xs text-right text-xs text-red-600">{error}</span>}
    </div>
  );
}
