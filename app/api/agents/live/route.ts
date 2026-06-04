import { NextResponse } from "next/server";

import { getAgents } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  const agents = await getAgents();
  return NextResponse.json({
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      pipelineState: a.pipelineState,
      lastReportAt: a.lastReportAt,
      reportCount: a.reports.length,
      latestReportId: a.reports[0]?.id ?? null,
    })),
    runningCount: agents.filter((a) => a.status === "RUNNING").length,
  });
}
