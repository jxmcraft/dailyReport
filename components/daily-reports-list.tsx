"use client";

import Link from "next/link";

import { CollapsibleSection } from "@/components/collapsible-section";
import { CollapsibleGroup } from "@/components/page-shell";
import { ReportEntry } from "@/components/report-entry";
import type { DailyReportGroup } from "@/lib/agents";
import { pluralize } from "@/lib/pluralize";

export function DailyReportsList({ groups }: { groups: DailyReportGroup[] }) {
  return (
    <div className="space-y-6">
      {groups.map((group, dayIndex) => (
        <CollapsibleGroup key={group.day}>
          <CollapsibleSection
            variant="nested"
            title={group.day}
            subtitle={pluralize(group.runs.length, "report")}
            defaultOpen={dayIndex === 0}
          >
            <div className="space-y-4">
              {group.runs.map((run, reportIndex) => (
                <div key={run.report.id} className="space-y-2">
                  <Link
                    href={`/agents/${run.agentId}`}
                    className="inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    {run.agentName}
                  </Link>
                  <ReportEntry
                    report={run.report}
                    defaultOpen={dayIndex === 0 && reportIndex === 0}
                    showSendEmail={run.deliveryTarget === "EMAIL"}
                    requireEmailApproval={run.requireEmailApproval}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </CollapsibleGroup>
      ))}
    </div>
  );
}
