# Minimum Viable Process Baseline Alpha

## Product checkpoint

This checkpoint lets a participant accomplish something useful before every
Discovery question is answered. After preserving at least one answer, the
participant can choose **Use what I have**, complete the existing human review,
and—when the review identifies a possible new Process—create a shared working
Process baseline.

The baseline is intentionally small:

- Process name;
- readable purpose, including known start and end boundaries when available;
- one to twelve major ordered Steps;
- optional explicitly confirmed Owner Role; and
- optional explicitly confirmed membership in an existing Process Family.

The result has `draft` status. It is visible and useful in the private workspace,
but is not approved, complete, or institutional truth. The participant can stop
there and return later to **Strengthen with Lotura**. Unanswered, conflicting,
unknown, and Needs validation evidence remains preserved.

## Reuse unchanged

- authenticated Organization scope and private workspace access;
- durable inquiry sessions and append-only observations;
- AI Discovery Analyst synthesis, adaptive follow-ups, and pause behavior;
- immutable human Knowledge Outcomes;
- Draft Process, ordered Step, Operational Role, and Process Family models;
- Process authoring's dedicated database credential and history vocabulary;
- existing Process-bound Discovery, proposal, review, and application paths; and
- public Northstar isolation.

## Human and AI boundary

AI may prefill a name, narrative purpose, known boundaries, and major Steps from
the most recent stored working synthesis. Those values are a starting point only.
The Workspace Administrator edits every field and confirms the final baseline.
Owner Role and existing Process Family selections each require explicit human
confirmation.

The provider is not called when the baseline is created. No model output writes
directly to `processes`, `process_steps`, or Process Family membership. The
latest immutable human review must contain `possible_new_process`, and retrying
the same review cannot create a second Process.

Human review can also distinguish a possible new Process Family or a Policy or
governing document. These classifications do not create a Process. A Policy is
not presented as a parent Process, and first-class Policy authoring remains
deferred.

## Atomic write

The action reauthorizes the workspace and verifies the exact Organization and
latest immutable human review through the read boundary. One serializable
Process-administration transaction then validates prior use of that source review,
the duplicate name, optional active Owner Role, and optional active Process Family.
It creates together:

1. one Draft Process;
2. every supplied ordered Step;
3. an optional current Process Family membership; and
4. append-only history for the Process, Steps, and membership.

History records the source inquiry, inquiry session, and Knowledge Outcome key,
plus `baselineKind: minimum_viable` and that unresolved evidence remains
preserved. Any failed validation or write retains no partial baseline.

## Migration 0033

Migration `0033` only:

- adds `possible_new_process_family` and `possible_policy` to the existing
  inquiry-review outcome enum;
- expands the existing explanation constraint for those human classifications;
  and
- permits the exact compare-and-set transition from an authorized paused inquiry
  interview to `ready_for_review` at the `review` question key.

It creates no table, canonical Process column, Policy record, role, grant, or
provider configuration. Existing session identity, authorization, immutability,
revision, and terminal-state guards remain.

## Privilege boundary

Migration `0033` requires no new application-role grant. Baseline creation reuses
the existing dedicated Operating Model Authoring role, which already has the
reviewed Process, Step, Process Family membership, sequence, and append-only
history privileges. The Discovery role retains its existing three session-column
updates; runtime remains read-only.

Verification must prove that the authoring role still cannot update or delete
history, the Discovery role receives no canonical write, and runtime receives no
write. Owner and managed-role flags and memberships must remain unchanged.

## Release sequence

1. implement and test the complete generic vertical slice;
2. commit the reviewed application and migration together;
3. run the isolated fictional migration and boundary verification;
4. review the rolled-back fictional evidence;
5. separately authorize and run the exact-commit JU migration verification;
6. deploy that exact commit to JU Production; and
7. conduct authenticated QA: use a partial inquiry, classify it, edit a baseline,
   create the Draft, verify the Steps/Family/history, and return later through
   **Strengthen with Lotura**.

No application deployment that depends on migration `0033` should precede the JU
migration.
