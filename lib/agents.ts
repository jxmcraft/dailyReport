import type {
  Agent,
  DataSource,
  DeliveryChannel,
  IntelligenceReport,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PipelineState =
  | "IDLE"
  | "FETCHING"
  | "SYNTHESIZING"
  | "DELIVERING"
  | "COMPLETED";

export type AgentStatus = "ACTIVE" | "PAUSED" | "RUNNING";

export type ReportStatus = "SUCCESS" | "PARTIAL_FAILURE" | "CRITICAL_ERROR";

export interface SourceView {
  title: string;
  url: string;
  snippet: string;
  timestampFetched: string;
}

export interface SourceDiagnostic {
  sourceId: string;
  sourceType: string;
  endpoint: string;
  status: "ok" | "error";
  httpStatus?: number;
  contentType?: string;
  itemsIngested: number;
  errorReason?: string;
  retriedWithBroaderQuery?: boolean;
  checkedAt: string;
}

export interface ReportView {
  id: string;
  timestamp: string;
  rawIngestedDataCount: number;
  generatedMarkdown: string;
  status: ReportStatus;
  sourcesUsed: SourceView[];
  sourceDiagnostics: SourceDiagnostic[] | null;
}

export interface DataSourceView {
  sourceType: string;
  apiEndpoint: string;
  authSecretKeyRef: string;
}

export interface DeliveryChannelView {
  target: string;
  webhookUrl: string;
  recipientList: string[];
}

export interface AgentView {
  id: string;
  name: string;
  topicKeywords: string[];
  cronSchedule: string;
  systemPrompt: string;
  status: AgentStatus;
  pipelineState: PipelineState;
  lastReportAt: string | null;
  dataSources: DataSourceView[];
  deliveryChannels: DeliveryChannelView[];
  reports: ReportView[];
}

type AgentWithRelations = Agent & {
  dataSources: DataSource[];
  deliveryChannels: DeliveryChannel[];
  reports: IntelligenceReport[];
};

function toReportView(report: IntelligenceReport): ReportView {
  return {
    id: report.id,
    timestamp: report.timestamp.toISOString(),
    rawIngestedDataCount: report.rawIngestedDataCount,
    generatedMarkdown: report.generatedMarkdown,
    status: report.status as ReportStatus,
    sourcesUsed: (report.sourcesUsed as unknown as SourceView[]) ?? [],
    sourceDiagnostics:
      (report.sourceDiagnostics as unknown as SourceDiagnostic[]) ?? null,
  };
}

// No per-stage tracking is persisted, so the live indicator is derived from the
// coarse Agent.status plus whether a report exists.
function derivePipelineState(
  status: AgentStatus,
  hasReport: boolean
): PipelineState {
  if (status === "RUNNING") return "SYNTHESIZING";
  return hasReport ? "COMPLETED" : "IDLE";
}

function toAgentView(agent: AgentWithRelations): AgentView {
  const reports = [...agent.reports].sort((a, b) =>
    b.timestamp.getTime() - a.timestamp.getTime()
  );
  return {
    id: agent.id,
    name: agent.name,
    topicKeywords: agent.topicKeywords,
    cronSchedule: agent.cronSchedule,
    systemPrompt: agent.systemPrompt,
    status: agent.status as AgentStatus,
    pipelineState: derivePipelineState(
      agent.status as AgentStatus,
      reports.length > 0
    ),
    lastReportAt: reports[0]?.timestamp.toISOString() ?? null,
    dataSources: agent.dataSources.map((s) => ({
      sourceType: s.sourceType,
      apiEndpoint: s.apiEndpoint,
      authSecretKeyRef: s.authSecretKeyRef,
    })),
    deliveryChannels: agent.deliveryChannels.map((c) => ({
      target: c.target,
      webhookUrl: c.webhookUrl,
      recipientList: c.recipientList,
    })),
    reports: reports.map(toReportView),
  };
}

export async function getAgents(): Promise<AgentView[]> {
  const agents = await prisma.agent.findMany({
    include: { dataSources: true, deliveryChannels: true, reports: true },
    orderBy: { createdAt: "asc" },
  });
  return agents.map(toAgentView);
}

export async function getAgentById(id: string): Promise<AgentView | null> {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { dataSources: true, deliveryChannels: true, reports: true },
  });
  return agent ? toAgentView(agent) : null;
}

export interface RunView {
  agentId: string;
  agentName: string;
  report: ReportView;
}

export async function getAllRuns(): Promise<RunView[]> {
  const reports = await prisma.intelligenceReport.findMany({
    include: { agent: true },
    orderBy: { timestamp: "desc" },
  });
  return reports.map((r) => ({
    agentId: r.agentId,
    agentName: r.agent.name,
    report: toReportView(r),
  }));
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, , , dow] = parts;
  const time =
    hour.includes("*") || hour.includes("/")
      ? null
      : `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;

  if (hour.startsWith("*/")) return `Every ${hour.slice(2)} hours`;
  if (dow !== "*") {
    const day = DOW[Number(dow)] ?? `day ${dow}`;
    return time ? `Weekly on ${day} at ${time}` : `Weekly on ${day}`;
  }
  return time ? `Daily at ${time}` : "Daily";
}

export function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
