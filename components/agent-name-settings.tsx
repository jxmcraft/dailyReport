"use client";

import { useState } from "react";

import { updateAgentName } from "@/app/agents/[id]/actions";
import { SettingsSaveFooter } from "@/components/settings-save-footer";
import { useSettingsSave } from "@/hooks/use-settings-save";

export function AgentNameSettings({
  agentId,
  initialName,
}: {
  agentId: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(initialName);

  const dirty = name !== saved;

  const { error, pending, save } = useSettingsSave(async () => {
    await updateAgentName(agentId, name);
    const trimmed = name.trim();
    setName(trimmed);
    setSaved(trimmed);
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="agent-name" className="text-sm font-medium">
          Display name
        </label>
        <input
          id="agent-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Daily Competitor Intelligence"
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      <SettingsSaveFooter dirty={dirty} pending={pending} error={error} onSave={save} />
    </div>
  );
}
