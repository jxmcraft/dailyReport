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
  recipientsRaw: string,
  approversRaw: string,
  requireEmailApproval: boolean
): {
  webhookUrl: string;
  recipientList: string[];
  approverList: string[];
  requireEmailApproval: boolean;
} {
  const recipients = parseEmails(recipientsRaw);
  const approvers = parseEmails(approversRaw);

  if (target === "EMAIL") {
    if (recipients.length === 0) {
      throw new Error("At least one emailee address is required for Email delivery.");
    }
    if (requireEmailApproval && approvers.length === 0) {
      throw new Error(
        "At least one designated reviewer is required when approval is enabled."
      );
    }
    return {
      webhookUrl: "",
      recipientList: recipients,
      approverList: approvers,
      requireEmailApproval,
    };
  }
  if (!webhookUrl) {
    throw new Error("Webhook URL is required for Slack and Discord.");
  }
  return {
    webhookUrl,
    recipientList: [],
    approverList: [],
    requireEmailApproval: true,
  };
}

export function hasDeliveryConfig(
  target: DeliveryTarget,
  webhookUrl: string,
  recipientsRaw: string,
  approversRaw = "",
  requireEmailApproval = true
): boolean {
  if (target === "EMAIL") {
    const recipients = parseEmails(recipientsRaw);
    if (recipients.length === 0) return false;
    if (requireEmailApproval) return parseEmails(approversRaw).length > 0;
    return true;
  }
  return Boolean(webhookUrl.trim());
}
