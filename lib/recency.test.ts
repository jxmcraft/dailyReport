import test from "node:test";
import assert from "node:assert/strict";

import type { RankedDocument } from "./sources";
import {
  countStaleDocuments,
  DEFAULT_MAX_NEWS_AGE_DAYS,
  filterRecentDocuments,
  isWithinMaxAge,
  parsePublishedMs,
} from "./recency";

const NOW = Date.parse("2026-06-24T00:00:00.000Z");

function isoDaysFromNow(days: number): string {
  return new Date(NOW + days * 86_400_000).toISOString();
}

test("parsePublishedMs returns null for missing and invalid values", () => {
  assert.equal(parsePublishedMs(null), null);
  assert.equal(parsePublishedMs(undefined), null);
  assert.equal(parsePublishedMs(""), null);
  assert.equal(parsePublishedMs("   "), null);
  assert.equal(parsePublishedMs("not-a-date"), null);
});

test("isWithinMaxAge keeps unknown dates but excludes invalid non-empty strings", () => {
  assert.equal(isWithinMaxAge(null, DEFAULT_MAX_NEWS_AGE_DAYS, NOW), true);
  assert.equal(isWithinMaxAge("", DEFAULT_MAX_NEWS_AGE_DAYS, NOW), true);
  assert.equal(isWithinMaxAge("   ", DEFAULT_MAX_NEWS_AGE_DAYS, NOW), true);
  assert.equal(
    isWithinMaxAge("not-a-date", DEFAULT_MAX_NEWS_AGE_DAYS, NOW),
    false
  );
});

test("isWithinMaxAge keeps recent dates and excludes old dates", () => {
  assert.equal(
    isWithinMaxAge(isoDaysFromNow(-2), DEFAULT_MAX_NEWS_AGE_DAYS, NOW),
    true
  );
  assert.equal(
    isWithinMaxAge(isoDaysFromNow(-10), DEFAULT_MAX_NEWS_AGE_DAYS, NOW),
    false
  );
});

test("isWithinMaxAge excludes future dates beyond the one-day grace window", () => {
  assert.equal(
    isWithinMaxAge(isoDaysFromNow(0.5), DEFAULT_MAX_NEWS_AGE_DAYS, NOW),
    true
  );
  assert.equal(
    isWithinMaxAge(isoDaysFromNow(2), DEFAULT_MAX_NEWS_AGE_DAYS, NOW),
    false
  );
});

test("countStaleDocuments counts old and future-dated docs but not unknown or invalid values", () => {
  const docs: RankedDocument[] = [
    { title: "unknown", url: "u1", text: "t", source: "s", publishedAt: null },
    { title: "blank", url: "u2", text: "t", source: "s", publishedAt: "" },
    {
      title: "invalid",
      url: "u3",
      text: "t",
      source: "s",
      publishedAt: "not-a-date",
    },
    {
      title: "recent",
      url: "u4",
      text: "t",
      source: "s",
      publishedAt: isoDaysFromNow(-2),
    },
    {
      title: "old",
      url: "u5",
      text: "t",
      source: "s",
      publishedAt: isoDaysFromNow(-10),
    },
    {
      title: "future",
      url: "u6",
      text: "t",
      source: "s",
      publishedAt: isoDaysFromNow(2),
    },
  ];

  assert.equal(
    countStaleDocuments(docs, DEFAULT_MAX_NEWS_AGE_DAYS, NOW),
    2
  );
});

test("filterRecentDocuments keeps unknown dates and excludes invalid, old, and future-dated docs", () => {
  const docs = [
    { title: "unknown", url: "u1", text: "t", source: "s", publishedAt: null },
    { title: "blank", url: "u2", text: "t", source: "s", publishedAt: "   " },
    {
      title: "invalid",
      url: "u3",
      text: "t",
      source: "s",
      publishedAt: "not-a-date",
    },
    {
      title: "recent",
      url: "u4",
      text: "t",
      source: "s",
      publishedAt: isoDaysFromNow(-1),
    },
    {
      title: "old",
      url: "u5",
      text: "t",
      source: "s",
      publishedAt: isoDaysFromNow(-20),
    },
    {
      title: "future",
      url: "u6",
      text: "t",
      source: "s",
      publishedAt: isoDaysFromNow(2),
    },
  ];

  const realNow = Date.now;
  Date.now = () => NOW;
  try {
    const filtered = filterRecentDocuments(docs, DEFAULT_MAX_NEWS_AGE_DAYS);
    assert.deepEqual(
      filtered.map((doc) => doc.title),
      ["unknown", "blank", "recent"]
    );
  } finally {
    Date.now = realNow;
  }
});
