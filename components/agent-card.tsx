import Link from "next/link";
import { Clock, FileText } from "lucide-react";

import { KeywordChips } from "@/components/keyword-chips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, ReportStatusBadge } from "@/components/status-badge";
import { cronToHuman, formatDate, type AgentView } from "@/lib/agents";

export function AgentCard({ agent }: { agent: AgentView }) {
  const lastReport = agent.reports[0];

  return (
    <Link href={`/agents/${agent.id}`} className="group block h-full">
      <Card className="h-full border-border/70 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg leading-snug group-hover:text-primary">
              {agent.name}
            </CardTitle>
            <StatusBadge status={agent.status} />
          </div>
          <KeywordChips keywords={agent.topicKeywords} variant="card" max={3} />
        </CardHeader>
        <CardContent className="space-y-3 border-t border-border/60 pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 opacity-60" />
            <span>{cronToHuman(agent.cronSchedule)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 opacity-60" />
              <span className="truncate">
                {agent.lastReportAt
                  ? formatDate(agent.lastReportAt)
                  : "No reports yet"}
              </span>
            </span>
            {lastReport ? <ReportStatusBadge status={lastReport.status} /> : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
