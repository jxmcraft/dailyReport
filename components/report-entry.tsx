"use client";

import ReactMarkdown from "react-markdown";

import { CollapsibleSection } from "@/components/collapsible-section";
import { DeleteReportButton } from "@/components/delete-report-button";
import { SendEmailButton } from "@/components/send-email-button";
import { EmailDeliveryStatusBadge, ReportStatusBadge } from "@/components/status-badge";
import { SourcesAccordion } from "@/components/sources-accordion";
import { formatDate } from "@/lib/format-date";
import { formatReportSubtitle } from "@/lib/report-subtitle";
import type { EmailDeliveryStatus, ReportView } from "@/lib/agents";
import type { SourceDiagnostic } from "@/lib/sources";

export type ReportEntryData = Pick<
  ReportView,
  | "id"
  | "timestamp"
  | "status"
  | "statusNotes"
  | "rawIngestedDataCount"
  | "generatedMarkdown"
  | "sourcesUsed"
  | "emailDeliveryStatus"
> & {
  sourceDiagnostics?: SourceDiagnostic[] | null;
};

function ReportActions({
  report,
  showSendEmail,
  showDelete,
  requireEmailApproval,
  sendEmailDisabled,
  deleteDisabled,
  onEmailSent,
  onDeleted,
}: {
  report: ReportEntryData;
  showSendEmail: boolean;
  showDelete: boolean;
  requireEmailApproval: boolean;
  sendEmailDisabled: boolean;
  deleteDisabled: boolean;
  onEmailSent?: (status: EmailDeliveryStatus) => void;
  onDeleted?: () => void;
}) {
  if (!showSendEmail && !showDelete) return null;

  return (
    <div className="flex shrink-0 gap-2">
      {showSendEmail ? (
        <SendEmailButton
          reportId={report.id}
          reportLabel={formatDate(report.timestamp)}
          emailDeliveryStatus={report.emailDeliveryStatus}
          requiresApproval={requireEmailApproval}
          disabled={sendEmailDisabled}
          onSent={onEmailSent}
        />
      ) : null}
      {showDelete ? (
        <DeleteReportButton
          reportId={report.id}
          reportLabel={formatDate(report.timestamp)}
          pendingApproval={report.emailDeliveryStatus === "PENDING_REVIEW"}
          disabled={deleteDisabled}
          onDeleted={onDeleted}
        />
      ) : null}
    </div>
  );
}

function ReportBody({
  report,
}: {
  report: ReportEntryData;
}) {
  const showCriticalNotes =
    report.status === "CRITICAL_ERROR" &&
    report.statusNotes &&
    report.statusNotes.length > 0;
  const showPartialNotes =
    report.status === "PARTIAL_FAILURE" &&
    report.statusNotes &&
    report.statusNotes.length > 0;

  return (
    <>
      {showCriticalNotes ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50/80 p-4">
          <p className="mb-2 text-sm font-medium text-red-900">Run failed</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-900/90">
            {report.statusNotes!.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {showPartialNotes ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
          <p className="mb-2 text-sm font-medium text-amber-900">
            Partial run — issues detected
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-900/90">
            {report.statusNotes!.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="prose-report break-words rounded-lg border border-border/60 bg-white p-4">
        <ReactMarkdown>{report.generatedMarkdown}</ReactMarkdown>
      </div>
      {report.sourcesUsed.length > 0 ? (
        <div className="mt-4">
          <SourcesAccordion sources={report.sourcesUsed} />
        </div>
      ) : null}
    </>
  );
}

export function ReportEntry({
  report,
  defaultOpen = false,
  variant = "collapsible",
  agentName,
  showDelete = true,
  deleteDisabled = false,
  onDeleted,
  showSendEmail = false,
  requireEmailApproval = false,
  sendEmailDisabled = false,
  onEmailSent,
}: {
  report: ReportEntryData;
  defaultOpen?: boolean;
  variant?: "collapsible" | "expanded";
  agentName?: string;
  showDelete?: boolean;
  deleteDisabled?: boolean;
  onDeleted?: () => void;
  showSendEmail?: boolean;
  requireEmailApproval?: boolean;
  sendEmailDisabled?: boolean;
  onEmailSent?: (status: EmailDeliveryStatus) => void;
}) {
  const subtitle = formatReportSubtitle(report, agentName);

  if (variant === "expanded") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {formatDate(report.timestamp)}
              </span>
              <ReportStatusBadge status={report.status} />
              <EmailDeliveryStatusBadge status={report.emailDeliveryStatus} />
            </div>
            {subtitle ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <ReportActions
            report={report}
            showSendEmail={showSendEmail}
            showDelete={showDelete}
            requireEmailApproval={requireEmailApproval}
            sendEmailDisabled={sendEmailDisabled}
            deleteDisabled={deleteDisabled}
            onEmailSent={onEmailSent}
            onDeleted={onDeleted}
          />
        </div>
        <ReportBody report={report} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {showSendEmail || showDelete ? (
        <div className="flex justify-end gap-2">
          <ReportActions
            report={report}
            showSendEmail={showSendEmail}
            showDelete={showDelete}
            requireEmailApproval={requireEmailApproval}
            sendEmailDisabled={sendEmailDisabled}
            deleteDisabled={deleteDisabled}
            onEmailSent={onEmailSent}
            onDeleted={onDeleted}
          />
        </div>
      ) : null}
      <CollapsibleSection
        variant="inset"
        title={formatDate(report.timestamp)}
        subtitle={subtitle}
        defaultOpen={defaultOpen}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <ReportStatusBadge status={report.status} />
            <EmailDeliveryStatusBadge status={report.emailDeliveryStatus} />
          </span>
        }
      >
        <ReportBody report={report} />
      </CollapsibleSection>
    </div>
  );
}
