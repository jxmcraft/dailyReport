import { createHash, randomBytes } from "crypto";
import type { DeliveryChannel, EmailDeliveryStatus } from "@prisma/client";

import { getAppBaseUrl } from "@/lib/app-url";
import { EMAIL_APPROVAL_TTL_MS } from "@/lib/constants";
import { sendEmaileeEmail, sendReviewerEmail } from "@/lib/email-delivery";
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
  const params = new URLSearchParams({ reportId, token });
  return `${getAppBaseUrl()}/reports/approve?${params.toString()}`;
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

export type ApprovalPageReport = {
  id: string;
  timestamp: Date;
  emailDeliveryStatus: EmailDeliveryStatus;
  emailApprovalTokenHash: string | null;
  generatedMarkdown: string;
  status: string;
  statusNotes: string[];
  rawIngestedDataCount: number;
  sourcesUsed: unknown;
  sourceDiagnostics: unknown;
  agent: {
    name: string;
    id: string;
    deliveryChannels: DeliveryChannel[];
  };
};

export type ApprovalPageAccess =
  | { kind: "ok"; showReportBody: true }
  | { kind: "ok_distributed"; showReportBody: true }
  | { kind: "invalid_token" }
  | { kind: "expired" }
  | { kind: "not_awaiting_approval" };

export function resolveApprovalPageAccess(
  report: ApprovalPageReport,
  token: string
): ApprovalPageAccess {
  if (report.emailDeliveryStatus === "DISTRIBUTED") {
    return { kind: "ok_distributed", showReportBody: true };
  }

  if (report.emailDeliveryStatus === "EXPIRED") {
    return { kind: "expired" };
  }

  if (isApprovalExpired(report.timestamp)) {
    return { kind: "expired" };
  }

  if (report.emailDeliveryStatus !== "PENDING_REVIEW") {
    return { kind: "not_awaiting_approval" };
  }

  try {
    assertEmailApprovalSecret();
  } catch {
    return { kind: "invalid_token" };
  }

  const tokenHash = hashApprovalToken(token);
  if (!report.emailApprovalTokenHash || report.emailApprovalTokenHash !== tokenHash) {
    return { kind: "invalid_token" };
  }

  return { kind: "ok", showReportBody: true };
}

/** Mark report expired in DB when TTL elapsed (page load). */
export async function expireApprovalIfNeeded(reportId: string, timestamp: Date): Promise<void> {
  if (isApprovalExpired(timestamp)) {
    await prisma.intelligenceReport.updateMany({
      where: { id: reportId, emailDeliveryStatus: "PENDING_REVIEW" },
      data: { emailDeliveryStatus: "EXPIRED" },
    });
  }
}
