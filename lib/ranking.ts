import type { RankedDocument } from "@/lib/sources";
import { parsePublishedMs } from "@/lib/recency";

export interface RankResult {
  ranked: RankedDocument[];
  lowConfidence: boolean;
  /** Documents that cleared the relevance gate (before top-k slice). */
  relevantCount: number;
}

export type KeywordMatchMode = "OR" | "AND";

export interface RankOptions {
  /** Minimum relevance score for a document to pass (1–10). */
  minScore?: number;
  /** OR: any keyword match can qualify. AND: multiple keyword hits required. */
  matchMode?: KeywordMatchMode;
}

export const DEFAULT_RELEVANCE_MIN_SCORE = 3;
export const MIN_RELEVANCE_SCORE = 1;
export const MAX_RELEVANCE_SCORE = 10;

const RECENCY_HALF_LIFE_DAYS = 7;

// Short or ambiguous tokens (e.g. stock ticker "BB") must not pass alone on very low scores.
const WEAK_TICKER = new Set(["bb"]);

function norm(s: string): string {
  return s.toLowerCase();
}

function isWeakKeyword(kw: string): boolean {
  const k = norm(kw);
  if (WEAK_TICKER.has(k)) return true;
  if (k.length <= 2) return true;
  return false;
}

function isPrimaryKeyword(kw: string): boolean {
  return !isWeakKeyword(kw);
}

// Word-boundary match for short tokens to reduce false positives (e.g. "bb" in unrelated words).
function matchesToken(hay: string, token: string): boolean {
  const t = norm(token);
  if (!t) return false;
  if (t.length <= 3) {
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return re.test(hay);
  }
  const concat = t.replace(/\s+/g, "");
  return hay.includes(t) || (concat !== t && hay.includes(concat));
}

interface KeywordMatch {
  score: number;
  matched: number;
  primaryMatched: number;
  weakOnly: boolean;
}

function scoreDocument(
  title: string,
  hay: string,
  keywords: string[],
  publishedAt: string | null,
  now: number
): KeywordMatch {
  const titleNorm = norm(title);
  let score = 0;
  let matched = 0;
  let primaryMatched = 0;

  for (const kw of keywords) {
    const primary = isPrimaryKeyword(kw);
    const inTitle = matchesToken(titleNorm, kw);
    const inText = matchesToken(hay, kw);

    if (inTitle) {
      score += primary ? 4 : 1;
      matched++;
      if (primary) primaryMatched++;
    } else if (inText) {
      score += primary ? 2 : 1;
      matched++;
      if (primary) primaryMatched++;
    }
  }

  if (matched > 1) score += matched;
  if (primaryMatched > 1) score += 2;

  if (publishedAt) {
    const ageDays = (now - Date.parse(publishedAt)) / 86_400_000;
    if (!Number.isNaN(ageDays) && ageDays >= 0) {
      score += 2 * Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
    }
  }

  return {
    score,
    matched,
    primaryMatched,
    weakOnly: matched > 0 && primaryMatched === 0,
  };
}

function isRelevant(
  match: KeywordMatch,
  minScore: number,
  mode: KeywordMatchMode,
  keywordCount: number
): boolean {
  if (match.matched === 0) return false;

  // Weak-only hits (e.g. lone "BB") need a higher bar even in OR mode.
  if (match.weakOnly && match.score < minScore + 1) return false;

  if (mode === "OR") {
    return match.score >= minScore;
  }

  // AND: require multiple keyword hits when several keywords are configured.
  if (keywordCount >= 2) {
    return match.matched >= 2 && match.score >= minScore;
  }
  return match.score >= minScore && match.primaryMatched > 0;
}

export function rankDocuments(
  keywords: string[],
  docs: RankedDocument[],
  k = 12,
  options: RankOptions = {}
): RankResult {
  const minScore = clampScore(
    options.minScore ?? DEFAULT_RELEVANCE_MIN_SCORE
  );
  const matchMode = options.matchMode ?? "OR";

  const seen = new Set<string>();
  const unique = docs.filter((d) => {
    const key = norm(d.url || d.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const cleanKeywords = keywords.map((k) => k.trim()).filter(Boolean);
  const now = Date.now();

  const scored = unique.map((d) => {
    const hay = norm(`${d.title} ${d.text}`);
    const match = scoreDocument(d.title, hay, cleanKeywords, d.publishedAt, now);
    return { ...d, score: match.score, _match: match };
  });

  const passing = scored
    .filter((d) =>
      isRelevant(d._match, minScore, matchMode, cleanKeywords.length)
    )
    .sort((a, b) => {
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      const tb = parsePublishedMs(b.publishedAt) ?? 0;
      const ta = parsePublishedMs(a.publishedAt) ?? 0;
      return tb - ta;
    });

  const ranked = passing.slice(0, k).map((entry) => {
    const { _match, ...doc } = entry;
    void _match;
    return doc;
  });
  const lowConfidence = passing.length < 3;

  return { ranked, lowConfidence, relevantCount: passing.length };
}

function clampScore(n: number): number {
  return Math.min(MAX_RELEVANCE_SCORE, Math.max(MIN_RELEVANCE_SCORE, Math.round(n)));
}

/** Expand ambiguous keywords for news API search queries (server-side only). */
export function buildNewsSearchQuery(keywords: string[]): string {
  const terms = new Set<string>();
  for (const kw of keywords) {
    const k = kw.trim();
    if (!k) continue;
    if (/^bb$/i.test(k)) {
      terms.add("BlackBerry");
      terms.add('"BlackBerry Limited"');
    } else {
      terms.add(k);
    }
  }
  const list = Array.from(terms);
  return list.length > 1 ? list.join(" OR ") : list[0] ?? "technology";
}
