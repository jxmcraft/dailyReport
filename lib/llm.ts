import { getWorkspaceSettings } from "@/lib/workspace-settings";
import { envSecret } from "@/lib/env";

const DEFAULT_OPENROUTER_MODEL = "poolside/laguna-m.1:free";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export type LlmProvider = "openrouter" | "deepseek";

function resolveProvider(): LlmProvider {
  const raw = envSecret("LLM_PROVIDER")?.toLowerCase();
  if (raw === "deepseek") return "deepseek";
  return "openrouter";
}

function openRouterModel(forOptimizer: boolean): string {
  if (forOptimizer) {
    return (
      envSecret("OPENROUTER_OPTIMIZER_MODEL") ??
      envSecret("OPENROUTER_MODEL") ??
      DEFAULT_OPENROUTER_MODEL
    );
  }
  return envSecret("OPENROUTER_MODEL") ?? DEFAULT_OPENROUTER_MODEL;
}

function deepSeekModel(): string {
  return envSecret("DEEPSEEK_MODEL") ?? DEFAULT_DEEPSEEK_MODEL;
}

function deepSeekBaseUrl(): string {
  const base = envSecret("DEEPSEEK_BASE_URL") ?? DEFAULT_DEEPSEEK_BASE_URL;
  return base.replace(/\/$/, "");
}

export async function getLlmDisplayInfo(): Promise<{
  provider: LlmProvider;
  reportModel: string;
  optimizerModel: string;
  llmTimeoutSec: number;
  sourceFetchTimeoutSec: number;
}> {
  const settings = await getWorkspaceSettings();
  const provider = resolveProvider();
  if (provider === "deepseek") {
    const model = deepSeekModel();
    return {
      provider,
      reportModel: model,
      optimizerModel: model,
      llmTimeoutSec: settings.llmTimeoutMs / 1000,
      sourceFetchTimeoutSec: settings.sourceFetchTimeoutMs / 1000,
    };
  }
  return {
    provider,
    reportModel: openRouterModel(false),
    optimizerModel: openRouterModel(true),
    llmTimeoutSec: settings.llmTimeoutMs / 1000,
    sourceFetchTimeoutSec: settings.sourceFetchTimeoutMs / 1000,
  };
}

async function chatCompletion(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userContent: string;
  errorPrefix: string;
  timeoutMs: number;
}): Promise<string> {
  const url = opts.baseUrl.includes("/chat/completions")
    ? opts.baseUrl
    : `${opts.baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://localhost:3000",
      "X-Title": "NewsAgent Dashboard",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userContent },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs),
  });

  const bodyText = await response.text();

  if (!response.ok) {
    let errorData: unknown = bodyText;
    try {
      errorData = JSON.parse(bodyText);
    } catch {
      // Keep raw text if response is not JSON.
    }
    throw new Error(`${opts.errorPrefix}: ${JSON.stringify(errorData)}`);
  }

  let result: { choices?: Array<{ message?: { content?: string } }> };
  try {
    result = JSON.parse(bodyText);
  } catch {
    throw new Error(`${opts.errorPrefix}: non-JSON success response.`);
  }
  return result.choices?.[0]?.message?.content || "No report body compiled.";
}

function reportUserMessage(accumulatedContext: string): string {
  return `Using ONLY the evidence below, produce the report requested in the system prompt. Follow every required section and output format.\n\n${accumulatedContext}`;
}

async function callLlm(
  systemPrompt: string,
  accumulatedContext: string,
  forOptimizer: boolean
): Promise<string> {
  const settings = await getWorkspaceSettings();
  const provider = resolveProvider();
  const userContent = forOptimizer
    ? accumulatedContext
    : reportUserMessage(accumulatedContext);

  if (provider === "deepseek") {
    const apiKey = envSecret("DEEPSEEK_API_KEY");
    if (!apiKey) {
      throw new Error("Missing DEEPSEEK_API_KEY environment variable.");
    }
    return chatCompletion({
      baseUrl: deepSeekBaseUrl(),
      apiKey,
      model: deepSeekModel(),
      systemPrompt,
      userContent,
      errorPrefix: "DeepSeek API Failure",
      timeoutMs: settings.llmTimeoutMs,
    });
  }

  const apiKey = envSecret("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable.");
  }
  return chatCompletion({
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    apiKey,
    model: openRouterModel(forOptimizer),
    systemPrompt,
    userContent,
    errorPrefix: "OpenRouter API Failure",
    timeoutMs: settings.llmTimeoutMs,
  });
}

export async function callReportLLM(
  systemPrompt: string,
  accumulatedContext: string
): Promise<string> {
  return callLlm(systemPrompt, accumulatedContext, false);
}

export async function callOptimizerLLM(
  systemPrompt: string,
  accumulatedContext: string
): Promise<string> {
  return callLlm(systemPrompt, accumulatedContext, true);
}

/** @deprecated Use callReportLLM */
export async function callOpenRouterLLM(
  systemPrompt: string,
  accumulatedContext: string
): Promise<string> {
  return callReportLLM(systemPrompt, accumulatedContext);
}
