import type { RankedDocument } from "@/lib/sources";

/** Only ingest articles published within this many days (inclusive). */
export const DEFAULT_MAX_NEWS_AGE_DAYS = 7;

export function parsePublishedMs(publishedAt: string | null | undefined): number | null {
  if (!publishedAt) return null;
  const t = Date.parse(publishedAt);
  return Number.isNaN(t) ? null : t;
}

export function isWithinMaxAge(
  publishedAt: string | null | undefined,
  maxAgeDays: number = DEFAULT_MAX_NEWS_AGE_DAYS,
  now = Date.now()
): boolean {
  const ms = parsePublishedMs(publishedAt);
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
