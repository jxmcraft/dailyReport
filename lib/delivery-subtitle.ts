import type { DeliveryChannelView } from "@/lib/agents";

function maskWebhook(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const path = u.pathname;
    if (path.length <= 12) return `${u.host}${path}`;
    return `${u.host}${path.slice(0, 6)}…${path.slice(-4)}`;
  } catch {
    return url.length > 24 ? `${url.slice(0, 12)}…${url.slice(-4)}` : url;
  }
}

export function deliverySubtitle(channel: DeliveryChannelView | undefined): string {
  if (!channel) return "Not configured";
  if (channel.target === "EMAIL") {
    const n = channel.recipientList.length;
    if (n === 0) return "Email (no emailees)";
    const emaileePart = n === 1 ? channel.recipientList[0] : `${n} emailees`;
    if (
      channel.requireEmailApproval &&
      channel.approverList.length > 0
    ) {
      const r = channel.approverList.length;
      const reviewerPart = r === 1 ? "1 reviewer" : `${r} reviewers`;
      return `Email · ${reviewerPart} → ${emaileePart}`;
    }
    return `Email · ${emaileePart}`;
  }
  const label = channel.target === "SLACK" ? "Slack" : "Discord";
  return channel.webhookUrl
    ? `${label} · ${maskWebhook(channel.webhookUrl)}`
    : `${label} (no webhook)`;
}
