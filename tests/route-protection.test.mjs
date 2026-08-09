import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Proxy performs session routing only and imports no privileged runtime code", async () => {
  const source = await read("proxy.ts");
  assert.match(source, /verifySignedSession/);
  assert.match(source, /NextResponse\.redirect/);
  assert.doesNotMatch(source, /@node-rs\/argon2|from ["']@\/db|db\/index|loadOperatingModel|loadWorkspaceExperience|process-explorer-neon/);
  assert.doesNotMatch(source, /authentication["'];/);
});

test("Argon2 stays in a server-only Node module", async () => {
  const [source, loginRoute] = await Promise.all([
    read("lib/authentication.ts"),
    read("app/auth/login/route.ts"),
  ]);
  assert.match(source, /^import "server-only";/);
  assert.match(source, /from "node:crypto"/);
  assert.match(source, /from "@node-rs\/argon2"/);
  assert.match(loginRoute, /export const runtime = "nodejs"/);
  assert.doesNotMatch(await read("lib/authentication-session.mjs"), /argon2|node:crypto|server-only/);
});

test("authoritative access runs before every operating-model load", async () => {
  const source = await read("lib/workspace-experience.ts");
  const accessPosition = source.indexOf("await requireWorkspaceAccess()");
  const loadPosition = source.indexOf("await loadOperatingModel()");
  assert.ok(accessPosition >= 0);
  assert.ok(loadPosition > accessPosition);
});

test("authoritative access runs before every Organization Structure load", async () => {
  const source = await read("lib/organization-structure-experience.ts");
  const accessPosition = source.indexOf("await requireWorkspaceAccess()");
  const loadPosition = source.indexOf("await loadOrganizationStructure()");
  assert.ok(accessPosition >= 0);
  assert.ok(loadPosition > accessPosition);
});

test("login and logout are POST-only session routes with secure cookie flags", async () => {
  const [login, logout] = await Promise.all([
    read("app/auth/login/route.ts"),
    read("app/auth/logout/route.ts"),
  ]);
  assert.match(login, /export async function POST/);
  assert.match(logout, /export async function POST/);
  assert.doesNotMatch(login, /export async function GET/);
  for (const source of [login, logout]) {
    assert.match(source, /httpOnly: true/);
    assert.match(source, /sameSite: "lax"/);
    assert.match(source, /secure: true/);
    assert.match(source, /sameOrigin/);
    assert.doesNotMatch(source, /DATABASE_URL|drizzle|@\/db/);
  }
});
