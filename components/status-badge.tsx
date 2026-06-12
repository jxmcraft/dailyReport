import { cn } from "@/lib/utils";
import type { AgentStatus, EmailDeliveryStatus, ReportStatus } from "@/lib/agents";

const AGENT_LABELS: Record<AgentStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  RUNNING: "Running",
};

const AGENT_COLORS: Record<AgentStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PAUSED: "bg-slate-100 text-slate-600 ring-slate-500/10",
  RUNNING: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

const REPORT_LABELS: Record<ReportStatus, string> = {
  SUCCESS: "Success",
  PARTIAL_FAILURE: "Partial",
  CRITICAL_ERROR: "Error",
};

const REPORT_COLORS: Record<ReportStatus, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PARTIAL_FAILURE: "bg-amber-50 text-amber-800 ring-amber-600/20",
  CRITICAL_ERROR: "bg-red-50 text-red-700 ring-red-600/20",
};

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

export function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span className={cn(badgeBase, AGENT_COLORS[status])}>
      {status === "RUNNING" ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {AGENT_LABELS[status]}
    </span>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={cn(badgeBase, REPORT_COLORS[status])}>
      {REPORT_LABELS[status]}
    </span>
  );
}

const EMAIL_DELIVERY_LABELS: Record<
  Exclude<EmailDeliveryStatus, "NOT_APPLICABLE">,
  string
> = {
  PENDING_REVIEW: "Awaiting approval",
  DISTRIBUTED: "Sent to emailees",
  EXPIRED: "Approval expired",
};

const EMAIL_DELIVERY_COLORS: Record<
  Exclude<EmailDeliveryStatus, "NOT_APPLICABLE">,
  string
> = {
  PENDING_REVIEW: "bg-violet-50 text-violet-800 ring-violet-600/20",
  DISTRIBUTED: "bg-sky-50 text-sky-800 ring-sky-600/20",
  EXPIRED: "bg-amber-50 text-amber-800 ring-amber-600/20",
};

export function EmailDeliveryStatusBadge({
  status,
}: {
  status: EmailDeliveryStatus;
}) {
  if (status === "NOT_APPLICABLE") return null;
  return (
    <span className={cn(badgeBase, EMAIL_DELIVERY_COLORS[status])}>
      {EMAIL_DELIVERY_LABELS[status]}
    </span>
  );
}
