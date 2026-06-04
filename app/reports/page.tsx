import { DailyReportsList } from "@/components/daily-reports-list";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";
import { getDailyReportGroups } from "@/lib/agents";
import { pluralize } from "@/lib/pluralize";

export const dynamic = "force-dynamic";

export default async function DailyReportsPage() {
  const groups = await getDailyReportGroups();
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
        <DailyReportsList groups={groups} />
      )}
    </PageShell>
  );
}
