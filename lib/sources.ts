// Source fetching layer: every provider is normalized into RankedDocument[] so
// the ranking layer and the LLM see one consistent shape regardless of origin.

export interface RankedDocument {
  title: string;
  url: string;
  text: string;
  source: string;
  publishedAt: string | null;
  score?: number;
}

export interface SourceDiagnostic {
  sourceId: string;
  sourceType: string;
  endpoint: string;
  status: "ok" | "error";
  httpStatus?: number;
  contentType?: string;
  itemsIngested: number;
  errorReason?: string;
  checkedAt: string;
}

export type ProviderType =
  | "NEWS_API"
  | "GOOGLE_SEARCH"
  | "REDDIT"
  | "HACKER_NEWS"
  | "WEB";

export interface ProviderSpec {
  id: string;
  sourceType: ProviderType;
  endpoint: string;
}

const FETCH_TIMEOUT_MS = 30000;
const MAX_ITEMS_PER_SOURCE = 15;
const WEB_TEXT_LIMIT = 5000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function enc(s: string): string {
  return encodeURIComponent(s);
}

// Retry transient failures (network errors, 429, 5xx). 4xx are returned as-is.
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || (response.status < 500 && response.status !== 429)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts - 1) await sleep(2 ** attempt * 1000);
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(s: string): string {
  return s.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ");
}

// Strip a raw HTML document down to readable text. Intentionally dependency-free:
// removes scripts/styles/comments, drops tags, decodes common entities.
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(stripped).replace(/\s+/g, " ").trim();
}

export function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim() : "";
}

function extractMetaDescription(html: string): string {
  const m = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  );
  return m ? decodeEntities(m[1]).trim() : "";
}

function clip(s: unknown, n: number): string {
  return String(s ?? "").slice(0, n);
}

// --- Provider construction ---------------------------------------------------

// Built-in sources run automatically from the agent's keywords. No per-agent API
// configuration is needed; keys come from the environment.
export function buildDefaultProviders(keywords: string[]): ProviderSpec[] {
  const q = keywords.join(" ").trim() || "technology";
  const booleanQ = keywords.length > 1 ? keywords.join(" OR ") : q;
  const specs: ProviderSpec[] = [];

  if (process.env.NEWS_API_KEY) {
    specs.push({
      id: "builtin-newsapi",
      sourceType: "NEWS_API",
      endpoint: `https://newsapi.org/v2/everything?q=${enc(booleanQ)}&language=en&sortBy=publishedAt&pageSize=20`,
    });
  }
  specs.push({
    id: "builtin-reddit",
    sourceType: "REDDIT",
    endpoint: `https://www.reddit.com/search.json?q=${enc(q)}&sort=relevance&t=month&limit=15`,
  });
  specs.push({
    id: "builtin-hackernews",
    sourceType: "HACKER_NEWS",
    endpoint: `https://hn.algolia.com/api/v1/search?query=${enc(q)}&tags=story&hitsPerPage=20`,
  });
  if (process.env.GOOGLE_SEARCH_CX && process.env.GOOGLE_SEARCH_API_KEY) {
    const cx = process.env.GOOGLE_SEARCH_CX;
    specs.push({
      id: "builtin-google",
      sourceType: "GOOGLE_SEARCH",
      endpoint: `https://www.googleapis.com/customsearch/v1?q=${enc(q)}&cx=${enc(cx)}&num=10`,
    });
  }
  return specs;
}

// A user-added source is just a webpage URL. Reddit links use the JSON API;
// everything else is scraped as generic HTML.
export function buildWebProvider(url: string, id: string): ProviderSpec {
  if (safeHost(url).includes("reddit.com")) {
    return { id, sourceType: "REDDIT", endpoint: url };
  }
  return { id, sourceType: "WEB", endpoint: url };
}

// --- Request building + parsing ----------------------------------------------

function buildRequest(spec: ProviderSpec): {
  url: string;
  headers: Record<string, string>;
  expectHtml: boolean;
} {
  const reddit = () => {
    const redditUser = process.env.REDDIT_USER ?? "anonymous";
    return {
      url: spec.endpoint,
      // Reddit 403s generic UAs; a UA naming a real account plus an explicit
      // Accept header is what reliably gets the public JSON.
      headers: {
        "User-Agent": `web:pulseagent:1.0 (by /u/${redditUser})`,
        Accept: "application/json",
      },
      expectHtml: false,
    };
  };

  switch (spec.sourceType) {
    case "REDDIT":
      return reddit();
    case "NEWS_API":
      return {
        url: spec.endpoint,
        headers: { "X-Api-Key": process.env.NEWS_API_KEY ?? "" },
        expectHtml: false,
      };
    case "GOOGLE_SEARCH": {
      const url = new URL(spec.endpoint);
      const key = process.env.GOOGLE_SEARCH_API_KEY ?? "";
      if (key && !url.searchParams.has("key")) url.searchParams.set("key", key);
      return { url: url.toString(), headers: {}, expectHtml: false };
    }
    case "HACKER_NEWS":
      return { url: spec.endpoint, headers: {}, expectHtml: false };
    case "WEB":
      return {
        url: spec.endpoint,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; PulseAgent/1.0; +https://localhost)",
          Accept: "text/html,application/xhtml+xml",
        },
        expectHtml: true,
      };
  }
}

interface RedditChild {
  data?: {
    title?: string;
    permalink?: string;
    url?: string;
    selftext?: string;
    subreddit?: string;
    created_utc?: number;
  };
}
interface NewsArticle {
  title?: string;
  url?: string;
  description?: string;
  content?: string;
  publishedAt?: string;
}
interface GoogleItem {
  title?: string;
  link?: string;
  snippet?: string;
}
interface HnHit {
  title?: string;
  url?: string;
  story_text?: string;
  comment_text?: string;
  objectID?: string;
  created_at?: string;
}

function parsePayload(spec: ProviderSpec, data: unknown): RankedDocument[] {
  const now = new Date().toISOString();

  switch (spec.sourceType) {
    case "REDDIT": {
      const posts =
        (data as { data?: { children?: RedditChild[] } }).data?.children ?? [];
      return posts.slice(0, MAX_ITEMS_PER_SOURCE).map((p) => ({
        title: p.data?.title ?? "Reddit post",
        url: p.data?.permalink
          ? `https://www.reddit.com${p.data.permalink}`
          : p.data?.url ?? spec.endpoint,
        text: `${p.data?.title ?? ""} ${clip(p.data?.selftext, 1000)}`.trim(),
        source: `Reddit r/${p.data?.subreddit ?? "all"}`,
        publishedAt: p.data?.created_utc
          ? new Date(p.data.created_utc * 1000).toISOString()
          : null,
      }));
    }
    case "NEWS_API": {
      const articles = (data as { articles?: NewsArticle[] }).articles ?? [];
      return articles.slice(0, MAX_ITEMS_PER_SOURCE).map((a) => ({
        title: a.title ?? "Article",
        url: a.url ?? spec.endpoint,
        text: `${a.title ?? ""} ${clip(a.description || a.content, 1000)}`.trim(),
        source: "NewsAPI",
        publishedAt: a.publishedAt ?? null,
      }));
    }
    case "GOOGLE_SEARCH": {
      const items = (data as { items?: GoogleItem[] }).items ?? [];
      return items.slice(0, MAX_ITEMS_PER_SOURCE).map((i) => ({
        title: i.title ?? "Result",
        url: i.link ?? spec.endpoint,
        text: `${i.title ?? ""} ${clip(i.snippet, 1000)}`.trim(),
        source: "Google",
        publishedAt: null,
      }));
    }
    case "HACKER_NEWS": {
      const hits = (data as { hits?: HnHit[] }).hits ?? [];
      return hits.slice(0, MAX_ITEMS_PER_SOURCE).map((h) => ({
        title: h.title ?? "Hacker News story",
        url:
          h.url ?? `https://news.ycombinator.com/item?id=${h.objectID ?? ""}`,
        text: `${h.title ?? ""} ${clip(h.story_text || h.comment_text, 1000)}`.trim(),
        source: "Hacker News",
        publishedAt: h.created_at ?? null,
      }));
    }
    case "WEB":
      return []; // WEB is parsed from HTML text, handled in ingestProvider.
  }
  return [];
}

export async function ingestProvider(spec: ProviderSpec): Promise<{
  docs: RankedDocument[];
  diagnostic: SourceDiagnostic;
}> {
  const base = {
    sourceId: spec.id,
    sourceType: spec.sourceType,
    endpoint: spec.endpoint,
    checkedAt: new Date().toISOString(),
  };
  const fail = (errorReason: string, extra?: Partial<SourceDiagnostic>) => ({
    docs: [] as RankedDocument[],
    diagnostic: {
      ...base,
      status: "error" as const,
      itemsIngested: 0,
      errorReason,
      ...extra,
    },
  });

  try {
    const { url, headers, expectHtml } = buildRequest(spec);
    const response = await fetchWithRetry(url, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const httpStatus = response.status;
    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? "";

    if (!response.ok) {
      console.warn(`Source ${spec.sourceType} (${spec.id}) returned HTTP ${httpStatus}.`);
      return fail(`HTTP ${httpStatus}`, { httpStatus, contentType });
    }

    const bodyText = await response.text();

    if (expectHtml) {
      if (!contentType.includes("text/html")) {
        return fail(`Not an HTML page (${contentType || "unknown"})`, {
          httpStatus,
          contentType,
        });
      }
      const text = htmlToText(bodyText);
      if (text.length < 200) {
        return fail("Too little readable text (page may be JS-heavy)", {
          httpStatus,
          contentType,
        });
      }
      const title = extractTitle(bodyText) || safeHost(spec.endpoint);
      const desc = extractMetaDescription(bodyText);
      const doc: RankedDocument = {
        title,
        url: spec.endpoint,
        text: `${title} ${desc} ${text}`.slice(0, WEB_TEXT_LIMIT).trim(),
        source: `Web (${safeHost(spec.endpoint)})`,
        publishedAt: null,
      };
      return {
        docs: [doc],
        diagnostic: { ...base, status: "ok", httpStatus, contentType, itemsIngested: 1 },
      };
    }

    if (!contentType.includes("application/json")) {
      return fail(`Non-JSON response (${contentType || "unknown"})`, {
        httpStatus,
        contentType,
      });
    }

    let data: unknown;
    try {
      data = JSON.parse(bodyText);
    } catch {
      return fail("Invalid JSON payload", { httpStatus, contentType });
    }

    if (spec.sourceType === "NEWS_API") {
      const payload = data as { status?: string; code?: string; message?: string };
      if (payload.status && payload.status !== "ok") {
        return fail(
          `NewsAPI status=${payload.status} (${payload.code ?? "n/a"}: ${payload.message ?? ""})`,
          { httpStatus, contentType }
        );
      }
    }
    if (spec.sourceType === "GOOGLE_SEARCH") {
      const payload = data as { error?: { message?: string } };
      if (payload.error) {
        return fail(`Google API error: ${payload.error.message ?? "unknown"}`, {
          httpStatus,
          contentType,
        });
      }
    }

    const docs = parsePayload(spec, data);
    if (docs.length === 0) {
      return fail("Zero results returned", { httpStatus, contentType });
    }

    return {
      docs,
      diagnostic: {
        ...base,
        status: "ok",
        httpStatus,
        contentType,
        itemsIngested: docs.length,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`Ingestion failed for ${spec.sourceType} (${spec.id}):`, msg);
    return fail(msg);
  }
}
