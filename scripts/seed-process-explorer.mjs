import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
import { Pool } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

loadEnvConfig(repositoryRoot);

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is required. Seed only a new isolated database.",
  );
}

const parsedDatabaseUrl = new URL(databaseUrl);

if (parsedDatabaseUrl.hostname.includes("-pooler")) {
  throw new Error(
    "DATABASE_URL_UNPOOLED points to a pooled endpoint. Use the direct Neon endpoint.",
  );
}

const seed = JSON.parse(
  await readFile(
    new URL("../db/seeds/process-explorer.json", import.meta.url),
    "utf8",
  ),
);
const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();
let transactionStarted = false;

try {
  await client.query("begin");
  transactionStarted = true;

  const { rows: tableCounts } = await client.query(`
    select
      (select count(*)::integer from organizations) as organizations,
      (select count(*)::integer from users) as users,
      (select count(*)::integer from memberships) as memberships,
      (select count(*)::integer from processes) as processes
  `);
  const occupiedTables = Object.entries(tableCounts[0]).filter(
    ([, count]) => Number(count) > 0,
  );

  if (occupiedTables.length > 0) {
    throw new Error(
      `Seed aborted: the target is not an empty isolated database (${occupiedTables
        .map(([table, count]) => `${table}: ${count}`)
        .join(", ")}).`,
    );
  }

  const organizationResult = await client.query(
    "insert into organizations (name) values ($1) returning id",
    [seed.organization.name],
  );
  const organizationId = organizationResult.rows[0].id;
  const userIds = new Map();
  const membershipIds = new Map();
  const roleIds = new Map();
  const systemIds = new Map();
  const processIds = new Map();
  const processStepIds = new Map();

  for (const user of seed.users) {
    const result = await client.query(
      "insert into users (email, display_name) values ($1, $2) returning id",
      [user.email, user.displayName],
    );
    userIds.set(user.key, result.rows[0].id);
  }

  for (const membership of seed.memberships) {
    const result = await client.query(
      `insert into memberships
        (organization_id, user_id, access_level, status)
       values ($1, $2, $3, $4)
       returning id`,
      [
        organizationId,
        userIds.get(membership.userKey),
        membership.accessLevel,
        membership.status,
      ],
    );
    membershipIds.set(membership.key, result.rows[0].id);
  }

  for (const role of seed.roles) {
    const result = await client.query(
      `insert into roles
        (organization_id, name, description, status)
       values ($1, $2, $3, $4)
       returning id`,
      [organizationId, role.name, role.description ?? null, role.status],
    );
    roleIds.set(role.key, result.rows[0].id);
  }

  for (const assignment of seed.roleAssignments) {
    await client.query(
      `insert into role_assignments
        (organization_id, role_id, membership_id, assignment_type, status,
         effective_from, effective_until, reason)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        organizationId,
        roleIds.get(assignment.roleKey),
        membershipIds.get(assignment.membershipKey),
        assignment.assignmentType,
        assignment.status,
        assignment.effectiveFrom,
        assignment.effectiveUntil ?? null,
        assignment.reason ?? null,
      ],
    );
  }

  for (const system of seed.systems) {
    const result = await client.query(
      `insert into systems
        (organization_id, name, description, system_type, url, owner_role_id, status)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [
        organizationId,
        system.name,
        system.description ?? null,
        system.systemType,
        system.url ?? null,
        system.ownerRoleKey ? roleIds.get(system.ownerRoleKey) : null,
        system.status,
      ],
    );
    systemIds.set(system.key, result.rows[0].id);
  }

  for (const process of seed.processes) {
    const result = await client.query(
      `insert into processes
        (organization_id, name, purpose, owner_role_id, status)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [
        organizationId,
        process.name,
        process.purpose ?? null,
        process.ownerRoleKey ? roleIds.get(process.ownerRoleKey) : null,
        process.status,
      ],
    );
    processIds.set(process.key, result.rows[0].id);
  }

  for (const step of seed.processSteps) {
    const result = await client.query(
      `insert into process_steps
        (organization_id, process_id, position, title, instructions, responsible_role_id)
       values ($1, $2, $3, $4, $5, $6)
       returning id`,
      [
        organizationId,
        processIds.get(step.processKey),
        step.position,
        step.title,
        step.instructions,
        step.responsibleRoleKey
          ? roleIds.get(step.responsibleRoleKey)
          : null,
      ],
    );
    processStepIds.set(step.key, result.rows[0].id);
  }

  for (const processException of seed.exceptions) {
    await client.query(
      `insert into exceptions
        (organization_id, process_id, process_step_id, name, condition, response, status, owner_role_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        organizationId,
        processIds.get(processException.processKey),
        processException.processStepKey
          ? processStepIds.get(processException.processStepKey)
          : null,
        processException.name,
        processException.condition,
        processException.response,
        processException.status,
        processException.ownerRoleKey
          ? roleIds.get(processException.ownerRoleKey)
          : null,
      ],
    );
  }

  for (const processSystem of seed.processSystems) {
    await client.query(
      `insert into process_systems
        (organization_id, process_id, system_id, usage)
       values ($1, $2, $3, $4)`,
      [
        organizationId,
        processIds.get(processSystem.processKey),
        systemIds.get(processSystem.systemKey),
        processSystem.usage,
      ],
    );
  }

  for (const dependency of seed.processDependencies) {
    await client.query(
      `insert into process_dependencies
        (organization_id, source_process_id, target_process_id, dependency_type, description)
       values ($1, $2, $3, $4, $5)`,
      [
        organizationId,
        processIds.get(dependency.sourceProcessKey),
        processIds.get(dependency.targetProcessKey),
        dependency.dependencyType,
        dependency.description ?? null,
      ],
    );
  }

  await client.query("commit");
  transactionStarted = false;

  console.log(
    `Seeded ${seed.organization.name} with ${seed.processes.length} processes on ${parsedDatabaseUrl.hostname}/${parsedDatabaseUrl.pathname.slice(1)}.`,
  );
} catch (error) {
  if (transactionStarted) await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
