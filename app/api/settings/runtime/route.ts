import { NextResponse } from "next/server";

import { getWorkspaceSettings } from "@/lib/workspace-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getWorkspaceSettings();
  return NextResponse.json({ activeRunPollMs: settings.activeRunPollMs });
}
