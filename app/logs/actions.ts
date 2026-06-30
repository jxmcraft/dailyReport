"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function clearAllReports() {
  const running = await prisma.agent.count({ where: { status: "RUNNING" } });
  if (running > 0) {
    throw new Error(
      "Cannot clear logs while a pipeline run is in progress. Wait for it to finish."
    );
  }

  await prisma.intelligenceReport.deleteMany();
  revalidatePath("/logs");
  revalidatePath("/reports");
  revalidatePath("/");
}

export async function deleteReport(reportId: string) {
  const report = await prisma.intelligenceReport.findUnique({
    where: { id: reportId },
    select: { id: true, agentId: true, agent: { select: { status: true } } },
  });
  if (!report) throw new Error("Report not found.");
  if (report.agent.status === "RUNNING") {
    throw new Error(
      "Cannot delete a report while a pipeline run is in progress."
    );
  }

  await prisma.intelligenceReport.delete({ where: { id: reportId } });
  revalidatePath(`/agents/${report.agentId}`);
  revalidatePath("/logs");
  revalidatePath("/reports");
  revalidatePath("/");
}
