# Lotura

Lotura is a Next.js App Router application backed by Neon Postgres and Drizzle ORM.

## Product and domain documentation

- [Product vision](PRODUCT_VISION.md)
- [Product principles](PRODUCT_PRINCIPLES.md)
- [Design system](DESIGN_SYSTEM.md)
- [Product roadmap](PRODUCT_ROADMAP.md)
- [Architecture decisions](ARCHITECTURE_DECISIONS.md)
- [Product language](LANGUAGE.md)
- [Process Acquisition](PROCESS_ACQUISITION.md)
- [Conflict Detection](CONFLICT_DETECTION.md)
- [Restructuring Intelligence](RESTRUCTURING_INTELLIGENCE.md)
- [Continuous Improvement product direction](docs/product-vision.md)
- [Future Continuous Improvement domain model](docs/domain-model.md)
- [Future Organization Structure and Responsibility domain model](docs/organization-structure-domain.md)
- [Organization Structure Resolution & Approval v0.1](docs/organization-structure-resolution.md)
- [Private workspace preparation](docs/private-workspace-preparation.md)
- [Validation-only snapshot format](docs/operating-model-import.md)
- [Operating Model Authoring v0.1](docs/OPERATING_MODEL_AUTHORING.md)

## Requirements

- Node.js 24.x (the same major used by the Vercel project)
- npm
- A Neon Postgres database

Run `nvm use` before installing dependencies if you use nvm.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Leave `LOTURA_EXPLORER_MODE=demo` to use the repository's fictional fixture without a database, or configure the live mode described below.
4. Start the application with `npm run dev`.

Never prefix any database or Lotura source variable with `NEXT_PUBLIC_`.

## Read-only product routes

- `/` introduces Lotura, identifies the Organization and data source, explains the operating-model snapshot, and defines the core vocabulary.
- `/explorer` browses documented Processes and their Roles, Assignments, Steps, Exceptions, Systems, and Process dependencies.
- `/flow` presents an evidence-based review of items to review, documented concentrations, and read-only what-if views.

All routes use one server-resolved `WorkspaceConfiguration` per request. The configuration remains non-persistent: it uses `Organization.name`, a derived Organization monogram (or the Lotura mark), and the Lotura evergreen accent by default. A dedicated deployment may provide validated display name, scope, knowledge-state label, logo, monogram, and accent overrides through server-only configuration. Components never contain customer-specific presentation logic, and branding cannot override semantic or evidence colors.

## Workspace access modes

`LOTURA_AUTH_MODE` supports:

- `public`: permitted for the fictional demo. Production and Preview Neon workspaces reject public mode.
- `temporary-password`: one temporary administrator credential verified server-side with Argon2id and an eight-hour signed session.

Development and deployed demo mode remain public when the value is omitted. A deployed Neon workspace fails configuration validation unless `temporary-password` is explicit and its server-only identifier, Argon2id hash, and base64url session secret are present.

`proxy.ts` performs signed-session routing only. It does not import Argon2, database code, or operating-model code. The authoritative check runs in `loadWorkspaceExperience()` before `loadOperatingModel()`, so a missing or invalid session cannot initiate a Neon read.

Temporary authentication is preparation for a future private deployment, not authorization to expose one. Durable distributed login throttling or approved deployment-level protection must be configured and verified before a private custom domain becomes accessible. SSO remains the intended replacement.

Optional server-only presentation variables are:

- `LOTURA_WORKSPACE_DISPLAY_NAME`
- `LOTURA_WORKSPACE_SCOPE_LABEL`
- `LOTURA_WORKSPACE_KNOWLEDGE_STATE`
- `LOTURA_WORKSPACE_LOGO_URL`
- `LOTURA_WORKSPACE_LOGO_MONOGRAM`
- `LOTURA_WORKSPACE_ACCENT`

Knowledge state is limited to `sanitized-working-draft`, `validated`, and `approved-for-pilot`. It describes preparation confidence and permitted use; it is not persisted and does not replace `Process.status`.

## Operating-model data sources

The Process Explorer and FLOW Analysis receive the same normalized, read-only operating-model snapshot. Both the Neon adapter and the fixture produce the existing `ProcessExplorerSeed` input shape, so FLOW calculations remain pure and independent of the data source.

Set `LOTURA_EXPLORER_MODE` to one of:

- `demo`: load `db/seeds/process-explorer.json` without connecting to Neon.
- `neon`: load one configured organization from Neon and fail closed if the read is unavailable.
- `neon-with-demo-fallback`: load Neon normally, but show a clearly labelled fictional sample organization after a recognized transient connection failure.

Local Development defaults to `demo`. Vercel Preview and Production default to `neon`. A self-hosted deployment can declare `LOTURA_RUNTIME_ENV=development`, `preview`, or `production`; otherwise `NODE_ENV=production` is treated as Production.

Production rejects `neon-with-demo-fallback` unless the separate server-only value `LOTURA_ALLOW_DEMO_FALLBACK=true` is present. Preview and Development may use the fallback mode without that opt-in. Missing configuration, an unknown organization, or invalid operating-model data never triggers fallback.

### Organization scope

`LOTURA_ORGANIZATION_ID` is required in either Neon mode. It is resolved only from server configuration and is applied to every organization-owned query. Users are selected only through Memberships in that organization. Version 0.1 intentionally has no client-controlled organization selector; until authentication exists, one deployment exposes one configured organization.

The adapter sends the organization, roles, assignments, memberships and users, processes and steps, exceptions, systems and process-system links, and dependencies as one Neon HTTP batch. The batch uses a read-only, repeatable-read transaction. PostgreSQL's transaction timestamp becomes the shared visible UTC `as-of` time for both the Explorer and FLOW results. No shared result cache is used.

### Runtime credential boundary

`DATABASE_URL` is the pooled server-only runtime connection used by `db/index.ts`. Production and deployed environments are intended to use a dedicated Neon role limited to `CONNECT`, schema `USAGE`, and `SELECT` on Lotura tables. Application code contains only reads, but the database role is the enforcement boundary.

`DATABASE_URL_UNPOOLED` is the direct owner/migration connection used only by explicit migration and seed commands. Runtime code does not read it and never substitutes it when `DATABASE_URL` is missing. Local Development may temporarily use its existing development connection as `DATABASE_URL` while a dedicated read-only role is being established; that exception must not be carried into deployed runtime configuration.

If Neon is unavailable in `neon` mode, the route renders a sanitized unavailable state and offers a read retry. Raw SQL, connection details, and database errors are not sent to the interface. In explicitly permitted fallback mode, the interface displays an unambiguous demo-fallback warning.

## Database workflow

- `npm run db:generate` generates SQL migrations from `db/schema.ts`.
- `npm run db:migrate` applies committed migrations through Drizzle ORM's Neon HTTP migrator using `DATABASE_URL_UNPOOLED`, then verifies every local migration is present in the database journal.

Run the approved migration command from the repository root:

```bash
npm run db:migrate
```

Do not use `npx drizzle-kit migrate` for this repository. During isolated-branch testing with `drizzle-kit` 0.31.10, that command exited successfully after creating the migration journal but did not execute or record the committed migrations. The repository script uses the Neon HTTP migrator that successfully applied the complete chain and fails if the journal does not match the local migration files.

Generate and review migrations in a branch, then apply them as an explicit release step. Do not add migrations to the Vercel build command: preview and production builds can overlap, and a failed migration should not be coupled to application compilation.

### Fictional Process Explorer seed

Demo mode and automated tests retain the repository fixture in `db/seeds/process-explorer.json`, so the read-only experience works without writing to a database. To populate a new, isolated development database with the same fictional organization after applying migrations, run:

```bash
npm run db:seed:explorer
```

The seed command uses `DATABASE_URL_UNPOOLED`, runs in a transaction, and refuses to continue unless the application tables are empty. It must not be run against a shared, preview, production, or retained migration-evidence branch. Seeding is a separate, manually approved provisioning action; it is never invoked by the application, build, or deployment.

The minimum safe demo setup is a new isolated development branch with migrations `0000` through `0003`, one execution of the existing seed command, and a separate read-only runtime credential for subsequent Explorer requests. Do not place the owner/migration credential in the runtime `DATABASE_URL` for a deployed environment.

### Validation-only private snapshot preparation

Validate the structure of an off-repository snapshot without connecting to a database:

```bash
npm run snapshot:validate -- /absolute/path/to/snapshot.json
```

This command is not an importer. It reads JSON, checks the approved field vocabulary, references, Version 0.1 constraints, preparation-register coverage, and human-review attestation, then prints counts and findings. It imports no database module, makes no network request, and writes nothing.

Passing validation does not prove arbitrary free text is safe or sanitized. Human review remains mandatory. See [Private workspace preparation](docs/private-workspace-preparation.md) and the [snapshot format](docs/operating-model-import.md).

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

Store only the least-privilege runtime `DATABASE_URL` required by a deployed
Neon workspace. `DATABASE_URL_UNPOOLED` is an explicit administrative migration
or seed credential and is not a runtime fallback or ordinary deployment value.
Production and Preview must use isolated data and credentials so preview
deployments cannot mutate production data.

The Public Demo and private-pilot configuration boundary, including the
server-only structural-write credential, is defined in
[docs/WORKSPACE_DEPLOYMENT_CONTRACT.md](docs/WORKSPACE_DEPLOYMENT_CONTRACT.md).
