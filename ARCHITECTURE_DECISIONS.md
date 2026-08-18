# Lotura Architecture Decisions

## Purpose

This document is the authoritative register of Lotura’s major product and architecture decisions as of August 11, 2026. It records what was decided, why it was decided, alternatives considered, consequences, and ideas intentionally deferred.

It complements, rather than replaces:

- [PRODUCT_PRINCIPLES.md](PRODUCT_PRINCIPLES.md), which defines the governing doctrine;
- [PRODUCT_VISION.md](PRODUCT_VISION.md), which defines the enduring direction;
- [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md), which sequences product outcomes;
- [PROCESS_ACQUISITION.md](PROCESS_ACQUISITION.md), which defines future knowledge-entry paths;
- [CONFLICT_DETECTION.md](CONFLICT_DETECTION.md), which defines how disagreement should be preserved and reconciled;
- [RESTRUCTURING_INTELLIGENCE.md](RESTRUCTURING_INTELLIGENCE.md), which defines future scenario analysis;
- [GOVERNANCE_AND_STEWARDSHIP.md](GOVERNANCE_AND_STEWARDSHIP.md), which defines governance dimensions, profiles, and stewardship direction;
- [docs/WORKSPACE_STUDIO.md](docs/WORKSPACE_STUDIO.md), which defines the governed digital-twin authoring experience and its first implementation boundary; and
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
| LAD-036 | Operating-model authoring is administrative, draft-first, and historically traceable | Accepted — implementation authorized for Slice A |
| LAD-037 | Workspace Studio is the governed authoring environment for the organizational digital twin | Accepted — product direction |
| LAD-038 | Operational Roles have immutable identity and first-class responsibility history | Accepted — implementation authorized for Responsibility Builder v0.1 |
| LAD-039 | Duplicate Organization Units merge into one surviving identity without erasing evidence | Accepted — implementation authorized for Organization Unit Merge v0.1 |
| LAD-040 | Process Steps have immutable identity and explicit authoring history | Accepted — implementation authorized for Step Builder v0.1 |
| LAD-041 | Technology and Exceptions use immutable identity and explicit operating-model history | Accepted — implementation authorized for Technology & Exceptions Builder v0.1 |
| LAD-042 | Guided interviews preserve immutable source observations before canonical change | Accepted — implementation authorized for Guided Interview Foundation v0.1 |
| LAD-043 | Deterministic Discovery review signals prompt human review without interpreting truth | Accepted — implementation authorized for Discovery Review Signals v0.1 |
| LAD-044 | Discovery comparison shows current documentation beside interview notes without proposing change | Accepted — implementation authorized for Discovery Reconciliation Preview v0.1 |
| LAD-045 | Human reconciliation creates a proposed-update package without changing the documented Process | Accepted — implementation authorized for Discovery Proposed Update v0.1 |
| LAD-046 | The Organizational Knowledge Lifecycle preserves evidence, interpretation, proposal, approval, and the operating model as separate layers | Accepted — product direction |
| LAD-047 | Process Family membership, Process composition, and Process dependency are distinct relationships | Accepted — product direction |
| LAD-048 | Reference Model differences create review questions, not automatic conclusions | Accepted — product direction |
| LAD-049 | Structured proposed changes are typed human mappings, not approval or Process mutation | Accepted — implementation authorized for Structured Proposed Changes v0.1, Slice 1 |
| LAD-050 | Structured proposed-change mappings use explicit typed operating-model targets | Accepted — implementation authorized for Structured Proposed Changes v0.1, Slice 2 |
| LAD-051 | Discovery may conclude with a durable Knowledge Outcome without producing an operating-model change | Accepted — implementation authorized for Knowledge Outcomes v0.1 |
| LAD-052 | Proposal review authorizes exact proposed items without changing the operating model | Accepted — implementation authorized for Proposal Review & Governance v0.1 |
| LAD-053 | Approved proposed items create one immutable Process version through a separate atomic application boundary | Accepted — generic implementation complete and isolated verification passed |
| LAD-054 | Removing a populated Organization Unit moves its direct contents before retiring the Unit | Accepted — generic implementation complete and isolated verification passed |

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

### LAD-036 — Operating-model authoring is administrative, draft-first, and historically traceable

**Status:** Accepted — implementation authorized for Slice A.

**Context:** Lotura now has an authenticated private-workspace boundary, a dedicated Process-write credential, a draft-first manual acquisition path, and an append-only pattern for structural administration. The operating-model schema can store Process definition and ownership, but Processes do not have immutable cross-system identity, canonical Process changes are not audited, and the existing Process Acquisition capability is deliberately insert-only. Direct SQL or unaudited updates would make organizational responsibility easy to change without preserving who changed it, why, or what preceded it.

**Decision:** Operating Model Authoring is a generic Workspace Administrator capability for an authenticated, single-Organization Neon workspace. Public fixture/demo workspaces remain read-only. Authoring is disabled by default and must use the dedicated server-only Process administration credential; it may not reuse or fall back to the read-only runtime, structural administration, owner, or migration credential.

Every Process receives an immutable random UUID `stableKey` in addition to its existing database identity. Existing routes, fixture keys, dependencies, and external references continue using their current identifiers until a separate routing decision is reviewed. The first authoring slice permits an administrator to maintain Process name and purpose and to explicitly assign, change, or clear the Owner Operational Role under the existing draft ownership rule. Owner selection may display Position mandate and current RoleCoverage context, but Position, Person, title, reporting hierarchy, and coverage never infer Process ownership.

Clearing the Owner Role is permitted only while a Process is a Draft. An active or archived Process represents work that is current or retained as an institutional record, so allowing it to become ownerless would knowingly weaken accountability and contradict the existing activation constraint. An administrator must return to an explicitly governed lifecycle transition before ownership can be unresolved; owner clearing is therefore product and governance behavior, not an incidental form restriction.

Every successful canonical Process mutation and its `operating_model_changes` record occur atomically with compare-and-set revision protection. The ledger is append-only from both application privilege and database-trigger boundaries and records Organization, immutable Process identity, entity type, action, before and after state, change kind, reason, effective time, actor, and transaction time. This ledger explains changes; it is not an approved Process version and does not replace the future version lifecycle in LAD-023.

The recorded actor is the authenticated Lotura application identity at the time of the change. It is deliberately not derived from or coupled to a Person, Position, Membership, Role Mandate, Role Coverage, or current organizational assignment. Future identity reconciliation may add separately governed references without rewriting historical actor evidence.

Process lifecycle status and knowledge/approval state remain distinct. A canonical Process may remain visibly a Working draft after ownership is assigned. `draft`, `active`, and `archived` must not be presented as evidence of institutional approval. Detailed Known, Assumed, Unknown, Needs validation, and Conflicting observations states remain deferred under LAD-032.

**Why:** Administrators need to maintain the connected operating model without exposing database concepts or weakening its trust boundary. Immutable Process identity, explicit responsibility selection, least-privilege writes, stale-write rejection, and atomic history provide a durable foundation that later Step, System, Exception, and dependency authoring can reuse. Keeping audit history separate from approved versions avoids manufacturing historical truth from administrative events.

**Alternatives considered:** Update `owner_role_id` directly; reuse Organization Structure history; use the Process database ID as durable external identity; treat Position title or RoleCoverage as ownership; broaden the structural administrator credential; use application logs as history; or implement full Process versioning and approval now. These were rejected because they lose provenance, conflate domains, weaken least privilege, infer responsibility, or introduce lifecycle concepts beyond the approved milestone. A no-schema option cannot provide immutable Process identity and database-enforced append-only history.

**Affected decisions:** This decision extends LAD-011 for authenticated private authoring while preserving the public read-only experience. It follows LAD-006 through LAD-010, LAD-015, LAD-018, LAD-020, LAD-021, LAD-023, LAD-026, LAD-029, LAD-032, LAD-033, and LAD-035. It does not supersede any prior decision.

**Consequences and deferrals:** Slice A adds only Process identity, definition/ownership maintenance, Role mandate and coverage context, stale-write protection, and operating-model change history. Step, System, Exception, and dependency mutation remain later slices under this direction. System creation, hard deletion, Contributor and approval workflows, Stewardship assignment, field-level evidence, approved Process versions, AI interviews, and FLOW interpretation of RoleCoverage remain intentionally deferred. Process Detail may display current RoleCoverage while FLOW continues its Version 0.1 RoleAssignment interpretation; no duplicate legacy RoleAssignment may be manufactured to conceal that limitation.

The `operating_model_change_action` enum is intentionally limited to the three canonical actions implemented in Slice A: `create_draft`, `update_definition`, and `change_owner`. Later Step, System, Exception, and dependency actions must be introduced through reviewed forward-only enum expansion and corresponding privilege/history changes. They must not be overloaded into a Slice A action merely to avoid a migration.

### LAD-037 — Workspace Studio is the governed authoring environment for the organizational digital twin

**Status:** Accepted — product direction.

**Context:** Lotura now has separate, safe capabilities for exploring
Organization Structure, interpreting the operating model, maintaining
canonical structure, acquiring a Draft Process, and authoring the first Process
facts. Presenting those write capabilities as “Administration” understates the
product and risks making the experience feel like a collection of settings and
database maintenance forms. At the same time, combining them carelessly could
create one overly broad credential, audit ledger, or authority profile.

**Decision:** Workspace Studio is the governed authoring environment in which
authorized people build and maintain Lotura's organizational digital twin. The
digital twin is a living, evidence-based representation of structure,
responsibility, work, technology, exceptions, dependencies, knowledge, and
change. It is not automatically complete, institutionally approved, or
real-time.

Workspace Studio unifies the product experience, not the underlying authority.
Organization Structure, operating-model authoring, future catalog maintenance,
workspace appearance, governance, and Discovery retain explicitly reviewed
permissions, dedicated server-only credential boundaries, organization scope,
validation, stale-write protection, and domain-appropriate append-only
history. Studio must not introduce a universal database credential or make
Workspace Administrator equivalent to Process Owner, Steward, approver,
manager, or analyst.

Organization, Explorer, Process Detail, and FLOW remain understanding
surfaces. Studio becomes the authorized maintenance surface. Read pages may
link an authorized person to the corresponding Studio context, but should not
remain mixed browse/edit experiences. Public fixture/demo workspaces expose no
Studio navigation, routes, controls, or write configuration.

The Studio information architecture is organized around Organization,
Responsibilities, Processes, Technology, Knowledge, Governance, Discovery,
and Activity. Technology is an umbrella whose first implemented entity remains
System. Discovery is the long-term home for evidence intake, review,
reconciliation, imports, and guided interviews. Activity is a read-only
chronological projection over domain-specific ledgers and does not replace
them or imply causal relationships between events.

Workspace Health uses deterministic inventory facts and explainable review
questions. It must not introduce composite health scores, risk grades,
performance judgments, unsupported validation counts, or invented
documentation-coverage percentages. A future relationship canvas is a focused
comprehension surface, not a free-form diagrammer or canonical editing path.
AI assistance may eventually appear contextually within Studio, but it remains
subject to LAD-002, LAD-021, LAD-022, LAD-025, LAD-032, and separate approval.

The first implementation slice is Organization Builder. It may add the Studio
shell and audited creation of Organizational Units, Positions, People, and
initial Position Assignments while reusing the existing Structure
administration boundary. It does not authorize Operational Role creation,
Process authoring expansion, System mutation, workspace-appearance
persistence, governance writes, imports, AI, or the relationship canvas.

**Why:** The organizational digital twin is the coherent product object Lotura
has been building across structure, operating model, evidence, analysis, and
history. A Studio metaphor communicates intentional construction and
governance better than a settings-oriented Administration metaphor. Preserving
domain boundaries beneath that unified experience keeps least privilege,
history, and organizational truth understandable.

**Alternatives considered:** Retain Administration as a settings-style area;
leave editing scattered across read pages; create a single unrestricted
Workspace Administrator database role; create one replacement global history
table; ship empty Knowledge, Governance, Discovery, or Technology sections;
call the product a real-time digital twin without real-time provenance; or
begin with AI and a relationship canvas before trustworthy authoring exists.
These were rejected because they understate the product, fragment the user
journey, weaken security and traceability, advertise capabilities without
evidence, overstate currency, or place interpretation ahead of a reliable
model.

**Affected decisions:** This decision follows LAD-001 through LAD-003,
LAD-008, LAD-009, LAD-012, LAD-013, LAD-015, LAD-018, LAD-020 through LAD-029,
and LAD-032 through LAD-036. It extends LAD-028's constrained configuration
direction and LAD-036's authoring direction without superseding either. Any
persisted workspace appearance, Operational Role/System stable identity,
history expansion, new credential privilege, or schema change still requires
its own reviewed implementation plan and approval.

**Consequences and deferrals:** The approved product and Slice 1 boundaries are
recorded in [docs/WORKSPACE_STUDIO.md](docs/WORKSPACE_STUDIO.md). Workspace
Studio navigation, application routes, schema changes, migrations, database
privileges, environment configuration, deployments, private-data changes, and
JU enablement are not authorized by this product-direction decision alone.
Relationship Canvas, Yesterday/Today/Tomorrow comparison, persisted Knowledge
states, governance configuration, automated imports, and contextual AI remain
intentionally deferred until their data, authority, temporal, evidence, and
security semantics are approved.

### LAD-038 — Operational Roles have immutable identity and first-class responsibility history

**Status:** Accepted — implementation authorized for Responsibility Builder
v0.1.

**Context:** Workspace Studio Organization Builder established immutable stable
identity and append-only maintenance history for Organization Units, Positions,
and People. Operational Roles remain durable operating-model responsibilities,
but their database identity is currently an internal integer and Role creation
is recorded only as context within a Position-targeted mandate event. A
first-class Responsibility Builder cannot provide stable Role routes, preserve
Role corrections accurately, or explain Role retirement through indirect
Position history alone.

**Decision:** Every Operational Role receives an immutable, random Lotura UUID
`stableKey` in addition to its existing database identity. Names, Position
titles, organizational assignments, reporting relationships, source rows, and
external identifiers never generate that identity. Existing operating-model
keys and routes remain unchanged unless a later routing decision explicitly
replaces them.

Operational Role creation, definition maintenance, and removal from the current
responsibility model use Role-targeted append-only Organization Structure
history. Role creation in Responsibility Builder v0.1 must occur atomically
with its first explicit Position mandate. The transaction records both the Role
creation and the Position mandate as separate events. A Role is never inferred
from a Position title, Person, Position Assignment, reporting relationship, or
current coverage.

Role name and description may be corrected or changed while preserving the
stable key. Ordinary deletion is unavailable. Inactivation is blocked while a
current or scheduled Process ownership, Step responsibility, Exception or
System ownership, RoleAssignment, or RoleMandate still depends on the Role.
Reactivation remains outside v0.1. Mandate and coverage replacement remains an
explicit end-then-establish sequence so each accepted change is historically
visible.

Responsibility Builder reuses the dedicated Structure administration boundary,
server-derived Organization and actor identity, authenticated private access,
same-Organization validation, stale-write protection, atomic history, and the
existing mandate and coverage semantics. It does not create a universal Studio
credential, couple the authenticated actor to a Person or Position, transition
legacy RoleAssignment, or change FLOW interpretation.

**Why:** Roles outlive people and may move between Positions without rewriting
Process references. Durable Role identity and direct history let Lotura explain
that continuity without treating a mutable name or database sequence as
organizational identity. Requiring an explicit first mandate prevents the
builder from manufacturing disconnected responsibility records while keeping
Position and Role conceptually separate.

**Alternatives considered:** Use Role integer IDs in Studio routes; derive Role
identity from its name; treat Position title as the Role; retain Position-only
history; allow standalone active Roles without a mandate; add a generic global
Studio history ledger; or implement ResponsibilityHolder polymorphism now.
These were rejected because they expose storage identity, make renames unsafe,
conflate structure and responsibility, obscure provenance, create avoidable
orphan records, collapse domain-specific history, or introduce premature
abstraction. A UI-only alternative cannot provide immutable Role identity or
honest Role-targeted history.

**Affected decisions:** This decision follows LAD-003, LAD-005, LAD-008 through
LAD-010, LAD-015, LAD-018, LAD-020, LAD-026, LAD-029, LAD-033, and LAD-035. It
extends LAD-037's Responsibility Builder direction and does not supersede it.
It presents Process and System relationships as context only and does not alter
LAD-006, LAD-007, LAD-011 through LAD-013, or LAD-036.

**Consequences and deferrals:** Responsibility Builder v0.1 may add Role stable
identity, Role-targeted structural history, Role definition maintenance, and
the smallest reviewed Structure-admin privilege delta. Standalone orphan Role
creation, Role reactivation, one-step mandate or coverage replacement,
committee and external holders, RoleAssignment migration, governance workflow,
bulk changes, Process/System authoring, and FLOW calculation changes remain
intentionally deferred.

### LAD-039 — Duplicate Organization Units merge without erasing evidence

**Status:** Accepted — implementation authorized for Organization Unit Merge
v0.1.

**Context:** Reviewed organizational evidence may produce two canonical
Organization Units that are later determined to describe one durable grouping.
Renaming one record does not consolidate their structural relationships, while
hard deletion would erase stable identity, import provenance, and the path by
which the duplicate was discovered. Moving every relationship manually is
error-prone and can leave a partially merged structure.

**Decision:** Workspace Studio provides a distinct **Merge into existing Unit**
action. Rename continues to correct the label of one durable Unit; changing a
parent continues to move one Unit within the hierarchy; moving a Position
continues to affect one Position. Merge is the explicit consolidation action.

The administrator selects the surviving active Unit and reviews the exact
direct impact before confirming. In one serializable transaction, all active
Positions directly assigned to the source Unit move to the survivor, all active
direct child Units are reparented to the survivor, and the source Unit is
retired. People, Position Assignments, Position reporting relationships, Role
Mandates, Role Coverage, Process ownership, and operational responsibility are
not rewritten or inferred. The source and survivor retain distinct immutable
stable keys and all source-import provenance remains unchanged.

The survivor must belong to the same Organization, remain active, differ from
the source, and not be a descendant of the source. The operation uses source
and target revision checks plus a deterministic impact fingerprint so stale or
changed review sets fail before mutation. The merge event and every affected
Position or child-Unit relationship change receive append-only history in the
same transaction. Any failed mutation, constraint, or history insertion rolls
back the complete merge. Ordinary hard deletion remains unavailable.

**Why:** Duplicate consolidation is a correction to the organizational digital
twin, not permission to erase evidence. A dedicated, previewed, atomic merge
preserves explainability while preventing half-completed manual cleanup.

**Alternatives considered:** Treat merge as rename; call it reassign; hard-delete
the duplicate; update relationships without history; require row-by-row moves;
or infer the survivor from names. These were rejected because they conflate
different semantics, erase provenance, weaken auditability, create partial
states, or manufacture authority.

**Affected decisions:** This decision follows LAD-008, LAD-009, LAD-015,
LAD-018, LAD-026, LAD-029, LAD-033, LAD-035, and LAD-037. It extends the
history-preserving Organization Builder without superseding Position,
reporting, responsibility, or evidence boundaries.

**Consequences and deferrals:** Migration `0013` adds only the explicit
`merge_unit` history action. No table, column, credential, or new privilege is
required. Cross-Organization merges, automatic fuzzy duplicate detection,
bulk merge suggestions, merge reversal, and source-evidence reconciliation
remain deferred.

### LAD-040 — Process Steps have immutable identity and explicit authoring history

**Status:** Accepted — implementation authorized for Step Builder v0.1.

**Context:** Operating Model Authoring Slice A established immutable Process
identity, explicit Owner Role maintenance, and append-only Process history.
Workspace Studio now provides the Process Builder destination, but ordered
Steps and their responsible Operational Roles remain read-only. The existing
`process_steps` table has only an internal integer identity, while the
operating-model history vocabulary is deliberately limited to Slice A Process
actions. Reusing those actions or recording a mutable position as Step
identity would make later corrections and reordering difficult to explain.

**Decision:** Every Process Step receives an immutable, random Lotura UUID
`stableKey` in addition to its existing database identity. Step title,
instructions, order, Process, responsible Role, source row, and position never
generate that identity. Existing Explorer and Process Detail routes and
projections remain unchanged.

An authenticated Workspace Administrator may add a Step, update its title and
instructions, move it one position earlier or later, and explicitly assign or
clear its responsible Operational Role. A null responsible Role retains the
LAD-006 meaning: responsibility is inherited from the Process Owner. If the
Process has no Owner Role, the interface presents responsibility as unclear;
it does not infer responsibility from a Person, Position, title, RoleMandate,
RoleCoverage, reporting relationship, or execution history.

Step authoring uses explicit `create_step`, `update_step`,
`reorder_steps`, and `change_step_responsibility` history actions and a
`process_step` history target. History retains tenant-safe references to both
the immutable Process and Step identities. Every canonical Step mutation,
aggregate Process revision update, and append-only history insertion occurs
atomically in one serializable transaction. Reordering records the before and
after position of both affected Steps and uses deferred enforcement of the
existing per-Process position uniqueness constraint so a valid swap does not
create a false transient collision.

Step removal is not part of v0.1. The current model has no Step retirement
lifecycle, and a Step may scope an Exception. Hard deletion or hiding a Step
would risk erasing current knowledge and requires a separate lifecycle,
dependency, versioning, and restoration decision.

Step Builder reuses the dedicated Process administration credential with only
the reviewed column-level Step privileges. It does not broaden the Structure
administrator, runtime role, owner credential, public demo, or any other
operating-model entity write boundary. The authenticated Lotura actor remains
independent of Person, Position, Membership, mandate, coverage, or reporting
context.

**Why:** Ordered work and responsibility are part of the organizational
digital twin, but useful authoring must not trade away identity, provenance,
tenant isolation, or the established responsibility semantics. Durable Step
identity lets Lotura distinguish editing, reordering, and future lifecycle
changes without treating wording or sequence as identity.

**Alternatives considered:** Use the Step integer ID as durable identity;
identify Steps by position or title; overload `update_definition`; store Step
changes only in Process-level JSON; allow hard deletion; add full Process
versioning first; or infer responsibility from current Position coverage.
These were rejected because they expose storage identity, make reorder or
rename ambiguous, weaken history vocabulary, erase knowledge, introduce a
larger unapproved lifecycle, or conflate human context with responsibility. A
UI-only alternative cannot provide immutable identity, Step-targeted history,
or the required privilege boundary.

**Affected decisions:** This decision follows LAD-003, LAD-006 through
LAD-010, LAD-015, LAD-018, LAD-020, LAD-023, LAD-026, LAD-029, LAD-032,
LAD-033, LAD-035, and LAD-036. It extends LAD-037's Process Builder direction
without superseding any prior decision. It does not change FLOW calculations
or the meaning of inherited responsibility.

**Consequences and deferrals:** Migration `0014` adds Step stable identity,
Step-targeted history references and vocabulary, the immutable-key trigger,
supporting constraints and indexes, and the minimum deferrable ordering
constraint needed for atomic adjacent swaps. No new domain table, environment
variable, credential, package, fixture, or public capability is introduced.
Step retirement/removal, bulk reorder, branching or conditional Step graphs,
field-level evidence, approved Process versions, System/Exception/dependency
authoring, Contributor proposals, approvals, and FLOW changes remain
intentionally deferred.

### LAD-041 — Technology and Exceptions use immutable identity and explicit operating-model history

**Status:** Accepted — implementation authorized for Technology & Exceptions
Builder v0.1.

**Context:** Workspace Studio can maintain Process definition, ownership, and
ordered Steps, while Systems, Process-System usage, and Exceptions remain
read-only. The existing `systems` and `exceptions` tables have only internal
integer identity. The operating-model change ledger can target Processes and
Steps but cannot represent a standalone System change, a Process-System
relationship change, or an Exception change without overloading earlier
actions or hiding the actual target in unstructured JSON.

**Decision:** Every System and Exception receives an immutable, randomly
generated Lotura UUID `stableKey`. Names, URLs, types, Process names, Step
positions, source rows, external identifiers, and organization-specific values
never generate this identity. Existing internal integer IDs and Explorer
projections remain unchanged.

Technology is the durable Workspace Studio area; System is its only entity in
Version 0.1. An authenticated Workspace Administrator may create and update a
System, explicitly select an Owner Operational Role, and deactivate a System
only when no current Process-System relationship depends on it. Deactivation
preserves canonical identity and history and does not imply failure,
criticality, or institutional retirement beyond the recorded lifecycle fact.

A Process may link an existing active System with a required plain-language
usage description, update that usage, or unlink the current relationship.
Unlinking removes only the current association; it does not delete the System
or its append-only history. The relationship is identified by the immutable
Process and System pair rather than a manufactured standalone record.

An authenticated Workspace Administrator may add and update a legitimate
alternate-path Exception, optionally scope it to an existing Step in the same
Process, optionally select an existing Owner Operational Role, and deactivate
it from the current Process. An Exception is not a generic error, complaint,
improvement idea, or unverified observation. Deactivation preserves the
Exception identity and history.

The existing `operating_model_changes` ledger expands through explicit System,
Process-System, and Exception targets and forward-only action vocabulary. A
standalone System history event has no Process target. A Process-System event
retains both Process and System identity. An Exception event retains its
Process and Exception identity. Database checks and same-Organization foreign
keys enforce those target shapes. Existing Process and Step history remains
unchanged and append-only.

Every mutation revalidates private Workspace Administrator access, derives
Organization and actor identity from trusted server configuration, re-reads
all Process, Step, Role, System, Exception, and relationship dependencies
inside a serializable transaction, uses deterministic stale-write protection,
and records canonical change and history atomically. The reviewed Process
administration credential receives only the new table, column, sequence, and
history-insert privileges required by this slice. Runtime access remains
SELECT-only and public/demo mode cannot initialize or invoke authoring.

**Why:** Systems, Exceptions, and their explicit relationships are first-class
parts of the organizational digital twin under LAD-007. They must become a
trustworthy canonical destination for future human and AI-assisted Discovery
without turning mutable names into identity, erasing relationship history, or
weakening organization and credential boundaries.

**Alternatives considered:** Use integer IDs as public identity; identify
Systems by name; identify Exceptions by wording or Step position; record all
changes as Process definition updates; create a separate unrestricted Studio
credential; hard-delete unlinked Systems or inactive Exceptions; infer System
criticality from a Process link; or introduce integrations, APIs, AI services,
documents, evidence states, and Process versions in the same migration. These
were rejected because they weaken identity, history, least privilege, product
language, or the bounded Studio Completion sequence.

**Affected decisions:** This decision follows LAD-002, LAD-003, LAD-006
through LAD-010, LAD-015, LAD-018, LAD-020, LAD-021, LAD-023, LAD-025,
LAD-026, LAD-029, LAD-032, LAD-035 through LAD-037, and LAD-040. It extends
Workspace Studio and operating-model authoring without superseding any prior
decision.

**Consequences and deferrals:** Migration `0015` adds System and Exception
stable identity, immutable-key triggers, history targets and explicit actions,
the required relationship-usage validation, tenant-safe foreign keys, and
supporting indexes. Process dependencies, generic Process creation,
RoleCoverage authoring, reactivation, hard deletion, Step retirement,
field-level evidence, approved Process versions, Contributor proposals,
governance approval, Discovery observations, integrations, broader Technology
entities, AI, and FLOW changes remain intentionally deferred.

### LAD-042 — Guided interviews preserve immutable source observations before canonical change

**Status:** Accepted — implementation authorized for Guided Interview
Foundation v0.1.

**Context:** Process Acquisition can create a deliberately incomplete Draft
Process, and Workspace Studio can maintain reviewed canonical Process facts.
Lotura does not yet have a governed place to pause and resume an interview,
preserve each answer as source evidence, distinguish uncertainty, or review
what was discovered without changing the operating model. Adding an AI model
before that boundary exists would encourage generated structure to impersonate
organizational truth.

**Decision:** The first Process Discovery implementation is a manual, guided,
self-interview for an authenticated Workspace Administrator about one existing
Process. A new Process must first begin as a Draft shell through the existing
Process Acquisition boundary. Starting from a Role, Position, or Person may
provide navigation context, but it may not create ownership, responsibility,
participant identity, or canonical Process facts by inference.

A `discovery_session` is an Organization-scoped, immutable-keyed container for
one interview scope. It references one existing Process and records the
authenticated Lotura actor who opened it, a plain-language scope statement,
the current question, a compare-and-set revision, and a lifecycle of **In
progress**, **Paused**, **Ready for review**, or **Closed**. These states govern
capture progress only. They do not mean approved, reconciled, published, or
current organizational truth.

A `discovery_observation` is one attributable answer or explicit unknown
captured within the session. It records an immutable random UUID, the exact
prompt key and prompt wording shown, a bounded topic, the response when one is
available, one epistemic state—**Known**, **Assumed**, **Unknown**, **Needs
validation**, or **Conflicting observation**—the authenticated Lotura actor,
sequence, and transaction time. A correction appends a new observation that
explicitly supersedes an earlier observation in the same Organization and
session; the earlier evidence is never overwritten. Application privileges do
not permit observation `UPDATE` or `DELETE`.

The initial question catalogue is application-versioned and covers Process
purpose and boundary, participants and responsibility, ordered work, Systems,
Exceptions, dependencies and handoffs, and unresolved questions. Prompt
wording is stored with each observation so later catalogue changes do not
rewrite what the participant was asked. The interview can be paused after any
saved answer and resumed at the recorded question. Draft text that has not
been submitted remains browser-local and may be lost; Lotura must state this
clearly.

The review screen presents the original observations, classifications,
supersession chain, and unresolved questions. It does not update Process,
Step, Role, System, Exception, dependency, mandate, coverage, structure, FLOW,
or `operating_model_changes`. A future proposed-change package,
reconciliation, approval, and Process version workflow will consume reviewed
observations through a separate decision rather than silently converting this
session into canonical data.

Every session mutation and observation append revalidates authenticated
private-workspace access, derives Organization and actor identity on the
server, rejects cross-Organization Process or observation references, and uses
a dedicated server-only Discovery credential that cannot fall back to the
runtime, structural-admin, Process-admin, owner, or migration credential.
Public/demo mode cannot initialize Discovery or render its routes. The
Discovery role receives only the narrow session and observation privileges
needed by this slice; normal operating-model access remains read-only.

The first slice is restricted to sanitized operational knowledge. The UI must
warn participants not to enter constituent, donor, student, prospect, gift,
wealth, HR, credential, password, connection-string, or other sensitive record
data. No interview content is sent to an AI provider. Live institutional
enablement, retention, export, deletion, multi-user access, or AI processing
requires a separate environment and governance approval.

**Why:** A trustworthy AI interviewer needs a durable evidence destination
before it needs a model. Immutable observations, honest uncertainty,
pause/resume state, and human review make discovery useful immediately while
preserving the principle that an incomplete answer is more valuable than a
polished but inaccurate one.

**Alternatives considered:** Generate a complete Process directly from a
chat; store interview answers in Process purpose or change-history JSON; use
browser-only state; overwrite earlier answers; identify the participant from a
Person, Position, or Role; create a generic evidence table for every future
source; or implement AI, conflict resolution, and approval together. These
were rejected because they lose provenance, prevent reliable resume, conflate
application identity with organizational identity, create premature
abstraction, or exceed the current governance and privacy boundary.

**Affected decisions:** This decision follows LAD-002, LAD-003, LAD-008
through LAD-010, LAD-015, LAD-018, LAD-020 through LAD-023, LAD-025, LAD-026,
LAD-029, LAD-032, LAD-035 through LAD-037, LAD-040, and LAD-041. It advances
the manual guided-interview portion of LAD-021 and LAD-032 without superseding
them. It does not authorize AI processing or relax LAD-025.

**Consequences and deferrals:** After approval, a forward-only migration may
add only the session and observation tables, their lifecycle and epistemic
enums, immutable random identity, same-Organization safeguards, append-only
observation protection, revision checks, and supporting indexes. The first UI
may add `/studio/discovery`, a one-question-at-a-time interview, pause/resume,
and evidence review for an existing Process. Multiple participants, interviews
conducted on behalf of another Person, consent records, Contributor access,
artifacts/uploads, generic sources, AI prompts and model provenance, automated
follow-up selection, conflict detection, reconciliation, approval, proposed
change packages, Process versions, export, retention automation, and deletion
remain intentionally deferred.

### LAD-043 — Deterministic Discovery review signals prompt human review without interpreting truth

**Status:** Accepted — implementation authorized for Discovery Review Signals
v0.1.

**Context:** The first real Guided Discovery review demonstrated that a
participant can use definitive wording while explicitly stating uncertainty,
or append a correction that changes classification while
unintentionally omitting the original substance. Requiring the reviewer to
discover every such pattern manually weakens Discovery through documentation.
Automatically choosing a corrected state or rewritten answer would be worse:
the software would be manufacturing organizational interpretation.

**Decision:** A completed Guided Discovery session may show deterministic
**Things to review** generated at read time from the session's active and
superseded observations. Version 0.1 signals are limited to explainable
patterns under a **Known** classification: explicit uncertainty language and a
correction that may not carry substantive context forward. Each signal names
the affected observations and explains why review is suggested.

Selecting Known is the participant's confirmation of the complete answer. An
answer does not create another prompt merely because it contains several
steps, items, dependencies, or other claims. Claim-level evidence remains a
future reconciliation capability; the interview must not require the
participant to confirm the same classification twice.

An observation already classified as Assumed, Unknown, Needs validation, or
Conflicting observation does not create another immediate review prompt merely
because it contains several claims, differs from another boundary label, or is
a correction. That classification is an intentional preservation of
uncertainty for later reconciliation. The review panel must respect it rather
than sending the participant back through the same decision.

Signals are prompts, not persisted findings, conflict determinations, risk
measures, completeness scores, evidence reclassification, reconciliation, or
canonical change. The analyzer uses no AI and no external service. It must not
rewrite observation text, silently change an epistemic state, select a winner,
establish truth, or update the Process. Human review remains required even when
no signal appears.

The correction form begins with the active observation's text and evidence
state so changing one classification does not accidentally discard substance.
Submitting still appends a new immutable observation under LAD-042; it never
updates or deletes evidence.

**Why:** Lotura should help organizations notice uncertainty created through
documentation while preserving accountable interpretation. Explainable prompts
provide immediate value without pretending that simple text rules understand
the organization.

**Affected decisions:** This decision follows and narrowly extends LAD-021,
LAD-029, LAD-032, and LAD-042. It does not authorize the conflict lifecycle,
reconciliation schema, proposed-change packages, canonical approval, or AI
capabilities deferred by LAD-042.

**Consequences and deferrals:** Discovery Review Signals v0.1 requires no
schema, migration, credential, database privilege, canonical write, or
environment change. Claim-level evidence identity, accepted divergence,
cross-session comparison, source authority, reconciliation, approval,
AI-generated follow-ups, and persisted review disposition remain deferred and
require a later decision.

### LAD-044 — Discovery comparison shows current documentation beside interview notes without proposing change

**Status:** Accepted — implementation authorized for Discovery Reconciliation
Preview v0.1.

**Context:** A completed interview now preserves source observations and
deliberate uncertainty, but a reviewer cannot yet see those answers beside the
Process that Lotura currently documents. Jumping directly from free text to a
structured update would silently interpret evidence and blur the boundary
between what someone said, what Lotura proposes, and what the organization has
accepted. The first real interview also demonstrated that precise internal
terms such as “canonical” and “sanitized working draft” make ordinary product
tasks harder to understand.

**Decision:** A Ready for review Discovery session may expose an
Organization-scoped, read-only comparison page. It groups active interview
observations by the existing bounded topics and displays their exact text,
certainty label, and source link beside the currently documented Process
purpose, ownership, Steps, Systems, Exceptions, and explicit dependencies.
Superseded observations remain available on the interview record but do not
appear as current comparison notes.

The comparison performs no free-text parsing, record matching, conflict
resolution, proposed change selection, approval, canonical mutation, or AI
processing. Areas not represented in the current Process schema—such as
dedicated start/end boundaries and detailed uncertainty—must be described as
not currently represented rather than inferred from adjacent fields.

Product screens translate precise internal model terms into conversational
language. The interface uses “Current documented Process,” “Interview notes,”
“Still needs review,” and “No changes have been made.” Internal architecture,
schema, audit, and security documentation may retain terms such as canonical,
epistemic state, immutable evidence, and sanitization boundary when that
precision is required.

The route must require authoritative private-workspace access before loading
Discovery or Process data, derive Organization scope from the server, and fail
closed for a missing, cross-Organization, or not-ready session. It adds no
server action or mutation capability.

**Why:** A side-by-side view gives a reviewer the information needed to think
carefully about a future update without asking the software to interpret the
organization. Conversational language makes the trust boundary clearer because
people can understand what is documented, what came from the interview, and
whether anything changed.

**Affected decisions:** This decision follows and narrowly extends LAD-021,
LAD-025, LAD-029, LAD-032, LAD-037, LAD-042, and LAD-043. It does not authorize
the proposed-change, reconciliation-state, approval, Process-version, or AI
capabilities deferred by LAD-042.

**Consequences and deferrals:** Discovery Reconciliation Preview v0.1 requires
no schema, migration, database privilege, credential, environment variable,
canonical write, or new dependency. Persisted reconciliation decisions,
structured proposals, automatic mappings, approval, canonical application,
Process versions, multi-participant comparison, and AI assistance remain
deferred and require a later decision.

### LAD-045 — Human reconciliation creates a proposed-update package without changing the documented Process

**Status:** Accepted — implementation authorized for Discovery Proposed Update
v0.1.

**Context:** LAD-044 lets a Workspace Administrator compare current Process
documentation with exact interview notes, but it intentionally cannot remember
how each note should be treated. Browser-only choices would disappear, while
writing choices directly into the Process would collapse interview evidence,
human interpretation, approval, and current documentation into one unsafe
action. A future AI assistant also needs a governed proposal destination rather
than permission to edit the operating model.

**Decision:** A Ready for review Discovery session may have one
Organization-scoped `discovery_proposal`. It records an immutable random UUID,
the exact session and Process context, a JSON snapshot and SHA-256 fingerprint
of the documented Process when proposal work first begins, the authenticated
Lotura actor, a compare-and-set revision, and a lifecycle of **Draft** or
**Ready for review**. Ready for review means only that every current interview
observation has a recorded treatment. It does not mean approved, accepted,
published, applied, or current organizational truth.

For each current observation, an administrator may choose **Use in proposed
update**, **Keep what is documented**, or **Leave for later**. Each submitted
choice is an append-only `discovery_proposal_decision` tied to the exact
observation, session, proposal, Process, and Organization. Changing a choice
appends a later sequence for that observation; it never overwrites or deletes
the earlier decision. An optional review note may explain the interpretation.
The authenticated Lotura actor and transaction time are recorded independently
of Person, Position, Membership, Role, or coverage.

The proposal page shows the frozen Process snapshot beside the exact interview
text and the current human treatment. It may summarize which notes are included,
which current documentation is retained, and which questions remain for later.
It must not parse free text, manufacture field-level changes, infer Roles,
Systems, Steps, Exceptions, or dependencies, claim a structured after-state,
or write to the Process. Areas that need structured matching must say so.

The proposal and its decisions remain inside the existing server-only Discovery
write boundary. Every mutation reauthorizes authenticated private-workspace
access, derives Organization and actor identity on the server, rejects
cross-Organization or superseded observations, and uses compare-and-set
protection. The existing dedicated Discovery credential may receive only the
additional proposal-table privileges required by this slice. Public/demo mode
cannot render or invoke the capability.

**Why:** Human dispositions turn interview notes into an accountable proposed
update basis without pretending that free text is already structured Process
data. The same package can later receive human-authored or AI-assisted field
mappings while preserving the person’s choices and a hard approval boundary.

**Alternatives considered:** Keep choices only in browser memory; edit the
Process directly from the comparison; store choices on observations; overwrite
the latest choice; ask an AI model to produce the after-state immediately; or
build approval, Process versioning, and application in the same slice. These
were rejected because they lose durable review work, mutate source evidence,
erase decision history, overstate interpretation, or exceed the approved
governance boundary.

**Affected decisions:** This decision follows and narrowly extends LAD-021,
LAD-025, LAD-029, LAD-032, LAD-037, and LAD-042 through LAD-044. It advances
persisted human reconciliation and the proposed-change package deferred by
LAD-042 and LAD-044. It does not supersede them and does not authorize AI,
structured field mappings, approval, Process mutation, Process versions, or
multi-participant reconciliation.

**Consequences and deferrals:** After approval, forward-only migration `0017`
may add only the proposal status and disposition enums, `discovery_proposals`,
`discovery_proposal_decisions`, same-Organization composite safeguards,
append-only decision protection, proposal lifecycle and revision checks,
supporting indexes, and the session composite prerequisite required by those
foreign keys. No existing Process, observation, or history row is rewritten.
The runtime role may receive SELECT on the two new tables; the Discovery role
may receive only the reviewed SELECT, INSERT, proposal lifecycle UPDATE, and
sequence privileges. Application of a proposal, structured target mappings,
approval authority, Process version history, proposal withdrawal/rebasing,
cross-session reconciliation, and AI assistance remain deferred.

### LAD-046 — The Organizational Knowledge Lifecycle preserves evidence, interpretation, proposal, approval, and the operating model as separate layers

**Status:** Accepted — product direction.

**Context:** Lotura now preserves guided-interview observations, deterministic
review prompts, a comparison with documented Process information, and a durable
proposed-update package. The platform also maintains parts of the operating
model through governed authoring. Without one enduring lifecycle, later
structured mappings, approval, Process versions, AI assistance, comparison,
and improvement could collapse evidence into documentation or treat a proposal
as current organizational reality.

**Decision:** Lotura adopts the Organizational Knowledge Lifecycle:
**Observe → Interview → Evidence → Review → Reconcile → Proposed Change →
Approval → Operating Model → Continuous Improvement → Observe Again**.

Observed evidence, participant statements, reviewed interpretations, proposed
changes, approved/current documented knowledge, and actual organizational
reality remain distinguishable. The operating model is the trusted destination.
Discovery, AI, comparison, governance, and improvement exist to strengthen it,
not silently replace it.

Knowledge lifecycle and operating-model structure are separate architectural
dimensions. Lifecycle records describe how knowledge earns trust and authority.
Process Families, Reference Models, Job Descriptions, and drift describe how
knowledge is grouped, related, or compared. A lifecycle state does not create a
structural relationship, and a structural relationship does not establish
approval.

The manual path from evidence through structured proposed change, human
approval, atomic application, and a historically recoverable Process version
must be completed before AI may suggest or automate any part of that path. AI
never receives silent approval or canonical write authority.

**Why:** A digital twin is only trustworthy when the organization can see how
knowledge entered the product, who interpreted it, who had authority to approve
it, what became effective, and how later evidence differs. Separating the
layers preserves accountability without pretending approved documentation and
actual reality can never diverge.

**Alternatives considered:** Treat interview completion as approval; allow an
administrator to apply reconciliation choices directly; store only the latest
interpretation; use AI to synthesize and write the final Process; or make the
operating model one more source beside evidence. These were rejected because
they erase provenance, confuse authority, or remove the trusted destination.

**Affected decisions:** This decision follows and extends LAD-001, LAD-002,
LAD-021 through LAD-026, LAD-032, LAD-035 through LAD-037, and LAD-042 through
LAD-045. It does not supersede them.

**Consequences and deferrals:** The next implementation decision should cover
manual structured proposed-change mappings only. Proposal review and
governance, Process versions, atomic application, Knowledge Gaps, AI
assistance, and Continuous Improvement remain separately approved milestones.
This product-direction decision authorizes no schema, migration, credential,
database, environment, deployment, or data change.

### LAD-047 — Process Family membership, Process composition, and Process dependency are distinct relationships

**Status:** Accepted — product direction.

**Context:** Related Processes such as Annual Fund Physical-Check Gift
Processing and Annual Fund Credit Card Gift Processing may belong to a broader
Gift Processing family. A Process may also use a reusable subprocess or depend
on another Process. A single `parentProcessId` or reuse of the existing
dependency relationship would turn different operational meanings into an
apparently simple tree.

**Decision:** Process Family membership, executable Process composition, and
upstream/downstream Process dependency remain distinct relationship types.

The smallest durable family direction uses a first-class `ProcessFamily` and an
explicit `ProcessFamilyMembership`. The family is a grouping and comparison
context; it is not automatically an executable Process. The initial capability
must not introduce inheritance.

A Process may belong to a broader family without inheriting the family's Steps,
Roles, Systems, Exceptions, governance, or conclusions unless that inheritance
is separately defined and approved. Reusable subprocess semantics require a
later typed composition decision. Existing Process dependencies continue to
mean operational reliance and must not be overloaded for family membership or
composition.

**Why:** A graph can represent families, reuse, and dependencies honestly while
a parent field assumes one hierarchy and invites accidental inheritance.
Explicit relationships preserve stable Process identity and allow comparison
without duplicating or merging meaningful variation.

**Alternatives considered:** Add one nullable parent Process; make a broad
family an ordinary Process; encode families as tags; reuse Process dependencies;
or immediately create a general polymorphic Process graph. These were rejected
because they conflate semantics, impose a tree, weaken constraints, or add
speculative scope.

**Affected decisions:** This decision follows and extends LAD-004, LAD-006,
LAD-007, LAD-008, LAD-018, LAD-023, LAD-026, LAD-036, LAD-037, and LAD-046. It
does not supersede the existing Process dependency model.

**Consequences and deferrals:** Process Families are preserved as Milestone 5,
after structured proposal, governance, and versioned application. Detailed
schema, membership cardinality, effective dating, family governance,
composition relationships, comparison behavior, browsing, and migration design
remain deferred. No Step, Role, System, Exception, governance, or conclusion
inheritance is authorized.

### LAD-048 — Reference Model differences create review questions, not automatic conclusions

**Status:** Accepted — product direction.

**Context:** Organizations may compare documented or observed practice with an
industry framework, regulatory guidance, professional recommendation, vendor
procedure, internal standard, or prior approved Process version. Difference may
represent a documentation gap, local adaptation, intentional deviation,
operational drift, inapplicability, or possible innovation. It does not alone
prove failure or noncompliance.

**Decision:** Reference Models are first-class future comparison contexts that
may apply explicitly to a Process or Process Family. A Reference Model retains
its source, version or edition, timing, applicability, provenance, and use or
licensing constraints. Attachments to Processes and Process Families remain
explicit rather than using an unbounded polymorphic relationship.

Comparison results use evidence-based classifications and questions such as
aligned, intentional deviation, local adaptation, needs review, documentation
gap, operational drift, possible innovation, or not applicable. Lotura must
not derive a quality score, maturity percentage, compliance failure, or risk
conclusion from difference alone. A stronger compliance conclusion requires a
separately governed rule and accountable authority.

**Why:** Reference material can make missing assumptions and local variation
visible, but treating the reference as universal truth would repeat the same
error Lotura avoids with interview evidence. The useful product question is:
“This differs from the selected reference. Is that intentional?”

**Alternatives considered:** Store standards as ordinary Processes; assume the
selected reference is authoritative; generate compliance scores; keep only a
URL on the Process; or allow AI to decide whether a difference is a failure.
These were rejected because they lose provenance, applicability, versioning,
licensing, and accountable human judgment.

**Affected decisions:** This decision follows and extends LAD-002, LAD-012,
LAD-013, LAD-022, LAD-024 through LAD-026, LAD-032, LAD-035, LAD-037, LAD-043,
LAD-046, and LAD-047. It does not supersede them.

**Consequences and deferrals:** Reference Models remain Milestone 7 and Practice
Comparison Milestone 8. Schema, storage or external links, content rights,
versioning, attachment rules, comparison snapshots, governance, retention, and
compliance policy remain deferred. This decision authorizes no content intake,
schema, migration, AI comparison, environment, or data change.

### LAD-049 — Structured proposed changes are typed human mappings, not approval or Process mutation

**Status:** Accepted — implementation authorized for Structured Proposed
Changes v0.1, Slice 1.

**Context:** LAD-045 preserves a finished proposed-update basis: exact interview
observations, their current human treatments, and a frozen snapshot of the
documented Process. It intentionally does not turn free text into Process
fields. LAD-046 requires the next manual lifecycle boundary to remain separate
from approval, Process versioning, and application. A durable intermediate
model is therefore required before an administrator can responsibly propose
specific changes.

**Decision:** A finished `discovery_proposal` may have one separate,
Organization-scoped structured-mapping workspace. The workspace has immutable
proposal, interview, and Process context; a database-generated random UUID; a
compare-and-set revision; and a lifecycle of **Draft** or **Ready for proposal
review**. Ready for proposal review does not mean approved, applied, published,
or current documentation.

Structured proposal items are human-authored, typed review units. Each logical
item has a stable proposal identity and append-only revisions. A revision
records an explicit action, the relevant current documented state, the proposed
state, a rationale, the authenticated Lotura actor, and transaction time.
Withdrawing or restoring an item appends another revision; it never updates or
deletes prior item history. Immutable source links identify the exact current
interview observations supporting each item.

Slice 1 supports only:

- proposing an update to Process purpose;
- proposing assignment, replacement, or Draft-compatible clearing of the
  Process Owner Operational Role; and
- preserving selected evidence as an unresolved question that requires later
  information rather than pretending it is a Process change.

Operational Role targets must already exist and be active in the same
Organization. Owner Role is never inferred from Person, Position, title,
RoleMandate, RoleCoverage, or reporting hierarchy. The proposed before and
after states are typed snapshots, not executable generic JSON patches. Every
current observation selected for use in the proposal must either support at
least one current structured item or be explicitly preserved as unresolved
before the mapping workspace can become ready.

Readiness rechecks the current documented Process fingerprint against the
frozen LAD-045 snapshot. If documentation changed after comparison began, the
mapping remains readable but cannot silently become ready. Rebase,
supersession, and withdrawal of a completed package require later decisions.

The mapping workspace remains inside the existing server-only Discovery write
boundary. Every mutation reauthorizes authenticated private-workspace access,
derives Organization and actor identity on the server, validates same-
Organization proposal, observation, Process, and Role references, uses
serializable transactions and compare-and-set protection, and returns only
bounded user-facing results. The Discovery role may receive only the additional
mapping-table privileges required by this slice. It receives no Process, Role,
operating-model history, structure, schema, or administration mutation
privilege. Public/demo mode cannot render or invoke the capability.

**Why:** Human-authored structured mappings make the proposed change explicit
without treating evidence as approved documentation. Append-only revisions and
exact evidence links preserve how an interpretation evolved, while the frozen
Process comparison point and stale-documentation block prevent a proposal from
silently overwriting later work.

**Alternatives considered:** Store mappings as free text; add proposed fields
directly to observations; mutate the finished LAD-045 package; write directly
to `processes`; reuse `operating_model_changes`; allow arbitrary JSON Patch;
infer an Owner Role; or combine mapping, approval, versioning, and application
in one action. These were rejected because they blur lifecycle layers, weaken
tenant and target integrity, erase interpretation history, or grant authority
that this slice does not possess.

**Affected decisions:** This decision follows and narrowly extends LAD-001,
LAD-002, LAD-015, LAD-016, LAD-018, LAD-021 through LAD-026, LAD-029, LAD-032,
LAD-035 through LAD-037, and LAD-042 through LAD-046. It does not supersede
them. It does not change the structural or comparison concepts preserved by
LAD-047 and LAD-048.

**Consequences and deferrals:** Forward-only migration `0018` may add only the
structured-mapping status, action, and item-state enums; one mapping workspace
table; append-only item revisions; immutable source links; same-Organization
composite safeguards; lifecycle, identity, target-shape, and immutability
checks; and supporting indexes. The runtime role may receive SELECT on the
three new tables. The Discovery role may receive only reviewed SELECT, INSERT,
limited mapping lifecycle UPDATE, and sequence privileges. Later structured
targets, proposal governance, approval, Process versions, application,
`operating_model_changes`, AI suggestions, rebasing, and environment rollout
remain separately approved work.

### LAD-050 — Structured proposed-change mappings use explicit typed operating-model targets

**Status:** Accepted — implementation authorized for Structured Proposed
Changes v0.1, Slice 2.

**Context:** LAD-049 proves the append-only mapping workspace with Process
purpose, Owner Operational Role, and unresolved-question items. Completing the
manual path now requires human reviewers to express specific proposed changes
to Steps, responsibility, Systems, Exceptions, and dependencies without
turning interview evidence into documented operating-model facts.

**Decision:** Slice 2 extends the existing mapping action enum through a
forward-only migration. It supports only: adding a Process Step; revising an
existing Step; changing a Step's Responsible Operational Role; linking an
existing System; adding a Process Exception; revising an existing Exception;
and adding an explicit upstream or downstream Process dependency.

Every target is selected explicitly and protected by Organization-scoped
foreign keys. Existing Step and Exception targets must belong to the mapping's
Process. Roles and Systems must be active in the same Organization. A related
Process must be a different Process in the same Organization. New Exceptions
may reference an existing Step but not a proposed new Step. System creation,
Role creation, target inference, arbitrary JSON patches, and implicit
dependencies remain prohibited.

Each revision preserves typed documented and proposed state, a human rationale,
the authenticated Lotura actor, transaction time, and immutable links to the
supporting interview answers. Revisions remain append-only. Readiness rechecks
target availability, tenant and Process scope, duplicate and self-reference
rules, evidence coverage, and the frozen documented-Process fingerprint.

The Discovery write role receives only the catalog reads and mapping-table
writes needed for these proposals. It receives no mutation privilege on
Processes, Steps, Roles, Systems, Exceptions, dependencies, operating-model
history, Organization Structure, schema, roles, or databases. Public/demo mode
cannot render or invoke the feature.

**Why:** Separate action values and typed targets make the proposed meaning
reviewable and enforceable. Reusing Slice 1 actions or storing an executable
generic patch would hide semantics, weaken tenant safety, and make future
approval or version application ambiguous.

**Alternatives considered:** Overload the three Slice 1 actions; store free
text; let a selected observation directly create operating-model records;
allow proposed objects to reference other proposed objects; infer targets from
titles or interview language; or combine mapping with approval and application.
These were rejected because they collapse lifecycle boundaries or introduce
unreviewable dependencies.

**Affected decisions:** This decision follows and narrowly extends LAD-001,
LAD-002, LAD-015, LAD-016, LAD-018, LAD-021 through LAD-026, LAD-029, LAD-032,
LAD-035 through LAD-037, LAD-042 through LAD-046, and LAD-049. It does not
supersede them and does not change LAD-047 or LAD-048.

**Consequences and deferrals:** Forward-only migration `0019` may expand the
mapping action enum, add typed target columns, same-Organization and same-
Process safeguards, action-specific checks, and supporting indexes. Proposal
review and governance, approval, Process versions, atomic application, AI
suggestions, target creation inside Discovery, proposed-to-proposed references,
deletion, rebasing, and supersession remain deferred.

### LAD-051 — Discovery may conclude with a durable Knowledge Outcome without producing an operating-model change

**Status:** Accepted — implementation authorized for Knowledge Outcomes v0.1.

**Context:** The first complete private-workspace Discovery lifecycle showed
that a human review can support current documentation, preserve unresolved
questions, and select nothing for change. Treating that result as an empty or
failed proposal would pressure people to manufacture work and would make
Discovery serve change volume rather than organizational understanding.
LAD-045 already preserves the frozen documented-Process comparison, append-only
human choices, completion actor, and completion time. LAD-049 and LAD-050 create
structured mappings only when selected evidence needs a specific proposed
interpretation.

**Decision:** A finished Discovery review produces a reproducible, human-
readable **Knowledge Outcome**. Knowledge Outcome is a read-only projection from
the active observations, each observation's latest append-only review choice,
the immutable finished review package, and any structured mapping that exists.
It does not replace or summarize away the underlying evidence.

Outcome categories are not mutually exclusive. A review may show that current
documentation was kept, knowledge was preserved for later, additional
validation is needed, conflicting evidence or a Process boundary remains,
evidence was selected for an update, specific structured changes were proposed,
or no change was proposed. Product language must distinguish evidence selected
for an update from a specific human-authored change.

No change is a valid and successful outcome. When no evidence is selected for
an update, Lotura must show the outcome without creating or linking to an empty
structured-mapping workspace. Unresolved knowledge remains unresolved and
available for later review. The documented Process remains unchanged unless a
separate future governance and atomic-application boundary approves and applies
a versioned change.

The existing finished `discovery_proposal` is treated at the product surface as
a durable review package when no change is proposed. Its current database name
does not require a rename. Because finished packages and their decisions are
already immutable and attributable, Knowledge Outcomes v0.1 adds no table,
migration, database privilege, credential, environment variable, or write path.
Organization scope remains server-derived, private-workspace access remains
required, public/demo mode remains unavailable, and merely viewing an outcome
performs no mutation.

**Why:** Discovery exists to improve understanding, not manufacture a proposal.
A deterministic outcome lets people see what was learned, what remains open,
and whether change is warranted while preserving the authority and provenance
boundaries already established by the Organizational Knowledge Lifecycle.

**Alternatives considered:** Require at least one selected answer; create an
empty mapping for navigation; persist generated narrative in a new table; add a
single exclusive outcome status; derive a confidence or quality score; let AI
declare the outcome; or treat interview completion as documentation approval.
These were rejected because they manufacture work, erase simultaneous outcomes,
duplicate reproducible facts, overstate certainty, or collapse evidence,
interpretation, approval, and current documentation.

**Affected decisions:** This decision follows and extends LAD-002, LAD-021
through LAD-026, LAD-029, LAD-032, LAD-035 through LAD-037, LAD-042 through
LAD-046, LAD-049, and LAD-050. It refines LAD-046 by making proposed change one
possible branch after review rather than an inevitable next state. It does not
supersede any earlier decision and does not change the Process Family or
Reference Model boundaries in LAD-047 and LAD-048.

**Consequences and deferrals:** Knowledge Outcomes v0.1 may add only a pure
deterministic projection, completed-review presentation, conversational
navigation, documentation, and regression tests. Persisted human outcome
narratives, validation assignments to another Person, Role, Unit, or source,
cross-session synthesis, longitudinal analytics, dashboards, scores, FLOW
calculation changes, governance approval, Process versions, atomic application,
and AI summarization remain separately approved work.

### LAD-052 — Proposal review authorizes exact proposed items without changing the operating model

**Status:** Accepted — implementation authorized for Proposal Review &
Governance v0.1.

**Context:** LAD-049 and LAD-050 preserve a finished, human-authored mapping of
reviewed evidence to explicit possible operating-model changes. The mapping is
frozen for review but deliberately has no approval meaning. LAD-035 also
requires approval authority to remain independent from Workspace
Administration, reporting hierarchy, Process ownership, Position, Person, and
current Role coverage. The manual knowledge lifecycle therefore needs a
durable review boundary before any proposal may reach Process versioning or
application.

**Decision:** An Organization-scoped proposal review may begin only from a
finished mapping that contains at least one current structured change. An
unresolved-question item remains useful review context but is not itself an
operating-model change to approve. Beginning review is an explicit mutation;
merely viewing a finished mapping never creates a review record.

The review is pinned to the exact immutable mapping, Process context,
documented-Process fingerprint, and current mapping-item revisions. Each
structured item receives append-only human decisions. Proposal Review &
Governance v0.1 supports only **Approve to move forward**, **Not approved**,
and **Needs more validation**. A later decision for the same item appends a new
sequence; it never updates or deletes the earlier decision.

The package can be finished only when every current structured change has one
current decision and the documented Process still matches the frozen
comparison point. Its result is derived from the current item decisions:
approved, approved in part, needs validation, or not approved. Approval means
only that the exact proposed item may be considered by the future versioned
application boundary. It is not institutional approval of the Process, does
not establish current documentation, and writes no Process, Step, Role,
System, Exception, dependency, Process version, or operating-model history
record.

Review decisions record the authenticated Lotura application actor at the time
of the decision. Actor identity is not coupled to Person, Position,
Membership, Operational Role, RoleMandate, RoleCoverage, reporting hierarchy,
or Process ownership. The initial private pilot may explicitly configure its
authenticated administrator as the Proposal Reviewer, but that capability is
separately enabled and does not arise from Workspace Administrator status.

Every mutation reauthorizes private-workspace access, derives Organization and
actor scope from trusted server configuration, validates exact same-
Organization references, uses serializable transactions and compare-and-set
revisions, and returns bounded results. A dedicated server-only proposal-review
credential may receive only reviewed catalog reads, review-table inserts,
limited review lifecycle updates, and sequence use. It receives no canonical,
Discovery-evidence, mapping, Organization Structure, schema, role, database, or
migration mutation privilege. Public/demo mode cannot render or invoke review.

**Why:** Accountable review must preserve exactly what was considered, who
decided, why, and which evidence-backed proposal revision the decision covered.
Keeping review separate from Process versions and application prevents an
approval click from silently rewriting organizational knowledge while giving
the next milestone an unambiguous, human-authorized input.

**Alternatives considered:** Treat a finished mapping as approved; infer the
reviewer from Process ownership or reporting structure; store one mutable
decision per item; approve free-text observations directly; let viewing create
an empty review; reuse the Discovery or Process administration credential; or
combine review, Process versioning, and application. These were rejected
because they collapse lifecycle layers, weaken accountability or least
privilege, manufacture authority, or erase decision history.

**Affected decisions:** This decision follows and extends LAD-002, LAD-015,
LAD-016, LAD-018, LAD-021 through LAD-026, LAD-029, LAD-032, LAD-035 through
LAD-037, LAD-042 through LAD-046, and LAD-049 through LAD-051. It extends
LAD-035 with one explicitly configured review capability and LAD-046 with the
next manual lifecycle boundary. It does not supersede any prior decision and
does not authorize the Process-version and atomic-application semantics
deferred by LAD-023.

**Consequences and deferrals:** Forward-only migration `0020` may add only the
proposal-review status and disposition enums, one review package table, one
append-only item-decision table, exact mapping and item-revision safeguards,
lifecycle and immutability triggers, and supporting indexes. The runtime role
may receive SELECT on the new tables. Automated return-and-edit,
proposal-package supersession or rebasing, multiple simultaneous review
assignments, Steward or committee routing, notifications, effective dating,
Process versions, atomic application, FLOW changes, and AI recommendations
remain separately approved work.

### LAD-053 — Approved proposed items create one immutable Process version through a separate atomic application boundary

**Status:** Accepted — generic implementation complete and isolated fictional
verification passed at migration journal `22/22`. JU rollout remains separately
gated.

**Context:** LAD-049 and LAD-050 preserve immutable, typed human mappings.
LAD-052 permits an accountable reviewer to approve exact item revisions to
move forward while deliberately writing no canonical operating-model record.
LAD-023 requires approved Process version history to remain distinct from
improvement history, and LAD-046 requires approval, current documentation, and
actual organizational reality to remain separate. The next manual lifecycle
boundary must therefore turn eligible approved items into a historically
recoverable documented Process state without making review itself a write to
the operating model.

**Decision:** Versioned application is a separate, explicit,
Organization-scoped human action. A finished Proposal Review is eligible only
when at least one current structured item has the current disposition
**Approve to move forward**. Application applies every and only currently
approved item revision in that review. It never applies unresolved-question
items, and it creates no application or version when no item is approved.
Opening a review, application preview, or version page performs no mutation.

The application is pinned to the exact immutable mapping, current review
decisions, and documented-Process fingerprint. It reauthorizes the
application actor, derives Organization scope on the server, reloads and locks
all targets, rejects cross-Organization or changed references, re-runs
dependency and integrity guards, and uses a serializable transaction. The
actor is the authenticated Lotura application identity at the time of
application and is not coupled to Person, Position, Membership, Operational
Role, Process ownership, RoleMandate, RoleCoverage, or reporting hierarchy.
Application authority is separately configured and is never inferred from
Proposal Reviewer or Workspace Administrator capability.

Each successful application appends an immutable complete Process-centered
snapshot containing the Process definition, Owner Operational Role, ordered
Steps and responsible Roles, explicit System relationships, Exceptions, and
Process dependencies. Stable keys and contemporaneous display values make the
documented state understandable later. Person, Position, current coverage, and
reporting context are not silently incorporated into the Process definition.
The first application records both an initial baseline snapshot of the
immediately preceding documented state and the resulting successor version;
the baseline does not invent an earlier institutional effective date. Later
applications append one successor in a linear Process-local version chain.

Version 0.1 permits neither future scheduled activation nor retrospective
insertion into the version chain. The application uses one effective time that
is not in the future and does not precede the prior known effective time. It
applies approved actions in deterministic item order. Each applied item retains
its exact mapping revision and review decision, correction-versus-
organizational-change classification, and canonical before and after state.
One package-level reason, authenticated actor, effective time, and transaction
timestamp remain attributable.

Canonical mutation, target-specific `operating_model_changes` events, the
resulting immutable Process version, the application ledger, and item-level
provenance must all succeed in the same transaction. Missing exact history
semantics require forward-only enum and target-reference expansion rather than
overloading an existing action. Any stale state, reference failure, constraint
failure, history failure, version failure, or provenance failure rolls back
the entire operation. A completed review may be applied successfully at most
once.

The durable model is one immutable Process-version table, one
immutable proposal-application table, and one immutable applied-item
provenance table. The version snapshot is server-produced and carries an
explicit snapshot-format version. Current canonical tables remain the source
for Explorer and authoring; the immutable version chain establishes historical
documented states rather than becoming a second mutable operating model. The
detailed accepted design contract is recorded in
[docs/PROCESS_VERSIONS_AND_ATOMIC_APPLICATION.md](docs/PROCESS_VERSIONS_AND_ATOMIC_APPLICATION.md).

A dedicated server-only application credential receives only the reviewed
catalog reads, exact column-limited canonical writes required by approved
v0.1 actions, append-only history/version/application inserts, and sequence
use. It receives no hard-delete, history or version mutation, unrelated
Structure mutation, generic Role/System creation, schema, database, role, or
migration privilege. Public/demo mode cannot initialize or invoke application
and receives no credential.

**Why:** A governed application boundary must prove exactly which reviewed
changes became documented knowledge, what existed immediately before them,
who applied them, and when they became effective. One transaction prevents a
Process mutation from surviving without its audit history, version, or
evidence-to-decision provenance. A complete Process-centered snapshot keeps
historical interpretation stable even when shared Role, System, or related
Process labels later change.

**Alternatives considered:** Treat review completion as application; mutate
the Process and reconstruct versions from audit events; store only field-level
diffs; update one mutable “current version”; let the applicant cherry-pick
approved items; include unresolved questions as changes; infer application
authority from administration or ownership; reuse the Process-admin or review
credential; schedule future canonical mutations without an activation engine;
or combine versioning with Improvement history. These alternatives were
rejected because they collapse lifecycle layers, make historical recovery
ambiguous, weaken authorization or atomicity, or overstate what approved
evidence establishes.

**Affected decisions:** This decision follows and extends LAD-002, LAD-007
through LAD-009, LAD-015, LAD-016, LAD-018, LAD-021 through LAD-026, LAD-029,
LAD-032, LAD-035 through LAD-037, LAD-040 through LAD-046, and LAD-049 through
LAD-052. It operationalizes Process version history under LAD-023 without
superseding Improvement history. It does not alter Process Family or Reference
Model boundaries in LAD-047 and LAD-048.

**Consequences and deferrals:** This acceptance authorizes design and isolated
implementation planning, not implementation, a migration, credential,
environment, JU data, deployment, or public-demo change. A later implementation
approval must define the exact migration, snapshot schema, action handlers,
history enum expansion, privilege matrix, isolated verification, and deployment
sequence. Version
branches, future scheduling, retrospective insertion, multi-Process packages,
proposal rebasing, automated rollback, AI application, FLOW changes,
notifications, Steward routing, Process Families, Reference Models, drift,
and Continuous Improvement remain deferred.

**Implementation status — August 17, 2026:** The generic v0.1 implementation,
forward-only migration `0021`, isolated fictional verification, and dedicated
JU least-privilege application boundary are complete. JU Production runs the
same shared commit as public Northstar with application enabled only through
JU Production configuration. Rollout probes were transactional and left no
Process version, application, provenance, history, or canonical test row. No
real application has occurred; the first one remains contingent on a genuine
approved proposal.

### LAD-054 — Removing a populated Organization Unit moves its direct contents before retiring the Unit

**Status:** Accepted — generic implementation complete and isolated fictional
verification passed at migration journal `23/23`. JU rollout remains separately
gated.

**Context:** LAD-009 correctly blocks ordinary retirement while current
Positions or child Units still depend on an Organization Unit. LAD-039 provides
an atomic transfer for the narrower case where two Unit records describe the
same durable grouping. Administrators also need to remove a valid but no-longer-
current Unit while preserving its Positions, people context, responsibilities,
and subordinate Units under another active Unit. Calling that operation a
duplicate merge would misstate the organizational event, while hard deletion
would erase identity and history.

**Decision:** Workspace Studio provides a distinct **Remove Unit and move its
contents** action. The administrator selects one active destination Unit in the
same Organization and reviews the exact direct Positions, direct child Units,
current occupants, and Operational Role context before confirming.

In one serializable transaction, active Positions directly assigned to the
source move to the destination, active direct child Units are reparented to the
destination, and the source Unit is retired. People, Position Assignments,
reporting relationships, Role Mandates, Role Coverage, Process ownership,
Process responsibility, and stable keys are not rewritten, deleted, or
inferred. The source Unit and its import provenance remain historically
available.

The destination must be active, distinct from the source, in the same
Organization, and outside the source's descendant graph. Source and destination
revisions plus a deterministic impact fingerprint protect against stale review.
The source retirement and every moved Position and child-Unit relationship
append truthful history in the same transaction. Any mutation, constraint, or
history failure rolls back the complete operation. Ordinary hard deletion
remains unavailable.

**Why:** Removing a grouping from the current structure must not require erasing
the organizational knowledge attached to it. A distinct operation accurately
records that the Unit ended while its contents continued elsewhere, and avoids
overloading duplicate consolidation with different organizational semantics.

**Alternatives considered:** Hard-delete the Unit and cascade its relationships;
reuse **Merge into existing Unit** for every removal; silently move contents to
the parent; allow retirement with dependent records; or require every Position
and child Unit to be moved manually. These were rejected because they erase
knowledge, misclassify the event, infer intent, permit invalid current state, or
create avoidable partial-work risk.

**Affected decisions:** This decision follows LAD-008, LAD-009, LAD-015,
LAD-018, LAD-026, LAD-029, LAD-033, LAD-035, and LAD-037. It extends LAD-039's
reviewed atomic transfer mechanics without superseding the distinct duplicate-
merge meaning. It does not change reporting, responsibility, Process, evidence,
or governance boundaries.

**Consequences and deferrals:** A forward-only migration may add only a distinct
append-only structural-history action. The operation reuses the existing
reviewed Structure-admin Unit, Position, and history privileges; no credential
or privilege expansion is authorized. Moving different contents to different
destinations, reversing a removal, bulk restructuring, deleting every attached
record as an error correction, and physical hard deletion remain deferred.

**Implementation status — August 17, 2026:** The generic Workspace Studio
action, forward-only migration `0022`, distinct history semantics, impact
preview, and shared atomic transfer engine are complete. Isolated fictional
verification proved the content move and source retirement, forced-history
rollback, history immutability, hard-delete denial, and zero persisted probe
rows. No JU migration, configuration, deployment, or canonical change has been
authorized or performed for this slice.

## Intentionally deferred ideas register

The following ideas are recorded so postponement is visible and deliberate.

| Idea | Why deferred | Decision required before implementation |
| --- | --- | --- |
| Full authentication and authorization | A replaceable temporary provider now prepares one private administrator; durable deployment protection and enterprise identity remain unresolved | SSO, multiple identities, provisioning, recovery, roles/permissions, audit, and access review |
| Governance and Stewardship engine | Dimensions, profiles, and Stewardship direction are accepted, but scope, delegation, effective timing, proposals, approval routing, and policy enforcement are unresolved | Governance domain, authorization, workflow, audit, retention, and identity decisions |
| Broader observations and provenance | LAD-042 proposes a bounded guided self-interview observation model; documents, external sources, multi-participant evidence, retention automation, and generalized provenance remain unresolved | Source/artifact lifecycle, evidence access, privacy, retention, and reconciliation decision |
| AI interviewing | Manual guided self-interviews are bounded by LAD-042; AI requires consent, approved scope, disclosure, model provenance, evaluation, data-use controls, and human review | AI interview, participant privacy, provider, retention, evaluation, and authorization decisions |
| Uploads, imports, Visio/PDF/flowchart parsing | Requires malware handling, source permissions, artifact retention, provenance, and conflict treatment | Artifact architecture, storage, security, and extraction decision |
| Whiteboard and collaborative capture | Draft contribution, authorship, reconciliation, and conversion to structured knowledge are undefined | Collaboration, observation, and approval decision |
| Conflict detection and consensus | Conflicts need identity, scope, lifecycle, privacy, and human resolution | Conflict and reconciliation schema decision |
| Knowledge Gaps | Explainable gaps are product direction under LAD-046, but persistence is not justified until assignment, governance, or resolution history requires it | Derived projection rules first; later lifecycle, ownership, and history decision if persistence is needed |
| Process Families and reusable subprocesses | LAD-047 preserves explicit family membership and distinct composition semantics, but authorizes no schema or inheritance | Family identity, membership cardinality, effective dating, governance, composition, comparison, and migration decision |
| Question-driven Discovery | Organizational questions may lead to existing knowledge, review, a new interview, or more evidence, but routing and scope are unresolved | Search, matching, participant selection, evidence scope, privacy, and session-start decision |
| Reference Models and practice comparison | LAD-048 preserves reference applicability and evidence-based comparison without automatic conclusions | Reference provenance, versioning, content rights, attachment, comparison snapshot, governance, and retention decision |
| Job Descriptions and Job Drift | Position-linked descriptions may differ from responsibility and observed work, but HR sensitivity and interpretation require governance | Effective-dated description, HR source, access, evidence mapping, comparison, and review decision |
| Operating-model drift | Drift requires approved versions, observations, comparison baselines, timing, and human classification | Version, baseline, evidence, classification, governance, and longitudinal comparison decision |
| Continuous Improvement | Initiative lifecycle, affected Systems, measures, repeated observations, and sustainment need design | Improvement domain and evidence decision |
| Restructuring scenarios | Hypothetical state, baseline, sensitive access, and approval boundaries are unresolved | Scenario model, authorization, and retention decision |
| Relationship canvas | The comprehension direction is accepted, but graph scope, layout, accessibility, evidence language, and performance need validation after the core builders exist | Focused graph projection and interaction decision |
| Yesterday / Today / Tomorrow comparison | Audit events alone cannot establish approved historical or proposed operating-model states | Version, effective-time, proposal, scenario, and comparison decision |
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

The code baseline includes the read-only Process Explorer and deterministic FLOW Analysis over the approved operating model, backed by either a fictional fixture or a server-only, Organization-scoped Neon snapshot. Generic temporary authentication, constrained deployment appearance, Organization Structure administration, Process Acquisition, Operating Model Authoring Slice A, Workspace Studio Organization Builder, and Responsibility Builder are configuration-gated capabilities for authenticated private workspaces. Responsibility Builder requires forward-only migration `0012` and the reviewed least-privilege Structure administration credential delta before environment enablement.

The public fixture/demo experience remains public, fictional, and read-only. A code or architecture decision does not authorize a migration, credential, environment change, deployment, or private-data import; each remains a separately approved operation.

Workspace Studio now provides Organization Builder, Responsibility Builder,
Process definition and ownership, Step Builder, and the implementation-ready
Technology & Exceptions Builder through the existing domain-specific permission
and history boundaries. Migration `0015` and its least-privilege rollout remain
separately controlled from the code decision. Process dependencies, generic
Process creation, Knowledge, Governance, Discovery, Activity synthesis,
relationship canvas, and AI expansion remain separately reviewed slices rather
than implied capabilities of the Studio shell. Guided Interview Foundation v0.1
adds configuration-gated, administrator-led Discovery sessions and immutable
source observations for existing Processes. Discovery Proposed Update v0.1
adds append-only human choices and a frozen comparison snapshot, but it does
not produce structured field changes, approve information, write Process facts,
use AI, or authorize enablement in any environment. Migrations `0016` and
`0017`, credential privilege changes, and environment rollout remain separately
controlled operations.

LAD-046 through LAD-048 add product-direction boundaries only. LAD-049
authorizes the first manual structured proposed-change slice while preserving
later target mappings, governance, approval, Process versions, and application
as separate decisions. Process Families, Reference Models, AI assistance, Job
Drift, operating-model drift, and Continuous Improvement remain later
milestones and have no current schema authorization.

LAD-050 completes the initial typed target vocabulary. LAD-051 authorizes a
read-only Knowledge Outcome projection and completed-review UX, including a
successful no-change branch, without authorizing a schema, privilege, Process,
FLOW, environment, or deployment change.

LAD-052 authorizes the first explicit proposal-review boundary over frozen
structured mappings. It permits append-only item decisions and a deterministic
review result through a distinct least-privilege credential, but it does not
authorize Process versions, canonical application, JU rollout, public-demo
changes, or AI participation.

LAD-053 accepts the immutable Process-version and atomic-application design
boundary after Proposal Review. Generic implementation, isolated fictional
verification, the dedicated JU least-privilege role, migration `0021`,
Production-only enablement, deployment, and read-only QA are complete. No
canonical JU application has occurred. A genuine approved proposal remains
required before the first application; public-demo change and AI participation
remain separately gated.
