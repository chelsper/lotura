# AI-Assisted Discovery Slice C — Prompt Policy v2 Evaluation

**Date:** August 22, 2026

**Decision basis:** LAD-064

**Reviewed repository commit:** `04e8541cd4a71011eb12152d1412b5fb9d594d1a`

**Data classification:** Fictional

**Provider/model:** OpenAI / `gpt-5.6-terra`

**Prompt policy:** `lad-064-eval-v2`

**Reasoning:** Low

## Boundary

The comparison used the same allowlisted `useful-system-follow-up` fixture for
the fictional Campus Printing Process as the version 1 evaluation. It sent no
JU data, private Organization content, participant data, database value,
credential, or source outside that fixture. The request used `store: false`,
background processing disabled, no conversation state, no previous response,
and no tools.

The API key was entered through a hidden terminal prompt, inherited only by the
one Node process, and unset on exit. It was not written to source, disk,
terminal history, logs, or this evidence. The temporary transport and runner
were not added to the repository or deployed.

## Provider result

At `2026-08-22T18:13:07.486Z`, one request completed successfully with 436
input tokens, 86 output tokens, and 522 total tokens. The provider returned
exactly one structured suggestion, as required by prompt policy v2.

## Suggestion returned

“What tools or systems do you use when handing off a print job?”

The provider rationale stated that the evidence mentioned a possible physical
card but did not identify a System or tool used in the handoff. The rationale
is assistance metadata, not evidence.

## Automated review

| Check | Result |
| --- | --- |
| Schema and bounded context valid | Pass |
| Exactly one suggestion | Pass |
| No authority claim | Pass |
| Non-leading language | Pass |
| Exact-text non-repetition | Pass |
| Uncertainty preserved | Pass |
| Content safety | Pass |

## Human review

| Criterion | Result | Reason |
| --- | --- | --- |
| Conversational | Pass | The question is short and uses ordinary language. |
| Faithful to sources | Pass | It invents no System, owner, policy, or conclusion. |
| Non-repetitive | **Fail** | Asking what tools or Systems are used substantially repeats the current question, “Which Systems are used?” |
| Relevant | Pass | It remains within the Systems topic and printing handoff. |

The question is more contextual than the current question, but context alone
does not make it a useful follow-up. The evidence already provides a more
specific unresolved thread: whether and how a physical card is required at a
printer. A materially advancing question would pursue that uncertainty rather
than ask the participant to identify Systems again.

## Outcome

Prompt policy v2 passes the automated gate and succeeds at returning only one
question. It fails the required human non-repetition criterion and therefore
does not pass the LAD-064 release gate.

This result demonstrates why automated exact-text checks cannot establish
semantic non-repetition. Before another provider evaluation, Lotura should
strengthen the fictional prompt and offline evaluation so a follow-up must
address a specific unresolved fact, contradiction, dependency, or uncertainty
from the sources—not merely restate the current topic with more context.

This evaluation does not authorize JU content, a persistent credential,
provider-retention acceptance, production enablement, evidence creation, or any
operating-model write.
