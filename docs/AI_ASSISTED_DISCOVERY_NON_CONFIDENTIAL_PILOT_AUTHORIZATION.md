# AI-Assisted Discovery non-confidential pilot authorization

**Decision basis:** LAD-066
**Status:** Contract accepted; one bounded JU Production request completed and immediately disabled; broader rollout not authorized
**Provider documentation reviewed:** August 22, 2026

## Purpose

This contract permits a proportionate external-AI test when the submitted
Processes, procedures, and participant wording are deliberately
non-confidential. A private or authenticated Lotura workspace does not by
itself make every item confidential.

The content classification controls this path. If confidential, personal,
regulated, credential, payment, security-sensitive, or otherwise prohibited
information enters scope, external assistance must stop and LAD-065 applies.

## Accepted provider boundary

Current official OpenAI documentation establishes that:

- API data is not used to train or improve OpenAI models unless the customer
  explicitly opts in;
- default abuse-monitoring logs may contain prompts and responses and are
  retained for up to 30 days, subject to stated legal and safety exceptions;
- `store: false` prevents the normal stored Responses record but does not remove
  abuse-monitoring retention;
- when ZDR is not enabled, supported models may use encrypted prompt caching in
  GPU-local application state with a documented expiration of no more than 24
  hours; and
- ZDR and MAM remain available as separately approved stronger controls but are
  not required for this explicitly non-confidential test.

Sources:

- [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI abuse-monitoring retention](https://developers.openai.com/api/docs/guides/your-data#data-retention-controls-for-abuse-monitoring)
- [OpenAI Responses storage behavior](https://developers.openai.com/api/docs/guides/your-data#v1responses)

The pilot owner explicitly accepts those standard provider behaviors only for
the non-confidential information permitted below.

## Allowed test content

The pilot may send bounded text describing Processes and procedures that the
pilot owner is comfortable disclosing to OpenAI for product testing. Examples
include ordinary sequence, handoff, system-use, exception, boundary, and
responsibility descriptions that contain no prohibited information.

The initial pilot must not send:

- student, donor, prospect, gift, wealth, HR, health, payment, financial-account,
  government-ID, or other personal or regulated information;
- passwords, secrets, API keys, database credentials, connection strings,
  authentication details, or private tokens;
- security configurations, exploitable weaknesses, restricted building or
  access-control details, incident-response secrets, or similarly sensitive
  operational information;
- confidential contracts, legal advice, privileged communications, unpublished
  personnel decisions, or content the participant is not authorized to share;
  or
- files, images, audio, links, tools, web searches, or provider-managed stored
  knowledge.

The exclusion applies to the entire provider packet, including prior evidence,
documented context, current participant wording, labels, and free-form notes.

## Participant disclosure and confirmation

Immediately before each provider request, Lotura must show the exact bounded
context and state in conversational language:

> Lotura will send the information shown here to OpenAI to suggest one helpful
> question or clearer wording. Do not continue if it contains confidential,
> personal, student, donor, HR, payment, credential, or security-sensitive
> information. OpenAI may retain submitted content in abuse-monitoring systems
> for up to 30 days. Nothing will be sent unless you continue.

The participant must affirm both:

- [ ] I reviewed the displayed context and it contains only non-confidential
      test information that I am authorized to share.
- [ ] I understand the stated provider retention and want Lotura to request
      assistance.

Declining, leaving, or failing either confirmation makes no request, creates no
evidence, and leaves the manual interview path available.

## Implementation and rollout evidence

The approved repository foundation now provides:

- a server-only wrapper around the pilot policy and request builder;
- disabled-by-default configuration with a separately default-engaged manual
  kill switch;
- exact authenticated Organization and deployment-environment allowlists;
- an explicit public Northstar and fixture-workspace rejection;
- the exact bounded provider context and a stale-context fingerprint guard;
- the disclosure and both participant confirmations above;
- allowlisted source fields, input-size limits, secret rejection, and rejection
  of obvious personal-identifier and payment patterns before authorization;
- a foreground, text-only, `store: false`, `background: false`, tool-free,
  conversation-free, previous-response-free structured request builder; and
- deterministic fallback to the regular interview questions.

The repository also contains a server-only OpenAI transport that:

- accepts its credential and fetch implementation only through explicit server
  injection and performs no `process.env` lookup;
- requires the enabled exact Organization, environment, and reviewed OpenAI
  project configuration before transport;
- sends one POST only to the Responses endpoint with the reviewed project
  header and the pinned `gpt-5.6-terra` / `lad-064-v4` contract;
- uses one bounded timeout and abort with no retry;
- bounds and validates the outer provider response, exact model, completed
  assistant message, optional reasoning item, structured suggestion, and
  absence of tool output;
- exposes only permitted model, project, prompt-policy, token-count, request-
  count, and status metadata; and
- returns content-safe manual fallback reasons without logging provider,
  participant, or error content.

The repository now also contains a server-only credential boundary. It reads
only `LOTURA_AI_ASSISTANCE_PILOT_OPENAI_API_KEY`, and only after the mode,
kill-switch, authenticated-workspace, Organization, deployment-environment, and
reviewed-provider-project checks all pass. It never falls back to
`OPENAI_API_KEY`, never exposes the value through a `NEXT_PUBLIC_` variable,
never returns the value, and never logs the value. Disabled and kill-switch
paths do not require the credential.

The authenticated Discovery Server Actions now provide the only application
path to this boundary. They rebuild the Organization-scoped context, return the
exact preview without making a provider request, require both confirmations,
rebuild and fingerprint the context again, and only then permit one transport
attempt. A successful response is persisted through the existing append-only
LAD-063 run, source, and suggestion records before it is shown. No browser-
callable API endpoint or provider-content debug log was added.

The reviewed allowlists and sensitive credential are now configured only for
JU Production. The kill switch is engaged again, so the deterministic mocked
provider is the active application path under the current deployment. The
rollout added no provider SDK, database migration, Neon privilege, or canonical
operating-model write.

## Reviewed provider project record

- OpenAI project: **Lotura Non-Confidential Pilot**
- Project ID: `proj_FOHjzH1JYJR7OTn6Hu0KOcuk`
- Service account: `lotura-ai-assistance-preview`
- Assigned role: **Lotura AI Responses Writer**
- Approved permission: `api.responses.write`
- Credential owner: pilot owner
- Credential storage: project-scoped value configured only as a Vercel
  Production sensitive variable; the value is unreadable after entry and is
  not recorded in Git, this document, chat, or ordinary Lotura configuration
- Rotation and revocation: create and verify a replacement project-scoped
  service-account credential, deploy it through the approved secret workflow,
  then revoke the prior credential from the OpenAI project
- Endpoint: `https://api.openai.com/v1/responses`
- Model: `gpt-5.6-terra`, low reasoning
- Prompt policy: `lad-064-v4`
- API call logging: **Enabled per call**; every constructed request sets
  `store: false`
- Voluntary provider sharing: **Disabled** for response feedback,
  evaluation/fine-tuning data, and API inputs and outputs; verified in the
  OpenAI organization data controls on August 25, 2026
- Cost control: pilot usage alert configured; application request count remains
  bounded to one request with no retry

The credential is deployed only through the reviewed Vercel sensitive-variable
workflow. The provider route is disabled again by the manual kill switch.

The implementation follows LAD-002, LAD-003, LAD-008, LAD-015 through LAD-018,
LAD-020, LAD-021, LAD-025, LAD-029, LAD-037, LAD-042, LAD-046, LAD-051, LAD-060,
LAD-061, LAD-063 through LAD-066. It extends none of them into live provider
authorization.

## Gate 1 — Provider project and ownership

- [x] Create or select a dedicated OpenAI API project for the Lotura
      non-confidential pilot.
- [x] Confirm voluntary API data sharing is disabled.
- [x] Use a project-scoped server credential with a named owner and documented
      rotation and revocation path.
- [x] Configure a spending limit and usage alert appropriate to the pilot.
- [x] Record the exact endpoint, model, prompt-policy version, and provider
      project identity without recording the credential.
- [x] Keep API call logging **Enabled per call** or stricter and prove every
      Lotura request sets `store: false`.

## Gate 2 — Technical boundary

- [x] Keep the adapter server-only and disabled by default.
- [x] Require the exact Lotura Organization and environment allowlist.
- [x] Prevent public Northstar from initializing or calling the adapter.
- [x] Send foreground, text-only Responses requests with `store: false`,
      `background: false`, no tools, no conversation, and no previous response.
- [x] Preserve strict structured output, output bounds, one timeout, and no
      silent retry.
- [x] Run field allowlisting, size limits, secret rejection, and prohibited
      content rejection before transport.
- [x] Add the exact context preview and two participant confirmations above.
- [x] Add a manual kill switch and deterministic standard-question fallback.
- [x] Keep prompt, answer, and suggestion content out of URLs, analytics,
      ordinary logs, and error output.
- [x] Preserve LAD-063 source, suggestion, and human-decision provenance without
      creating a provider-debug content copy.
- [x] Prove the provider cannot create evidence or write any canonical,
      proposal, review, Structure, history, or policy record.

The repository foundation, fictional route verification, exact deployment, and
one bounded Production request now verify the complete technical boundary.

## Gate 3 — Bounded rollout

- [x] Verify the implementation using fictional fixtures first.
- [x] Review the exact commit, environment settings, and credential target.
- [x] Perform read-only Production QA before the first provider request.
- [x] Separately authorize one non-confidential test request.
- [ ] Review its non-content metadata, behavior, participant choice, cost,
      fallback, and logs before enabling another participant.
- [x] Demonstrate immediate disablement and manual fallback.

Completing these gates authorizes only the reviewed non-confidential pilot. It
does not authorize confidential data or general external-AI availability.

### Fictional route verification record

On August 25, 2026, exact application commit
`fba8e308856853f236da4f90df04100edf96397c` passed the repository's 20 focused
non-confidential authorization, authenticated-route, runtime, and transport
checks using fictional contexts and an injected fictional provider response.
The full repository verification for the same application commit also passed
414 tests, TypeScript, ESLint, and the production build before the commit was
pushed to `origin/main`.

This verification made no external provider request, read no service-account
credential, changed no environment setting, and wrote no Neon, JU, or canonical
operating-model data. It does not satisfy the remaining live-provider or
deployed-environment gates.

### Production read-only QA record

On August 25, 2026, authenticated read-only QA verified the JU Production
deployment `dpl_BQs8Vh981m14Z1WwChRxVUDF16bJ` at application commit
`cf6a144`. That deployment includes the reviewed external-assistance route from
commit `fba8e308856853f236da4f90df04100edf96397c`, completed its Vercel build,
and reported **Ready**.

The authenticated JU Discovery workspace and an in-progress interview loaded
without browser console warnings or errors. The interview showed the reviewed
external-assistance disclosure, identified existing assistance as mocked and
review-required, and preserved the regular manual question path.

Production contained none of the `LOTURA_AI_ASSISTANCE_PILOT_*` environment
variables. Therefore the route remained disabled, the kill-switch boundary
remained fail-closed, and no deployed credential was available to the
application. The reviewed credential target remains the OpenAI project and
service account recorded above; the credential itself remains only in the
pilot owner's Keychain.

This QA submitted no form, invoked no assistance action, made no external
provider request, read no credential, changed no environment setting, and
wrote no Neon, JU, proposal, evidence, or canonical operating-model data. It
does not authorize activation or the first billable request.

### First bounded Production request record

On August 26, 2026, exact application commit
`0d2b9ea1e243d1dc3a22fc9e39417bc42d8e68da` was deployed with the reviewed
Production-only Organization, environment, provider-project, credential, and
pilot settings. The pilot owner reviewed the exact displayed context for JU
interview `e717c779-6856-4466-baed-f0965a299f77`, affirmed both required
statements, and separately authorized one request.

The request ran on deployment `dpl_HmfJY5FguKMogfa4uoi8LbknUVED` and returned
one `OpenAI assistance · review required` suggestion with two attributable
Lotura sources. The page still reported one question reached and zero
observations. The suggestion did not advance the interview, create evidence,
or write a canonical, proposal, review, Structure, history, or policy record.

Vercel recorded the interview POST as HTTP 200 with an empty application log
message; no submitted or returned content appeared in the reviewed Production
logs. Immediately afterward, the kill switch was set back to `on` and
deployment `dpl_6RwUHyc4JjcpXDUk2Mke88Bai3jR` reached Ready and became the
Production alias. No second provider request was made.

The repository now prepares typed token, latency, provider-project, and
rate-versioned estimated-cost metadata on future successful external assistance
runs. The values appear only in a collapsed, read-only request-details section;
no prompt, answer, or provider-response copy is added. The first Production run
predates this persistence and is intentionally not inferred or backfilled.

On August 27, 2026, exact commit
`bf2649cba9ae0c17ee668e9382f671c1a0c216b0` and migration `0030` passed
isolated fictional verification at journal `31/31`. The complete-or-empty
metadata constraint, versioned cost basis, column-specific write boundary,
append-only history, and runtime read-only access passed. The verifier made no
OpenAI request or canonical write and rolled back every fictional row and
temporary role.

Gate 3 therefore remains open until migration `0030` is migrated and deployed
to JU through the separately controlled rollout, one separately authorized
future request proves the metadata path, and the pilot owner's accept, edit,
skip, or reject decision is reviewed.

## Permitted retained metadata

Lotura may retain the provider, exact model, prompt-policy version, context
fingerprint, already-permitted LAD-063 source references, request time, latency,
token counts, cost metadata, fallback reason, and accept, edit, skip, or reject
decision.

Lotura must not retain an additional provider-debug copy of the submitted
context, participant wording, or full provider response.

The initial cost basis is the official
[GPT-5.6 Terra model pricing](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
recorded on August 26, 2026: $2.00 per million uncached input tokens, $0.20 per
million cached input tokens, and $12.00 per million output tokens. Lotura stores
the resulting rounded micro-dollar estimate together with a versioned basis key
so a later price change cannot silently rewrite historical estimates. Provider
billing remains the final source.

## Stop conditions

External assistance must stop immediately when:

- the content is or may be confidential or prohibited;
- a participant cannot affirm the classification and authority statements;
- the project, credential, Organization, environment, model, or prompt policy
  differs from the reviewed configuration;
- the provider boundary, disclosure, logging exclusion, cost control, or kill
  switch cannot be verified; or
- a provider or Lotura failure cannot fall back without exposing content.

The next request may occur only after the stop condition is resolved and the
applicable decision is reviewed. Confidential use returns to LAD-065.
