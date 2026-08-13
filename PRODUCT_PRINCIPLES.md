# Lotura Product Principles

## Purpose

These principles govern how Lotura models organizations, interprets evidence, assists users, and evolves as a product.

They are decision rules, not slogans. When a proposed feature, analysis, data model, or AI capability conflicts with a principle, the product should change course or make the tradeoff explicit.

## 1. Organizational truth is earned, not assumed

Lotura should preserve observations before establishing organizational truth.

An interview, document, diagram, system record, or AI interpretation may provide valuable evidence, but none should become authoritative merely because it entered the platform. Organizational truth emerges through attribution, comparison, reconciliation, accountable review, and explicit approval.

Approval does not erase the evidence, uncertainty, accepted divergence, or dissent that preceded it. Later observations may challenge a previously approved definition and begin a new review without rewriting history.

**Product test:** Can a user distinguish the original evidence, the interpretation, the reviewer’s decision, and the approved operating-model record?

## 2. Every conclusion should be explainable

Lotura should show the facts, relationships, scope, as-of time, assumptions, and reasoning behind every finding.

Statements such as “this role has broad operational reach” or “this process may be affected” should be supported by the exact processes, steps, systems, assignments, exceptions, and dependency paths used to determine them.

Lotura should prefer plain-language findings over opaque composite scores. When the available evidence is incomplete, the limitation belongs beside the conclusion rather than in a distant disclaimer.

**Product test:** Can the affected user understand how the conclusion was reached and identify what evidence would change it?

## 3. AI assists; humans approve

AI may help users interview participants, interpret source material, organize observations, identify possible conflicts, formulate questions, compare scenarios, and summarize evidence.

AI should never silently create organizational truth, resolve disagreement, assign ownership, approve a process, declare an improvement successful, or enact a restructuring decision. AI-generated material must remain attributable, reviewable, correctable, and distinguishable from approved records.

Human approval must be meaningful rather than ceremonial: the responsible person should be able to inspect the evidence, reject the interpretation, preserve dissent, and understand the consequences of approval.

**Product test:** Does an accountable human retain informed control over every decision that changes the operating model?

## 4. Deterministic analysis before probabilistic insight

Lotura should first interpret explicit operating-model facts using organization-scoped, reproducible rules at a visible as-of timestamp.

Deterministic analysis establishes a trustworthy baseline: current ownership, active assignments, step responsibility, linked systems, exceptions, and dependency paths. Probabilistic or AI-assisted insight may later help users explore incomplete or unstructured evidence, but it should not blur, override, or impersonate that baseline.

The interface should label deterministic findings, inferred possibilities, and human judgments distinctly.

**Product test:** Can the core finding be reproduced from visible facts without relying on a model’s hidden reasoning?

## 5. Roles outlive people

Organizational responsibility belongs to roles; people hold assignments to those roles for defined periods and purposes.

This distinction preserves continuity when an employee joins, leaves, takes interim coverage, acts temporarily, or serves as backup. Historical operating models should continue to show which role was responsible and who was assigned at the relevant time.

Lotura should not redefine a role around the habits, title, availability, or performance of its current assignee.

Person, User, Position, and Operational Role are separate concepts. A User is an application identity, a Position is a structural seat, and an Operational Role is durable responsibility. Reporting hierarchy and Position titles must never manufacture Process ownership. A RoleMandate may allocate responsibility to a Position while RoleCoverage identifies the Person providing current coverage; changing temporary coverage does not reorganize the reporting structure.

**Product test:** Can the organization understand responsibility before, during, and after a personnel change without rewriting the process?

## 6. Processes outlive departments

A process represents how the organization produces an outcome, not the temporary structure of the department that currently performs it.

Departments may be eliminated, split, merged, or renamed. The work may move, be redesigned, be outsourced, or eventually become unnecessary. Lotura should preserve process identity and history across those changes rather than treating a reorganization as the disappearance of operational knowledge.

Organizational structure provides important scope and context, but it should not become the permanent identity of the process.

**Product test:** Can the process remain understandable and historically traceable when organizational boundaries change?

## 7. Systems change; dependencies remain

Software is one implementation of an operational need. Replacing a system does not automatically remove the inputs, outputs, handoffs, controls, data, or downstream expectations that surrounded it.

Lotura should preserve the distinction between a system, the processes that use it, and the operational dependencies those processes must satisfy. When software changes, the organization should be able to review which dependencies remain, which are redesigned, and which are explicitly retired.

Historical operating models must continue to identify the systems actually used at the time.

**Product test:** Does a software change prompt review of the underlying operational relationships instead of silently deleting them?

## 8. Disagreement reveals organizational learning

> Disagreement is data. Lotura should surface it, not smooth it over.

Different accounts may reveal outdated documentation, local adaptation, an undocumented exception, unclear ownership, terminology differences, a transition in progress, or genuinely conflicting expectations.

Lotura should preserve each account with its source, context, timing, and scope. It should support reconciliation, consensus, accepted divergence, and unresolved questions without allowing majority opinion or AI confidence to become truth automatically.

Conflict is not proof of failure or individual fault. It is evidence that the organization has something to understand.

**Product test:** Can users see competing accounts and the context behind them without one being silently erased?

## 9. Improvement should be measurable

An improvement is distinct from the process version that results from it. It should preserve the original problem or opportunity, evidence, contributor, rationale, proposed change, expected benefit, approval, implementation, affected operating-model records, measured result, and whether the result was sustained.

> An improvement is not complete when the new process is documented. It is complete when the result is measured and sustained.

Lotura should distinguish the current operating model, proposed improvements, completed improvements, and historical operating models. Documentation is evidence of a definition change, not proof of a better outcome.

**Product test:** Can the organization trace an improvement from the originating evidence through implementation to measured and sustained results?

## 10. The operating model is the product

Lotura is not fundamentally a task manager, workflow engine, SOP repository, diagramming tool, or AI chatbot. Its durable product is the organization’s operating model: the connected representation of Processes, Roles, Systems, Exceptions, Dependencies, and Assignments, enriched over time by evidence, history, improvements, and accountable decisions.

Explorer, FLOW Analysis, Knowledge Capture, Conflict Detection, Process Acquisition, Restructuring Intelligence, Continuous Improvement, and future AI assistance should all deepen or interpret that shared model. They should not create disconnected feature-specific versions of organizational reality.

The product should remain general enough to learn from real organizations without embedding custom logic for one institution.

**Product test:** Does the capability strengthen a coherent operating model, or does it create an isolated workflow, document store, or customer-specific product branch?

## 11. The digital twin is built from evidence

Lotura's organizational digital twin is a living representation of structure,
responsibility, work, technology, exceptions, dependencies, knowledge, and
change. It is not automatically complete, institutionally approved, or
synchronized in real time merely because records exist in the product.

Workspace Studio should make the organization feel buildable without turning
administrative entry into unquestioned truth. Inventory counts describe the
current documented model. Workspace Health asks reproducible questions rather
than assigning a score. Activity shows recorded events without manufacturing
causal relationships between them.

The Studio unifies the authoring experience, not authority. Domain-specific
permissions, server-only credentials, validation rules, and append-only
histories remain explicit beneath the shared product surface.

**Product test:** Can a user understand what the digital twin contains, what
supports it, what remains uncertain, and who had authority to change it?

## 12. Governance is multidimensional

Organizational hierarchy, operational responsibility, visibility,
contribution, approval, analysis, administration, and stewardship answer
different questions. No one dimension should silently grant another.

A President may analyze the whole organization without administering its
canonical structure. A Process Steward may approve a proposed Process change
without supervising its contributor. A Workspace Administrator may configure
Lotura without owning the work represented in it.

Stewardship means accountable care for organizational knowledge. A Steward is
not automatically the manager, Process Owner, system administrator, or current
performer. Reporting hierarchy must never manufacture approval or
administrative authority.

Most contributors should suggest attributable updates rather than overwrite
approved organizational knowledge. Direct canonical maintenance is a scoped,
audited administrative capability and must never erase evidence or history.

**Product test:** Can the product explain separately why someone may view,
contribute, approve, analyze, administer, or steward this knowledge?

## Discovery through documentation

**Discovery is an expected outcome of documentation.**

The act of describing current work should be allowed to reveal missing steps, assumptions, ownership ambiguity, undocumented workarounds, conflicting accounts, and weaknesses in the operating model. Lotura should preserve these discoveries instead of treating them as form errors or pressuring contributors to manufacture complete answers.

Future knowledge-capture experiences should distinguish **Known**, **Assumed**, **Unknown**, **Needs validation**, and **Conflicting observations**. An incomplete answer is often more valuable than a polished but inaccurate one because it exposes where organizational understanding must mature.

> Document reality first. Improve it second.

> Disagreement is data.

Gaps are valuable organizational knowledge. Lotura should help people document reality first, preserve honest uncertainty, and return later for reconciliation, approval, or improvement without erasing the discovery path.

**Product test:** Can a contributor pause with unresolved questions intact and later resume from the same evidence without being forced to imply certainty?

## Conversational language at the product surface

People should not need to learn Lotura's architecture vocabulary to describe
their work. Product screens should say what is documented now, what someone
said, what still needs review, and whether anything changed. Terms such as
canonical record, epistemic state, immutable evidence, and sanitization
boundary belong in technical, audit, and governance contexts when their
precision matters—not as the default language of everyday tasks.

**Product test:** Can an ordinary participant understand the next action and
its consequence without learning the database or governance model first?

## Evidence language

Lotura should use consistent language when interpreting the operating model:

- **Direct impact** means the proposed question or change explicitly touches a modeled entity or relationship.
- **Potential indirect impact** means a connected part of the operating model may be affected through a visible dependency, handoff, shared role, or shared system.
- **Review recommended** means the model identifies a question that requires accountable human judgment or additional evidence.

Connectivity supports a review set. It does not prove failure, causation, required change, or a future outcome.

## Product decision lens

Before advancing a capability, Lotura should ask:

1. What form of evidence does it create or interpret?
2. How are source, organization, scope, time, and uncertainty preserved?
3. What is observed, inferred, proposed, approved, implemented, or measured?
4. Can every conclusion be explained and reproduced appropriately?
5. Where is accountable human judgment required?
6. What disagreement, history, or institutional knowledge could be lost?
7. Does the capability strengthen the shared operating model?
8. Is the design reusable across organizations without custom product logic?
9. What could make the result misleading, incomplete, or unsafe?
10. Can the organization reverse or revisit the decision without erasing history?

## Product boundary

These principles guide future product and architecture decisions. They do not themselves change the Version 0.1 schema, migrations, Process Explorer, FLOW Analysis, live data adapter, databases, environments, or infrastructure.
