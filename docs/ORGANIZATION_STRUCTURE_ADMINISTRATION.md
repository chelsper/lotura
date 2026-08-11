# Organization Structure Administration v0.1

Organization Structure Administration maintains Lotura’s canonical current
structure without rewriting the source workbook or its import ledger. It is
intentionally bounded: an authorized administrator may create an Organization
Unit, Position, or Person; correct its displayed name; assign, change, or remove a Unit's
parent; move a Position to a reviewed Organization Unit; end or replace a
Position Assignment; establish an initial Position Assignment; establish,
replace, end, or correct a Position reporting
relationship; explicitly establish or end a Position-to-Operational-Role
mandate; explicitly establish or end Person-level Role Coverage; or remove an
eligible canonical record from the current structure.

Responsibility Builder additionally permits an authorized administrator to
correct an Operational Role name or description and to remove an eligible Role
from the current responsibility model. A Role retains its immutable stable key
through every correction. A new Role is still created only with its first
explicit Position mandate, and that transaction records separate Role-creation
and Position-mandate history events.

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
  Positions are retired; People and Operational Roles are made inactive. Their
  identities, import provenance where applicable, and history remain.

Removal fails closed while current or scheduled structural records still
depend on the target. Those Assignments, reporting relationships, child Units,
Positions, Role Mandates, or Role Coverage records must first be ended or
reassigned explicitly. Lotura never silently cascades away structural history.

### Merging duplicate Organization Units

**Merge into existing Unit** is separate from rename, hierarchy movement, and
moving one Position. The administrator selects the surviving active Unit and
reviews the direct Positions, child Units, and current occupants affected.

One serializable transaction moves the source Unit's direct Positions to the
survivor, reparents its direct child Units, and retires the source Unit. It
does not rewrite People, Position Assignments, reporting relationships, Role
Mandates, Role Coverage, Process ownership, or operational responsibility.
Both Unit stable keys and all import provenance remain available historically.
The merge and each affected canonical relationship append history atomically;
any stale review set or failed history event rolls back the entire operation.
No other structural or operating-model relationship changes during the merge.
Migration `0013` adds only the append-only `merge_unit` history action. The
operation reuses the structural administrator's already reviewed column-level
Unit, Position, and history privileges; it requires no broader database grant.

An Organization Unit parent records Unit hierarchy only. It never creates a
manager relationship, Process ownership, or operational responsibility. Unit
parent changes reuse the existing same-Organization foreign key and deferred
cycle trigger; self-parent and multi-level cycles fail before commit.
Workspace Studio exposes this existing relationship as an expandable Unit tree,
full hierarchy paths, direct-child navigation, and an in-context Add child Unit
action. The selected parent is passed only as an initial stable-key choice; the
server revalidates Organization scope, lifecycle state, duplicate context, and
cycle safety inside the audited write transaction.

An Assignment replacement ends the prior Assignment and creates the replacement
inside the same audited transaction. A reporting correction may correct the
manager Position, relationship type, or source context without changing Process
responsibility. Establishing a primary manager creates an explicit
Position-to-Position relationship. Replacing a primary manager ends the prior
relationship and creates the new relationship in one audited transaction; it
does not rewrite the prior structure as though it never existed. Current Person
occupants are display context only. A Person with more than one Position has
each Position's reporting relationship maintained independently.

An Operational Role mandate is an explicit allocation of durable responsibility
to a Position. The administrator may select an existing active Operational Role
or create one only as part of establishing its first mandate. Lotura does not
derive the Role from the Position title, Unit, occupants, or reporting line.
Shared mandates require a documented scope. Ending a mandate is blocked until
all current or scheduled Role Coverage has been ended explicitly.

Role Coverage is an explicit Person-to-mandate relationship. Position occupancy
is shown as context but is never copied automatically. Permanent, interim,
acting, delegated, and backup coverage remain distinct; every non-permanent
coverage record requires its own reason. Ending coverage does not change the
Person's Position Assignment or reporting relationships.

Every form carries the canonical record's last observed `updated_at` revision.
The write statement compares that revision again and rejects a stale edit. This
is deterministic compare-and-set protection, not collaborative editing.

Workspace Studio is the primary authoring surface for these capabilities. The
Organization browser remains an understanding surface and links authorized
administrators into the matching stable-key Studio record. Creating a Person
does not create a User or login. Creating a Position never creates an
Operational Role. Creating or parenting a Unit never creates reporting or
Process ownership. Exact same-context names and titles require an explicit
possible-duplicate acknowledgment because duplicate names may still be valid
organizational facts.

## Governance boundary

Direct canonical maintenance is a Workspace Administrator capability. It is
not the normal contribution path for employees, Process participants,
managers, or executives, and none of those identities receives administration
authority from reporting hierarchy or Position title.

The temporary private-pilot administrator represents one tightly controlled
Workspace Administrator only. Every accepted action remains scoped and
audited; the administrator cannot bypass or erase the change ledger.

Future Contributors should normally use **Suggest an update** so evidence,
review, cross-functional effects, and approval remain explicit. That proposal
and governance workflow is intentionally not implemented by this v0.1
administration boundary. Leadership analysis, Process approval, Stewardship,
and Workspace Administration remain independent concepts as defined in
[GOVERNANCE_AND_STEWARDSHIP.md](../GOVERNANCE_AND_STEWARDSHIP.md).

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
  `position_assignments`, `position_reporting_relationships`, `roles`,
  `role_mandates`, `role_coverages`, `role_assignments`, `processes`,
  `process_steps`, `exceptions`, and `systems` for scoped validation and
  dependency checks;
- column-level `UPDATE` only on `people` (`display_name`, `status`,
  `updated_at`), `organization_units` (`name`, `status`, `status_reason`,
  `parent_organization_unit_id`, `effective_until`, `updated_at`), and `positions` (`title`,
  `organization_unit_id`, `status`, `status_reason`, `effective_until`,
  `updated_at`);
- column-level `INSERT` on `people` (`organization_id`, `display_name`,
  `status`), `organization_units` (`organization_id`, `name`,
  `parent_organization_unit_id`, `is_provisional`, `status`,
  `effective_from`), and `positions` (`organization_id`,
  `organization_unit_id`, `title`, `status`, `effective_from`);
- column-level `UPDATE` on `position_assignments` (`status`,
  `effective_until`, `updated_at`) and `position_reporting_relationships`
  (`manager_position_id`, `relationship_type`, `status`, `effective_until`,
  `reason`, `updated_at`);
- column-level `INSERT` on `position_assignments` (`organization_id`,
  `position_id`, `person_id`, `assignment_type`, `status`, `effective_from`,
  `reason`);
- column-level `INSERT` on `position_reporting_relationships`
  (`organization_id`, `subordinate_position_id`, `manager_position_id`,
  `relationship_type`, `status`, `effective_from`, `reason`);
- column-level `INSERT` on `roles` (`organization_id`, `name`, `description`,
  `status`) only when the Role is created with its first mandate;
- column-level `UPDATE` on `roles` (`name`, `description`, `status`,
  `updated_at`) for stable-key-preserving definition maintenance and
  dependency-aware inactivation;
- column-level `INSERT` on `role_mandates` (`organization_id`, `position_id`,
  `role_id`, `mandate_type`, `scope`, `status`, `effective_from`, `reason`) and
  column-level `UPDATE` on `status`, `effective_until`, and `updated_at`;
- column-level `INSERT` on `role_coverages` (`organization_id`,
  `role_mandate_id`, `person_id`, `coverage_type`, `status`, `effective_from`,
  `reason`) and column-level `UPDATE` on `status`, `effective_until`, and
  `updated_at`;
- column-level `INSERT` on `organization_structure_changes` for the audited
  Organization, entity target, action, before/after state, reason, effective
  time, and actor fields;
- `USAGE` on `people_id_seq`, `organization_units_id_seq`,
  `positions_id_seq`, `position_assignments_id_seq`,
  `position_reporting_relationships_id_seq`, `roles_id_seq`,
  `role_mandates_id_seq`, `role_coverages_id_seq`, and
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
  roles,
  role_mandates,
  role_coverages,
  role_assignments,
  processes,
  process_steps,
  exceptions,
  systems
TO <structure_admin_role>;

GRANT UPDATE (display_name, status, updated_at)
  ON people TO <structure_admin_role>;
GRANT INSERT (organization_id, display_name, status)
  ON people TO <structure_admin_role>;
GRANT UPDATE (
  name, parent_organization_unit_id, status, status_reason,
  effective_until, updated_at
)
  ON organization_units TO <structure_admin_role>;
GRANT INSERT (
  organization_id, name, parent_organization_unit_id,
  is_provisional, status, effective_from
) ON organization_units TO <structure_admin_role>;
GRANT UPDATE (
  title, organization_unit_id, status, status_reason, effective_until, updated_at
) ON positions TO <structure_admin_role>;
GRANT INSERT (
  organization_id, organization_unit_id, title, status, effective_from
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
GRANT INSERT (organization_id, name, description, status)
  ON roles TO <structure_admin_role>;
GRANT UPDATE (name, description, status, updated_at)
  ON roles TO <structure_admin_role>;
GRANT INSERT (
  organization_id, position_id, role_id, mandate_type, scope,
  status, effective_from, reason
) ON role_mandates TO <structure_admin_role>;
GRANT UPDATE (status, effective_until, updated_at)
  ON role_mandates TO <structure_admin_role>;
GRANT INSERT (
  organization_id, role_mandate_id, person_id, coverage_type,
  status, effective_from, reason
) ON role_coverages TO <structure_admin_role>;
GRANT UPDATE (status, effective_until, updated_at)
  ON role_coverages TO <structure_admin_role>;
GRANT INSERT (
  organization_id, subordinate_position_id, manager_position_id,
  relationship_type, status, effective_from, reason
) ON position_reporting_relationships TO <structure_admin_role>;
GRANT INSERT (
  organization_id, entity_type, target_stable_key,
  organization_unit_id, position_id, person_id, role_id,
  change_kind, change_action, before_state, after_state,
  reason, effective_at, actor_identifier
) ON organization_structure_changes TO <structure_admin_role>;

GRANT USAGE ON SEQUENCE
  people_id_seq,
  organization_units_id_seq,
  positions_id_seq,
  position_assignments_id_seq,
  position_reporting_relationships_id_seq,
  roles_id_seq,
  role_mandates_id_seq,
  role_coverages_id_seq,
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

- No bulk changes, Role reactivation, mandate correction/replacement,
  or coverage correction/replacement is included.
- A new Operational Role can be created only together with its first explicit
  Position mandate. Standalone Role creation is intentionally unavailable.
- New reporting relationships are limited to one explicit primary manager.
  Existing dotted-line and functional relationships may be corrected or ended;
  creating new secondary relationships is deferred.
- An effective date is accepted only for a present or past change. Future
  scheduling is deferred.
- Ending Role Coverage and then its Role mandate is supported. Replacing a
  mandate or coverage remains an explicit sequence rather than a silent rewrite.
- Temporary-password access remains a pilot control, not the final enterprise
  authorization model. SSO, durable per-user authorization, and durable rate
  limiting remain required before broader institutional administration.
