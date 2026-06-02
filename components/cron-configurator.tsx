"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateSchedule } from "@/app/agents/[id]/actions";

type Interval = "Hourly" | "Daily" | "Weekly";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseCron(cron: string): { interval: Interval; time: string; dow: number } {
  const parts = cron.trim().split(/\s+/);
  const [min = "0", hour = "7", , , dowField = "*"] = parts;
  if (hour.startsWith("*/")) {
    return { interval: "Hourly", time: "07:00", dow: 1 };
  }
  const time = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  if (dowField !== "*") {
    return { interval: "Weekly", time, dow: Number(dowField) || 1 };
  }
  return { interval: "Daily", time, dow: 1 };
}

function toCron(interval: Interval, time: string, dow: number): string {
  const [hour, min] = time.split(":").map((v) => Number(v));
  if (interval === "Hourly") return "0 */1 * * *";
  if (interval === "Weekly") return `${min} ${hour} * * ${dow}`;
  return `${min} ${hour} * * *`;
}

const selectClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function CronConfigurator({
  cron,
  agentId,
}: {
  cron: string;
  agentId: string;
}) {
  const initial = useMemo(() => parseCron(cron), [cron]);
  const [interval, setInterval] = useState<Interval>(initial.interval);
  const [time, setTime] = useState(initial.time);
  const [dow, setDow] = useState(initial.dow);
  const [savedCron, setSavedCron] = useState(cron);
  const [pending, startTransition] = useTransition();

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const expression = toCron(interval, time, dow);
  const dirty = expression !== savedCron;

  function save() {
    startTransition(async () => {
      await updateSchedule(agentId, expression);
      setSavedCron(expression);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Frequency</span>
          <select
            className={selectClass}
            value={interval}
            onChange={(e) => setInterval(e.target.value as Interval)}
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

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={!dirty || pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {pending ? "Saving…" : "Save schedule"}
        </Button>
        {!dirty && !pending && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Stored cron expression:{" "}
        <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">
          {expression}
        </code>
      </p>
    </div>
  );
}
