# Inquiry Review & Knowledge Outcome v0.1

**Status:** Accepted under LAD-060. Generic implementation and isolated
fictional verification are complete. Migration application, credential
changes, environment configuration, JU data, deployment, and infrastructure
remain separately controlled release actions.

## Product outcome

Question-Driven Discovery can preserve evidence before anyone knows which
Process, if any, describes the work. The next manual step is not automatic
Process creation. It is an accountable human review that answers:

> What did we learn, and where should this understanding go next?

The review may connect the understanding to an existing Process, preserve a
possible new Process for later governance, record that the work crosses
several Processes, keep additional validation open, or conclude that no
separate Process is needed. More than one conclusion may be true.

The review is successful even when it produces no proposal and no documented
change. It does not create, approve, version, or mutate a Process or Process
Family.

## Product principles

- No change is a valid outcome.
- Review must preserve uncertainty rather than force a Process boundary.
- A route is not an outcome, an outcome is not a proposal, and a proposal is
  not an approval.
- Existing answer states such as **Known** and **Needs validation** remain
  evidence context. The person is not required to classify every answer again.
- Counts support comprehension; they are not a score or the product result.
- Merely viewing the review page creates no record.
- AI may later help summarize evidence, but it does not choose the outcome in
  this milestone.

## Exact experience

When an inquiry-scoped interview reaches **Ready for review**, the page offers
**Review what you learned**.

The review page shows:

- the original organizational question and interview scope;
- the exact current answers, including their evidence states;
- visible unresolved, conflicting, and validation-needed evidence; and
- one human conclusion section using ordinary language.

The person selects one or more conclusions:

- **Connect this understanding to an existing Process**
- **This may be a new Process**
- **This crosses several Processes**
- **More validation is needed**
- **No separate Process is needed**

Choosing **Connect this understanding to an existing Process** requires one
current Process from the same Organization. It records reviewed context only;
it does not copy evidence into the Process, change the Process, or establish
that the Process fully explains the evidence.

The other choices accept a short explanation when it helps preserve why the
conclusion was reached. An explanation is required for **This may be a new
Process**, **This crosses several Processes**, and **More validation is
needed** so the next person receives actionable context. It is optional for
the other two choices.

Submitting **Finish review** creates the complete review package atomically.
The resulting Knowledge Outcome prioritizes a human-readable explanation:

- what question was reviewed;
- what evidence was included;
- what remains unknown, conflicting, or in need of validation;
- which human conclusions were recorded;
- any existing Process selected as context; and
- the explicit statement that no Process was created, proposed, approved, or
  changed by this review.

When there is no proposed change, the outcome does not show an empty mapping
workspace or ask the person to manufacture work. Appropriate navigation may
include **Return to Discovery**, **Return to the selected Process**, or
**Finish for now**. Candidate Process creation remains unavailable until its
separate governed slice exists.

## Smallest durable domain model

The current inquiry, session, and append-only observation records preserve the
question and evidence. They do not preserve which observation revisions a
person actually reviewed or the conclusions they explicitly chose. A durable
historical outcome therefore requires a small persisted review package.

### DiscoveryInquiryReview

One immutable completed review records:

- Organization;
- immutable random stable key;
- exact inquiry and inquiry-session identities;
- review sequence;
- inquiry-session revision reviewed;
- optional same-session review stable key that this review supersedes;
- optional bounded human note;
- authenticated Lotura actor; and
- completion transaction time.

There is no draft review row in v0.1. Viewing or abandoning the form performs
no mutation. The first completed review closes the inquiry-scoped interview.
If a later correction is necessary, it appends a new complete review against
the same frozen evidence context and identifies the prior review it
supersedes. Earlier reviews remain immutable.

### DiscoveryInquiryReviewSource

Each immutable source link identifies one exact active inquiry observation
included in the review. The source table freezes the reviewed evidence set
without copying or summarizing the observation text. The observation remains
the authoritative source record.

The first review must include every active observation in the session at the
reviewed revision. A later superseding review uses the same frozen source set;
new evidence begins a new Discovery cycle rather than silently changing the
meaning of a completed review.

### DiscoveryInquiryReviewOutcome

Each immutable outcome row records one typed human conclusion. The initial
forward-only outcome vocabulary is:

- `connect_existing_process`
- `possible_new_process`
- `spans_multiple_processes`
- `additional_validation_required`
- `no_separate_process_needed`

Several kinds may coexist, but each kind appears at most once in one review.
Only `connect_existing_process` contains a typed Process identity, and that
Process must be current and belong to the same Organization. Every other kind
must have no Process target. Free-form polymorphic targets and JSON references
are not permitted.

This table preserves conclusions; it does not become a task, assignment,
proposal, approval, Process version, or operating-model history record.

## Why existing records are insufficient

`DiscoveryInquiryRoute` records where a person chose to go while gathering
knowledge. Reusing it for a completed interpretation would make navigation and
review mean the same thing.

The inquiry session can record **closed**, but one mutable status cannot show
which evidence was reviewed, simultaneous conclusions, actor attribution, or
later superseding interpretation.

Process-bound `DiscoveryProposal` and mapping records require an existing
Process and represent later lifecycle layers. Reusing them would violate the
no-placeholder boundary and manufacture a proposal when the correct outcome
may be no change or more validation.

## Deterministic outcome derivation

The outcome page derives factual context only from the frozen review package:

- **Reviewed answers** — number of exact source links.
- **Known**, **Assumed**, **Unknown**, **Needs validation**, and **Conflicting
  observation** — counts grouped by the linked observations' recorded states.
- **What we concluded** — the typed outcome rows and their human explanations.
- **Existing Process context** — the typed Process target recorded by
  `connect_existing_process`, when present.
- **Later interpretation** — a review is current only when no later review in
  the same session supersedes it.

Lotura does not infer `possible_new_process`, `spans_multiple_processes`, or
`no_separate_process_needed` from answer text or counts. It does not calculate
confidence, maturity, risk, quality, completion, or compliance scores.

## Atomicity and lifecycle protections

Finishing a review must use one serializable transaction that:

1. reauthorizes private-workspace Discovery access;
2. derives Organization and authenticated actor on the server;
3. locks the exact inquiry and inquiry session;
4. verifies the expected session revision and **Ready for review** state;
5. resolves the exact active observation set;
6. validates at least one source and at least one human conclusion;
7. validates every same-Organization typed target;
8. inserts the review, every source link, and every outcome;
9. closes the session for the first completed review; and
10. commits only when the entire package is complete.

Deferred database constraints or equivalent protected completion semantics
must prevent a partial package from committing. A forced source, outcome,
target, or lifecycle failure rolls back the review, conclusions, source links,
and session transition together. Compare-and-set rejection returns the person
to a refreshed review rather than overwriting newer evidence.

Review, source, and outcome rows are append-only. Stable keys and source
identity are immutable. UPDATE and DELETE are rejected by the database.

## Security and tenant boundary

Slice C follows LAD-002, LAD-008, LAD-015, LAD-016, LAD-018, LAD-021 through
LAD-026, LAD-029, LAD-032, LAD-035 through LAD-037, LAD-042, LAD-046, LAD-051,
LAD-053, LAD-056, and LAD-057. It extends these decisions and conflicts with or
supersedes none.

The current dedicated Discovery credential may receive only:

- SELECT on the exact inquiry, session, observations, current Processes, and
  new review tables needed by this page;
- INSERT on the review, source, and outcome tables;
- exact sequence use for those inserts; and
- the already approved limited inquiry-session lifecycle UPDATE needed to
  close a reviewed session.

It receives no Process, Process Family, operating-model, structured mapping,
proposal-review, version, application, Organization Structure, schema,
database, migration, or role-administration write privilege. Runtime receives
SELECT only on the new tables. Public/demo mode must fail closed before any
Discovery database module initializes and receives no new fixture content or
credential.

Every foreign key includes Organization context. The review actor is the
authenticated Lotura application identity at completion time and is not
coupled to Person, Position, Membership, Operational Role, RoleMandate,
RoleCoverage, Process ownership, or reporting hierarchy. Logs and URLs must
not include the organizational question, scope, answer text, or review notes.

## Expected implementation files after approval

The bounded implementation is expected to change:

- `ARCHITECTURE_DECISIONS.md`, `PRODUCT_ROADMAP.md`, and the Question-Driven
  Discovery documentation status;
- `db/schema.ts`, one new forward-only migration `0027`, and Drizzle migration
  metadata;
- focused inquiry review data, administration, and policy modules;
- private review and Knowledge Outcome pages plus one focused form;
- the existing inquiry interview page for its review entry point;
- focused repository, authorization, lifecycle, and public-isolation tests;
  and
- Discovery least-privilege and controlled-rollout documentation.

No package, fixture, FLOW, public Northstar, existing Process-bound Discovery
semantics, Process Family behavior, prior migration, or canonical
operating-model mutation belongs in this slice.

## Verification strategy

Repository and isolated fictional verification must prove:

- exact inquiry, session, session-revision, and active-observation provenance;
- one complete review package with one or more simultaneous outcomes;
- same-Organization Process target enforcement and cross-tenant rejection;
- no per-answer reclassification requirement;
- first-review session closure and append-only superseding review behavior;
- stale-write rejection and atomic rollback on forced source, outcome,
  target, and lifecycle failures;
- immutable review, source, and outcome identity and UPDATE/DELETE rejection;
- exact Discovery-role allowed operations and denied canonical writes;
- runtime read-only behavior;
- merely viewing or abandoning review performs no write;
- no proposal, mapping, Process, Family, version, history, or FLOW mutation;
- public/demo routes fail closed before database initialization;
- no question, scope, answer, or review-note text enters logs or URLs;
- current Process-bound review and Knowledge Outcome behavior is unchanged;
  and
- zero fictional probe rows persist.

Migration application, credential enablement, Production configuration,
deployment, and any first real JU review remain separately controlled release
actions after generic implementation and isolated verification.

## Explicit deferrals

This slice does not create a Process, propose a new Process, attach or copy
inquiry evidence into Process-bound Discovery, create Process Family membership
or relationships, assign validation to a Person, Role, Unit, or source, send
notifications, implement multi-person approval, add AI interpretation, change
FLOW, add Reference Models, create scores or dashboards, or add public content.

Slice D requires a separate accepted architecture decision before a reviewed
`possible_new_process` conclusion can enter governed candidate Process
creation.
