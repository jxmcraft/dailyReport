"use client";

import { useAgentRun } from "@/components/agent-run-context";
import { RunningBanner } from "@/components/running-banner";
import { CollapsibleSection } from "@/components/collapsible-section";
import { CollapsibleGroup } from "@/components/page-shell";
import { PipelineStatusIndicator } from "@/components/pipeline-status-indicator";
import { ClearLogsButton } from "@/components/clear-logs-button";
import { ReportEntry } from "@/components/report-entry";
import { SourceHealthCard } from "@/components/source-health-card";
export function AgentLiveMonitor({
  agentId,
  agentName,
  emailDeliveryEnabled = false,
  requireEmailApproval = false,
}: {
  agentId: string;
  agentName: string;
  emailDeliveryEnabled?: boolean;
  requireEmailApproval?: boolean;
}) {
  const {
    isRunning,
    pipelineState,
    reports,
    removeReport,
    clearReports,
    updateReportEmailStatus,
  } = useAgentRun();

  return (
    <div className="mb-12 space-y-6">
      {isRunning ? (
        <RunningBanner
          variant="detail"
          title="Run in progress"
          description="Fetching sources and building your report. This page updates automatically."
        />
      ) : null}

      <CollapsibleGroup>
        <CollapsibleSection
          variant="nested"
          title="Pipeline status"
          subtitle={
            isRunning ? "Run active — tracking progress" : "Idle until next scheduled run"
          }
          defaultOpen={isRunning}
        >
          <PipelineStatusIndicator state={pipelineState} />
        </CollapsibleSection>

        <CollapsibleSection
          variant="nested"
          title="Source health"
          subtitle="Fetch results from the latest run"
          defaultOpen={false}
        >
          <SourceHealthCard
            diagnostics={reports[0]?.sourceDiagnostics ?? null}
          />
        </CollapsibleSection>

        <CollapsibleSection
          variant="nested"
          title={`Reports (${reports.length})`}
          subtitle="Expand a report to read the full output and sources"
          defaultOpen={reports.length > 0}
        >
          {reports.length > 0 ? (
            <div className="mb-4 flex justify-end">
              <ClearLogsButton
                scope="agent"
                agentId={agentId}
                agentName={agentName}
                disabled={isRunning}
                onCleared={clearReports}
              />
            </div>
          ) : null}
          {reports.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              No reports yet. Trigger a run or wait for the scheduler.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((report, index) => (
                <ReportEntry
                  key={report.id}
                  report={report}
                  defaultOpen={index === 0 || report.status === "CRITICAL_ERROR"}
                  showSendEmail={emailDeliveryEnabled}
                  requireEmailApproval={requireEmailApproval}
                  sendEmailDisabled={isRunning}
                  onEmailSent={(status) =>
                    updateReportEmailStatus(report.id, status)
                  }
                  deleteDisabled={isRunning}
                  onDeleted={() => removeReport(report.id)}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>
      </CollapsibleGroup>
    </div>
  );
}
