// Source fetching layer: every provider is normalized into RankedDocument[] so
// the ranking layer and the LLM see one consistent shape regardless of origin.

import { envSecret } from "@/lib/env";
import {
  DEFAULT_SHALLOW_SCRAPE_MAX_LINKS,
  MAX_SHALLOW_SCRAPE_LINKS,
  SOURCE_FETCH_TIMEOUT_MS,
} from "@/lib/constants";
import { buildNewsSearchQuery } from "@/lib/ranking";
import {
  DEFAULT_MAX_NEWS_AGE_DAYS,
  newsFromDateYmd,
  newsFromIso,
  newsFromUnixSeconds,
} from "@/lib/recency";
import { assertUrlIsSafeForScrape } from "@/lib/url-safety";

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
  retriedWithBroaderQuery?: boolean;
  checkedAt: string;
}

export type ProviderType =
  | "NEWS_API"
  | "GNEWS"
  | "CURRENTS"
  | "MARKETAUX"
  | "GUARDIAN"
  | "MEDIASTACK"
  | "GOOGLE_SEARCH"
  | "REDDIT"
  | "HACKER_NEWS"
  | "WEB"
  | "WEB_SHALLOW";

export interface BuiltInProviderSettings {
  enableNewsApi: boolean;
  enableReddit: boolean;
  enableHackerNews: boolean;
  enableGoogleSearch: boolean;
}

export interface ProviderSpec {
  id: string;
  sourceType: ProviderType;
  endpoint: string;
  shallowMaxLinks?: number;
}

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

function withQueryParam(endpoint: string, key: string, value: string): string {
  const url = new URL(endpoint);
  if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  return url.toString();
}

// Reddit listing pages need a .json suffix for the public API.
function normalizeRedditJsonUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.pathname.endsWith(".json")) {
      u.pathname = u.pathname.replace(/\/?$/, "/") + ".json";
    }
    return u.toString();
  } catch {
    return url;
  }
}

function extractTickerSymbols(keywords: string[]): string {
  return keywords
    .map((k) => k.trim())
    .filter((k) => /^[A-Z]{1,5}$/.test(k))
    .join(",");
}

// Retry transient failures (429, 5xx, network). Return 4xx immediately (no retry).
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

function normalizeUrlForCompare(url: string): string {
  return url.replace(/\/+$/, "");
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

function defaultHtmlHeaders(): Record<string, string> {
  return {
    "User-Agent": "Mozilla/5.0 (compatible; NewsAgent/1.0; +https://localhost)",
    Accept: "text/html,application/xhtml+xml",
  };
}

function extractChildLinks(listingUrl: string, html: string, maxLinks: number): string[] {
  const base = assertUrlIsSafeForScrape(listingUrl);
  const seen = new Set<string>();
  const out: string[] = [];
  const matches = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi));
  for (const match of matches) {
    const href = match[1]?.trim();
    if (!href) continue;
    let child: URL;
    try {
      child = new URL(href, base);
    } catch {
      continue;
    }
    if (child.protocol !== "http:" && child.protocol !== "https:") continue;
    if (child.host !== base.host) continue;
    const normalized = normalizeUrlForCompare(child.toString());
    if (normalized === normalizeUrlForCompare(base.toString())) continue;
    if (seen.has(normalized)) continue;
    try {
      assertUrlIsSafeForScrape(normalized);
    } catch {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= maxLinks) break;
  }
  return out;
}

async function fetchHtmlDocument(
  url: string,
  fetchTimeoutMs: number
): Promise<{ bodyText: string; httpStatus: number; contentType: string }> {
  assertUrlIsSafeForScrape(url);
  const response = await fetchWithRetry(url, {
    headers: defaultHtmlHeaders(),
    signal: AbortSignal.timeout(fetchTimeoutMs),
  });
  const httpStatus = response.status;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!response.ok) {
    throw new Error(`HTTP ${httpStatus}`);
  }
  const bodyText = await response.text();
  if (!contentType.includes("text/html")) {
    throw new Error(`Not an HTML page (${contentType || "unknown"})`);
  }
  return { bodyText, httpStatus, contentType };
}

function documentFromHtml(url: string, html: string): RankedDocument | null {
  const text = htmlToText(html);
  if (text.length < 200) return null;
  const title = extractTitle(html) || safeHost(url);
  const desc = extractMetaDescription(html);
  return {
    title,
    url,
    text: `${title} ${desc} ${text}`.slice(0, WEB_TEXT_LIMIT).trim(),
    source: `Web (${safeHost(url)})`,
    publishedAt: null,
  };
}

// --- Provider construction ---------------------------------------------------

// Built-in sources run automatically from the agent's keywords. No per-agent API
// configuration is needed; keys come from the environment.
export function buildDefaultProviders(
  keywords: string[],
  enabled: BuiltInProviderSettings,
  maxAgeDays: number = DEFAULT_MAX_NEWS_AGE_DAYS
): ProviderSpec[] {
  const q = buildNewsSearchQuery(keywords);
  const fromYmd = newsFromDateYmd(maxAgeDays);
  const fromIso = enc(newsFromIso(maxAgeDays));
  const fromUnix = newsFromUnixSeconds(maxAgeDays);
  const specs: ProviderSpec[] = [];

  if (enabled.enableNewsApi && envSecret("NEWS_API_KEY")) {
    specs.push({
      id: "builtin-newsapi",
      sourceType: "NEWS_API",
      endpoint: `https://newsapi.org/v2/everything?q=${enc(q)}&language=en&sortBy=publishedAt&from=${fromYmd}&pageSize=20`,
    });
  }
  if (envSecret("GNEWS_API_KEY")) {
    specs.push({
      id: "builtin-gnews",
      sourceType: "GNEWS",
      endpoint: `https://gnews.io/api/v4/search?q=${enc(q)}&lang=en&max=20&from=${fromIso}&sortby=publishedAt`,
    });
  }
  if (envSecret("CURRENTS_API_KEY")) {
    specs.push({
      id: "builtin-currents",
      sourceType: "CURRENTS",
      endpoint: `https://api.currentsapi.services/v1/search?keywords=${enc(q)}&language=en&start_date=${fromYmd}`,
    });
  }
  if (envSecret("MARKETAUX_API_KEY")) {
    const tickers = extractTickerSymbols(keywords);
    let endpoint = `https://api.marketaux.com/v1/news/all?search=${enc(q)}&language=en&limit=20&published_after=${fromYmd}`;
    if (tickers) {
      endpoint += `&symbols=${enc(tickers)}&filter_entities=true`;
    }
    specs.push({
      id: "builtin-marketaux",
      sourceType: "MARKETAUX",
      endpoint,
    });
  }
  if (envSecret("GUARDIAN_API_KEY")) {
    specs.push({
      id: "builtin-guardian",
      sourceType: "GUARDIAN",
      endpoint: `https://content.guardianapis.com/search?q=${enc(q)}&from-date=${fromYmd}&order-by=newest&show-fields=trailText,headline&page-size=20`,
    });
  }
  if (envSecret("MEDIASTACK_API_KEY")) {
    specs.push({
      id: "builtin-mediastack",
      sourceType: "MEDIASTACK",
      endpoint: `https://api.mediastack.com/v1/news?keywords=${enc(q)}&languages=en&limit=20`,
    });
  }
  if (enabled.enableReddit) {
    specs.push({
      id: "builtin-reddit",
      sourceType: "REDDIT",
      endpoint: `https://www.reddit.com/search.json?q=${enc(q)}&sort=new&t=week&limit=15`,
    });
  }
  if (enabled.enableHackerNews) {
    specs.push({
      id: "builtin-hackernews",
      sourceType: "HACKER_NEWS",
      endpoint: `https://hn.algolia.com/api/v1/search?query=${enc(q)}&tags=story&hitsPerPage=20&numericFilters=created_at_i>${fromUnix}`,
    });
  }
  const googleCx = envSecret("GOOGLE_SEARCH_CX");
  if (enabled.enableGoogleSearch && googleCx && envSecret("GOOGLE_SEARCH_API_KEY")) {
    const cx = googleCx;
    specs.push({
      id: "builtin-google",
      sourceType: "GOOGLE_SEARCH",
      endpoint: `https://www.googleapis.com/customsearch/v1?q=${enc(q)}&cx=${enc(cx)}&num=10&dateRestrict=d${maxAgeDays}`,
    });
  }
  return specs;
}

// A user-added source is just a webpage URL. Reddit links use the JSON API;
// everything else is scraped as generic HTML.
export function buildWebProvider(url: string, id: string): ProviderSpec {
  return buildWebProviderWithExpansion(url, id, 0);
}

export function buildWebProviderWithExpansion(
  url: string,
  id: string,
  shallowMaxLinks: number = 0
): ProviderSpec {
  if (safeHost(url).includes("reddit.com")) {
    return {
      id,
      sourceType: "REDDIT",
      endpoint: normalizeRedditJsonUrl(url),
    };
  }
  const cappedLinks = Math.min(
    MAX_SHALLOW_SCRAPE_LINKS,
    Math.max(0, Math.round(shallowMaxLinks || 0))
  );
  return {
    id,
    sourceType: cappedLinks > 0 ? "WEB_SHALLOW" : "WEB",
    endpoint: url,
    shallowMaxLinks: cappedLinks || undefined,
  };
}

// --- Request building + parsing ----------------------------------------------

function buildRequest(spec: ProviderSpec): {
  url: string;
  headers: Record<string, string>;
  expectHtml: boolean;
} {
  const reddit = () => {
    const redditUser = envSecret("REDDIT_USER") ?? "anonymous";
    return {
      url: normalizeRedditJsonUrl(spec.endpoint),
      headers: {
        "User-Agent": `web:newsagent:1.0 (by /u/${redditUser})`,
        Accept: "application/json",
      },
      expectHtml: false,
    };
  };

  const jsonUrl = { headers: {} as Record<string, string>, expectHtml: false };

  switch (spec.sourceType) {
    case "REDDIT":
      return reddit();
    case "NEWS_API":
      return {
        url: spec.endpoint,
        headers: { "X-Api-Key": envSecret("NEWS_API_KEY") ?? "" },
        expectHtml: false,
      };
    case "GNEWS": {
      const key = envSecret("GNEWS_API_KEY") ?? "";
      return {
        url: key ? withQueryParam(spec.endpoint, "apikey", key) : spec.endpoint,
        ...jsonUrl,
      };
    }
    case "CURRENTS": {
      const key = envSecret("CURRENTS_API_KEY") ?? "";
      return {
        url: key ? withQueryParam(spec.endpoint, "apiKey", key) : spec.endpoint,
        ...jsonUrl,
      };
    }
    case "MARKETAUX": {
      const key = envSecret("MARKETAUX_API_KEY") ?? "";
      return {
        url: key ? withQueryParam(spec.endpoint, "api_token", key) : spec.endpoint,
        ...jsonUrl,
      };
    }
    case "GUARDIAN": {
      const key = envSecret("GUARDIAN_API_KEY") ?? "";
      return {
        url: key ? withQueryParam(spec.endpoint, "api-key", key) : spec.endpoint,
        ...jsonUrl,
      };
    }
    case "MEDIASTACK": {
      const key = envSecret("MEDIASTACK_API_KEY") ?? "";
      return {
        url: key ? withQueryParam(spec.endpoint, "access_key", key) : spec.endpoint,
        ...jsonUrl,
      };
    }
    case "GOOGLE_SEARCH": {
      const url = new URL(spec.endpoint);
      const key = envSecret("GOOGLE_SEARCH_API_KEY") ?? "";
      if (key && !url.searchParams.has("key")) url.searchParams.set("key", key);
      return { url: url.toString(), headers: {}, expectHtml: false };
    }
    case "HACKER_NEWS":
      return { url: spec.endpoint, headers: {}, expectHtml: false };
    case "WEB":
    case "WEB_SHALLOW":
      return {
        url: spec.endpoint,
        headers: defaultHtmlHeaders(),
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
interface MarketAuxEntity {
  name?: string;
  symbol?: string;
}

function checkApiPayload(
  spec: ProviderSpec,
  data: unknown
): string | null {
  switch (spec.sourceType) {
    case "NEWS_API": {
      const payload = data as { status?: string; code?: string; message?: string };
      if (payload.status && payload.status !== "ok") {
        return `NewsAPI status=${payload.status} (${payload.code ?? "n/a"}: ${payload.message ?? ""})`;
      }
      return null;
    }
    case "GOOGLE_SEARCH": {
      const payload = data as { error?: { message?: string } };
      if (payload.error) {
        return `Google API error: ${payload.error.message ?? "unknown"}`;
      }
      return null;
    }
    case "CURRENTS": {
      const payload = data as { status?: string; message?: string };
      if (payload.status && payload.status !== "ok") {
        return `Currents status=${payload.status}: ${payload.message ?? ""}`;
      }
      return null;
    }
    case "GNEWS": {
      const payload = data as {
        errors?: string[];
        message?: string;
      };
      if (payload.errors?.length) {
        return `GNews: ${payload.errors.join("; ")}`;
      }
      if (payload.message) return `GNews: ${payload.message}`;
      return null;
    }
    case "GUARDIAN": {
      const payload = data as {
        response?: { status?: string; message?: string };
      };
      const status = payload.response?.status;
      if (status && status !== "ok") {
        return `Guardian status=${status}: ${payload.response?.message ?? ""}`;
      }
      return null;
    }
    case "MEDIASTACK": {
      const payload = data as {
        error?: { code?: string; message?: string };
      };
      if (payload.error) {
        return `Mediastack: ${payload.error.message ?? payload.error.code ?? "error"}`;
      }
      return null;
    }
    case "MARKETAUX": {
      const payload = data as { error?: { message?: string } };
      if (payload.error?.message) {
        return `MarketAux: ${payload.error.message}`;
      }
      return null;
    }
    default:
      return null;
  }
}

function parsePayload(spec: ProviderSpec, data: unknown): RankedDocument[] {
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
    case "GNEWS": {
      const articles = (data as { articles?: NewsArticle[] }).articles ?? [];
      return articles.slice(0, MAX_ITEMS_PER_SOURCE).map((a) => ({
        title: a.title ?? "Article",
        url: a.url ?? spec.endpoint,
        text: `${a.title ?? ""} ${clip(a.description || a.content, 1000)}`.trim(),
        source: "GNews",
        publishedAt: a.publishedAt ?? null,
      }));
    }
    case "CURRENTS": {
      const items =
        (data as {
          news?: (NewsArticle & { published?: string })[];
        }).news ?? [];
      return items.slice(0, MAX_ITEMS_PER_SOURCE).map((a) => {
        const item = a;
        return {
          title: item.title ?? "Article",
          url: item.url ?? spec.endpoint,
          text: `${item.title ?? ""} ${clip(item.description, 1000)}`.trim(),
          source: "Currents",
          publishedAt: item.publishedAt ?? item.published ?? null,
        };
      });
    }
    case "MARKETAUX": {
      const items = (data as { data?: NewsArticle[] }).data ?? [];
      return items.slice(0, MAX_ITEMS_PER_SOURCE).map((a) => {
        const row = a as NewsArticle & {
          published_at?: string;
          entities?: MarketAuxEntity[];
        };
        const entities = (row.entities ?? [])
          .map((e) => e.name ?? e.symbol)
          .filter(Boolean)
          .join(" ");
        return {
          title: row.title ?? "Article",
          url: row.url ?? spec.endpoint,
          text: `${row.title ?? ""} ${clip(row.description, 1000)} ${entities}`.trim(),
          source: "MarketAux",
          publishedAt: row.publishedAt ?? row.published_at ?? null,
        };
      });
    }
    case "GUARDIAN": {
      const results =
        (data as {
          response?: {
            results?: {
              webTitle?: string;
              webUrl?: string;
              webPublicationDate?: string;
              fields?: { trailText?: string };
            }[];
          };
        }).response?.results ?? [];
      return results.slice(0, MAX_ITEMS_PER_SOURCE).map((r) => ({
        title: r.webTitle ?? "Article",
        url: r.webUrl ?? spec.endpoint,
        text: `${r.webTitle ?? ""} ${clip(r.fields?.trailText, 1000)}`.trim(),
        source: "The Guardian",
        publishedAt: r.webPublicationDate ?? null,
      }));
    }
    case "MEDIASTACK": {
      const articles = (data as { data?: NewsArticle[] }).data ?? [];
      return articles.slice(0, MAX_ITEMS_PER_SOURCE).map((a) => {
        const row = a as NewsArticle & { published_at?: string };
        return {
          title: row.title ?? "Article",
          url: row.url ?? spec.endpoint,
          text: `${row.title ?? ""} ${clip(row.description, 1000)}`.trim(),
          source: "Mediastack",
          publishedAt: row.publishedAt ?? row.published_at ?? null,
        };
      });
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
    case "WEB_SHALLOW":
      return [];
  }
  return [];
}

export async function ingestProvider(
  spec: ProviderSpec,
  fetchTimeoutMs: number = SOURCE_FETCH_TIMEOUT_MS
): Promise<{
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
      signal: AbortSignal.timeout(fetchTimeoutMs),
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
      assertUrlIsSafeForScrape(spec.endpoint);
      if (!contentType.includes("text/html")) {
        return fail(`Not an HTML page (${contentType || "unknown"})`, {
          httpStatus,
          contentType,
        });
      }
      const listingDoc = documentFromHtml(spec.endpoint, bodyText);
      if (!listingDoc) {
        return fail("Too little readable text (page may be JS-heavy)", {
          httpStatus,
          contentType,
        });
      }
      let docs: RankedDocument[] = [listingDoc];
      if (spec.sourceType === "WEB_SHALLOW") {
        const childLinks = extractChildLinks(
          spec.endpoint,
          bodyText,
          spec.shallowMaxLinks ?? DEFAULT_SHALLOW_SCRAPE_MAX_LINKS
        );
        const childDocs: RankedDocument[] = [];
        for (const childUrl of childLinks) {
          try {
            const child = await fetchHtmlDocument(childUrl, fetchTimeoutMs);
            const childDoc = documentFromHtml(childUrl, child.bodyText);
            if (childDoc) childDocs.push(childDoc);
          } catch {
            // Ignore bad child links; the main listing page still counts as evidence.
          }
        }
        if (childDocs.length > 0) {
          docs = childDocs;
        }
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

    const apiError = checkApiPayload(spec, data);
    if (apiError) {
      return fail(apiError, { httpStatus, contentType });
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
