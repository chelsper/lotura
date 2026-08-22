# AI-Assisted Discovery v0.1

**Status:** LAD-061, LAD-063, and LAD-064 accepted. Slice A deterministic context and
evidence reuse are implemented and passed isolated fictional verification at
migration journal `29/29`. Slice B's attributable assistance schema, mocked
provider adapter, and human-review UX are implemented and passed isolated
fictional verification at migration journal `30/30`. Slice C's repository-only
fictional evaluation foundation is implemented without a schema change and
offline-verified against eight expected fictional outcomes. One separately
authorized live evaluation of a fictional fixture passed automated and human
review under prompt policy v1 on August 22, 2026. A controlled v2 comparison
returned one question and passed automation, but failed human non-repetition
review. Private provider use, persistent credentials, environment changes, JU
data or configuration, and deployment remain separately gated.

## Product outcome

AI-Assisted Discovery v0.1 should make an interview feel like a useful
conversation with an informed guide instead of a fixed questionnaire.

Lotura should begin with what the Organization has already recorded, identify
what is missing, changed, contradictory, or specific to this participant, and
suggest a small number of relevant next questions. A participant should not
have to retype an answer merely because a new interview began.

AI remains an interviewer and synthesis assistant. It is not evidence, an
approver, or an operating-model author.

The assistant may also help a person make hurried notes easier to read. That
editorial help must preserve the original words, uncertainty, and provenance;
it cannot silently replace source evidence with polished model prose.

## Problem with the current experience

The two current guided-interview paths use fixed nine-question catalogs. That
was the correct manual foundation because it established attributable,
append-only evidence and a complete human review path before AI. It now creates
three visible problems:

1. a participant may answer questions that prior evidence already addresses;
2. the same generic wording appears even when the Process, inquiry, and prior
   observations provide more useful context; and
3. the interface treats completion of a catalog as progress even when a
   shorter, focused conversation would produce better knowledge.

LAD-043 already establishes that Lotura should not ask a person to confirm the
same classification twice. AI-Assisted Discovery extends that principle across
interviews: prior evidence should be visible and reusable, while new questions
should focus on genuine gaps.

## Bounded v0.1 behavior

### 1. Show what Lotura already knows

Before asking a new question, the interview should present a concise,
source-linked brief assembled deterministically from the current Organization:

- the inquiry or Process and the interview scope;
- the current documented Process when one is selected;
- relevant active observations from prior interviews;
- the latest human Knowledge Outcomes;
- unresolved, conflicting, or validation-needed evidence; and
- any current structured changes, clearly labelled as proposals rather than
  documented facts.

The application—not the model—selects and scopes this context. A user can see
which information may be sent to the provider before requesting assistance.

### 2. Reuse prior evidence without retyping it

For a relevant prior answer, the user may choose:

- **Still accurate** — preserve a new human confirmation that references the
  exact prior observation;
- **Something changed** — answer a focused change question;
- **Ask me about this** — request a contextual follow-up; or
- **Not relevant here** — skip it without changing the prior evidence.

"Still accurate" is not an automatic carry-forward. It is an attributable
human confirmation at a new time and scope. The prior response remains the
source; Lotura must not silently copy it into organizational truth or imply it
was independently observed again.

### 3. Suggest focused questions

The assistant proposes at most three next questions at a time. Each suggestion
must include a short plain-language reason such as:

- "This handoff was left for another department to validate."
- "The documented Process names a System that this interview has not
  discussed."
- "Two prior participants described this step differently."

The person may answer, edit the question, skip it, ask for another suggestion,
use a standard question, pause, or finish for now. A model cannot make a
question mandatory.

### 4. Preserve human-authored evidence

The participant supplies or explicitly confirms the answer and selects its
evidence state. Saving continues to create an append-only observation. The
model must not select `known`, `assumed`, `unknown`, `needs_validation`, or
`conflicting_observation` for the participant.

An accepted AI question must remain distinguishable from the resulting human
observation. The persisted provenance should answer:

- which bounded context was used;
- which provider, model, and prompt-policy version produced the suggestion;
- the exact suggested question and rationale;
- whether the person used, edited, or skipped it; and
- which observation, if any, resulted.

### 5. Offer a clarity draft without rewriting the source

When a person explicitly asks for help, the assistant may propose a concise,
plain-language rendition of their quickly typed answer. The interface must
show:

- **What you wrote** — the original participant text;
- **Clearer draft** — the model's suggested presentation; and
- **What will be preserved** — the exact human-selected final wording and its
  evidence state.

The person may use, edit, or reject the draft. Model wording must not remove
unknowns, turn estimates into facts, combine conflicting accounts, add an
owner, infer policy, or change the evidence state. If the clearer draft is
used, the original submission, AI draft, human decision, and final observation
remain attributable as separate layers.

For documented Processes or broader organizational summaries, AI may prepare
a readable draft for review, but it cannot overwrite the documented Process.
Changing Process wording still requires the existing structured-proposal,
review, approval, and atomic-application path.

### 6. Keep the manual path available

The standard question catalog remains available as a deterministic fallback.
Provider failure, disabled AI, malformed output, or a user's choice to avoid AI
must never block interviewing, reviewing, producing a Knowledge Outcome, or
using the manual evidence-to-operating-model lifecycle.

## Explicit non-goals

v0.1 does not authorize AI to:

- author or silently substitute a participant's answer;
- select an evidence state or Knowledge Outcome;
- decide whether a Process exists;
- route an inquiry without human confirmation;
- create a Process, Process Family, structured mapping, or proposal;
- review or approve a proposal;
- apply an operating-model change or create a Process version;
- assign responsibility, authority, or validation work;
- search unrestricted Organization data;
- learn across Organizations; or
- operate in public Northstar.

AI-assisted structured mapping remains a later slice after question assistance
has been evaluated and trusted.

The bounded clarity-draft interaction described here is allowed only because
the person explicitly requests it and the raw source, model suggestion,
human choice, and final wording remain distinguishable.

## Cross-Process situations and Organizational Memory

The digital-ID and start-of-semester parking examples reveal knowledge that a
single Process may not contain:

- a technology change can expose undocumented dependencies across several
  Processes and Systems;
- a recurring seasonal condition can involve several Units, Roles, policies,
  exceptions, and informal practices; and
- an observed workaround may be organizational memory without being approved
  policy.

Question-Driven Discovery already permits evidence to remain inquiry-scoped
and lets a human conclude that it crosses several Processes or requires more
validation. AI-Assisted Discovery should respect that boundary. It may ask,
"What else depends on a physical ID?" or "Does this happen every semester?"
but it must not manufacture a Process or declare an informal practice to be
policy.

These examples support a future **Operational Scenarios** domain for recurring
or consequential situations such as semester start, move-in, parking overflow,
technology migrations, outages, or emergencies. A Scenario may connect
Processes, Units, Roles, Systems, observations, lessons, unresolved issues, and
future plans. Scenario knowledge remains distinct from Process definition,
policy, project execution, and approved organizational truth.

Operational Scenarios, seasonal timing, lessons learned, Organizational Impact
Analysis, and approved operational plans are not part of LAD-061. The current
Process-oriented observation-topic enum is not sufficient to model them
durably. Their identity, recurrence, time window, evidence, relationship,
governance, retention, and approval semantics require a later architecture
decision rather than being hidden inside AI output.

## Smallest durable domain model

The current observation tables can preserve a dynamic prompt, but they cannot
record model provenance, the bounded source context, skipped suggestions, or a
cross-interview confirmation. Relying only on browser state or logs would make
assistance historically unattributable. Slice A therefore adds only the
smallest missing durable artifact: an immutable link from the newly confirmed
observation to the exact prior observation. The broader assistance-run model
below remains deferred to Slice B.

The smallest durable model should preserve four concepts:

1. **Assistance run** — one immutable, Organization-scoped model request tied
   to exactly one Process-bound or inquiry-bound Discovery session and its
   exact revision. It records provider, pinned model identifier,
   prompt-policy version, bounded context fingerprint, actor, and time.
2. **Context source** — an immutable typed link to each prior observation,
   reviewed outcome, or documented Process snapshot supplied to the run. The
   provider receives only the allowlisted projection recorded by this source
   manifest.
3. **Assistance suggestion and human decision** — the immutable question or
   clarity draft, its topic, plain-language rationale, ordering, and an
   append-only human disposition of used, edited, or skipped.
4. **Evidence link or confirmation** — a typed link from a used suggestion to
   the resulting Process-bound or inquiry-bound observation, or from a
   "Still accurate" decision to the exact prior observation it confirms.

The schema design must use typed same-Organization foreign keys and exclusive
shape checks for the two existing interview contexts. It must not introduce a
generic text reference, a nullable Process on inquiry evidence, or a new shared
observation table that rewrites the already-proven lifecycles in LAD-042 and
LAD-057.

All assistance, source, suggestion, decision, and evidence-link rows are
append-only. Corrections append a superseding record. Viewing a suggestion
does not alter a session or create evidence.

## Context packet and prompt boundary

The server builds an allowlisted context packet before calling a provider. The
model receives no database credential and cannot choose what to query. The
packet contains only the minimum fields needed for the requested interview:

- Organization-independent instructions and product vocabulary;
- session kind, scope, and current revision;
- current inquiry text or selected Process summary;
- selected source excerpts with stable source labels;
- unresolved evidence labels; and
- the user's stated focus for this assistance run.

Stored evidence is delimited and treated as untrusted source content, never as
model instructions. The server validates a strict structured response, limits
question count and length, rejects unknown topics, and fails closed to the
manual interview.

Question, scope, answer, and source text must not enter URLs, analytics,
diagnostic output, error messages, or general application logs. Operational
telemetry may record non-content facts such as latency, provider result class,
and stable internal identifiers where permitted.

## Provider, privacy, and consent boundary

The implementation should use a server-only provider adapter with a pinned
model and versioned prompt policy. No provider SDK, model name, or response
shape should leak into the domain layer.

Before any real Organization enablement, Lotura must separately approve and
verify:

- the selected provider and model;
- contractual data-use and model-training terms;
- retention and deletion behavior;
- geographic or institutional requirements;
- credential ownership and rotation;
- an explicit Organization-level enablement setting;
- participant disclosure and consent language; and
- the exact categories of Organization data permitted in a context packet.

The existing warning against donor, student, prospect, gift, wealth, HR,
password, credential, and connection-string content remains in force. v0.1
does not claim that a text classifier can guarantee de-identification. The user
must preview the bounded context, and the application must apply deterministic
field allowlisting and secret-pattern rejection before transmission.

Provider credentials are Production-only, server-only, environment-specific,
and distinct from database credentials. Public/demo mode is disabled and must
fail closed even if a credential is accidentally present.

## Authorization boundary

AI question assistance requires an authenticated contributor already allowed
to access the exact Discovery session and its selected sources. It does not
broaden visibility. Server reads remain Organization-scoped.

A dedicated least-privilege persistence role may receive only the exact reads
needed for a bounded context and INSERT/SELECT privileges on assistance
provenance. It receives no UPDATE or DELETE on assistance history and no write
authority over the operating model, Process versions, proposals, reviews,
applications, governance, Organization Structure, schemas, or roles. Human
observation writes continue through the established Discovery boundary.

## UX outline

The interview page becomes a short loop:

1. **What Lotura already knows** — source-linked prior evidence and current
   documentation.
2. **What should we focus on?** — optional user intent in ordinary language.
3. **Suggested next question** — one focused question with "Why this?"
   context.
4. **Your answer** — human response and evidence state, or "Still accurate,"
   "Something changed," "Skip," or "Use a standard question."
5. **Finish for now** — always available; unresolved knowledge remains intact.

The UI should use "Suggested by Lotura" in the primary experience. Detailed
provenance may identify the AI provider and model without making technical
language part of the participant's task.

## Phased implementation

### Slice A — Known context and evidence reuse

- deterministic, source-linked "What Lotura already knows" brief;
- relevant prior-evidence selection rules;
- human "Still accurate" and "Something changed" paths;
- durable cross-interview confirmation provenance;
- no external model call;
- fixed catalog remains available.

This slice addresses repeated answers before introducing provider risk.

**Verification:** Migration `0028` was applied to the exact isolated fictional
target and verified at journal `29/29`. Rollback-only probes proved typed
same-Organization, same-Process, and same-question references; atomic creation
of the new observation, immutable source link, and session advance; append-only
history; read-only runtime access; no operating-model writes; and no persisted
fictional probe rows.

**Authorized contract:** A Process-bound confirmation creates a new
human-attributed observation in the current interview and one immutable link
to an active observation from an earlier interview for the same Organization,
Process, and prompt. The earlier observation is not copied silently, changed,
or promoted into the operating model. The session advances only when both rows
are inserted atomically. "Something changed" continues through the ordinary
answer form. Inquiry-first interviews show their original question and current
saved answers as a deterministic brief, but cannot reuse Process evidence
until a human connects the inquiry to a Process.

### Slice B — Attributable question suggestions

- assistance-run, source, suggestion, decision, and observation-link records;
- provider-neutral server adapter and strict structured response contract;
- mocked-provider tests and deterministic manual fallback;
- accept, edit, skip, and provenance UX;
- optional participant-requested clarity drafts with raw/draft/final
  separation;
- no real provider credential or Organization enablement.

**Authorized contract (LAD-063):** A deterministic mocked provider receives
only the application-selected, Organization-scoped context packet. Requesting
help appends a run, its exact typed sources, and one to three suggestions; it
does not create evidence or advance the interview. A participant may edit and
use a question, edit and use a clarity draft, skip a question, reject a draft,
or continue with the standard catalog. Use/edit atomically appends the human
observation, the decision and exact observation link, and the session advance.
Skip/reject appends only the decision. Original rough notes, proposed wording,
final wording, evidence state, provider/model/prompt-policy provenance, and
bounded sources remain distinguishable. No external provider call occurs in
Slice B.

**Verification:** The exact isolated fictional target passed Process-bound and
inquiry-bound context probes, request-without-evidence behavior, human
use/edit/skip attribution, stale-revision and wrong-question safeguards,
append-only history, runtime read-only access, canonical-write denials, and
rollback cleanup at migration journal `30/30`. No fictional probe row
persisted.

### Slice C — Controlled provider evaluation

**Repository-only foundation implemented under LAD-064:**

- encode OpenAI `gpt-5.6-terra`, low reasoning, and prompt policy
  `lad-064-eval-v2` as an attributable evaluation basis rather than a Production
  default;
- build stateless Responses API requests with `store: false`, no background or
  conversation state, no tools, strict JSON Schema output, and bounded output;
- require explicit fictional classification, deterministic secret rejection,
  and the existing allowlisted context packet before the injected transport;
- validate fictional cases covering useful, repetitive, leading, unsupported,
  unsafe, malformed, and uncertainty-preserving outputs;
- keep automated safety checks separate from explicit human relevance,
  conversational-language, non-repetition, and source-fidelity review; and
- prove unavailable, invalid, and slow transport paths return the deterministic
  manual fallback without logging content.

Prompt policy `lad-064-eval-v2` is a measured refinement of the evaluated
version 1 policy. It requires exactly one question suggestion and tells the
model to choose the short, conversational question that best advances the
highest-value unresolved gap. It does not change the Slice B mocked-provider
contract, which may still produce up to three suggestions for deterministic UX
testing. Version 2 was later evaluated on the same fictional case. It returned
one question but did not pass human non-repetition review because its wording
still substantially repeated the current Systems question.

The repository foundation contains no credential lookup, provider SDK, live
transport, external request, environment setting, migration, private data, or
runtime integration. `store: false` is not treated as Zero Data Retention.

**Offline verification:** Eight fictional cases matched their expected release
result. The matrix includes useful and safely injection-resistant suggestions,
repetition, leading language, unsupported authority, malformed output, and
clarity drafts that preserve or erase uncertainty. Focused tests also prove
explicit fictional classification, secret and oversized-context rejection,
strict prompt/topic boundaries, one-call behavior, and deterministic fallback
for invalid, unavailable, and slow transport results. This verifies the harness,
not an external model.

**Controlled external verification:** One `gpt-5.6-terra` request evaluated the
`useful-system-follow-up` fictional Campus Printing case. The request used low
reasoning, prompt policy `lad-064-eval-v1`, `store: false`, no background state,
and no tools. All schema/context, authority, leading-language, repetition,
uncertainty, and content-safety checks passed. Human review found the two
questions conversational, faithful to the supplied sources, non-repetitive,
and relevant. The second question was more useful because it focused on the
printer access step; future prompt refinement should prefer the single most
useful unresolved follow-up when additional questions add little. See
[the dated evaluation evidence](evaluations/AI_ASSISTED_DISCOVERY_SLICE_C_EVALUATION_2026_08_22.md).

**Version 2 comparison:** The same model, reasoning effort, fictional case, and
request boundary produced one question under `lad-064-eval-v2`. Automated
checks passed, but human review found “What tools or systems do you use when
handing off a print job?” substantially repeated “Which Systems are used?” and
did not pursue the unresolved physical-card detail. Version 2 therefore fails
the human release gate. See
[the version 2 evaluation evidence](evaluations/AI_ASSISTED_DISCOVERY_SLICE_C_V2_EVALUATION_2026_08_22.md).

**Still separately gated:**

- verify the exact provider project data-use and retention configuration;
- refine and offline-test semantic repetition handling before another external
  fictional request;
- enable one isolated private test environment before any JU request; and
- require separate authorization for JU configuration and real use.

### Slice D — Bounded private pilot

- Production-only private enablement for an approved Organization;
- explicit participant disclosure and context preview;
- monitored accept/edit/skip outcomes without answer-content logging;
- manual kill switch and standard-question fallback;
- read-only QA before the first real assisted interview.

## Testing and release evidence

The implementation must prove:

- exact Organization and session isolation for every context source;
- stable deterministic context selection and fingerprints;
- no repeated standard question when relevant prior evidence is confirmed;
- confirmation references the prior observation without mutating it;
- accept, edit, skip, and resulting-observation provenance;
- stale-session and partial-write rollback;
- append-only assistance history;
- prompt-injection content cannot change system instructions or tool access;
- secrets and disallowed fields are rejected before a provider call;
- malformed, unavailable, or slow provider responses fall back safely;
- the model cannot select evidence states or lifecycle outcomes;
- a clarity draft cannot erase the original participant text, uncertainty, or
  model provenance;
- no operating-model, proposal, review, version, application, Structure, role,
  schema, or history mutation privilege;
- public Northstar cannot initialize or call assistance; and
- no private content appears in URLs, logs, analytics, or error output.

Fictional evaluations should include prior answers that are still accurate,
answers that changed, conflicting accounts, unknowns, another-department
validation, prompt-injection text inside evidence, and a valid no-change
Knowledge Outcome.

## Repository impact

Slices A and B already supplied the durable assistance model and private human-
review UX. The LAD-064 repository-only foundation adds:

- a pure OpenAI evaluation request/response and safety contract;
- a server-only boundary that accepts an injected transport but cannot read a
  credential or make a request by itself;
- fictional evaluation fixtures and an offline evaluator;
- focused contract, redaction, injection, fallback, and release-gate tests; and
- architecture and roadmap documentation.

No provider package, credential, environment variable, real Organization data,
deployment, database privilege, or migration is required or authorized.

## Affected architecture decisions

LAD-061 follows LAD-002, LAD-003, LAD-008, LAD-015 through LAD-018, LAD-021,
LAD-022, LAD-025, LAD-026, LAD-029, LAD-032, LAD-035 through LAD-037, LAD-042
through LAD-046, LAD-049 through LAD-053, LAD-056, LAD-057, and LAD-060.

It extends:

- LAD-025 by defining the first bounded AI assistance artifact and human
  decision boundary;
- LAD-042 and LAD-057 by allowing contextual prompts without weakening their
  append-only evidence models;
- LAD-043 by preventing repeated questions across sessions, not only repeated
  review decisions;
- LAD-044 through LAD-046 by using existing documented and observed knowledge
  as visible source context;
- LAD-051 and LAD-060 by allowing "no new question" and "no change" to remain
  successful outcomes; and
- LAD-049 and LAD-050 only as future suggestion destinations, not as authority
  granted in v0.1.

It conflicts with and supersedes no accepted decision. It does not lift any
approval, application, public-demo, or autonomous-AI prohibition.

LAD-063 follows and narrowly extends LAD-061 and follows the same tenant,
evidence, lifecycle, and authority decisions listed above, plus LAD-062. It
adds attributable mocked assistance without changing those decisions and
conflicts with or supersedes none of them.

LAD-064 follows and narrowly extends LAD-061 and LAD-063. It permits only a
fictional, stateless, tool-free, repository-only evaluation foundation. It does
not lift any credential, external-request, private-data, environment,
deployment, public-demo, approval, or autonomous-AI prohibition.

Operational Scenarios, Seasonal Operations, lessons learned, Organizational
Impact Analysis, and policy or plan approval remain separately deferred; AI
output must not become their accidental persistence model.
