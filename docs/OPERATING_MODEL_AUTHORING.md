# Operating Model Authoring v0.1

## Product boundary

Operating Model Authoring lets an authenticated Workspace Administrator maintain the canonical operating model without exposing database records as the product metaphor. It is generic shared-code capability, disabled by default, and unavailable to the public fictional demo.

Slice A covers immutable Process identity, Process name and purpose, explicit Owner Operational Role assignment, Position-mandate and current RoleCoverage context, stale-write protection, and append-only change history. Step Builder v0.1 adds immutable Step identity, ordered Step creation and maintenance, explicit responsible Operational Role assignment, and Step-targeted append-only history. Technology & Exceptions Builder v0.1 adds immutable System and Exception identity, System catalog maintenance, explicit Process-System usage, legitimate alternate-path Exception maintenance, and target-specific append-only history. Process dependencies remain read-only until their later approved slice.

## Truth boundaries

- Process ownership belongs to an Operational Role, never a Position or Person.
- Position mandate and RoleCoverage are explanatory context, not ownership inference.
- A Working draft remains a Working draft after ownership is assigned.
- Canonical existence and lifecycle status do not establish institutional approval.
- The audit ledger is not approved Process version history.
- Process Detail shows current Person-level RoleCoverage through effective RoleMandates when canonical structure data is available. Fictional Version 0.1 fixtures retain a RoleAssignment compatibility view. FLOW continues its Version 0.1 RoleAssignment interpretation until that analytical transition is separately approved.
- Clearing an Owner Role is permitted only for a Draft. Active and archived Processes must retain accountable ownership; this is an explicit product and governance rule backed by the existing database constraint.
- The history actor is the authenticated Lotura application identity at the time of change. It is not inferred from or coupled to Person, Position, Membership, Role Mandate, Role Coverage, or current organizational assignment.

Migration `0014` expands `operating_model_change_action` with the explicit Step actions `create_step`, `update_step`, `reorder_steps`, and `change_step_responsibility`, and expands the target vocabulary with `process_step`. Migration `0015` adds the separately reviewed System, Process-System, and Exception actions. Dependency actions still require forward-only expansion. Current action names must not be overloaded to represent different entity changes.

Migration `0015` expands the ledger through explicit `system`,
`process_system`, and `exception` targets and their reviewed action vocabulary.
System and Exception stable keys are random and immutable. A Process-System
relationship is identified by its existing immutable Process and System pair;
unlinking it does not delete either canonical entity or prior history.

Step removal is intentionally unavailable. The current schema has no Step retirement lifecycle, and scoped Exceptions may depend on a Step. A later lifecycle decision must define retirement, restoration, dependency handling, and version-history consequences before any destructive action is introduced.

## Runtime boundary

Authoring requires all of the following:

- authenticated private-workspace access;
- one server-configured Organization-scoped Neon source;
- `LOTURA_OPERATING_MODEL_AUTHORING_MODE=enabled`;
- `LOTURA_PROCESS_ADMIN_DATABASE_URL` using a distinct Process administration role against the exact runtime database and endpoint.

Configuration fails closed. The Process administration credential may not reuse `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, or `LOTURA_STRUCTURE_ADMIN_DATABASE_URL`, and no credential may reach client JavaScript.

## Process-admin privilege contract

The Process administration role requires only:

```sql
GRANT CONNECT ON DATABASE <database_name> TO <process_admin_role>;
GRANT USAGE ON SCHEMA public TO <process_admin_role>;

GRANT SELECT ON TABLE roles, processes, process_steps, operating_model_changes
TO <process_admin_role>;

GRANT INSERT (
  organization_id,
  name,
  purpose,
  owner_role_id,
  status
) ON processes TO <process_admin_role>;

GRANT UPDATE (
  name,
  purpose,
  owner_role_id,
  updated_at
) ON processes TO <process_admin_role>;

GRANT INSERT (
  organization_id,
  process_id,
  position,
  title,
  instructions,
  responsible_role_id
) ON process_steps TO <process_admin_role>;

GRANT UPDATE (
  position,
  title,
  instructions,
  responsible_role_id,
  updated_at
) ON process_steps TO <process_admin_role>;

GRANT INSERT (
  organization_id,
  process_id,
  process_stable_key,
  process_step_id,
  process_step_stable_key,
  entity_type,
  target_reference,
  change_kind,
  change_action,
  before_state,
  after_state,
  reason,
  effective_at,
  actor_identifier
) ON operating_model_changes TO <process_admin_role>;

GRANT USAGE ON SEQUENCE processes_id_seq,
  process_steps_id_seq,
  operating_model_changes_id_seq
TO <process_admin_role>;
```

The runtime read role additionally needs `SELECT` on `operating_model_changes` after migration `0010` so authenticated history can be displayed.

Explicit denials and omissions:

- No `UPDATE` or `DELETE` on `operating_model_changes`.
- No `DELETE` or `TRUNCATE` on `processes`.
- No mutation privilege on Roles or Organization Structure.
- No `DELETE` or `TRUNCATE` on Process Steps.
- No mutation privileges on Process dependencies or unrelated operating-model relationship tables. System, Exception, and Process-System privileges are limited to the separately reviewed Technology & Exceptions delta below.
- No schema creation, migration, database creation, or role-management privilege.

## Mutation contract

Every action revalidates access and configuration, derives Organization and actor from trusted server state, re-reads Process, Step, and Role targets inside a serializable transaction, and compares the submitted revisions with canonical `updated_at` values. A stale revision, inactive or cross-Organization Role, invalid ownership clear, invalid reorder, duplicate name, or history failure leaves the Process unchanged.

The canonical update and history insertion use one SQL statement. The history table also has a trigger that rejects UPDATE and DELETE, while a separate trigger rejects Process stable-key changes.

## User experience

Process Detail remains the default read experience. An enabled private workspace displays **Maintain Process**, opening a contextual workspace with:

- Working-draft and lifecycle language;
- Process name and purpose maintenance;
- explicit Owner Operational Role selection or draft-only clearing;
- Position mandate and current RoleCoverage evidence for the selected Role;
- ordered Step creation and maintenance with explicit or inherited responsibility;
- explicit System relationships and usage descriptions;
- legitimate alternate-path Exception maintenance;
- read-only Process dependencies;
- honest governance labels; and
- append-only Process change history.

The maintenance projection evaluates current Role Mandates and Role Coverage at the same visible operating-model snapshot timestamp used by the surrounding workspace shell.

Public fixture/demo mode renders no authoring action and the maintenance route fails closed.

## Technology & Exceptions privilege delta

The same dedicated Process administration role may receive only the reviewed
additional privileges required for this operating-model slice:

```sql
GRANT SELECT ON TABLE systems, exceptions, process_systems
TO <process_admin_role>;

GRANT INSERT (
  organization_id, name, description, system_type, url, owner_role_id, status
) ON systems TO <process_admin_role>;
GRANT UPDATE (
  name, description, system_type, url, owner_role_id, status, updated_at
) ON systems TO <process_admin_role>;

GRANT INSERT (
  organization_id, process_id, process_step_id, name, condition, response,
  status, owner_role_id
) ON exceptions TO <process_admin_role>;
GRANT UPDATE (
  process_step_id, name, condition, response, status, owner_role_id, updated_at
) ON exceptions TO <process_admin_role>;

GRANT INSERT (organization_id, process_id, system_id, usage)
ON process_systems TO <process_admin_role>;
GRANT UPDATE (usage) ON process_systems TO <process_admin_role>;
GRANT DELETE ON process_systems TO <process_admin_role>;

GRANT INSERT (
  organization_id, process_id, process_stable_key,
  system_id, system_stable_key, exception_id, exception_stable_key,
  entity_type, target_reference, change_kind, change_action, before_state,
  after_state, reason, effective_at, actor_identifier
) ON operating_model_changes TO <process_admin_role>;

GRANT USAGE ON SEQUENCE systems_id_seq, exceptions_id_seq
TO <process_admin_role>;
```

`DELETE` on `systems` and `exceptions`, history `UPDATE` or `DELETE`, Role or
Organization Structure mutation, dependency mutation, schema changes, role
administration, and database administration remain denied. A System cannot be
deactivated while a current Process relationship depends on it. Exception
deactivation is a lifecycle update, not deletion.
