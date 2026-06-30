import { createHash, randomBytes } from "crypto";
import type { DeliveryChannel, EmailDeliveryStatus } from "@prisma/client";

import { EMAIL_APPROVAL_TTL_MS } from "@/lib/constants";
import { sendEmaileeEmail, sendReviewerEmail } from "@/lib/email-smtp";
import { envSecret } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export function requiresEmailApproval(channel: DeliveryChannel): boolean {
  return (
    channel.target === "EMAIL" &&
    channel.requireEmailApproval &&
    channel.approverList.length > 0 &&
    channel.recipientList.length > 0
  );
}

export function assertEmailApprovalSecret(): void {
  if (!envSecret("EMAIL_APPROVAL_SECRET")) {
    throw new Error(
      "EMAIL_APPROVAL_SECRET must be set in .env when email approval is enabled."
    );
  }
}

export function generateApprovalToken(): { token: string; hash: string } {
  assertEmailApprovalSecret();
  const token = randomBytes(32).toString("hex");
  const hash = hashApprovalToken(token);
  return { token, hash };
}

export function hashApprovalToken(token: string): string {
  const secret = envSecret("EMAIL_APPROVAL_SECRET") ?? "";
  return createHash("sha256").update(`${token}${secret}`).digest("hex");
}

export function buildApprovalUrl(reportId: string, token: string): string {
  const base = (envSecret("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
  const params = new URLSearchParams({ reportId, token });
  return `${base}/reports/approve?${params.toString()}`;
}

export function isApprovalExpired(reportTimestamp: Date): boolean {
  return Date.now() - reportTimestamp.getTime() > EMAIL_APPROVAL_TTL_MS;
}

export async function sendReviewerApprovalRequest(opts: {
  reportId: string;
  agentName: string;
  markdown: string;
  channel: DeliveryChannel;
  token: string;
}): Promise<void> {
  const approveUrl = buildApprovalUrl(opts.reportId, opts.token);
  await sendReviewerEmail({
    to: opts.channel.approverList,
    agentName: opts.agentName,
    markdown: opts.markdown,
    approveUrl,
    emaileeCount: opts.channel.recipientList.length,
  });
}

export type ApproveReportResult =
  | { ok: true; alreadyDistributed: boolean; recipientCount: number }
  | { ok: false; error: string; status: number };

export async function approveAndDistributeReport(
  reportId: string,
  token: string,
  approvedBy?: string
): Promise<ApproveReportResult> {
  const report = await prisma.intelligenceReport.findUnique({
    where: { id: reportId },
    include: {
      agent: { include: { deliveryChannels: { take: 1, orderBy: { id: "asc" } } } },
    },
  });

  if (!report) {
    return { ok: false, error: "Report not found.", status: 404 };
  }

  const channel = report.agent.deliveryChannels[0];
  if (!channel || channel.target !== "EMAIL") {
    return { ok: false, error: "Email delivery is not configured for this agent.", status: 400 };
  }

  if (report.emailDeliveryStatus === "DISTRIBUTED") {
    return {
      ok: true,
      alreadyDistributed: true,
      recipientCount: channel.recipientList.length,
    };
  }

  if (report.emailDeliveryStatus === "EXPIRED") {
    return { ok: false, error: "This approval link has expired.", status: 410 };
  }

  if (isApprovalExpired(report.timestamp)) {
    await prisma.intelligenceReport.update({
      where: { id: reportId },
      data: { emailDeliveryStatus: "EXPIRED" },
    });
    return { ok: false, error: "This approval link has expired.", status: 410 };
  }

  if (
    report.emailDeliveryStatus === "PENDING_REVIEW" ||
    report.emailApprovalTokenHash
  ) {
    try {
      assertEmailApprovalSecret();
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        status: 503,
      };
    }
  }

  const tokenHash = hashApprovalToken(token);
  if (!report.emailApprovalTokenHash || report.emailApprovalTokenHash !== tokenHash) {
    return { ok: false, error: "Invalid approval token.", status: 403 };
  }

  if (report.emailDeliveryStatus !== "PENDING_REVIEW") {
    return { ok: false, error: "This report is not awaiting approval.", status: 400 };
  }

  await sendEmaileeEmail({
    to: channel.recipientList,
    markdown: report.generatedMarkdown,
    agentName: report.agent.name,
  });

  await prisma.intelligenceReport.update({
    where: { id: reportId },
    data: {
      emailDeliveryStatus: "DISTRIBUTED",
      emailApprovedAt: new Date(),
      emailApprovedBy: approvedBy ?? null,
      emailApprovalTokenHash: null,
    },
  });

  return {
    ok: true,
    alreadyDistributed: false,
    recipientCount: channel.recipientList.length,
  };
}

export function emailDeliveryStatusLabel(status: EmailDeliveryStatus): string | null {
  switch (status) {
    case "PENDING_REVIEW":
      return "Awaiting email approval";
    case "DISTRIBUTED":
      return "Sent to emailees";
    case "EXPIRED":
      return "Approval expired";
    default:
      return null;
  }
}
