import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is required for Drizzle migrations. Use a direct Neon connection string, not the pooled runtime URL.",
  );
}

const databaseHost = new URL(databaseUrl).hostname;

if (databaseHost.includes("-pooler")) {
  throw new Error(
    "DATABASE_URL_UNPOOLED points to a pooled Neon endpoint. Drizzle migrations require the direct endpoint.",
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
