# Organization Structure Domain Proposal

## Status and boundary

This document proposes Lotura’s future organizational-structure model. It is product and architecture work for review, not authorization to change the Version 0.1 schema, generate migrations, import an organizational chart, or create infrastructure.

The proposal is informed by private, off-repository analysis of a real organizational-chart export. No organization-specific people, titles, departments, reporting lines, counts, or workbook contents are recorded here.

## Why organizational structure belongs in Lotura

An operating model explains how work is owned and connected. Organizational structure explains where durable Positions sit, how people occupy them, which OrganizationUnits contain them, and how formal reporting relationships currently connect them.

The two views overlap but are not interchangeable:

- a Process can outlive the department currently performing it;
- an Operational Role can remain accountable while the Position or Person covering it changes;
- a Position can move between OrganizationUnits without erasing its history;
- a Person can hold, cover, or leave a Position without becoming the identity of that Position; and
- a reporting relationship does not by itself prove Process ownership or operational responsibility.

Lotura should connect organizational structure to the operating model without collapsing one into the other.

## Architectural principles

The following distinctions are explicit and must survive implementation:

1. **Person** is a human being represented in the organizational model.
2. **User** is an application identity. A Person does not need to be a Lotura User, and application access is not evidence of employment, Position occupancy, or operational responsibility.
3. **Position** is a durable structural seat in the organization.
4. **PositionAssignment** records a Person occupying or covering a Position.
5. **PositionReportingRelationship** records a structural reporting relationship between Positions.
6. **Operational Role** is a durable responsibility used by the operating model. The existing `Role` entity is Lotura’s current Operational Role.
7. **ResponsibilityHolder** is the domain concept for an entity capable of holding an Operational Role mandate.
8. **RoleMandate** is an effective-dated allocation of an Operational Role to a ResponsibilityHolder.
9. **RoleCoverage** is a Person-level permanent, interim, acting, delegated, or backup coverage arrangement for a RoleMandate.

These principles also impose hard interpretation boundaries:

- Reporting hierarchy must never imply Process ownership.
- A Position title must never automatically create or equal an Operational Role.
- One Position may hold multiple Operational Roles through separate RoleMandates.
- One Operational Role may move between Positions by ending one RoleMandate and beginning another, without rewriting Process references to that Role.
- Temporary RoleCoverage must not alter PositionAssignment or the reporting hierarchy. A PositionAssignment changes only when the Person is actually occupying or covering the structural seat.
- Names and titles are presentation attributes, not stable identifiers or evidence of responsibility.

## Proposed entities

### Person

A Person is a human being represented in an Organization’s structural and operating model. A Person can exist without signing in to Lotura.

For the first implementation, Person should be Organization-scoped to minimize cross-tenant identity and privacy risk. An optional same-Organization link to an existing Membership may reconcile a Person with a Lotura User, but that link must not grant access or prove Position or Role responsibility. Whether that optional link belongs directly on Person or in a dedicated identity-link entity remains an implementation decision.

Imports must not match or deduplicate people solely by display name. The approved source and a stable source key should drive reconciliation.

### User and Membership

User remains an application identity. Membership remains the User’s access relationship to an Organization. Neither entity should be treated as the organizational Person, an employee record, a PositionAssignment, or a RoleCoverage record.

A User may correspond to a Person, but many modeled People will have no User. Authentication, authorization, and organizational responsibility therefore remain independent.

### OrganizationUnit

An OrganizationUnit is a durable administrative grouping such as a division, college, department, office, or team.

It provides structural context but does not own Processes automatically. Units may be renamed, moved, merged, split, or retired while Processes, Positions, Operational Roles, and historical relationships remain traceable.

Likely future attributes include:

- Organization scope;
- stable external key;
- name;
- optional unit type;
- active, inactive, or retired lifecycle status;
- optional parent OrganizationUnit; and
- effective and historical context where required.

### Position

A Position is a durable organizational seat. It may be occupied, vacant, temporarily covered, moved, renamed, or retired.

A Position is not a Person, User, job title, OrganizationUnit, or Operational Role. Multiple Positions may share the same title, and one Position may hold multiple Operational Roles.

Likely future attributes include:

- Organization and OrganizationUnit scope;
- stable position key supplied by an approved source;
- display title;
- lifecycle status;
- optional position type or capacity metadata only if later justified; and
- effective and historical context.

### PositionAssignment

A PositionAssignment connects a Person to a Position for a defined period and structural purpose. It records occupancy or actual coverage of the Position without overwriting earlier occupants.

The model should distinguish primary occupancy from interim, acting, or backup structural coverage. Vacancies are represented by an active Position without an active primary PositionAssignment, not by deleting the Position.

PositionAssignment answers “who occupies or covers this structural seat?” It does not answer “who currently covers this Operational Role?” A temporary operational delegation creates RoleCoverage, not PositionAssignment, unless the Person is also genuinely covering the Position.

### PositionReportingRelationship

A PositionReportingRelationship connects a subordinate Position to a manager Position. Reporting lines belong between Positions rather than directly between People, so personnel changes do not rewrite the structural relationship.

The future model should distinguish at least a primary reporting line from any separately approved secondary or dotted-line relationship. It should preserve effective periods and retirement rather than overwriting history.

One active primary reporting relationship should normally exist per non-root Position. Self-reporting must be prohibited. General hierarchy-cycle prevention cannot be guaranteed by a simple PostgreSQL `CHECK`; it requires application validation, a transaction-safe database trigger, or another explicitly approved approach.

Reporting hierarchy is structural evidence only. It must never be used to infer Process ownership, Operational Role mandates, RoleCoverage, or approval authority.

### Operational Role

An Operational Role is a durable organizational responsibility referenced by Processes, ProcessSteps, Systems, Exceptions, and other operating-model relationships. The current Version 0.1 `Role` entity already serves this purpose.

An Operational Role is not a Position or title. Process references remain stable when the Role moves between Positions or its current human coverage changes.

### ResponsibilityHolder

ResponsibilityHolder is the domain abstraction for something capable of holding an Operational Role mandate. Position is the only holder type justified for the first Version 0.2 implementation.

ResponsibilityHolder should therefore **not** become a polymorphic table, holder-type enum, generic `entityType/entityId` pair, or set of speculative subtype tables in Version 0.2. The first physical `RoleMandate` should reference `positionId` directly and should be named generically enough to preserve its meaning.

If a second holder type is later approved from real evidence, Lotura can introduce a proper ResponsibilityHolder supertype with typed subtype relationships, backfill one holder identity per Position, and migrate RoleMandate from `positionId` to `responsibilityHolderId` in a reviewed forward-only migration. This is preferable to an unenforced polymorphic foreign key.

Possible future holder types—**not Version 0.2 entities**—include:

- OrganizationUnit;
- CollectiveBody or Committee; and
- ExternalOrganization.

Those concepts should enter the schema only after their identity, membership, accountability, lifecycle, access, and historical behavior are designed.

### RoleMandate

RoleMandate is an effective-dated allocation of an Operational Role to a ResponsibilityHolder. In the Position-first Version 0.2 implementation, it is a first-class relationship between `Position` and the existing `Role`, with `positionId` as the only supported holder reference.

RoleMandate answers “which durable structural holder is expected to carry this responsibility?” It should preserve status, effective start and optional end, source or validation context when available, and history rather than overwriting a prior allocation.

A Position may have multiple active RoleMandates for different Operational Roles. An Operational Role may move by ending its existing mandate and starting one for a different Position while every Process continues to reference the same Role. Concurrent mandates for the same Role should be permitted only when the organization has explicitly validated shared responsibility; the scope and accountability semantics of such sharing remain an open decision.

A RoleMandate must never be inferred from a Position title or reporting relationship.

### RoleCoverage

RoleCoverage connects a Person to a RoleMandate for a defined period and coverage type: permanent, interim, acting, delegated, or backup.

RoleCoverage answers “which Person currently carries this mandated responsibility?” It is independent of PositionAssignment. The usual permanent coverage may align with the Position’s occupant, but Lotura should store or validate that relationship explicitly rather than assume it. Interim, acting, delegated, and backup coverage can differ from the reporting hierarchy and need not imply that the Person occupies the holder Position.

The future uniqueness rules for active primary coverage must be decided from actual governance needs. The Version 0.1 rule allowing only one active primary `RoleAssignment` per Role must not be copied automatically to RoleCoverage, particularly when shared mandates, job sharing, delegated authority, committees, or external delivery are introduced.

## Smallest Position-first Version 0.2 structure

The first implementation should introduce only the entities required to represent an approved organizational chart and connect it explicitly to the existing operating model:

- Person;
- OrganizationUnit;
- Position;
- PositionAssignment;
- PositionReportingRelationship;
- RoleMandate, physically constrained to Position as its holder; and
- RoleCoverage.

User, Membership, Role, Process, and the rest of the Version 0.1 operating model remain distinct existing entities. ResponsibilityHolder is a domain contract in Version 0.2, not a table. OrganizationUnit, CollectiveBody/Committee, and ExternalOrganization as mandate holders are future abstractions only.

RoleMandate and RoleCoverage may remain empty for imported Positions until evidence establishes responsibility and coverage. Importing a title or reporting line must not manufacture either relationship.

## Relationship summary

```text
User ── Membership ── optional identity reconciliation ── Person
                                                        │
Organization                                            ├── PositionAssignment ── Position
├── OrganizationUnit ── parent/child OrganizationUnit   │                         │
├── Position ── belongs to OrganizationUnit             │                         ├── PositionReportingRelationship ── Position
│   └── Position is the first ResponsibilityHolder      │                         └── RoleMandate ── Operational Role
└── Operational Role ── owns operating-model records    └── RoleCoverage ───────────────┘
```

The three time-varying relationships answer different questions:

- PositionAssignment: Which Person occupies or covers the structural Position?
- RoleMandate: Which ResponsibilityHolder is allocated the Operational Role?
- RoleCoverage: Which Person currently provides coverage for that mandate?

## How the model handles long-term cases

### One Position holds multiple Operational Roles

Create one RoleMandate per Position–Operational Role allocation. Position identity and each Role’s Process references remain independent.

### One Operational Role moves between Positions

End the former RoleMandate and begin a new one. Do not change Process ownership or other references to the Operational Role.

### Multiple Positions share one Operational Role

Create concurrent RoleMandates only when shared responsibility is intentional, scoped, and validated. If each Position is independently accountable for a different scope, model distinct scoped Operational Roles instead of hiding the distinction behind a shared name.

### Temporary operational ownership differs from reporting hierarchy

Create interim, acting, delegated, or backup RoleCoverage against the relevant RoleMandate. Do not change PositionAssignment or PositionReportingRelationship unless the structural facts also changed.

### Matrix organizations

Represent approved primary and secondary reporting relationships separately from RoleMandates. Matrix connectivity may explain context, but it cannot infer operational ownership.

### Committees own operational responsibilities

A future CollectiveBody/Committee may become a ResponsibilityHolder after committee identity, membership, decision authority, quorum, delegation, and history are designed. Do not impersonate the committee with a Position or Person in Version 0.2.

### Outsourced organizations own or perform Processes

A future ExternalOrganization may become a ResponsibilityHolder after external identity, contract periods, accountability, data access, and internal oversight are designed. Lotura must decide whether external parties can hold accountability, provide execution only, or require a separate internal accountable Role before implementing this case.

## Transition from current RoleAssignment

The existing `RoleAssignment` is a valid Version 0.1 construct that directly links an Operational Role to an Organization Membership. It is closest in meaning to future Person-level RoleCoverage, but it does not identify a RoleMandate and Membership is not the same entity as Person.

It must be evaluated and migrated deliberately rather than renamed, silently repurposed, or treated as PositionAssignment:

1. Preserve `RoleAssignment` and its history while the new structural model is introduced.
2. Reconcile each referenced Membership to an Organization-scoped Person using approved identity evidence; do not match by name alone.
3. Create RoleMandates only from validated Position-to-Role evidence.
4. Convert a `RoleAssignment` to RoleCoverage only when its Person and exactly one applicable RoleMandate are unambiguous for the effective period.
5. Flag assignments with no mandate, overlapping mandates, ambiguous Person identity, or incompatible dates as Needs validation; do not guess.
6. Compare old and new current-coverage projections at explicit as-of timestamps before changing application reads.
7. Freeze new Version 0.1 assignments only after every authorized writer and reader uses the approved replacement.
8. Retain or archive the legacy records until historical equivalence, audit needs, rollback, and deletion behavior are approved.

The existing partial unique index allowing one active primary `RoleAssignment` (`permanent`, `interim`, or `acting`) per Role is Version 0.1 behavior. It is not a universal long-term business rule and does not decide RoleMandate or RoleCoverage cardinality.

## Import and discovery rules

An organizational-chart workbook is evidence about structure, not approved organizational truth.

A future import flow should:

1. keep the source outside Git and outside public or demo environments;
2. record source, scope, as-of time, permitted use, and human reviewer;
3. require stable identifiers for People and Positions before matching records;
4. preserve missing managers, duplicate names, ambiguous units, and inconsistent relationships as discovery findings;
5. distinguish Known, Assumed, Unknown, Needs validation, and Conflicting observations;
6. compute direct-report counts from reporting relationships rather than trusting a redundant stored count;
7. reject cross-Organization references, self-reporting, malformed effective periods, and multiple active primary relationships where prohibited;
8. perform a validation-only dry run before any write; and
9. require separate approval before schema changes, migration, credential use, or database import.

The import must exclude compensation, performance, leave, health, disciplinary information, personal contact details, government identifiers, authentication credentials, and other HR or regulated information not necessary to understand approved structure.

## Historical and restructuring behavior

Organization structure and responsibility allocation must be effective-dated or versioned sufficiently to answer what was true at a point in time. Reorganization should retire or supersede structural relationships and RoleMandates rather than erase them.

Future restructuring intelligence may compare current and proposed OrganizationUnits, Positions, PositionAssignments, reporting relationships, RoleMandates, and RoleCoverage. It should produce explainable review sets—not predict outcomes, optimize headcount, or treat reporting or operating-model connectivity as proof of impact.

## Findings the current Version 0.1 model cannot represent cleanly

- People who do not have Lotura User identities;
- organizational units and their hierarchy;
- durable Positions distinct from Operational Roles;
- vacancies and Position occupancy history;
- structural reporting relationships between Positions;
- dotted-line or secondary reporting;
- effective-dated allocation of Operational Roles to durable holders;
- Person-level coverage of a specific RoleMandate;
- source-backed organizational-chart observations and uncertainty states;
- organization-structure versions or effective periods; and
- restructuring proposals distinct from current structure.

The current `Role` and `RoleAssignment` entities should not be stretched to impersonate all of these concepts. Doing so would conflate operational responsibility, application identity, titles, structural seats, reporting lines, and People.

## Open decisions before implementation

- the authoritative source and stable keys for Person, Position, and OrganizationUnit reconciliation;
- whether the optional User/Membership-to-Person link belongs on Person or in a separate identity-link entity;
- OrganizationUnit types and whether one parent hierarchy is sufficient;
- primary, dotted-line, matrix, and temporary reporting semantics;
- effective dating versus explicit structure versions and how their timelines align with operating-model versions;
- PositionAssignment types, overlap rules, vacancy rules, and whether job sharing is supported initially;
- RoleMandate status, provenance, approval, concurrent-sharing, scope, and overlap rules;
- RoleCoverage status, authority, allocation, overlap, delegation, and active-primary rules;
- whether permanent RoleCoverage must be explicit or can ever be derived from a validated PositionAssignment;
- how a Process should display accountability when one Operational Role has multiple concurrent RoleMandates;
- whether outsourced execution must retain a separate internal accountable Operational Role;
- the trigger for introducing a persisted ResponsibilityHolder supertype and its typed subtype constraints;
- confidentiality and audience rules for workforce structure and Person-level coverage;
- import reconciliation, rollback, and source-retention policy;
- cycle prevention and transaction-safe database enforcement;
- deletion restrictions and historical archival behavior;
- the transition and retirement criteria for Version 0.1 `RoleAssignment`; and
- how proposed restructuring remains separate from current organizational truth.

Until these decisions are approved, organization-chart analysis remains private and read-only, and the Version 0.1 schema remains unchanged.
