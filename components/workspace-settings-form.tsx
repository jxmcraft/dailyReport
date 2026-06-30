"use client";

import { useState } from "react";

import { saveWorkspaceSettings } from "@/app/settings/actions";
import { SettingsSaveFooter } from "@/components/settings-save-footer";
import { useSettingsSave } from "@/hooks/use-settings-save";
import type { WorkspaceSettingsView } from "@/lib/workspace-settings";

function secToMs(sec: number): number {
  return Math.round(sec * 1000);
}

function msToSec(ms: number): number {
  return ms / 1000;
}

export function WorkspaceSettingsForm({
  initial,
}: {
  initial: WorkspaceSettingsView;
}) {
  const [llmTimeoutSec, setLlmTimeoutSec] = useState(msToSec(initial.llmTimeoutMs));
  const [sourceFetchTimeoutSec, setSourceFetchTimeoutSec] = useState(
    msToSec(initial.sourceFetchTimeoutMs)
  );
  const [activeRunPollSec, setActiveRunPollSec] = useState(
    msToSec(initial.activeRunPollMs)
  );
  const [saved, setSaved] = useState({
    llmTimeoutSec: msToSec(initial.llmTimeoutMs),
    sourceFetchTimeoutSec: msToSec(initial.sourceFetchTimeoutMs),
    activeRunPollSec: msToSec(initial.activeRunPollMs),
  });

  const dirty =
    llmTimeoutSec !== saved.llmTimeoutSec ||
    sourceFetchTimeoutSec !== saved.sourceFetchTimeoutSec ||
    activeRunPollSec !== saved.activeRunPollSec;

  const { error, pending, save } = useSettingsSave(async () => {
    const next = await saveWorkspaceSettings({
      llmTimeoutMs: secToMs(llmTimeoutSec),
      sourceFetchTimeoutMs: secToMs(sourceFetchTimeoutSec),
      activeRunPollMs: secToMs(activeRunPollSec),
    });
    const snapshot = {
      llmTimeoutSec: msToSec(next.llmTimeoutMs),
      sourceFetchTimeoutSec: msToSec(next.sourceFetchTimeoutMs),
      activeRunPollSec: msToSec(next.activeRunPollMs),
    };
    setSaved(snapshot);
    setLlmTimeoutSec(snapshot.llmTimeoutSec);
    setSourceFetchTimeoutSec(snapshot.sourceFetchTimeoutSec);
    setActiveRunPollSec(snapshot.activeRunPollSec);
  });

  return (
    <div className="space-y-8">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Runtime timeouts apply on the next pipeline run or LLM call. Poll interval
        updates after you refresh pages that watch active runs.
      </p>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="llm-timeout" className="text-sm font-medium">
            LLM timeout
          </label>
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {llmTimeoutSec}s
          </span>
        </div>
        <input
          id="llm-timeout"
          type="range"
          min={30}
          max={600}
          step={10}
          value={llmTimeoutSec}
          onChange={(e) => setLlmTimeoutSec(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>30s</span>
          <span>Default 180s</span>
          <span>600s</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="source-timeout" className="text-sm font-medium">
            Source fetch timeout
          </label>
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {sourceFetchTimeoutSec}s
          </span>
        </div>
        <input
          id="source-timeout"
          type="range"
          min={10}
          max={180}
          step={5}
          value={sourceFetchTimeoutSec}
          onChange={(e) => setSourceFetchTimeoutSec(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10s</span>
          <span>Default 60s</span>
          <span>180s</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="poll-interval" className="text-sm font-medium">
            Active run poll interval
          </label>
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {activeRunPollSec}s
          </span>
        </div>
        <input
          id="poll-interval"
          type="range"
          min={2}
          max={30}
          step={1}
          value={activeRunPollSec}
          onChange={(e) => setActiveRunPollSec(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>2s</span>
          <span>Default 4s</span>
          <span>30s</span>
        </div>
      </div>

      <SettingsSaveFooter dirty={dirty} pending={pending} error={error} onSave={save} />
    </div>
  );
}
