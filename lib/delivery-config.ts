import type { DeliveryTarget } from "@prisma/client";

export const SMTP_ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseDeliveryTarget(raw: string): DeliveryTarget {
  if (raw === "EMAIL" || raw === "DISCORD") return raw;
  return "SLACK";
}

/** Split comma/newline-separated addresses, trim, and keep valid-looking emails. */
export function parseEmails(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function buildDeliveryChannelData(
  target: DeliveryTarget,
  webhookUrl: string,
  recipientsRaw: string
): { webhookUrl: string; recipientList: string[] } {
  const recipients = parseEmails(recipientsRaw);
  if (target === "EMAIL") {
    if (recipients.length === 0) {
      throw new Error("At least one recipient email is required for Email delivery.");
    }
    return { webhookUrl: "", recipientList: recipients };
  }
  if (!webhookUrl) {
    throw new Error("Webhook URL is required for Slack and Discord.");
  }
  return { webhookUrl, recipientList: [] };
}

export function hasDeliveryConfig(
  target: DeliveryTarget,
  webhookUrl: string,
  recipientsRaw: string
): boolean {
  if (target === "EMAIL") return parseEmails(recipientsRaw).length > 0;
  return Boolean(webhookUrl.trim());
}
