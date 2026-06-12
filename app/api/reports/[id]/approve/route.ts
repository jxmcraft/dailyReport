import { NextResponse } from "next/server";

import { approveAndDistributeReport } from "@/lib/email-approval";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body: { token?: string; approvedBy?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing approval token." }, { status: 400 });
  }

  const result = await approveAndDistributeReport(
    params.id,
    token,
    body.approvedBy?.trim() || undefined
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    alreadyDistributed: result.alreadyDistributed,
    recipientCount: result.recipientCount,
  });
}
