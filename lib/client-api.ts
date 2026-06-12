import type {
  EmailDeliveryStatus,
  PipelineState,
  ReportStatus,
  SourceView,
} from "@/lib/agents";
import type { SourceDiagnostic } from "@/lib/sources";

export interface AgentLiveSummary {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "RUNNING";
  pipelineState: PipelineState;
  lastReportAt: string | null;
  reportCount: number;
  latestReportId: string | null;
}

export interface AgentsLiveResponse {
  agents: AgentLiveSummary[];
  runningCount: number;
}

export interface AgentStatusReport {
  id: string;
  timestamp: string;
  status: ReportStatus;
  rawIngestedDataCount: number;
  generatedMarkdown: string;
  sourcesUsed: SourceView[];
  sourceDiagnostics: SourceDiagnostic[] | null;
  emailDeliveryStatus: EmailDeliveryStatus;
}

export interface AgentStatusResponse {
  id: string;
  status: "ACTIVE" | "PAUSED" | "RUNNING";
  pipelineState: PipelineState;
  lastReportAt: string | null;
  reportCount: number;
  latestReport: AgentStatusReport | null;
}

export async function fetchAgentsLive(): Promise<AgentsLiveResponse | null> {
  const res = await fetch("/api/agents/live", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAgentStatus(
  agentId: string
): Promise<AgentStatusResponse | null> {
  const res = await fetch(`/api/agents/${agentId}/status`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export function agentsLiveSnapshotKey(agents: AgentLiveSummary[]): string {
  return agents
    .map((a) => `${a.id}:${a.status}:${a.latestReportId ?? ""}`)
    .join("|");
}
