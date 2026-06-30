import { envSecret } from "@/lib/env";
import { isMicrosoftGraphConfigured } from "@/lib/microsoft-graph";
import {
  sendEmaileeViaGraph,
  sendReviewerViaGraph,
} from "@/lib/email-graph";
import {
  sendEmaileeViaSmtp,
  sendReviewerViaSmtp,
} from "@/lib/email-smtp";

export type EmailProvider = "smtp" | "graph";

export function resolveEmailProvider(): EmailProvider {
  const raw = envSecret("EMAIL_PROVIDER")?.toLowerCase();
  if (raw === "graph" && isMicrosoftGraphConfigured()) return "graph";
  return "smtp";
}

export async function sendEmaileeEmail(opts: {
  to: string[];
  markdown: string;
  agentName: string;
}): Promise<void> {
  if (resolveEmailProvider() === "graph") {
    await sendEmaileeViaGraph(opts);
    return;
  }
  await sendEmaileeViaSmtp(opts);
}

export async function sendReviewerEmail(opts: {
  to: string[];
  agentName: string;
  markdown: string;
  approveUrl: string;
  emaileeCount: number;
}): Promise<void> {
  if (resolveEmailProvider() === "graph") {
    await sendReviewerViaGraph(opts);
    return;
  }
  await sendReviewerViaSmtp(opts);
}
