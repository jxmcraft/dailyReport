import type {
  Agent,
  DataSource,
  DeliveryChannel,
  EmailDeliveryStatus,
  IntelligenceReport,
} from "@prisma/client";

import { RUNS_PAGE_SIZE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDateDay } from "@/lib/format-date";
import type { SourceDiagnostic } from "@/lib/sources";

export type PipelineState =
  | "IDLE"
  | "IN_PROGRESS"
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
  statusNotes: string[];
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
  autoSendEmail: boolean;
}

export type KeywordMatchMode = "OR" | "AND";

export interface AgentView {
  id: string;
  name: string;
  topicKeywords: string[];
  cronSchedule: string;
  systemPrompt: string;
  relevanceMinScore: number;
  minRankedSources: number;
  maxRankedSources: number;
  shallowScrapeMaxLinks: number;
  enableNewsApi: boolean;
  enableReddit: boolean;
  enableHackerNews: boolean;
  enableGoogleSearch: boolean;
  keywordMatchMode: KeywordMatchMode;
  status: AgentStatus;
  pipelineState: PipelineState;
  lastReportAt: string | null;
  reportCount: number;
  dataSources: DataSourceView[];
  deliveryChannels: DeliveryChannelView[];
  reports: ReportView[];
}

export interface AgentLiveView {
  id: string;
  name: string;
  status: AgentStatus;
  pipelineState: PipelineState;
  lastReportAt: string | null;
  reportCount: number;
  latestReportId: string | null;
}

type AgentWithRelations = Agent & {
  dataSources: DataSource[];
  deliveryChannels: DeliveryChannel[];
  reports: IntelligenceReport[];
  _count?: { reports: number };
};

function toReportView(report: IntelligenceReport): ReportView {
  return {
    id: report.id,
    timestamp: report.timestamp.toISOString(),
    rawIngestedDataCount: report.rawIngestedDataCount,
    generatedMarkdown: report.generatedMarkdown,
    status: report.status as ReportStatus,
    statusNotes: report.statusNotes ?? [],
    sourcesUsed: (report.sourcesUsed as unknown as SourceView[]) ?? [],
    sourceDiagnostics:
      (report.sourceDiagnostics as unknown as SourceDiagnostic[]) ?? null,
    emailDeliveryStatus: report.emailDeliveryStatus,
  };
}

function derivePipelineState(
  status: AgentStatus,
  hasReport: boolean
): PipelineState {
  if (status === "RUNNING") return "IN_PROGRESS";
  return hasReport ? "COMPLETED" : "IDLE";
}

function toAgentView(agent: AgentWithRelations): AgentView {
  const reports = [...agent.reports].sort((a, b) =>
    b.timestamp.getTime() - a.timestamp.getTime()
  );
  const reportCount = agent._count?.reports ?? reports.length;
  return {
    id: agent.id,
    name: agent.name,
    topicKeywords: agent.topicKeywords,
    cronSchedule: agent.cronSchedule,
    systemPrompt: agent.systemPrompt,
    relevanceMinScore: agent.relevanceMinScore,
    minRankedSources: agent.minRankedSources,
    maxRankedSources: agent.maxRankedSources,
    shallowScrapeMaxLinks: agent.shallowScrapeMaxLinks,
    enableNewsApi: agent.enableNewsApi,
    enableReddit: agent.enableReddit,
    enableHackerNews: agent.enableHackerNews,
    enableGoogleSearch: agent.enableGoogleSearch,
    keywordMatchMode:
      agent.keywordMatchMode === "AND" ? "AND" : ("OR" as KeywordMatchMode),
    status: agent.status as AgentStatus,
    pipelineState: derivePipelineState(
      agent.status as AgentStatus,
      reportCount > 0
    ),
    lastReportAt: reports[0]?.timestamp.toISOString() ?? null,
    reportCount,
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
      autoSendEmail: c.autoSendEmail,
    })),
    reports: reports.map(toReportView),
  };
}

const agentIncludeSummary = {
  dataSources: true,
  deliveryChannels: true,
  reports: { orderBy: { timestamp: "desc" as const }, take: 1 },
  _count: { select: { reports: true } },
};

const agentIncludeLive = {
  reports: { orderBy: { timestamp: "desc" as const }, take: 1 },
  _count: { select: { reports: true } },
};

const agentIncludeDetail = {
  dataSources: true,
  deliveryChannels: true,
  reports: { orderBy: { timestamp: "desc" as const }, take: 50 },
  _count: { select: { reports: true } },
};

export async function getAgentsSummary(): Promise<AgentView[]> {
  const agents = await prisma.agent.findMany({
    include: agentIncludeSummary,
    orderBy: { createdAt: "asc" },
  });
  return agents.map(toAgentView);
}

export async function getAgentsLiveSummary(): Promise<AgentLiveView[]> {
  const agents = await prisma.agent.findMany({
    include: agentIncludeLive,
    orderBy: { createdAt: "asc" },
  });

  return agents.map((agent) => {
    const latest = agent.reports[0] ?? null;
    const reportCount = agent._count.reports;
    return {
      id: agent.id,
      name: agent.name,
      status: agent.status as AgentStatus,
      pipelineState: derivePipelineState(
        agent.status as AgentStatus,
        reportCount > 0
      ),
      lastReportAt: latest?.timestamp.toISOString() ?? null,
      reportCount,
      latestReportId: latest?.id ?? null,
    };
  });
}

/** @deprecated Use getAgentsSummary for list views. */
export async function getAgents(): Promise<AgentView[]> {
  return getAgentsSummary();
}

export async function getAgentById(id: string): Promise<AgentView | null> {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: agentIncludeDetail,
  });
  return agent ? toAgentView(agent) : null;
}

/** Lightweight shape for per-agent live polling (latest report + true count only). */
export interface AgentStatusView {
  id: string;
  status: AgentStatus;
  pipelineState: PipelineState;
  lastReportAt: string | null;
  reportCount: number;
  latestReport: ReportView | null;
}

const agentIncludeStatus = {
  reports: { orderBy: { timestamp: "desc" as const }, take: 1 },
  _count: { select: { reports: true } },
};

export async function getAgentStatusById(
  id: string
): Promise<AgentStatusView | null> {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: agentIncludeStatus,
  });
  if (!agent) return null;

  const reportCount = agent._count.reports;
  const latest = agent.reports[0] ?? null;

  return {
    id: agent.id,
    status: agent.status as AgentStatus,
    pipelineState: derivePipelineState(
      agent.status as AgentStatus,
      reportCount > 0
    ),
    lastReportAt: latest?.timestamp.toISOString() ?? null,
    reportCount,
    latestReport: latest ? toReportView(latest) : null,
  };
}

export interface RunView {
  agentId: string;
  agentName: string;
  report: ReportView;
  deliveryTarget: string | null;
  requireEmailApproval: boolean;
}

export interface RunsPage {
  runs: RunView[];
  olderCursor: string | null;
  newerCursor: string | null;
}

function encodeRunViewCursor(run: RunView): string {
  return Buffer.from(`${run.report.timestamp}::${run.report.id}`).toString("base64");
}

function decodeRunCursor(cursor: string): { id: string } {
  const decoded = Buffer.from(cursor, "base64").toString("utf8");
  const [, id] = decoded.split("::");
  if (!id) throw new Error("Invalid run cursor.");
  return { id };
}

function toRunView(r: IntelligenceReport & {
  agent: Agent & { deliveryChannels: DeliveryChannel[] };
}): RunView {
  const channel = r.agent.deliveryChannels[0] ?? null;
  return {
    agentId: r.agentId,
    agentName: r.agent.name,
    report: toReportView(r),
    deliveryTarget: channel?.target ?? null,
    requireEmailApproval: channel?.requireEmailApproval ?? false,
  };
}

export async function getAllRuns(): Promise<RunView[]> {
  const reports = await prisma.intelligenceReport.findMany({
    include: {
      agent: {
        include: { deliveryChannels: { take: 1, orderBy: { id: "asc" } } },
      },
    },
    orderBy: { timestamp: "desc" },
  });
  return reports.map(toRunView);
}

export async function getRunsPage(opts?: {
  take?: number;
  cursor?: string;
  direction?: "older" | "newer";
}): Promise<RunsPage> {
  const take = Math.max(1, Math.min(100, opts?.take ?? RUNS_PAGE_SIZE));
  const direction = opts?.direction ?? "older";
  const cursorId = opts?.cursor ? decodeRunCursor(opts.cursor).id : null;

  const reports = await prisma.intelligenceReport.findMany({
    include: {
      agent: {
        include: { deliveryChannels: { take: 1, orderBy: { id: "asc" } } },
      },
    },
    orderBy:
      direction === "older"
        ? [{ timestamp: "desc" as const }, { id: "desc" as const }]
        : [{ timestamp: "asc" as const }, { id: "asc" as const }],
    cursor: cursorId ? { id: cursorId } : undefined,
    skip: cursorId ? 1 : 0,
    take: take + 1,
  });

  const slice = reports.slice(0, take);
  const normalized = direction === "older" ? slice : [...slice].reverse();
  const runs = normalized.map(toRunView);
  const hasMore = reports.length > take;

  return {
    runs,
    olderCursor:
      runs.length > 0 && (direction === "older" ? hasMore : !!opts?.cursor)
        ? encodeRunViewCursor(runs[runs.length - 1])
        : null,
    newerCursor:
      runs.length > 0 && opts?.cursor
        ? encodeRunViewCursor(runs[0])
        : null,
  };
}

export { cronToHuman } from "@/lib/cron";
export { formatDate, formatDateDay } from "@/lib/format-date";

export interface DailyReportGroup {
  day: string;
  runs: RunView[];
}

export interface DailyReportGroupsPage {
  groups: DailyReportGroup[];
  olderCursor: string | null;
  newerCursor: string | null;
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

export async function getDailyReportGroupsPage(opts?: {
  take?: number;
  cursor?: string;
  direction?: "older" | "newer";
}): Promise<DailyReportGroupsPage> {
  const page = await getRunsPage(opts);
  const byDay = new Map<string, RunView[]>();

  for (const run of page.runs) {
    const day = formatDateDay(run.report.timestamp);
    const list = byDay.get(day) ?? [];
    list.push(run);
    byDay.set(day, list);
  }

  return {
    groups: Array.from(byDay.entries()).map(([day, dayRuns]) => ({
      day,
      runs: dayRuns,
    })),
    olderCursor: page.olderCursor,
    newerCursor: page.newerCursor,
  };
}
