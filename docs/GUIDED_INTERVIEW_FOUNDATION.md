# Guided Interview Foundation v0.1

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
- owner or migration credentials.

Public/demo mode cannot enable Discovery. Public Northstar requires neither
variable and exposes no Discovery route or control.

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
```

The normal runtime role may receive `SELECT` on the two Discovery tables for
server-rendered reads. It remains unable to insert, update, or delete.

The Discovery role receives no write privilege on Process, Step, Role, System,
Exception, dependency, Organization Structure, `operating_model_changes`, or
any unrelated table. It receives no schema, database, role, migration,
`TRUNCATE`, observation `UPDATE`, or observation `DELETE` privilege.

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
selection, governed conflict detection, structured field matching, approval,
application to the Process, Process versioning, proposal withdrawal or
rebasing, export, retention automation, and deletion require later decisions.
Refresh-safe server persistence exists for submitted observations and proposal
choices; unsent form text remains browser-local and may be lost.
