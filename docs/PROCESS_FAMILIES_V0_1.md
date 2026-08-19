# Process Families v0.1 — bounded product and architecture plan

**Status:** Accepted under LAD-055; the bounded generic implementation is
present on the Process Families feature branch and has passed repository-level
verification. Isolated database verification, merge, migration application,
credential changes, environment changes, deployment, public-demo content, and
JU data remain separately controlled release actions.

**Later extension — August 18, 2026:** LAD-059 authorizes a separate typed,
non-inheriting broader/narrower Family graph. That bounded extension is defined
in [PROCESS_FAMILY_RELATIONSHIPS_V0_1.md](PROCESS_FAMILY_RELATIONSHIPS_V0_1.md).
References below to deferred nesting or hierarchy describe the original
membership release and are preserved as its historical implementation boundary.

Process Families let an organization group related Processes without turning
the grouping into an executable Process, a dependency, or a source of inherited
facts. The initial product outcome is simple:

> A person can understand which Processes belong to a broader area of work and
> can maintain that grouping without changing how any member Process operates.

The durable example is:

```text
Gift Processing
├── Annual Fund Physical-Check Gift Processing
└── Annual Fund Credit Card Gift Processing
```

The two member Processes remain independently named, owned, versioned, and
maintained. Membership alone creates no shared Step, Role, System, Exception,
dependency, governance assignment, approval, or conclusion.

## Decision impact

This plan follows or extends the following accepted decisions:

| Decision | Relationship to this plan |
| --- | --- |
| LAD-003 | Follows the one-product, isolated-Organization model; no JU-specific titles or behavior enter shared code. |
| LAD-004 | Extends the operating model only because the current schema cannot represent durable family identity or membership. |
| LAD-006 and LAD-007 | Follows the explicit meanings of Process ownership, Step responsibility, Systems, Exceptions, and dependencies; family membership supplies none of them. |
| LAD-008 | Follows composite same-Organization constraints and server-derived Organization scope. |
| LAD-009 | Follows retirement and protected deletion; Families and memberships are never hard-deleted through the application. |
| LAD-015 and LAD-016 | Follows server-only least privilege, consistent reads, and fail-closed behavior. |
| LAD-018 | Follows forward-only migration and isolated fictional verification requirements. |
| LAD-023 | Follows the distinction between Process versions and other history; family grouping does not rewrite a Process version. |
| LAD-026 | Narrows identity, lifecycle, history, authorization, and migration semantics before introducing tables. |
| LAD-035 through LAD-037 | Follows multidimensional governance and makes Workspace Studio the authorized maintenance surface. |
| LAD-046 | Follows the separation between knowledge lifecycle and operating-model structure. |
| LAD-047 | Narrows the accepted Process Family direction into an implementable v0.1 contract. |
| LAD-048 | Preserves a future explicit attachment point for Reference Models without implementing references now. |
| LAD-051 and LAD-053 | Leaves Knowledge Outcomes, proposals, approvals, applications, and Process versions unchanged. |

The plan conflicts with no accepted decision and supersedes none. LAD-055 was
recorded because LAD-047 deliberately deferred cardinality, effective dating,
history, governance, security, and migration details.

## Why the current schema is insufficient

The current schema has durable `processes` and directed
`process_dependencies`, but no record representing a family or membership.
The missing concept cannot be represented truthfully by:

- adding `parent_process_id` to `processes`, which would impose one tree and
  make a Family look executable;
- reusing `process_dependencies`, which would turn grouping into operational
  reliance;
- storing a tag or name in Process JSON, which would lack durable identity,
  tenant-safe references, lifecycle, and history; or
- making the broad family an ordinary Process, which would invite invented
  Steps, ownership, and inheritance.

A small forward-only schema addition is therefore required for implementation.
Existing Processes require no backfill and remain honestly ungrouped until a
human records a membership.

## Product boundary

### Included in v0.1

An authenticated Workspace Administrator can:

- browse current Process Families;
- create a Family with a name and optional plain-language description;
- edit the Family name or description;
- add an existing same-Organization Process to a Family;
- end a current membership without deleting its history;
- inactivate an empty Family; and
- inspect append-only Family and membership change history.

The read experience can:

- show each Family's current member Processes;
- show each member's existing status, Owner Role, and current documented
  counts as context;
- show one Process in every current Family to which it belongs; and
- navigate between a Family and each member Process.

### Explicitly outside v0.1

- inherited Steps, Roles, Systems, Exceptions, dependencies, governance, or
  conclusions;
- a parent Process field or Family-to-Family nesting;
- reusable subprocess composition;
- automatic membership inferred from names, shared technology, Roles, Units,
  dependencies, or interview text;
- one mandatory or primary Family;
- comparison conclusions, similarity scores, common-Step detection, or merged
  documentation;
- Reference Models or standards comparison;
- Discovery mapping actions that create or change Family membership;
- Family approval, Steward assignment, notifications, or workflow;
- scheduled memberships, bulk moves, imports, deletion, or restoration;
- FLOW calculation changes; and
- public Northstar Family content or fixture changes.

## Exact user experience

### Process Families home

Workspace Studio gains **Process Families** because the page offers useful
browsing and creation. The route is:

```text
/studio/process-families
```

The page shows:

- Family name and description;
- current member count;
- member Process statuses as context, without a score;
- search by Family or member Process name;
- **Add Process Family** for an authorized administrator; and
- an honest empty state explaining that no groupings have been recorded.

It must not label a Family approved merely because it exists or is current.
Internal `active` status should be presented as **Current grouping**, not as an
institutional approval.

### Family detail and maintenance

The route is:

```text
/studio/process-families/[stableKey]
```

It shows:

- name and description;
- current member Processes;
- each member's own working-draft/active/archived status;
- Owner Role only where the Process already records one;
- history for the Family and its memberships;
- **Add existing Process**; and
- **End membership** or **Inactivate Family** where valid.

Adding a member uses a searchable selector of existing Processes in the same
Organization. It never creates a Process, changes its status, or edits its
definition. Inactivation is blocked until current memberships have been ended.

### Process context

Process Detail and Process Builder may show **Process Families** as contextual
navigation. If none are recorded, the wording is **No Process Family has been
recorded** rather than **Unassigned** or **Missing**, because membership is not
universally required.

The Family view may list member facts side by side for comprehension, but v0.1
must not call differences gaps, drift, conflicts, or best practices.

## Smallest durable domain model

### `process_families`

One durable same-Organization grouping identity:

```text
id                 database identity
organization_id    required tenant scope
stable_key          immutable random UUID
name                required, trimmed, nonblank
description         optional plain-language grouping scope
status              active | inactive
created_at          transaction time
updated_at          compare-and-set revision time
```

Names should be case-insensitively unique within an Organization. Reusing the
name of an inactive Family should require restoring or deliberately renaming
the durable record rather than creating a look-alike identity. The application
does not hard-delete Families.

### `process_family_memberships`

One durable interval connecting one Process and one Family:

```text
id                   database identity
organization_id      required tenant scope
stable_key            immutable random UUID
process_family_id     required same-Organization Family
process_id            required same-Organization Process
status                active | ended
effective_from        required asserted start
effective_until       required only when ended
created_at            transaction time
updated_at            compare-and-set revision time
```

The model is intentionally many-to-many. One Process may be a current member of
more than one Family, but the same Process/Family pair may have only one active
membership. Ending and later re-establishing a relationship creates a new
membership interval rather than reopening or overwriting an ended row.

Required constraints include:

- same-Organization composite foreign keys to Family and Process;
- immutable stable keys;
- one active row per Process/Family pair;
- active rows have no `effective_until`;
- ended rows have `effective_until` not earlier than `effective_from`;
- no application DELETE or TRUNCATE; and
- no implicit effect on Process status, definition, or version.

Multiple membership is the least constraining durable choice. Imposing one
Family now would recreate a tree and require a later destructive cardinality
change if an organization needs overlapping groupings. v0.1 does not add a
`primary` flag because its semantics and governance are not established.

## History and version semantics

Family changes are operating-model changes, so v0.1 should extend the existing
append-only `operating_model_changes` ledger rather than create a second audit
system. The forward-only history vocabulary should add exact target types and
actions such as:

```text
process_family
process_family_membership

create_process_family
update_process_family
deactivate_process_family
add_process_family_membership
end_process_family_membership
```

History target columns and composite foreign keys must retain exact Family,
membership, Process, Organization, and stable-key context. Each successful
mutation records:

- Organization;
- exact stable target identity;
- before and after state;
- correction versus organizational change;
- reason;
- asserted effective time;
- authenticated Lotura actor; and
- transaction time.

Canonical mutation and history insertion occur in one transaction. A forced
history failure rolls back the Family or membership mutation. History remains
immutable to every application role.

Family or membership changes do **not** create a `process_version`. LAD-053's
Process snapshot represents the executable documented Process definition.
Family membership is grouping context outside that definition. A future Family
version or comparison snapshot requires separate evidence and approval.

## Governance and authority

v0.1 does not add Family Owner, Steward, Approver, or governance fields.
Workspace Administrator capability permits bounded maintenance; it does not
prove institutional approval of the grouping.

The history actor is the authenticated Lotura application identity at the time
of the change. It is not coupled to Person, Position, Membership, Process
Owner, Operational Role, RoleMandate, RoleCoverage, or reporting hierarchy.

Discovery evidence may later support a proposed Family change, but v0.1 does
not add a structured mapping or application action for Families. A human may
maintain current grouping directly through Workspace Studio with an honest
reason and classification, just as current administrative authoring does.

## Security and write boundary

Every mutation must:

- require authenticated private-workspace access;
- require Workspace Administrator capability;
- derive Organization scope and actor identity on the server;
- reject cross-Organization Process or Family keys;
- use compare-and-set protection;
- lock and re-check current status and duplicate membership inside the
  transaction;
- use the dedicated Process-admin credential;
- insert append-only history in the same transaction; and
- fail closed outside the explicitly enabled private authoring environment.

No new credential or environment variable is justified. The existing
Process-admin role may receive only this reviewed delta:

- SELECT and INSERT on `process_families` and
  `process_family_memberships`;
- column-limited UPDATE of Family name, description, status, and `updated_at`;
- column-limited UPDATE of membership status, `effective_until`, and
  `updated_at`;
- sequence use for the two new tables; and
- exact column-limited INSERT into the extended operating-model history
  target.

It receives no hard-delete, TRUNCATE, history UPDATE/DELETE, Process-definition
write expansion, Organization Structure mutation, generic Role/System change,
schema, database, role, credential, or migration privilege. The runtime role
may receive SELECT on the new tables. Public Northstar receives neither the
credential nor the private routes.

## Migration and compatibility plan

The accepted implementation includes one forward-only migration that:

1. create the bounded membership-status enum;
2. create `process_families` and `process_family_memberships`;
3. add stable-key immutability and membership lifecycle safeguards;
4. expand operating-model history target/action enums forward-only;
5. add exact tenant-safe Family and membership history references;
6. extend the history target-shape constraint; and
7. add only the required indexes and uniqueness constraints.

The expected next migration is `0023`. Migrations `0000` through `0022` remain
unchanged. The migration performs no backfill and leaves both new tables empty.
Existing Process IDs, stable keys, routes, definitions, dependencies, history,
and Process versions remain unchanged.

## Coherent implementation slices

### Slice A — identity, history, and read model

- accepted LAD-055 and detailed implementation contract;
- migration `0023` and schema definitions;
- Organization-scoped read projection;
- Family browser and detail pages with honest empty states; and
- public and disabled-capability fail-closed protection.

### Slice B — Family and membership maintenance

- create/update/inactivate Family;
- add/end membership;
- stale-write and dependency guards;
- atomic append-only history; and
- exact Process-admin privilege delta.

### Slice C — Process context and rollout

- Family context on Process Builder and Process Detail;
- isolated fictional database verification;
- shared-code review and merge;
- separately approved JU migration/role/deployment sequence; and
- separately approved first JU Family and membership, if warranted.

The slices may ship in one small release if review remains coherent, but each
boundary should remain independently testable.

## Expected implementation files

The precise diff should be confirmed before coding, but implementation is
expected to touch:

- `ARCHITECTURE_DECISIONS.md` and this plan;
- `PRODUCT_ROADMAP.md`, `docs/domain-model.md`, and
  `docs/WORKSPACE_STUDIO.md`;
- `db/schema.ts`;
- `drizzle/0023_process_families.sql` and Drizzle journal metadata;
- a bounded Process Family read model and Neon adapter under `lib/`;
- a bounded Process Family administration policy/service under `lib/`;
- Workspace Studio Family routes, components, and server actions under
  `app/studio/process-families/`;
- Process Builder and Process Detail contextual presentation;
- the deployment/privilege contract documentation; and
- focused schema, policy, administration, UI, isolation, history, and public
  regression tests.

No fixture change is required for the private v0.1 milestone.

## Isolated verification strategy

Before any institutional rollout, the exact committed migration and
application SQL must be exercised in the fictional schema-test database. The
verification should prove:

1. migration journal advances from `23/23` to `24/24`;
2. existing business-table counts and deterministic hashes are unchanged;
3. Family and membership stable keys are populated, unique, and immutable;
4. two Families can contain the same Process without implying hierarchy;
5. duplicate active membership for the same pair is rejected;
6. cross-Organization membership and history references are rejected;
7. dependency rows and Process versions remain unchanged;
8. no Step, Role, System, Exception, owner, or governance fact is inherited;
9. stale writes fail;
10. forced history failure rolls back every canonical mutation;
11. history UPDATE and DELETE fail;
12. Family/membership DELETE and TRUNCATE fail;
13. runtime remains read-only and Process-admin cannot broaden its authority;
14. public/demo mode cannot initialize or invoke authoring;
15. ordinary-language UX and accessibility tests pass; and
16. every fictional probe rolls back and persists no rows.

Repository verification should include tests, ESLint, TypeScript, Drizzle
check, production build, `git diff --check`, fixture/private-data scan, and
GitHub/Vercel checks.

## JU enablement sequence

JU remains a separate approval after shared implementation and isolated tests:

1. verify exact project, branch, database, Organization 1, and journal `23/23`;
2. capture deterministic baseline counts and hashes;
3. apply only migration `0023` with protected direct owner access;
4. verify journal `24/24`, empty Family tables, new constraints/triggers, and
   unchanged existing data;
5. grant and prove only the reviewed Process-admin/runtime privilege delta;
6. prove history immutability, tenant isolation, hard-delete denial, and forced
   rollback with transactional fictional probes;
7. deploy the JU project on the exact shared merge commit without adding a new
   environment variable;
8. perform read-only private QA and public-isolation regression; and
9. stop before creating a real Family or membership.

The first potential JU validation remains a separately approved action:

```text
Gift Processing
└── Annual Fund Physical-Check Gift Processing
```

The administrator would still need to approve the exact Family name,
description, change classification, reason, effective date, and membership.
Lotura must not infer that grouping merely because the example appears in
product documentation.

## Remaining release gates

LAD-055 and the bounded generic implementation are approved. Before merge, the
exact migration and application SQL still require rollback-only verification
against the isolated fictional database. That verification must cover the
many-to-many/no-primary/no-nesting cardinality, exact history shape,
Process-admin/runtime privilege boundary, stale writes, tenant isolation,
atomic rollback, and zero persisted probes.

JU migration, JU privilege enablement, JU deployment, and the first canonical
Family/membership remain subsequent explicit approvals. No approval of the
generic feature implies any institutional grouping.
