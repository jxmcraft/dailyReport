import { NextResponse } from "next/server";

import { getAgentById, type PipelineState } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const agent = await getAgentById(params.id);
  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const latest = agent.reports[0] ?? null;

  return NextResponse.json({
    id: agent.id,
    status: agent.status,
    pipelineState: agent.pipelineState as PipelineState,
    lastReportAt: agent.lastReportAt,
    reportCount: agent.reports.length,
    latestReport: latest
      ? {
          id: latest.id,
          timestamp: latest.timestamp,
          status: latest.status,
          rawIngestedDataCount: latest.rawIngestedDataCount,
          generatedMarkdown: latest.generatedMarkdown,
          sourcesUsed: latest.sourcesUsed,
          sourceDiagnostics: latest.sourceDiagnostics,
        }
      : null,
  });
}
