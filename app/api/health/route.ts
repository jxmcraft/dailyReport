import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Readiness: Postgres reachable. Use for ACA readiness probes. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", checks: { database: "up" } });
  } catch {
    return NextResponse.json(
      { status: "degraded", checks: { database: "down" } },
      { status: 503 }
    );
  }
}
