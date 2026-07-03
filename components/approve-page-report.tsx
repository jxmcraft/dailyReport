"use client";

import { useRouter } from "next/navigation";

import { ReportEntry, type ReportEntryData } from "@/components/report-entry";

export function ApprovePageReport({
  report,
  agentName,
}: {
  report: ReportEntryData;
  agentName: string;
}) {
  const router = useRouter();

  return (
    <ReportEntry
      report={report}
      defaultOpen
      agentName={agentName}
      showDelete={false}
      showSendEmail={false}
      requireEmailApproval
      onDeleted={() => router.push("/logs")}
    />
  );
}
