# Process Acquisition

## Purpose

Process Acquisition is the future Lotura experience for bringing knowledge about how work gets done into the organization’s operating model.

Instead of presenting a single **Create Process** action, Lotura should ask how the user wants to begin:

- **Interview me**
- **Upload SOP**
- **Upload PDF**
- **Upload Visio**
- **Upload flowchart**
- **Import existing documentation**
- **Whiteboard mode**
- **AI conversation**
- **Start from scratch**

These are different acquisition paths, not different standards of truth. Every path should preserve its source material, surface uncertainty, and lead through human review before it changes the approved operating model.

This document describes the future product concept and architectural principles. It is not an implementation plan and does not change Version 0.1.

## Core principle

> Lotura should preserve observations before establishing organizational truth.

Acquired material is evidence about a process. It may describe intended policy, actual practice, a historical state, a proposed improvement, a local variation, or one participant’s perspective. Lotura should not assume that an uploaded document or a confident interview answer is the complete and current process.

Process Acquisition should therefore produce a reviewable process observation or draft, not silently publish an authoritative process.

## From creation to acquisition

“Create Process” implies that process knowledge begins as an empty record. In reality, organizations already carry that knowledge across people, documents, diagrams, systems, habits, and exceptions.

Process Acquisition recognizes that the first product question is not only “What process should we create?” but also:

- Where does the knowledge currently live?
- Who understands the work from different perspectives?
- Does the source describe intended or observed practice?
- When and where was it valid?
- What is missing, uncertain, or disputed?
- What must be reconciled before the organization approves it?

The acquisition experience should meet users where their knowledge already exists while preserving the evidence needed to understand it responsibly.

## Acquisition paths

### Interview me

A guided interview helps a participant describe the process in their own words.

It should explore:

- the purpose and intended outcome;
- triggers, inputs, and completion conditions;
- sequence and decision points;
- roles, current participants, and handoffs;
- systems and external services used;
- exceptions, alternate paths, and escalation;
- timing, cadence, and dependencies;
- differences between documented and actual practice; and
- friction, workarounds, risk, and improvement ideas.

The resulting interview should remain attributable to the participant, time, scope, and questions asked. It is an observation to review and reconcile, not an automatic process definition.

### Upload SOP

This path accepts a standard operating procedure or similar formal process document.

Lotura should preserve the original document and identify possible process elements such as purpose, owner, steps, systems, exceptions, timing, dependencies, and approval metadata. It should also identify ambiguities, missing relationships, and language that appears normative but may not reflect current practice.

An SOP is evidence of an intended or previously approved definition. Its existence does not prove that employees follow it, that it remains current, or that it captures exceptions.

### Upload PDF

This path accepts a PDF that may contain text, scanned pages, tables, forms, diagrams, or a combination of them.

Lotura should preserve page-level provenance and distinguish extracted text from interpreted structure. Scanned or visually complex content may require review because reading order, labels, arrows, footnotes, and annotations can materially change meaning.

A PDF is a container, not a guarantee of document type, authority, completeness, or accessibility.

### Upload Visio

This path accepts a Microsoft Visio diagram or export.

Lotura should preserve the original shapes, labels, connectors, swimlanes, pages, and available metadata. It may propose process steps, roles, decision points, systems, and dependencies, but it should not assume that every connector is a sequence or that every swimlane represents accountable ownership.

Unsupported shapes, macros, external links, or ambiguous connector semantics should be surfaced explicitly rather than discarded silently.

### Upload flowchart

This path accepts a flowchart as an image, diagram, or supported structured format.

Lotura should identify possible nodes, decisions, branches, loops, participants, and systems while keeping a visible link to the source region that supports each interpretation. It should distinguish what was directly read from the flowchart from relationships inferred during review.

The acquisition should preserve loops and alternate paths rather than flattening them into a misleading linear sequence.

### Import existing documentation

This path brings in a collection of existing material from an approved source, such as a document repository, knowledge base, shared drive, or exported archive.

Lotura should preserve:

- the source system and original location;
- document identity and available version metadata;
- authorship, ownership, and timestamps where authorized;
- folder, link, or collection context;
- access and confidentiality boundaries;
- duplicate and related-document relationships; and
- the distinction between current, historical, superseded, and unknown status.

Importing a repository should not publish every document as a process. Lotura should help users identify candidate process knowledge, duplicates, conflicts, gaps, and material requiring classification.

### Whiteboard mode

Whiteboard mode supports collaborative discovery when process knowledge is incomplete, distributed, or easier to express spatially.

Participants should be able to capture steps, roles, systems, handoffs, decisions, exceptions, dependencies, questions, evidence, and improvement ideas without prematurely forcing them into an approved structure.

The whiteboard should preserve authorship and unresolved items. Converting the board into a process draft should be an explicit, reviewable action, and the original board should remain available as acquisition evidence.

### AI conversation

An AI conversation helps a user explore and articulate process knowledge conversationally. It may ask follow-up questions, notice missing context, propose structure, identify possible conflicts, and summarize what it heard.

AI should clearly distinguish:

- the user’s statements;
- content retrieved from approved sources;
- deterministic facts from the operating model;
- AI interpretations or suggested structure; and
- unresolved questions.

AI must not invent operational facts, select the authoritative account, resolve disagreement, or publish organizational truth. Its output remains attributable, reviewable, correctable, and subject to the same reconciliation and approval rules as every other acquisition path.

### Start from scratch

This path provides a structured blank canvas for a user who already knows what should be documented or wants to propose a new process.

It should support direct entry of purpose, owner role, steps, responsibility, systems, exceptions, and dependencies while allowing incomplete drafts. Even manually entered content should retain authorship, scope, timing, and review status.

Starting from scratch is one acquisition method among many, not the default assumption about where process knowledge comes from.

## A shared acquisition lifecycle

All acquisition paths should converge on a consistent knowledge lifecycle:

1. **Choose a source** — identify how the knowledge will enter Lotura.
2. **Establish scope and consent** — define the organization, process area, participants, permitted material, and access boundaries.
3. **Preserve the source** — retain the original artifact, conversation, observation, or manual contribution with provenance.
4. **Extract candidate knowledge** — identify possible processes, roles, assignments, steps, systems, exceptions, dependencies, and improvements.
5. **Review the interpretation** — let users correct structure, reject unsupported inferences, and identify missing evidence.
6. **Compare and detect conflicts** — surface differences across sources without deciding automatically which source is correct.
7. **Reconcile** — gather context, establish consensus or accepted divergence, and preserve unresolved questions.
8. **Approve** — authorize an operating-model definition through an explicit governance process.
9. **Publish a version** — record what the organization accepted at a point in time without erasing the source evidence.
10. **Observe and improve** — compare the approved definition with later practice, proposed improvements, results, and historical states.

Skipping extraction should be possible when a user only wants to preserve evidence. Skipping review and approval should not silently establish organizational truth.

## Provenance and evidence

Every acquired claim should eventually be able to answer:

- Who or what supplied it?
- When was it supplied or observed?
- What organization, team, location, process, or period does it concern?
- Where in the original material is the supporting evidence?
- Was it stated directly, extracted deterministically, or inferred?
- Is it intended practice, observed practice, a historical record, or a proposed change?
- Has it been reviewed, reconciled, approved, superseded, or disputed?

Users should be able to inspect the source behind a proposed step, owner, system, exception, or dependency. Lotura should never convert an inference into an unattributed fact.

## Conflict Detection and reconciliation

Multiple acquisition paths may produce different accounts of the same process. Those differences are a feature of knowledge capture, not a failure of ingestion.

> Disagreement is data. Lotura should surface it, not smooth it over.

Process Acquisition should feed Conflict Detection for disagreements and sequence, owner, system, timing, exception, and terminology conflicts. Context may reveal that apparently conflicting accounts describe different periods, teams, locations, process versions, or legitimate alternate paths.

Reconciliation may establish consensus, accepted divergence, an approved decision, or an unresolved question. The original evidence and dissent should remain historically traceable.

## Continuous Improvement

Acquisition may uncover friction, workarounds, risk, or improvement ideas before the current operating model is fully reconciled. Lotura should preserve those observations without mixing them into the approved process definition.

Future FLOW experiences should distinguish:

- the current operating model;
- proposed improvements;
- completed improvements; and
- historical operating models.

An uploaded future-state diagram or an interview suggestion is not evidence that a change has been approved, implemented, measured, or sustained.

## User experience principles

The acquisition entry point should:

- lead with the user’s available source rather than product terminology;
- explain what Lotura will preserve, extract, and ask the user to review;
- make confidentiality, participant consent, and organizational scope visible;
- support pause, resume, correction, and source replacement;
- show progress without implying that extraction equals completion;
- preserve accessibility across document, conversational, and visual paths;
- keep drafts and observations visibly distinct from approved processes; and
- make unsupported or low-confidence interpretations easy to inspect and reject.

The interface may recommend an acquisition path based on the material the user has, but it should not prevent users from combining paths. A process may begin with an SOP, gain actual-practice evidence through interviews, and be reconciled on a whiteboard.

## Security, privacy, and governance

Acquired material may contain personal data, confidential policy, credentials, client information, legal advice, security architecture, or other content that does not belong in the operating model.

Future design must address:

- organization isolation and least-privilege access;
- explicit authorization for repositories and third-party sources;
- participant notice and consent for interviews and recordings;
- malware, macro, link, and file-type handling;
- sensitive-data detection, redaction, and retention;
- source-level access controls and derived-data permissions;
- deletion and legal-hold responsibilities;
- auditability of extraction, review, approval, and publication; and
- protection against instructions embedded in imported content that attempt to manipulate AI behavior.

Import access should be read-only by default. Lotura should not modify source documents or connected repositories as a side effect of acquisition.

## Non-goals

Process Acquisition is not intended to:

- declare an uploaded artifact authoritative automatically;
- treat documentation as proof of actual practice;
- replace interviews, observation, facilitation, or accountable review;
- force every source into one linear process;
- eliminate disagreement through automated merging;
- allow AI to invent, approve, or publish operational truth;
- turn every imported document into a process;
- overwrite source material or historical operating-model versions; or
- implement a custom acquisition pipeline for one organization.

## Version 0.1 boundary

Process Acquisition is an intentionally deferred Knowledge Capture capability. This concept does not change the Version 0.1 schema, migrations, Process Explorer, FLOW Analysis, live Neon adapter, environment configuration, or runtime behavior.

Future domain design must define observations, sources, artifacts, extracted claims, provenance, confidence and uncertainty, acquisition sessions, conflict links, reconciliation, approval, process versions, access controls, retention, and same-organization safeguards before implementation begins.
