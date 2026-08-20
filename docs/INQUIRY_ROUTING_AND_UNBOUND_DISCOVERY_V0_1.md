# Inquiry Routing & Unbound Discovery v0.1

**Status:** LAD-057 accepted. Generic Slice B implementation, isolated
fictional verification at migration journal `26/26`, JU migration and
least-privilege enablement, exact-commit deployment, and the first real
inquiry-scoped interview are complete. Accepted LAD-060 now defines the
separate human Review and Knowledge Outcome slice. Its generic implementation
and release remain separately verified and controlled.

## Product problem

Question-Driven Discovery can now preserve an ordinary organizational question
before a Process is selected. Its first live use exposed the next honest case:
the person may know the work they want to understand without yet knowing
whether it is:

- a distinct Process;
- part of an existing Process;
- one variant inside a Process Family;
- work spanning several Processes; or
- an unresolved boundary that needs more evidence.

Requiring a Process before gathering evidence would force the person to decide
the very thing Discovery is meant to help them understand. Creating a
placeholder Process would turn uncertainty into documented structure.

## Exact experience

The inquiry page should offer choices in ordinary language:

- **Look at an existing Process**
- **Look at a Process Family**
- **Explore before choosing a Process**
- **Wait for someone or something else**
- **Finish for now**

Only the person chooses. Possible matches remain transparent navigation aids
and never become a route automatically.

Choosing **Explore before choosing a Process** asks for a short interview scope
in conversational language, then opens an inquiry-scoped guided interview. The
prompts ask what happens, where the work begins and ends, who participates,
which Technology is used, what alternate paths occur, what comes before or
after, and what remains unknown. The interview does not display or require a
Process selector.

The saved interview must continue to say what it is: evidence gathered while
the Process boundary is still being understood. It must not use technical
phrases such as “unbound evidence” in the user experience.

## Durable domain model

### Preserve the existing Process-bound path

`DiscoverySession` and `DiscoveryObservation` remain unchanged. Every current
guided interview continues to reference exactly one existing Process. This
preserves LAD-042 and avoids changing the meaning of existing evidence.

### DiscoveryInquirySession

The smallest new inquiry-scoped session contains:

- Organization;
- immutable random stable key;
- exact inquiry identity through a same-Organization composite reference;
- conversational scope statement;
- capture lifecycle: in progress, paused, ready for review, or closed;
- current question key;
- compare-and-set revision;
- authenticated Lotura actor; and
- created and updated transaction timestamps.

The inquiry, append-only route, and new session are created or transitioned in
one serializable transaction. A failed route or session write rolls back the
entire transition.

### DiscoveryInquiryObservation

Each preserved answer contains:

- Organization and inquiry-session identity;
- immutable random stable key and sequence;
- exact prompt key and wording;
- bounded topic;
- response text when available;
- evidence state: Known, Assumed, Unknown, Needs validation, or Conflicting
  observation;
- authenticated Lotura actor and transaction time; and
- an optional typed same-session reference to the observation it supersedes.

Observations are append-only. A correction adds a new observation and keeps the
original evidence. Cross-Organization and cross-session supersession is
rejected.

### Typed inquiry route

The existing route enum receives one forward-only value for starting an
inquiry-scoped exploration. The route table receives typed inquiry-session
identity columns and a same-Organization foreign key. Its target-shape check is
expanded so exactly the context required by each route kind is present.

The design does not introduce a nullable Process on the current session, a
generic entity reference, or a JSON target.

## Review outcomes after evidence exists

Review is the accepted LAD-060 bounded slice. It may let a person conclude:

- **Connect this understanding to an existing Process**
- **Propose a new Process**
- **More validation is needed**
- **This crosses several Processes**
- **No separate Process is needed**

None of these outcomes is inferred from keywords or chosen by AI. Connecting
evidence must preserve its inquiry provenance. Proposing a new Process must not
create one directly; it must enter a separately approved proposal and
application boundary. A resulting Process begins as a working draft.

The durable review, exact evidence-source, typed conclusion, atomicity,
least-privilege, UX, and verification contract is recorded in
[INQUIRY_REVIEW_AND_KNOWLEDGE_OUTCOME_V0_1.md](INQUIRY_REVIEW_AND_KNOWLEDGE_OUTCOME_V0_1.md).

## Security and tenant boundary

Every mutation must:

- require authenticated private-workspace access and the permitted Discovery
  capability;
- derive Organization and authenticated Lotura actor on the server;
- use the dedicated Discovery credential with no fallback;
- reject cross-Organization inquiry, route, session, observation, Process, or
  Family references;
- use compare-and-set protection and a serializable transaction;
- append evidence and route history rather than rewrite it;
- avoid logging question, scope, or answer text; and
- fail closed before database modules initialize in public/demo mode.

The proposed Discovery-role delta is limited to:

- SELECT on the current inquiry, Process, Family, and approved Discovery
  context needed by the page;
- INSERT on inquiry routes, inquiry sessions, and inquiry observations;
- UPDATE only of permitted inquiry and inquiry-session lifecycle/revision
  columns; and
- exact sequence use required for those inserts.

The role receives no operating-model, proposal-review, application,
Organization Structure, schema, database, or role-administration write
privilege. The runtime role receives only the SELECT needed to render the
private experience. Observation UPDATE/DELETE and route UPDATE/DELETE remain
denied.

## Revised implementation sequence

### Slice A — Preserve the question

Implemented and live-validated under LAD-056. It records an inquiry and shows
transparent possible places to look without routing or creating evidence.

### Slice B — Route and explore before choosing a Process

Implemented generically under LAD-057:

- add the typed inquiry-session and observation model;
- add **Explore before choosing a Process**;
- enable explicit Process, Family, wait, finish, and interview route choices;
- create a selected route and any required session atomically;
- provide pause, resume, correction, and ready-for-review behavior; and
- keep every operating-model table read-only.

The isolated fictional verification proved typed inquiry/session routing,
append-only inquiry evidence, pause/resume/correction lifecycle behavior,
same-Organization safeguards, stale-write protection, atomic rollback on a
forced route failure, least-privilege denials, runtime read-only behavior, no
canonical Process writes, and zero persisted fictional probe rows.

### Slice C — Review and Knowledge Outcome

Accepted under LAD-060:

- review the exact active inquiry-scoped observations without reclassifying
  every answer;
- freeze the reviewed evidence set and append one or more human conclusions;
- preserve human choices and unresolved evidence;
- produce an understandable outcome without requiring a proposal; and
- explicitly choose whether evidence relates to an existing Process, may
  justify a new Process, spans several Processes, needs more validation, or
  ends without a separate Process.

### Slice D — Governed candidate Process creation

Only after a further architecture decision:

- map reviewed evidence to a typed proposal to create a working Draft Process;
- review and approve the exact proposed Process identity and initial facts;
- atomically create the Draft Process, history, and initial version through a
  dedicated application contract; and
- preserve the original inquiry and evidence provenance.

AI assistance remains after the complete manual path.

## Expected Slice B files after approval

Expected changes are limited to:

- `ARCHITECTURE_DECISIONS.md` and product documentation status;
- `db/schema.ts`, one forward-only migration, and migration metadata;
- focused Discovery data, administration, policy, and prompt-catalog modules;
- private inquiry route/session/interview pages and forms;
- focused repository, authorization, and public-isolation tests; and
- Discovery deployment and least-privilege documentation.

No package, fixture, FLOW, public Northstar, Process Family membership,
existing Process-bound interview, or prior migration should change.

## Verification strategy

Repository and isolated fictional verification must prove:

- immutable inquiry-session identity and exact inquiry provenance;
- append-only observations and valid same-session supersession;
- typed same-Organization route/session/observation references;
- stale-write rejection and valid capture lifecycle transitions;
- atomic inquiry transition, route, and session creation;
- forced route or observation failure rolls back every related write;
- exact Discovery-role allowed operations and denied operating-model writes;
- runtime read-only behavior;
- current Process-bound interviews remain unchanged;
- public/demo routes fail closed before database modules initialize;
- question, scope, and answers do not enter URLs or diagnostic output; and
- zero fictional probe rows persist.

Slice B's JU migration, privilege enablement, Production configuration,
deployment, and first real inquiry-scoped interview are complete. Slice C's
schema, generic implementation, and rollback-only isolated verification are
also complete under LAD-060. Controlled rollout and the first real review
remain separate actions.

## Explicit deferrals

This milestone does not include automatic Process creation, AI interviewing,
semantic matching, participant assignment, messages, tasks, uploads,
generalized evidence, multi-user contribution, Process mutation, proposal
approval, Process versions, Reference Models, FLOW changes, analytics, scores,
or public content.
