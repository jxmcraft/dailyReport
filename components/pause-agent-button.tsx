"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play } from "lucide-react";

import { setAgentPaused } from "@/app/agents/[id]/actions";
import { useAgentRun } from "@/components/agent-run-context";
import { Button } from "@/components/ui/button";

export function PauseAgentButton({
  agentId,
  initialPaused,
}: {
  agentId: string;
  initialPaused: boolean;
}) {
  const router = useRouter();
  const { isRunning, setOptimisticStatus } = useAgentRun();
  const [paused, setPaused] = useState(initialPaused);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    setError(null);
    const next = !paused;
    startTransition(async () => {
      try {
        await setAgentPaused(agentId, next);
        setPaused(next);
        setOptimisticStatus(next ? "PAUSED" : "ACTIVE");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update agent status.");
      }
    });
  }

  const loading = pending || isRunning;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        onClick={toggle}
        disabled={loading}
      >
        {pending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : paused ? (
          <Play className="mr-1.5 h-4 w-4" />
        ) : (
          <Pause className="mr-1.5 h-4 w-4" />
        )}
        {paused ? "Resume" : "Pause"}
      </Button>
      {error ? (
        <span className="max-w-xs text-right text-xs text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
