import Link from "next/link";

import { PaginationControls } from "@/components/pagination-controls";
import { ReportEntry } from "@/components/report-entry";
import { ClearLogsButton } from "@/components/clear-logs-button";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";
import { getRunsPage } from "@/lib/agents";
import { pluralize } from "@/lib/pluralize";

export const dynamic = "force-dynamic";

export default async function LogsPage({
  searchParams,
}: {
  searchParams?: { cursor?: string; direction?: "older" | "newer" };
}) {
  const page = await getRunsPage({
    cursor: searchParams?.cursor,
    direction: searchParams?.direction,
  });
  const runs = page.runs;

  return (
    <PageShell>
      <PageHeader
        title="Activity logs"
        description={`${pluralize(runs.length, "pipeline run")} across all agents.`}
        actions={
          runs.length > 0 ? <ClearLogsButton scope="all" /> : undefined
        }
      />

      {runs.length === 0 ? (
        <EmptyState>No pipeline runs recorded yet.</EmptyState>
      ) : (
        <div className="space-y-4">
          {runs.map(({ agentId, agentName, report, deliveryTarget, requireEmailApproval }) => (
            <div key={report.id} className="space-y-2">
              <Link
                href={`/agents/${agentId}`}
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                {agentName}
              </Link>
              <ReportEntry
                report={report}
                showSendEmail={deliveryTarget === "EMAIL"}
                requireEmailApproval={requireEmailApproval}
              />
            </div>
          ))}
          <PaginationControls
            basePath="/logs"
            olderCursor={page.olderCursor}
            newerCursor={page.newerCursor}
          />
        </div>
      )}
    </PageShell>
  );
}
