import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

const { loadEnvConfig } = nextEnv;

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const migrationsFolder = fileURLToPath(
  new URL("../drizzle", import.meta.url),
);

loadEnvConfig(repositoryRoot);

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is required. Use a direct Neon connection string.",
  );
}

const parsedDatabaseUrl = new URL(databaseUrl);

if (!parsedDatabaseUrl.protocol.startsWith("postgres")) {
  throw new Error("DATABASE_URL_UNPOOLED must be a PostgreSQL connection URL.");
}

if (parsedDatabaseUrl.hostname.includes("-pooler")) {
  throw new Error(
    "DATABASE_URL_UNPOOLED points to a pooled endpoint. Use the direct Neon endpoint for migrations.",
  );
}

const migrationConfig = { migrationsFolder };
const localMigrations = readMigrationFiles(migrationConfig);
const client = neon(databaseUrl);
const database = drizzle({ client });

console.log(
  `Applying ${localMigrations.length} committed migration(s) to ${parsedDatabaseUrl.hostname}/${parsedDatabaseUrl.pathname.slice(1)}.`,
);

await migrate(database, migrationConfig);

const journalRows = await client.query(
  'select hash, created_at from "drizzle"."__drizzle_migrations"',
  [],
);
const recordedMigrations = new Set(
  journalRows.map((row) => `${row.hash}:${Number(row.created_at)}`),
);
const missingMigrations = localMigrations.filter(
  (migration) =>
    !recordedMigrations.has(`${migration.hash}:${migration.folderMillis}`),
);

if (missingMigrations.length > 0) {
  throw new Error(
    `Migration verification failed: ${missingMigrations.length} committed migration(s) are missing from drizzle.__drizzle_migrations.`,
  );
}

console.log(
  `Migration verification passed: ${localMigrations.length} committed migration(s) are recorded.`,
);
