export const SOURCE_FETCH_TIMEOUT_MS = 60_000;
export const LLM_TIMEOUT_MS = 180_000;
/** @deprecated Use LLM_TIMEOUT_MS or SOURCE_FETCH_TIMEOUT_MS */
export const EXECUTION_TIMEOUT_MS = LLM_TIMEOUT_MS;

/** Poll interval while a pipeline run is active (manual or in-flight on dashboard). */
export const ACTIVE_RUN_POLL_MS = 4000;
export const PIPELINE_STAGE_TICK_MS = 1500;

/** Approval links expire after 7 days. */
export const EMAIL_APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Max ranked documents passed to the LLM (also caps minRankedSources UI). */
export const TOP_K = 12;
