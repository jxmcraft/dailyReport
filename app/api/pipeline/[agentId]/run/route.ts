import { NextResponse } from "next/server";

import { verifyApiSecret } from "@/lib/api-auth";
import { executeAgentPipeline } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const unauthorized = verifyApiSecret(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await executeAgentPipeline(params.agentId);
    if (result.outcome === "skipped") {
      const status =
        result.reason === "not_found"
          ? 404
          : result.reason === "already_running"
            ? 409
            : 409;
      const error =
        result.reason === "paused"
          ? "Agent is paused."
          : result.reason === "already_running"
            ? "A pipeline run is already in progress."
            : "Agent not found.";
      return NextResponse.json({ ok: false, error }, { status });
    }
    if (result.outcome === "no_data" || result.outcome === "error") {
      return NextResponse.json(
        { ok: false, error: result.message, outcome: result.outcome },
        { status: 422 }
      );
    }
    return NextResponse.json({ ok: true, agentId: params.agentId, outcome: "success" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
