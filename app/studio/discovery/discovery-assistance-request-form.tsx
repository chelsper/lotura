"use client";

import { useActionState } from "react";

import { Alert, Button, FieldLabel } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import {
  requestInquiryDiscoveryAssistanceAction,
  requestProcessDiscoveryAssistanceAction,
} from "./actions";

type Props = {
  inquiryId?: string;
  promptKey: string;
  revision: number;
  sessionId: string;
  sessionKind: "process" | "inquiry";
};

function SharedFields({
  inquiryId,
  promptKey,
  revision,
  sessionId,
}: Omit<Props, "sessionKind">) {
  return (
    <>
      {inquiryId ? <input name="inquiryId" type="hidden" value={inquiryId} /> : null}
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="expectedRevision" type="hidden" value={revision} />
      <input name="promptKey" type="hidden" value={promptKey} />
    </>
  );
}

export function DiscoveryAssistanceRequestForm(props: Props) {
  const requestAction = props.sessionKind === "process"
    ? requestProcessDiscoveryAssistanceAction
    : requestInquiryDiscoveryAssistanceAction;
  const [questionState, questionAction, questionPending] = useActionState(
    requestAction,
    initialDiscoveryActionState,
  );
  const [clarityState, clarityAction, clarityPending] = useActionState(
    requestAction,
    initialDiscoveryActionState,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        action={questionAction}
        className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
      >
        <SharedFields {...props} />
        <input name="assistanceKind" type="hidden" value="question_suggestions" />
        <input name="originalText" type="hidden" value="" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Ask something more useful
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Lotura can suggest a more focused question from the context already attached to this interview.
        </p>
        <label className="mt-4 block">
          <FieldLabel>What would you like to focus on? (optional)</FieldLabel>
          <input
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
            maxLength={2000}
            name="focus"
            placeholder="For example: what changed, who else is involved, or where the handoff breaks down"
          />
        </label>
        {questionState.status === "error" ? (
          <Alert className="mt-3" tone="error">{questionState.message}</Alert>
        ) : null}
        <Button className="mt-4" disabled={questionPending} size="sm" type="submit">
          {questionPending ? "Preparing suggestions…" : "Suggest a better question"}
        </Button>
      </form>

      <form
        action={clarityAction}
        className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
      >
        <SharedFields {...props} />
        <input name="assistanceKind" type="hidden" value="clarity_draft" />
        <input name="focus" type="hidden" value="" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Make quick notes easier to read
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Paste rough notes and review a clearer draft before anything becomes a saved answer.
        </p>
        <label className="mt-4 block">
          <FieldLabel>Your rough notes</FieldLabel>
          <textarea
            className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
            maxLength={10000}
            name="originalText"
            placeholder="Type naturally. You will review the draft before preserving it."
            required
          />
        </label>
        {clarityState.status === "error" ? (
          <Alert className="mt-3" tone="error">{clarityState.message}</Alert>
        ) : null}
        <Button className="mt-4" disabled={clarityPending} size="sm" type="submit">
          {clarityPending ? "Preparing draft…" : "Help make this clearer"}
        </Button>
      </form>
    </div>
  );
}
