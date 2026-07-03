import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Minute bucket in scheduler local time (matches cron evaluation). */
export function buildMinuteKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
}

/** Record a cron fire; returns false if this agent already fired this minute. */
export async function tryRecordCronFire(
  agentId: string,
  minuteKey: string
): Promise<boolean> {
  try {
    await prisma.schedulerFire.create({
      data: { agentId, minuteKey },
    });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }
    throw error;
  }
}

export async function pruneOldSchedulerFires(
  olderThanDays = 8
): Promise<void> {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
  await prisma.schedulerFire.deleteMany({
    where: { firedAt: { lt: cutoff } },
  });
}
