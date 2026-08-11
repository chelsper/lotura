# Operating Model Authoring v0.1

## Product boundary

Operating Model Authoring lets an authenticated Workspace Administrator maintain the canonical operating model without exposing database records as the product metaphor. It is generic shared-code capability, disabled by default, and unavailable to the public fictional demo.

Slice A covers only immutable Process identity, Process name and purpose, explicit Owner Operational Role assignment, Position-mandate and current RoleCoverage context, stale-write protection, and append-only change history. Steps, Systems, Exceptions, and dependencies remain read-only until their later approved slices.

## Truth boundaries

- Process ownership belongs to an Operational Role, never a Position or Person.
- Position mandate and RoleCoverage are explanatory context, not ownership inference.
- A Working draft remains a Working draft after ownership is assigned.
- Canonical existence and lifecycle status do not establish institutional approval.
- The audit ledger is not approved Process version history.
- Process Detail may show RoleCoverage while FLOW continues its Version 0.1 RoleAssignment interpretation.
- Clearing an Owner Role is permitted only for a Draft. Active and archived Processes must retain accountable ownership; this is an explicit product and governance rule backed by the existing database constraint.
- The history actor is the authenticated Lotura application identity at the time of change. It is not inferred from or coupled to Person, Position, Membership, Role Mandate, Role Coverage, or current organizational assignment.

The `operating_model_change_action` enum is deliberately Slice-A-limited to `create_draft`, `update_definition`, and `change_owner`. Later Step, System, Exception, and dependency actions will require reviewed forward-only enum expansion and matching least-privilege/history updates. Current action names must not be overloaded to represent future entity changes.

## Runtime boundary

Authoring requires all of the following:

- authenticated private-workspace access;
- one server-configured Organization-scoped Neon source;
- `LOTURA_OPERATING_MODEL_AUTHORING_MODE=enabled`;
- `LOTURA_PROCESS_ADMIN_DATABASE_URL` using a distinct Process administration role against the exact runtime database and endpoint.

Configuration fails closed. The Process administration credential may not reuse `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, or `LOTURA_STRUCTURE_ADMIN_DATABASE_URL`, and no credential may reach client JavaScript.

## Slice A privilege contract

The Process administration role requires only:

```sql
GRANT CONNECT ON DATABASE <database_name> TO <process_admin_role>;
GRANT USAGE ON SCHEMA public TO <process_admin_role>;

GRANT SELECT ON TABLE roles, processes, operating_model_changes
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
  process_stable_key,
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
  operating_model_changes_id_seq
TO <process_admin_role>;
```

The runtime read role additionally needs `SELECT` on `operating_model_changes` after migration `0010` so authenticated history can be displayed.

Explicit denials and omissions:

- No `UPDATE` or `DELETE` on `operating_model_changes`.
- No `DELETE` or `TRUNCATE` on `processes`.
- No mutation privilege on Roles or Organization Structure.
- No privileges on Process Steps, Systems, Exceptions, dependencies, or their relationship tables.
- No schema creation, migration, database creation, or role-management privilege.

## Mutation contract

Every action revalidates access and configuration, derives Organization and actor from trusted server state, re-reads Process and Role targets inside a serializable transaction, and compares the submitted revision with the canonical `updated_at`. A stale revision, inactive or cross-Organization Role, invalid ownership clear, duplicate name, or history failure leaves the Process unchanged.

The canonical update and history insertion use one SQL statement. The history table also has a trigger that rejects UPDATE and DELETE, while a separate trigger rejects Process stable-key changes.

## User experience

Process Detail remains the default read experience. An enabled private workspace displays **Maintain Process**, opening a contextual workspace with:

- Working-draft and lifecycle language;
- Process name and purpose maintenance;
- explicit Owner Operational Role selection or draft-only clearing;
- Position mandate and current RoleCoverage evidence for the selected Role;
- read-only previews of Steps, Systems, Exceptions, and dependencies;
- honest governance labels; and
- append-only Process change history.

The maintenance projection evaluates current Role Mandates and Role Coverage at the same visible operating-model snapshot timestamp used by the surrounding workspace shell.

Public fixture/demo mode renders no authoring action and the maintenance route fails closed.
