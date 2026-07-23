"use client";

import { useState, useTransition } from "react";
import { Loader2, Zap } from "lucide-react";

import { triggerPipeline } from "@/app/agents/[id]/actions";
import { useAgentRun } from "@/components/agent-run-context";
import { Button } from "@/components/ui/button";

export function TriggerButton({
  agentId,
  disabled = false,
}: {
  agentId: string;
  disabled?: boolean;
}) {
  const { isRunning, status, startWatching, setOptimisticStatus } = useAgentRun();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loading = pending || isRunning;
  const isPaused = status === "PAUSED";

  function run() {
    setError(null);
    setNotice(null);
    startWatching();
    setOptimisticStatus("RUNNING");
    startTransition(async () => {
      try {
        const result = await triggerPipeline(agentId);
        if (result.reportStatus === "PARTIAL_FAILURE") {
          setNotice("Run completed, but delivery or source issues were detected.");
        }
      } catch (e) {
        setOptimisticStatus("ACTIVE");
        setError(e instanceof Error ? e.message : "Run failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={run} disabled={loading || disabled || isPaused}>
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
      {notice ? (
        <span className="max-w-xs text-right text-xs text-amber-700">{notice}</span>
      ) : null}
    </div>
  );
}
