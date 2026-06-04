"use client";

import { useMemo, useState } from "react";

import { SettingsSaveFooter } from "@/components/settings-save-footer";
import { selectClass } from "@/components/ui/form-classes";
import { updateSchedule } from "@/app/agents/[id]/actions";
import { useSettingsSave } from "@/hooks/use-settings-save";
import {
  DOW,
  parseCron,
  toCron,
  type CronInterval,
} from "@/lib/cron";

export function CronConfigurator({
  cron,
  agentId,
}: {
  cron: string;
  agentId: string;
}) {
  const initial = useMemo(() => parseCron(cron), [cron]);
  const [interval, setInterval] = useState<CronInterval>(initial.interval);
  const [time, setTime] = useState(initial.time);
  const [dow, setDow] = useState(initial.dow);
  const [savedCron, setSavedCron] = useState(cron);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const expression = toCron(interval, time, dow);
  const dirty = expression !== savedCron;

  const { pending, save } = useSettingsSave(async () => {
    await updateSchedule(agentId, expression);
    setSavedCron(expression);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Frequency</span>
          <select
            className={selectClass}
            value={interval}
            onChange={(e) => setInterval(e.target.value as CronInterval)}
          >
            <option>Hourly</option>
            <option>Daily</option>
            <option>Weekly</option>
          </select>
        </label>

        {interval === "Weekly" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Day</span>
            <select
              className={selectClass}
              value={dow}
              onChange={(e) => setDow(Number(e.target.value))}
            >
              {DOW.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}

        {interval !== "Hourly" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Time ({tz})</span>
            <input
              type="time"
              className={selectClass}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        )}
      </div>

      <SettingsSaveFooter
        dirty={dirty}
        pending={pending}
        error={null}
        onSave={save}
        label="Save schedule"
      />

      <p className="text-xs text-muted-foreground">
        Stored cron expression:{" "}
        <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">
          {expression}
        </code>
      </p>
    </div>
  );
}
