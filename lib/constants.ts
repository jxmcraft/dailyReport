export const SOURCE_FETCH_TIMEOUT_MS = 60_000;
export const LLM_TIMEOUT_MS = 180_000;
/** @deprecated Use LLM_TIMEOUT_MS or SOURCE_FETCH_TIMEOUT_MS */
export const EXECUTION_TIMEOUT_MS = LLM_TIMEOUT_MS;

/** Poll interval while a pipeline run is active (manual or in-flight on dashboard). */
export const ACTIVE_RUN_POLL_MS = 4000;
export const PIPELINE_STAGE_TICK_MS = 1500;

/** Approval links expire after 7 days. */
export const EMAIL_APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Default max ranked documents passed to the LLM (per-agent setting). */
export const DEFAULT_MAX_RANKED_SOURCES = 12;

/** Default minimum ranked sources required before calling the LLM. */
export const DEFAULT_MIN_RANKED_SOURCES = 3;

/** Hard ceiling for maxRankedSources (UI + server clamp). */
export const MAX_RANKED_SOURCES_CEILING = 50;

/** Default number of linked pages scraped from a listing URL when enabled. */
export const DEFAULT_SHALLOW_SCRAPE_MAX_LINKS = 5;

/** Hard ceiling for shallow scrape link expansion. */
export const MAX_SHALLOW_SCRAPE_LINKS = 20;

/** Default page size for logs and reports views. */
export const RUNS_PAGE_SIZE = 20;

/** @deprecated Use DEFAULT_MAX_RANKED_SOURCES */
export const TOP_K = DEFAULT_MAX_RANKED_SOURCES;
