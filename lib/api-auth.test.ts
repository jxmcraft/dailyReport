import test from "node:test";
import assert from "node:assert/strict";

import { verifyApiSecret } from "./api-auth";

const ENV_KEY = "API_SECRET";

function withEnv(value: string | undefined, fn: () => void) {
  const previous = process.env[ENV_KEY];
  if (value === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = value;
  }
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = previous;
    }
  }
}

function request(authHeader?: string): Request {
  const headers = authHeader ? { authorization: authHeader } : undefined;
  return new Request("http://localhost/api/pipeline/agent-1/run", {
    method: "POST",
    headers,
  });
}

test("verifyApiSecret allows request when API_SECRET is unset", () => {
  withEnv(undefined, () => {
    assert.equal(verifyApiSecret(request()), null);
    assert.equal(verifyApiSecret(request("Bearer anything")), null);
  });
});

test("verifyApiSecret returns 401 when secret set but bearer missing or wrong", () => {
  withEnv("test-secret", () => {
    const missing = verifyApiSecret(request());
    assert.ok(missing);
    assert.equal(missing!.status, 401);

    const wrong = verifyApiSecret(request("Bearer wrong"));
    assert.ok(wrong);
    assert.equal(wrong!.status, 401);
  });
});

test("verifyApiSecret allows request when bearer matches API_SECRET", () => {
  withEnv("test-secret", () => {
    assert.equal(verifyApiSecret(request("Bearer test-secret")), null);
  });
});
