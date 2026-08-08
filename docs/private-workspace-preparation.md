# Private Workspace Preparation

## Purpose

This document defines the generic preparation boundary for a private Lotura workspace. It does not authorize a deployment, custom domain, database, credential, or institutional dataset.

Lotura may visualize a sanitized working snapshot before every statement has completed institutional approval, provided uncertainty remains explicit and access remains private. Preparation state describes confidence and permitted use; it is not the same as `Process.status` and must not be written into that field.

## Preparation states

### Sanitized working draft

The record is an incomplete working representation based on one or more interviews, observations, documents, or working sessions. It may contain unresolved questions or disagreements.

It may be used in a tightly controlled private preparation workspace only after a human has reviewed the snapshot for prohibited information. The label does not prove that arbitrary free text is safe.

### Validated

An appropriate participant or source has checked the record for factual accuracy within the stated scope. Validation does not mean that every conflict is resolved or that the record is approved for a pilot demonstration.

The preparation register must identify the validating Role and date.

### Approved for pilot

A designated data owner permits the record to be used in the private pilot. This is permission for pilot use, not a claim that the record is formal institutional policy.

The preparation register must identify the approving or validating Role and date. Broader distribution requires a separate decision.

## State rules

- Every operating-model record has exactly one preparation-register entry.
- The visible snapshot label equals the least-mature state included in the snapshot.
- State promotion is deliberate and traceable; a later state never erases sources, questions, or conflicts from the preparation materials.
- `Process.status` continues to mean operational lifecycle (`draft`, `active`, or `archived`). It does not mean working draft, validated, or approved for pilot.
- Preparation state remains outside the Version 0.1 database until a separately approved provenance and knowledge-state model exists.

## Sanitization boundary

Private-workspace snapshots may include only the organizational knowledge needed to understand Roles, Assignments, Processes, Steps, Systems, Exceptions, and Dependencies.

Exclude:

- constituent, donor, student, applicant, prospect, alumni, recipient, gift, payment, transaction, wealth, tax, bank, card, and financial-detail records;
- home addresses, personal phone numbers, birth dates, government identifiers, and unnecessary personal email addresses;
- HR, compensation, performance, leave, health, grievance, disciplinary, or confidential restructuring information;
- credentials, secrets, connection strings, internal security configuration, vulnerabilities, and incident-response material;
- emails, attachments, screenshots, PDFs, exports, or source documents containing real operational records; and
- legal, privileged, contract, or regulated material without separate institutional approval.

Employee assignments should be omitted unless the employee identity is necessary, approved, and appropriate for the pilot. A vacant Role is preferable to an invented or unauthorized person.

## Human review is mandatory

The validation tool checks structure, references, constraints, required attestations, and the permitted field vocabulary. It cannot understand every meaning present in arbitrary free text and cannot certify a dataset as safe.

The human reviewer must:

1. inspect every free-text field;
2. confirm that the snapshot contains no prohibited record or copied source material;
3. confirm that employee identity is necessary and approved;
4. record their organizational Role and review date;
5. preserve unresolved questions and conflicts; and
6. refuse import if the classification or permitted use is ambiguous.

## Access boundary

Temporary-password support prepares the shared application for a future private deployment. It does not authorize exposing a private custom domain.

Before a private domain becomes accessible, the infrastructure phase must separately verify:

- a dedicated deployment and database boundary;
- a SELECT-only runtime database Role;
- a real credential ceremony outside Git and chat;
- durable distributed login throttling or approved deployment protection;
- domain, branding, hosting, and sanitized-data authorization; and
- end-to-end proof that unauthenticated requests cannot reach the operating-model loader.

SSO, broader authorization, uploads, AI, operating-model editing, and sensitive institutional data remain outside this preparation phase.
