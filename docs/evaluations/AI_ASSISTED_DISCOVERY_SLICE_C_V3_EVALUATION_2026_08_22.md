# AI-Assisted Discovery Slice C — Prompt Policy v3 Evaluation

**Date:** August 22, 2026

**Decision basis:** LAD-064

**Reviewed repository commit:** `9b727d59d704cf5ac2cdc079c26519edfc97ec7c`

**Data classification:** Fictional

**Provider/model:** OpenAI / `gpt-5.6-terra`

**Prompt policy:** `lad-064-eval-v3`

**Reasoning:** Low

## Boundary

The comparison used the same allowlisted `useful-system-follow-up` fixture for
the fictional Campus Printing Process as the version 1 and version 2
evaluations. It sent no JU data, private Organization content, participant
data, database value, credential, or source outside that fixture. The request
used `store: false`, background processing disabled, no conversation state, no
previous response, and no tools.

The API key was entered through a hidden terminal prompt, inherited only by the
one Node process, and unset on exit. It was not written to source, disk,
terminal history, logs, or this evidence. The temporary transport and runner
were not added to the repository or deployed.

## Provider result

At `2026-08-22T18:34:28.147Z`, one request completed successfully with 463
input tokens, 83 output tokens, and 546 total tokens. The provider returned
exactly one structured suggestion, as required by prompt policy v3.

## Suggestion returned

“What is the physical card used for at that printer?”

The provider rationale stated that the observation identified a possible
physical-card dependency without saying where it applies or what it is used
for. The rationale is assistance metadata, not evidence.

## Automated review

| Check | Result |
| --- | --- |
| Schema and bounded context valid | Pass |
| Advances an unresolved detail | Pass |
| No authority claim | Pass |
| Non-leading language | Pass |
| Lexical-semantic non-repetition | Pass |
| Uncertainty preserved | Pass |
| Content safety | Pass |

The version 3 automated uncertainty check covered clarity drafts but did not
yet reject a follow-up question that grammatically presupposed an uncertain
source detail.

## Human review

| Criterion | Result | Reason |
| --- | --- | --- |
| Conversational | Pass | The question is short and uses ordinary language. |
| Faithful to sources | **Fail** | Asking what the card is used for assumes it is used, while the source says only that it may be required. |
| Non-repetitive | Pass | The question pursues the physical-card detail rather than repeating the general Systems question. |
| Relevant | Pass | It remains within the printing handoff and the unresolved source detail. |

The question should first preserve the source uncertainty. A safer formulation
would ask whether a physical card is required and only then, if so, what it is
used for.

## Outcome

Prompt policy v3 fixes the measured version 2 repetition failure and advances a
specific unresolved detail. It fails the required human source-fidelity review
because it turns that uncertain detail into a presupposition. Version 3
therefore does not pass the LAD-064 release gate.

Before another provider evaluation, Lotura should require uncertainty-aware
question framing in both the prompt and deterministic fictional evaluator.
This evaluation does not authorize JU content, a persistent credential,
provider-retention acceptance, production enablement, evidence creation, or any
operating-model write.
