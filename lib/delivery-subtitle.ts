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
    if (n === 0) return "Email (no recipients)";
    if (n === 1) return `Email · ${channel.recipientList[0]}`;
    return `Email · ${n} recipients`;
  }
  const label = channel.target === "SLACK" ? "Slack" : "Discord";
  return channel.webhookUrl
    ? `${label} · ${maskWebhook(channel.webhookUrl)}`
    : `${label} (no webhook)`;
}
