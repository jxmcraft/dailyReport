"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function updateSchedule(agentId: string, cron: string) {
  await prisma.agent.update({
    where: { id: agentId },
    data: { cronSchedule: cron },
  });
  revalidatePath(`/agents/${agentId}`);
}

export async function updateSystemPrompt(agentId: string, systemPrompt: string) {
  const prompt = systemPrompt.trim();
  if (!prompt) {
    throw new Error("System prompt cannot be empty.");
  }
  await prisma.agent.update({
    where: { id: agentId },
    data: { systemPrompt: prompt },
  });
  revalidatePath(`/agents/${agentId}`);
}
