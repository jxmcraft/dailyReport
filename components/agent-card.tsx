import Link from "next/link";
import { Clock, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, ReportStatusBadge } from "@/components/status-badge";
import { cronToHuman, formatDate, type AgentView } from "@/lib/agents";

export function AgentCard({ agent }: { agent: AgentView }) {
  const lastReport = agent.reports[0];
  return (
    <Link href={`/agents/${agent.id}`} className="block">
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <CardTitle className="text-base">{agent.name}</CardTitle>
          <StatusBadge status={agent.status} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {agent.topicKeywords.map((kw) => (
              <span
                key={kw}
                className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {kw}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {cronToHuman(agent.cronSchedule)}
          </div>
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Last report: {formatDate(agent.lastReportAt)}
            </span>
            {lastReport && <ReportStatusBadge status={lastReport.status} />}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
