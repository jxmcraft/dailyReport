import test from "node:test";
import assert from "node:assert/strict";

import { LLM_TIMEOUT_MS, SOURCE_FETCH_TIMEOUT_MS } from "./constants";
import { STALE_RUNNING_MS } from "./agent-recovery";

test("STALE_RUNNING_MS covers LLM + source fetch timeouts plus buffer", () => {
  assert.equal(
    STALE_RUNNING_MS,
    LLM_TIMEOUT_MS + SOURCE_FETCH_TIMEOUT_MS + 120_000
  );
});
