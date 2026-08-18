# Knowledge Gaps v0.1 — bounded product and architecture plan

**Status:** Approved product direction; documentation-only boundary. No schema,
migration, credential, environment, deployment, or data change is authorized
by this document.

Knowledge Gaps is the first milestone in the **Make Lotura useful at scale**
phase. It answers a practical question:

> What do we still need to understand about this organization?

Version 0.1 follows LAD-025, LAD-035, LAD-042 through LAD-046, LAD-051, and
LAD-053. It implements the existing LAD-046 direction as read-only,
explainable projections. It does not require a new architecture decision
because it adds no durable entity or write boundary. Persistence, assignment,
resolution workflow, notifications, or governance routing would require a
separately approved LAD.

## Product outcome

An authenticated Workspace Studio user can see specific questions supported
by current documented facts or unresolved evidence. Every question explains:

- what Lotura observed in the current data;
- why that fact may deserve review;
- where the supporting record or evidence can be inspected;
- what Lotura does not know; and
- an optional next place to continue, without claiming that action is required.

The page is a review lens, not a task list, quality grade, risk score,
completeness percentage, or AI conclusion.

## Initial deterministic projection rules

Version 0.1 should start only with questions that current records can support
without inference.

### Documented responsibility

1. **Process Owner not assigned** — a Process has no `owner_role_id`. Draft
   status is shown as context; absence does not establish failure.
2. **Step responsibility not established** — a Step has no explicit
   Responsible Role and its Process has no Owner Role to supply the documented
   fallback. A Step that validly uses its Process Owner is not labelled a gap.
3. **Role Mandate has no current coverage documented** — an active mandate has
   no current Role Coverage. The question must not claim the Position is
   vacant, abandoned, or improperly staffed.

### Unresolved Discovery knowledge

4. **Answer needs validation** — the current, nonsuperseded observation is
   explicitly labelled `needs_validation`.
5. **Answer remains unknown** — the current, nonsuperseded observation is
   explicitly labelled `unknown`.
6. **Conflicting observations remain** — the current, nonsuperseded
   observation is explicitly labelled `conflicting_observation`.
7. **Reviewed answer left for later** — the latest durable human review choice
   preserves an observation for later validation rather than proposing a
   change. The underlying evidence label and review choice remain visible.

Discovery questions should retain their Process and interview context. A
boundary, dependency, System, responsibility, or participant question may be
named only when the underlying prompt/evidence explicitly establishes that
subject. Free text is not parsed in v0.1 to manufacture a more specific gap.

## Exclusions that prevent false gaps

Version 0.1 must not infer that:

- every Process needs a dependency;
- every Step needs an explicit Role when the documented Owner Role fallback is
  valid;
- a linked System is critical, validated, owned, or correctly configured;
- missing current Role Coverage proves a vacancy or performance problem;
- a draft Process is deficient merely because it is incomplete;
- a Difference, Exception, or unresolved observation is an error;
- absence of configured Governance means a specific person should become
  Steward or Approver; or
- a high number of questions means poor organizational health.

Reference Model differences, Job Drift, operating-model drift, and Process
Family inconsistencies remain later rules because their underlying comparison
models do not yet exist.

## Projection shape

Each projected item should carry a small, reproducible shape:

```text
key                 deterministic presentation key; not durable identity
organizationKey     server-derived Organization scope
category            responsibility | discovery
question             conversational user-facing question
fact                 exact supporting fact
whyReview            bounded explanation, not a conclusion
sourceType           Process | Step | RoleMandate | Observation | ReviewChoice
sourceStableKey      stable key of the supporting record
processStableKey     optional Process context
interviewStableKey   optional Discovery context
evidenceState        optional existing evidence label
recordedAt           source record time when meaningful
href                 authorized route to inspect the source
```

The key may be derived from category, rule, and source stable key so rendering
is deterministic. It must not be presented as an immutable Knowledge Gap ID.
Counts are derived from the current projection and must not be treated as
historical metrics.

## Read and security boundary

- Load only through the existing organization-scoped read model and read-only
  runtime credential.
- Derive Organization scope from authenticated private-workspace context.
- Apply the same visibility boundary as each source record; a projection never
  expands access to its evidence.
- Reject or omit cross-Organization references rather than rendering partial
  context.
- Do not initialize a write credential, create a mutation action, or add an
  environment variable.
- Public Northstar remains fixture-backed, read-only, and without Workspace
  Studio. Any future fictional demonstration of Knowledge Gaps must be derived
  only from fictional fixture data.

## Initial Workspace Studio experience

Add a focused **Knowledge Gaps** or **Things to understand** view inside
Workspace Studio only when the projection is implemented. The page should:

- group questions by responsibility and Discovery, not by severity;
- use ordinary language and show the source fact directly;
- allow filtering without implying priority or assignment;
- link to the relevant Process, Step, Role context, interview answer, or
  Knowledge Outcome;
- show an honest empty state: **No questions are currently derived from the
  information Lotura can evaluate. This does not mean the organization is
  fully documented.**
- offer contextual next places such as reviewing evidence, opening a Process,
  or starting another interview, without choosing a required action.

The Studio home may show a small summary and link to the full view. Counts
support navigation; they are not the product story.

## Relationship to the knowledge lifecycle

Knowledge Gaps do not add a lifecycle stage. They are a current projection
across existing layers:

- evidence changed;
- understanding changed;
- the operating model changed; or
- organizational reality changed.

Version 0.1 can reliably project only from evidence, reviewed understanding,
and the current documented model. It must not claim that organizational
reality changed unless a future evidence model establishes that distinction.

A projected question disappears when its source facts no longer satisfy the
rule. That does not erase the underlying evidence, review history, change
history, or Process versions.

## Test strategy before implementation

1. Pure projection tests for every included and excluded rule.
2. Deterministic ordering and key tests.
3. Tenant-isolation tests with identical stable-looking content in another
   Organization.
4. Superseded-observation and latest-review-choice tests.
5. Inheritance test proving a Step with a valid Process Owner fallback is not
   mislabelled.
6. Coverage-language test proving absence is not called a vacancy.
7. Public-build regression proving no Studio route or private data appears.
8. Database-backed read-only test proving projection requires no mutation or
   new privilege.
9. Conversational-language test excluding terms such as canonical, epistemic,
   and health score from the user-facing view.

## Explicitly deferred

- persisted Knowledge Gap records;
- assignment, ownership, due dates, comments, notifications, and queues;
- resolution or dismissal history distinct from the underlying source history;
- Steward or Approver routing;
- numeric confidence, maturity, quality, risk, or health scores;
- AI-generated gaps or priority recommendations;
- Reference Model, Process Family, Job Drift, operating-model drift, and
  continuous-improvement projections; and
- executive trend analytics.

These capabilities may become useful later, but each introduces authority,
history, or interpretation that the read-only v0.1 projection intentionally
does not claim.
