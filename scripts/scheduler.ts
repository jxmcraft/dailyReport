import { PrismaClient } from "@prisma/client";

import { executeAgentPipeline } from "../lib/pipeline";

const prisma = new PrismaClient();

// Cron is evaluated against local machine time, matching the time the user picks
// in the schedule UI (CronConfigurator stores the literal local HH:MM).
function fieldMatches(field: string, value: number): boolean {
  for (const part of field.split(",")) {
    if (part === "*") return true;
    if (part.startsWith("*/")) {
      const step = Number(part.slice(2));
      if (step > 0 && value % step === 0) return true;
      continue;
    }
    if (Number(part) === value) return true;
  }
  return false;
}

// Minimal 5-field cron matcher (minute hour day-of-month month day-of-week).
// Supports `*`, exact numbers, `*/step`, and comma lists — enough for every
// expression the configurator produces.
function cronMatches(expr: string, date: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, mon, dow] = parts;
  return (
    fieldMatches(min, date.getMinutes()) &&
    fieldMatches(hour, date.getHours()) &&
    fieldMatches(dom, date.getDate()) &&
    fieldMatches(mon, date.getMonth() + 1) &&
    fieldMatches(dow, date.getDay())
  );
}

// Dedupe key at minute granularity so an agent fires at most once per matching
// minute, even though we tick more often than once a minute.
const triggered = new Set<string>();

async function tick() {
  const now = new Date();
  const minuteStamp = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

  // Only ACTIVE agents are eligible; one mid-run sets itself to RUNNING and is
  // skipped until it returns to ACTIVE, which prevents overlapping runs.
  const agents = await prisma.agent.findMany({ where: { status: "ACTIVE" } });

  for (const agent of agents) {
    if (!cronMatches(agent.cronSchedule, now)) continue;
    const key = `${agent.id}:${minuteStamp}`;
    if (triggered.has(key)) continue;
    triggered.add(key);

    console.log(`[${now.toISOString()}] Triggering "${agent.name}" (${agent.id})`);
    try {
      const result = await executeAgentPipeline(agent.id);
      if (result.outcome !== "success") {
        const detail =
          result.outcome === "skipped" ? result.reason : result.message;
        console.warn(`Pipeline ${result.outcome} for ${agent.id}:`, detail);
      }
    } catch (error) {
      console.error(`Pipeline failed for ${agent.id}:`, error);
    }
  }

  if (triggered.size > 5000) triggered.clear();
}

async function main() {
  console.log("PulseAgent scheduler running. Checking schedules every 30s. Ctrl+C to stop.");
  await tick();
  setInterval(() => {
    tick().catch((error) => console.error("Scheduler tick failed:", error));
  }, 30_000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
