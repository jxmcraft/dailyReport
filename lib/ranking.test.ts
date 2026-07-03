import test from "node:test";
import assert from "node:assert/strict";

import { rankDocuments } from "./ranking";
import type { RankedDocument } from "./sources";

function doc(overrides: Partial<RankedDocument> & Pick<RankedDocument, "title">): RankedDocument {
  return {
    url: "https://example.com/page",
    text: "body",
    source: "Web (example.com)",
    publishedAt: null,
    ...overrides,
  };
}

test("rankDocuments with no keywords returns scrape docs sorted by recency", () => {
  const docs = [
    doc({
      title: "Older",
      url: "https://example.com/old",
      publishedAt: "2026-01-01T00:00:00.000Z",
    }),
    doc({
      title: "Newer",
      url: "https://example.com/new",
      publishedAt: "2026-06-01T00:00:00.000Z",
    }),
  ];
  const { ranked, relevantCount } = rankDocuments([], docs);
  assert.equal(relevantCount, 2);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]?.title, "Newer");
});

test("rankDocuments with no keywords returns empty when no docs", () => {
  const { ranked, relevantCount } = rankDocuments([], []);
  assert.equal(relevantCount, 0);
  assert.equal(ranked.length, 0);
});

test("rankDocuments with keywords still filters by relevance", () => {
  const docs = [
    doc({
      title: "Unrelated topic",
      url: "https://example.com/a",
      text: "nothing here",
    }),
    doc({
      title: "BlackBerry earnings",
      url: "https://example.com/bb",
      text: "BlackBerry Limited quarterly results",
    }),
  ];
  const { ranked } = rankDocuments(["BlackBerry"], docs, 12, { minScore: 3 });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0]?.title, "BlackBerry earnings");
});
