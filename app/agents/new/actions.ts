"use server";

import { redirect } from "next/navigation";
import type { DeliveryTarget } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { htmlToText, extractTitle } from "@/lib/sources";

function buildCron(frequency: string, time: string): string {
  const [hour, minute] = (time || "07:00").split(":").map(Number);
  if (frequency === "Hourly") return "0 */1 * * *";
  if (frequency === "Weekly") return `${minute} ${hour} * * 1`;
  return `${minute} ${hour} * * *`;
}

export interface ScrapeCheckResult {
  ok: boolean;
  message: string;
  title?: string;
}

// Probe a webpage so the user knows before saving whether it can be scraped.
export async function validateScrapeUrl(
  rawUrl: string
): Promise<ScrapeCheckResult> {
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, message: "Enter a full URL starting with http:// or https://" };
  }
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PulseAgent/1.0; +https://localhost)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { ok: false, message: `Site returned HTTP ${res.status} — it may block scraping.` };
    }
    const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html")) {
      return {
        ok: false,
        message: `Not an HTML page (${contentType || "unknown"}). Use a link to an article or readable page.`,
      };
    }
    const html = await res.text();
    const text = htmlToText(html);
    if (text.length < 200) {
      return {
        ok: false,
        message: "Very little readable text found — this page may be JavaScript-heavy and won't scrape well.",
      };
    }
    return {
      ok: true,
      message: `Looks good — about ${text.length.toLocaleString()} characters of readable text.`,
      title: extractTitle(html) || undefined,
    };
  } catch {
    return { ok: false, message: "Could not fetch the page (timeout, blocked, or invalid URL)." };
  }
}

export async function createAgent(formData: FormData) {
  const get = (key: string) => String(formData.get(key) ?? "").trim();

  const name = get("name");
  if (!name) throw new Error("Agent name is required.");

  const topicKeywords = get("keywords")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  // User sources are plain webpage URLs (no API knowledge required). Built-in
  // sources (News, Reddit, Hacker News, Google) run automatically from keywords.
  const scrapeUrls = formData
    .getAll("scrapeUrl")
    .map((u) => String(u).trim())
    .filter((u) => /^https?:\/\//i.test(u));

  if (topicKeywords.length === 0 && scrapeUrls.length === 0) {
    throw new Error(
      "Add at least one topic keyword (built-in sources use these) or a webpage URL to scrape."
    );
  }

  const webhookUrl = get("webhookUrl");
  const systemPrompt =
    get("systemPrompt") ||
    `Summarize the latest updates about ${topicKeywords.join(", ") || name} in Markdown with sections and bullet points.`;

  const agent = await prisma.agent.create({
    data: {
      name,
      topicKeywords,
      cronSchedule: buildCron(get("frequency") || "Daily", get("time") || "07:00"),
      systemPrompt,
      status: "ACTIVE",
      dataSources: {
        create: scrapeUrls.map((url) => ({
          sourceType: "CUSTOM_SCRAPE" as const,
          apiEndpoint: url,
          authSecretKeyRef: "NONE",
        })),
      },
      deliveryChannels: webhookUrl
        ? {
            create: [
              {
                target: (get("target") || "SLACK") as DeliveryTarget,
                webhookUrl,
                recipientList: [],
              },
            ],
          }
        : undefined,
    },
  });

  redirect(`/agents/${agent.id}`);
}
