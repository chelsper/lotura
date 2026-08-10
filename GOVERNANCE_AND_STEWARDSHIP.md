# Lotura Governance and Organizational Stewardship

## Purpose

Lotura helps organizations discover, govern, and continuously improve their
organizational knowledge. Governance is therefore a product capability, not
only an access-control mechanism.

The purpose of governance is to keep organizational knowledge maintained,
reviewed, explainable, and trustworthy over time. It determines who may see,
contribute to, approve, analyze, or administer organizational knowledge and
who is accountable for keeping that knowledge current.

This document records product direction. It does not define a database schema,
permission engine, approval workflow, deployment policy, or JU-specific rule.

## Independent concepts

Lotura must keep these concepts distinct:

- **Organizational hierarchy** — structural reporting between Positions.
- **Operational responsibility** — durable responsibility represented by
  Operational Roles and their mandates and coverage.
- **Administrative authority** — permission to configure Lotura and maintain
  canonical structures.
- **Approval authority** — permission to approve organizational knowledge or a
  proposed change within an assigned scope.
- **Analytical authority** — permission to perform particular kinds of FLOW or
  scenario analysis within an assigned scope.
- **Visibility** — permission to view information within an assigned scope.
- **Stewardship** — accountability for keeping particular organizational
  knowledge accurate and appropriately reviewed.

No one dimension implies another. A President may have organization-wide
analytical visibility without permission to rename a Position. A Process Owner
may approve a Process change without supervising its contributor. A Workspace
Administrator may configure the product without owning the Process being
changed.

Reporting hierarchy must never create approval, administrative, analytical, or
stewardship authority automatically.

## Stewardship

A Steward is accountable for ensuring that a defined body of organizational
knowledge remains accurate, reviewed, and appropriately governed.

Future stewardship may include:

- Organization Unit Steward;
- Process Steward;
- Operational Role Steward;
- System Steward; and
- Policy Steward.

A Steward is not necessarily the organizational manager, system administrator,
Process Owner, or person currently performing the work. Stewardship should be
visible on important objects. Every important organizational object should
eventually support one or more explicitly designated Stewards and retain
scope, delegation, effective timing, and history when those concepts are
eventually persisted.

## Five governance dimensions

### 1. Visibility

Visibility answers: **What organizational knowledge may this person view?**

It is scope-based and may eventually distinguish public knowledge,
Organization Unit knowledge, connected Processes, organization-wide structure,
and restricted executive analysis.

### 2. Contribution

Contribution answers: **What evidence or proposed knowledge may this person
submit?**

Contributors may suggest Process updates, supply observations, document
workarounds and Exceptions, upload supporting evidence, or propose
improvements. Contribution should normally create attributable evidence or a
proposal rather than directly overwrite approved organizational knowledge.

### 3. Approval

Approval answers: **Who may establish or change approved organizational
knowledge within this scope?**

Approval derives from governance, not reporting hierarchy. Future approvers may
include Process Stewards, Unit Stewards, Operational Role Stewards, delegated
reviewers, cross-functional reviewers, or governance committees.

### 4. Analysis

Analysis answers: **Which organizational questions and scenarios may this
person examine?**

Connected-Process review, Unit-level What-if analysis, enterprise
restructuring, Position elimination, system replacement, and cross-functional
impact may require different analytical scopes. Analytical authority remains
separate from approval and administration.

### 5. Administration

Administration answers: **Who may configure Lotura and maintain its canonical
organizational structures?**

A Workspace Administrator may eventually configure Organization Structure,
Operational Roles, imports, Workspace settings, governance, and user access.
Administrative actions must remain least-privileged, scoped, and auditable.
Administration does not confer organizational ownership, executive authority,
or permission to erase history.

## Default governance profiles

The first product vocabulary should include four generic profiles. These are
profiles, not a claim that one role enum or hierarchy can represent the complete
governance model.

### Workspace Administrator

Configures Lotura, manages canonical structure and Workspace configuration,
and may perform all analysis. A Workspace Administrator cannot bypass audit
history or convert unsupported evidence into organizational truth.

### Contributor

Views permitted knowledge and proposes observations, updates, Exceptions,
evidence, and improvements. A Contributor does not directly overwrite approved
organizational knowledge.

### Manager / Approver

Contributes and may reconcile or approve changes within explicitly assigned
scope, manage Process ownership within that assigned scope, review
cross-functional effects, and perform Unit-level analysis. Manager status in
the reporting hierarchy does not automatically create this profile or its
approval scope.

### Leadership / Organizational Analyst

Receives appropriately broad visibility and analytical authority for
dependencies, restructuring, system change, and organizational intelligence.
Leadership does not automatically include Workspace Administration.

## Change and approval philosophy

Most employees should encounter **Suggest an update**, not a direct edit of
approved organizational knowledge. A proposed change should preserve:

- what changed;
- the originating evidence and contributor;
- affected Processes, Roles, Systems, Units, and dependencies;
- who reviewed and approved it;
- unresolved disagreement; and
- the effective and historical result.

Future approval routing should use the connected operating model to recommend
reviewers when a change crosses Process, Unit, Role, or System boundaries. A
reporting manager is not automatically the approver, and a graph connection is
review evidence rather than proof that a reviewer is mandatory.

## Pilot presentation

The private pilot may communicate governance before the complete engine exists,
provided it does not invent Stewards, permissions, approvers, or institutional
policy.

Future read-only Governance sections may show known or explicitly unconfigured
context without enforcing the complete governance engine:

| Surface | Governance context to communicate |
| --- | --- |
| Organization Unit | Steward, visibility scope, contributors, approvers, connected Processes, and organizational context |
| Position | Position Steward, current coverage, Operational Roles, supported Processes, and governance responsibilities |
| Process | Process Steward, contributors, approvers, visibility scope, change impact, and connected Processes that may require review |
| System | System Steward, connected Processes, documented operational reach, and governance context |

When governance data does not exist, the interface should say **Not assigned**,
**Not configured**, or **Needs validation**. It must not infer governance from
Position title, reporting hierarchy, Process ownership, or current assignment.

## Implementation boundary

The complete governance engine remains intentionally deferred. Future work must
separately design and approve:

- identity-provider integration and user-to-Person reconciliation;
- scoped visibility and permission policies;
- Steward identity, scope, delegation, effective timing, and history;
- contribution and proposal records;
- approval rules, cross-functional review, and committees;
- governance workflows and notifications;
- analytical permissions;
- administration policy and audit;
- retention, privacy, and evidence-access rules; and
- dashboards for stewardship and review obligations.

This decision does not authorize schema changes, migrations, new credentials,
environment changes, database writes, JU-specific configuration, or enforcement
UI. The existing temporary private administrator is preparation for one tightly
controlled Workspace Administrator; it is not the final governance model.
