# AI-Assisted Discovery non-confidential pilot authorization

**Decision basis:** LAD-066
**Status:** Contract accepted; inactive authorization, transport, server-only credential, and authenticated route boundaries implemented; activation and rollout not authorized
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

## Inactive implementation evidence

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

The repository also contains a disconnected server-only OpenAI transport that:

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

The route remains inactive because the pilot mode defaults to disabled, the
kill switch defaults to on, and no credential or allowlist value has been added
to the deployed application. The repository contains no provider SDK,
configured credential value, environment activation, database migration,
Vercel change, Neon change, or JU data change. The deterministic mocked
provider remains the active application provider under the current
configuration.

## Reviewed provider project record

- OpenAI project: **Lotura Non-Confidential Pilot**
- Project ID: `proj_FOHjzH1JYJR7OTn6Hu0KOcuk`
- Service account: `lotura-ai-assistance-preview`
- Assigned role: **Lotura AI Responses Writer**
- Approved permission: `api.responses.write`
- Credential owner: pilot owner
- Local pre-activation storage: macOS Keychain; the value is not recorded in
  Git, this document, chat, or Lotura configuration
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

The credential remains only in the pilot owner's Keychain. It has not been
added to Vercel and the authenticated provider route remains inactive.

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
- [ ] Send foreground, text-only Responses requests with `store: false`,
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
- [ ] Prove the provider cannot create evidence or write any canonical,
      proposal, review, Structure, history, or policy record.

The repository foundation implements the static boundary, injected transport,
inactive server-only credential loader, and authenticated two-step route. The
remaining boxes stay open until fictional route verification and the exact
deployment are separately reviewed. The checked items have repository-level
proof; they must still be re-verified against the exact runtime before the first
provider request.

## Gate 3 — Bounded rollout

- [x] Verify the implementation using fictional fixtures first.
- [ ] Review the exact commit, environment settings, and credential target.
- [ ] Perform read-only Production QA before the first provider request.
- [ ] Separately authorize one non-confidential test request.
- [ ] Review its non-content metadata, behavior, participant choice, cost,
      fallback, and logs before enabling another participant.
- [ ] Demonstrate immediate disablement and manual fallback.

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

## Permitted retained metadata

Lotura may retain the provider, exact model, prompt-policy version, context
fingerprint, already-permitted LAD-063 source references, request time, latency,
token counts, cost metadata, fallback reason, and accept, edit, skip, or reject
decision.

Lotura must not retain an additional provider-debug copy of the submitted
context, participant wording, or full provider response.

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
