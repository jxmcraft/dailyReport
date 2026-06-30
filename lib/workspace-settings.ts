import {
  ACTIVE_RUN_POLL_MS,
  LLM_TIMEOUT_MS,
  SOURCE_FETCH_TIMEOUT_MS,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export interface WorkspaceSettingsView {
  llmTimeoutMs: number;
  sourceFetchTimeoutMs: number;
  activeRunPollMs: number;
}

const DEFAULTS: WorkspaceSettingsView = {
  llmTimeoutMs: LLM_TIMEOUT_MS,
  sourceFetchTimeoutMs: SOURCE_FETCH_TIMEOUT_MS,
  activeRunPollMs: ACTIVE_RUN_POLL_MS,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettingsView> {
  const row = await prisma.workspaceSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...DEFAULTS },
    update: {},
  });
  return {
    llmTimeoutMs: row.llmTimeoutMs,
    sourceFetchTimeoutMs: row.sourceFetchTimeoutMs,
    activeRunPollMs: row.activeRunPollMs,
  };
}

export async function updateWorkspaceSettings(
  data: Partial<WorkspaceSettingsView>
): Promise<WorkspaceSettingsView> {
  const current = await getWorkspaceSettings();
  const next: WorkspaceSettingsView = {
    llmTimeoutMs: clamp(
      data.llmTimeoutMs ?? current.llmTimeoutMs,
      30_000,
      600_000
    ),
    sourceFetchTimeoutMs: clamp(
      data.sourceFetchTimeoutMs ?? current.sourceFetchTimeoutMs,
      10_000,
      180_000
    ),
    activeRunPollMs: clamp(
      data.activeRunPollMs ?? current.activeRunPollMs,
      2_000,
      30_000
    ),
  };

  const row = await prisma.workspaceSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...next },
    update: next,
  });

  return {
    llmTimeoutMs: row.llmTimeoutMs,
    sourceFetchTimeoutMs: row.sourceFetchTimeoutMs,
    activeRunPollMs: row.activeRunPollMs,
  };
}
