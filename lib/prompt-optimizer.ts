import { callOptimizerLLM } from "@/lib/llm";

const OPTIMIZER_SYSTEM = `You are a prompt engineer for NewsAgent, an autonomous news intelligence agent.
Rewrite the user's system prompt so it produces actionable, evidence-grounded reports.

Rules:
- Preserve the user's goal, tone, and scope; do not change topic keywords they imply.
- Add explicit output sections (markdown headings) the model must fill.
- If they ask which stocks to buy/sell/watch, require named tickers with thesis + risk + citation placeholders—not generic strategy essays.
- Require citing numbered evidence [n] and URLs; forbid inventing facts beyond sources.
- Keep under 400 words; use bullet lists where helpful.
- Return ONLY the optimized prompt text—no preamble or markdown code fences.`;

export async function optimizeSystemPrompt(
  rawPrompt: string,
  topicKeywords: string[],
  agentName: string
): Promise<string> {
  const trimmed = rawPrompt.trim();
  if (!trimmed) {
    throw new Error("Enter a system prompt before optimizing.");
  }

  const userMessage = [
    `Agent name: ${agentName}`,
    `Topic keywords: ${topicKeywords.join(", ") || "(none)"}`,
    "",
    "Current system prompt:",
    trimmed,
  ].join("\n");

  const optimized = await callOptimizerLLM(OPTIMIZER_SYSTEM, userMessage);
  const cleaned = optimized.replace(/^```(?:markdown)?\n?/i, "").replace(/\n?```$/i, "").trim();
  if (!cleaned) {
    throw new Error("Optimizer returned an empty prompt.");
  }
  return cleaned;
}
