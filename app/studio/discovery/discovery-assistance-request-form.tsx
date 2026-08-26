"use client";

import { useActionState } from "react";

import { Alert, Button, FieldLabel } from "../../ui/primitives";
import {
  initialDiscoveryAssistanceRequestState,
  type DiscoveryAssistanceRequestState,
} from "./action-state";
import {
  confirmInquiryOpenAIDiscoveryAssistanceAction,
  confirmProcessOpenAIDiscoveryAssistanceAction,
  requestInquiryDiscoveryAssistanceAction,
  requestProcessDiscoveryAssistanceAction,
} from "./actions";
import { DiscoveryAssistancePilotAuthorization } from "./discovery-assistance-pilot-authorization";

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

function ExternalReviewForm({
  assistanceKind,
  confirmAction,
  inquiryId,
  promptKey,
  revision,
  sessionId,
  state,
}: Omit<Props, "sessionKind"> & {
  assistanceKind: "question_suggestions" | "clarity_draft";
  confirmAction: (
    state: DiscoveryAssistanceRequestState,
    formData: FormData,
  ) => Promise<DiscoveryAssistanceRequestState>;
  state: Extract<DiscoveryAssistanceRequestState, { status: "external_review" }>;
}) {
  const [confirmationState, confirmationAction, confirmationPending] =
    useActionState(confirmAction, state);
  const preview = state.preview;

  return (
    <form
      action={confirmationAction}
      className="rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-subtle)] p-4 lg:col-span-2"
    >
      <SharedFields
        inquiryId={inquiryId}
        promptKey={promptKey}
        revision={revision}
        sessionId={sessionId}
      />
      <input name="assistanceKind" type="hidden" value={assistanceKind} />
      <input
        name="focus"
        type="hidden"
        value={preview.providerContext.packet.participantFocus ?? ""}
      />
      <input
        name="originalText"
        type="hidden"
        value={preview.providerContext.originalText ?? ""}
      />
      <DiscoveryAssistancePilotAuthorization preview={preview} />
      {confirmationState.status === "error" ? (
        <Alert className="mt-3" tone="error">
          {confirmationState.message}
        </Alert>
      ) : null}
      <Button
        className="mt-4"
        disabled={confirmationPending}
        size="sm"
        type="submit"
      >
        {confirmationPending
          ? "Requesting assistance…"
          : "Continue with OpenAI"}
      </Button>
      <p className="mt-3 text-xs leading-5 text-[var(--text-tertiary)]">
        Nothing is sent until you select both confirmations and continue. You
        can still use the regular interview question below.
      </p>
    </form>
  );
}

export function DiscoveryAssistanceRequestForm(props: Props) {
  const requestAction = props.sessionKind === "process"
    ? requestProcessDiscoveryAssistanceAction
    : requestInquiryDiscoveryAssistanceAction;
  const [questionState, questionAction, questionPending] = useActionState(
    requestAction,
    initialDiscoveryAssistanceRequestState,
  );
  const [clarityState, clarityAction, clarityPending] = useActionState(
    requestAction,
    initialDiscoveryAssistanceRequestState,
  );
  const confirmAction = props.sessionKind === "process"
    ? confirmProcessOpenAIDiscoveryAssistanceAction
    : confirmInquiryOpenAIDiscoveryAssistanceAction;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {questionState.status === "external_review" ? (
        <ExternalReviewForm
          assistanceKind="question_suggestions"
          confirmAction={confirmAction}
          inquiryId={props.inquiryId}
          promptKey={props.promptKey}
          revision={props.revision}
          sessionId={props.sessionId}
          state={questionState}
        />
      ) : (
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
      )}

      {clarityState.status === "external_review" ? (
        <ExternalReviewForm
          assistanceKind="clarity_draft"
          confirmAction={confirmAction}
          inquiryId={props.inquiryId}
          promptKey={props.promptKey}
          revision={props.revision}
          sessionId={props.sessionId}
          state={clarityState}
        />
      ) : (
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
      )}
    </div>
  );
}
