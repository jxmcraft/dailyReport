"use server";

import { revalidatePath } from "next/cache";
import type { Agent } from "@prisma/client";

import {
  buildDeliveryChannelData,
  hasDeliveryConfig,
  parseDeliveryTarget,
} from "@/lib/delivery-config";
import { prisma } from "@/lib/prisma";
import { optimizeSystemPrompt } from "@/lib/prompt-optimizer";

async function requireAgent(agentId: string): Promise<Agent> {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error("Agent not found.");
  return agent;
}

function revalidateAgent(agentId: string, includeIntegrations = false) {
  revalidatePath(`/agents/${agentId}`);
  if (includeIntegrations) revalidatePath("/integrations");
}

export async function updateRelevanceSettings(
  agentId: string,
  relevanceMinScore: number,
  keywordMatchMode: string
) {
  const score = Math.min(10, Math.max(1, Math.round(relevanceMinScore)));
  const mode = keywordMatchMode === "AND" ? "AND" : "OR";

  await prisma.agent.update({
    where: { id: agentId },
    data: { relevanceMinScore: score, keywordMatchMode: mode },
  });
  revalidateAgent(agentId);
}

export async function updateSchedule(agentId: string, cron: string) {
  await prisma.agent.update({
    where: { id: agentId },
    data: { cronSchedule: cron },
  });
  revalidateAgent(agentId);
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
  revalidateAgent(agentId);
}

export async function optimizePromptAction(agentId: string, draftPrompt: string) {
  const agent = await requireAgent(agentId);
  const optimized = await optimizeSystemPrompt(
    draftPrompt,
    agent.topicKeywords,
    agent.name
  );
  return { optimized };
}

export async function updateDeliverySettings(
  agentId: string,
  target: string,
  webhookUrl: string,
  recipientsRaw: string
) {
  const deliveryTarget = parseDeliveryTarget(target);

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { deliveryChannels: { take: 1, orderBy: { id: "asc" } } },
  });
  if (!agent) throw new Error("Agent not found.");

  const channel = agent.deliveryChannels[0];
  const trimmedWebhook = webhookUrl.trim();

  if (!hasDeliveryConfig(deliveryTarget, trimmedWebhook, recipientsRaw)) {
    if (channel) {
      await prisma.deliveryChannel.delete({ where: { id: channel.id } });
    }
    revalidateAgent(agentId, true);
    return;
  }

  const data = buildDeliveryChannelData(
    deliveryTarget,
    trimmedWebhook,
    recipientsRaw
  );

  if (channel) {
    await prisma.deliveryChannel.update({
      where: { id: channel.id },
      data: { target: deliveryTarget, ...data },
    });
  } else {
    await prisma.deliveryChannel.create({
      data: { agentId, target: deliveryTarget, ...data },
    });
  }

  revalidateAgent(agentId, true);
}

export async function deleteAgent(agentId: string) {
  const agent = await requireAgent(agentId);
  if (agent.status === "RUNNING") {
    throw new Error("Cannot delete an agent while a pipeline run is in progress.");
  }

  await prisma.agent.delete({ where: { id: agentId } });
  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/logs");
}
