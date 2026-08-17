# Process Versions & Atomic Application v0.1 — implementation plan

**Status:** Generic implementation complete; isolated fictional migration and
boundary verification passed at journal `22/22`. JU migration, credential,
environment, data, and deployment changes remain separately gated. Public
Northstar remains unchanged.

This plan translates accepted LAD-053 into the smallest implementation that
can complete the manual path from evidence to an approved, versioned
operating-model change. It follows LAD-002, LAD-007 through LAD-009, LAD-015,
LAD-016, LAD-018, LAD-023 through LAD-026, LAD-029, LAD-035 through LAD-037,
LAD-040, LAD-041, LAD-046, and LAD-049 through LAD-053. It extends the current
history and proposal-review boundaries and conflicts with none of them.

## 1. Bounded user experience

A finished Proposal Review shows **Apply approved changes** only when:

- Process application is explicitly enabled in an authenticated private
  workspace;
- the review is finished;
- at least one current item decision is **Approve to move forward**;
- the review has not already been applied; and
- the currently documented Process still matches the review fingerprint.

The application page is read-only until the administrator deliberately
submits it. It shows every current reviewed item in three groups:

- approved changes that will all be applied;
- changes that were not approved or need more validation and will remain
  unchanged; and
- unresolved questions that remain context and are never canonical writes.

For each approved item, the applicant must choose **Correction** or
**Organizational change**. The package also requires one plain-language reason
and one effective date/time. Organization, actor, Process, targets, actions,
review decisions, and item revisions are server-derived. The client may send
only the session stable key, expected documented fingerprint, expected review
identity, a classification keyed to each approved item stable key, the package
reason, and effective time.

The confirmation states that all approved changes will be applied together,
the prior documented state will remain available as a version, and a failure
will retain no partial change. There is no application-time item picker.

After success, the same route displays an immutable receipt with:

- the Process and new version number;
- effective time, transaction time, authenticated actor, and reason;
- the baseline/before and resulting version identities;
- every applied item and its canonical before/after state; and
- links back to the evidence mapping and Proposal Review.

If there are no approved items, the review remains a valid Knowledge Outcome
and no application page, empty application row, or Process version is created.

## 2. Forward-only migration `0021`

The next migration should be named
`0021_process_versions_atomic_application.sql`. Migrations `0000` through
`0020` remain byte-for-byte unchanged.

### Enum changes

Add a new enum:

```sql
CREATE TYPE process_version_kind AS ENUM (
  'baseline',
  'approved_application'
);
```

Expand existing enums forward-only:

```sql
ALTER TYPE operating_model_change_entity_type
  ADD VALUE 'process_dependency';
ALTER TYPE operating_model_change_action
  ADD VALUE 'create_dependency';
```

No existing action is overloaded. The current nine Discovery mapping actions
remain unchanged, and `preserve_unresolved` remains non-canonical.

### Stable dependency identity and exact history target

Add `stable_key uuid DEFAULT gen_random_uuid() NOT NULL` to
`process_dependencies`, backfill it through the default, add global and
tenant-safe unique constraints, and add the same immutable-stable-key trigger
pattern used by Processes, Steps, Systems, and Exceptions.

Add nullable `process_dependency_id` and `process_dependency_stable_key`
columns to `operating_model_changes`, a tenant-safe foreign key, a supporting
index, and a forward-only replacement of its target-shape check. A
`process_dependency` history event must carry:

- the focal Process ID/stable key;
- the dependency ID/stable key; and
- no Step, System, or Exception target.

Existing dependency IDs, relationships, routes, and semantics remain
unchanged. LAD-007 continues to allow real feedback loops. Application rejects
self-dependency and an exact source/target/type duplicate; it does not invent a
general acyclic-graph rule.

### `process_versions`

Create an append-only table with:

| Column | Contract |
| --- | --- |
| `id`, `stable_key` | generated immutable identity |
| `organization_id` | trusted tenant scope |
| `process_id`, `process_stable_key` | tenant-safe immutable Process identity |
| `version_sequence` | positive, unique, monotonically increasing per Process |
| `predecessor_version_id`, `predecessor_version_stable_key` | nullable only for the baseline; exact prior version otherwise |
| `version_kind` | `baseline` or `approved_application` |
| `snapshot_format_version` | positive integer; exactly `1` in this milestone |
| `documented_process_snapshot` | complete server-produced JSON object |
| `documented_process_fingerprint` | lowercase SHA-256 of canonical snapshot JSON |
| `effective_at` | null for the inferred baseline; required for an applied successor |
| `recorded_by_actor` | authenticated Lotura application identity that recorded the version |
| `source_review_id`, `source_review_stable_key` | null for baseline; exact completed review for an applied successor |
| `created_at` | transaction timestamp |

Required constraints and triggers:

- unique stable key and `(process_id, version_sequence)`;
- tenant-safe Process, predecessor, and source-review foreign keys;
- baseline must be sequence `1`, have no predecessor, source review, or
  asserted effective time;
- an approved-application version must have the immediately preceding version
  as predecessor and the exact source review;
- an application effective time must not be in the future and must not precede
  the prior known effective time;
- snapshot must be an object, format must be `1`, and fingerprint must be 64
  lowercase hexadecimal characters;
- UPDATE and DELETE always fail; and
- insertion validates one linear Process-local chain. The application service
  also locks the Process row, so concurrent attempts serialize before this
  trigger is evaluated.

The baseline `recorded_by_actor` identifies who recorded the previously
existing state in version history. It does not invent authorship of that prior
state.

### `operating_model_proposal_applications`

Create an immutable application ledger containing:

- generated ID and stable key;
- Organization and Process ID/stable key;
- exact review and mapping ID/stable key plus frozen mapping revision;
- the review's documented-Process fingerprint;
- exact before and resulting Process version ID/stable key;
- package reason and effective time;
- authenticated application actor; and
- transaction timestamp.

Use tenant-safe foreign keys to the exact review, mapping, Process, and version
rows. A unique constraint on the review identity makes one successful
application per review a database invariant. UPDATE and DELETE always fail.

### `operating_model_proposal_application_items`

Create an immutable provenance ledger containing:

- generated ID and stable key;
- exact application ID/stable key;
- exact review-decision ID/stable key;
- exact mapping-item revision ID/stable key and durable item stable key;
- deterministic application sequence;
- typed Discovery mapping action;
- `operating_model_change_kind` classification;
- canonical before and after JSON objects; and
- transaction timestamp.

Tenant-safe foreign keys bind every row to its application, current approved
decision, and exact mapping-item revision. Unique application/item and
application/sequence constraints prevent duplication. `preserve_unresolved`
is rejected. UPDATE and DELETE always fail.

A deferred completeness trigger validates at commit that the application has
exactly one provenance row for every and only current approved item revision
in the finished review. Rejected, needs-validation, withdrawn, superseded, and
unresolved items cannot appear.

## 3. Version snapshot format 1

Do not store the current Discovery comparison snapshot unchanged as the
version snapshot. That existing projection is appropriate for stale-review
comparison, but its displayed IDs are runtime database keys such as
`process:1`; the durable version contract requires canonical stable keys.

Keep the existing Discovery fingerprint algorithm unchanged for compatibility
with already-finished proposals and reviews. Add a separate server-only
`ProcessVersionSnapshotV1` builder that reads the exact Organization-scoped
canonical rows inside the application transaction and emits:

```text
process
  stableKey, name, purpose, status
  ownerRole: stableKey and contemporaneous name, or null
steps[]
  stableKey, position, title, instructions
  responsibleRole: stableKey and contemporaneous name, or null
systems[]
  stableKey, name, description, type, status, usage
exceptions[]
  stableKey, name, condition, response, status
  Process Step stable key/title or null
  Owner Role stable key/name or null
dependencies[]
  stableKey, direction from the versioned Process
  source and target Process stable keys/names
  type and description
```

Arrays use fixed stable ordering: Steps by position then stable key; Systems
and Exceptions by stable key; dependencies by source stable key, target stable
key, type, then dependency stable key. A recursive canonical JSON serializer
sorts object keys before hashing. The snapshot contains no Person, Position,
Membership, RoleMandate, RoleCoverage, reporting relationship, secret,
credential, session, or unrelated personal information.

## 4. Exact application transaction

Use one checked-out `@neondatabase/serverless` `Pool` client so the full
operation can run inside an interactive `BEGIN ISOLATION LEVEL SERIALIZABLE`
transaction. Always issue `ROLLBACK` on error and release the client in a
`finally` block. No dependency change is required.

The server service performs this sequence:

1. Reauthorize private-workspace access and the separate application
   capability. Derive Organization and actor from trusted server context.
2. Lock the Process row `FOR UPDATE`; lock its current Steps, links,
   Exceptions, and dependencies, and hold shared locks on referenced Roles,
   Systems, and related Processes.
3. Lock and reload the finished review, exact mapping revision, all current
   item revisions, and every current item decision.
4. Reject an open review, a review with zero current approvals, an already
   applied review, a cross-Organization reference, a noncurrent mapping item,
   or an input classification set that is not exactly the approved item set.
5. Rebuild the existing Discovery comparison snapshot and reject unless its
   SHA-256 matches both the proposal and review fingerprints supplied by the
   server-loaded context. The client fingerprint is only compare-and-set input,
   never the source of truth. This transaction-local compatibility builder
   must reproduce the existing Discovery snapshot exactly so already-finished
   reviews remain usable; it is separate from version snapshot format 1.
6. Validate the package reason, actor, effective time, and nondecreasing
   effective-time rule. Future times fail.
7. Build and hash the complete stable-key version snapshot before mutation.
8. If no Process version exists, insert baseline version `1` with unknown
   effective time. Otherwise verify and retain the current final version as
   predecessor.
9. Derive a deterministic action order on the server: Process definition,
   existing Step changes, Step additions ordered by proposed position and item
   stable key, System links, Exception changes, then dependencies. Record the
   resulting sequence in application-item provenance.
10. Apply every approved action, rechecking all targets and guards inside the
    transaction. No target or replacement value is accepted from the client.
11. Append exact target-specific `operating_model_changes` rows using the
    item's human classification, package reason, effective time, and actor.
12. Advance `processes.updated_at` exactly once for any successful package,
    including packages whose approved writes affect only child relationships.
13. Build and hash the complete resulting stable-key snapshot.
14. Insert the successor Process version, application ledger row, and exactly
    one application-item row per approved item.
15. Commit only after the deferred completeness and immutable-chain checks
    pass.

Any rejected guard or missing row is an ordinary conflict/invalid response.
Unexpected database details are logged only as bounded codes, constraints,
operations, routines, and table names. No URL, password, evidence text, or
private record contents are logged.

## 5. Canonical action semantics

| Approved mapping action | Canonical write | Required history |
| --- | --- | --- |
| `update_process_purpose` | UPDATE `processes.purpose, updated_at` | `process / update_definition` |
| `change_process_owner` | UPDATE `processes.owner_role_id, updated_at` | `process / change_owner` |
| `add_process_step` | INSERT one Step at the reviewed position; shift existing Steps at that position and later by one | `create_step` for the new Step and `reorder_steps` for every shifted Step |
| `revise_process_step` | UPDATE Step `title, instructions, updated_at` | `process_step / update_step` |
| `change_step_responsibility` | UPDATE Step `responsible_role_id, updated_at` | `process_step / change_step_responsibility` |
| `link_existing_system` | INSERT one `process_systems` relationship | `process_system / link_system` |
| `add_process_exception` | INSERT one active Exception | `exception / create_exception` |
| `revise_process_exception` | UPDATE Exception `name, condition, response, updated_at` | `exception / update_exception` |
| `add_process_dependency` | INSERT one explicit typed dependency | `process_dependency / create_dependency` |

An approved Step insertion position is part of the reviewed action. Shifting
later Steps is therefore a deterministic consequence, not unreviewed freeform
reordering. The unique Step-order constraint is deferred during the shift, and
each affected Step receives its own before/after history event.

Owner clearing remains governed by the current Process rule: it is valid only
while the Process is Draft. Owner and responsible-role targets must be active
Operational Roles in the same Organization. Systems must be active and not
already linked. Exception Steps must belong to the same Process. Dependencies
must use the server-derived direction, related Process, and type, and must not
be self-referential or duplicate an existing relationship.

Each application-item `before_state` and `after_state` uses a bounded,
action-specific object rather than copying the whole Process snapshot:

| Action | Provenance state |
| --- | --- |
| purpose | prior/resulting purpose |
| Owner Role | prior/resulting Role stable key and contemporaneous name, or null |
| add Step | absence and requested position before; complete new Step plus every shifted Step's prior/resulting position after |
| revise Step | prior/resulting title and instructions |
| Step responsibility | prior/resulting Role stable key and name, or null |
| link System | absence before; System stable key/name and usage after |
| add Exception | absence before; complete new Exception state after |
| revise Exception | prior/resulting name, condition, response, and unchanged stable target context |
| add dependency | absence before; dependency stable key, direction, source/target Process stable keys/names, type, and description after |

The full before and after version snapshots remain authoritative for the
complete Process state. Item state explains the exact reviewed delta without
duplicating unrelated Process content.

## 6. Dedicated credential and exact privilege matrix

Use only:

- `LOTURA_PROCESS_APPLICATION_MODE=enabled`
- `LOTURA_PROCESS_APPLICATION_DATABASE_URL=<dedicated application-role URL>`

The policy fails closed unless private authenticated access and exactly one
Organization-scoped Neon source are active. The credential must target the
runtime database and endpoint and must not match `DATABASE_URL`,
`DATABASE_URL_UNPOOLED`, Structure administration, Process administration,
Discovery, Proposal Review, owner, or migration credentials.

The dedicated role receives:

```sql
GRANT SELECT ON TABLE
  processes, roles, process_steps, systems, process_systems, exceptions,
  process_dependencies, discovery_proposals, discovery_proposal_mappings,
  discovery_mapping_items, operating_model_proposal_reviews,
  operating_model_proposal_review_decisions, process_versions,
  operating_model_proposal_applications,
  operating_model_proposal_application_items
TO <process_application_role>;

GRANT UPDATE (purpose, owner_role_id, updated_at)
  ON processes TO <process_application_role>;
GRANT INSERT (organization_id, process_id, position, title, instructions,
  responsible_role_id)
  ON process_steps TO <process_application_role>;
GRANT UPDATE (position, title, instructions, responsible_role_id, updated_at)
  ON process_steps TO <process_application_role>;
GRANT INSERT (organization_id, process_id, system_id, usage)
  ON process_systems TO <process_application_role>;
GRANT INSERT (organization_id, process_id, process_step_id, name, condition,
  response, status)
  ON exceptions TO <process_application_role>;
GRANT UPDATE (name, condition, response, updated_at)
  ON exceptions TO <process_application_role>;
GRANT INSERT (organization_id, source_process_id, target_process_id,
  dependency_type, description)
  ON process_dependencies TO <process_application_role>;
GRANT INSERT (
  organization_id, process_id, process_stable_key, process_step_id,
  process_step_stable_key, system_id, system_stable_key, exception_id,
  exception_stable_key, process_dependency_id,
  process_dependency_stable_key, entity_type, target_reference, change_kind,
  change_action, before_state, after_state, reason, effective_at,
  actor_identifier
)
  ON operating_model_changes TO <process_application_role>;
GRANT INSERT (
  organization_id, process_id, process_stable_key, version_sequence,
  predecessor_version_id, predecessor_version_stable_key, version_kind,
  snapshot_format_version, documented_process_snapshot,
  documented_process_fingerprint, effective_at, recorded_by_actor,
  source_review_id, source_review_stable_key
)
  ON process_versions TO <process_application_role>;
GRANT INSERT (
  organization_id, process_id, process_stable_key, review_id,
  review_stable_key, mapping_id, mapping_stable_key, mapping_revision,
  documented_process_fingerprint, before_version_id,
  before_version_stable_key, after_version_id, after_version_stable_key,
  reason, effective_at, actor_identifier
)
  ON operating_model_proposal_applications TO <process_application_role>;
GRANT INSERT (
  organization_id, application_id, application_stable_key,
  review_id, review_stable_key, mapping_id, mapping_stable_key,
  review_decision_id, review_decision_stable_key, item_revision_id,
  item_revision_stable_key, item_stable_key, application_sequence, action,
  change_kind, before_state, after_state
)
  ON operating_model_proposal_application_items
  TO <process_application_role>;

GRANT USAGE ON SEQUENCE
  process_steps_id_seq, exceptions_id_seq, process_dependencies_id_seq,
  operating_model_changes_id_seq, process_versions_id_seq,
  operating_model_proposal_applications_id_seq,
  operating_model_proposal_application_items_id_seq
TO <process_application_role>;

GRANT SELECT ON TABLE process_versions,
  operating_model_proposal_applications,
  operating_model_proposal_application_items
TO <runtime_role>;
```

The role receives no Process INSERT/DELETE/TRUNCATE; no Step, relationship,
Exception, or dependency DELETE/TRUNCATE; no Role/System write; no review,
mapping, or evidence write; no history/version/application UPDATE or DELETE;
no Organization Structure write; and no schema, database, role, migration, or
credential-management privilege. Stable keys are excluded from every UPDATE
grant and remain trigger-protected.

## 7. Expected repository files

Implementation is expected to add or change only these logical groups:

### Schema and migration

- `db/schema.ts`
- `drizzle/0021_process_versions_atomic_application.sql`
- `drizzle/meta/0021_snapshot.json`
- `drizzle/meta/_journal.json`

### Server-only policy, data, snapshot, and mutation boundary

- new `lib/process-application-policy.mjs`
- new `lib/process-application-policy.d.mts`
- new `lib/process-version-snapshot.mjs`
- new `lib/process-version-snapshot.d.mts`
- new `lib/process-application-administration.ts`
- `lib/discovery-data.ts`
- `lib/workspace-experience.ts`

### Application experience

- `app/studio/discovery/interviews/[sessionId]/proposal-review/page.tsx`
- new `app/studio/discovery/interviews/[sessionId]/proposal-review/apply/page.tsx`
- new `app/studio/discovery/process-application-controls.tsx`
- `app/studio/discovery/actions.ts`

### Verification and documentation

- new `tests/process-versions-atomic-application.test.mjs`
- new isolated fictional migration/privilege verification assets under the
  repository's established `scripts`/test-support pattern if required
- `docs/PROCESS_VERSIONS_AND_ATOMIC_APPLICATION.md`
- `docs/WORKSPACE_DEPLOYMENT_CONTRACT.md`
- `ARCHITECTURE_DECISIONS.md` only if implementation uncovers a genuine LAD-053
  deviation; otherwise no decision rewrite

No package, public fixture, JU data, FLOW logic, Organization browser,
Structure administration, Process Family, Reference Model, or AI file should
change.

## 8. Isolated fictional verification

Before any JU migration or deployment, apply migrations `0000` through `0021`
only to the exact fictional test database and require journal `22/22`.

The isolated suite must prove:

1. migrations `0000` through `0020` remain unchanged and `0021` is additive;
2. dependency stable-key backfill is populated, unique, and immutable;
3. version snapshot format 1 is deterministic, stable-key based, and excludes
   Person/Position/coverage/reporting context;
4. first application creates exactly baseline version `1`, successor version
   `2`, one application, the exact approved item rows, canonical history, and
   canonical writes;
5. a later application creates exactly one linear successor;
6. all nine allowed typed actions produce their exact canonical and history
   semantics;
7. mixed reviews apply every and only current approved items; rejected,
   needs-validation, unresolved, withdrawn, and superseded revisions do not
   apply;
8. zero approved items create no application, version, history, or canonical
   mutation;
9. multi-Step insertion ordering is deterministic and every shifted Step is
   recorded;
10. draft-only Owner clearing, active Role/System guards, Step/Exception scope,
    self-dependency, duplicate dependency, and same-Organization checks hold;
11. feedback-loop dependencies remain allowed under LAD-007;
12. stale Process fingerprint, stale item, changed target, duplicate apply,
    future effective time, and decreasing effective time fail before commit;
13. concurrent attempts serialize and at most one application succeeds;
14. forced canonical, history, version, application, and provenance failures
    each roll back every write;
15. version, application, application-item, and operating-model history UPDATE
    and DELETE fail;
16. runtime remains read-only and can SELECT the new ledgers;
17. the application role passes every allowed operation and fails every denied
    operation in the reviewed matrix;
18. public/demo mode renders no control, a direct apply route fails closed, no
    application credential is required, and no write module initializes; and
19. repository tests, ESLint, TypeScript, Drizzle check, production build,
    `git diff --check`, and private-data/secret scans pass.

No fictional verification may persist probe rows. No JU record is created or
changed merely to exercise this milestone.

## 9. Implementation and JU rollout sequence

After this plan is approved:

1. implement migration, server boundary, UI, and tests on one feature branch;
2. complete the isolated fictional `22/22` migration and privilege proof;
3. run the full repository verification suite;
4. review, commit, push, open one PR, and merge only after checks pass;
5. return a separate JU rollout checklist showing exact shared-main commit,
   target, counts/hashes, role grants, Production-only variables, and rollback
   stops;
6. only after separate approval, apply `0021` to the dedicated JU database,
   create the dedicated JU application role, prove the privilege matrix, add
   the two JU Production-only variables, and deploy the exact shared commit;
7. perform read-only application-preview QA first; and
8. require separate approval for the first genuine JU canonical application.

Public Northstar remains on the same shared codebase, fixture-backed,
read-only, without either application variable, control, route, credential, or
JU content.

## 10. Explicitly outside v0.1

Deferred work remains: application-time cherry-picking, mapping/review rebasing,
scheduled or retrospective versions, version branches, rollback by deletion,
automatic reversal, Process creation/status/name changes, Step removal or
freeform reorder, System/Role creation, relationship removal, multi-Process
packages, AI suggestions or application, approval routing, Steward assignment,
notifications, FLOW changes, Process Families, Reference Models, drift,
Improvement records, analytics, and scores.
