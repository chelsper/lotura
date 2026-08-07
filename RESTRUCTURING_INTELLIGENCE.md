# Restructuring Intelligence

## Purpose

Restructuring Intelligence is a future Lotura capability for helping an organization ask:

> What happens if we…

It uses the organization’s operating model to assemble the processes, roles, assignments, systems, exceptions, and dependencies that deserve review before a proposed change is made.

The purpose is not to predict the future with false certainty or recommend restructuring automatically. It is to make the known consequences, potential indirect effects, coverage gaps, assumptions, and unanswered questions visible while a decision is still reversible.

This document defines a product and architecture concept. It is not an implementation plan, a Version 0.1 schema change, or authorization to alter organizational records.

## Core principles

### Model consequences, not certainty

Lotura can determine what the recorded operating model connects directly and what may be affected through dependencies. It cannot infer every informal relationship, human response, contractual obligation, or real-world outcome.

Every scenario should distinguish:

- **direct impact** — a proposed change explicitly touches a modeled process, role, assignment, system, or relationship;
- **potential indirect impact** — a connected part of the operating model may be affected through a dependency, handoff, shared role, or shared system; and
- **review recommended** — the model identifies a question that requires accountable human judgment or additional evidence.

Graph connectivity is evidence for review, not proof of operational failure or mandatory change.

### Preserve the baseline

A scenario is a hypothetical alternative to the approved operating model. Exploring it must not edit, replace, or imply approval of the current organizational truth.

Users should always be able to compare:

- the current operating model;
- the proposed scenario;
- the differences between them;
- the evidence and assumptions used; and
- any unresolved conflicts or missing information.

### Keep people and roles distinct

Lotura should distinguish the organizational role a process requires from the person currently assigned to that role. A staffing event may change an assignment without eliminating the role; a structural event may change the role even when the same person remains.

This distinction prevents a personnel change from silently redefining organizational responsibility.

### Explain every finding

Every finding should expose its supporting facts and a plain-language explanation of how it was determined. Lotura should not collapse restructuring consequences into an opaque composite score.

## The scenario question

A future Restructuring Intelligence experience should let an authorized user describe a proposed change, its intended scope, and its effective date. Lotura should then construct a review set from the operating model as it existed at a visible as-of timestamp.

The result should answer four questions:

1. What is directly affected by the proposed change?
2. What may be affected indirectly and why?
3. Where could ownership, responsibility, capacity, system access, or institutional knowledge become unclear?
4. What evidence or accountable decisions are still needed before the scenario can be evaluated responsibly?

## Scenario types

### Eliminate a department

This scenario asks what happens if an organizational unit and its associated roles are retired or redistributed.

Lotura should surface:

- processes owned by roles in the department;
- steps explicitly assigned to those roles and steps that inherit responsibility from their process owner;
- current permanent, interim, acting, and backup assignments;
- systems owned or used by the affected roles and processes;
- exceptions whose handling depends on the department;
- upstream and downstream process dependencies;
- roles or people outside the department that depend on its handoffs;
- knowledge, approvals, or decision authority that would otherwise become orphaned; and
- historical records that must remain intact after any future retirement.

The analysis should not assume that work disappears with the department. It should identify the responsibilities that require reassignment, redesign, outsourcing, or explicit retirement.

### Split a department

This scenario asks how existing responsibility might be divided between two or more organizational units.

Lotura should surface:

- processes, steps, exceptions, systems, and assignments that require an explicit destination;
- processes that span both proposed units;
- handoffs that would become new cross-team dependencies;
- roles whose ownership or scope would become ambiguous;
- shared systems and access that both units may still require;
- terminology or policy that may need separate scoped definitions; and
- places where duplicate responsibility or missing responsibility could be introduced.

The analysis should preserve uncertainty when a responsibility cannot yet be assigned cleanly. It should not force every operating-model element into one side of the split.

### Merge two teams

This scenario asks what happens when two organizational units combine their people, roles, and responsibilities.

Lotura should surface:

- overlapping roles and assignments;
- duplicate, similar, or dependent processes;
- conflicting process sequences, ownership expectations, systems, timing, exceptions, or terminology;
- systems with overlapping functions or different sources of truth;
- opportunities to consolidate handoffs without assuming that similar work is identical;
- responsibilities that must remain distinct for control, expertise, location, or policy reasons; and
- institutional knowledge that could be lost if one team’s operating model is treated as the default.

A merger scenario should link to Conflict Detection. Differences between the teams are evidence to reconcile, not noise to smooth over.

### Outsource work

This scenario asks what happens when an external provider assumes some operational responsibility.

Lotura should surface:

- the processes and steps proposed for external delivery;
- the internal role that remains accountable even when execution moves outside the organization;
- new handoffs, dependencies, exception paths, escalation points, and continuity needs;
- systems and data the provider would need to access;
- processes and systems that would expose sensitive or regulated information;
- responsibilities that cannot be inferred to transfer from the current role;
- knowledge that must be captured before transition; and
- upstream and downstream processes that may need contract, timing, or interface review.

Outsourcing execution should never be interpreted automatically as outsourcing ownership, risk, approval authority, or organizational accountability.

### Hire another coordinator

This scenario asks whether adding capacity to an existing role, or introducing a related role, changes operational coverage.

Lotura should surface:

- processes owned and steps handled by the coordinator role;
- current assignments and their effective dates and types;
- responsibilities that can be shared and those that require one accountable owner;
- exception handling, systems, handoffs, and knowledge the new assignee would need;
- areas where apparent overload is supported by broad operational reach but workload volume is not recorded;
- potential backup, continuity, or specialization options; and
- decisions needed about assignment scope, geography, schedule, or process boundaries.

The existing operating model may show breadth of responsibility, but it does not by itself prove workload, utilization, or the correct staffing level. Hiring conclusions require evidence beyond structural reach.

### Lose an employee

This scenario asks what becomes exposed when a current assignee is unexpectedly unavailable or leaves the organization.

Lotura should surface:

- active role assignments held by the employee;
- processes owned and steps explicitly or implicitly covered through those roles;
- permanent, interim, acting, and backup coverage that remains effective;
- roles that would become vacant or temporarily covered;
- systems, exception paths, approvals, and handoffs associated with the affected roles;
- processes with the greatest orphan risk;
- concentrated institutional knowledge that has been observed but not reconciled or approved; and
- review sets for neighboring processes and roles.

Lotura should not infer that the employee is the organizational owner of every activity they perform. It should show where their assignments connect them to role-based responsibilities and where the operating model lacks enough evidence.

### Change software

This scenario asks what happens if a system is replaced, retired, materially reconfigured, or made unavailable.

Lotura should surface:

- processes directly linked to the system;
- steps, exception paths, and roles that rely on it where that evidence exists;
- upstream and downstream processes that may be affected through those directly linked processes;
- other systems used by the same processes;
- system ownership and current role coverage;
- possible sources-of-truth, integration, terminology, access, and continuity conflicts;
- institutional knowledge tied to the current system; and
- historical processes that must continue to identify the system they actually used.

Systems directly linked through the operating model belong in the direct review set. A system merely owned by a participating role is contextual information, not proof that the system is affected.

## What users should see

The smallest useful future experience should present:

- the scenario statement, scope, author, status, and visible as-of timestamp;
- an unchanged baseline beside the hypothetical operating model;
- direct impacts grouped by processes, roles, people, systems, exceptions, and dependencies;
- potential indirect impacts with the exact relationship path that connected them;
- ownership, responsibility, coverage, continuity, and knowledge questions requiring review;
- active disagreements and conflicts relevant to the scenario;
- assumptions, missing evidence, and model limitations;
- a plain-language “How this was determined” explanation for every finding; and
- an exportable review set for accountable discussion and eventual approval.

The interface should support exploration by organizational scope and effective date without implying that a scenario has been approved, implemented, or measured.

## Relationship to organizational knowledge

Restructuring decisions depend on more than the approved process definition. Future analysis should be able to consider, while keeping each category distinct:

- approved operating-model records;
- process version history;
- preserved observations;
- unresolved conflicts and accepted divergence;
- proposed and completed improvements;
- assignment history and effective dates;
- measured outcomes; and
- explicit scenario assumptions.

When evidence conflicts, Lotura should surface the disagreement rather than select the version most convenient for the scenario.

## Relationship to Continuous Improvement

A restructuring scenario may generate improvement ideas, change requests, or proposed operating-model changes. It is not itself an improvement and does not prove that the proposed structure is better.

If a scenario is approved and implemented, Lotura should preserve the path from the original question through the decisions and resulting operating-model versions. Expected benefits and measured results should remain separate.

> An improvement is not complete when the new process is documented. It is complete when the result is measured and sustained.

Restructuring outcomes should therefore be evaluated after implementation rather than declared successful because the new structure was recorded.

## Deterministic analysis and AI

Deterministic analysis should calculate review sets from explicit, organization-scoped operating-model relationships at a reproducible as-of time. The same scenario, baseline, and evidence should produce the same findings.

AI may eventually help users formulate scenarios, locate relevant observations, summarize evidence, suggest questions, or compare alternatives. AI must not silently:

- decide which employees or roles should be removed;
- invent missing responsibilities, dependencies, capacity, cost, or performance evidence;
- treat correlation or connectivity as causation;
- resolve conflicts or establish consensus;
- approve a restructuring decision; or
- alter the operating model.

AI assistance must remain attributable, reviewable, and distinguishable from approved organizational truth.

## Governance and safeguards

Restructuring scenarios may contain sensitive personnel, labor, contractual, security, and strategic information. Access, attribution, retention, and sharing must be governed explicitly and isolated by organization.

Lotura should not use structural analysis to rank employees, infer individual performance, recommend termination, or conceal the human judgment behind a decision. A broad operational reach can indicate critical knowledge or inadequate distribution; it is not a performance score.

Scenario creators and reviewers should be able to see which facts came from approved records, observations, assumptions, and generated hypotheses. Only authorized governance processes should convert an approved scenario into changes to organizational truth.

## Limitations

Restructuring Intelligence can only interpret what Lotura knows. Results may be incomplete when the operating model omits:

- informal work and undocumented knowledge;
- workload, transaction volume, duration, cost, or capacity;
- skills, certifications, location, schedule, or contractual constraints;
- detailed system integrations, data classifications, and access rules;
- policies, regulatory obligations, and control segregation;
- external provider capabilities and service commitments;
- employee availability, performance, or preference; or
- dependencies that have not been observed and approved.

These limitations should be visible within each scenario, not hidden in general disclaimers.

## Non-goals

Restructuring Intelligence is not intended to:

- predict an organizational outcome with certainty;
- produce an arbitrary restructuring score;
- optimize headcount automatically;
- recommend hiring, termination, outsourcing, or software procurement autonomously;
- treat all connected records as equally affected;
- replace financial, legal, labor, security, accessibility, or change-management review;
- turn a hypothetical scenario into an approved change; or
- rewrite historical operating-model records.

## Version 0.1 boundary

Restructuring Intelligence is an intentionally deferred capability. This concept does not change the Version 0.1 schema, migrations, Explorer, FLOW Analysis, data sources, or runtime behavior.

Future domain design must define scenario identity, scope, assumptions, baseline version, effective time, alternative relationships, access controls, review and approval states, comparison history, and links to changes and measured outcomes before implementation begins.
