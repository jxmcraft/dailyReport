import { NextResponse } from "next/server";

import { getAgentsLiveSummary } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  const agents = await getAgentsLiveSummary();
  return NextResponse.json({
    agents,
    runningCount: agents.filter((a) => a.status === "RUNNING").length,
  });
}
