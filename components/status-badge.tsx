import { cn } from "@/lib/utils";
import type { AgentStatus, ReportStatus } from "@/lib/agents";

const AGENT_COLORS: Record<AgentStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-slate-100 text-slate-700",
  RUNNING: "bg-blue-100 text-blue-700",
};

const REPORT_COLORS: Record<ReportStatus, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  PARTIAL_FAILURE: "bg-amber-100 text-amber-700",
  CRITICAL_ERROR: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        AGENT_COLORS[status]
      )}
    >
      {status === "RUNNING" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {status}
    </span>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        REPORT_COLORS[status]
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
