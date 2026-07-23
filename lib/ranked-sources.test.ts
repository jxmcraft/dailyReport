import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_MAX_RANKED_SOURCES,
  MAX_RANKED_SOURCES_CEILING,
} from "./constants";
import { clampRankedSourceLimits } from "./ranked-sources";

describe("clampRankedSourceLimits", () => {
  it("preserves valid min/max within the ceiling", () => {
    assert.deepEqual(clampRankedSourceLimits(3, 12), {
      minRankedSources: 3,
      maxRankedSources: 12,
    });
  });

  it("caps max at MAX_RANKED_SOURCES_CEILING", () => {
    assert.deepEqual(clampRankedSourceLimits(5, 999), {
      minRankedSources: 5,
      maxRankedSources: MAX_RANKED_SOURCES_CEILING,
    });
  });

  it("snaps min down when it exceeds max", () => {
    assert.deepEqual(clampRankedSourceLimits(40, 20), {
      minRankedSources: 20,
      maxRankedSources: 20,
    });
  });

  it("floors values below 1", () => {
    assert.deepEqual(clampRankedSourceLimits(0, 0), {
      minRankedSources: 1,
      maxRankedSources: 1,
    });
  });

  it("floors negatives to 1", () => {
    assert.deepEqual(clampRankedSourceLimits(-5, -2), {
      minRankedSources: 1,
      maxRankedSources: 1,
    });
  });

  it("rounds fractional inputs", () => {
    assert.deepEqual(clampRankedSourceLimits(2.6, 15.2), {
      minRankedSources: 3,
      maxRankedSources: 15,
    });
  });

  it("uses DEFAULT_MAX_RANKED_SOURCES when max is NaN", () => {
    assert.deepEqual(clampRankedSourceLimits(3, Number.NaN), {
      minRankedSources: 3,
      maxRankedSources: DEFAULT_MAX_RANKED_SOURCES,
    });
  });

  it("treats non-finite min as 1 then clamps to max", () => {
    assert.deepEqual(clampRankedSourceLimits(Number.NaN, 8), {
      minRankedSources: 1,
      maxRankedSources: 8,
    });
    assert.deepEqual(clampRankedSourceLimits(Number.POSITIVE_INFINITY, 8), {
      minRankedSources: 1,
      maxRankedSources: 8,
    });
  });

  it("allows min equal to ceiling when max is at ceiling", () => {
    assert.deepEqual(
      clampRankedSourceLimits(
        MAX_RANKED_SOURCES_CEILING,
        MAX_RANKED_SOURCES_CEILING
      ),
      {
        minRankedSources: MAX_RANKED_SOURCES_CEILING,
        maxRankedSources: MAX_RANKED_SOURCES_CEILING,
      }
    );
  });
});
