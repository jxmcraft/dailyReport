import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness: process is up (no DB). Use for ACA liveness probes. */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
