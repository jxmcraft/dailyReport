import {
  DEFAULT_MAX_RANKED_SOURCES,
  MAX_RANKED_SOURCES_CEILING,
} from "@/lib/constants";

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Clamp per-agent min/max ranked source settings.
 * Min is always ≤ max; max is capped at MAX_RANKED_SOURCES_CEILING.
 */
export function clampRankedSourceLimits(
  minRankedSources: number,
  maxRankedSources: number
): { minRankedSources: number; maxRankedSources: number } {
  const maxRaw = Number.isFinite(maxRankedSources)
    ? maxRankedSources
    : DEFAULT_MAX_RANKED_SOURCES;
  const maxSources = clampInt(maxRaw, 1, MAX_RANKED_SOURCES_CEILING);
  const minSources = clampInt(minRankedSources, 1, maxSources);
  return { minRankedSources: minSources, maxRankedSources: maxSources };
}

export { DEFAULT_MAX_RANKED_SOURCES, MAX_RANKED_SOURCES_CEILING };
