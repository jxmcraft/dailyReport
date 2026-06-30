import test from "node:test";
import assert from "node:assert/strict";

import { getAppBaseUrl } from "./app-url";

const APP_URL_KEY = "APP_URL";
const PORT_KEY = "PORT";

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => void
) {
  const previous: Record<string, string | undefined> = {};
  for (const key of [APP_URL_KEY, PORT_KEY]) {
    previous[key] = process.env[key];
  }
  try {
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fn();
  } finally {
    for (const key of [APP_URL_KEY, PORT_KEY]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("getAppBaseUrl uses APP_URL when set", () => {
  withEnv({ APP_URL: "http://localhost:3001/", PORT: "3000" }, () => {
    assert.equal(getAppBaseUrl(), "http://localhost:3001");
  });
});

test("getAppBaseUrl falls back to PORT when APP_URL unset", () => {
  withEnv({ APP_URL: undefined, PORT: "3001" }, () => {
    assert.equal(getAppBaseUrl(), "http://localhost:3001");
  });
});

test("getAppBaseUrl defaults to port 3000", () => {
  withEnv({ APP_URL: undefined, PORT: undefined }, () => {
    assert.equal(getAppBaseUrl(), "http://localhost:3000");
  });
});
