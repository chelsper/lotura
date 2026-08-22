# AI-Assisted Discovery non-confidential pilot authorization

**Decision basis:** LAD-066
**Status:** Contract accepted; repository-only D1 authorization and inactive transport foundations implemented; activation and rollout not authorized
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

## Repository-only D1 implementation evidence

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

The foundation intentionally contains no SDK, credential lookup, `process.env`
access, environment value, database migration, runtime route activation, Vercel
change, Neon change, or JU data change. The injected transport has made no real
provider request and cannot run through an application route. The existing
deterministic mocked provider remains the only active application provider.
This means the interface, authorization functions, and transport failure modes
can be reviewed and tested without making external assistance available.

The implementation follows LAD-002, LAD-003, LAD-008, LAD-015 through LAD-018,
LAD-020, LAD-021, LAD-025, LAD-029, LAD-037, LAD-042, LAD-046, LAD-051, LAD-060,
LAD-061, LAD-063 through LAD-066. It extends none of them into live provider
authorization.

## Gate 1 — Provider project and ownership

- [ ] Create or select a dedicated OpenAI API project for the Lotura
      non-confidential pilot.
- [ ] Confirm voluntary API data sharing is disabled.
- [ ] Use a project-scoped server credential with a named owner and documented
      rotation and revocation path.
- [ ] Configure a spending limit and usage alert appropriate to the pilot.
- [ ] Record the exact endpoint, model, prompt-policy version, and provider
      project identity without recording the credential.
- [ ] Keep API call logging **Enabled per call** or stricter and prove every
      Lotura request sets `store: false`.

## Gate 2 — Technical boundary

- [ ] Keep the adapter server-only and disabled by default.
- [ ] Require the exact Lotura Organization and environment allowlist.
- [ ] Prevent public Northstar from initializing or calling the adapter.
- [ ] Send foreground, text-only Responses requests with `store: false`,
      `background: false`, no tools, no conversation, and no previous response.
- [ ] Preserve strict structured output, output bounds, one timeout, and no
      silent retry.
- [ ] Run field allowlisting, size limits, secret rejection, and prohibited
      content rejection before transport.
- [ ] Add the exact context preview and two participant confirmations above.
- [ ] Add a manual kill switch and deterministic standard-question fallback.
- [ ] Keep prompt, answer, and suggestion content out of URLs, analytics,
      ordinary logs, and error output.
- [ ] Preserve LAD-063 source, suggestion, and human-decision provenance without
      creating a provider-debug content copy.
- [ ] Prove the provider cannot create evidence or write any canonical,
      proposal, review, Structure, history, or policy record.

The repository-only foundation implements the static boundary and an injected,
fictional-verified transport. The boxes remain open until an exact provider
project, credential target, runtime configuration, route integration, and
deployment are separately reviewed. Timeout, no-retry behavior, provider-
project identity, content-safe operational logging, persistence provenance,
and write-denial behavior must still be proven against that exact runtime
before any box is closed.

## Gate 3 — Bounded rollout

- [ ] Verify the implementation using fictional fixtures first.
- [ ] Review the exact commit, environment settings, and credential target.
- [ ] Perform read-only Production QA before the first provider request.
- [ ] Separately authorize one non-confidential test request.
- [ ] Review its non-content metadata, behavior, participant choice, cost,
      fallback, and logs before enabling another participant.
- [ ] Demonstrate immediate disablement and manual fallback.

Completing these gates authorizes only the reviewed non-confidential pilot. It
does not authorize confidential data or general external-AI availability.

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
