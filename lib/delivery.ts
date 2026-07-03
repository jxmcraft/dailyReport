import type { DeliveryChannel } from "@prisma/client";

import { LLM_TIMEOUT_MS } from "@/lib/constants";
import {
  generateApprovalToken,
  requiresEmailApproval,
  sendReviewerApprovalRequest,
} from "@/lib/email-approval";
import { sendEmaileeEmail } from "@/lib/email-delivery";
import { prisma } from "@/lib/prisma";

const DISCORD_CONTENT_LIMIT = 2000;

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Delivery failed (${response.status}): ${text}`);
  }
}

export interface DispatchContext {
  reportId: string;
  agentName: string;
}

export async function dispatchToChannel(
  channel: DeliveryChannel,
  markdown: string,
  ctx?: DispatchContext
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
      if (channel.recipientList.length === 0) {
        throw new Error("No emailee addresses configured for this agent.");
      }

      if (requiresEmailApproval(channel)) {
        if (!ctx?.reportId) {
          throw new Error("Report ID is required for approval-gated email delivery.");
        }
        const { token, hash } = generateApprovalToken();
        await prisma.intelligenceReport.update({
          where: { id: ctx.reportId },
          data: {
            emailDeliveryStatus: "PENDING_REVIEW",
            emailApprovalTokenHash: hash,
          },
        });
        await sendReviewerApprovalRequest({
          reportId: ctx.reportId,
          agentName: ctx.agentName,
          markdown,
          channel,
          token,
        });
        return;
      }

      await sendEmaileeEmail({
        to: channel.recipientList,
        markdown,
        agentName: ctx?.agentName ?? "NewsAgent",
      });
      if (ctx?.reportId) {
        await prisma.intelligenceReport.update({
          where: { id: ctx.reportId },
          data: { emailDeliveryStatus: "NOT_APPLICABLE" },
        });
      }
      return;
    }
  }
}
