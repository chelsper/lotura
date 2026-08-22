# AI-Assisted Discovery confidential private-pilot authorization

**Decision basis:** LAD-065
**Status:** Authorization contract accepted; no private provider use authorized
**Provider documentation reviewed:** August 22, 2026

## Purpose

This checklist separates a promising fictional provider evaluation from
permission to send private organizational knowledge to an external AI service.
Every required item must have attributable evidence for the exact provider
project, Lotura Organization, environment, and participant experience.

Completing this document does not itself authorize a credential, environment
change, deployment, JU configuration, or provider request. Those remain
separate actions at the approval points below.

This checklist governs confidential or otherwise restricted information under
LAD-065. LAD-066 separately permits a bounded pilot using only affirmatively
non-confidential test information under standard provider retention. Completing
that separate path does not complete or weaken any gate in this document.

## Official provider boundary

Current official OpenAI documentation establishes that:

- API data is not used to train or improve OpenAI models unless the customer
  explicitly opts in;
- default abuse-monitoring logs may contain prompts and responses and are
  retained for up to 30 days, subject to stated legal and safety exceptions;
- `store: false` controls Responses application-state storage but does not by
  itself exclude customer content from abuse-monitoring logs;
- Modified Abuse Monitoring and Zero Data Retention require prior OpenAI
  approval and configuration at the API Organization or project level;
- ZDR excludes customer content from abuse-monitoring logs and forces
  `store: false` for Responses and Chat Completions, subject to documented
  endpoint and safety limitations; and
- data residency is a separate project control. It governs supported regional
  storage or processing but does not automatically apply to system data.

Sources:

- [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI abuse-monitoring and retention controls](https://developers.openai.com/api/docs/guides/your-data#data-retention-controls-for-abuse-monitoring)
- [OpenAI Responses storage behavior](https://developers.openai.com/api/docs/guides/your-data#v1responses)
- [OpenAI data residency controls](https://developers.openai.com/api/docs/guides/your-data#data-residency-controls)

## Approved Lotura boundary

The initial JU private pilot requires Zero Data Retention on a dedicated OpenAI
API project. MAM is not equivalent and requires a later, separately approved
exception. Lotura will still use `store: false` as defense in depth.

The first private test must use an isolated non-JU environment and fictional or
explicitly sanitized operational text. A later JU authorization may permit only
the data categories explicitly recorded below.

The request remains:

- server-only;
- foreground and text-only;
- `store: false`;
- `background: false`;
- tool-free;
- independent of conversations and previous responses;
- bounded to the existing allowlisted assistance packet;
- rejected before transport when a secret, prohibited field, or size violation
  is detected; and
- unable to write evidence, proposals, approvals, operating-model records, or
  policy.

## Gate 1 — Exact provider project

- [ ] Record the accountable provider Organization owner.
- [ ] Record the exact API Organization ID and dedicated project ID without
      recording a credential.
- [ ] Capture dated evidence that OpenAI approved ZDR for the exact Organization
      or project.
- [ ] Capture dated evidence that the dedicated project is explicitly set to
      ZDR rather than inheriting an unverified default.
- [ ] Confirm voluntary API data sharing is disabled for the applicable
      Organization and project.
- [ ] Confirm the intended Responses endpoint, exact model, foreground mode,
      text input, and structured output are eligible under that configuration.
- [ ] Record the selected global or regional endpoint and JU's approval of its
      storage and processing posture.
- [ ] Record provider legal or safety retention limitations accepted by the
      institutional approver.

**Gate result:** No private transport implementation or credential configuration
until every item above passes.

### Evidence review — August 22, 2026

A screenshot of the OpenAI Organization **Data controls → Data retention** page
shows **API call logging** set to **Enabled per call**. The page explains that a
Responses request can disable that logging with `store=false`. This confirms the
ordinary per-request application-state control used by LAD-064.

The screenshot does not show an Organization- or project-level **Zero Data
Retention** or **Modified Abuse Monitoring** selection, an OpenAI approval
notice, the dedicated project identity, or the applicable data-sharing setting.
It therefore does not establish ZDR and completes none of the Gate 1 items.
Private transport and JU use remain unauthorized.

## Gate 2 — Institutional authorization

- [ ] Name the JU data owner authorizing the bounded pilot.
- [ ] Name the technical owner, privacy or policy reviewer, incident owner, and
      cost owner.
- [ ] Approve participant-facing disclosure that an external AI service will
      receive the displayed context to suggest wording or a follow-up question.
- [ ] Approve a context preview that appears before the participant requests
      assistance.
- [ ] Approve the permitted data categories.
- [ ] Approve the prohibited data categories.
- [ ] Approve what operational metadata may be retained by Lotura.
- [ ] Confirm that prompt, answer, suggestion, and response content will not
      enter URLs, analytics, ordinary logs, or error output.
- [ ] Approve the incident response and immediate disablement path.

Initial prohibited categories include student, donor, prospect, gift, wealth,
HR, password, credential, connection-string, payment, health, government-ID,
and other direct personal or regulated information. Expanding this list requires
a separate decision and applicable institutional or contractual review.

**Gate result:** No JU configuration or JU content until every item above passes.

## Gate 3 — Isolated implementation and verification

- [ ] Implement a server-only provider adapter that cannot run in public
      Northstar.
- [ ] Use a dedicated project-scoped credential with rotation, revocation, and
      a documented spending limit.
- [ ] Keep assistance disabled by default and require an exact Organization and
      environment allowlist.
- [ ] Add a manual kill switch that immediately restores the deterministic
      standard-question fallback.
- [ ] Prove the participant sees the exact provider context before requesting
      assistance.
- [ ] Prove declining or skipping assistance creates no provider request and no
      evidence.
- [ ] Prove one request cannot retry silently, use tools, create provider state,
      or advance the interview.
- [ ] Prove unavailable, slow, malformed, or unsafe results fall back without
      exposing content.
- [ ] Prove accept, edit, skip, and rejection provenance remains attributable
      without logging participant content.
- [ ] Prove the provider role has no database, schema, canonical Process,
      proposal, review, application, Structure, or history write capability.
- [ ] Complete one isolated fictional or explicitly sanitized private test and
      review its request boundary, provider metadata, behavior, cost, and logs.

**Gate result:** Completing isolated verification does not authorize JU.

## Gate 4 — JU rollout authorization

- [ ] Review all evidence from Gates 1–3.
- [ ] Explicitly authorize the exact commit and Production configuration.
- [ ] Configure only the reviewed server-side credential and enablement values.
- [ ] Perform read-only Production QA before any participant request.
- [ ] Separately authorize one bounded first JU request.
- [ ] Review that request's non-content metadata, participant decision, fallback
      behavior, and provider cost before broader availability.
- [ ] Record who may disable the capability and how quickly disablement was
      verified.

## Evidence that may be retained

Lotura may retain the provider name, model identifier, prompt-policy version,
context fingerprint, source references already permitted by LAD-063, request
time, latency, token counts, cost metadata, outcome category, fallback reason,
and the participant's accept, edit, skip, or reject decision.

Lotura must not retain an additional provider-debug copy of the prompt,
participant wording, full provider response, secret, or prohibited private
content. Existing human evidence and accepted wording remain governed by their
ordinary append-only Lotura records, not by a provider-debug log.

## Separate future decisions

This authorization does not cover:

- MAM in place of ZDR;
- files, images, audio, web search, MCP, Code Interpreter, or other tools;
- provider-managed conversations, vector stores, batches, or background mode;
- broad private Organization enablement;
- regulated or personally identifiable content;
- AI-created evidence, Knowledge Outcomes, proposals, approvals, Process
  versions, Scenarios, policies, or operating-model mutations; or
- AI-suggested structured mappings.
