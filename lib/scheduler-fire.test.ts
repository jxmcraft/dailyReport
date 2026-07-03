import test from "node:test";
import assert from "node:assert/strict";

import { buildMinuteKey } from "./scheduler-fire";

test("buildMinuteKey uses local date parts", () => {
  const date = new Date(2026, 5, 29, 14, 35, 42);
  assert.equal(buildMinuteKey(date), "2026-5-29-14-35");
});

test("buildMinuteKey distinguishes adjacent minutes", () => {
  const a = new Date(2026, 0, 1, 9, 0);
  const b = new Date(2026, 0, 1, 9, 1);
  assert.notEqual(buildMinuteKey(a), buildMinuteKey(b));
});
