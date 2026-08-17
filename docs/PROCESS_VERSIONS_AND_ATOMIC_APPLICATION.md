# Process Versions & Atomic Application v0.1 — accepted design contract

This document describes the accepted LAD-053 design boundary after Proposal
Review. It authorizes implementation planning, not implementation. No code,
schema, migration, credential, environment, deployment, or private-data change
is approved until the resulting implementation is reviewed separately.

## Product boundary

Proposal Review establishes which exact proposed item revisions are eligible
to move forward. It does not change the documented Process. Versioned
application is a separate, explicit human action that may apply the eligible
items and record a new documented Process version.

The v0.1 application action must:

- require a finished Proposal Review containing at least one currently
  approved structured change;
- apply all and only the currently approved item revisions in that review;
- ignore unresolved-question items, which are context rather than canonical
  mutations;
- never infer approval or application authority from Workspace
  Administration, Process ownership, reporting hierarchy, Person, Position,
  Operational Role, RoleMandate, or RoleCoverage;
- perform no write merely because a review or preview page was opened; and
- create no application or Process version when no item is approved.

Version 0.1 does not permit application-time cherry-picking. A reviewer must
record **Not approved** or **Needs more validation** for items that should not
be applied. A package that requires different effective dates must be revised
into separately reviewed packages before application.

## Smallest durable version model

The proposed model is Process-centered and append-only.

### `process_versions`

An immutable, Organization-scoped, complete snapshot of one documented
Process definition at a version boundary. Each row should retain:

- immutable version and Process stable keys;
- monotonically increasing Process-local version sequence;
- predecessor version identity;
- version kind: initial baseline or approved application;
- a versioned snapshot-format identifier;
- the normalized Process snapshot;
- asserted effective time where known;
- transaction timestamp;
- authenticated Lotura application actor; and
- source Proposal Review and application identities when applicable.

The normalized snapshot should be assembled on the server from canonical
records and should include the Process definition, Owner Operational Role,
ordered Steps and responsible Roles, explicit System relationships,
Exceptions, and Process dependencies. It should retain stable keys and the
display values needed to understand the documented state at that time.

Person, Position, current RoleCoverage, reporting hierarchy, and other current
organizational context do not become part of the Process definition merely
because they are displayed near it.

The first approved application should atomically record an initial baseline
snapshot of the documented state immediately before application and the new
post-application version. The baseline must say that its earlier institutional
effective date is unknown rather than inventing one. Later applications append
one successor version.

Version 0.1 should maintain one linear version chain per Process. It should not
support branches, scheduled future activation, overlapping effective periods,
or retrospective chain insertion. An applied effective time must not be later
than the transaction time and must not precede the prior known effective time.

### `operating_model_proposal_applications`

An immutable application ledger linking the exact completed Proposal Review,
the documented-Process fingerprint, the before version, the resulting version,
the application actor, reason, effective time, and transaction timestamp. One
review may be applied successfully at most once.

### `operating_model_proposal_application_items`

An immutable provenance ledger linking each applied item to its exact current
review decision and immutable mapping-item revision. Each row should retain the
typed action, correction-versus-organizational-change classification, and the
canonical before and after states produced by the application.

These records explain why the version changed. They do not replace
`operating_model_changes`, and neither ledger substitutes for improvement
history under LAD-023.

## Exact application semantics

The application service should use a serializable transaction and:

1. reauthorize authenticated private-workspace access and the separately
   configured application capability;
2. derive Organization and actor identity from trusted server configuration;
3. lock and reload the exact Process, finished review, current item decisions,
   and referenced canonical records;
4. verify that the review and mapping are immutable, same-Organization, not
   previously applied, and still pinned to the current documented-Process
   fingerprint;
5. select every and only current item revision whose current review decision is
   **Approve to move forward**;
6. require a human correction-versus-organizational-change classification for
   each selected item, one package reason, and one effective time;
7. re-run all target, tenant, active-state, duplicate, ordering, dependency,
   and cycle guards inside the transaction;
8. capture the complete canonical before snapshot;
9. apply the reviewed typed actions in deterministic item order without
   accepting client-supplied replacement targets or Organization scope;
10. append the appropriate target-specific `operating_model_changes` events,
    expanding its enums and target references forward-only where current
    actions lack exact semantics;
11. capture the complete resulting snapshot;
12. append the baseline version when required, the resulting Process version,
    the application record, and its item-provenance records; and
13. commit only if every mutation, history event, version, and provenance row
    succeeds.

Any stale fingerprint, invalid reference, constraint failure, history failure,
version failure, or provenance failure rolls back the complete operation. A
failed application leaves the finished review eligible for later correction or
retry and writes no partial application record.

The currently reviewed action vocabulary is bounded to:

- update Process purpose;
- change Process Owner Operational Role;
- add a Process Step;
- revise a Process Step;
- change Step responsibility;
- link an existing System;
- add a Process Exception;
- revise a Process Exception; and
- add a Process dependency.

`preserve_unresolved` is not a canonical action and is never applied. Removal,
retirement, reordering beyond the reviewed action shape, Process creation,
Process status change, System creation, Role creation, and other unreviewed
actions remain outside v0.1.

## Human experience

The completed review should offer **Apply approved changes** only when at least
one item is currently approved and the application capability is enabled.
Before confirmation, the page should show:

- the exact approved items that will be applied;
- items not approved or needing validation that will remain unchanged;
- the frozen documented comparison point and a fresh stale-state result;
- required per-item change classification;
- one required reason and effective date; and
- a clear statement that success creates a new documented Process version and
  preserves the prior state.

The user does not select arbitrary items during application. Success should
show the new version sequence, effective date, application actor, before and
after versions, and links back to the evidence, mapping, and review. A later
correction creates another governed proposal and version; it does not edit or
delete history.

## Security and least privilege

Versioned application should be disabled by default and require a dedicated
server-only credential distinct from runtime, Structure administration,
Process administration, Discovery, Proposal Review, owner, and migration
credentials. The exact privilege matrix requires review with the migration,
but must be limited to:

- SELECT on the frozen proposal, mapping, review, current canonical Process
  targets, and version/application tables required for validation;
- the exact column-limited canonical INSERT/UPDATE operations represented by
  approved v0.1 actions;
- INSERT on target-specific append-only operating-model history;
- INSERT on immutable Process version and application provenance tables; and
- only the required sequence use.

It receives no hard-delete, history/version/application UPDATE or DELETE,
unrelated Organization Structure mutation, generic Role or System creation,
schema, database, role, migration, or credential-management privilege.

Every write derives Organization scope on the server, rejects cross-
Organization stable keys, uses compare-and-set protection, and returns bounded
results. Public/demo mode cannot initialize the application database module,
render the control, or invoke the action. Public Northstar receives no
application credential.

## Verification sequence after implementation approval

LAD-053 is accepted. Implementation should proceed only after the exact schema,
write boundary, privilege contract, and isolated test plan receive separate
approval:

1. add the forward-only migration and server-only application boundary;
2. verify the complete mixed-action path in the isolated fictional database;
3. prove stale, duplicate, cross-Organization, dependency, history, version,
   and provenance failures roll back every canonical write;
4. prove application-role least privilege and runtime read-only access;
5. verify public/demo builds do not initialize or expose application;
6. commit, review, and merge shared code without changing JU;
7. separately approve the JU migration, role, Production-only configuration,
   and deployment; and
8. validate JU only when a genuine approved proposal exists. Never manufacture
   a JU change merely to exercise the workflow.

## Explicit deferrals

This proposal does not authorize AI participation, automatic application,
scheduled activation, version branching, rollback by deletion, proposal
rebasing or supersession, multi-Process atomic packages, Process Families,
Reference Models, FLOW calculation changes, notifications, committees,
Steward assignment, improvement outcomes, drift conclusions, or analytics.
