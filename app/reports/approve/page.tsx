import Link from "next/link";
import { notFound } from "next/navigation";

import { ApproveReportButton } from "@/components/approve-report-button";
import { ApprovePageReport } from "@/components/approve-page-report";
import { PageHeader, PageShell } from "@/components/page-shell";
import { emailDeliveryStatusLabel } from "@/lib/email-approval";
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

  const channel = report.agent.deliveryChannels[0];
  const emaileeCount = channel?.recipientList.length ?? 0;
  const statusLabel = emailDeliveryStatusLabel(report.emailDeliveryStatus);

  return (
    <PageShell size="md">
      <PageHeader
        title="Review report"
        description={`${report.agent.name} · ${pluralize(emaileeCount, "emailee")} waiting`}
      />

      {report.emailDeliveryStatus === "DISTRIBUTED" ? (
        <div className="mb-6 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-950">
          This report was already sent to emailees
          {report.emailApprovedAt
            ? ` on ${report.emailApprovedAt.toLocaleString()}`
            : ""}
          .
        </div>
      ) : report.emailDeliveryStatus === "EXPIRED" ? (
        <div className="mb-6 rounded-xl border border-amber-200/80 bg-amber-50/80 px-5 py-4 text-sm text-amber-950">
          This approval link has expired. Trigger a new run from the agent page.
        </div>
      ) : report.emailDeliveryStatus === "PENDING_REVIEW" ? (
        <div className="mb-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Review the report below. If it looks accurate, approve to send it to{" "}
            {pluralize(emaileeCount, "emailee")} (including Outlook distribution groups).
          </p>
          <ApproveReportButton reportId={report.id} token={token} />
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-border/70 bg-slate-50 px-5 py-4 text-sm text-muted-foreground">
          This report is not awaiting email approval.
        </div>
      )}

      {statusLabel ? (
        <p className="mb-4 text-xs text-muted-foreground">Status: {statusLabel}</p>
      ) : null}

      <ApprovePageReport
        report={{
          id: report.id,
          timestamp: report.timestamp.toISOString(),
          status: report.status,
          statusNotes: report.statusNotes ?? [],
          rawIngestedDataCount: report.rawIngestedDataCount,
          generatedMarkdown: report.generatedMarkdown,
          sourcesUsed: (report.sourcesUsed as { title: string; url: string; snippet: string; timestampFetched: string }[]) ?? [],
          emailDeliveryStatus: report.emailDeliveryStatus,
        }}
        agentName={report.agent.name}
      />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href={`/agents/${report.agentId}`} className="text-primary hover:underline">
          Open agent
        </Link>
      </p>
    </PageShell>
  );
}
