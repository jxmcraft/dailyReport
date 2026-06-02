import type { DeliveryChannel } from "@prisma/client";

const EXECUTION_TIMEOUT_MS = 180000;
const DISCORD_CONTENT_LIMIT = 2000;

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(EXECUTION_TIMEOUT_MS),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Delivery failed (${response.status}): ${text}`);
  }
}

export async function dispatchToChannel(
  channel: DeliveryChannel,
  markdown: string
): Promise<void> {
  switch (channel.target) {
    case "SLACK":
      await postJson(channel.webhookUrl, { text: markdown });
      return;
    case "DISCORD":
      await postJson(channel.webhookUrl, {
        content: markdown.slice(0, DISCORD_CONTENT_LIMIT),
      });
      return;
    case "EMAIL": {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) throw new Error("Missing SENDGRID_API_KEY environment variable.");
      await postJson(
        channel.webhookUrl,
        {
          personalizations: [
            { to: channel.recipientList.map((email) => ({ email })) },
          ],
          from: { email: process.env.SENDGRID_FROM_EMAIL ?? "reports@pulseagent.app" },
          subject: "PulseAgent Intelligence Report",
          content: [{ type: "text/plain", value: markdown }],
        },
        { Authorization: `Bearer ${apiKey}` }
      );
      return;
    }
  }
}
