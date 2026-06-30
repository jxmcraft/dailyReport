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
      return NextResponse.json(
        {
          ok: false,
          error:
            result.reason === "paused"
              ? "Agent is paused."
              : "Agent not found.",
        },
        { status: result.reason === "not_found" ? 404 : 409 }
      );
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
