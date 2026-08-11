# Lotura Product Roadmap

## Purpose

This roadmap translates the direction in [PRODUCT_VISION.md](PRODUCT_VISION.md) into a sequence of product outcomes. It is a product-planning document, not an implementation plan, technical specification, or release commitment.

The phases are intentionally cumulative. Each phase should deepen the same shared platform and operating-model language rather than create a separate product for one organization or environment.

## Roadmap principles

- Lotura models the organization itself, not only workflows, tasks, or SOPs.
- Processes, Roles, Systems, Exceptions, Dependencies, and Assignments remain the operating-model foundation.
- Deterministic, evidence-based interpretation precedes automation and AI assistance.
- Human stewards remain responsible for organizational truth and approved change.
- Governance distinguishes visibility, contribution, approval, analysis, administration, and stewardship rather than deriving authority from reporting hierarchy.
- Development, JU Pilot, Demo/Sandbox, and future production environments use the same product while isolating data, credentials, configuration, and access.
- Real-world learning should improve the shared platform; it should not produce customer-specific application logic.
- A deferred idea is intentionally postponed until its product boundaries and evidence requirements are understood. Deferred does not mean forgotten.
- Workspace Studio is the governed authoring environment for Lotura's organizational digital twin; it unifies the product experience without creating one unrestricted write boundary.

## Workspace Studio product sequence

Workspace Studio gives authorized people one coherent place to build and
govern the organization's digital twin. Its product sequence is intentionally
memorable while its implementation remains incremental:

1. **Organization Builder** — Units, Positions, People, Position Assignments,
   and reporting relationships.
2. **Responsibility Builder** — Operational Roles, Role Mandates, and Role
   Coverage.
3. **Process Builder** — Process acquisition and maintenance of the connected
   operating model.
4. **Technology Builder** — Systems and their explicit Process relationships.
5. **Studio synthesis** — current documented-model facts, explainable
   Workspace Health questions, Activity, and honest Governance and Discovery
   entry points.

Knowledge becomes a cross-cutting evidence lens rather than a disconnected
document library. Discovery becomes the long-term home for source intake,
review, reconciliation, imports, and guided interviews. Activity becomes the
chronological product view over domain-specific append-only histories without
replacing them or inventing causality.

The relationship canvas and contextual AI assistance belong inside the Studio
direction, but remain intentionally postponed until the core builders produce
trustworthy connected data and their governance boundaries are approved.

## Phase 1 – Platform Foundation (completed)

### Outcome

Establish Lotura's minimum operating model and prove that it can present and interpret organizational knowledge through a deterministic, read-only product experience.

### Completed milestones

- Defined the Version 0.1 operating model around Organizations, Users, Memberships, Roles, Role Assignments, Processes, Process Steps, Exceptions, Systems, Process-System relationships, and Process Dependencies.
- Distinguished durable organizational roles from the people currently assigned to them.
- Represented permanent, interim, acting, and backup role coverage without assigning ownership directly to a person.
- Made exceptions, systems, and process dependencies first-class operating-model information.
- Established same-organization relationship safeguards, retirement and archival behavior, ownership requirements, and protected deletion behavior.
- Created the read-only Process Explorer for browsing, searching, filtering, and inspecting connected process knowledge.
- Added deterministic FLOW Analysis with Current gaps, Concentrations, and What changes? sections.
- Established the evidence-language distinction between **direct impact**, **potential indirect impact**, and **review recommended**.
- Kept FLOW calculations pure, reproducible, organization-scoped, and tied to a visible as-of timestamp.
- Added a server-only Neon adapter while retaining a fictional fixture for tests and explicit demo use.
- Established fail-closed organization scoping and a dedicated read-only runtime credential boundary.
- Validated a fictional Northstar Service Collective workspace against an isolated Neon development database without runtime writes.
- Established isolated Development configuration without placing the owner or migration credential in the runtime environment.
- Documented continuous improvement as a future capability distinct from process version history.
- Recorded the shared-product, isolated-environment strategy for Development, JU Pilot, and Demo/Sandbox.

### Intentionally postponed from Phase 1

The following were deliberately excluded so the operating-model and trust foundations could be validated first:

- authentication and authorization;
- editing and knowledge-capture workflows;
- process approval and version history;
- workflow execution, operational tasks, comments, and notifications;
- continuous-improvement initiative records and measurement;
- AI-generated assistance;
- integrations, imports, and public APIs; and
- enterprise identity, compliance, and administration.

These ideas remain part of the roadmap and are assigned to later phases below.

## Phase 2 – Knowledge Capture

### Outcome

Enable authorized people to observe, discover, reconcile, approve, and steward an organization's operating model while preserving provenance, organizational boundaries, and accountability.

**Lotura should preserve observations before establishing organizational truth.** An interview response, process observation, document, or system record is evidence to be retained with its context. It becomes an approved organizational definition only through explicit reconciliation, consensus, and approval.

### Product milestones

- Introduce authentication and organization-scoped authorization.
- Establish Workspace Studio as the governed authoring environment for the
  organizational digital twin, beginning with Organization Builder rather
  than a broad settings-style Administration product.
- Keep Organization, Explorer, Process Detail, and FLOW as understanding
  surfaces while Studio becomes the authorized maintenance surface.
- Present deterministic current-model facts and Things to review without
  health scores, invented validation counts, or unsupported completeness
  measures.
- Introduce the generic Workspace Administrator, Contributor, Manager / Approver, and Leadership / Organizational Analyst profiles without treating them as a single authority hierarchy.
- Make Stewardship visible for important organizational knowledge while preserving the difference between a Steward, manager, Process Owner, system administrator, and current performer.
- Support the private JU Pilot using approved institutional process information in an isolated environment.
- Provide a blank Demo/Sandbox customer workspace with an optional, clearly labelled fictional sample organization.
- Preserve process observations as first-class evidence with their source, participant perspective, timing, context, scope, and relationship to the operating model.
- Add guided interviews that help people describe how work is intended to happen, how it actually happens, where it varies, and what knowledge is otherwise implicit.
- Add bounded AI interviewing of employees within an approved scope, with clear disclosure, evidence provenance, and human review. AI interview output remains observation, not organizational truth.
- Add guided capture and editing for processes, steps, roles, assignments, systems, exceptions, dependencies, and institutional knowledge.
- Detect conflicts among interviews, observations, approved records, and other evidence without silently choosing a winner.
- Provide reconciliation tools that let stewards compare evidence, preserve unresolved differences, and propose a coherent operating-model definition.
- Represent consensus explicitly, including what is agreed, disputed, uncertain, or still awaiting evidence.
- Add an approval workflow that separates observation, proposed interpretation, reviewer consensus, and approved organizational truth.
- Route review and approval from explicit governance scope and connected operating-model context rather than automatically using the contributor's manager.
- Make **Suggest an update** the normal contribution path for approved knowledge; reserve direct canonical maintenance for scoped, audited Workspace Administration.
- Preserve version history for approved definitions, including authorship, approval, effective timing, and supersession.
- Support change requests tied to the observations, conflicts, processes, roles, systems, exceptions, and dependencies that motivated them.
- Begin the continuous-improvement loop by turning accepted observations and change requests into traceable improvement opportunities. Measurement and sustainment mature in Phase 3.
- Distinguish observations, drafts, reconciled proposals, approved knowledge, and superseded versions without implying that incomplete capture is authoritative.
- Preserve who observed, supplied, reconciled, reviewed, approved, or changed material and when that occurred.
- Make missing evidence, unresolved ownership, conflicting descriptions, and incomplete relationships visible throughout capture and review.
- Support safe retirement and restructuring without silently deleting historical organizational knowledge.
- Establish reusable onboarding and stewardship patterns that work across organizations rather than JU-specific product behavior.
- Provide controlled export of an organization's structured operating-model knowledge.

### Intentionally postponed within or beyond Phase 2

- Generic task management and workflow execution remain postponed because Lotura is not intended to replace operational work systems.
- Broad comments, notifications, and collaboration feeds remain postponed until they have a clear stewardship purpose and do not become a parallel social layer.
- Automatic imports remain postponed until identity matching, provenance, conflict handling, and organization scoping are reliable.
- Unsupervised or undisclosed AI interviewing remains prohibited. Phase 2 AI interviewing is bounded, transparent, provenance-preserving, and subject to human review.
- Full improvement measurement, result evaluation, and sustainment remain postponed to Phase 3 even though observations and change requests begin the improvement loop in Phase 2.
- The broader AI Assistant remains postponed to Phase 4; Phase 2 uses AI only where necessary to support governed knowledge capture.

## Phase 3 – Operational Intelligence

### Outcome

Help organizations understand how their operating model changes over time and turn operational friction into measured, sustained improvement.

### Product milestones

- Extend Phase 2 version history into longitudinal comparison of the approved operational definitions effective at different points in time.
- Preserve the distinction between process history and improvement history.
- Mature Phase 2 observations and change requests into first-class improvement initiatives that record the improvement idea, originating process, contributor, rationale and evidence, expected benefit, implementation status, approval, implementation date, and resulting operating-model changes.
- Connect improvements to multiple processes and systems without burying impact in narrative text.
- Keep every process improvement historically traceable from its originating evidence through approval, implementation, resulting operating-model versions, measurement, and sustainment.
- Define improvement measures with baselines, targets, evidence sources, observation periods, measured results, and sustainment checks.
- Expand FLOW from current-state analysis into a closed organizational learning loop.
- Let FLOW distinguish the current operating model, proposed improvements, completed improvements, and historical operating models without presenting one as another.
- Compare operating-model states and explain what changed in ownership, coverage, systems, exceptions, and dependencies.
- Deepen deterministic scenario analysis for process change, role restructuring, system unavailability, and cross-process impact.
- Preserve explainable findings and supporting facts rather than introducing opaque organizational-health scores.
- Provide portfolio views of active friction, proposed changes, implemented improvements, measured outcomes, and sustainment status.

These are future domain and product commitments. They do not expand or modify the Version 0.1 schema.

### Intentionally postponed within or beyond Phase 3

- Predictive claims about operational outcomes remain postponed until Lotura has sufficient longitudinal evidence and defensible methods.
- Automated approval or implementation of organizational changes remains postponed; analysis does not grant authority.
- Universal benchmarking across organizations remains postponed because operating context, definitions, and data quality may not be comparable.
- Real-time operational monitoring remains postponed unless integrations can preserve provenance and avoid turning Lotura into an event-processing system.

## Phase 4 – AI Assistant

### Outcome

Add optional AI assistance that helps people discover, organize, question, and improve operating-model knowledge without allowing generated output to become silent operational truth.

### Product milestones

- Expand the bounded interview assistance introduced in Phase 2 into a broader, organization-governed AI assistant.
- Assist users in turning interviews, workshops, notes, observations, and approved source material into structured drafts.
- Suggest clarifying questions, missing relationships, contradictory statements, and areas requiring review.
- Summarize operating-model context while preserving links to the supporting records and source evidence.
- Help compare process versions, improvement evidence, expected benefits, measured results, and sustainment findings.
- Draft proposed process language, exception responses, and improvement hypotheses for explicit human review.
- Explain deterministic FLOW findings in language appropriate to different audiences without changing the underlying calculation.
- Make generated suggestions visibly distinct from approved organizational records.
- Record provenance, model involvement, source context, reviewer decisions, and acceptance or rejection of suggestions.
- Provide organization-level controls for where AI is permitted and what information may be used.

### Intentionally postponed within or beyond Phase 4

- Silent generation or modification of operational truth is permanently out of scope.
- Autonomous approval, publication, assignment, restructuring, or improvement completion is intentionally prohibited.
- Model-generated risk scores are postponed unless they can be validated, explained, and kept distinct from deterministic evidence.
- Training shared models on private institutional information is postponed unless explicit governance, consent, isolation, and contractual boundaries are established.
- Agentic execution in external operational systems is postponed until authorization, reversibility, auditability, and product fit are proven.

## Phase 5 – Enterprise

### Outcome

Support governed, secure, interoperable use of Lotura across complex organizations while preserving the same product and operating-model principles.

### Product milestones

- Add enterprise identity capabilities such as single sign-on, managed provisioning, and role-based administration.
- Add independently scoped visibility, contribution, approval, analytical, administrative, and stewardship policies.
- Support delegated Stewardship, cross-functional review, governance committees, and effective-dated authority without collapsing them into reporting hierarchy.
- Support organizational hierarchies, delegated stewardship, and appropriately scoped cross-unit visibility.
- Provide comprehensive audit history for access, approvals, knowledge changes, exports, and administrative actions.
- Add configurable retention, archival, legal, privacy, residency, and evidence-governance controls.
- Support secure integrations and APIs for approved systems of record without weakening Lotura's organization and environment boundaries.
- Provide governed import, reconciliation, and export workflows with provenance and conflict visibility.
- Support enterprise-scale search, reporting, and operating-model comparison without reducing context to simplistic rankings.
- Establish service, reliability, recovery, and support capabilities appropriate for institutional use.
- Enable controlled multi-environment promotion of configuration and operating-model structures without copying credentials or unapproved data.
- Maintain a single shared product across customers, pilots, sandboxes, and enterprise deployments.

### Intentionally postponed within Phase 5

- Customer-specific forks remain prohibited even for large enterprise customers.
- A broad marketplace or extension ecosystem remains postponed until extension permissions, data access, review, and support boundaries are mature.
- Cross-customer data aggregation and benchmarking remain postponed unless privacy, consent, comparability, and governance are explicit.
- Replacing specialized workflow, HR, ERP, service-management, or project-management systems remains a non-goal; integrations should connect context rather than duplicate entire products.

## Deferred ideas register

This register makes intentional postponement visible so ideas are neither mistaken for current commitments nor lost from product planning.

| Deferred idea | Earliest relevant phase | Why it is intentionally postponed |
| --- | --- | --- |
| Authentication and authorization | Phase 2 | The read-only operating-model foundation needed validation before access policy was introduced. |
| Governance and Stewardship engine | Phase 2 through Phase 5 | Product vocabulary and boundaries are established, but scoped policy, delegation, approval routing, effective timing, audit, and enterprise identity require separate design. |
| Editing and knowledge stewardship | Phase 2 | Capture requires provenance, observation status, review meaning, and organizational authorization. |
| JU Pilot with institutional information | Phase 2 | Pilot use requires private authenticated access and explicit data approval. |
| Guided and AI-assisted interviews | Phase 2 | Interviewing requires approved scope, disclosure, provenance, observation preservation, and human review. |
| Conflict detection, reconciliation, and consensus | Phase 2 | Lotura must preserve conflicting observations before stewards establish an approved definition. |
| Approval workflow and process version history | Phase 2 | Observation, proposal, consensus, approval, effective timing, and supersession must remain distinct. |
| Change requests and continuous improvement | Phase 2 and 3 | Phase 2 captures the reason for change; Phase 3 evaluates implementation, measurement, result, and sustainment. |
| Tasks, comments, and notifications | Unscheduled | They should be added only where they serve operating-model stewardship or improvement, not as generic collaboration features. |
| Workflow execution | Unscheduled | Lotura's core purpose is organizational intelligence, not replacing operational execution systems. |
| External integrations and imports | Phase 3 or 5 | Identity matching, provenance, permissions, conflicts, and data ownership must be safe first. |
| Broad AI assistance | Phase 4 | Phase 2 permits bounded AI interviewing, while wider AI capture and analysis require proven stewardship, provenance, and governance. |
| Predictive analysis and benchmarking | Phase 4 or later | Longitudinal evidence, comparability, explainability, and validation are not yet sufficient. |
| Autonomous operational changes | Not planned | Human accountability and explicit authority are permanent product requirements. |
| Enterprise SSO, provisioning, and compliance controls | Phase 5 | These capabilities follow validated product value and multi-user governance needs. |
| Extension marketplace | Phase 5 or later | Permission, data-access, review, quality, and support models must mature first. |

## Roadmap review test

Progress between phases should be based on evidence, not feature count. Before advancing, Lotura should ask:

1. Has the current phase produced trustworthy learning in the shared platform?
2. Are organization, environment, access, and evidence boundaries understood?
3. Can users explain and challenge what Lotura presents?
4. Does the next capability deepen organizational intelligence rather than imitate a generic adjacent product?
5. Is a deferred idea now sufficiently understood to advance without weakening human accountability or product coherence?

The roadmap should evolve as Lotura learns, while the mission, core operating-model principle, and shared-platform philosophy remain stable.
