import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportStatusBadge } from "@/components/status-badge";
import { SourcesAccordion } from "@/components/sources-accordion";
import { getAllRuns, formatDate } from "@/lib/agents";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const runs = await getAllRuns();

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Activity Logs</h1>
        <p className="text-sm text-muted-foreground">
          {runs.length} automated runs across all agents.
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No runs recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map(({ agentId, agentName, report }) => (
            <Card key={report.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">
                    <Link
                      href={`/agents/${agentId}`}
                      className="hover:text-primary"
                    >
                      {agentName}
                    </Link>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(report.timestamp)} &middot;{" "}
                    {report.rawIngestedDataCount} items ingested
                  </p>
                </div>
                <ReportStatusBadge status={report.status} />
              </CardHeader>
              <CardContent>
                <SourcesAccordion sources={report.sourcesUsed} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
