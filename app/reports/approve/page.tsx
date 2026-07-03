import Link from "next/link";
import { notFound } from "next/navigation";

import { ApproveReportButton } from "@/components/approve-report-button";
import { ApprovePageReport } from "@/components/approve-page-report";
import { PageHeader, PageShell } from "@/components/page-shell";
import {
  emailDeliveryStatusLabel,
  expireApprovalIfNeeded,
  resolveApprovalPageAccess,
} from "@/lib/email-approval";
import { prisma } from "@/lib/prisma";
import { pluralize } from "@/lib/pluralize";

export const dynamic = "force-dynamic";

export default async function ApproveReportPage({
  searchParams,
}: {
  searchParams: { reportId?: string; token?: string };
}) {
  const reportId = searchParams.reportId?.trim();
  const token = searchParams.token?.trim();
  if (!reportId || !token) notFound();

  const report = await prisma.intelligenceReport.findUnique({
    where: { id: reportId },
    include: {
      agent: { include: { deliveryChannels: { take: 1, orderBy: { id: "asc" } } } },
    },
  });
  if (!report) notFound();

  await expireApprovalIfNeeded(report.id, report.timestamp);

  const refreshed = await prisma.intelligenceReport.findUnique({
    where: { id: reportId },
    include: {
      agent: { include: { deliveryChannels: { take: 1, orderBy: { id: "asc" } } } },
    },
  });
  if (!refreshed) notFound();

  const access = resolveApprovalPageAccess(refreshed, token);
  const channel = refreshed.agent.deliveryChannels[0];
  const emaileeCount = channel?.recipientList.length ?? 0;
  const statusLabel = emailDeliveryStatusLabel(refreshed.emailDeliveryStatus);

  const showReportBody =
    access.kind === "ok" ||
    access.kind === "ok_distributed";

  const reportPayload = {
    id: refreshed.id,
    timestamp: refreshed.timestamp.toISOString(),
    status: refreshed.status,
    statusNotes: refreshed.statusNotes ?? [],
    rawIngestedDataCount: refreshed.rawIngestedDataCount,
    generatedMarkdown: refreshed.generatedMarkdown,
    sourcesUsed:
      (refreshed.sourcesUsed as {
        title: string;
        url: string;
        snippet: string;
        timestampFetched: string;
      }[]) ?? [],
    emailDeliveryStatus: refreshed.emailDeliveryStatus,
  };

  return (
    <PageShell size="md">
      <PageHeader
        title="Review report"
        description={`${refreshed.agent.name} · ${pluralize(emaileeCount, "emailee")} waiting`}
      />

      {access.kind === "invalid_token" ? (
        <div className="mb-6 rounded-xl border border-red-200/80 bg-red-50/80 px-5 py-4 text-sm text-red-950">
          This approval link is invalid. Check that you used the full link from the
          reviewer email.
        </div>
      ) : access.kind === "expired" ? (
        <div className="mb-6 rounded-xl border border-amber-200/80 bg-amber-50/80 px-5 py-4 text-sm text-amber-950">
          This approval link has expired. Trigger a new run from the agent page.
        </div>
      ) : access.kind === "not_awaiting_approval" ? (
        <div className="mb-6 rounded-xl border border-border/70 bg-slate-50 px-5 py-4 text-sm text-muted-foreground">
          This report is not awaiting email approval.
        </div>
      ) : access.kind === "ok_distributed" ? (
        <div className="mb-6 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-950">
          This report was already sent to emailees
          {refreshed.emailApprovedAt
            ? ` on ${refreshed.emailApprovedAt.toLocaleString()}`
            : ""}
          .
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Review the report below. If it looks accurate, approve to send it to{" "}
            {pluralize(emaileeCount, "emailee")} (including Outlook distribution groups).
          </p>
          <ApproveReportButton reportId={refreshed.id} token={token} />
        </div>
      )}

      {statusLabel ? (
        <p className="mb-4 text-xs text-muted-foreground">Status: {statusLabel}</p>
      ) : null}

      {showReportBody ? (
        <ApprovePageReport
          report={reportPayload}
          agentName={refreshed.agent.name}
        />
      ) : null}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link
          href={`/agents/${refreshed.agentId}`}
          className="text-primary hover:underline"
        >
          Open agent
        </Link>
      </p>
    </PageShell>
  );
}
