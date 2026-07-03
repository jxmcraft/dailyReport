import { LLM_TIMEOUT_MS, SOURCE_FETCH_TIMEOUT_MS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/** Max expected pipeline duration + buffer before RUNNING is considered stale. */
export const STALE_RUNNING_MS =
  LLM_TIMEOUT_MS + SOURCE_FETCH_TIMEOUT_MS + 120_000;

export async function recoverStaleRunningAgents(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_RUNNING_MS);
  const result = await prisma.agent.updateMany({
    where: { status: "RUNNING", updatedAt: { lt: cutoff } },
    data: { status: "ACTIVE" },
  });
  return result.count;
}
