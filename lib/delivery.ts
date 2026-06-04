import type { DeliveryChannel } from "@prisma/client";
import nodemailer from "nodemailer";

import { EXECUTION_TIMEOUT_MS } from "@/lib/constants";
import { envSecret } from "@/lib/env";
import { markdownToEmailHtml } from "@/lib/markdown-email";
const DISCORD_CONTENT_LIMIT = 2000;
const EMAIL_SUBJECT = "PulseAgent Intelligence Report";

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

async function sendEmailSmtp(to: string[], text: string): Promise<void> {
  const host = envSecret("SMTP_HOST");
  const from = envSecret("SMTP_FROM");
  if (!host || !from) {
    throw new Error(
      "Configure SMTP_HOST and SMTP_FROM in .env for email delivery (e.g. Gmail: smtp.gmail.com)."
    );
  }

  const port = Number(envSecret("SMTP_PORT") ?? "587");
  const user = envSecret("SMTP_USER");
  const pass = envSecret("SMTP_PASS");

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transport.sendMail({
    from,
    to,
    subject: EMAIL_SUBJECT,
    text,
    html: markdownToEmailHtml(text),
  });
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
      const to = channel.recipientList;
      if (to.length === 0) {
        throw new Error("No email recipients configured for this agent.");
      }
      await sendEmailSmtp(to, markdown);
      return;
    }
  }
}
