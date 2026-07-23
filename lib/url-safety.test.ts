import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertUrlIsSafeForScrape } from "./url-safety";

describe("assertUrlIsSafeForScrape", () => {
  it("allows public http and https URLs", () => {
    assert.equal(
      assertUrlIsSafeForScrape("https://example.com/path").toString(),
      "https://example.com/path"
    );
    assert.equal(
      assertUrlIsSafeForScrape("http://example.com").toString(),
      "http://example.com/"
    );
  });

  it("rejects localhost and .local hosts", () => {
    assert.throws(() => assertUrlIsSafeForScrape("http://localhost:3000"), /blocked/i);
    assert.throws(() => assertUrlIsSafeForScrape("http://printer.local"), /blocked/i);
  });

  it("rejects private and link-local IPv4 literals", () => {
    for (const url of [
      "http://127.0.0.1",
      "http://10.0.0.1",
      "http://172.16.0.10",
      "http://192.168.1.2",
      "http://169.254.169.254",
    ]) {
      assert.throws(() => assertUrlIsSafeForScrape(url), /blocked/i);
    }
  });

  it("rejects non-http protocols", () => {
    assert.throws(() => assertUrlIsSafeForScrape("file:///etc/passwd"), /http/i);
  });
});
