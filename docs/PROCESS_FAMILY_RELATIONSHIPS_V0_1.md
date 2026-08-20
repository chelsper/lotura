# Process Family Relationships v0.1 — bounded product and architecture plan

**Status:** Implemented, deployed, and JU live-validated under LAD-059.
Migration `0026`, the reviewed Process-admin/runtime privilege boundaries,
exact-commit deployment, authenticated read-only QA, and public isolation are
complete. Rollout did not create an institutional Family relationship or infer
any inherited operating-model fact.

Process Family Relationships let Workspace Administrators place one Family in
one or more broader work contexts without changing any Process or inheriting
facts. The durable example is:

```text
Gift Processing
└── Annual Fund Gift Processing
    ├── Annual Fund Physical-Check Gift Processing
    └── Annual Fund Credit-Card Gift Processing
```

The first two lines are a broader/narrower Family relationship. The last two
lines are direct Process memberships in the narrower Family. These are
different records with different meanings.

## Decision impact

This slice follows and extends LAD-047 and LAD-055. It conflicts with neither
and lifts only LAD-055's explicit deferral of Family-to-Family relationships.
It follows LAD-008 tenant-safe constraints, LAD-009 protected retirement,
LAD-015 least privilege, LAD-018 forward-only migrations, LAD-023 history
separation, LAD-037 private Workspace Studio maintenance, LAD-046's distinction
between knowledge lifecycle and operating-model structure, and LAD-053's
separate Process-version boundary.

The current schema cannot represent the approved grouping because it has only
Family identity and Family-to-Process membership. Reusing membership would
make a Family executable; reusing dependency would claim operational reliance;
and a parent column would force one tree. One typed relationship table is the
smallest durable addition.

## Domain contract

`process_family_relationships` records one effective-dated interval:

```text
id                    database identity
organization_id       required tenant scope
stable_key             immutable UUID
relationship_type     broader_narrower
broader_family_id      required same-Organization Family
narrower_family_id     required same-Organization Family
status                 active | ended
effective_from         required asserted start
effective_until        required only when ended
created_at             transaction time
updated_at             compare-and-set revision time
```

The current graph is many-to-many and acyclic. The database rejects:

- a Family related to itself;
- more than one current relationship for the same typed pair;
- a cycle created by any current relationship;
- cross-Organization Family references;
- identity or effective-start changes;
- reopening or rewriting an ended relationship; and
- hard deletion through application roles.

Ending and later re-establishing the same relationship creates a new interval.
Family deactivation is blocked while the Family participates in a current
relationship in either direction.

## Product experience

Family detail separates three ideas:

- **Broader work contexts** — current Families that contain this grouping;
- **More specific Families** — current groupings directly beneath this one;
- **Processes directly in this Family** — explicit Process memberships only.

An administrator maintains the relationship from the narrower Family page by
choosing an existing active broader Family, recording correction versus
organizational change, effective date, and reason. The selector excludes the
current Family, an existing broader relationship, and choices that would create
a cycle. Server-side and database checks remain authoritative.

The read model may show a narrower Family's direct member Process names for
orientation. It must not call those Processes inherited members of a broader
Family or silently create direct membership there.

## History and Process versions

Relationship changes extend `operating_model_changes` with exact semantics:

```text
process_family_relationship
add_process_family_relationship
end_process_family_relationship
```

The history target has a tenant-safe foreign key to the immutable relationship
identity. Before and after JSON records the broader and narrower Family stable
keys, relationship type, status, and effective interval. Canonical mutation
and history insertion occur in one serializable transaction; history failure
rolls the relationship change back.

This history is distinct from `process_versions`. Grouping changes do not
rewrite or version a Process definition.

## Security and privilege contract

Every mutation requires authenticated private-workspace access and Workspace
Administrator capability. Organization and actor are derived on the server.
The existing Process-admin credential receives only:

```sql
GRANT SELECT ON TABLE process_family_relationships
TO <process_admin_role>;

GRANT INSERT (
  organization_id, relationship_type, broader_family_id,
  narrower_family_id, status, effective_from
) ON process_family_relationships TO <process_admin_role>;

GRANT UPDATE (
  status, effective_until, updated_at
) ON process_family_relationships TO <process_admin_role>;

GRANT INSERT (
  organization_id, process_family_relationship_id,
  process_family_relationship_stable_key, entity_type, target_reference,
  change_kind, change_action, before_state, after_state, reason,
  effective_at, actor_identifier
) ON operating_model_changes TO <process_admin_role>;

GRANT USAGE ON SEQUENCE process_family_relationships_id_seq
TO <process_admin_role>;
```

Runtime receives SELECT only. Neither role receives DELETE/TRUNCATE, history
UPDATE/DELETE, schema/database/role administration, Process mutation expansion,
or Organization Structure privileges. No new credential or environment
variable is introduced. Public/demo mode has no authoring path or content.

## Migration and rollout boundary

The generic implementation uses forward-only migration `0026`. Migrations
`0000`–`0025` remain unchanged. The migration creates no Family or relationship
data and changes no Process, membership, dependency, version, discovery, or
fixture row.

Before any institutional rollout, isolated fictional verification must prove:

1. journal advancement from 26/26 to 27/27;
2. stable identity and effective-dated lifecycle;
3. multiple broader and narrower contexts;
4. self, duplicate, cross-Organization, and cycle rejection;
5. stale-write protection;
6. atomic relationship/history rollback;
7. append-only history and hard-delete denial;
8. exact Process-admin privileges and runtime read-only behavior;
9. no automatic membership, inheritance, dependency, or Process version;
10. public/disabled authoring failure; and
11. zero persisted fictional probes.

JU migration, role enablement, exact-commit deployment, and authenticated
read-only QA are complete. The first institutional broader/narrower Family
relationship remains a deliberate Workspace Administrator action. The rollout
did not create **Annual Fund Gift Processing** or change an existing JU Family
or membership automatically.

## Explicit deferrals

- primary Family or mandatory single parent;
- inheritance or automatic ancestor membership;
- reusable subprocess composition;
- Discovery evidence reuse or new-Process creation;
- Reference Models and comparison;
- governance workflow, stewardship, notifications, and tasks;
- FLOW calculations and AI classification; and
- public Northstar Family content.
