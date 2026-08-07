# Lotura

Lotura is a Next.js App Router application backed by Neon Postgres and Drizzle ORM.

## Requirements

- Node.js 24.x (the same major used by the Vercel project)
- npm
- A Neon Postgres database

Run `nvm use` before installing dependencies if you use nvm.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL` to Neon's pooled connection string.
4. Set `DATABASE_URL_UNPOOLED` to Neon's direct connection string.
5. Start the application with `npm run dev`.

`DATABASE_URL` is used only by the server-side database client in `db/index.ts`. Never prefix either database variable with `NEXT_PUBLIC_`.

## Database workflow

- `npm run db:generate` generates SQL migrations from `db/schema.ts`.
- `npm run db:migrate` applies committed migrations through the direct Neon endpoint.

Generate and review migrations in a branch, then apply them as an explicit release step. Do not add migrations to the Vercel build command: preview and production builds can overlap, and a failed migration should not be coupled to application compilation.

## Verification

Run these checks before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run build
npx drizzle-kit check
```

## Vercel and Neon

The Vercel project should use the Next.js framework preset, repository root `.`, the default Next.js output directory, `npm run build`, and Node.js 24.x. A `vercel.json` file is intentionally unnecessary for this single-app repository.

Store `DATABASE_URL` and `DATABASE_URL_UNPOOLED` as sensitive Vercel environment variables. Production and Preview should use separate Neon branches/credentials so preview deployments cannot mutate production data. The Neon/Vercel integration can automate per-preview database branches; otherwise configure environment-specific values manually.
