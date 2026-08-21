# Lotura Product Vision

## Purpose of this document

This document records the enduring product direction and architecture principles for Lotura. It is a decision framework for what Lotura should become, not an implementation plan, schema specification, or release checklist.

## Mission

Lotura is an organizational intelligence platform that helps organizations discover, document, understand, improve, and safely evolve how work gets done.

**Lotura is the operating system for organizational knowledge.** It helps an
organization understand how it is structured, discover how work actually
happens, connect responsibility to work, preserve institutional knowledge,
govern what becomes trusted documentation, compare practice with standards and
expectations, understand change, identify drift, and continuously improve.

Lotura is becoming the system that helps organizations **discover, govern, and continuously improve their organizational knowledge**. Governance means keeping that knowledge maintained, reviewed, explainable, and trusted over time—not merely restricting access to it.

Its purpose is to make the real operating model of an organization visible and understandable: who is expected to own work, how responsibility is currently assigned, which systems enable it, where exceptions occur, and how a change in one part of the organization may affect another.

## Core principle

**Lotura models the organization itself—not just workflows, tasks, or SOPs.**

A procedure describes one path through work. An organization is a connected system of responsibilities, people, processes, technology, dependencies, exceptions, decisions, and accumulated knowledge. Lotura must preserve that broader view.

The product must not collapse into an SOP repository, internal wiki, task manager, or workflow engine. Documentation is valuable, but its greater value comes from connecting operational definitions to the organizational context in which they are expected to work.

## The organizational digital twin

Lotura's product is an organizational digital twin: a living, evidence-based
representation of how an organization is structured, how work happens, who
holds responsibility, which technology supports it, what exceptions and
dependencies exist, and how those relationships change over time.

The digital twin is not automatically complete, institutionally approved, or
synchronized with real-world activity. It reflects the evidence, canonical
records, effective timing, and visible limitations available to the
organization at a point in time. Uncertainty, disagreement, missing context,
and unresolved questions remain part of the model rather than defects to hide.

The digital twin is the model. The product value is the organizational
knowledge lifecycle around that model: the governed path through which people
observe reality, preserve evidence, interpret it, propose changes, approve
documented knowledge, compare it with other knowledge, and revisit it as the
organization changes.

**Workspace Studio** is the governed authoring environment for that digital
twin. Organization, Explorer, Process Detail, and FLOW help people understand
the model; Workspace Studio is where appropriately authorized people build and
maintain it. A unified Studio experience must not collapse the underlying
domains, permissions, credentials, or append-only histories into one
unrestricted administration boundary.

## Organizational Knowledge Lifecycle

Lotura's long-term product lifecycle is:

**Observe → Interview → Evidence → Review → Knowledge Outcome**

A Knowledge Outcome may confirm current documentation, preserve unresolved
knowledge, identify a need for additional validation, support structured
proposed changes, or recommend no change. These outcomes may coexist. Proposal
is one possible branch, not the required proof that Discovery succeeded.

When specific changes are proposed, the lifecycle continues:

**Knowledge Outcome → Structured Proposed Changes → Proposal Review → Approval
→ Documented Process Version → Continuous Improvement → Observe Again**

The lifecycle must preserve the distinction among:

- observed evidence;
- participant statements;
- reviewed interpretations;
- proposed changes;
- approved and currently documented knowledge; and
- actual organizational reality.

The operating model is the trusted destination. Discovery, AI, comparison,
governance, and improvement exist to strengthen it—not silently replace it.
An approved record may be the organization's governed documentation without
being a claim that documentation and reality can never diverge.

Lotura must also name the layer in which change occurred:

- evidence changed when a new observation or source was preserved;
- understanding changed when people interpreted or reconciled evidence;
- the operating model changed when an approved proposal was atomically
  applied; and
- the organization changed when actual structure, work, responsibility, or
  technology changed.

One kind of change may motivate review of another, but none proves that the
next occurred.

An interview can be successful when it confirms the current documentation or
preserves honest uncertainty without proposing a change. Discovery exists to
improve understanding, not manufacture work.

Discovery may also begin before the correct Process boundary is known. In that
case Lotura should preserve the organizational question and attributable
evidence without creating a placeholder Process, treating a Process Family as
a Process, or weakening the identity of existing Process-bound interviews. A
person should later decide whether the evidence belongs with an existing
Process, supports proposing a new working Draft, spans several Processes,
requires more validation, or does not justify a separate Process.

Knowledge lifecycle and operating-model structure are separate architectural
dimensions. The lifecycle describes how knowledge earns enough trust to affect
the documented model. Process Families, Reference Models, Job Descriptions,
and drift describe how knowledge is grouped, related, or compared. A feature
in one dimension must not collapse the states or semantics of the other.

## Organizational Memory and Operational Scenarios

Lotura should help an organization remember not only its documented Processes,
but also what people observed, what happened in recurring situations, what was
learned, what remained unresolved, and which plans or practices were later
approved. Organizational memory is the accumulated, attributable knowledge
around the digital twin. It is not a new label that turns every recollection
into truth.

Some important organizational situations span several Processes and should not
be forced into one of them. Examples include semester start, residence-hall
move-in, parking overflow, commencement, a power or ERP outage, hurricane
preparation, construction, and a technology migration such as moving from
physical to digital student IDs.

A future **Operational Scenario** may connect:

- observed behavior and timing;
- participating Units, Positions, Roles, and people;
- affected Processes and Process Families;
- enabling or constrained Systems;
- exceptions, handoffs, and undocumented dependencies;
- lessons learned and unresolved issues; and
- recommendations or a separately approved future operational plan.

A Scenario is not automatically a Process, project, policy, incident, or
approved plan. For example, evidence that Security usually pauses parking
enforcement at semester start may be important organizational memory without
establishing that behavior as institutional policy. Lotura must preserve that
difference.

Future Organizational Impact Analysis may use explicit operating-model and
Scenario relationships to ask what else should be reviewed when a technology,
policy, structure, or practice changes. An inferred connection is a review
question, not proof of impact. The product should never claim that a digital-ID
change affects a particular service unless documented relationships or
attributable evidence support that conclusion.

Question-Driven Discovery is the current entry point for knowledge whose
Process boundary is unknown or cross-cutting. Operational Scenario identity,
recurrence, seasonality, lessons, plans, governance, and history remain future
domain work and must not be represented only as opaque AI narrative.

## The operating model

Processes, Roles, Systems, Exceptions, Dependencies, and Assignments together form the organization's operating model.

- **Processes** describe purposeful, repeatable work and the ordered steps through which it is carried out.
- **Roles** represent durable organizational accountability independently of any individual person.
- **Systems** represent the software, services, records, and other enabling infrastructure used by the organization.
- **Exceptions** preserve alternate paths and conditions that fall outside the standard process without burying that knowledge in prose.
- **Dependencies** connect processes and make upstream, downstream, and cross-organizational effects visible.
- **Assignments** distinguish intended role ownership from the people who currently provide permanent, interim, acting, or backup coverage.

These concepts are valuable individually, but Lotura's organizational intelligence emerges from their relationships. A process should be understood not only by its steps, but also by its ownership, current coverage, systems, exceptions, and place in the wider process network.

### Process Families and Reference Models

Process Families and Reference Models are preserved long-term product
capabilities, not incidental side ideas.

A Process Family groups related Processes without pretending that the family
is itself an executable Process or that every relationship is a hierarchy. For
example:

```text
Gift Processing
└── Annual Fund Gift Processing
    ├── Annual Fund Physical-Check Gift Processing
    └── Annual Fund Credit-Card Gift Processing
```

Family membership, reusable subprocess composition, and upstream/downstream
dependency answer different questions and require different relationship
semantics. Broader/narrower Family relationships form an explicit graph rather
than forcing one tree. A Process belongs directly only to Families with an
explicit membership and inherits no Family Steps, Roles, Systems, Exceptions,
governance, or conclusions unless that inheritance is separately defined and
approved.

A Reference Model represents a selected internal or external standard,
framework, recommendation, prior approved version, or other comparison basis.
It may apply to a Process or Process Family. Differences between a Reference
Model, documented practice, and observed reality create evidence and review
questions; they do not automatically establish error, quality, risk, or
noncompliance.

### Organizational structure and operational responsibility

Lotura should connect the organization’s formal structure to its operating model without treating them as the same thing. A Person is a human represented in the model; a User is an application identity; a Position is a durable structural seat; and an Operational Role is a durable responsibility referenced by Processes and other operating-model records.

Position occupancy, Position reporting, allocation of an Operational Role to a durable holder, and Person-level coverage of that responsibility answer different questions and should remain separately traceable. Reporting hierarchy must never imply Process ownership, and a Position title must never automatically become an Operational Role.

The initial structural model may support Position as the only kind of ResponsibilityHolder. The product should preserve a clean path for future evidence to justify OrganizationUnits, Collective Bodies or Committees, and External Organizations as additional mandate holders without adding those abstractions prematurely.

## Product philosophy

### Model reality without overstating certainty

Lotura should represent what the available evidence supports. It must clearly distinguish documented facts, deterministic inferences, incomplete information, and human judgment. Connectivity may justify review; it does not by itself prove operational failure, causation, or mandatory change.

### Preserve observations before establishing organizational truth

Lotura should preserve observations before establishing organizational truth. What an employee, process participant, system record, or reviewer reports is evidence about the organization; it is not automatically the organization's approved definition of itself.

Observations should retain their source, context, timing, scope, and relationship to the operating model. Conflicting observations should remain visible rather than being silently overwritten, averaged, or resolved by AI. Reconciliation, consensus, and approval may establish an authoritative organizational record, but that record should remain traceable to the observations and disagreements that informed it.

This distinction allows Lotura to learn how work actually happens while preserving accountability for what the organization ultimately accepts as true.

### Discovery through documentation

**Discovery is an expected outcome of documentation.**

People frequently discover missing steps, conflicting assumptions, ownership ambiguity, undocumented workarounds, unresolved handoffs, and process weaknesses while attempting to describe current work. Those discoveries are not failures of capture. They are valuable organizational knowledge and often reveal more than a polished description produced by forcing premature completeness.

Lotura should intentionally preserve discovery as it happens. Future capture experiences should distinguish:

- **Known** — supported by the stated source within the current scope;
- **Assumed** — believed to be true but not yet supported sufficiently;
- **Unknown** — information that has not been established;
- **Needs validation** — a claim or relationship requiring accountable confirmation; and
- **Conflicting observations** — multiple sourced accounts that cannot yet be reconciled honestly.

These states describe the maturity of organizational knowledge, not the operational lifecycle of a Process. They should retain source, scope, time, and context and should not be collapsed automatically into `Process.status` or approved organizational truth.

> Document reality first. Improve it second.

> Disagreement is data.

Lotura does not just document organizations. It helps organizations discover themselves. An incomplete answer is often more valuable than a polished but inaccurate one, and an unresolved question should remain visible until the organization has evidence and authority to resolve it.

### Make evidence inspectable

Every analysis should expose the facts and relationships on which it is based. Users should be able to understand how a finding was determined, identify missing context, and reach a different judgment without relying on an opaque score.

### Preserve accountability

Organizational truth remains accountable to people. Lotura can surface gaps, concentration, and change implications, but it should not silently redefine ownership, approve operational changes, or substitute generated content for institutional decisions.

### Govern knowledge through stewardship

Authority inside an organization is multidimensional. Organizational hierarchy, operational responsibility, visibility, contribution, approval, analysis, administration, and stewardship are related but independent.

Stewards should eventually be visibly accountable for keeping defined organizational knowledge accurate and appropriately reviewed. A Steward is not necessarily the manager, Process Owner, system administrator, or person currently performing the work. Reporting hierarchy must never create approval or administrative authority automatically.

Most contributors should suggest attributable updates rather than overwrite approved knowledge directly. Workspace Administrators may maintain canonical structure within explicit scope, but they cannot bypass audit history. Leadership may receive organization-wide analytical authority without receiving Workspace Administration.

The enduring governance direction is defined in [GOVERNANCE_AND_STEWARDSHIP.md](GOVERNANCE_AND_STEWARDSHIP.md).

### Treat improvement as measured learning

Lotura should eventually distinguish the approved definition of a process from the improvement initiative that caused or evaluated a change.

> An improvement is not complete when the new process is documented. It is complete when the result is measured and sustained.

Continuous improvement should connect friction, evidence, proposed change, affected processes and systems, approval, implementation, expected benefit, measured result, and sustainment. Publishing revised documentation is evidence that a change was implemented; it is not proof that the organization improved.

Continuous Improvement is a first-class future capability, not an extension of the current Version 0.1 schema. A future improvement record should preserve:

- the improvement idea;
- the originating process;
- the contributor;
- the rationale and supporting evidence;
- the expected benefit;
- implementation status;
- the approval decision;
- the implementation date; and
- the resulting changes to the operating model.

Every process improvement should remain historically traceable from its originating observation and process, through proposal and approval, to implementation, resulting operating-model versions, measurement, and sustainment. Implementing a change must never overwrite the record of why the change was proposed or what operating model existed before it.

### Build one platform

Build the platform once. Improve the platform from real-world learning. Never build custom product logic for one organization.

Customer and institutional learning should improve the shared domain model, product language, safeguards, and capabilities. Organization-specific information belongs in isolated data and configuration—not in customer-specific application forks or conditional product behavior.

## Deterministic analysis

Explorer and FLOW Analysis remain deterministic, evidence-based, reproducible, and read-only.

- **Explorer** presents the operating model and the evidence recorded about it.
- **FLOW Analysis** interprets that model through explainable rules about ownership, coverage, concentration, responsibility, and change impact.
- Both experiences should use the same organization-scoped operating-model snapshot and the same visible, database-derived as-of timestamp.
- Findings should preserve clear evidence language such as **direct impact**, **potential indirect impact**, and **review recommended**.
- Results should avoid arbitrary composite scores when plain-language facts communicate the evidence more honestly.

As continuous improvement matures, FLOW Analysis should keep four perspectives distinct:

- **Current operating model** — the approved definition and current organizational context effective at the selected as-of time.
- **Proposed improvements** — ideas and approved or pending changes that have not yet become completed improvements or current operational truth.
- **Completed improvements** — implemented initiatives with their resulting operating-model changes, measured outcomes, and sustainment status.
- **Historical operating models** — prior approved definitions and relationships that were effective before later changes superseded them.

These perspectives may be connected, but they must never be silently collapsed into one another. A proposal is not current truth, implementation is not proof of benefit, and a superseded operating model remains part of the organization's history.

AI may assist users with discovery, drafting, organization, comparison, and questions. It should never silently generate operational truth. AI-generated suggestions must remain distinguishable from approved organizational records, traceable to their source context, and subject to explicit human review before they become authoritative.

AI may also help turn hurried notes into a readable draft. The original source,
model-produced wording, human edits, and final approved presentation must
remain distinguishable. Clearer prose must not erase uncertainty, disagreement,
scope, provenance, or the difference between observed practice and approved
policy.

## Environment strategy

Lotura is one continuously evolving application with isolated environments.

| Environment | Purpose | Data posture | Access posture |
| --- | --- | --- | --- |
| **Development** | Engineering, testing, validation, and product learning | Fictional, disposable, or explicitly approved development data in isolated databases | Restricted to the development team and approved collaborators |
| **JU Pilot** | A private authenticated pilot using approved institutional process information | Approved institutional information isolated from every other environment | Authenticated and authorized pilot participants only |
| **Demo/Sandbox** | A blank customer workspace for exploration, onboarding, and demonstrations | Empty by default, with an optional clearly identified fictional sample organization | Controlled demonstration or prospective-customer access appropriate to the workspace |

All environments share the same application, domain concepts, and feature set while maintaining isolated databases, credentials, configuration, and access controls. No environment should depend on another environment's database or secrets. Production-like institutional data must never be used as an implicit fallback for Development or Demo/Sandbox.

The JU Pilot is a deployment and learning context, not a separate edition of Lotura. Pilot needs should be evaluated as general product needs. If a requested behavior is useful only as hard-coded logic for one institution, it does not belong in the shared product.

## Architecture principles

### 1. One product, isolated state

Lotura should have one evolving application and one coherent domain language. Environment and organization boundaries belong in data, credentials, configuration, and authorization—not divergent application forks.

### 2. The operating model is the product foundation

New capabilities should extend or interpret the operating model rather than creating disconnected records that duplicate it. Relationships should remain organization-scoped and preserve the difference between intended design and current operational reality.

### 3. Determinism before automation

Core interpretations should be reproducible from visible facts. Deterministic analysis creates a trustworthy foundation on which optional AI assistance can later operate without becoming the source of truth.

### 4. Evidence and provenance are first-class

Operational records and findings should retain enough context to explain their source, scope, timing, and limitations. The visible as-of time is part of the meaning of a result, not decorative metadata.

### 5. Read and write boundaries stay explicit

Exploration and analysis are read-only capabilities. Future capture, approval, versioning, and improvement actions should be introduced as explicit, authorized product behaviors rather than hidden side effects of analysis.

### 6. Least privilege and isolation are product properties

Each environment and runtime should have only the access it needs. Organization scoping, database isolation, server-only credentials, and fail-closed behavior protect the meaning of the product as well as its data.

### 7. Institutional knowledge should remain portable

The operating model must not be trapped in opaque AI output or customer-specific code. Organizations should be able to understand, govern, and eventually export the structured knowledge Lotura holds about them.

### 8. Evolve the model deliberately

The architecture should support incremental growth without prematurely turning future concepts into schema. New entities and relationships should be introduced when their lifecycle, ownership, evidence, and organizational boundaries are understood.

### 9. Governance is multidimensional

Visibility, contribution, approval, analysis, administration, and stewardship should have independently configurable scope. Product profiles may provide understandable defaults, but they must not collapse governance into reporting hierarchy or one universal role level.

### 10. The digital twin remains evidence-based

Workspace Studio should make the organization feel buildable and connected,
but the resulting digital twin must never be presented as automatically
complete or authoritative. Inventory counts describe documented records;
Workspace Health presents deterministic facts and questions rather than a
score; and Activity presents recorded changes without inventing causality.

Structured authoring, evidence review, governance, approved versions,
continuous improvement, and scenario analysis may enrich the same digital twin
over time. Each capability must preserve its own source, authority, effective
time, and limitation rather than flattening them into one apparent truth.

### 11. The operating model is the trusted destination

Evidence, reviewed interpretations, proposals, approved versions, and actual
organizational reality remain distinct. Discovery and AI may help knowledge
move through the lifecycle, but neither may silently write, approve, or replace
the operating model.

### 12. Difference is evidence, not automatically error

Participant disagreement, Reference Model deviation, Process drift, Job Drift,
and organizational restructuring create questions for accountable review.
Lotura must not turn difference alone into a defect, compliance conclusion, or
quality score.

### 13. No change is a valid knowledge outcome

A completed Discovery review may confirm current documentation, preserve
questions for another participant or source, or conclude that no operating-
model change is warranted now. Lotura should summarize that outcome from the
durable evidence and human review decisions without creating an empty proposal,
claiming completeness, or pressuring someone to invent work.

Understanding precedes change. Unresolved knowledge may move forward without
being falsely resolved, and the documented Process changes only through a
separately governed approval and application boundary.

## Roadmap phases

The roadmap describes product outcomes rather than fixed release dates or implementation commitments.

The immediate product sequence completes the manual organizational knowledge
lifecycle before AI suggests or automates any part of it:

1. Knowledge Outcomes
2. Proposal Review & Governance
3. Process Versions & Atomic Application
4. Knowledge Gaps
5. Process Families
6. Question-Driven Discovery
7. AI Discovery Assistance
8. Reference Models
9. Practice Comparison
10. Job Descriptions & Job Drift
11. Operating-Model Drift
12. Continuous Improvement

The first three milestones now establish the manual lifecycle and its separate
application authority. AI Discovery Assistance therefore moves ahead of
Reference Models, while remaining unable to approve or apply organizational
knowledge.

The next phase is **Make Lotura useful at scale**. It begins with Knowledge
Gaps and Process Families so Lotura can help people find the next useful
question and navigate related work before AI becomes a prominent product
surface.

### Phase 1: Operating-model foundation

Establish the shared language of processes, roles, assignments, systems, exceptions, and dependencies. Provide a read-only Explorer and deterministic FLOW Analysis over an organization-scoped snapshot.

### Phase 2: Trusted private pilot

Support authenticated, authorized use of the same product in the JU Pilot. Validate the domain language, onboarding experience, evidence requirements, privacy boundaries, and usefulness of deterministic findings against approved real-world institutional information.

### Phase 3: Guided discovery and stewardship

Help organizations capture, review, and maintain their operating model with explicit human stewardship. Assistance may identify missing context, inconsistencies, or questions, but people remain responsible for approving organizational records.

### Phase 4: Versioned operational knowledge

Introduce process version history so an organization can determine what operational definition was approved and effective at a point in time. Preserve authorship, approval, effective periods, and supersession without conflating version history with improvement outcomes.

### Phase 5: Continuous improvement through FLOW

Represent improvement initiatives, affected processes and systems, measures, implementation, results, and sustainment. Connect operating-model change to evidence of whether the expected benefit occurred and persisted.

### Phase 6: Safe organizational evolution

Expand explainable scenario analysis, comparison, and change review across the operating model. Support leaders and practitioners in understanding likely review sets and dependencies while preserving the distinction between modeled impact, human judgment, and actual organizational outcomes.

## Non-goals

Lotura is not intended to become:

- a generic task, project, ticketing, or workflow-execution system;
- an SOP repository or wiki with disconnected pages;
- a customer-specific application fork for JU or any other organization;
- an AI system that invents, approves, or silently changes operational truth;
- a black-box scoring engine that reduces organizational health to an arbitrary number;
- an employee-surveillance or individual-performance ranking product;
- a replacement for every operational system an organization already uses;
- a system that treats graph connectivity as proof of causation or failure;
- an autonomous authority for organizational approvals or restructuring decisions; or
- a reason to mix institutional, customer, demo, development, preview, or production data and credentials.

This document also does not define database migrations, API contracts, deployment procedures, or implementation sequencing. Those decisions must remain consistent with this vision but belong in their respective technical and delivery documents.

## Product decision test

When evaluating a proposed capability, Lotura should ask:

1. Does it deepen understanding of the organization's operating model or its improvement over time?
2. Is the evidence visible, scoped, and understandable?
3. Does it preserve human accountability and distinguish fact from suggestion?
4. Can it improve the shared platform without hard-coding one organization's behavior?
5. Does it respect environment, organization, credential, and access isolation?
6. Can it evolve safely without pretending that incomplete information is operational truth?

If the answer is no, the capability should be reconsidered regardless of how attractive it appears in isolation.
