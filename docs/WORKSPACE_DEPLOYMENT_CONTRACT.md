# Lotura Shared-Code Workspace Deployment Contract

Lotura has one continuously evolving application. Public demonstration and
private pilot deployments may differ through reviewed configuration, isolated
credentials, and isolated data. They must not diverge through customer-specific
branches or conditionals.

Every release report records the exact `main` commit deployed to each
environment. Temporary deployment lag is acceptable; code divergence is not.

## Public Demo — `lotura.app`

- deploys reviewed shared `main`;
- uses `LOTURA_EXPLORER_MODE=demo` and the fictional Northstar fixture only;
- remains public and read-only;
- has no Neon runtime, owner/migration, or structural-write credential;
- keeps `LOTURA_STRUCTURE_ADMIN_MODE` absent or `disabled`;
- keeps `LOTURA_OPERATING_MODEL_AUTHORING_MODE` absent or `disabled` and has no
  Process administration credential;
- keeps `LOTURA_PROCESS_APPLICATION_MODE` absent or `disabled` and has no
  Process-application credential;
- receives no JU data, identity, branding, or configuration; and
- renders no structural-administration controls.

## Private JU Pilot

- deploys the same reviewed shared `main` to the dedicated JU Vercel project;
- uses authenticated private-workspace access;
- reads only the configured JU Organization from the isolated JU Neon database
  through a dedicated SELECT-only runtime role;
- uses a separate least-privilege structural-write role only through the
  server-only `LOTURA_STRUCTURE_ADMIN_DATABASE_URL`;
- uses a distinct least-privilege Process administration role only through the
  server-only `LOTURA_PROCESS_ADMIN_DATABASE_URL` when Operating Model
  Authoring is enabled;
- uses a distinct least-privilege Discovery role only through the server-only
  `LOTURA_DISCOVERY_DATABASE_URL` when Guided Discovery is enabled;
- uses a distinct least-privilege proposal-review role only through the
  server-only `LOTURA_PROPOSAL_REVIEW_DATABASE_URL` when Proposal Review is
  enabled;
- uses a distinct least-privilege Process-application role only through the
  server-only `LOTURA_PROCESS_APPLICATION_DATABASE_URL` when approved changes
  may be applied as a documented Process version;
- may associate the authenticated pilot application identity with one existing
  Person and current Position Assignment through the paired, server-only
  `LOTURA_PILOT_PERSON_STABLE_KEY` and
  `LOTURA_PILOT_POSITION_STABLE_KEY` values;
- enables administration explicitly with
  `LOTURA_STRUCTURE_ADMIN_MODE=enabled` only after migration and privilege
  verification;
- exposes Workspace Studio only through that authenticated, organization-scoped
  structural-administration boundary; creation actions require migration `0011`
  and the separately reviewed column-level INSERT/sequence grants;
- enables Process authoring explicitly with
  `LOTURA_OPERATING_MODEL_AUTHORING_MODE=enabled` only after migration `0010`
  and its separate privilege verification;
- enables Proposal Review explicitly with
  `LOTURA_PROPOSAL_REVIEW_MODE=enabled` only after migration `0020` and its
  separate privilege verification; approval in this interface does not apply a
  Process change;
- enables Process application explicitly with
  `LOTURA_PROCESS_APPLICATION_MODE=enabled` only after migration `0021`, exact
  application-role privilege verification, and separate environment approval;
- resolves JU presentation through generic Workspace Configuration; and
- receives no public-demo fixture fallback.

The temporary pilot administrator represents the initial Workspace
Administrator. A configured pilot Person association adds a read-only personal
lens; it does not make the administrator identity a Person, Position, or
Operational Role, change authorization, narrow whole-Organization access, or
substitute for the future multidimensional Governance and Stewardship engine.

## Environment isolation

Structural, Process, Discovery, proposal-review, and Process-application write
credentials must not be configured in:

- the Public Demo project;
- any Preview deployment;
- Development; or
- client-visible variables, browser code, source files, logs, or repository
  artifacts.

Pilot Person and Position stable keys are not credentials, but they are private
deployment configuration and must likewise remain absent from Public Demo,
Preview, client-visible variables, browser bundles, and repository artifacts.
The application fails closed when only one key is present, either key is not a
UUID, the workspace is public/demo, or the records are not connected by a
current assignment in the configured Organization.

Public Demo and JU Pilot data, credentials, configuration, domains, and access
remain independently managed. A release is acceptable only when those
differences are configuration and data differences applied to the same code.
