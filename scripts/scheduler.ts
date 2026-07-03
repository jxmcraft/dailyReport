import http from "node:http";

import { PrismaClient } from "@prisma/client";

import { executeAgentPipeline } from "../lib/pipeline";
import { recoverStaleRunningAgents } from "../lib/agent-recovery";
import {
  buildMinuteKey,
  pruneOldSchedulerFires,
  tryRecordCronFire,
} from "../lib/scheduler-fire";

const prisma = new PrismaClient();

const HEALTH_PORT = Number(process.env.SCHEDULER_HEALTH_PORT ?? "3001");
let lastTickAt: string | null = null;

function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ status: "ok", lastTickAt })
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(HEALTH_PORT, () => {
    console.log(`Scheduler health listening on :${HEALTH_PORT}/health`);
  });
}

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

async function tick() {
  const now = new Date();
  lastTickAt = now.toISOString();
  const minuteKey = buildMinuteKey(now);

  await recoverStaleRunningAgents();

  // Only ACTIVE agents are eligible; one mid-run sets itself to RUNNING and is
  // skipped until it returns to ACTIVE, which prevents overlapping runs.
  const agents = await prisma.agent.findMany({ where: { status: "ACTIVE" } });

  for (const agent of agents) {
    if (!cronMatches(agent.cronSchedule, now)) continue;
    const recorded = await tryRecordCronFire(agent.id, minuteKey);
    if (!recorded) continue;

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

  pruneOldSchedulerFires().catch((error) =>
    console.error("SchedulerFire prune failed:", error)
  );
}

async function main() {
  startHealthServer();
  const recovered = await recoverStaleRunningAgents();
  if (recovered > 0) {
    console.warn(`Recovered ${recovered} stale RUNNING agent(s) on startup.`);
  }
  console.log("NewsAgent scheduler running. Checking schedules every 30s. Ctrl+C to stop.");
  await tick();
  setInterval(() => {
    tick().catch((error) => console.error("Scheduler tick failed:", error));
  }, 30_000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
