# Organization Structure Administration v0.1

Organization Structure Administration maintains Lotura’s canonical current
structure without rewriting the source workbook or its import ledger. It is
intentionally small: an authorized administrator may correct the displayed name of an
Organization Unit, Position, or Person; move a Position to a reviewed
Organization Unit; end or replace a Position Assignment; end or correct a
reporting relationship; or remove an eligible canonical record from the current
structure.

## Truth and history boundaries

- The source workbook and its import-ledger fingerprint remain unchanged. Source
  rows remain external; Lotura does not rewrite them.
- A correction records that the canonical record should be interpreted
  differently from its imported presentation.
- An organizational change records that the organization itself changed.
- Every accepted change appends Organization, entity type, immutable target
  stable key, action, change classification, reason, effective timestamp, actor
  identifier, transaction timestamp, and before/after canonical state to
  `organization_structure_changes`.
- Change-ledger rows cannot be updated or deleted.
- Stable keys never change.
- “Remove from current structure” is not a hard delete. Organization Units and
  Positions are retired; People are made inactive. Their identities, import
  provenance, and history remain.

Removal fails closed while current or scheduled structural records still
depend on the target. Those Assignments, reporting relationships, child Units,
Positions, Role Mandates, or Role Coverage records must first be ended or
reassigned explicitly. Lotura never silently cascades away structural history.

An Assignment replacement ends the prior Assignment and creates the replacement
inside the same audited transaction. A reporting correction may correct the
manager Position, relationship type, or source context without changing Process
responsibility. An organizational reporting change ends the old relationship;
it does not rewrite the relationship as though the prior structure never
existed.

Every form carries the canonical record's last observed `updated_at` revision.
The write statement compares that revision again and rejects a stale edit. This
is deterministic compare-and-set protection, not collaborative editing.

## Runtime security boundary

Administration is disabled unless all of these conditions are true:

1. `LOTURA_STRUCTURE_ADMIN_MODE=enabled` is set server-side.
2. The workspace uses `LOTURA_AUTH_MODE=temporary-password`.
3. The source is a single organization-scoped Neon workspace.
4. `LOTURA_STRUCTURE_ADMIN_DATABASE_URL` contains a dedicated credential.

The administration URL is never returned to the client and is never replaced
by `DATABASE_URL` or `DATABASE_URL_UNPOOLED`. Configuration fails when it reuses
the runtime or owner/migration database role, including when pooled and direct
hostnames differ. It also fails when the write credential does not target the
same database and Neon endpoint as the runtime source; pooled and direct forms
of that endpoint are treated as equivalent. The proxy validates signed sessions
and routing only; it does not import the administration layer or open a database
connection.

Every Server Action is treated as an independently reachable mutation entry
point. The server-only mutation layer revalidates the signed private-workspace
session, administration mode, configured Neon source, and configured
Organization before opening the dedicated write connection. Organization ID
and actor identity never come from form data. Every target and related record is
looked up again using that trusted Organization ID.

The dedicated administration role receives only:

- `CONNECT` to the intended database and `USAGE` on the application schema;
- `SELECT` on `people`, `organization_units`, `positions`,
  `position_assignments`, `position_reporting_relationships`, `role_mandates`,
  and `role_coverages` for scoped validation and dependency checks;
- column-level `UPDATE` only on `people` (`display_name`, `status`,
  `updated_at`), `organization_units` (`name`, `status`, `status_reason`,
  `effective_until`, `updated_at`), and `positions` (`title`,
  `organization_unit_id`, `status`, `status_reason`, `effective_until`,
  `updated_at`);
- column-level `UPDATE` on `position_assignments` (`status`,
  `effective_until`, `updated_at`) and `position_reporting_relationships`
  (`manager_position_id`, `relationship_type`, `status`, `effective_until`,
  `reason`, `updated_at`);
- column-level `INSERT` on `position_assignments` (`organization_id`,
  `position_id`, `person_id`, `assignment_type`, `status`, `effective_from`,
  `reason`);
- column-level `INSERT` on `organization_structure_changes` for the audited
  Organization, entity target, action, before/after state, reason, effective
  time, and actor fields;
- `USAGE` on `position_assignments_id_seq` and
  `organization_structure_changes_id_seq`.

The normal SELECT-only runtime role receives `SELECT` on
`organization_structure_changes` so authorized pages can display history. The
structural-write role does not require `SELECT` on that table.

The reviewed grant template is:

```sql
GRANT CONNECT ON DATABASE <database_name> TO <structure_admin_role>;
GRANT USAGE ON SCHEMA public TO <structure_admin_role>;

GRANT SELECT ON TABLE
  people,
  organization_units,
  positions,
  position_assignments,
  position_reporting_relationships,
  role_mandates,
  role_coverages
TO <structure_admin_role>;

GRANT UPDATE (display_name, status, updated_at)
  ON people TO <structure_admin_role>;
GRANT UPDATE (name, status, status_reason, effective_until, updated_at)
  ON organization_units TO <structure_admin_role>;
GRANT UPDATE (
  title, organization_unit_id, status, status_reason, effective_until, updated_at
) ON positions TO <structure_admin_role>;
GRANT UPDATE (status, effective_until, updated_at)
  ON position_assignments TO <structure_admin_role>;
GRANT INSERT (
  organization_id, position_id, person_id, assignment_type,
  status, effective_from, reason
) ON position_assignments TO <structure_admin_role>;
GRANT UPDATE (
  manager_position_id, relationship_type, status,
  effective_until, reason, updated_at
) ON position_reporting_relationships TO <structure_admin_role>;
GRANT INSERT (
  organization_id, entity_type, target_stable_key,
  organization_unit_id, position_id, person_id,
  change_kind, change_action, before_state, after_state,
  reason, effective_at, actor_identifier
) ON organization_structure_changes TO <structure_admin_role>;

GRANT USAGE ON SEQUENCE
  position_assignments_id_seq,
  organization_structure_changes_id_seq
TO <structure_admin_role>;

GRANT SELECT ON TABLE organization_structure_changes TO <runtime_read_role>;
```

It receives no table-wide `INSERT` or `UPDATE`, and no `DELETE`, `TRUNCATE`,
schema creation, database creation, role management, ownership, migration, or
operating-model write privileges. It receives neither `UPDATE` nor `DELETE` on
`organization_structure_changes`; migration `0007` also rejects either action
with an immutable-history trigger.

## Transaction and audit integrity

Each canonical mutation and its history insertion are data-modifying CTEs in
one serializable database transaction. The history insertion reads from the
successful changed-row CTE. A stale revision or failed dependency condition
therefore creates neither a structural change nor history. A history constraint,
privilege, or insertion failure rolls back the structural mutation.

The recorded before/after state contains only the canonical fields needed to
explain the change. Passwords, session tokens, database credentials, source
workbook contents, and unrelated personal data are not accepted or recorded.

The shared-code environment boundary is defined in
[WORKSPACE_DEPLOYMENT_CONTRACT.md](WORKSPACE_DEPLOYMENT_CONTRACT.md).

## v0.1 limitations

- No bulk changes, merges, standalone Position/Person/Unit creation,
  reactivation, or Role Mandate/Role Coverage editing is included.
- An effective date is accepted only for a present or past change. Future
  scheduling is deferred.
- Ending or reassigning dependent records needs a separately reviewed
  administration milestone.
- Temporary-password access remains a pilot control, not the final enterprise
  authorization model. SSO, durable per-user authorization, and durable rate
  limiting remain required before broader institutional administration.
