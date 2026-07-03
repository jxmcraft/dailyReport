"use client";

import { ReportEntry, type ReportEntryData } from "@/components/report-entry";

export function ApprovePageReport({
  report,
  agentName,
}: {
  report: ReportEntryData;
  agentName: string;
}) {
  return (
    <ReportEntry
      report={report}
      defaultOpen
      agentName={agentName}
      showDelete={false}
      showSendEmail={false}
      requireEmailApproval
    />
  );
}
