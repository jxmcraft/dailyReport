"use server";

import { redirect } from "next/navigation";

import { buildCronFromFrequency } from "@/lib/cron";
import {
  DEFAULT_MAX_RANKED_SOURCES,
  DEFAULT_MIN_RANKED_SOURCES,
} from "@/lib/constants";
import {
  buildDeliveryChannelData,
  hasDeliveryConfig,
  parseDeliveryTarget,
} from "@/lib/delivery-config";
import { prisma } from "@/lib/prisma";
import {
  validateScrapeUrl as validateScrapeUrlImpl,
  type ScrapeCheckResult,
} from "@/lib/scrape-validation";

export type { ScrapeCheckResult };

export async function validateScrapeUrl(rawUrl: string): Promise<ScrapeCheckResult> {
  return validateScrapeUrlImpl(rawUrl);
}

export async function createAgent(formData: FormData) {
  const get = (key: string) => String(formData.get(key) ?? "").trim();

  const name = get("name");
  if (!name) throw new Error("Agent name is required.");

  const topicKeywords = get("keywords")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const scrapeUrls = formData
    .getAll("scrapeUrl")
    .map((u) => String(u).trim())
    .filter((u) => /^https?:\/\//i.test(u));

  if (topicKeywords.length === 0 && scrapeUrls.length === 0) {
    throw new Error(
      "Add at least one topic keyword (built-in sources use these) or a webpage URL to scrape."
    );
  }

  const target = parseDeliveryTarget(get("target") || "SLACK");
  const webhookUrl = get("webhookUrl");
  const recipientsRaw = get("recipients");
  const approversRaw = get("approvers");
  const requireEmailApproval = get("requireEmailApproval") !== "false";
  const autoSendEmail = get("autoSendEmail") !== "false";
  const enableNewsApi = formData.get("enableNewsApi") === "true";
  const enableReddit = formData.get("enableReddit") === "true";
  const enableHackerNews = formData.get("enableHackerNews") === "true";
  const enableGoogleSearch = formData.get("enableGoogleSearch") === "true";
  const systemPrompt =
    get("systemPrompt") ||
    `Summarize the latest updates about ${topicKeywords.join(", ") || name} in Markdown with sections and bullet points.`;

  const agent = await prisma.agent.create({
    data: {
      name,
      topicKeywords,
      cronSchedule: buildCronFromFrequency(
        get("frequency") || "Daily",
        get("time") || "07:00"
      ),
      systemPrompt,
      relevanceMinScore: 3,
      minRankedSources: DEFAULT_MIN_RANKED_SOURCES,
      maxRankedSources: DEFAULT_MAX_RANKED_SOURCES,
      shallowScrapeMaxLinks: 0,
      enableNewsApi,
      enableReddit,
      enableHackerNews,
      enableGoogleSearch,
      keywordMatchMode: "OR",
      status: "ACTIVE",
      dataSources: {
        create: scrapeUrls.map((url) => ({
          sourceType: "CUSTOM_SCRAPE" as const,
          apiEndpoint: url,
          authSecretKeyRef: "NONE",
        })),
      },
      deliveryChannels: hasDeliveryConfig(
        target,
        webhookUrl,
        recipientsRaw,
        approversRaw,
        requireEmailApproval
      )
        ? {
            create: [
              {
                target,
                ...buildDeliveryChannelData(
                  target,
                  webhookUrl,
                  recipientsRaw,
                  approversRaw,
                  requireEmailApproval,
                  autoSendEmail
                ),
              },
            ],
          }
        : undefined,
    },
  });

  redirect(`/agents/${agent.id}`);
}
