import test from "node:test";
import assert from "node:assert/strict";

import {
  assertEmailApprovalSecret,
  generateApprovalToken,
  hashApprovalToken,
  resolveApprovalPageAccess,
  type ApprovalPageReport,
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

function sampleReport(
  overrides: Partial<ApprovalPageReport> = {}
): ApprovalPageReport {
  return {
    id: "report-1",
    timestamp: new Date(),
    emailDeliveryStatus: "PENDING_REVIEW",
    emailApprovalTokenHash: null,
    generatedMarkdown: "# Test",
    status: "SUCCESS",
    statusNotes: [],
    rawIngestedDataCount: 1,
    sourcesUsed: [],
    sourceDiagnostics: null,
    agent: {
      id: "agent-1",
      name: "Test Agent",
      deliveryChannels: [],
    },
    ...overrides,
  };
}

test("resolveApprovalPageAccess allows valid pending token", () => {
  withEnv("pepper-value", () => {
    const { token, hash } = generateApprovalToken();
    const access = resolveApprovalPageAccess(
      sampleReport({ emailApprovalTokenHash: hash }),
      token
    );
    assert.equal(access.kind, "ok");
  });
});

test("resolveApprovalPageAccess rejects wrong token", () => {
  withEnv("pepper-value", () => {
    const { hash } = generateApprovalToken();
    const access = resolveApprovalPageAccess(
      sampleReport({ emailApprovalTokenHash: hash }),
      "wrong-token"
    );
    assert.equal(access.kind, "invalid_token");
  });
});

test("resolveApprovalPageAccess allows distributed without token check", () => {
  const access = resolveApprovalPageAccess(
    sampleReport({
      emailDeliveryStatus: "DISTRIBUTED",
      emailApprovalTokenHash: null,
    }),
    "any"
  );
  assert.equal(access.kind, "ok_distributed");
});
