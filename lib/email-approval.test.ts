import test from "node:test";
import assert from "node:assert/strict";

import {
  assertEmailApprovalSecret,
  generateApprovalToken,
  hashApprovalToken,
} from "./email-approval";

const ENV_KEY = "EMAIL_APPROVAL_SECRET";

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

const SECRET_ERROR =
  "EMAIL_APPROVAL_SECRET must be set in .env when email approval is enabled.";

test("assertEmailApprovalSecret throws when EMAIL_APPROVAL_SECRET is unset", () => {
  withEnv(undefined, () => {
    assert.throws(() => assertEmailApprovalSecret(), { message: SECRET_ERROR });
  });
});

test("generateApprovalToken throws when EMAIL_APPROVAL_SECRET is unset", () => {
  withEnv(undefined, () => {
    assert.throws(() => generateApprovalToken(), { message: SECRET_ERROR });
  });
});

test("generateApprovalToken returns stable hash when secret is set", () => {
  withEnv("pepper-value", () => {
    const { token, hash } = generateApprovalToken();
    assert.ok(token.length > 0);
    assert.ok(hash.length > 0);
    assert.equal(hashApprovalToken(token), hash);
    assert.equal(hashApprovalToken(token), hash);
  });
});
