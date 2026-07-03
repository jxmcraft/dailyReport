import { htmlToText, extractTitle } from "@/lib/sources";
import { getWorkspaceSettings } from "@/lib/workspace-settings";

export interface ScrapeCheckResult {
  ok: boolean;
  message: string;
  title?: string;
}

/** Probe a webpage so the user knows before saving whether it can be scraped. */
export async function validateScrapeUrl(
  rawUrl: string
): Promise<ScrapeCheckResult> {
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, message: "Enter a full URL starting with http:// or https://" };
  }
  try {
    const { sourceFetchTimeoutMs } = await getWorkspaceSettings();
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsAgent/1.0; +https://localhost)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(sourceFetchTimeoutMs),
    });
    if (!res.ok) {
      return { ok: false, message: `Site returned HTTP ${res.status} — it may block scraping.` };
    }
    const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html")) {
      return {
        ok: false,
        message: `Not an HTML page (${contentType || "unknown"}). Use a link to an article or readable page.`,
      };
    }
    const html = await res.text();
    const text = htmlToText(html);
    if (text.length < 200) {
      return {
        ok: false,
        message:
          "Very little readable text found — this page may be JavaScript-heavy and won't scrape well.",
      };
    }
    return {
      ok: true,
      message: `Looks good — about ${text.length.toLocaleString()} characters of readable text.`,
      title: extractTitle(html) || undefined,
    };
  } catch {
    return { ok: false, message: "Could not fetch the page (timeout, blocked, or invalid URL)." };
  }
}
