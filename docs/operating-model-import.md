# Validation-only Operating-model Snapshot Format

## Boundary

Phase 1 provides a structural dry-run validator, not a database importer.

```bash
npm run snapshot:validate -- /absolute/path/to/snapshot.json
```

The command reads one local JSON file, performs no network request, imports no database module, and writes nothing. It reports only structural errors, the overall preparation state, and record counts.

Even a valid result always prints:

> VALID STRUCTURE — HUMAN REVIEW STILL REQUIRED

Deterministic validation cannot prove that arbitrary free text is safe or sanitized.

## Document structure

The top-level object contains exactly:

- `formatVersion`: currently `1.0`;
- `manifest`: snapshot identity, scope, time, state, and human-review attestation;
- `operatingModel`: Version 0.1 entities and relationships expressed with stable external keys; and
- `preparationRegister`: source, state, validator, and conflict metadata for every record.

The fictional test document at `tests/fixtures/fictional-operating-model-import.json` is the format example. It must never be replaced with real organizational data.

## Manifest

Required fields:

- `snapshotKey`: lowercase kebab-case snapshot identifier;
- `organizationKey`: the exact external key used by the Organization;
- `scopeLabel`: a concise description of what the snapshot covers;
- `asOf`: an ISO 8601 UTC timestamp;
- `knowledgeState`: `sanitized-working-draft`, `validated`, or `approved-for-pilot`; and
- `sanitizationAttestation`: `humanReviewed: true`, the reviewing Role, and review timestamp.

The attestation records accountability. It is not a machine-generated safety certificate.

## Operating model

The object contains:

- `organization`
- `users`
- `memberships`
- `roles`
- `roleAssignments`
- `systems`
- `processes`
- `processSteps`
- `exceptions`
- `processSystems`
- `processDependencies`

Every record has a lowercase kebab-case `key`. Relationship records receive preparation-only keys even though the current database does not persist those keys. A future separately approved importer would translate the external keys into database identifiers and omit preparation metadata.

The validator uses an exact field allowlist. Unknown fields are rejected, including fields that attempt to add constituent, transaction, wealth, HR, credential, or other out-of-scope structures.

## Preparation register

Every operating-model record requires one entry with:

- `recordType`
- `recordKey`
- `state`
- `sourceType`: `interview`, `document`, `observation`, `working-session`, or `other`
- optional `validatorRole`
- optional `validatedAt`
- `openConflicts`

Validated and pilot-approved entries require a validator Role and date. The manifest state must match the least-mature included entry.

## Deterministic checks

The validator checks:

- exact field vocabulary and required values;
- stable-key uniqueness;
- valid entity and relationship references;
- status and type enums;
- assignment date windows and one active primary assignment per Role;
- Process owner requirements;
- positive, unique Step positions;
- scoped Exception consistency;
- unique Process-System pairs;
- dependency self-reference and duplicate rules;
- complete preparation-register coverage; and
- human-review attestation presence.

## Handling

- Store private snapshot files outside the repository.
- Do not place a snapshot under `db/seeds`, `tests`, application assets, or a pull request.
- Do not include database IDs, credentials, connection strings, or source-document contents.
- Review the validator output and every free-text field manually.
- A valid dry run does not authorize a database import, deployment, or audience.
- Any future write-capable importer requires separate architecture, data, credential, and execution approval.
