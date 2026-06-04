/** Extra synthesis guardrails derived from what the user asked for in their prompt. */
export function buildOutputGuardrails(systemPrompt: string): string[] {
  const p = systemPrompt.toLowerCase();
  const lines: string[] = [
    "Answer the user's exact question from the system prompt first; do not replace it with generic advice.",
    "Structure the report with clear markdown headings that mirror the requested deliverables.",
  ];

  if (
    /\b(which|what)\s+stocks?\b/.test(p) ||
    /\bstocks?\s+to\s+buy\b/.test(p) ||
    /\bbuy\s+list\b/.test(p) ||
    /\bpick(s)?\b.*\bstock/.test(p) ||
    /\brecommend(ed|ation)?s?\b.*\b(stock|ticker|equit)/.test(p)
  ) {
    lines.push(
      'Include a "## Stock recommendations" section listing specific tickers or "None — insufficient evidence" if sources do not support picks.',
      "For each named ticker: 1-line thesis, key risk, and cite evidence [n]. Do not invent tickers not supported by sources.",
      "Do not output generic investing strategies, portfolio theory, or educational content instead of concrete buy/sell/watch calls."
    );
  }

  if (/\bsell\b|\bshort\b|\bavoid\b/.test(p)) {
    lines.push(
      'If the prompt asks what to sell or avoid, include a "## Stocks to avoid or trim" section with tickers and cited reasons.'
    );
  }

  if (/\bprice target\b|\bvaluation\b|\bfair value\b/.test(p)) {
    lines.push(
      "Only state price targets or valuations when a cited source provides them; otherwise say they are not in the evidence."
    );
  }

  return lines;
}
