"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

import { useAgentRun } from "@/components/agent-run-context";
import { Button } from "@/components/ui/button";
import { AGENT_STATUS_POLL_MS } from "@/lib/constants";
import { fetchAgentStatus } from "@/lib/client-api";

export function TriggerButton({ agentId }: { agentId: string }) {
  const router = useRouter();
  const { isRunning } = useAgentRun();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = pending || isRunning;

  const waitForIdle = useCallback(async () => {
    for (let i = 0; i < 120; i++) {
      const data = await fetchAgentStatus(agentId);
      if (data && data.status !== "RUNNING") {
        router.refresh();
        return;
      }
      await new Promise((r) => setTimeout(r, AGENT_STATUS_POLL_MS));
    }
    router.refresh();
  }, [agentId, router]);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipeline/${agentId}/run`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Run failed (${res.status})`);
        setPending(false);
        return;
      }
      await waitForIdle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setPending(false);
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
      {loading ? (
        <span className="max-w-xs text-right text-xs text-muted-foreground">
          Pipeline active — page updates automatically
        </span>
      ) : null}
      {error && (
        <span className="max-w-xs text-right text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
