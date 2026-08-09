# Organization Structure Resolution & Approval v0.1

## Purpose

Organization Structure Resolution & Approval v0.1 helps an administrator answer:

> Have we reviewed this source enough to use it as the basis for an organizational structure?

The experience sits between the browser-local workbook Preview and any future importer. It does not persist an organizational structure, establish institutional truth, or authorize a database import.

The workflow is:

**Source evidence → Issue triage → Resolution workbench → Readiness review → Explicit local approval**

## Three separate concepts

### Source evidence

Source evidence is the immutable information parsed from the selected workbook. Resolution decisions never rewrite a source cell, manager value, title, unit, or row. The workbook is evidence, not truth.

### Review decisions

Review decisions are reversible interpretations made during the current browser session. Each decision records:

- the exact source-row keys affected;
- the issue group being treated;
- the chosen treatment;
- a source candidate when a decision requires one; and
- a reason or note when the treatment requires one.

“Confirm” in this experience means only: **Confirm how this evidence should be treated for the proposed import basis.** It never means that Lotura has confirmed organizational truth.

### Approved for import

Approved for import is an explicit local decision that the reviewed, included subset is suitable as the basis for a future import.

> Approved for import — local session only. Nothing has been saved or imported.

This state never means imported, activated, institutionally approved truth, or current organizational structure.

## Transient state boundary

The workbook and every review decision remain in React/browser memory only. v0.1 does not use:

- `localStorage`, `sessionStorage`, or IndexedDB;
- cookies for workbook or review content;
- a route handler, server action, upload endpoint, or storage API;
- a database or Neon write;
- an export package; or
- telemetry containing source values.

Refreshing or closing the tab destroys the review session, including local approval. This is deliberate. The first implementation validates the resolution model and user experience without creating an inadequately governed institutional staging store.

The server page still performs the authoritative workspace-access check before rendering the browser-local experience. Parsing and review begin only after that check succeeds.

## Issue treatment

The workbench groups homogeneous evidence so large organizations do not require a forced row-by-row review. It supports search, issue/status filters, next-unresolved navigation, exact evidence lists, blocker and warning counts, and a treatment impact preview before a grouped decision is applied. It deliberately has no quality score, global resolve-all action, or approve-all-clean-rows shortcut.

Supported review questions include:

- duplicate Person candidates;
- ambiguous, unresolved, blank, self-referencing, and cyclic manager evidence;
- exact duplicate source rows;
- missing Organization Unit or location context;
- interim, acting, or temporary wording;
- possible vacancy evidence;
- the largest source-derived reporting span;
- invalid or conflicting direct-report counts;
- records that should be excluded from the proposed basis; and
- questions that require authoritative information outside the source.

An exclusion changes only the included subset. It does not delete source evidence. Interim wording can be preserved without creating a PositionAssignment or RoleCoverage assertion. Reporting hierarchy still never implies Process ownership, and Position title still never creates an Operational Role.

Matching names may be treated as distinct Person candidates or as evidence about one proposed Person candidate. Either treatment requires a reason, preserves every original row, and remains subject to the separate stable-identity reconciliation decision.

## Blockers and warnings

A deterministic blocker disables local approval while included evidence remains unresolved. Examples include:

- a reporting cycle or self-reporting relationship;
- an ambiguous or unresolved manager relationship;
- an unclassified blank manager;
- unresolved duplicate Person candidates or exact duplicate rows;
- an unresolved source-record conflict such as incompatible direct-report evidence;
- a row that identifies neither a Person candidate nor a Position candidate;
- an issue explicitly marked as requiring authoritative external information;
- no reviewed source date;
- no documented stable Person/Position identity-reconciliation strategy;
- no Organization scope;
- an empty included subset; or
- a required decision reason, candidate, or approval attestation that is missing.

A warning is non-blocking in substance but must still receive an explicit treatment before approval. Examples include preserving temporary wording without inferring coverage, keeping a possible-vacancy question without asserting vacancy, omitting unavailable Unit context, or acknowledging the largest documented reporting span. The span is documented reach, not workload, performance, importance, or risk.

Readiness is recalculated from immutable evidence plus current session decisions after every change. Reversing a decision also reverses its readiness effect. Any change after local approval clears that approval.

## Approval attestation

Local approval requires the administrator to attest that:

- the result is only a proposed import basis, not an imported, activated, or current structure;
- a human reviewed the included evidence, limitations, and required sanitization; and
- every decision and the approval itself will be lost when the browser session ends.

Automated checks can detect deterministic structural and preparation violations. They cannot prove arbitrary free text is safe, complete, authoritative, or institutionally approved. Human sanitization and governance review remain required.

## Future authenticated staging

A real multi-session institutional review will eventually need an authenticated, encrypted staging capability with explicit authorization, provenance, retention, audit history, concurrency and conflict rules, and source-value access controls. An exportable review package may also be useful, but must not be introduced before encryption, signing, identity, expiry, and re-import validation are designed.

That future work is separate from the permanent Organization Structure domain and from the importer. The v0.1 local session does not decide whether review artifacts become persisted domain entities, short-lived staging records, or signed encrypted packages.

## Deferred governance and schema questions

Before importer or persistence design, Lotura still needs explicit decisions about:

- stable Person and Position source identifiers and reconciliation;
- Organization Unit semantics and hierarchy;
- evidence provenance, authority, sensitivity, retention, and access;
- Position and reporting effective dates;
- treatment of records outside the approved source scope;
- who may review, approve, supersede, or revoke a review package;
- whether approval applies to a source, subset, version, or import plan;
- concurrent review and disagreement preservation;
- the transactional import boundary and rollback behavior; and
- the relationship between a staged approval and institutional governance approval.

No Version 0.1 schema, migration, database, or importer change is authorized by this document.
