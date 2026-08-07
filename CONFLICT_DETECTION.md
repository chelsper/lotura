# Conflict Detection

## Purpose

Conflict Detection is a future Lotura capability for identifying where observations, approved records, or operating-model relationships describe the organization differently.

It supports Knowledge Capture by making differences visible before an organization establishes or revises organizational truth. It supports Continuous Improvement by preserving friction that may reveal unclear ownership, inconsistent practice, outdated documentation, or a legitimate need for different operating variants.

This document defines the product philosophy and conceptual boundaries of Conflict Detection. It is not a Version 0.1 schema change, implementation specification, scoring model, or automated decision policy.

## Core principle

> Disagreement is data. Lotura should surface it, not smooth it over.

People often experience the same process differently because they occupy different roles, locations, teams, time periods, or points in the work. A difference between observations may reveal an error, but it may also reveal an undocumented exception, a local adaptation, a transition in progress, or important context that the current operating model does not yet represent.

Lotura should preserve each observation with its source, timing, context, and scope. It should never silently merge conflicting accounts into a single answer or allow AI to choose which participant is correct.

## Relationship to organizational truth

Conflict Detection follows the principle that Lotura should preserve observations before establishing organizational truth.

An observation records what a participant, document, system record, or reviewer reports. An approved operating-model record describes what the organization has accepted as its authoritative definition. Those are related but different forms of knowledge.

A detected conflict is therefore not proof that someone is wrong. It is a structured signal that two or more pieces of evidence cannot yet be treated as the same claim without additional context, reconciliation, consensus, or an explicit organizational decision.

## Conflict types

### Disagreements

Disagreements occur when participants or sources provide materially different accounts of how work happens, why it happens, or what outcome is expected.

Examples include:

- one participant describing a required review while another considers it optional;
- a policy document describing one practice while employees consistently report another; or
- different teams disagreeing about what successful completion means.

Lotura should present the competing claims and their evidence without converting majority opinion into truth automatically.

### Sequence conflicts

Sequence conflicts occur when sources disagree about the order of steps, prerequisites, handoffs, or decision points.

Examples include:

- one observation placing approval before client notification and another placing it afterward;
- a process definition requiring a system record before a handoff while actual practice records it later; or
- two teams each believing the other acts first.

These conflicts may reveal documentation drift, circular dependencies, an undocumented parallel path, or a real operational deadlock.

### Owner conflicts

Owner conflicts occur when the intended accountable role, the role responsible for a step, the current assignee, and observed practical ownership do not align.

Examples include:

- two roles both claiming final accountability;
- each role believing the other owns a decision;
- a process naming one owner while employees consistently escalate to another role; or
- an acting or interim assignment being treated as permanent in practice.

Lotura should preserve the distinction between intended ownership and current or observed responsibility. It should not resolve ownership by assigning it to the person who appears most active.

### System conflicts

System conflicts occur when sources disagree about which system is used, which system is authoritative, who owns it, or what role it plays in a process.

Examples include:

- one team treating a CRM as the system of record while another relies on a spreadsheet;
- documentation naming a retired system that remains in use;
- two systems containing conflicting versions of the same operational fact; or
- different accounts of whether a system is required or merely contextual.

A system conflict may identify duplicate records, integration gaps, shadow tools, retirement risk, or an undocumented continuity practice.

### Timing conflicts

Timing conflicts occur when observations or records disagree about deadlines, durations, cadence, effective periods, service windows, or the time at which a handoff or decision should occur.

Examples include:

- different promised response times for the same process;
- a role assignment or process version being treated as effective before its approved date;
- inconsistent expectations about when an escalation becomes necessary; or
- a documented monthly review that teams perform quarterly.

Lotura should distinguish a timing disagreement from normal variation by preserving the relevant period, conditions, and organizational scope.

### Exception conflicts

Exception conflicts occur when sources disagree about whether an alternate path exists, what triggers it, who owns it, or how the organization should respond.

Examples include:

- one participant treating a scenario as a normal variation while another treats it as an exception;
- different responses to the same exception condition;
- an exception marked inactive that employees still use; or
- a scoped step exception being described as a process-wide rule.

Exception conflicts are especially important because smoothing them into standard process text can erase institutional knowledge about risk, judgment, and alternate paths.

### Terminology conflicts

Terminology conflicts occur when the same term has different meanings or different terms refer to the same concept.

Examples include:

- “approved” meaning reviewed in one team and formally authorized in another;
- “owner” referring to a role, assignee, system steward, or executive sponsor depending on the speaker; or
- two departments using different names for the same handoff or client state.

Lotura should not normalize terminology silently. It should preserve the original language, identify the possible conflict, and support an agreed definition, synonym, or scoped meaning.

## Context before conflict

Not every difference is a conflict. Two observations may both be valid when they apply to different:

- organizations, divisions, teams, or locations;
- process versions or historical periods;
- client, service, or risk categories;
- standard and exception paths;
- systems or channels;
- assignment periods; or
- levels of detail.

Before presenting a conflict, Lotura should compare the organizational scope, effective time, process version, source context, and relevant conditions. Context should explain legitimate variation without erasing the original observations.

## Conceptual conflict lifecycle

Conflict Detection should support a transparent knowledge lifecycle:

1. **Observe** — preserve each claim with its contributor or source, time, context, and operating-model relationships.
2. **Compare** — identify claims that appear to describe the same organizational fact or relationship.
3. **Detect** — surface a material difference and classify the conflict without deciding which claim is correct.
4. **Contextualize** — determine whether scope, timing, process version, or an exception explains the difference.
5. **Reconcile** — let authorized stewards review evidence, request clarification, and propose a coherent interpretation.
6. **Establish consensus or accepted divergence** — record agreement, a documented decision, an unresolved question, or a legitimate operating variant.
7. **Approve** — establish or revise organizational truth through an explicit approval process.
8. **Preserve history** — retain the original observations, conflict, rationale, decision, and resulting operating-model changes.
9. **Reopen when evidence changes** — allow later observations to challenge an earlier resolution without erasing it.

Resolution should not require artificial unanimity. Lotura should be able to preserve dissent, accepted local variation, insufficient evidence, and decisions made despite continuing disagreement.

## What users should see

A future Conflict Detection experience should make the evidence understandable without blaming participants. It should show:

- the conflict type and the operating-model records affected;
- the competing observations or claims side by side;
- who or what supplied each observation, subject to access controls;
- when and in what context each observation was made;
- whether the conflict concerns the current, proposed, completed, or historical operating model;
- relevant processes, steps, roles, assignments, systems, exceptions, and dependencies;
- what context may explain the difference;
- the reconciliation status and responsible steward;
- any consensus, accepted divergence, approval, or unresolved question; and
- the historical record of resulting change requests or operating-model revisions.

The interface should use evidence language such as **conflict detected**, **context may explain**, **reconciliation required**, and **review recommended**. It should not present a conflict as proof of failure, dishonesty, poor performance, or individual fault.

## Deterministic and AI-assisted detection

Some conflicts can be detected deterministically from structured facts. Examples include overlapping active primary owners, incompatible step positions, contradictory effective dates, or different approved systems of record for the same scoped purpose.

Other conflicts may be suggested through language comparison across interviews, observations, and documents. AI may help identify possible contradictions, terminology differences, and questions for follow-up. Those suggestions must:

- remain distinguishable from deterministic findings;
- cite the observations or records that produced the suggestion;
- avoid deciding which source is authoritative;
- be reviewable and dismissible by a human steward; and
- never modify approved organizational truth automatically.

AI is an assistant in discovery and reconciliation, not an arbiter of organizational reality.

## Relationship to FLOW and Continuous Improvement

Conflicts can become evidence for a change request or improvement idea, but detection alone does not mean that a process must change.

FLOW should eventually distinguish how a conflict relates to:

- the **current operating model**, including unresolved conflicts in the approved definition or current practice;
- **proposed improvements** intended to reconcile or respond to a conflict;
- **completed improvements** with resulting operating-model changes and evidence about whether the conflict was resolved; and
- **historical operating models** that preserve the context in which the conflict originally occurred.

Every resulting improvement should remain traceable to the observations and conflict that motivated it. Closing a conflict because documentation changed is not proof that the operational disagreement disappeared; later observations and measurements should determine whether reconciliation was sustained.

## Governance and safeguards

Conflict data may be sensitive. Access should respect organization boundaries, participant privacy, approved interview scope, and the difference between confidential evidence and broadly visible organizational truth.

Lotura should not use conflict counts to rank employees, compare individual performance, or infer intent. A person who identifies many conflicts may be contributing valuable institutional knowledge rather than causing operational problems.

Organizations should define who may view source attribution, facilitate reconciliation, approve a resolution, or establish a new operating-model version. Those governance decisions must not be inferred from activity alone.

## Non-goals

Conflict Detection is not intended to:

- determine automatically who is right;
- manufacture consensus by selecting the most common answer;
- erase minority or dissenting observations after approval;
- treat every variation as an error;
- score employees, teams, or organizational health;
- replace investigation, facilitation, or accountable decision-making;
- allow AI to resolve ownership, policy, or process questions silently; or
- change the operating model as a side effect of analysis.

## Version 0.1 boundary

Conflict Detection is an intentionally deferred product and domain capability. It does not modify the Version 0.1 schema, migrations, Explorer projection, or deterministic FLOW Analysis currently implemented.

Future domain design must define observation identity, source attribution, conflict scope, lifecycle states, reconciliation and approval authority, history, privacy, and same-organization safeguards before any schema or implementation work begins.
