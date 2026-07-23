import { DailyReportsList } from "@/components/daily-reports-list";
import { PaginationControls } from "@/components/pagination-controls";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";
import { getDailyReportGroupsPage } from "@/lib/agents";
import { pluralize } from "@/lib/pluralize";

export const dynamic = "force-dynamic";

export default async function DailyReportsPage({
  searchParams,
}: {
  searchParams?: { cursor?: string; direction?: "older" | "newer" };
}) {
  const page = await getDailyReportGroupsPage({
    cursor: searchParams?.cursor,
    direction: searchParams?.direction,
  });
  const groups = page.groups;
  const totalReports = groups.reduce((n, g) => n + g.runs.length, 0);

  return (
    <PageShell>
      <PageHeader
        title="Daily Reports"
        description={
          totalReports === 0
            ? "All agent reports grouped by day, newest first."
            : `${pluralize(totalReports, "report")} across ${pluralize(groups.length, "day")}.`
        }
      />

      {groups.length === 0 ? (
        <EmptyState>
          Reports from scheduled or manual runs will appear here, grouped by
          day.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <DailyReportsList groups={groups} />
          <PaginationControls
            basePath="/reports"
            olderCursor={page.olderCursor}
            newerCursor={page.newerCursor}
          />
        </div>
      )}
    </PageShell>
  );
}
