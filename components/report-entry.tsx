"use client";

import ReactMarkdown from "react-markdown";

import { CollapsibleSection } from "@/components/collapsible-section";
import { ReportStatusBadge } from "@/components/status-badge";
import { SourcesAccordion } from "@/components/sources-accordion";
import { formatDate } from "@/lib/format-date";
import type { ReportView } from "@/lib/agents";

export type ReportEntryData = Pick<
  ReportView,
  | "id"
  | "timestamp"
  | "status"
  | "rawIngestedDataCount"
  | "generatedMarkdown"
  | "sourcesUsed"
>;

export function ReportEntry({
  report,
  defaultOpen = false,
  agentName,
}: {
  report: ReportEntryData;
  defaultOpen?: boolean;
  agentName?: string;
}) {
  const subtitle = agentName
    ? `${agentName} · ${report.rawIngestedDataCount} sources`
    : `${report.rawIngestedDataCount} sources ingested`;

  return (
    <CollapsibleSection
      variant="inset"
      title={formatDate(report.timestamp)}
      subtitle={subtitle}
      defaultOpen={defaultOpen}
      badge={<ReportStatusBadge status={report.status} />}
    >
      <div className="prose-report rounded-lg border border-border/60 bg-white p-5">
        <ReactMarkdown>{report.generatedMarkdown}</ReactMarkdown>
      </div>
      {report.sourcesUsed.length > 0 ? (
        <div className="mt-4">
          <SourcesAccordion sources={report.sourcesUsed} />
        </div>
      ) : null}
    </CollapsibleSection>
  );
}
