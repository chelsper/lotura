import assert from "node:assert/strict";
import test from "node:test";

import {
  createSignedSession,
  SESSION_COOKIE_NAME,
  verifySignedSession,
} from "../lib/authentication-session.mjs";

const secret = "A".repeat(43);
const otherSecret = "B".repeat(43);
const issuedAt = new Date("2026-08-07T12:00:00.000Z");

test("signed sessions round-trip with a minimal payload", async () => {
  const token = await createSignedSession({
    durationSeconds: 28_800,
    now: issuedAt,
    secret,
  });
  const payload = await verifySignedSession(token, {
    maximumDurationSeconds: 28_800,
    now: new Date("2026-08-07T12:30:00.000Z"),
    secret,
  });

  assert.equal(SESSION_COOKIE_NAME, "__Host-lotura_session");
  assert.deepEqual(payload, {
    exp: 1786132800,
    iat: 1786104000,
    sub: "temporary-admin",
    v: 1,
  });
  assert.doesNotMatch(token, /password|email|organization/i);
});

test("expired, tampered, wrong-secret, and overlong sessions fail closed", async () => {
  const token = await createSignedSession({
    durationSeconds: 28_800,
    now: issuedAt,
    secret,
  });
  const pieces = token.split(".");
  const tampered = `${pieces[0].slice(0, -1)}A.${pieces[1]}`;

  assert.equal(
    await verifySignedSession(token, {
      maximumDurationSeconds: 28_800,
      now: new Date("2026-08-07T20:00:00.000Z"),
      secret,
    }),
    null,
  );
  assert.equal(
    await verifySignedSession(tampered, {
      maximumDurationSeconds: 28_800,
      now: issuedAt,
      secret,
    }),
    null,
  );
  assert.equal(
    await verifySignedSession(token, {
      maximumDurationSeconds: 28_800,
      now: issuedAt,
      secret: otherSecret,
    }),
    null,
  );

  const longToken = await createSignedSession({
    durationSeconds: 86_400,
    now: issuedAt,
    secret,
  });
  assert.equal(
    await verifySignedSession(longToken, {
      maximumDurationSeconds: 28_800,
      now: issuedAt,
      secret,
    }),
    null,
  );
});
