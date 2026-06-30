"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { clearAgentReports } from "@/app/agents/[id]/actions";
import { clearAllReports } from "@/app/logs/actions";
import { Button } from "@/components/ui/button";

export function ClearLogsButton({
  scope,
  agentId,
  agentName,
  disabled = false,
  onCleared,
}: {
  scope: "all" | "agent";
  agentId?: string;
  agentName?: string;
  disabled?: boolean;
  onCleared?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClear() {
    const message =
      scope === "all"
        ? "Clear all activity logs? This permanently removes every report across all agents."
        : `Clear activity logs for "${agentName}"? All reports for this agent will be permanently removed.`;

    if (!window.confirm(message)) return;

    setError(null);
    startTransition(async () => {
      try {
        if (scope === "all") {
          await clearAllReports();
        } else {
          if (!agentId) throw new Error("Agent ID is required.");
          await clearAgentReports(agentId);
        }
        onCleared?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to clear logs.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClear}
        disabled={disabled || pending}
        className="border-amber-200 text-amber-800 hover:bg-amber-50"
      >
        {pending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-1.5 h-4 w-4" />
        )}
        {pending ? "Clearing…" : scope === "all" ? "Clear all logs" : "Clear logs"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
