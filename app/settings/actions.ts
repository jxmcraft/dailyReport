"use server";

import { revalidatePath } from "next/cache";

import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
  type WorkspaceSettingsView,
} from "@/lib/workspace-settings";

export async function loadWorkspaceSettings(): Promise<WorkspaceSettingsView> {
  return getWorkspaceSettings();
}

export async function saveWorkspaceSettings(
  data: Partial<WorkspaceSettingsView>
): Promise<WorkspaceSettingsView> {
  const saved = await updateWorkspaceSettings(data);
  revalidatePath("/settings");
  return saved;
}
