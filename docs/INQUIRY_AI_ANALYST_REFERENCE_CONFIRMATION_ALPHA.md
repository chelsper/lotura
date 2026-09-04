# Inquiry-first AI Analyst & Reference Confirmation Alpha

## Product checkpoint

This checkpoint makes an inquiry-first interview feel like the AI Discovery
Analyst without requiring a Process to exist. Gift Acceptance Policy is the
first benchmark.

The participant can:

1. authorize the existing non-confidential Analyst for one inquiry interview;
2. answer adaptive questions chosen from the inquiry, prior answers, and latest
   working synthesis;
3. ask what Lotura understands, correct the synthesis, skip a question, pause,
   or finish;
4. review a compact **References to confirm** table; and
5. preserve each suggested Unit, Role/person capacity, System, Process, Family,
   or unresolved policy reference as an explicit human decision.

No action creates or changes canonical organizational knowledge.

## Reuse unchanged

- inquiry identity, scope, observations, pause, completion, and human review;
- assistance runs, sources, suggestions, decisions, and request metadata;
- the existing OpenAI provider boundary, model, kill switch, disclosure,
  content checks, one-request limit, `store: false`, and no-tools request;
- Analyst synthesis and adaptive-question response schema;
- Knowledge Outcomes and every proposal, governance, and application boundary;
- current Organization, Structure, Responsibility, Technology, Process, and
  Process Family identities.

## Smallest durable change

### Inquiry Analyst authorization

Add the Process-session Analyst authorization shape to
`discovery_inquiry_sessions` and permit an Analyst assistance run whose exact
session kind is `inquiry`. The existing inquiry observations remain the only
human evidence records.

### Reference confirmation

Add one append-only human-decision table. Each row records:

- exact Organization, inquiry session, Analyst run, and source mention;
- mention sequence, original wording, proposed reference kind, and source
  fingerprint;
- human disposition: confirmed, rejected, or unresolved;
- at most one allowed typed target shape, except a person-capacity confirmation
  may retain the exact Person plus confirmed Position/Operational Role context;
- authenticated actor and transaction time; and
- optional superseded confirmation identity.

Typed targets may reference current Organization Units, Positions,
Operational Roles, Systems, Processes, and Process Families. A policy or other
unmodeled concept is preserved unresolved until a separately designed domain
exists.

## Matching and privacy

Candidate matching runs server-side within the authenticated Organization. It
uses normalized current labels and bounded historical rename records where
available. The provider does not receive the whole organizational catalog.
The existing read-only runtime connection resolves each selected current
identity. The Discovery write connection then validates the exact session,
Analyst run, source observation, and prior decision before appending the human
confirmation; it does not need broader catalog-read authority.

The provider receives only the allowlisted inquiry context already visible in
the session preview. Existing warnings against donor, student, prospect, gift,
wealth, HR, payment, credential, connection-string, and other sensitive
record-level information remain. Person-name matching and Position/Role lookup
are local. A person mention is never silently rewritten or sent as a claim that
the person acted in a particular Role.

## UX

The static catalog remains fallback coverage rather than the primary
conversation. The page prioritizes:

1. the latest working understanding;
2. one useful adaptive question;
3. ordinary-language answer and evidence state;
4. skip, synthesis, correction, pause, and finish actions; and
5. references needing confirmation.

Reference rows show **Mention**, **Suggested match**, **Type and context**, and
**Your decision**. Confirming several visible rows uses one explicit save.
Unresolved rows do not block the interview.

## Authority boundary

AI proposes understanding and possible identity matches. Humans preserve
evidence and confirm reference context. Existing human review determines the
Knowledge Outcome. Existing governed pathways remain the only way to create or
change operating-model knowledge.

## Exact privilege delta

The existing read-only runtime role keeps its catalog privileges. The Discovery
write role keeps its previously reviewed inquiry, observation, and assistance
privileges. Migration `0032` requires only the following additional grants,
with the concrete workspace role substituted for the placeholders:

```sql
GRANT UPDATE (
  analyst_enabled, analyst_authorized_at, analyst_authorization_version
) ON discovery_inquiry_sessions TO <discovery_role>;

GRANT INSERT (
  analyst_turn, analysis_snapshot
) ON discovery_assistance_runs TO <discovery_role>;

GRANT SELECT ON discovery_reference_confirmations TO <discovery_role>;
GRANT INSERT (
  organization_id, inquiry_session_id, inquiry_session_stable_key,
  run_id, run_stable_key, source_observation_stable_key,
  mention_sequence, mention_text, reference_kind, source_fingerprint,
  disposition, organization_unit_id, organization_unit_stable_key,
  role_id, role_stable_key, person_id, person_stable_key,
  position_id, position_stable_key, system_id, system_stable_key,
  process_id, process_stable_key, process_family_id,
  process_family_stable_key, supersedes_confirmation_id,
  supersedes_confirmation_stable_key, actor_identifier
) ON discovery_reference_confirmations TO <discovery_role>;
GRANT USAGE, SELECT ON SEQUENCE discovery_reference_confirmations_id_seq
  TO <discovery_role>;

GRANT SELECT ON discovery_reference_confirmations TO <runtime_role>;
```

Neither role receives confirmation `UPDATE`, `DELETE`, or `TRUNCATE`.
Discovery receives no new canonical operating-model or schema authority, and
runtime remains read-only. Deployment must compare all pre-existing role flags,
memberships, table grants, and business-table data before and after this exact
delta.

## Verification

Focused tests must prove:

- Process-independent adaptive questioning and synthesis;
- one human action produces at most one provider request;
- fixed-catalog fallback remains available;
- same-session and same-Organization source and target constraints;
- no cross-tenant or cross-session confirmation;
- person-to-Position/Role capacity requires explicit confirmation;
- rejected and unresolved mentions contain no typed target;
- correction is append-only and prior decisions are immutable;
- runtime is read-only and Discovery has only exact authorized writes;
- no Process, Family, Role, Unit, Position, System, policy, proposal, history,
  version, or canonical relationship write; and
- zero persisted fictional probe rows after rollback.

## Release sequence

1. approve LAD-069;
2. implement and test generically;
3. run isolated fictional database verification;
4. review and merge the exact commit;
5. separately authorize JU migration and least-privilege rollout;
6. deploy that exact commit to JU Production; and
7. conduct one authenticated Gift Acceptance Policy interview and review its
   reference confirmations.
