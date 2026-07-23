/**
 * Resolve an OpenAI-compatible chat completions URL from a DeepSeek-style base.
 *
 * - Full chat URL (contains `/chat/completions`) → used as-is
 * - Ends with `/v1` → append `/chat/completions`
 * - Otherwise (API root) → append `/v1/chat/completions`
 */
export function resolveChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new Error("Base URL is empty.");
  }
  if (trimmed.includes("/chat/completions")) {
    return trimmed;
  }
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/chat/completions`;
  }
  return `${trimmed}/v1/chat/completions`;
}
