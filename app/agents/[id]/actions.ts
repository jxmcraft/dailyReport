"use server";

import { revalidatePath } from "next/cache";
import type { Agent } from "@prisma/client";

import {
  buildDeliveryChannelData,
  hasDeliveryConfig,
  parseDeliveryTarget,
} from "@/lib/delivery-config";
import { dispatchToChannel } from "@/lib/delivery";
import { executeAgentPipeline } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { optimizeSystemPrompt } from "@/lib/prompt-optimizer";
import {
  validateScrapeUrl as validateScrapeUrlImpl,
  type ScrapeCheckResult,
} from "@/lib/scrape-validation";

export type { ScrapeCheckResult };

export async function validateScrapeUrlAction(
  rawUrl: string
): Promise<ScrapeCheckResult> {
  return validateScrapeUrlImpl(rawUrl);
}

function normalizeScrapeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

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
  keywordMatchMode: string,
  minRankedSources: number
) {
  const score = Math.min(10, Math.max(1, Math.round(relevanceMinScore)));
  const mode = keywordMatchMode === "AND" ? "AND" : "OR";
  const minSources = Math.min(12, Math.max(1, Math.round(minRankedSources)));

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      relevanceMinScore: score,
      keywordMatchMode: mode,
      minRankedSources: minSources,
    },
  });
  revalidateAgent(agentId);
}

export async function updateAgentName(agentId: string, name: string) {
  const agent = await requireAgent(agentId);
  if (agent.status === "RUNNING") {
    throw new Error("Cannot rename an agent while a pipeline run is in progress.");
  }

  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Agent name cannot be empty.");
  }

  await prisma.agent.update({
    where: { id: agentId },
    data: { name: trimmed },
  });
  revalidateAgent(agentId);
  revalidatePath("/");
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
  recipientsRaw: string,
  approversRaw: string,
  requireEmailApproval: boolean,
  autoSendEmail: boolean
) {
  const deliveryTarget = parseDeliveryTarget(target);

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { deliveryChannels: { take: 1, orderBy: { id: "asc" } } },
  });
  if (!agent) throw new Error("Agent not found.");

  const channel = agent.deliveryChannels[0];
  const trimmedWebhook = webhookUrl.trim();

  if (
    !hasDeliveryConfig(
      deliveryTarget,
      trimmedWebhook,
      recipientsRaw,
      approversRaw,
      requireEmailApproval
    )
  ) {
    if (channel) {
      await prisma.deliveryChannel.delete({ where: { id: channel.id } });
    }
    revalidateAgent(agentId, true);
    return;
  }

  const data = buildDeliveryChannelData(
    deliveryTarget,
    trimmedWebhook,
    recipientsRaw,
    approversRaw,
    requireEmailApproval,
    autoSendEmail
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

export async function updateTopicKeywords(agentId: string, keywords: string[]) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { dataSources: true },
  });
  if (!agent) throw new Error("Agent not found.");
  if (agent.status === "RUNNING") {
    throw new Error("Cannot edit keywords while a pipeline run is in progress.");
  }

  const normalized = keywords.map((k) => k.trim()).filter(Boolean);
  const seen = new Set<string>();
  const topicKeywords: string[] = [];
  for (const k of normalized) {
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topicKeywords.push(k);
  }

  const hasScrape = agent.dataSources.some(
    (s) => s.sourceType === "CUSTOM_SCRAPE"
  );
  if (topicKeywords.length === 0 && !hasScrape) {
    throw new Error(
      "Add at least one topic keyword, or add a webpage scrape source."
    );
  }

  await prisma.agent.update({
    where: { id: agentId },
    data: { topicKeywords },
  });
  revalidateAgent(agentId);
  revalidatePath("/");
}

export async function updateScrapeUrls(
  agentId: string,
  urls: string[]
): Promise<string[]> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { dataSources: true },
  });
  if (!agent) throw new Error("Agent not found.");
  if (agent.status === "RUNNING") {
    throw new Error("Cannot edit scrape URLs while a pipeline run is in progress.");
  }

  const normalized = normalizeScrapeUrls(urls);
  if (normalized.length === 0 && agent.topicKeywords.length === 0) {
    throw new Error(
      "Add at least one scrape URL, or add topic keywords for built-in sources."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.dataSource.deleteMany({
      where: { agentId, sourceType: "CUSTOM_SCRAPE" },
    });
    if (normalized.length > 0) {
      await tx.dataSource.createMany({
        data: normalized.map((apiEndpoint) => ({
          agentId,
          sourceType: "CUSTOM_SCRAPE" as const,
          apiEndpoint,
          authSecretKeyRef: "NONE",
        })),
      });
    }
  });

  revalidateAgent(agentId);
  return normalized;
}

export async function clearAgentReports(agentId: string) {
  const agent = await requireAgent(agentId);
  if (agent.status === "RUNNING") {
    throw new Error("Cannot clear logs while a pipeline run is in progress.");
  }

  await prisma.intelligenceReport.deleteMany({ where: { agentId } });
  revalidateAgent(agentId);
  revalidatePath("/logs");
  revalidatePath("/reports");
  revalidatePath("/");
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

export async function setAgentPaused(agentId: string, paused: boolean) {
  const agent = await requireAgent(agentId);
  if (agent.status === "RUNNING") {
    throw new Error("Cannot pause or resume an agent while a pipeline run is in progress.");
  }

  await prisma.agent.update({
    where: { id: agentId },
    data: { status: paused ? "PAUSED" : "ACTIVE" },
  });
  revalidateAgent(agentId);
  revalidatePath("/");
}

export async function triggerPipeline(agentId: string) {
  const agent = await requireAgent(agentId);
  if (agent.status === "PAUSED") {
    throw new Error("Cannot trigger a paused agent. Resume it first.");
  }
  if (agent.status === "RUNNING") {
    throw new Error("A pipeline run is already in progress.");
  }

  void executeAgentPipeline(agentId)
    .then((result) => {
      if (result.outcome === "no_data" || result.outcome === "error") {
        console.warn(`Pipeline ${result.outcome} for ${agentId}:`, result.message);
      }
    })
    .catch((error) => {
      console.error(`Pipeline failed for ${agentId}:`, error);
    });

  return { ok: true as const, started: true as const };
}

export async function sendReportEmail(reportId: string) {
  const report = await prisma.intelligenceReport.findUnique({
    where: { id: reportId },
    include: {
      agent: {
        include: { deliveryChannels: { take: 1, orderBy: { id: "asc" } } },
      },
    },
  });
  if (!report) throw new Error("Report not found.");
  if (report.agent.status === "RUNNING") {
    throw new Error("Cannot send email while a pipeline run is in progress.");
  }
  const channel = report.agent.deliveryChannels[0];
  if (!channel || channel.target !== "EMAIL") {
    throw new Error("Email delivery is not configured for this agent.");
  }
  if (channel.recipientList.length === 0) {
    throw new Error("No emailee addresses configured for this agent.");
  }

  await dispatchToChannel(channel, report.generatedMarkdown, {
    reportId: report.id,
    agentName: report.agent.name,
  });

  revalidateAgent(report.agentId);
  revalidatePath("/logs");
  revalidatePath("/reports");
  revalidatePath("/");
}
