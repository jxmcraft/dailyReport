import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, ReportStatusBadge } from "@/components/status-badge";
import { PipelineStatusIndicator } from "@/components/pipeline-status-indicator";
import { CronConfigurator } from "@/components/cron-configurator";
import { MarkdownPreview } from "@/components/markdown-preview";
import { SourcesAccordion } from "@/components/sources-accordion";
import { SourceHealthCard } from "@/components/source-health-card";
import { TriggerButton } from "@/components/trigger-button";
import { getAgentById, formatDate } from "@/lib/agents";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const agent = await getAgentById(params.id);
  if (!agent) notFound();

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
          <StatusBadge status={agent.status} />
        </div>
        <TriggerButton agentId={agent.id} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineStatusIndicator state={agent.pipelineState} />
          </CardContent>
        </Card>

        <SourceHealthCard diagnostics={agent.reports[0]?.sourceDiagnostics ?? null} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <CronConfigurator cron={agent.cronSchedule} agentId={agent.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prompt & Report Framework</CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownPreview initialPrompt={agent.systemPrompt} agentId={agent.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Report History ({agent.reports.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {agent.reports.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No reports generated yet.
              </p>
            )}
            {agent.reports.map((report) => (
              <div key={report.id} className="space-y-3 border-b border-border pb-6 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatDate(report.timestamp)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {report.rawIngestedDataCount} items ingested
                    </span>
                    <ReportStatusBadge status={report.status} />
                  </div>
                </div>
                <div className="prose prose-sm prose-slate max-w-none rounded-md border border-border bg-white p-4">
                  <ReactMarkdown>{report.generatedMarkdown}</ReactMarkdown>
                </div>
                <SourcesAccordion sources={report.sourcesUsed} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
