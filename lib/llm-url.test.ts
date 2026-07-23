import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveChatCompletionsUrl } from "./llm-url";

describe("resolveChatCompletionsUrl", () => {
  it("appends /v1/chat/completions to an API root", () => {
    assert.equal(
      resolveChatCompletionsUrl("https://api.deepseek.com"),
      "https://api.deepseek.com/v1/chat/completions"
    );
  });

  it("normalizes trailing slashes on an API root", () => {
    assert.equal(
      resolveChatCompletionsUrl("https://api.deepseek.com/"),
      "https://api.deepseek.com/v1/chat/completions"
    );
    assert.equal(
      resolveChatCompletionsUrl("https://api.deepseek.com///"),
      "https://api.deepseek.com/v1/chat/completions"
    );
  });

  it("appends /chat/completions when base already ends with /v1", () => {
    assert.equal(
      resolveChatCompletionsUrl("https://gateway.example.com/v1"),
      "https://gateway.example.com/v1/chat/completions"
    );
    assert.equal(
      resolveChatCompletionsUrl("https://gateway.example.com/v1/"),
      "https://gateway.example.com/v1/chat/completions"
    );
  });

  it("uses a full chat completions URL as-is", () => {
    assert.equal(
      resolveChatCompletionsUrl(
        "https://gateway.example.com/openai/chat/completions"
      ),
      "https://gateway.example.com/openai/chat/completions"
    );
  });

  it("preserves query strings on a full chat URL", () => {
    assert.equal(
      resolveChatCompletionsUrl(
        "https://gateway.example.com/openai/chat/completions?api-version=2024-02-01"
      ),
      "https://gateway.example.com/openai/chat/completions?api-version=2024-02-01"
    );
  });

  it("strips trailing slash on a full chat completions URL", () => {
    assert.equal(
      resolveChatCompletionsUrl(
        "https://gateway.example.com/openai/chat/completions/"
      ),
      "https://gateway.example.com/openai/chat/completions"
    );
  });

  it("leaves an already-full /v1/chat/completions URL unchanged", () => {
    assert.equal(
      resolveChatCompletionsUrl(
        "https://gateway.example.com/v1/chat/completions"
      ),
      "https://gateway.example.com/v1/chat/completions"
    );
  });

  it("throws on empty input", () => {
    assert.throws(() => resolveChatCompletionsUrl("   "), /empty/i);
  });
});
