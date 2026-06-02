import type { RankedDocument } from "@/lib/sources";

export interface RankResult {
  ranked: RankedDocument[];
  lowConfidence: boolean;
}

// Minimum score a document needs to be considered on-topic. A single match of a
// common keyword scores 2 (in body) or 3 (in title), so this gate rejects
// documents that only coincidentally share one weak word.
const MIN_SCORE = 3;
const RECENCY_HALF_LIFE_DAYS = 7;

function norm(s: string): string {
  return s.toLowerCase();
}

// Lexical hybrid relevance: keyword phrase matching (title weighted over body),
// a bonus for matching multiple distinct keywords, and a recency boost. This is
// deterministic and needs no embedding API. Returns top-k above the score gate.
export function rankDocuments(
  keywords: string[],
  docs: RankedDocument[],
  k = 12
): RankResult {
  // Dedupe by URL (fall back to title) so the same story from two sources counts once.
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
    const title = norm(d.title);
    const hay = norm(`${d.title} ${d.text}`);
    let score = 0;
    let matched = 0;

    for (const kw of cleanKeywords) {
      const k = norm(kw);
      const concat = k.replace(/\s+/g, ""); // "black berry" -> "blackberry"
      const inTitle =
        title.includes(k) || (concat !== k && title.includes(concat));
      const inText = hay.includes(k) || (concat !== k && hay.includes(concat));
      if (inTitle) {
        score += 3;
        matched++;
      } else if (inText) {
        score += 2;
        matched++;
      }
    }

    // Reward documents that hit several distinct keywords (more likely on-topic).
    if (matched > 1) score += matched;

    // Recency boost (only when the source provides a date).
    if (d.publishedAt) {
      const ageDays = (now - Date.parse(d.publishedAt)) / 86_400_000;
      if (!Number.isNaN(ageDays) && ageDays >= 0) {
        score += 2 * Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
      }
    }

    return { ...d, score };
  });

  const passing = scored
    .filter((d) => (d.score ?? 0) >= MIN_SCORE)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // If nothing clears the gate (e.g. no keywords), fall back to best-scoring docs
  // so the run still produces something, but flag it as low confidence.
  const ranked = (passing.length ? passing : scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))).slice(0, k);
  const lowConfidence = passing.length < 3;

  return { ranked, lowConfidence };
}
