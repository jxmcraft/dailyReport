import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getReportContextTokenLimit } from "./llm";

describe("getReportContextTokenLimit", () => {
  function withProvider(provider: string | undefined, fn: () => void) {
    const previous = process.env.LLM_PROVIDER;
    try {
      if (provider === undefined) {
        delete process.env.LLM_PROVIDER;
      } else {
        process.env.LLM_PROVIDER = provider;
      }
      fn();
    } finally {
      if (previous === undefined) {
        delete process.env.LLM_PROVIDER;
      } else {
        process.env.LLM_PROVIDER = previous;
      }
    }
  }

  it("returns 128_000 for deepseek", () => {
    withProvider("deepseek", () => {
      assert.equal(getReportContextTokenLimit(), 128_000);
    });
  });

  it("returns 128_000 for openrouter", () => {
    withProvider("openrouter", () => {
      assert.equal(getReportContextTokenLimit(), 128_000);
    });
  });

  it("returns 128_000 when LLM_PROVIDER is unset (defaults to openrouter)", () => {
    withProvider(undefined, () => {
      assert.equal(getReportContextTokenLimit(), 128_000);
    });
  });
});
