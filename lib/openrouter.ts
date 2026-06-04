import { EXECUTION_TIMEOUT_MS } from "@/lib/constants";
const TARGET_MODEL = "poolside/laguna-m.1:free";

export async function callOpenRouterLLM(
  systemPrompt: string,
  accumulatedContext: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY environment variable.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://localhost:3000",
      "X-Title": "PulseAgent Dashboard",
    },
    body: JSON.stringify({
      model: TARGET_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Using ONLY the evidence below, produce the report requested in the system prompt. Follow every required section and output format.\n\n${accumulatedContext}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(EXECUTION_TIMEOUT_MS),
  });

  const bodyText = await response.text();

  if (!response.ok) {
    let errorData: unknown = bodyText;
    try {
      errorData = JSON.parse(bodyText);
    } catch {
      // Keep raw text if response is not JSON.
    }
    throw new Error(`OpenRouter API Failure: ${JSON.stringify(errorData)}`);
  }

  let result: {
    choices?: Array<{
      message?: { content?: string };
    }>;
  };
  try {
    result = JSON.parse(bodyText);
  } catch {
    throw new Error("OpenRouter returned a non-JSON success response.");
  }
  return result.choices?.[0]?.message?.content || "No report body compiled.";
}
