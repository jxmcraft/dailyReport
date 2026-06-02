import { NextResponse } from "next/server";

import { executeAgentPipeline } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    await executeAgentPipeline(params.agentId);
    return NextResponse.json({ ok: true, agentId: params.agentId });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
