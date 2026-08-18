# Guided Interview Foundation v0.1

Guided interviews are one entry point into Lotura's broader Organizational
Knowledge Lifecycle:

**Observe → Interview → Evidence → Review → Knowledge Outcome**

When specific changes are proposed, the lifecycle continues through Structured
Proposed Changes, Proposal Review, Approval, a documented Process version, and
Continuous Improvement. A no-change Knowledge Outcome may also complete the
current cycle successfully.

The interview is not the operating model. It preserves participant statements
as evidence so accountable people can review and reconcile them before any
documented Process changes.

Guided Discovery is the first evidence-capture layer for Process Discovery. It
lets an authenticated Workspace Administrator describe one existing Process
through a bounded, application-versioned interview and then review the
resulting observations.

It does not use AI. It does not update the Process.

## Product boundary

The experience preserves three distinct concepts:

1. **Documented draft Process** — the existing operating-model record that
   provides context for the interview.
2. **Discovery session** — the resumable scope and progress of one interview.
3. **Discovery observation** — one attributable answer or explicit unknown.

An observation is source evidence. **Ready for review** describes interview
progress only; it does not mean reconciled, approved, imported, published, or
current organizational truth. A correction appends a new observation and
retains the prior observation as superseded evidence.

The initial question catalog is `guided-interview-v1` and covers:

- purpose;
- start and end boundaries;
- participants and responsibility;
- high-level sequence;
- Systems;
- Exceptions;
- dependencies and handoffs;
- unresolved questions.

Each saved observation records the exact prompt shown. Later prompt changes
therefore cannot rewrite the source context.

## Deterministic review signals

When a session is ready for review, Lotura may surface explainable **Things to
review** under LAD-043. Version 0.1 looks only for bounded patterns such as:

- Known observations containing explicit uncertainty language;
- Known corrections that may have omitted substantive context from the prior
  record.

Selecting Known confirms the complete answer. Multiple steps, items, or
before/after statements do not require a second confirmation. If the
participant knows that parts have different certainty, they can preserve that
distinction in a correction or during later reconciliation.

Assumed, Unknown, Needs validation, and Conflicting observation are deliberate
review decisions. They remain available to later reconciliation and do not
generate another immediate review prompt merely because the answer has several
parts, boundary labels differ, or a correction changed the classification.
The interview review page must say plainly that these answers can move forward
unchanged and that appending a correction is optional. Validation by another
team or authoritative source belongs in later review; it is not a prerequisite
for continuing from the interview into the proposed-update step.

These signals are computed at read time. They are not stored findings, quality
scores, truth determinations, conflict resolution, or AI interpretations. A
signal never changes evidence or the canonical Process. No signal does not mean
the evidence is complete or correct; human review remains required.

The correction form copies the active observation text and evidence state by
default. This reduces accidental context loss while preserving LAD-042's rule
that every submitted correction is a new append-only observation.

## Side-by-side review

Under LAD-044, a session that is Ready for review can compare the current
documented Process with the active interview notes. The page groups exact
answers by purpose, boundaries, responsibility, Steps, Systems, Exceptions,
dependencies, and unresolved knowledge. Every answer retains its certainty
label and links back to the interview record.

The comparison does not parse free text, match records, approve information, or
update the Process. A human may record how each exact answer should be treated
in a proposed update, but that choice is not a structured field mapping or an
approval. Superseded answers remain visible in the interview history but are
not presented as current notes. The interface uses conversational language;
precise internal model terms remain in technical documentation where necessary.

## Proposed update package

Under LAD-045, a Workspace Administrator can record how each current interview
answer should be treated:

- **Use in proposed update** — carry the exact answer into the proposed-update
  basis for later structured review.
- **Keep what is documented** — retain the current documented information for
  this point.
- **Leave for later** — preserve the answer and its uncertainty without placing
  it in the current proposed update.

Choices are append-only. Changing a choice records a new decision instead of
erasing the earlier one. The package also freezes the documented Process
snapshot used for the comparison. Finishing the package means only that every
current interview answer has a treatment and the package is ready for another
review. It does not approve or change the Process.

While a package is Draft, a new append-only interview correction can be
reviewed and given its own treatment. Once the package is Ready for review,
the source observations and proposal choices are frozen together. Changing
that source later requires the separately deferred withdrawal/rebase workflow;
it cannot silently make a completed review stale.

Free text is not silently converted into structured Steps, Roles, Systems,
Exceptions, or dependencies. The package identifies the exact notes selected
for later work and says when structured matching is still required.

## Knowledge Outcomes

Under LAD-051, a finished review produces a deterministic, human-readable
Knowledge Outcome. It summarizes the active observations and their latest
append-only choices, together with any existing structured mapping. It does not
replace the evidence, create an approval, score confidence, or change the
documented Process.

Several outcomes may be true at once:

- current documentation was kept for part of the review;
- information was preserved for later;
- another participant or authoritative source may be needed;
- evidence was selected for specific proposed changes;
- conflicting evidence or a boundary question remains; or
- no operating-model change was proposed.

No change is a complete and valid result. When no answer is selected for an
update, Lotura shows the Knowledge Outcome and does not create or link to an
empty structured-mapping workspace. When answers are selected, the outcome
distinguishes selected evidence from specific human-authored changes and links
to the mapping workspace only when it is relevant.

The projection is reproducible because a Ready for review package freezes the
documented Process snapshot, append-only decisions, completion actor, and
completion time. Version 0.1 therefore requires no new table, migration,
credential, privilege, or environment variable.

## Knowledge states

- **Known** — the participant represents the observation as current fact.
- **Assumed** — the participant believes it is true but lacks confirming
  evidence.
- **Unknown** — the answer is not currently known; response text is optional.
- **Needs validation** — the observation requires an authoritative check.
- **Conflicting observation** — the participant knows that credible accounts
  disagree.

These states classify evidence; none establishes institutional approval.

## Privacy boundary

Version 0.1 is restricted to sanitized operational knowledge. The interface
warns participants not to enter donor, student, prospect, gift, wealth, HR,
password, credential, connection-string, or other sensitive record data. No
interview content is sent to an AI provider.

Live institutional enablement requires a separate security, governance,
retention, and deployment approval. The migration being present in the shared
codebase is not authorization to enable Discovery in an environment.

## Authentication and configuration

Discovery is disabled by default. Enabling it requires both Production-scoped
server variables in the intended private workspace:

- `LOTURA_DISCOVERY_MODE=enabled`
- `LOTURA_DISCOVERY_DATABASE_URL=<dedicated Discovery-role URL>`

The configuration fails closed unless the workspace uses authenticated
temporary-password access, a single Organization-scoped Neon source, and a
Discovery credential targeting that exact database and endpoint. The
Discovery credential must be distinct from:

- `DATABASE_URL`;
- `DATABASE_URL_UNPOOLED`;
- `LOTURA_STRUCTURE_ADMIN_DATABASE_URL`;
- `LOTURA_PROCESS_ADMIN_DATABASE_URL`;
- `LOTURA_PROPOSAL_REVIEW_DATABASE_URL`;
- owner or migration credentials.

Public/demo mode cannot enable Discovery. Public Northstar requires neither
variable and exposes no Discovery route or control.

Proposal Review is a later, separately enabled boundary. A finished structured
mapping with specific changes may be reviewed through the dedicated contract
in `PROPOSAL_REVIEW_AND_GOVERNANCE.md`. Discovery cannot approve or apply its
own proposed changes, and a no-change Knowledge Outcome creates no empty review
package.

## Least-privilege database contract

The application Discovery role needs only:

```sql
GRANT SELECT ON TABLE processes TO <discovery_role>;
GRANT SELECT ON TABLE discovery_sessions, discovery_observations
  TO <discovery_role>;
GRANT INSERT (
  organization_id, process_id, process_stable_key, scope_statement,
  current_question_key, actor_identifier
) ON discovery_sessions TO <discovery_role>;
GRANT UPDATE (status, current_question_key, revision, updated_at)
  ON discovery_sessions TO <discovery_role>;
GRANT INSERT (
  organization_id, session_id, session_stable_key, sequence, prompt_key,
  prompt_text, topic, response_text, epistemic_state,
  supersedes_observation_stable_key, actor_identifier
) ON discovery_observations TO <discovery_role>;
GRANT USAGE ON SEQUENCE discovery_sessions_id_seq,
  discovery_observations_id_seq TO <discovery_role>;

-- Added only when Discovery Proposed Update v0.1 is enabled:
GRANT SELECT ON TABLE discovery_proposals, discovery_proposal_decisions
  TO <discovery_role>;
GRANT INSERT (
  organization_id, session_id, session_stable_key, process_id,
  process_stable_key, documented_process_snapshot,
  documented_process_fingerprint, actor_identifier
) ON discovery_proposals TO <discovery_role>;
GRANT UPDATE (
  status, revision, ready_at, ready_by_actor, updated_at
) ON discovery_proposals TO <discovery_role>;
GRANT INSERT (
  organization_id, proposal_id, proposal_stable_key, session_id,
  session_stable_key, observation_stable_key, decision_sequence,
  disposition, review_note, actor_identifier
) ON discovery_proposal_decisions TO <discovery_role>;
GRANT USAGE ON SEQUENCE discovery_proposals_id_seq,
  discovery_proposal_decisions_id_seq TO <discovery_role>;

-- Added only when Structured Proposed Changes v0.1, Slice 1 is enabled:
GRANT SELECT ON TABLE roles, discovery_proposal_mappings,
  discovery_mapping_items, discovery_mapping_sources TO <discovery_role>;
GRANT INSERT (
  organization_id, proposal_id, proposal_stable_key, session_id,
  session_stable_key, process_id, process_stable_key, actor_identifier
) ON discovery_proposal_mappings TO <discovery_role>;
GRANT UPDATE (
  status, revision, ready_at, ready_by_actor, updated_at
) ON discovery_proposal_mappings TO <discovery_role>;
GRANT INSERT (
  organization_id, mapping_id, mapping_stable_key, item_stable_key,
  item_sequence, state, action, owner_role_id, owner_role_stable_key,
  before_state, proposed_state, rationale, actor_identifier
) ON discovery_mapping_items TO <discovery_role>;
GRANT INSERT (
  organization_id, mapping_id, mapping_stable_key, item_revision_id,
  item_revision_stable_key, session_id, session_stable_key,
  observation_stable_key
) ON discovery_mapping_sources TO <discovery_role>;
GRANT USAGE ON SEQUENCE discovery_proposal_mappings_id_seq,
  discovery_mapping_items_id_seq, discovery_mapping_sources_id_seq
  TO <discovery_role>;

-- Added only when Structured Proposed Changes v0.1, Slice 2 is enabled:
GRANT SELECT ON TABLE process_steps, systems, exceptions,
  process_systems, process_dependencies TO <discovery_role>;
GRANT INSERT (
  process_id, process_stable_key,
  process_step_id, process_step_stable_key,
  responsible_role_id, responsible_role_stable_key,
  system_id, system_stable_key,
  exception_id, exception_stable_key,
  related_process_id, related_process_stable_key
) ON discovery_mapping_items TO <discovery_role>;

-- Added only when Question-Driven Discovery v0.1, Slice A is enabled:
GRANT SELECT ON TABLE discovery_inquiries TO <discovery_role>;
GRANT INSERT (
  organization_id, question_text, actor_identifier
) ON discovery_inquiries TO <discovery_role>;
GRANT USAGE ON SEQUENCE discovery_inquiries_id_seq TO <discovery_role>;
```

The normal runtime role may receive `SELECT` on the two Discovery tables added
by Discovery Proposed Update v0.1 and, after Slice 1, on the three structured-
mapping tables for server-rendered reads. It remains unable to insert, update,
or delete.

For Question-Driven Discovery Slice A, the normal runtime role receives
`SELECT` on `discovery_inquiries` only. The route table is present as durable
forward schema but receives no application write privilege until explicit
human routing is separately approved. The Discovery role receives no inquiry
`UPDATE` or `DELETE`, route `INSERT`, `UPDATE`, or `DELETE`, or additional
operating-model privilege in Slice A.

The Discovery role receives no write privilege on Process, Step, Role, System,
Exception, dependency, Organization Structure, `operating_model_changes`, or
any unrelated table. It receives no schema, database, role, migration,
`TRUNCATE`, observation `UPDATE`, or observation `DELETE` privilege.

## Structured proposed changes — Slice 1

Under LAD-049, a finished proposed-update basis can be turned into explicit
human-authored proposal items. Slice 1 supports only:

- a proposed update to the Process purpose;
- a proposed assignment, replacement, or Draft-compatible clearing of the
  Owner Operational Role; and
- an unresolved question that intentionally preserves evidence without
  pretending it is a Process field change.

Each proposal item cites one or more exact interview answers that were selected
for use in the proposed update. Revisions, withdrawal, and restoration append
new item records. Earlier item revisions and their evidence links cannot be
updated or deleted. The selected Role must be an existing active Operational
Role in the same Organization; it is never inferred from Person, Position,
title, reporting hierarchy, RoleMandate, or RoleCoverage.

A mapping can become **Ready for proposal review** only when every included
answer supports an active item or an unresolved question, no competing purpose
or Owner Role proposals remain, referenced Roles are still active, and the
documented Process still matches the snapshot saved when review began. This
state does not approve or apply the proposal. No row is written to `processes`,
`operating_model_changes`, or any other documented operating-model table.

## Structured proposed changes — Slice 2

Under LAD-050, the same human-authored workspace can also propose:

- a new Step, including its proposed order and an optional existing active
  responsible Operational Role;
- revised wording for an existing Step;
- a changed or unassigned Responsible Operational Role for an existing Step;
- a link to an existing active System, with an explicit description of how it
  is used;
- a new Process Exception, optionally associated with an existing Step;
- revised wording for an existing active Exception; and
- an explicit upstream or downstream relationship to another existing,
  non-archived Process.

These are typed proposals, not executable instructions. Existing targets are
selected by immutable stable key and protected by same-Organization composite
foreign keys. A Step or Exception must belong to the Process being reviewed; a
related Process must be different from that Process; Roles and Systems must be
active; and an existing Process-System or Process-dependency relationship is
not proposed as a duplicate. Revisions cannot silently redirect a proposal to
a different existing Step, System, Exception, or related Process.

The write role receives catalog `SELECT` and typed mapping-column `INSERT`
privileges only. It still cannot insert, update, or delete a Process, Step,
Role, System, Exception, Process-System link, dependency, Process history row,
or any Organization Structure record. Completing the mapping only marks the
package ready for its next human review. It does not approve or apply anything.

## Integrity behavior

- Session and observation stable keys are random database-generated UUIDs.
- Process and session references use same-Organization composite foreign keys.
- Session identity, Process context, scope, creator actor, and creation time are
  immutable.
- Every session update advances the compare-and-set revision exactly once.
- Lifecycle transitions are constrained by a database trigger.
- Observations are append-only through a database trigger.
- Observation append and session advance occur in one SQL statement. A failure
  retains neither half.
- Corrections reference an earlier observation in the same session and
  Organization.
- The actor is the authenticated Lotura application identity at capture time;
  it is not inferred from Person, Position, Membership, Role, or coverage.

## Intentionally deferred

Multiple participants, interviewing on behalf of another Person, Contributor
access, consent records, uploads, source artifacts, AI, dynamic follow-up
selection, proposal-review governance, approval, application to the Process,
Process versioning, completed-package withdrawal or rebasing, export, retention
automation, and deletion require later decisions.
Refresh-safe server persistence exists for submitted observations and proposal
choices; unsent form text remains browser-local and may be lost.

Slices 1 and 2 establish manual structured proposed-change mapping for the
approved Process definition and connected operating-model targets. Human
proposal review, approval, and atomic application to a versioned Process remain
later, separate boundaries. AI may not suggest or automate this path until the
manual mapping, approval, and version-application semantics are proven.
Human approval and atomic application are never implied by a finished mapping.
