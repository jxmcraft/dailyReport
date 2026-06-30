import { NextResponse } from "next/server";

import { getAgentStatusById } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const agent = await getAgentStatusById(params.id);
  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const latest = agent.latestReport;

  return NextResponse.json({
    id: agent.id,
    status: agent.status,
    pipelineState: agent.pipelineState,
    lastReportAt: agent.lastReportAt,
    reportCount: agent.reportCount,
    latestReport: latest
      ? {
          id: latest.id,
          timestamp: latest.timestamp,
          status: latest.status,
          statusNotes: latest.statusNotes,
          rawIngestedDataCount: latest.rawIngestedDataCount,
          generatedMarkdown: latest.generatedMarkdown,
          sourcesUsed: latest.sourcesUsed,
          sourceDiagnostics: latest.sourceDiagnostics,
          emailDeliveryStatus: latest.emailDeliveryStatus,
        }
      : null,
  });
}
