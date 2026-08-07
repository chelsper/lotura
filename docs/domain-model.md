# Domain model and future capabilities

## Version 0.1 boundary

Version 0.1 establishes the minimum operating model around organizations, people and memberships, organizational roles and assignments, processes and steps, exceptions, systems, process-system usage, and process dependencies.

Continuous improvement is a first-class future domain capability, but it is not part of the Version 0.1 database schema. The entities below are design commitments at the conceptual level, not finalized tables or migration specifications.

## Separate historical records

Lotura will eventually need two independent kinds of history:

- **Process version history** preserves an approved operational definition at a point in time. A future process-version model should make it possible to determine exactly what definition was effective, who approved it, and what later superseded it.
- **Improvement history** preserves the organizational learning loop: the friction observed, evidence collected, change proposed, decision made, implementation performed, benefit expected, result measured, and conclusion about sustainment.

These records may reference one another, but neither owns or replaces the other. An approved improvement may produce one or more new process versions. A new process version is not, by itself, proof that the improvement worked.

## Likely future entities

### Improvement

`Improvement` is the durable record of an improvement initiative. It exists to preserve the reason for change and the outcome of that change, rather than only the resulting documentation.

It will likely belong to one organization and record:

- the improvement idea and the friction, problem, or opportunity it addresses;
- the originating process from which the idea or observation arose;
- the contributor who supplied the idea, represented through an organization-scoped identity or membership;
- supporting qualitative or quantitative evidence;
- the rationale and proposed change or improvement hypothesis;
- intended ownership and current coordination responsibility;
- affected processes and systems;
- the expected benefit;
- implementation status and implementation notes;
- the approval decision, rationale, and timing;
- the implementation date;
- the resulting operating-model changes, including relevant process versions and changed relationships;
- the measured result; and
- whether the result was sustained, including when and on what evidence that conclusion was reached.

Its lifecycle must distinguish at least identification, proposal, approval, implementation, measurement, and sustainment. Exact statuses and transition rules are deferred. A state equivalent to “implemented” must not be treated as completion.

An improvement may relate to many processes, and a process may be affected by many improvements. It may also affect systems directly. The system relationship must eventually be represented explicitly rather than inferred only from the systems currently used by a process; the exact junction-table design is deferred.

Every process improvement must remain historically traceable. The future model must preserve the path from originating process and contributor through rationale, approval, implementation, resulting operating-model changes, measurement, and sustainment. An improvement record must not be overwritten when a process changes, and a current process definition must not erase the historical operating model that preceded it.

### ImprovementProcess

`ImprovementProcess` is the many-to-many association between an `Improvement` and an affected `Process`. It makes process impact first-class and prevents affected-process references from being buried in narrative text.

The association may eventually describe why the process is involved, the nature or scope of the impact, and links to the process versions observed before the change or produced by the change. Those version references depend on the future process-version model and are therefore deferred.

This entity allows one initiative to address an end-to-end operating problem spanning several processes and allows one process to accumulate a traceable history of improvement work.

### ImprovementMeasure

`ImprovementMeasure` defines and records how an improvement is evaluated. It exists because expected benefits and measured results must be structured enough to compare, revisit, and audit.

It will likely capture:

- the measure or outcome being evaluated;
- its unit, direction of improvement, and evidence source;
- the baseline value and observation period;
- the target or expected result;
- post-implementation observations and their dates;
- the sustainment observation window;
- the measured result and interpretation; and
- whether the measure supports a conclusion that the improvement was sustained.

An `Improvement` may require several measures, and each measure may require observations at baseline, immediately after implementation, and later sustainment checkpoints. During detailed design, repeated observations may justify separating the measure definition from individual measurement observations. That normalization decision is intentionally deferred.

## Relationship to FLOW

FLOW is the product experience and domain lifecycle that turns operational friction into measured organizational learning.

- `Improvement` is FLOW's central initiative record.
- `ImprovementProcess` connects FLOW to the processes whose behavior is being examined or changed.
- The future explicit affected-system relationship connects FLOW to enabling or constraining systems.
- `ImprovementMeasure` lets FLOW compare the improvement hypothesis with evidence and test whether the result persisted.
- Future process versions record the approved operational definitions before and after a change, without becoming the improvement record itself.

FLOW should be able to show an unbroken evidence chain from observed friction, through decision and implementation, to outcome and sustainment. It is a bounded continuous-improvement capability, not authorization to add generic workflow execution, tasks, comments, notifications, AI, or approval infrastructure to Version 0.1.

FLOW Analysis should eventually distinguish:

- **Current operating model**, representing the approved definition effective at the selected as-of time;
- **Proposed improvements**, representing ideas and pending or approved changes that have not become completed operational changes;
- **Completed improvements**, representing implemented initiatives together with resulting operating-model changes, measurement, and sustainment; and
- **Historical operating models**, representing prior approved definitions preserved after supersession.

These perspectives require explicit temporal and lifecycle relationships. They must not be inferred by overwriting a process record or by treating approval, implementation, measurement, and sustainment as the same event.

> An improvement is not complete when the new process is documented. It is complete when the result is measured and sustained.

## Deferred implementation decisions

Before these concepts become tables, the design must still define:

- the process-version entity and snapshot boundaries;
- improvement lifecycle states and permitted transitions;
- approval representation and authorization rules;
- evidence storage and external evidence links;
- the explicit many-to-many relationship between improvements and systems;
- measurement definitions versus repeated observations;
- sustainment criteria and observation windows;
- archival and deletion behavior; and
- same-organization database safeguards for every new relationship.

No Version 0.1 table should be expanded speculatively to hold this future behavior.
