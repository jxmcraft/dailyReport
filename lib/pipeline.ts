import { Prisma, type AgentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { callOpenRouterLLM } from "@/lib/openrouter";
import { dispatchToChannel } from "@/lib/delivery";
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
  filterRecentDocuments,
} from "@/lib/recency";
import type { SourceMetadata } from "@/types/agent";

export type { SourceDiagnostic } from "@/lib/sources";

const TOKEN_LIMIT = 128000;
const TOP_K = 12;
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
    return callOpenRouterLLM(systemPrompt, context);
  }

  const chunkChars = TOKEN_LIMIT * 4;
  const chunks: string[] = [];
  for (let i = 0; i < context.length; i += chunkChars) {
    chunks.push(context.slice(i, i + chunkChars));
  }

  const partials: string[] = [];
  for (const chunk of chunks) {
    partials.push(
      await callOpenRouterLLM(
        "Summarize the key facts from this data chunk concisely. Preserve names, numbers, and sources.",
        chunk
      )
    );
  }

  return callOpenRouterLLM(systemPrompt, partials.join("\n\n---\n\n"));
}

// Turn ranked documents into a clean, numbered evidence block (instead of raw
// JSON). Each entry is citable by index and carries its source + URL.
function buildEvidenceContext(docs: RankedDocument[]): string {
  return docs
    .map((d, i) => {
      const date = d.publishedAt
        ? new Date(d.publishedAt).toISOString().slice(0, 10)
        : "n/a";
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

export async function executeAgentPipeline(agentId: string): Promise<void> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { dataSources: true, deliveryChannels: true },
  });
  if (!agent || agent.status === "PAUSED") return;

  await updateAgentStatus(agentId, "RUNNING");

  const sourceDiagnostics: SourceDiagnostic[] = [];

  try {
    // Old API-type rows are superseded by built-in providers; only CUSTOM_SCRAPE
    // rows (plain webpage URLs) are treated as additional user sources.
    const webpageSources = agent.dataSources.filter(
      (s) => s.sourceType === "CUSTOM_SCRAPE"
    );
    const specs = buildProviderSpecs(agent.topicKeywords, webpageSources);

    const results = await Promise.all(specs.map(ingestProvider));
    const allDocs: RankedDocument[] = [];
    for (const r of results) {
      sourceDiagnostics.push(r.diagnostic);
      allDocs.push(...r.docs);
    }

    const recentDocs = filterRecentDocuments(allDocs, DEFAULT_MAX_NEWS_AGE_DAYS);
    const droppedStale = allDocs.length - recentDocs.length;

    const { ranked, lowConfidence, relevantCount } = rankDocuments(
      agent.topicKeywords,
      recentDocs,
      TOP_K,
      {
        minScore: agent.relevanceMinScore,
        matchMode: agent.keywordMatchMode === "AND" ? "AND" : "OR",
      }
    );

    // Nothing relevant found: record a clear, actionable failure instead of
    // feeding the LLM noise (which produced off-topic reports before).
    if (ranked.length === 0) {
      const okSources = sourceDiagnostics.filter((d) => d.status === "ok").length;
      const staleNote =
        droppedStale > 0
          ? ` ${droppedStale} article(s) were older than ${DEFAULT_MAX_NEWS_AGE_DAYS} days and excluded.`
          : "";
      const detail = `Fetched ${allDocs.length} article(s) from ${specs.length} source(s) (${okSources} responded); ${recentDocs.length} within the last ${DEFAULT_MAX_NEWS_AGE_DAYS} days.${staleNote} None passed relevance filtering for [${agent.topicKeywords.join(", ") || "none set"}] (min score ${agent.relevanceMinScore}, ${agent.keywordMatchMode} match, ${relevantCount} passed). Lower the relevance threshold, use broader keywords, or add API keys in .env.`;
      await prisma.intelligenceReport.create({
        data: {
          agentId,
          rawIngestedDataCount: 0,
          generatedMarkdown: `# Run aborted: no relevant data\n\n${detail}`,
          status: "CRITICAL_ERROR",
          sourcesUsed: [],
          sourceDiagnostics: sourceDiagnostics as unknown as Prisma.InputJsonValue,
        },
      });
      return;
    }

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

    // Delivery failures must not lose the report: dispatch best-effort, flag the
    // run, and still persist the generated output to history.
    let deliveryFailed = false;
    for (const channel of agent.deliveryChannels) {
      try {
        await dispatchToChannel(channel, synthesizedMarkdownReport);
      } catch (error) {
        deliveryFailed = true;
        console.warn(
          `Delivery to ${channel.target} (${channel.id}) failed:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    const anySourceFailed = sourceDiagnostics.some((d) => d.status === "error");
    const partial = anySourceFailed || deliveryFailed || lowConfidence;

    await prisma.intelligenceReport.create({
      data: {
        agentId,
        rawIngestedDataCount: extractedSourceMeta.length,
        generatedMarkdown: synthesizedMarkdownReport,
        status: partial ? "PARTIAL_FAILURE" : "SUCCESS",
        sourcesUsed: extractedSourceMeta as unknown as Prisma.InputJsonValue,
        sourceDiagnostics: sourceDiagnostics as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    await prisma.intelligenceReport.create({
      data: {
        agentId,
        rawIngestedDataCount: 0,
        generatedMarkdown: `Pipeline compilation error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        status: "CRITICAL_ERROR",
        sourcesUsed: [],
        sourceDiagnostics: sourceDiagnostics.length
          ? (sourceDiagnostics as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } finally {
    await updateAgentStatus(agentId, "ACTIVE");
  }
}
