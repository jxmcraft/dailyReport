import type { ReportStatus } from "@/lib/agents";
import type { SourceDiagnostic } from "@/lib/sources";

export interface ReportSubtitleInput {
  status: ReportStatus;
  rawIngestedDataCount: number;
  statusNotes?: string[];
  sourceDiagnostics?: SourceDiagnostic[] | null;
}

function diagnosticSummary(diagnostics: SourceDiagnostic[]): string {
  const tried = diagnostics.length;
  const failed = diagnostics.filter((d) => d.status === "error").length;
  const fetched = diagnostics.reduce((sum, d) => sum + d.itemsIngested, 0);
  if (fetched > 0) {
    return `${fetched} article${fetched === 1 ? "" : "s"} from ${tried} source${tried === 1 ? "" : "s"}${failed > 0 ? ` (${failed} failed)` : ""}`;
  }
  return `${tried} source${tried === 1 ? "" : "s"} tried${failed > 0 ? ` (${failed} failed)` : ""}`;
}

export function formatReportSubtitle(
  report: ReportSubtitleInput,
  agentName?: string
): string {
  const prefix = agentName ? `${agentName} · ` : "";

  if (
    report.status === "CRITICAL_ERROR" &&
    report.sourceDiagnostics &&
    report.sourceDiagnostics.length > 0
  ) {
    return `${prefix}${diagnosticSummary(report.sourceDiagnostics)}`;
  }

  if (report.status === "CRITICAL_ERROR" && report.statusNotes?.length) {
    const first = report.statusNotes[0];
    const truncated = first.length > 72 ? `${first.slice(0, 69)}…` : first;
    return `${prefix}${truncated}`;
  }

  if (report.status === "SUCCESS" || report.status === "PARTIAL_FAILURE") {
    const n = report.rawIngestedDataCount;
    return `${prefix}${n} source${n === 1 ? "" : "s"} in report`;
  }

  const n = report.rawIngestedDataCount;
  return `${prefix}${n} source${n === 1 ? "" : "s"} ingested`;
}
