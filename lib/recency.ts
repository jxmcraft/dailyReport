import type { RankedDocument } from "@/lib/sources";

/** Only ingest articles published within this many days (inclusive). */
export const DEFAULT_MAX_NEWS_AGE_DAYS = 7;

function hasMissingPublishedAt(
  publishedAt: string | null | undefined
): boolean {
  return publishedAt == null || publishedAt.trim() === "";
}

export function parsePublishedMs(publishedAt: string | null | undefined): number | null {
  const normalized = publishedAt?.trim();
  if (!normalized) return null;
  const t = Date.parse(normalized);
  return Number.isNaN(t) ? null : t;
}

export function isWithinMaxAge(
  publishedAt: string | null | undefined,
  maxAgeDays: number = DEFAULT_MAX_NEWS_AGE_DAYS,
  now = Date.now()
): boolean {
  // Unknown publish date (Google, webpage scrapes): keep — cannot age-filter.
  if (hasMissingPublishedAt(publishedAt)) return true;
  const ms = parsePublishedMs(publishedAt);
  // Invalid non-empty strings are not unknown dates; exclude them.
  if (ms === null) return false;
  const ageDays = (now - ms) / 86_400_000;
  return ageDays >= -1 && ageDays <= maxAgeDays;
}

export function filterRecentDocuments(
  docs: RankedDocument[],
  maxAgeDays: number = DEFAULT_MAX_NEWS_AGE_DAYS
): RankedDocument[] {
  return docs.filter((d) => isWithinMaxAge(d.publishedAt, maxAgeDays));
}

/** Count dated documents excluded for falling outside the recency window. */
export function countStaleDocuments(
  docs: RankedDocument[],
  maxAgeDays: number = DEFAULT_MAX_NEWS_AGE_DAYS,
  now = Date.now()
): number {
  return docs.filter((d) => {
    const ms = parsePublishedMs(d.publishedAt);
    if (ms === null) return false;
    const ageDays = (now - ms) / 86_400_000;
    return ageDays > maxAgeDays || ageDays < -1;
  }).length;
}

export function newsFromDateYmd(maxAgeDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - maxAgeDays);
  return d.toISOString().slice(0, 10);
}

export function newsFromIso(maxAgeDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - maxAgeDays);
  return d.toISOString();
}

export function newsFromUnixSeconds(maxAgeDays: number): number {
  return Math.floor((Date.now() - maxAgeDays * 86_400_000) / 1000);
}
