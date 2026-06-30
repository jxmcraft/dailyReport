import { Prisma, type AgentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { TOP_K } from "@/lib/constants";
import { callReportLLM } from "@/lib/llm";
import { dispatchToChannel } from "@/lib/delivery";
import { getWorkspaceSettings } from "@/lib/workspace-settings";
import {
  buildDefaultProviders,
  buildWebProvider,
  ingestProvider,
  type ProviderSpec,
  type RankedDocument,
  type SourceDiagnostic,
} from "@/lib/sources";
import { rankDocuments } from "@/lib/ranking";
import { buildOutputGuardrails } from "@/lib/report-intent";
import {
  DEFAULT_MAX_NEWS_AGE_DAYS,
  countStaleDocuments,
  filterRecentDocuments,
  parsePublishedMs,
} from "@/lib/recency";
import type { SourceMetadata } from "@/types/agent";

export type { SourceDiagnostic } from "@/lib/sources";

const TOKEN_LIMIT = 128000;
const EVIDENCE_SNIPPET_CHARS = 800;

async function updateAgentStatus(agentId: string, status: AgentStatus) {
  await prisma.agent.update({ where: { id: agentId }, data: { status } });
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Map-reduce wrapper: when context exceeds the model window, summarize each
// chunk independently, then synthesize the partial summaries.
async function synthesizeReport(
  systemPrompt: string,
  context: string
): Promise<string> {
  if (estimateTokens(context) <= TOKEN_LIMIT) {
    return callReportLLM(systemPrompt, context);
  }

  const chunkChars = TOKEN_LIMIT * 4;
  const chunks: string[] = [];
  for (let i = 0; i < context.length; i += chunkChars) {
    chunks.push(context.slice(i, i + chunkChars));
  }

  const partials: string[] = [];
  for (const chunk of chunks) {
    partials.push(
      await callReportLLM(
        "Summarize the key facts from this data chunk concisely. Preserve names, numbers, and sources.",
        chunk
      )
    );
  }

  return callReportLLM(systemPrompt, partials.join("\n\n---\n\n"));
}

// Turn ranked documents into a clean, numbered evidence block (instead of raw
// JSON). Each entry is citable by index and carries its source + URL.
function buildEvidenceContext(docs: RankedDocument[]): string {
  return docs
    .map((d, i) => {
      const publishedMs = parsePublishedMs(d.publishedAt);
      const date =
        publishedMs === null
          ? "n/a"
          : new Date(publishedMs).toISOString().slice(0, 10);
      return `[${i + 1}] (${d.source}, ${date}) ${d.title}\nURL: ${d.url}\n${d.text.slice(0, EVIDENCE_SNIPPET_CHARS)}`;
    })
    .join("\n\n");
}

// Built-in keyword providers (News, Reddit, Hacker News, Google) always run.
// Any webpage URLs the user added are scraped as additional sources.
function buildProviderSpecs(
  keywords: string[],
  webpageSources: { id: string; apiEndpoint: string }[]
): ProviderSpec[] {
  const specs = buildDefaultProviders(keywords);
  for (const s of webpageSources) {
    if (s.apiEndpoint) specs.push(buildWebProvider(s.apiEndpoint, s.id));
  }
  const seen = new Set<string>();
  return specs.filter((s) => {
    if (seen.has(s.endpoint)) return false;
    seen.add(s.endpoint);
    return true;
  });
}

function buildStatusNotes(
  sourceDiagnostics: SourceDiagnostic[],
  lowConfidence: boolean,
  deliveryFailed: boolean
): string[] {
  const notes: string[] = [];
  for (const d of sourceDiagnostics) {
    if (d.status === "error") {
      notes.push(
        `Source ${d.sourceType} failed: ${d.errorReason ?? "unknown error"}`
      );
    }
  }
  if (lowConfidence) {
    notes.push(
      "Fewer than 3 sources passed relevance filtering (weak evidence)."
    );
  }
  if (deliveryFailed) {
    notes.push(
      "Delivery to one or more channels failed (see server logs)."
    );
  }
  return notes;
}

export type PipelineOutcome =
  | { outcome: "success" }
  | { outcome: "no_data"; message: string }
  | { outcome: "error"; message: string }
  | { outcome: "skipped"; reason: "paused" | "not_found" };

export async function executeAgentPipeline(
  agentId: string
): Promise<PipelineOutcome> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { dataSources: true, deliveryChannels: true },
  });
  if (!agent) return { outcome: "skipped", reason: "not_found" };
  if (agent.status === "PAUSED") return { outcome: "skipped", reason: "paused" };

  await updateAgentStatus(agentId, "RUNNING");

  const { sourceFetchTimeoutMs } = await getWorkspaceSettings();

  const sourceDiagnostics: SourceDiagnostic[] = [];
  let rankedCount = 0;
  let pipelinePhase: "ingestion" | "synthesis" | "delivery" = "ingestion";

  try {
    // Old API-type rows are superseded by built-in providers; only CUSTOM_SCRAPE
    // rows (plain webpage URLs) are treated as additional user sources.
    const webpageSources = agent.dataSources.filter(
      (s) => s.sourceType === "CUSTOM_SCRAPE"
    );
    const specs = buildProviderSpecs(agent.topicKeywords, webpageSources);

    const results = await Promise.all(
      specs.map((s) => ingestProvider(s, sourceFetchTimeoutMs))
    );
    const allDocs: RankedDocument[] = [];
    for (const r of results) {
      sourceDiagnostics.push(r.diagnostic);
      allDocs.push(...r.docs);
    }

    const recentDocs = filterRecentDocuments(allDocs, DEFAULT_MAX_NEWS_AGE_DAYS);
    const droppedStale = countStaleDocuments(allDocs, DEFAULT_MAX_NEWS_AGE_DAYS);

    const { ranked, lowConfidence, relevantCount } = rankDocuments(
      agent.topicKeywords,
      recentDocs,
      TOP_K,
      {
        minScore: agent.relevanceMinScore,
        matchMode: agent.keywordMatchMode === "AND" ? "AND" : "OR",
      }
    );

    rankedCount = ranked.length;

    if (ranked.length < agent.minRankedSources) {
      const okSources = sourceDiagnostics.filter((d) => d.status === "ok").length;
      const staleNote =
        droppedStale > 0
          ? ` ${droppedStale} dated article(s) were excluded by the recency filter.`
          : "";
      const detail =
        ranked.length === 0
          ? `Fetched ${allDocs.length} article(s) from ${specs.length} source(s) (${okSources} responded); ${recentDocs.length} eligible after recency filter.${staleNote} None passed relevance filtering for [${agent.topicKeywords.join(", ") || "none set"}] (min score ${agent.relevanceMinScore}, ${agent.keywordMatchMode} match, ${relevantCount} passed). Lower the relevance threshold, use broader keywords, or add API keys in .env.`
          : `Found ${ranked.length} ranked source(s) after filtering; minimum required is ${agent.minRankedSources}.${staleNote} Fetched ${allDocs.length} article(s) from ${specs.length} source(s) (${okSources} responded); ${recentDocs.length} eligible after recency filter. Lower the relevance threshold, broaden keywords, add API keys in .env, or reduce minimum ranked sources in agent settings.`;
      const abortNotes = [
        ...buildStatusNotes(sourceDiagnostics, false, false),
        `Run aborted: ${ranked.length} ranked source(s); minimum is ${agent.minRankedSources}.`,
      ];
      if (droppedStale > 0) {
        abortNotes.push(
          `${droppedStale} dated article(s) were excluded by the recency filter.`
        );
      }
      await prisma.intelligenceReport.create({
        data: {
          agentId,
          rawIngestedDataCount: allDocs.length,
          generatedMarkdown: `# Run aborted: insufficient sources\n\n${detail}`,
          status: "CRITICAL_ERROR",
          statusNotes: abortNotes,
          sourcesUsed: [],
          sourceDiagnostics: sourceDiagnostics as unknown as Prisma.InputJsonValue,
        },
      });
      return { outcome: "no_data", message: detail };
    }

    pipelinePhase = "synthesis";

    // Guardrails keep the model grounded in the ranked evidence rather than
    // free-associating from its training data.
    const guardrail = [
      `You are producing an intelligence report strictly about: ${agent.topicKeywords.join(", ") || agent.name}.`,
      "Use ONLY the numbered evidence provided. Cite claims with their [n] index and include source URLs.",
      "If the evidence is insufficient or off-topic, state that plainly and do not invent facts from prior knowledge.",
      ...buildOutputGuardrails(agent.systemPrompt),
    ].join(" ");
    const fullSystemPrompt = `${agent.systemPrompt}\n\n${guardrail}`;

    const context =
      (lowConfidence
        ? "WARNING: Only a few weakly-relevant sources were found. Be explicit about the limited evidence.\n\n"
        : "") + buildEvidenceContext(ranked);

    const synthesizedMarkdownReport = await synthesizeReport(
      fullSystemPrompt,
      context
    );

    const extractedSourceMeta: SourceMetadata[] = ranked.map((d) => ({
      title: d.title,
      url: d.url,
      snippet: d.text.slice(0, 300),
      timestampFetched: d.publishedAt ?? new Date().toISOString(),
    }));

    const anySourceFailed = sourceDiagnostics.some((d) => d.status === "error");
    const preliminaryPartial = anySourceFailed || lowConfidence;

    const report = await prisma.intelligenceReport.create({
      data: {
        agentId,
        rawIngestedDataCount: extractedSourceMeta.length,
        generatedMarkdown: synthesizedMarkdownReport,
        status: preliminaryPartial ? "PARTIAL_FAILURE" : "SUCCESS",
        statusNotes: buildStatusNotes(
          sourceDiagnostics,
          lowConfidence,
          false
        ),
        sourcesUsed: extractedSourceMeta as unknown as Prisma.InputJsonValue,
        sourceDiagnostics: sourceDiagnostics as unknown as Prisma.InputJsonValue,
        emailDeliveryStatus: "NOT_APPLICABLE",
      },
    });

    pipelinePhase = "delivery";

    // Delivery after persist so approval emails can link to reportId.
    let deliveryFailed = false;
    for (const channel of agent.deliveryChannels) {
      if (channel.target === "EMAIL" && !channel.autoSendEmail) continue;
      try {
        await dispatchToChannel(channel, synthesizedMarkdownReport, {
          reportId: report.id,
          agentName: agent.name,
        });
      } catch (error) {
        deliveryFailed = true;
        console.warn(
          `Delivery to ${channel.target} (${channel.id}) failed:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    if (deliveryFailed) {
      const notes = buildStatusNotes(
        sourceDiagnostics,
        lowConfidence,
        true
      );
      await prisma.intelligenceReport.update({
        where: { id: report.id },
        data: {
          status: "PARTIAL_FAILURE",
          statusNotes: notes,
        },
      });
    }
    return { outcome: "success" };
  } catch (error) {
    const baseMessage =
      error instanceof Error ? error.message : String(error);
    const ingestedCount =
      rankedCount > 0
        ? rankedCount
        : sourceDiagnostics.reduce((sum, d) => sum + d.itemsIngested, 0);
    const message = `Failed during ${pipelinePhase}: ${baseMessage}`;
    const errorNotes = [
      message,
      ...buildStatusNotes(sourceDiagnostics, false, false),
    ];
    await prisma.intelligenceReport.create({
      data: {
        agentId,
        rawIngestedDataCount: ingestedCount,
        generatedMarkdown: `Pipeline compilation error: ${message}`,
        status: "CRITICAL_ERROR",
        statusNotes: errorNotes,
        sourcesUsed: [],
        sourceDiagnostics: sourceDiagnostics.length
          ? (sourceDiagnostics as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
    return { outcome: "error", message };
  } finally {
    await updateAgentStatus(agentId, "ACTIVE");
  }
}
