import type {
  Agent,
  DataSource,
  DeliveryChannel,
  EmailDeliveryStatus,
  IntelligenceReport,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatDateDay } from "@/lib/format-date";
import type { SourceDiagnostic } from "@/lib/sources";

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

export type { SourceDiagnostic } from "@/lib/sources";

export type { EmailDeliveryStatus };

export interface ReportView {
  id: string;
  timestamp: string;
  rawIngestedDataCount: number;
  generatedMarkdown: string;
  status: ReportStatus;
  sourcesUsed: SourceView[];
  sourceDiagnostics: SourceDiagnostic[] | null;
  emailDeliveryStatus: EmailDeliveryStatus;
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
  approverList: string[];
  requireEmailApproval: boolean;
}

export type KeywordMatchMode = "OR" | "AND";

export interface AgentView {
  id: string;
  name: string;
  topicKeywords: string[];
  cronSchedule: string;
  systemPrompt: string;
  relevanceMinScore: number;
  keywordMatchMode: KeywordMatchMode;
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
    emailDeliveryStatus: report.emailDeliveryStatus,
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
    relevanceMinScore: agent.relevanceMinScore,
    keywordMatchMode:
      agent.keywordMatchMode === "AND" ? "AND" : ("OR" as KeywordMatchMode),
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
      approverList: c.approverList,
      requireEmailApproval: c.requireEmailApproval,
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

export { cronToHuman } from "@/lib/cron";
export { formatDate, formatDateDay } from "@/lib/format-date";

export interface DailyReportGroup {
  day: string;
  runs: RunView[];
}

export async function getDailyReportGroups(): Promise<DailyReportGroup[]> {
  const runs = await getAllRuns();
  const byDay = new Map<string, RunView[]>();

  for (const run of runs) {
    const day = formatDateDay(run.report.timestamp);
    const list = byDay.get(day) ?? [];
    list.push(run);
    byDay.set(day, list);
  }

  return Array.from(byDay.entries()).map(([day, dayRuns]) => ({
    day,
    runs: dayRuns,
  }));
}
