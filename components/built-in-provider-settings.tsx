"use client";

import { useState } from "react";

import { updateBuiltInProviders } from "@/app/agents/[id]/actions";
import { SettingsSaveFooter } from "@/components/settings-save-footer";
import { useSettingsSave } from "@/hooks/use-settings-save";

type ProviderState = {
  enableNewsApi: boolean;
  enableReddit: boolean;
  enableHackerNews: boolean;
  enableGoogleSearch: boolean;
};

const OPTIONS: Array<{ key: keyof ProviderState; label: string }> = [
  { key: "enableNewsApi", label: "News" },
  { key: "enableReddit", label: "Reddit" },
  { key: "enableHackerNews", label: "Hacker News" },
  { key: "enableGoogleSearch", label: "Google" },
];

export function BuiltInProviderSettings({
  agentId,
  initial,
}: {
  agentId: string;
  initial: ProviderState;
}) {
  const [state, setState] = useState(initial);
  const [saved, setSaved] = useState(initial);

  const dirty = OPTIONS.some(({ key }) => state[key] !== saved[key]);

  const { error, pending, save } = useSettingsSave(async () => {
    await updateBuiltInProviders(agentId, state);
    setSaved(state);
  });

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Built-in keyword providers only run when enabled here and configured in
        your <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env</code>.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={state[key]}
              onChange={(e) =>
                setState((current) => ({ ...current, [key]: e.target.checked }))
              }
              className="accent-primary"
            />
            {label}
          </label>
        ))}
      </div>
      <SettingsSaveFooter dirty={dirty} pending={pending} error={error} onSave={save} />
    </div>
  );
}
