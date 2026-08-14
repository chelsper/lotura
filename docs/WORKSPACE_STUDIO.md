# Workspace Studio

## Product definition

Workspace Studio is where an organization builds, governs, and continuously
improves its digital twin.

It is also the central working environment for Lotura's Organizational
Knowledge Lifecycle: **Observe → Interview → Evidence → Review → Reconcile →
Proposed Change → Approval → Operating Model → Continuous Improvement →
Observe Again**. Studio does not collapse those stages into one edit action.

Lotura's organizational digital twin is a living, evidence-based model of how
the organization is structured, how work happens, who holds responsibility,
which technology supports it, what exceptions and dependencies exist, and how
those relationships change over time. It is not a claim that the model is
automatically complete, institutionally approved, synchronized in real time,
or suitable for autonomous decisions.

Workspace Studio is an authoring and governance experience, not a settings
console. It unifies the place where an authorized person maintains the model;
it does not collapse the underlying domains, credentials, permissions, or
append-only histories into one unrestricted administration boundary.

## Relationship to the read product

Lotura keeps understanding and maintenance distinct:

- **Organization** is where people explore structure, Positions, current
  assignments, reporting relationships, Operational Roles, and coverage.
- **Explorer** and **Process Detail** are where people understand documented
  work and its relationships.
- **FLOW** is where people review deterministic, evidence-based findings and
  change-review sets.
- **Workspace Studio** is where an authorized Workspace Administrator builds
  and maintains the canonical model.

Read surfaces may provide a contextual **Maintain in Studio** action to an
authorized administrator. They should not become mixed browse/edit screens.
Public fictional workspaces expose no Studio navigation, routes, controls, or
write configuration.

## Studio information architecture

Workspace Studio grows under one coherent product umbrella:

### Build

- **Organization** — Organizational Units, Positions, People, Position
  Assignments, and Position reporting relationships.
- **Responsibilities** — Operational Roles, Role Mandates, and Role Coverage.
- **Processes** — Process definition, ownership, Steps, responsible Roles,
  Systems, Exceptions, and Process dependencies.
- **Technology** — the System catalog and its explicit operating-model
  relationships. Technology is the durable navigation concept; Version 1
  models Systems only and does not prematurely introduce integrations, APIs,
  AI services, or document storage as new entities.

### Understand and govern

- **Knowledge** — the evidence, observations, assumptions, unknowns,
  validation needs, and conflicts through which organizational understanding
  matures. Until those states are persisted, Knowledge remains a truthful lens
  across the model rather than an empty or fabricated module.
- **Governance** — visibility, contribution, approval, analysis,
  administration, and Stewardship. Version 1 is read-only and uses **Not
  assigned**, **Not configured**, and **Needs validation** where evidence is
  absent.
- **Discovery** — source intake, review, reconciliation, and eventual guided
  interviews. It is the long-term product destination for capabilities that
  begin today as local Preview, Resolution, Process Acquisition, and future
  imports.
- **Activity** — a chronological, read-only projection of the existing
  append-only change ledgers. Activity does not replace those ledgers or imply
  causality between events.
- **Reference Models** — selected internal and external comparison bases for
  Processes and Process Families. This area remains hidden until attachment and
  evidence-based comparison provide useful capability.
- **Improvement** — the governed loop from evidence and approved change through
  implementation, measurement, and sustainment. It remains hidden until that
  lifecycle exists.

The Studio should not ship empty destinations merely to advertise future
scope. A destination enters navigation when it provides an honest, useful
experience with current data.

Knowledge lifecycle and operating-model structure remain distinct inside
Studio. Discovery and Governance move knowledge toward trusted documentation;
Organization, Responsibilities, Processes, Process Families, and Technology
structure the model; Reference Models, Job Descriptions, and drift compare it.

## Proposed route map

The route name is deliberately concise while the product label remains
**Workspace Studio**.

### Implemented Slice 1 and Slice 2 routes

- `/studio` — Studio home with current-model facts, supported review questions,
  continue-building actions, and recent structural Activity;
- `/studio/organization` — searchable Organization Builder with an expandable
  parent/child Unit hierarchy plus Position and Person views;
- `/studio/organization/units/new` — add an Organizational Unit, optionally
  from a parent Unit with that stable identity preselected;
- `/studio/organization/units/[stableKey]` — maintain one Unit and its parent
  relationship, review its full hierarchy path and direct children, and add a
  child Unit in context;
- `/studio/organization/positions/new` — add a Position;
- `/studio/organization/positions/[stableKey]` — maintain one Position,
  Unit placement, Assignments, and reporting relationships; and
- `/studio/organization/people/new` and
  `/studio/organization/people/[stableKey]` — add and maintain a Person and
  review connected Position Assignments;
- `/studio/responsibilities` — search and review Operational Roles, current
  Position mandates, human coverage, and connected operating-model context;
- `/studio/responsibilities/roles/new` — create one Operational Role with its
  first explicit Position mandate; and
- `/studio/responsibilities/roles/[stableKey]` — maintain Role definition,
  mandates, coverage, dependency-aware status, and append-only activity.

Assignment and reporting actions remain contextual to a Position rather than
becoming disconnected record-management routes. Existing `/organization`
routes remain canonical read routes and may link an authorized user to the
matching Studio stable-key route.

### Implemented Process Builder routes

- `/studio/processes` — search and review the documented Process inventory;
- `/studio/processes/[processId]` — maintain Process definition, ownership,
  ordered Steps, and explicit Step responsibility through the reviewed
  operating-model authoring boundary.

### Technology & Exceptions Builder routes

- `/studio/technology` — search and review the current System catalog and the
  Processes that explicitly use each System;
- `/studio/technology/new` — add one canonical System without implying
  criticality or operational approval; and
- `/studio/technology/systems/[stableKey]` — maintain System definition,
  explicit Owner Role, lifecycle, connected Processes, and append-only
  operating-model history.

Systems used and legitimate alternate-path Exceptions remain contextual parts
of `/studio/processes/[processId]`. Process-System links use existing canonical
Systems and a required plain-language usage description. Unlinking removes the
current relationship without deleting the System. Exception creation,
maintenance, and deactivation preserve immutable identity and history.

### Implemented Discovery routes

- `/studio/discovery` — start and resume guided interviews for an existing
  Process;
- `/studio/discovery/interviews/[sessionId]` — answer questions, preserve
  uncertainty, append corrections, and review the saved interview; and
- `/studio/discovery/interviews/[sessionId]/reconcile` — compare documented
  Process information with active interview notes, record append-only human
  choices, and finish with a durable Knowledge Outcome without approving or
  changing the Process. When evidence supports specific changes, the same route
  leads into the structured mapping workspace; when it does not, the review
  ends successfully without an empty proposal experience.

Discovery uses conversational product language. Technical terms such as
canonical record, epistemic state, and reconciliation package remain available
to architecture and audit boundaries but are not required vocabulary for a
participant describing their work.

### Knowledge Outcome

The end of a completed review answers what the organization learned before it
asks what should change. It shows what stayed consistent with current
documentation, what remains for later validation, whether conflicting evidence
or a Process-boundary question remains, and whether any specific changes were
actually proposed. Counts support the explanation; they are not a score.

Knowledge Outcome is a read-only projection from durable observations, the
latest append-only human choices, and any structured mapping. It is distinct
from approval and from the documented Process. No change is a valid outcome,
and unresolved knowledge remains available for another participant, source, or
later review.

### Proposal review

When a finished mapping contains specific changes, an explicitly authorized
Proposal Reviewer can inspect the exact documented and proposed states, the
human rationale, and the supporting interview answers. Each change is approved
to move forward, not approved, or left needing more validation. Decisions are
append-only and remain separate from the documented Process.

Finishing review produces an accountable handoff for the future Process-version
and application boundary. It never changes the Process merely because a
proposal was reviewed. A Knowledge Outcome with no structured changes does not
create or display an empty review workspace.

### Reserved product destinations

The following routes are reserved conceptually but should not ship until their
corresponding slice provides useful current capability:

- `/studio/knowledge`;
- `/studio/governance`;
- `/studio/activity`.

Existing bookmarked maintenance and acquisition routes should remain
backward-compatible during the transition. Redirecting or retiring them
requires separate route and regression review.

Organization Unit hierarchy is an explicit structural relationship. A parent
Unit groups child Units, but it never creates or implies a Position reporting
relationship, Process ownership, Role mandate, Role Coverage, or operational
responsibility. The browser presents a focused expandable tree and hierarchy
paths rather than one organization-wide diagram. Reparenting continues to use
the existing same-Organization foreign key, stale-write protection,
append-only history, and deferred cycle constraint.

## Studio home

The first screen answers: **What has this organization documented, what needs
review, and where should I continue building?**

It contains four restrained sections rather than a dashboard of decorative
metrics.

### Current documented model

Show compact, deterministic inventory facts:

- People;
- Positions;
- Organizational Units;
- Operational Roles;
- Processes; and
- Systems.

Counts describe records in the current organization-scoped snapshot. They do
not measure quality, performance, importance, or completeness.

### Things to review

Show only reproducible questions supported by current canonical data, such as:

- Positions without a documented Organizational Unit;
- Processes without an Owner Role;
- Operational Roles without an active mandate;
- Role Mandates without current human coverage;
- Draft Processes with unresolved responsibility; and
- Governance that is not configured.

Do not display counts for validation, unresolved source evidence, Role drift,
documentation drift, or governance rules until the underlying concepts are
represented and their deterministic rules are approved.

### Continue building

Offer contextual actions such as adding an Organizational Unit, Position,
Person, Operational Role, Draft Process, or System, or reviewing source
evidence. Availability follows the user's actual capability; unavailable future
features must not compete with working actions.

### Recent activity

Combine authorized projections from structural and operating-model change
history in transaction-time order. Every item retains its domain, actor,
reason, effective time, and recorded time. Version 1 must not claim that one
event caused another or that a calculated FLOW finding itself changed.

## Workspace Health

Workspace Health is an explainable review lens, not a score.

It uses facts and questions such as “This Process has no documented Owner
Role” or “This Role Mandate has no current human coverage.” It must not invent
health grades, risk scores, workload measures, performance judgments,
knowledge scores, or documentation-coverage percentages.

Strong evidence language remains reserved for its approved meaning. Graph
connectivity may establish a review set; it does not prove failure or required
change.

## Relationship canvas direction

A future relationship canvas should help a person understand the local context
around a selected Process, Role, Position, System, Unit, Exception, or
dependency. It is not a free-form diagrammer and is not the canonical editing
surface. Structured Studio actions remain responsible for validation,
organization scoping, audit history, and safe mutation.

The canvas belongs after the core builders can create trustworthy connected
data. It must remain focused and navigable rather than becoming one enormous
organization graph.

## Workspace Studio v1 sequence

### Slice 1 — Organization Builder

The first implementation slice establishes the Studio shell and enables an
authenticated Workspace Administrator to:

- add and rename Organizational Units;
- establish and change parent/child Unit relationships;
- add and rename Positions;
- move Positions between existing Units;
- add People without creating Users;
- establish, replace, and end Position Assignments; and
- use existing reporting-relationship maintenance from the Studio context.

The first Studio home is intentionally useful but small. It shows documented
inventory counts already supported by the organization-scoped projection,
deterministic review questions the existing data can answer, direct actions for
the available Organization Builder operations, and recent structural history.
It does not wait for every later Builder before establishing the Studio mental
model.

The slice reuses the Organization Structure administration boundary and its
append-only history. It may add only the forward-only action vocabulary and
least-privilege INSERT permissions required for audited creation. It does not
create a broad Workspace Studio database credential.

Potential duplicate Units, Positions, or People should be surfaced before
creation. Duplicate names remain valid when organizational context genuinely
requires them; Lotura must not turn a name into durable identity or add an
incorrect global uniqueness constraint.

A Position without a current assignment is presented as **No current
assignment documented** unless authoritative evidence supports a stronger
vacancy statement.

### Slice 2 — Responsibility Builder

Create and maintain Operational Roles, Role Mandates, and Role Coverage while
preserving Person, User, Position, Operational Role, mandate, and coverage as
distinct concepts. Operational Roles receive immutable stable identity and
first-class append-only history under LAD-038. A new Role begins with an
explicit first Position mandate; Position titles and reporting relationships
never create responsibility automatically.

Responsibility Builder provides an organization-scoped Role inventory, a
guided Role-and-first-mandate flow, stable Role detail routes, definition
maintenance, dependency-aware inactivation, explicit mandate and coverage
maintenance, connected Process/System context, and Role activity. It reuses the
Structure administration credential rather than introducing a universal Studio
write role.

Version 0.1 retains explicit end-then-establish sequences for replacing a
mandate or coverage. Standalone orphan Role creation, reactivation,
RoleAssignment transition, committee/external mandate holders, governance
workflow, and FLOW calculation changes remain deferred.

### Slice 3 — Process Builder

Bring the approved Process Acquisition and Operating Model Authoring direction
into Studio through separately reviewed actions for Steps, responsible Roles,
Systems, and Exceptions. Process dependencies remain a later slice.

The Process Builder foundation provides Studio inventory and Process
definition/ownership maintenance. Step Builder v0.1 follows LAD-040: Steps
receive immutable identity and may be added, edited, reordered one position at
a time, and assigned an explicit responsible Operational Role. A null Step
Role continues to inherit responsibility from the Process Owner. Step removal,
Process dependencies, Step retirement, and approved Process versions remain
later reviewed slices. Technology & Exceptions Builder v0.1 completes the
approved System catalog, Process-System usage, and alternate-path Exception
portion of this direction under LAD-041.

### Slice 4 — Technology Builder

Create and maintain Systems and their explicit Process relationships. A System
link does not imply criticality, ownership, or operational dependency beyond
the relationship actually recorded. Version 0.1 implements Systems only;
integrations, APIs, AI services, and document repositories remain deferred.

### Slice 5 — Studio synthesis

Complete the Studio home, Workspace Health questions, combined Activity view,
and the honest read-only Governance and Discovery entry points supported by
the available data.

AI-assisted Discovery and the relationship canvas remain later capabilities;
they are not prerequisites for a useful Workspace Studio v1.

## Slice 1 implementation boundary

Before code or migration work begins, Slice 1 must preserve these boundaries:

- one shared Lotura codebase and organization-scoped behavior;
- authenticated private-workspace access and explicit Structure
  administration enablement;
- the existing dedicated server-only Structure administration credential;
- server-derived Organization and actor identity;
- same-Organization foreign keys and target validation;
- immutable stable keys;
- deterministic stale-write protection;
- dependency and cycle checks inside the mutation transaction;
- atomic canonical mutation and append-only history insertion;
- no ordinary hard deletion; and
- no Studio capability in public fixture/demo mode.

Slice 1 does not implement Operational Role creation, Process authoring beyond
the existing capability, System mutation, workspace-appearance persistence,
governance writes, imports, AI, approved versions, or a relationship canvas.
Those remain separately reviewed slices rather than hidden scope in the first
builder.

### Proposed Slice 1 database delta

The current structural schema already supports the records and relationships
required by Organization Builder. The smallest expected forward-only migration
is `0011`, limited to adding `create` and `establish_assignment` to
`organization_structure_change_action`.

The separately reviewed post-migration privilege delta would grant the
existing Structure administration role column-level `INSERT` on
`organization_units`, `positions`, and `people` for only the fields accepted by
the creation actions, plus `USAGE` on the corresponding identity sequences.
Environment-specific database roles do not belong in the migration SQL.

No new domain table, generic Studio history table, global uniqueness rule, or
unrestricted write role is expected for Slice 1. Exact SQL, column lists,
transaction statements, enum ordering, and rollback behavior require a final
implementation plan and approval before migration generation.

Creation and its history row must occur in one transaction. Entity creation
records an empty prior canonical state and the complete accepted resulting
state. Establishing an initial Position Assignment records the Position as the
history target, rechecks Person and Position scope, uses the Position revision
as a compare-and-set boundary, and preserves the effective-dated Assignment as
a distinct record.

## Slice 2 implementation boundary

Responsibility Builder follows LAD-038 and reuses the authenticated Structure
administration boundary. It adds immutable random UUID identity to Operational
Roles and permits Role definition maintenance, dependency-aware inactivation,
explicit Role Mandates, and explicit Role Coverage. A new Role is created only
with its first Position mandate, and the same transaction records separate
Role-targeted creation and Position-targeted mandate history.

Migration `0012` is forward-only and additive. It adds `roles.stable_key`, the
corresponding uniqueness and immutability protections, and an
`operational_role` target with a tenant-safe Role foreign key in
`organization_structure_changes`. It adds no new table and does not alter
Process, System, RoleAssignment, FLOW, or public fixture semantics.

The Structure administration privilege delta is limited to Role definition and
status columns, the Role target column on append-only history, and read access
to the tables required for inactivation dependency checks. No hard deletion,
table-wide mutation, schema authority, migration authority, or universal Studio
credential is introduced.

Standalone Role creation, reactivation, one-step mandate/coverage replacement,
RoleAssignment transition, committee/external holders, governance workflow,
bulk operations, and FLOW changes remain outside Slice 2.

## Future workspace appearance

Workspace appearance belongs in Studio eventually, but its first persisted
form still requires the separately reviewed extension anticipated by LAD-028:
display name, approved logo URL, and accessible accent color. Deployment
configuration remains a bootstrap source, and Lotura retains control of
semantic colors, evidence language, accessibility, layout, and behavior.

The Organization Builder slice does not introduce appearance persistence or an
asset-upload service.

## Enduring language

Preferred language:

- **Workspace Studio** — the governed authoring environment;
- **Build** or **maintain** — intentional changes to the digital twin;
- **Current documented model** — the organization-scoped representation
  available at the visible as-of time;
- **Things to review** — explainable questions supported by modeled facts;
- **Activity** — recorded changes, without invented causality; and
- **Organizational digital twin** — a living, evidence-based representation,
  never an automatic claim of completeness or truth.

Avoid using **Administration** as the product metaphor, **health score** as a
substitute for evidence, or **real-time digital twin** unless real-time source
integration and its provenance have actually been established.
