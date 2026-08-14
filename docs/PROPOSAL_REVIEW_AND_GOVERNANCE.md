# Proposal Review & Governance v0.1

Proposal Review is the accountable handoff between a finished set of specific
proposed changes and a future governed application. It answers which exact
items may move forward, which should not, and which need more validation.

It does not change the documented Process. It does not create a Process
version. It does not infer approval authority from reporting relationships,
Process ownership, Position, Person, RoleMandate, or RoleCoverage.

## Review boundary

A review can begin only when all of the following are true:

- the workspace is private and authenticated;
- Proposal Review is explicitly enabled for one configured Organization;
- the structured mapping is finished;
- at least one current mapped item proposes a specific operating-model change;
- the documented Process still matches the fingerprint captured by the
  proposal; and
- no review already exists for that exact mapping.

Questions deliberately preserved as unresolved remain visible as context. They
are not changes to approve. A successful no-change Knowledge Outcome therefore
does not create an empty review package.

Each specific proposed change can receive one of three decisions:

- **Approve to move forward** — the exact item may enter the future
  Process-version and application boundary.
- **Do not approve** — the item does not move forward from this review.
- **Needs more validation** — the item remains unresolved and requires an
  explanation.

Later decisions append to the earlier history. They do not overwrite or delete
what a reviewer previously recorded. A review can be finished only after every
current specific change has a decision. The completed result is derived from
those decisions: approved to move forward, approved in part, more validation
needed, or no changes approved.

## Identity and governance

The actor stored with each decision is the authenticated Lotura application
identity at the time of the change. It is deliberately independent from Person,
Position, Membership, organizational assignment, Operational Role, Process
ownership, and reporting hierarchy.

Version 0.1 allows a private pilot to explicitly configure its authenticated
administrator as the Proposal Reviewer. This is one enforced capability, not a
claim that Process Stewardship or the complete Contributor / Approver / Manager
/ Leadership governance model exists. When those assignments are absent, the
interface says **Not assigned** or **Not configured**.

## Authentication and configuration

Proposal Review is disabled by default. It requires both server-only variables
in the intended private Production workspace:

- `LOTURA_PROPOSAL_REVIEW_MODE=enabled`
- `LOTURA_PROPOSAL_REVIEW_DATABASE_URL=<dedicated proposal-review role URL>`

Configuration fails closed unless temporary-password private access and one
Organization-scoped Neon source are active. The proposal-review credential must
target the exact runtime database and endpoint while remaining distinct from:

- `DATABASE_URL`;
- `DATABASE_URL_UNPOOLED`;
- `LOTURA_STRUCTURE_ADMIN_DATABASE_URL`;
- `LOTURA_PROCESS_ADMIN_DATABASE_URL`;
- `LOTURA_DISCOVERY_DATABASE_URL`;
- owner or migration credentials.

Public/demo mode cannot enable Proposal Review. Public Northstar receives
neither variable and renders no review route or control.

## Least-privilege database contract

The dedicated application role needs only the following privileges for this
slice. The exact role name remains environment-specific.

```sql
GRANT SELECT ON TABLE organizations, processes,
  discovery_sessions, discovery_proposals,
  discovery_proposal_mappings, discovery_mapping_items,
  operating_model_proposal_reviews,
  operating_model_proposal_review_decisions
  TO <proposal_review_role>;

GRANT INSERT (
  organization_id, mapping_id, mapping_stable_key, mapping_revision,
  proposal_id, proposal_stable_key, session_id, session_stable_key,
  process_id, process_stable_key, documented_process_fingerprint,
  started_by_actor
) ON operating_model_proposal_reviews TO <proposal_review_role>;

GRANT UPDATE (
  status, revision, completed_at, completed_by_actor,
  completion_note, updated_at
) ON operating_model_proposal_reviews TO <proposal_review_role>;

GRANT INSERT (
  organization_id, review_id, review_stable_key, mapping_id,
  mapping_stable_key, item_revision_id, item_revision_stable_key,
  item_stable_key, item_sequence, decision_sequence, disposition,
  review_note, actor_identifier
) ON operating_model_proposal_review_decisions TO <proposal_review_role>;

GRANT USAGE ON SEQUENCE operating_model_proposal_reviews_id_seq,
  operating_model_proposal_review_decisions_id_seq
  TO <proposal_review_role>;

GRANT SELECT ON TABLE operating_model_proposal_reviews,
  operating_model_proposal_review_decisions TO <runtime_role>;
```

The proposal-review role receives no `UPDATE` or `DELETE` on decision history,
no `DELETE` or `TRUNCATE` on review packages, and no mutation privilege on
Discovery evidence, mappings, Processes, Steps, Roles, Systems, Exceptions,
dependencies, Organization Structure, operating-model history, schema, roles,
databases, or migrations. Database triggers enforce append-only decisions,
immutable source context, exact item revisions, deterministic lifecycle
transitions, and compare-and-set revision advances.

## Deferred boundary

Approval to move forward is not application. Process Versions & Atomic
Application remains a separate milestone with its own authority, credential,
effective-time semantics, before/after version history, and rollback contract.
Proposal Review v0.1 also does not add automatic routing, Steward assignments,
committees, notifications, rebasing, FLOW changes, or AI recommendations.
