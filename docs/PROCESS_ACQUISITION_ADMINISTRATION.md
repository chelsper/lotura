# Process Acquisition Administration v0.1

Milestone C introduces the smallest canonical Process mutation: an authenticated
Workspace Administrator may create a **Draft Process shell** containing a name,
an optional purpose, and an optionally confirmed intended Owner Role.

This capability implements the manual **Start from scratch** acquisition path.
It does not implement Process editing, Steps, Systems, Exceptions, dependencies,
AI interviews, uploads, observations, reconciliation, approval, activation,
publishing, or version history.

## Truth and responsibility boundaries

Every new record is inserted with `status = draft`. Draft means incomplete
operating-model definition; it does not mean approved, active, validated, or
institutionally authoritative.

An Operational Role supplied by Position context is display context only. The
form leaves ownership unassigned by default. If an administrator selects an
Owner Role, a separate confirmation is required. Position title, Position
occupancy, RoleMandate, RoleCoverage, Organization Unit, and reporting hierarchy
never manufacture Process ownership.

The current schema does not persist acquisition evidence, contributor identity,
field-level knowledge states, approval, or Process version history. Therefore
v0.1 creates only the minimal Draft shell and states this limitation visibly.
Interview and upload paths remain disabled until a reviewed staging model can
preserve their evidence without flattening it into canonical facts.

## Runtime configuration

Process Acquisition is disabled by default. Enabling it requires both:

- `LOTURA_PROCESS_ACQUISITION_MODE=enabled`
- `LOTURA_PROCESS_ADMIN_DATABASE_URL=<dedicated Process-write credential>`

The configuration fails closed unless the workspace uses authenticated
temporary-password access, a single Organization-scoped Neon source, and a
dedicated Process-write credential targeting the same exact database and Neon
endpoint as the runtime connection.

The Process credential may not reuse `DATABASE_URL`,
`DATABASE_URL_UNPOOLED`, or `LOTURA_STRUCTURE_ADMIN_DATABASE_URL`. It remains
server-only and is never returned to the browser. Public fixture/demo mode
cannot enable Process Acquisition.

## Least-privilege database role

The v0.1 Process-write role requires only:

```sql
GRANT CONNECT ON DATABASE <database_name> TO <process_admin_role>;
GRANT USAGE ON SCHEMA public TO <process_admin_role>;

GRANT SELECT ON TABLE roles, processes TO <process_admin_role>;

GRANT INSERT (
  organization_id, name, purpose, owner_role_id, status
) ON processes TO <process_admin_role>;

GRANT USAGE ON SEQUENCE processes_id_seq TO <process_admin_role>;
```

It receives no `UPDATE`, `DELETE`, `TRUNCATE`, schema creation, database
creation, role management, migration, structure administration, System,
Exception, ProcessStep, ProcessSystem, or ProcessDependency mutation privilege.

Every create action revalidates the private session, enablement, credential
separation, and trusted server-derived Organization scope. A selected Role is
re-read using the trusted Organization ID and must be active. Client-supplied
Organization or actor identity is never accepted.

## Public and private workspace behavior

Public Northstar remains fixture-backed and read-only. With Process Acquisition
disabled, no Add Process entry point is rendered and the acquisition route
returns not found.

Private deployment enablement remains a separate reviewed operation. Code
readiness does not authorize creating a Process database role, adding Vercel
variables, deploying, or writing any institutional Process.
