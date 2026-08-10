# Lotura Architecture Decisions

## Purpose

This document is the authoritative register of Lotura’s major product and architecture decisions as of August 10, 2026. It records what was decided, why it was decided, alternatives considered, consequences, and ideas intentionally deferred.

It complements, rather than replaces:

- [PRODUCT_PRINCIPLES.md](PRODUCT_PRINCIPLES.md), which defines the governing doctrine;
- [PRODUCT_VISION.md](PRODUCT_VISION.md), which defines the enduring direction;
- [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md), which sequences product outcomes;
- [PROCESS_ACQUISITION.md](PROCESS_ACQUISITION.md), which defines future knowledge-entry paths;
- [CONFLICT_DETECTION.md](CONFLICT_DETECTION.md), which defines how disagreement should be preserved and reconciled;
- [RESTRUCTURING_INTELLIGENCE.md](RESTRUCTURING_INTELLIGENCE.md), which defines future scenario analysis;
- [GOVERNANCE_AND_STEWARDSHIP.md](GOVERNANCE_AND_STEWARDSHIP.md), which defines governance dimensions, profiles, and stewardship direction; and
- [docs/domain-model.md](docs/domain-model.md), which describes future continuous-improvement concepts.

This is a living decision log, not an implementation specification. Existing records should not be silently rewritten when direction changes. A later decision should mark an earlier decision **superseded**, explain why, and preserve the prior rationale.

## Required use in future work

Before proposing any schema or infrastructure change, future implementation work must:

1. Review this document and cite the affected decision IDs.
2. State whether the proposal follows, extends, or conflicts with each cited decision.
3. Explain why the current schema or infrastructure cannot satisfy the need.
4. Record alternatives considered, including a no-change option.
5. Identify organization-isolation, environment-isolation, credential, data-retention, migration, rollback, and historical-traceability consequences.
6. Add a new decision record, or explicitly supersede an existing one, before implementation begins.
7. Obtain approval for the decision before generating migrations, changing infrastructure, or handling non-fictional organizational data.

A feature request does not implicitly authorize a schema, migration, database, credential, environment, deployment, or infrastructure change.

## Status definitions

- **Accepted — implemented:** the decision is reflected in the current product or repository.
- **Accepted — product direction:** the decision governs future design but is not fully implemented.
- **Intentionally deferred:** the idea remains visible but lacks approval or sufficient design for implementation.
- **Superseded:** a later decision replaces the record while preserving its history.

## Decision index

| ID | Decision | Status |
| --- | --- | --- |
| LAD-001 | Lotura is an organizational intelligence platform | Accepted — product direction |
| LAD-002 | Organizational truth requires evidence and human approval | Accepted — product direction |
| LAD-003 | Build one product with isolated organizational and environment state | Accepted — product direction |
| LAD-004 | Version 0.1 uses a deliberately small operating-model schema | Accepted — implemented |
| LAD-005 | Roles are durable; people participate through time-bounded assignments | Accepted — implemented |
| LAD-006 | Process ownership and step responsibility have explicit semantics | Accepted — implemented |
| LAD-007 | Exceptions, systems, and process dependencies are first-class | Accepted — implemented |
| LAD-008 | Organization boundaries are enforced in storage and reads | Accepted — implemented |
| LAD-009 | Retirement and protected deletion preserve institutional knowledge | Accepted — implemented |
| LAD-010 | SQL names are plural and unambiguous; TypeScript entities remain singular | Accepted — implemented |
| LAD-011 | Explorer and FLOW begin as read-only product experiences | Accepted — implemented |
| LAD-012 | FLOW uses deterministic, reproducible, explainable analysis | Accepted — implemented |
| LAD-013 | Impact language and review-set boundaries must not overstate evidence | Accepted — implemented |
| LAD-014 | Fixture and Neon sources share one normalized operating-model projection | Accepted — implemented |
| LAD-015 | Runtime database access is server-only and least-privileged | Accepted — implemented |
| LAD-016 | Live reads use one consistent snapshot and fail closed | Accepted — implemented |
| LAD-017 | Demo fallback is explicit, labelled, and guarded in Production | Accepted — implemented |
| LAD-018 | Database changes use forward-only, reviewed migrations and an approved migrator | Accepted — implemented |
| LAD-019 | Fictional seeding is an explicit isolated provisioning action | Accepted — implemented |
| LAD-020 | Development, JU Pilot, and Demo/Sandbox are isolated contexts of one application | Accepted — product direction |
| LAD-021 | Process Acquisition preserves sources before producing approved knowledge | Accepted — product direction |
| LAD-022 | Disagreement and conflict are preserved as organizational evidence | Accepted — product direction |
| LAD-023 | Process version history and improvement history are separate | Accepted — product direction |
| LAD-024 | Restructuring Intelligence produces review sets, not autonomous decisions | Accepted — product direction |
| LAD-025 | AI assists discovery and interpretation; humans approve truth and change | Accepted — product direction |
| LAD-026 | Future concepts do not enter the schema before their lifecycles are designed | Accepted — product direction |
| LAD-027 | Use a calm, neutral, typography-led product design system | Accepted — product direction |
| LAD-028 | Organization appearance is constrained configuration layered over Lotura | Accepted — implemented |
| LAD-029 | Private workspace access uses a replaceable provider boundary | Accepted — implemented preparation |
| LAD-030 | Preparation state and sanitization remain explicit outside Version 0.1 | Accepted — implemented preparation |
| LAD-031 | Dedicated deployments may supply constrained workspace appearance | Accepted — implemented preparation |
| LAD-032 | Discovery is an expected outcome of documentation | Accepted — product direction |
| LAD-033 | Structure, responsibility mandates, and human coverage remain distinct | Accepted — product direction |
| LAD-034 | Organization Structure review remains a transient evidence overlay before import | Accepted — implemented |
| LAD-035 | Governance is multidimensional and Stewardship is distinct | Accepted — product direction |

## Decision records

### LAD-001 — Lotura is an organizational intelligence platform

**Decision:** Lotura models how an organization operates. Its product foundation is the connected operating model of Processes, Roles, Systems, Exceptions, Dependencies, and Assignments—not a collection of standalone procedures.

**Why:** A procedure alone cannot explain ownership, current coverage, enabling systems, alternate paths, upstream and downstream effects, or institutional knowledge. Lotura’s value comes from interpreting those relationships together.

**Alternatives considered:** An SOP repository, internal wiki, generic process diagrammer, task manager, workflow engine, or AI chatbot. These may be adjacent capabilities or integration targets, but each is too narrow to represent the organization itself.

**Consequences and deferrals:** New capabilities should extend or interpret the shared operating model instead of creating disconnected product-specific truth. Generic task management, workflow execution, and replacing specialized operational systems are intentionally deferred or permanent non-goals.

### LAD-002 — Organizational truth requires evidence and human approval

**Decision:** Lotura preserves observations before establishing organizational truth. Evidence, interpretations, proposals, approvals, implementation, and measured outcomes must remain distinguishable.

**Why:** Interviews, documents, system records, and observed practice can be incomplete, historical, scoped, or contradictory. Treating the first or most confident source as authoritative would erase context and accountability.

**Alternatives considered:** Treat imported documentation as truth; use majority agreement; let an administrator overwrite competing accounts; or let AI reconcile sources automatically. These alternatives were rejected because they hide uncertainty and destroy provenance.

**Consequences and deferrals:** Future capture requires source, scope, time, contributor, reconciliation, consensus, and approval semantics. Authentication, authorization, observations, approval workflow, and version history remain deferred until those boundaries are designed.

### LAD-003 — Build one product with isolated organizational and environment state

**Decision:** Lotura is one continuously evolving application. Organizations and environments share domain language and features while isolating databases, credentials, configuration, data, and access.

**Why:** Real-world learning should improve the common platform. Customer-specific forks would fragment the product, duplicate maintenance, and encode one institution’s habits as universal logic.

**Alternatives considered:** A separate application for the JU Pilot; customer-specific branches; feature forks; or a shared database across environments. These were rejected because they weaken portability, safety, and product coherence.

**Consequences and deferrals:** Organization-specific information belongs in isolated data and configuration. The JU Pilot is a learning and deployment context, not a separate edition. Cross-environment data sharing and customer-specific conditional product logic are not permitted by default.

### LAD-004 — Version 0.1 uses a deliberately small operating-model schema

**Decision:** Version 0.1 contains Organization, User, Membership, Role, RoleAssignment, Process, ProcessStep, Exception, System, ProcessSystem, and ProcessDependency.

**Why:** This is the minimum useful structure for ownership, current coverage, ordered work, alternate paths, software context, and interconnected processes without reducing Lotura to an SOP product.

**Alternatives considered:** A Process-and-Steps-only schema was rejected as too documentation-centric. Adding observations, versions, approvals, improvements, workflow execution, comments, notifications, tasks, AI records, or enterprise hierarchy immediately was rejected as premature.

**Consequences and deferrals:** Version 0.1 can represent a current operating model but not authoritative version history, workflow execution, workload, capacity, approval, improvement outcomes, or rich organizational structure. Those limitations must remain visible rather than inferred away.

### LAD-005 — Roles are durable; people participate through time-bounded assignments

**Decision:** Ownership belongs to organizational Roles, while Users participate in an Organization through Memberships and are connected to Roles through first-class RoleAssignments.

RoleAssignment records assignment type (`permanent`, `interim`, `acting`, or `backup`), status, effective dates, optional reason, and history-preserving timestamps. Version 0.1 permits one status-active primary assignment (`permanent`, `interim`, or `acting`) per Role and permits multiple active backup assignments.

**Why:** Roles outlive people. A direct person field on Role would conflate durable accountability with temporary staffing and could not represent acting or backup coverage responsibly.

**Alternatives considered:** `Role.currentAssigneeMembershipId`; Process ownership by User; a many-to-many join without assignment type or effective dates; or overwriting an assignee in place. These were rejected because they erase assignment meaning and history.

**Consequences and deferrals:** Current coverage is interpreted using assignment status and the visible as-of time. PostgreSQL enforces one status-active primary through a partial unique index, but a time-dependent “current” rule cannot safely rely on `current_timestamp` in an immutable partial-index predicate; effective-date interpretation remains deterministic application logic. Workload, capacity, skills, schedules, and assignment approval are deferred.

### LAD-006 — Process ownership and step responsibility have explicit semantics

**Decision:** `Process.ownerRoleId` may be null while the Process is `draft`, but it is required for `active` and `archived` Processes. A null `ProcessStep.responsibleRoleId` inherits the Process owner; it is not automatically unassigned.

FLOW must distinguish explicit responsibility, inherited responsibility, unclear responsibility, unstaffed responsibility, and retired responsibility.

**Why:** Draft capture must tolerate incomplete ownership, while an active operational definition requires accountable ownership. Inherited step responsibility avoids repetitive data without hiding coverage state.

**Alternatives considered:** Require ownership from initial draft creation; permit active ownerless processes; treat every null step role as a gap; or assign steps directly to Users. Each alternative either blocks useful drafting or misrepresents organizational responsibility.

**Consequences and deferrals:** The database enforces the draft/owner rule. The richer responsibility categories require analysis of Process status, Role status, assignment status, and effective dates. Per-step people, workload, delegation, and execution are deferred.

### LAD-007 — Exceptions, systems, and process dependencies are first-class

**Decision:** Alternate paths are represented as Exceptions, enabling technology as Systems connected through ProcessSystem, and process-to-process relationships as directed ProcessDependencies with `sourceProcessId`, `targetProcessId`, and dependency type.

Exceptions may be process-level or scoped to a ProcessStep and have active/inactive retirement status. Roles and Systems also have active/inactive status. A ProcessDependency cannot reference the same Process at both ends, and duplicate source/target/type relationships are prohibited.

**Why:** Embedding exceptions, software, and dependencies only in prose would prevent reliable exploration and impact review. Directional source/target names avoid assumptions that every dependency is simply “upstream” or “downstream.”

**Alternatives considered:** Free-text fields on Process; generic untyped links; upstream/downstream column names; or separate ad hoc relationship formats per feature. These were rejected as ambiguous or difficult to analyze consistently.

**Consequences and deferrals:** Version 0.1 dependency types are deliberately bounded, while graph cycles other than self-reference remain valid because real operating models may contain feedback loops. Detailed system integrations, data flows, control requirements, exception frequency, and dependency criticality are deferred.

### LAD-008 — Organization boundaries are enforced in storage and reads

**Decision:** Organization-owned entities carry `organizationId`. Composite foreign keys enforce same-organization RoleAssignments, process ownership, step responsibility, Exceptions, ProcessSystems, and ProcessDependencies. Live reads also apply `LOTURA_ORGANIZATION_ID` to every organization-owned query, and Users are reached only through Memberships in that Organization.

**Why:** Application-only scoping is too fragile for multi-tenant operational knowledge. Cross-organization relationships would create both data leakage and false operating-model conclusions.

**Alternatives considered:** Trust route parameters; filter only the top-level Process query; infer organization transitively without constraints; or use one schema/database per Organization immediately. Application-only filtering was rejected. Per-organization physical databases and PostgreSQL row-level security remain possible future options but require authentication and operational design.

**Consequences and deferrals:** Version 0.1 has no client-controlled organization selector. Until authentication exists, one deployment reads one server-configured Organization. Future authorization must narrow access further without weakening database and query scoping.

### LAD-009 — Retirement and protected deletion preserve institutional knowledge

**Decision:** Roles, Systems, Memberships, and Exceptions can be made inactive, and Processes can be archived, so historical relationships remain without deletion.

Deleting an entire Process may cascade to its Steps, Exceptions, and ProcessSystem rows. Deleting a ProcessStep with a scoped Exception is restricted until the Exception is reassigned, converted to process-level, or explicitly deleted. Referenced Roles, Memberships, Systems, and Processes involved in dependencies are protected by restrictive foreign keys.

**Why:** Restructuring should not silently erase exception knowledge, assignments, dependencies, or historical context. Whole-process deletion remains distinct from restructuring one part of a process.

**Alternatives considered:** Cascade all child relationships; soft-delete every record from the start; or prohibit every deletion. Universal cascade was rejected as unsafe, while universal soft deletion or prohibition would add lifecycle complexity beyond Version 0.1.

**Consequences and deferrals:** Version 0.1 supports retirement but not complete historical versions, legal holds, retention policy, restoration, or an approval workflow for destructive actions. Those require later governance design.

### LAD-010 — SQL names are plural and unambiguous; TypeScript entities remain singular

**Decision:** Physical tables use names such as `users`, `roles`, `systems`, and `processes`, while TypeScript exports retain singular entity names such as `user`, `role`, `system`, and `process`.

**Why:** Plural physical names avoid ambiguous singular SQL identifiers and make database inspection clearer, while singular TypeScript identifiers match an entity declaration naturally.

**Alternatives considered:** Singular names everywhere or plural names in both SQL and TypeScript. Neither offered the same clarity in its respective context.

**Consequences and deferrals:** Future schema work should follow the same convention unless a new approved decision supersedes it. Renaming existing tables solely for style is not justified.

### LAD-011 — Explorer and FLOW begin as read-only product experiences

**Decision:** Process Explorer and FLOW Analysis browse and interpret the current operating model without editing, authentication, workflow execution, notifications, AI, or persisted findings.

**Why:** The product first needed to prove that its operating model was useful and understandable before introducing mutation, identity, or stewardship complexity. A read-only boundary also made the live database path easier to secure and validate.

**Alternatives considered:** Launch capture and editing with Explorer; persist FLOW findings; or add workflow execution immediately. These were rejected because they conflate interpretation with authority and expand risk before the domain is ready.

**Consequences and deferrals:** Current product requests do not write to the database. Editing, authentication, approvals, tasks, comments, notifications, and workflow execution require separately approved designs.

### LAD-012 — FLOW uses deterministic, reproducible, explainable analysis

**Decision:** FLOW Analysis functions remain pure, organization-scoped, evidence-based, and reproducible at a visible as-of timestamp. Findings expose supporting facts and a plain-language “How this was determined” explanation. Arbitrary composite scores are avoided.

**Why:** Users need to inspect and challenge organizational conclusions. Deterministic rules create a reliable foundation before probabilistic interpretation or AI assistance.

**Alternatives considered:** Black-box health scores; model-generated findings; stored analysis results; or rules that vary invisibly by request. These were rejected because they obscure evidence, become stale, or overstate certainty.

**Consequences and deferrals:** FLOW currently interprets only the Version 0.1 model. Predictive analysis, benchmarking, probabilistic insight, and persisted findings remain deferred until evidence, validation, and lifecycle requirements are understood.

### LAD-013 — Impact language and review-set boundaries must not overstate evidence

**Decision:** The interface distinguishes **direct impact**, **potential indirect impact**, and **review recommended**.

For system impact, Processes directly connected through ProcessSystem are directly affected; propagated dependency relationships are potential indirect impact. For process-change analysis, directly linked Systems belong in the review set, while Systems merely owned by participating Roles are contextual and not assumed affected.

**Why:** Graph connectivity identifies relationships worth reviewing but does not prove operational failure, causation, mandatory change, or a future outcome.

**Alternatives considered:** Treat all connected nodes as affected; assign risk scores; or omit indirect relationships. The first two overstate evidence, while the last hides valuable review context.

**Consequences and deferrals:** Future analysis must preserve relationship paths and explain limitations. Criticality, probability, severity, financial impact, and predicted outcomes remain deferred until Lotura has defensible evidence.

### LAD-014 — Fixture and Neon sources share one normalized operating-model projection

**Decision:** The fictional `process-explorer.json` fixture remains available for automated tests and explicit demo use. A server-only Neon adapter loads the same Version 0.1 entities and maps them into the existing `ProcessExplorerSeed` projection. Explorer and unchanged pure FLOW functions consume that normalized snapshot.

**Why:** One projection prevents UI and analysis logic from diverging by data source. Keeping a fictional fixture makes tests reproducible and allows a safe, clearly labelled demonstration without a database.

**Alternatives considered:** Replace the fixture entirely; let components query Neon directly; create separate demo/live analysis paths; or rewrite FLOW around database queries. These were rejected because they reduce testability, expose credentials, or duplicate product logic.

**Consequences and deferrals:** The adapter is intentionally read-only and loads one Organization. Shared result caching, client-side database access, incremental synchronization, real-time subscriptions, and multi-Organization selection are deferred.

### LAD-015 — Runtime database access is server-only and least-privileged

**Decision:** `DATABASE_URL` is a server-only pooled runtime credential intended to use a dedicated PostgreSQL Role limited to `CONNECT`, schema `USAGE`, and `SELECT` on Lotura tables. `DATABASE_URL_UNPOOLED` is an owner/migration credential for explicit administrative commands only. Runtime code never substitutes the administrative credential when the runtime credential is missing.

**Why:** Application code containing only reads is not a sufficient security boundary. Database privileges must independently prevent runtime mutation, and credentials must never reach the client.

**Alternatives considered:** Use the owner credential everywhere; fall back automatically to `DATABASE_URL_UNPOOLED`; expose Neon access to the browser; or rely only on code review to prevent writes. These were rejected as unnecessary privilege and data-leakage risk.

**Consequences and deferrals:** Local Development may temporarily use an existing development connection while a dedicated role is established, but deployed runtime configuration should not. Credential rotation, secret management, per-user database identity, and broader authorization remain infrastructure and security work requiring separate approval.

### LAD-016 — Live reads use one consistent snapshot and fail closed

**Decision:** The Neon adapter issues all operating-model reads in one Neon HTTP batch configured as a read-only, repeatable-read transaction. PostgreSQL `transaction_timestamp()` supplies the shared visible as-of time for Explorer and FLOW. Unknown Organizations, invalid configuration, invalid data, and non-fallback errors fail closed with a sanitized user-facing state. No shared result cache is used.

**Why:** A multi-query operating model must not combine facts from different database moments. Fail-closed behavior and sanitized errors prevent accidental cross-scope results and exposure of SQL or connection details.

**Alternatives considered:** Independent request timestamps; separate Explorer and FLOW reads; partial results; stale shared caching; or returning raw database errors. These were rejected as inconsistent, misleading, or unsafe.

**Consequences and deferrals:** Each live request pays for a fresh snapshot. Shared caching, invalidation, partial availability, and historical as-of queries are deferred until their consistency and isolation semantics are explicit.

### LAD-017 — Demo fallback is explicit, labelled, and guarded in Production

**Decision:** Runtime source modes are `demo`, `neon`, and `neon-with-demo-fallback`. Development defaults to demo; Preview and Production default to Neon. Fallback occurs only for recognized transient connection failures. Production rejects fallback configuration unless the separate server-only `LOTURA_ALLOW_DEMO_FALLBACK=true` opt-in is present. The UI explicitly states when fictional demo data is shown.

**Why:** Silent fallback can make users believe fictional data is live organizational truth. Production needs a stronger guard because availability behavior must be intentional.

**Alternatives considered:** Always fall back; never retain demo mode; permit a client-side mode switch; or fall back for missing configuration and unknown Organizations. These were rejected because they conceal errors, weaken scoping, or expand exposure.

**Consequences and deferrals:** Preview and Development may opt into fallback normally, but no mode may display fictional data as live. More sophisticated availability, retry, and incident policies remain deferred.

### LAD-018 — Database changes use forward-only, reviewed migrations and an approved migrator

**Decision:** Migration `0000` is immutable. Version 0.1 operating-model changes were introduced through forward-only migrations `0001`, `0002`, and `0003` in dependency-safe order. Generated SQL is reviewed manually and the full chain is tested in an isolated Neon branch before shared use.

The approved command is `npm run db:migrate`, which uses Drizzle ORM’s Neon HTTP migrator with `DATABASE_URL_UNPOOLED` and verifies that local migrations appear in the journal. `npx drizzle-kit migrate` is not approved for this repository because version 0.31.10 exited successfully during isolated testing without applying or recording the committed chain.

**Why:** Forward-only history protects reproducibility. The repository needs a migration command whose observed behavior is verified rather than trusting a successful exit code.

**Alternatives considered:** Modify `0000`; edit shared databases manually; run migrations during Vercel builds; use `drizzle-kit migrate` despite the observed no-op; or test first on a shared branch. These were rejected as unreproducible or unsafe.

**Consequences and deferrals:** Migration application is a separate, explicitly approved release action and is never coupled to application compilation. Rollback strategy must be designed per future change; destructive down migrations are not assumed.

### LAD-019 — Fictional seeding is an explicit isolated provisioning action

**Decision:** The fictional Process Explorer seed can populate a new isolated development database only after migrations. The seed runs transactionally, refuses a non-empty application database, and must be invoked exactly and explicitly through the approved seed command. It is never run by application startup, build, deployment, or runtime reads.

**Why:** Seed data supports safe demo and end-to-end validation, but an automatic or non-empty-database seed could contaminate real organizational information.

**Alternatives considered:** Seed on deployment; upsert on every run; use real institutional data for demos; or share the retained migration-test branch. These were rejected because they weaken isolation and repeatability.

**Consequences and deferrals:** Seed execution requires separate approval and a fresh isolated target. The retained migration-test branch remains separate evidence. Customer onboarding, imports, and sample-data lifecycle are deferred.

### LAD-020 — Development, JU Pilot, and Demo/Sandbox are isolated contexts of one application

**Decision:** Lotura’s environment strategy consists of:

- **Development** for engineering, testing, and fictional or explicitly approved development data;
- **JU Pilot** for a private authenticated pilot using approved institutional process information; and
- **Demo/Sandbox** as a blank customer workspace with an optional clearly labelled fictional sample Organization.

Each context uses isolated databases, credentials, configuration, and access while sharing the application and feature set.

**Why:** Isolation protects institutional information and prevents demo or engineering behavior from becoming production truth. A shared application ensures pilot learning improves the product rather than creating a custom fork.

**Alternatives considered:** Treat JU as a separate product; use Production/Preview/Development as interchangeable data contexts; copy credentials across environments; or begin Demo/Sandbox with institutional data. These were rejected as unsafe or strategically fragmenting.

**Consequences and deferrals:** Production and Preview must remain untouched by Development provisioning unless separately approved. Authentication and authorization are prerequisites for the JU Pilot. Detailed promotion, retention, and access administration are deferred.

### LAD-021 — Process Acquisition preserves sources before producing approved knowledge

**Decision:** The future entry point should offer **Interview me**, **Upload SOP**, **Upload PDF**, **Upload Visio**, **Upload flowchart**, **Import existing documentation**, **Whiteboard mode**, **AI conversation**, and **Start from scratch** instead of assuming all knowledge begins with “Create Process.”

Every path preserves its source and provenance, creates observations or drafts, and converges on review, conflict detection, reconciliation, approval, versioning, and later observation.

**Why:** Organizational knowledge already lives across people, documents, diagrams, software, and practice. An empty form privileges documentation over discovery and can turn imported structure into unearned truth.

**Alternatives considered:** A single manual form; automatic publication after import; source-specific truth models; or AI-generated processes without evidence links. These were rejected as too narrow or insufficiently accountable.

**Consequences and deferrals:** Acquisition sessions, artifacts, extracted claims, provenance, confidence, consent, security scanning, reconciliation, and approval models remain intentionally deferred until designed. No acquisition entity belongs in Version 0.1 speculatively.

### LAD-022 — Disagreement and conflict are preserved as organizational evidence

**Decision:** Future Conflict Detection should identify disagreements and sequence, owner, system, timing, exception, and terminology conflicts without silently choosing a winner.

> Disagreement is data. Lotura should surface it, not smooth it over.

**Why:** Differences can reveal local variants, transitions, outdated documentation, unclear ownership, missing exceptions, or real contradictions. Erasing them destroys organizational learning.

**Alternatives considered:** Majority rule; latest-source-wins; administrator overwrite; AI reconciliation; or treating every difference as an error. These were rejected because context may make multiple accounts valid and resolution requires accountable judgment.

**Consequences and deferrals:** Future design needs observation identity, comparison scope, conflict lifecycle, source privacy, reconciliation, consensus, accepted divergence, approval, and reopening. Conflict counts must not become employee rankings or health scores.

### LAD-023 — Process version history and improvement history are separate

**Decision:** Process version history records the approved operational definition effective at a point in time. An Improvement records friction, evidence, proposed change, affected Processes and Systems, approval, implementation, expected benefit, measured result, and sustainment. One does not substitute for the other.

Likely future concepts include Improvement, ImprovementProcess, and ImprovementMeasure, but these are not approved Version 0.1 tables.

**Why:** A new process version proves that a definition changed, not that the expected operational result occurred. Improvement requires a traceable learning loop.

**Alternatives considered:** Put improvement fields on Process; treat every version as an improvement; close an improvement when documentation is published; or overwrite the old operating model. These were rejected because they collapse definition, intent, action, and evidence.

**Consequences and deferrals:** FLOW should eventually distinguish current operating model, proposed improvements, completed improvements, and historical operating models. Lifecycle states, affected-System relationships, approvals, measures, repeated observations, and sustainment rules are deferred.

> An improvement is not complete when the new process is documented. It is complete when the result is measured and sustained.

### LAD-024 — Restructuring Intelligence produces review sets, not autonomous decisions

**Decision:** Future “What happens if we…” analysis should examine eliminating or splitting a department, merging teams, outsourcing work, hiring capacity, losing an employee, or changing software by comparing an unchanged baseline with a hypothetical scenario.

It should surface direct impact, potential indirect impact, review recommended, assumptions, missing evidence, and unresolved conflicts. It must not edit the operating model or recommend personnel actions autonomously.

**Why:** The operating model can reveal connected responsibilities and dependencies while a decision is reversible, but it cannot prove workload, cost, human response, legal consequence, or future performance.

**Alternatives considered:** Predict restructuring outcomes; optimize headcount; score roles or employees; or treat all connected records as equally affected. These were rejected as unsupported and potentially harmful.

**Consequences and deferrals:** Scenario identity, baseline version, alternative relationships, authorization, confidentiality, approval, comparison history, implementation links, and measured outcomes remain deferred. Financial, labor, legal, security, and change-management review remain human responsibilities.

### LAD-025 — AI assists discovery and interpretation; humans approve truth and change

**Decision:** AI may help conduct bounded interviews, extract candidate structure, identify possible contradictions, suggest questions, summarize evidence, compare alternatives, and explain deterministic findings. AI may not silently establish truth, resolve conflicts, assign ownership, approve changes, complete improvements, restructure organizations, or act in external operational systems.

**Why:** AI can reduce the effort of working with unstructured organizational knowledge, but generated confidence is not authority or evidence. Human accountability must remain visible.

**Alternatives considered:** AI-first process generation; autonomous reconciliation; automatic publication; model-generated risk scores; or agentic execution. These were rejected or deferred because they weaken provenance, explainability, consent, and authority.

**Consequences and deferrals:** AI output must be attributable, reviewable, correctable, and visually distinct from approved records. Broad AI assistance is deferred until authentication, provenance, governance, evaluation, privacy, and organization-level controls exist.

### LAD-026 — Future concepts do not enter the schema before their lifecycles are designed

**Decision:** New entities and relationships are introduced only when their purpose, lifecycle, evidence, ownership, organization boundary, temporal meaning, authorization, deletion behavior, history, migration sequence, and failure modes are understood and explicitly approved.

**Why:** Premature schema expansion hardens assumptions before the product understands the organizational concept. It creates migration cost and can blur current truth with future possibilities.

**Alternatives considered:** Add nullable placeholders to Version 0.1; create generic JSON records for all future features; or let each feature add isolated tables as needed. These were rejected because they defer domain decisions into ambiguous storage.

**Consequences and deferrals:** Authentication, observations, sources, acquisition, reconciliation, approvals, versions, improvements, measures, scenarios, organizational hierarchy, workload, and AI provenance remain intentionally postponed—not forgotten. Each requires a new or superseding decision before schema or infrastructure work begins.

### LAD-027 — Use a calm, neutral, typography-led product design system

**Decision:** Lotura uses one reusable visual language defined in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). The interface is neutral, spacious, typography-led, and restrained, with one evergreen accent and semantic color used only to communicate state. Desktop uses a simple left sidebar; existing mobile and tablet experiences remain usable through compact navigation and responsive stacking.

Explorer and FLOW reuse the same buttons, inputs, selects, badges, chips, alerts, cards, panels, disclosures, tables, and search patterns. FLOW presents concise findings and evidence rather than BI-dashboard imagery or arbitrary scores.

**Why:** Lotura is professional software that may remain open all day. A quiet and consistent system reduces cognitive load, protects evidence hierarchy, and lets an operating model feel like an organizational blueprint rather than CRM or marketing software.

**Alternatives considered:** Feature-specific styling; a colorful dashboard-first identity; dense enterprise chrome; decorative gradients and shadows; or adopting a third-party component library before Lotura’s interaction language is defined. These were rejected because they fragment meaning, add unnecessary visual weight, or outsource foundational product decisions.

**Consequences and deferrals:** New interface work should compose the shared primitives and tokens rather than introduce local visual dialects. Future Home and Process Capture patterns are documented but not authorized by this decision. Dark mode, data visualization, theming, and a separately packaged component library remain deferred until real product needs justify them.

### LAD-028 — Organization appearance is constrained configuration layered over Lotura

**Decision:** Home, Explorer, and FLOW consume one server-resolved `WorkspaceConfiguration`. For the Version 0.2 Orientation & Comprehension Pass, the resolver is strictly non-persistent: the display name comes from `Organization.name`, the logo is a derived monogram with a Lotura-mark fallback, and the accent is Lotura evergreen.

Workspace-brand CSS tokens are separate from Lotura-controlled semantic status and evidence tokens. Organization identity may not override error, warning, success, information, direct-impact, potential-indirect-impact, or review-recommended treatment. Accessibility contrast and Lotura’s layout, interaction patterns, language, and product behavior remain protected.

> Configurable, not bespoke.

**Why:** Organization identity helps people understand whose operating model they are viewing, but unrestricted theming would weaken accessibility, evidence consistency, and product coherence. A shared resolver gives every surface the same identity without inventing persistence before its lifecycle and authorization are approved.

**Alternatives considered:** Environment-driven branding, customer-specific conditionals, route-local presentation values, unrestricted theming, and immediate database persistence with a broad Settings product. These were rejected because they create hidden configuration, divergent product logic, inconsistent surfaces, or unapproved writes and schema.

**Consequences and deferrals:** A future separately approved Organization migration may add `displayName`, `logoUrl`, and `accentColor` as the smallest persistence change. An appearance Settings surface, authorization, upload/storage policy, contrast enforcement on writes, audit history, and wider Organization settings remain deferred. The Version 0.2 implementation introduces no schema, migration, environment value, database write, or customer-specific source.

### LAD-029 — Private workspace access uses a replaceable provider boundary

**Decision:** Lotura supports a generic `public` access mode for the fictional demo and a temporary-password provider for preparation toward a tightly controlled private workspace. A deployed Neon workspace may not default to public access. Temporary credentials are verified with Argon2id in server-only Node code, while a short-lived signed session is checked optimistically by Proxy and authoritatively immediately before the operating-model loader.

Proxy may validate a signed session and route a request, but it may not import the password verifier, initialize database code, or load the operating model. The data-access check remains the security boundary. Temporary sessions contain no password or operating-model data, expire after eight hours, and can be invalidated by rotating the server-only signing secret.

**Why:** A private pilot needs a small fail-closed access boundary without coupling application identity to operating-model Users or Memberships. Separating the provider from access enforcement permits a later SAML or OpenID Connect provider to replace temporary credentials without redesigning Processes, Roles, Assignments, or organization scoping.

**Alternatives considered:** Use operating-model Users as login accounts; protect only through Proxy; rely only on a platform password; create database sessions and a new schema; or expose a Neon workspace until SSO exists. These were rejected because they conflate identity domains, leave data checks too far from the source, require premature persistence, or create unacceptable exposure.

**Consequences and deferrals:** Authentication changes session-cookie state only; it does not permit operating-model writes. The temporary provider does not authorize a private custom domain. Durable distributed login throttling or approved deployment protection, real credential creation, dedicated infrastructure, access review, incident response, and end-to-end security verification remain mandatory before exposure. SSO, multiple users, authorization roles, provisioning, recovery, MFA, and authentication audit persistence remain deferred.

### LAD-030 — Preparation state and sanitization remain explicit outside Version 0.1

**Decision:** Private snapshot preparation distinguishes `sanitized-working-draft`, `validated`, and `approved-for-pilot`. Each record retains source type, validator Role and date where applicable, open conflicts, and preparation state in an off-repository register. The visible snapshot uses the least-mature included state.

Preparation state is not `Process.status` and is not persisted in Version 0.1. A structural validator may reject unknown fields, prohibited structures, invalid references, constraint violations, incomplete preparation coverage, and missing human-review attestation. It may not claim that arbitrary free text has been proven safe or sanitized.

**Why:** Early visualization is useful before full institutional approval, but presenting incomplete observations as operational truth would violate Lotura’s evidence principles. Deterministic validation can enforce shape and known rules; meaning, classification, and contextual sensitivity still require accountable human judgment.

**Alternatives considered:** Require full institutional approval before visualization; persist preparation state on Process; treat `draft` as an epistemic state; let a validator certify sanitization; or commit private intake files as fixtures. These were rejected because they slow learning unnecessarily, collapse distinct lifecycles, overstate automation, or weaken confidentiality.

**Consequences and deferrals:** The validation-only format performs no database import or write. Private intake remains outside Git and requires human review. Observations, provenance, disagreements, reconciliation, approvals, version history, retention, and per-record confidentiality still require a future domain decision before persistence.

### LAD-031 — Dedicated deployments may supply constrained workspace appearance

**Decision:** A dedicated deployment may provide a display name, scope label, knowledge-state label, logo or monogram, and accent through validated server-only configuration. `Organization.name`, the derived monogram, and Lotura evergreen remain defaults. All surfaces consume the same `WorkspaceConfiguration`, and no component branches on an organization or customer name.

This decision extends LAD-028 by allowing an explicit deployment configuration source for isolated private workspaces. It does not permit hidden customer behavior, unrestricted theming, database persistence, or a Settings surface.

**Why:** A private workspace needs recognizable identity before appearance persistence and administration are justified. A bounded resolver provides that identity without introducing schema changes, writes, or organization-specific product logic.

**Alternatives considered:** Keep every private workspace visually generic; hard-code institutional assets in components; commit customer data and conditions to the repository; or add appearance fields and administration immediately. These were rejected as confusing, bespoke, unsafe, or premature.

**Consequences and deferrals:** Remote logo configuration requires an approved HTTPS asset host. Accent values must pass contrast validation and may not replace semantic or evidence tokens. Persistence, uploads, asset storage, appearance administration, authorization, and audit history remain deferred. No real organization values are committed by this preparation decision.

### LAD-032 — Discovery is an expected outcome of documentation

**Decision:** Lotura should treat missing steps, assumptions, unknowns, validation needs, conflicting observations, ownership ambiguity, undocumented workarounds, and unresolved boundaries discovered during documentation as valuable organizational knowledge. Capture experiences should permit an interview or working draft to pause without manufacturing completeness or resolving uncertainty prematurely.

Future knowledge models and interfaces should distinguish **Known**, **Assumed**, **Unknown**, **Needs validation**, and **Conflicting observations**. These are epistemic states attached to sourced organizational knowledge; they are not substitutes for `Process.status`, approval, version history, or deterministic FLOW findings.

> Document reality first. Improve it second.

> Disagreement is data.

**Why:** Attempting to describe real work is itself a discovery method. Contributors often expose gaps and inconsistencies only when they try to define boundaries, order Steps, identify ownership, or explain handoffs. Forcing a complete answer hides precisely the knowledge Lotura exists to reveal and encourages polished but inaccurate operational records.

**Alternatives considered:** Require every field before saving; collapse uncertainty into free-text notes; let AI infer the most likely answer; treat a working draft as incomplete noise; or require immediate reconciliation during capture. These were rejected because they destroy provenance, overstate certainty, interrupt honest discovery, or silently convert inference into organizational truth.

**Consequences and deferrals:** Future Process Acquisition, guided interviews, observations, conflict detection, reconciliation, and approval should preserve pause/resume state, source, scope, contributor, time, sensitivity, and unresolved questions. The Version 0.1 schema does not represent these knowledge states and is unchanged. A future domain proposal must decide whether they belong to observations, claims, field-level evidence, preparation records, or another explicitly governed model before adding tables or migrations.

### LAD-033 — Structure, responsibility mandates, and human coverage remain distinct

**Decision:** Lotura’s future organizational-structure model must distinguish Person, User, Position, PositionAssignment, PositionReportingRelationship, Operational Role, ResponsibilityHolder, RoleMandate, and RoleCoverage.

A Person is a human represented in the organizational model. A User is an application identity, and a Person does not need to be a Lotura User. A Position is a durable structural seat. PositionAssignment records a Person occupying or covering that seat. PositionReportingRelationship records structural reporting between Positions. The existing `Role` is the durable Operational Role referenced by the operating model. RoleMandate allocates that Role to a ResponsibilityHolder for an effective period, while RoleCoverage records permanent, interim, acting, delegated, or backup Person-level coverage of a specific mandate.

Reporting hierarchy must never imply Process ownership. A Position title must never create or equal an Operational Role. One Position may hold several Operational Roles; an Operational Role may move between Positions without rewriting Process references; and temporary RoleCoverage must not alter PositionAssignment or reporting structure.

For the smallest Position-first Version 0.2 model, Position is the only supported ResponsibilityHolder. `RoleMandate` should reference a Position directly. ResponsibilityHolder remains a domain abstraction rather than a polymorphic table, generic type-and-ID reference, or speculative family of subtype entities. OrganizationUnit, CollectiveBody/Committee, and ExternalOrganization may become holder types only after real requirements and their lifecycles are approved.

The existing `RoleAssignment` remains a valid Version 0.1 construct and is closest to future RoleCoverage, but it links Membership directly to Role and has no RoleMandate. It must be reconciled through Person and an unambiguous effective RoleMandate rather than renamed or silently repurposed. The Version 0.1 partial unique constraint permitting one active primary `RoleAssignment` per Role is not a universal long-term business rule.

**Why:** Real organizational charts contain repeated titles, personnel changes, vacancies, cross-unit and matrix reporting, incomplete relationships, and source-specific inconsistencies. Operational responsibility can move independently of reporting structure and may later be held by committees or external organizations. Collapsing these concepts would cause personnel or structural changes to rewrite operational truth and would make temporary coverage indistinguishable from reorganization.

**Alternatives considered:** Treat every job title as a Role; make Position and Operational Role the same entity; retain a bare Position–Role join; attach a manager directly to a User or Person; infer Process ownership from reporting lines; introduce a polymorphic ResponsibilityHolder table before a second holder kind exists; or keep the organizational chart as an unrelated document. These were rejected because they conflate identity, structure, responsibility, and coverage; weaken referential integrity; add premature abstraction; or disconnect organization structure from the operating model.

**Consequences and deferrals:** The generic proposal is documented in [docs/organization-structure-domain.md](docs/organization-structure-domain.md). The Version 0.1 schema remains unchanged. Person identity reconciliation, OrganizationUnit semantics, PositionAssignment and reporting rules, RoleMandate sharing and scope, RoleCoverage cardinality, the `RoleAssignment` transition, source provenance, cycle prevention, privacy, deletion behavior, migration sequence, import reconciliation, and restructuring-version semantics require explicit approval before implementation.

### LAD-034 — Organization Structure review remains a transient evidence overlay before import

**Decision:** Organization Structure Resolution & Approval v0.1 separates immutable source evidence, reversible browser-session review decisions, and explicit local approval of a reviewed subset as a future import basis. Review decisions reference exact source-row keys and never rewrite parsed workbook evidence. Readiness is recalculated deterministically from evidence and decisions; unresolved blockers prevent local approval, and warnings require an explicit treatment. Local approval states exactly: “Approved for import — local session only. Nothing has been saved or imported.”

The v0.1 review session remains in browser memory. It has no browser storage, server action, route handler, upload or import endpoint, database persistence, telemetry of source values, or export package. Refreshing or closing the tab erases decisions and approval. The authoritative workspace-access check remains server-side before the local preview is rendered.

**Why:** Administrators need to classify ambiguity and establish an explicit proposed import basis without letting either a workbook or a reviewer’s first interpretation silently become organizational truth. A transient layer validates the review model while avoiding premature storage, authorization, retention, audit, and governance decisions. It also keeps evidence separate from interpretation and makes reversal deterministic.

**Alternatives considered:** Mutate parsed rows during review; treat a clean parse as approval; require row-by-row confirmation; add a quality score; provide global resolve-all or approve-all-clean actions; persist decisions in browser storage; build an import endpoint immediately; or store review artifacts in the permanent domain. These were rejected because they obscure provenance, encourage artificial certainty, do not scale, or create unapproved persistence and security boundaries.

**Consequences and deferrals:** The implemented experience groups homogeneous issues, shows impact before applying bulk treatment, preserves external-validation states, and requires an approval attestation. It cannot prove free text is sanitized or authoritative. Real multi-session institutional review will require authenticated encrypted staging or a governed encrypted package, authorization, audit history, retention, concurrency, and source-value access controls. Stable identity reconciliation, Organization Unit semantics, approval authority, staged-package lifecycle, importer transaction boundaries, and schema implications remain unresolved. [docs/organization-structure-resolution.md](docs/organization-structure-resolution.md) records the current boundary. No schema, migration, database, or importer change is approved.

### LAD-035 — Governance is multidimensional and Stewardship is distinct

**Decision:** Lotura models governance through independent dimensions of visibility, contribution, approval, analysis, administration, and stewardship. Organizational hierarchy and operational responsibility provide context but do not automatically grant authority in any of those dimensions.

Stewardship is accountable care for a defined body of organizational knowledge. A Steward is not necessarily the manager, Process Owner, system administrator, organizational owner, or current performer. Future Stewardship may apply to Organization Units, Processes, Operational Roles, Systems, and Policies.

The first product vocabulary includes four generic profiles: Workspace Administrator, Contributor, Manager / Approver, and Leadership / Organizational Analyst. These are understandable profiles rather than one ascending permission hierarchy. Leadership does not imply Workspace Administration; Manager status does not imply approval; and Workspace Administration does not imply Process ownership. Every administrative change remains scoped and auditable.

Most contributors should suggest attributable updates rather than directly overwrite approved knowledge. Future approval routing may recommend additional reviewers from connected Processes, Roles, Units, Systems, and dependencies, but connectivity remains evidence for review rather than proof of mandatory authority.

**Why:** Organizational authority is multidimensional in real institutions. Collapsing it into a single user-role hierarchy would make reporting managers automatic approvers, make executives automatic administrators, and make system configuration indistinguishable from responsibility for organizational knowledge. Stewardship gives Lotura an explicit model for maintaining knowledge after initial documentation.

**Alternatives considered:** One ascending role hierarchy; infer approvers from reporting relationships; equate Process ownership with approval; let Workspace Administrators approve or overwrite all knowledge; attach permissions directly to job titles; or defer all governance language until SSO. These were rejected because they conflate structure, responsibility, access, approval, analysis, and accountability or hide the product's long-term maintenance model.

**Consequences and deferrals:** The private pilot may communicate governance with honest read-only sections that say Not assigned, Not configured, or Needs validation when no governance evidence exists. It must not invent Stewards or authority from JU titles, reporting lines, assignments, or Process ownership. The complete engine requires separate decisions for identity reconciliation, scoped policies, Steward identity and delegation, effective timing, proposal and approval records, committees, analytical permissions, notifications, audit, retention, and evidence access. This decision authorizes no schema, migration, credential, environment, database, deployment, or JU-specific change. [GOVERNANCE_AND_STEWARDSHIP.md](GOVERNANCE_AND_STEWARDSHIP.md) records the product boundary.

## Intentionally deferred ideas register

The following ideas are recorded so postponement is visible and deliberate.

| Idea | Why deferred | Decision required before implementation |
| --- | --- | --- |
| Full authentication and authorization | A replaceable temporary provider now prepares one private administrator; durable deployment protection and enterprise identity remain unresolved | SSO, multiple identities, provisioning, recovery, roles/permissions, audit, and access review |
| Governance and Stewardship engine | Dimensions, profiles, and Stewardship direction are accepted, but scope, delegation, effective timing, proposals, approval routing, and policy enforcement are unresolved | Governance domain, authorization, workflow, audit, retention, and identity decisions |
| Observations and provenance | Source, contributor, scope, privacy, timing, authority, and retention are not yet represented | Observation lifecycle and evidence-access decision |
| Guided interviews and AI interviewing | Requires consent, approved scope, attribution, disclosure, and review | Acquisition, participant privacy, AI provenance, and authorization decisions |
| Uploads, imports, Visio/PDF/flowchart parsing | Requires malware handling, source permissions, artifact retention, provenance, and conflict treatment | Artifact architecture, storage, security, and extraction decision |
| Whiteboard and collaborative capture | Draft contribution, authorship, reconciliation, and conversion to structured knowledge are undefined | Collaboration, observation, and approval decision |
| Conflict detection and consensus | Conflicts need identity, scope, lifecycle, privacy, and human resolution | Conflict and reconciliation schema decision |
| Editing and approval workflow | Mutation must distinguish draft, proposal, consensus, approval, effective time, and supersession | Write architecture, authorization, audit, and versioning decision |
| Process version history | Snapshot boundary and related operating-model version semantics are unresolved | Temporal/version model and migration decision |
| Continuous Improvement | Initiative lifecycle, affected Systems, measures, repeated observations, and sustainment need design | Improvement domain and evidence decision |
| Restructuring scenarios | Hypothetical state, baseline, sensitive access, and approval boundaries are unresolved | Scenario model, authorization, and retention decision |
| Tasks, comments, and notifications | Could turn Lotura into generic workflow/collaboration software | Product-purpose and lifecycle decision; no implementation by default |
| Workflow execution | Lotura currently interprets work rather than executing it | Explicit product strategy, authorization, integration, and audit decision |
| Shared caching and real-time updates | Snapshot consistency, invalidation, tenant isolation, and staleness semantics are undefined | Read-consistency and cache-isolation decision |
| Multi-Organization selection | Authentication and authorization do not yet exist | Identity, tenant routing, and access-control decision |
| Row-level security or database-per-Organization tenancy | Current composite constraints and scoped reads are sufficient for one configured Organization | Tenancy threat model, operational cost, migration, and recovery decision |
| External integrations and public APIs | Identity matching, scope, data ownership, conflicts, and credentials need governance | Integration security, provenance, and authorization decision |
| Predictive analysis and benchmarking | Longitudinal evidence, comparability, validation, consent, and explainability are insufficient | Evidence-quality, model-risk, privacy, and validation decision |
| Enterprise SSO, provisioning, compliance, and hierarchy | Follows validated multi-user value and stewardship needs | Enterprise identity, policy, audit, retention, and hierarchy decisions |
| Marketplace or extension ecosystem | Permissions, data access, review, support, and version compatibility are immature | Extension security and governance decision |
| Autonomous operational changes | Conflicts permanently with accountable human authority unless product principles are superseded explicitly | Not planned |

## Decision maintenance rules

1. Use the next sequential `LAD-` identifier for a new major decision.
2. Include status, context, decision, rationale, alternatives, consequences, deferrals, and affected prior decisions.
3. Do not edit an earlier rationale merely because current preferences changed.
4. Mark replaced records superseded and link them to the replacing decision.
5. Separate a product-direction decision from authorization to implement it.
6. Treat schema, migration, credential, environment, deployment, database, data-retention, and infrastructure effects as separate approvals when the work requires them.
7. Update the deferred register when an idea advances, changes, or is rejected.
8. Keep decisions general to Lotura; do not encode one Organization’s custom operating behavior as platform architecture.

## Current implementation boundary

The implemented baseline remains Version 0.1: a read-only Process Explorer and deterministic FLOW Analysis over the approved operating-model schema, backed by either a fictional fixture or a server-only, Organization-scoped Neon snapshot. Generic temporary authentication, constrained deployment appearance, and validation-only snapshot preparation are code readiness only; they do not authorize or create a private deployment.

Creating this register does not approve or implement any deferred capability and does not change code, schema, migrations, databases, credentials, environments, deployments, or infrastructure.
