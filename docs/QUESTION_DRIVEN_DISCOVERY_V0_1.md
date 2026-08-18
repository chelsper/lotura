# Question-Driven Discovery v0.1

**Status:** LAD-056 accepted. Slice A is implemented, isolated-verified, and
live-validated in JU at migration journal `25/25`. The first real inquiry
confirmed that Discovery also needs a separate, typed way to gather evidence
before a Process is selected. LAD-057 Slice B is now implemented generically
and passed isolated fictional verification at journal `26/26`; JU rollout
remains separately controlled.

## Product outcome

Question-Driven Discovery lets an authenticated Workspace Administrator begin
with ordinary language instead of first knowing which Process to select.

Examples include:

- How do we process gifts?
- What happens after this handoff?
- Who actually owns this work?
- What happens if this System is unavailable?

The experience helps a person choose the next useful place to look. It does not
claim to answer the question, manufacture a Process, infer organizational
authority, or decide that change is required.

## Exact v0.1 experience

Workspace Studio → Discovery begins with two honest entry paths:

1. **Start with a question** — record what the administrator is trying to
   understand.
2. **Start with an existing Process** — preserve the current manual guided
   interview path.

Submitting **Explore this question** creates a private Discovery inquiry only.
The question is posted in the request body and never placed in the URL.

The implemented Slice A inquiry page shows:

- the exact question and who recorded it;
- current Processes and Process Families that may be relevant;
- clear language that possible matches are navigation choices, not answers;
  and
- links for inspecting possible documentation without recording a route.

After a routing slice is approved and implemented, the page may also offer
explicit choices to review a Process, review a Family, start an interview,
explore before choosing a Process, wait for another participant or source, or
finish for now, followed by an append-only record of deliberate choices.

Opening documentation or inspecting possible matches creates no route event.
The implemented Slice A stops before routing or interview creation. LAD-056's
original Process-bound handoff remains valid when the administrator already
knows the Process. When the Process boundary itself is what the person needs to
discover, the implemented LAD-057 path offers **Explore before choosing a
Process** without manufacturing a placeholder Process. The question may guide
conversational scope copy, but it never becomes interview evidence
automatically.

## Domain boundaries

### DiscoveryInquiry

The smallest durable inquiry contains:

- Organization;
- immutable random stable key;
- exact question text;
- lifecycle: `open`, `waiting_for_information`, `routed`, or
  `closed_for_now`;
- compare-and-set revision;
- authenticated Lotura actor;
- created and updated transaction timestamps.

An inquiry records intent to understand something. It is not evidence,
observed reality, an interview answer, a Knowledge Outcome, a proposal, an
approval, a Process, a Process Family, or a task.

### DiscoveryInquiryRoute

Routing choices are append-only and sequence-numbered. The bounded types are:

| Route | Required typed context | Meaning |
| --- | --- | --- |
| Review documented Process | Existing same-Organization Process | A human chose this Process as the next place to read. |
| Review Process Family | Existing same-Organization Family | A human chose this Family as broader context. |
| Start guided interview | Existing same-Organization Process and newly created session | A human confirmed the Process and interview scope. |
| Wait for another source | No inferred entity target | More information is intentionally needed. |
| Finish for now | No entity target | The inquiry may end without an interview or change. |

Process, Family, and interview references use typed composite foreign keys.
One target-shape constraint prevents mixed or missing context. Route rows are
immutable from the application perspective.

An inquiry transition and its route row occur in the same serializable
transaction. Starting an interview creates the existing Process-bound
`DiscoverySession` and its inquiry route atomically. A failed route insert must
roll back both the inquiry transition and session creation.

## Current-schema support and required migration

The current model already provides:

- durable Organization-scoped inquiries and dormant typed route records;
- Organization-scoped Processes and Process Families;
- Process-bound guided interviews;
- authenticated Discovery actor and credential boundaries;
- immutable interview observations;
- review, Knowledge Outcome, proposal, approval, and application layers.

It can preserve a question before a Process is selected, but it cannot preserve
interview evidence in that state because every `discovery_session` requires
one Process. Making that foreign key nullable would blur inquiry and interview
semantics.

Migration `0024` already added:

- `discovery_inquiry_status`;
- `discovery_inquiry_route_kind`;
- `discovery_inquiries`;
- `discovery_inquiry_routes`;
- typed same-Organization foreign keys and target-shape checks;
- append-only route and terminal-state guards; and
- supporting tenant/status/time indexes.

Migration `0025` adds only the inquiry-scoped session and observation model, a
forward-only route-kind expansion, typed route/session references,
immutability and lifecycle protections, and supporting indexes. No existing
Process, Process Family, Process-bound
Discovery session, observation, proposal, review, version, or history row
should be rewritten or backfilled.

## Possible-match behavior

Version 0.1 uses deterministic organization-scoped text matching only over
current Process and Process Family names and descriptions. Results are labeled
**Possible places to look** and use transparent match explanations such as
**Name includes “gift processing.”**

There is no vector search, embedding, semantic confidence, hidden ranking,
quality score, or automatic selection. When no clear match appears, the page
keeps the question open and offers the full current Process/Family selectors.

## Security and privacy

Every inquiry or route mutation must:

- require authenticated private-workspace access;
- require the existing permitted Discovery capability;
- derive Organization and actor on the server;
- reject cross-Organization Process, Family, session, or inquiry keys;
- use the dedicated Discovery database credential;
- use compare-and-set protection and a serializable transaction;
- append rather than rewrite route history;
- never execute in public/demo mode; and
- return safe error categories without logging question, scope, or notes.

The Discovery role receives only exact SELECT, INSERT, sequence, and
inquiry-lifecycle UPDATE privileges. It receives no Process, Process Family,
operating-model, proposal-review, application, Organization Structure, schema,
database, or role-administration privilege. The private runtime role may
receive SELECT on the two tables. No new credential or environment variable is
needed.

## Proposed implementation slices

### Slice A — Inquiry identity and private landing page

- forward-only schema;
- create and list inquiries;
- conversational **Start with a question** entry;
- deterministic possible places to look;
- no routing write yet.

**Current implementation status:** Complete and live-validated. The generic
repository includes the forward schema, private inquiry create/list/detail
experience, and deterministic matching. The route table is intentionally
dormant: no route action or route-write privilege is part of Slice A.

### Slice B — Inquiry Routing & Unbound Discovery

- implemented and isolated-verified under accepted LAD-057;
- append-only Process, Family, interview, wait, finish, and inquiry-exploration
  route decisions;
- typed inquiry-scoped sessions and append-only observations for the case where
  no Process has been selected;
- atomic route and session creation with lifecycle compare-and-set protection;
  and
- no Process creation or operating-model write authority.

### Slice C — Human review and Knowledge Outcome

- review inquiry-scoped evidence without inferring a Process boundary;
- explicitly connect to an existing Process, preserve a cross-Process or
  unresolved boundary, identify a possible new Process, or conclude that no
  separate Process is needed;
- produce a valid Knowledge Outcome without requiring a proposal; and
- preserve the originating inquiry and evidence chain.

### Slice D — Governed candidate Process creation

- requires a further decision extending LAD-036, LAD-037, and LAD-053;
- maps reviewed evidence to a typed new-Process proposal;
- applies only an approved proposal through a separate atomic boundary; and
- creates a working Draft Process rather than approved organizational truth.

## Slice B files

Slice B changes include:

- `ARCHITECTURE_DECISIONS.md` — accepted LAD-057 and verified implementation status;
- `PRODUCT_ROADMAP.md`, `PRODUCT_VISION.md`, and
  `docs/WORKSPACE_STUDIO.md` — implementation status only;
- `docs/QUESTION_DRIVEN_DISCOVERY_V0_1.md` — accepted contract and rollout
  evidence;
- `docs/INQUIRY_ROUTING_AND_UNBOUND_DISCOVERY_V0_1.md` — accepted LAD-057
  contract and verification for the no-Process-yet path;
- `db/schema.ts`, one forward-only migration, and migration metadata;
- focused inquiry data, policy, and administration modules under `lib/`;
- private routes and forms under `app/studio/discovery/`;
- Discovery deployment/privilege documentation; and
- focused repository and isolated-database tests.

No package, fixture, FLOW, public Northstar, Process Family semantics, or
existing migration should change.

## Verification strategy

Isolated fictional verification must prove:

- stable inquiry, route, inquiry-session, and observation identity;
- exact Organization scoping and cross-tenant rejection;
- inquiry, scope, and answer text never enter diagnostic output or URLs;
- deterministic candidate explanations without automatic routing;
- append-only routes and observations, same-session supersession, and terminal
  lifecycle enforcement;
- stale-write rejection;
- atomic inquiry transition plus route;
- atomic Process-bound or inquiry-scoped interview-session plus route creation;
- forced route/history failure rolls back every related write;
- Discovery-role allowed and denied operations;
- runtime read-only behavior;
- public routes fail closed before database modules initialize; and
- zero fictional probe rows persist.

Repository verification remains tests, ESLint, TypeScript, Drizzle validation,
production build, `git diff --check`, and private-data/secret scanning.

### Isolated verification result

Migration `0024` was applied only to the exact fictional schema-test database.
The rollback-only verification proved stable inquiry identity and immutable
question text, typed same-Organization route references, append-only route
records, stale-write rejection, atomic rollback after a failed route, the exact
inquiry-only Discovery privilege delta, runtime read-only behavior, and zero
persisted fictional inquiry, route, Organization, Process, Family, or probe-role
artifacts. Route writes remain unavailable to both application credentials in
Slice A.

### JU validation result

Migration `0024` and the inquiry-only privilege delta are enabled on the
dedicated JU database at journal `25/25`. The shared Slice A application is live
in JU, public Northstar remains isolated, and the first real inquiry preserved
an organizational question with transparent Process and Family possibilities.
Opening those possibilities created no route, interview, evidence, proposal,
or operating-model change. That live use established the LAD-057 product gap:
the organization may need to interview and preserve evidence before it can
truthfully select or create a Process.

## Release boundary

Slice A completed the following separately controlled JU sequence:

1. verify the exact JU project, branch, database, Organization, commit, and
   migration baseline;
2. capture deterministic business-data baselines;
3. apply only the approved forward migration with protected owner access;
4. grant and prove only the reviewed Discovery/runtime privilege delta;
5. prove rollback and public isolation;
6. deploy the exact shared commit to JU Production only;
7. perform authenticated read-only QA of the question entry and possible-match
   presentation; and
8. separately create and validate the first real inquiry without routing or
   changing the operating model.

Slice B must repeat the target, baseline, migration, least-privilege,
rollback, public-isolation, exact-commit deployment, and authenticated QA
sequence under a new approval. Any first inquiry-scoped interview remains a
separate human-approved live data action after LAD-057 implementation,
isolated verification, and rollout.

## Explicit deferrals

Version 0.1 does not include AI, embeddings, semantic search, automatic Process
or Family selection, automatic Process creation, participant assignment,
messages, notifications, tasks, generalized evidence intake, document upload,
multi-user contribution, Reference Models, Practice Comparison, FLOW changes,
scores, analytics, or public content.

After the manual routing path is proven, AI Discovery Assistance may suggest
possible follow-up questions or mappings for human review. It still receives no
approval or operating-model write authority.
