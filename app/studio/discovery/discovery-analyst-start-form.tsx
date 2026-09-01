"use client";

import { useActionState } from "react";

import { Alert, Badge, Button, Card } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import {
  authorizeDiscoveryAnalystAction,
  authorizeInquiryDiscoveryAnalystAction,
} from "./actions";

export function DiscoveryAnalystStartForm({
  inquiryId,
  revision,
  sessionId,
  sessionKind = "process",
}: {
  inquiryId?: string;
  revision: number;
  sessionId: string;
  sessionKind?: "inquiry" | "process";
}) {
  const inquiryMode = sessionKind === "inquiry";
  const [state, action, pending] = useActionState(
    inquiryMode
      ? authorizeInquiryDiscoveryAnalystAction
      : authorizeDiscoveryAnalystAction,
    initialDiscoveryActionState,
  );
  return (
    <Card className="mt-6 overflow-hidden border-[var(--workspace-accent)] p-0">
      <div className="bg-[var(--workspace-accent-soft)] p-5 sm:p-7">
        <Badge tone="accent">AI Discovery Analyst Alpha</Badge>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
          Interview me with Lotura
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Have a conversational interview that adapts to your answers, connects
          earlier evidence, and maintains a readable working understanding of
          {inquiryMode
            ? " the question without assuming it is already one Process. You remain the source of every saved observation."
            : " the Process. You remain the source of every saved observation."}
        </p>
      </div>
      <form action={action} className="space-y-4 p-5 sm:p-7">
        <input name="sessionId" type="hidden" value={sessionId} />
        {inquiryId ? <input name="inquiryId" type="hidden" value={inquiryId} /> : null}
        <input name="expectedRevision" type="hidden" value={revision} />
        <Alert tone="info">
          For this non-confidential Alpha, Lotura sends only the bounded {inquiryMode ? "inquiry" : "Process"}
          {" "}context, this interview&apos;s observations, and its latest working
          synthesis to OpenAI. Requests use no tools and are not stored as a
          provider conversation. OpenAI may retain submitted content in
          abuse-monitoring systems for up to 30 days.
        </Alert>
        <label className="flex items-start gap-3 rounded-[10px] border border-[var(--border)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
          <input
            className="mt-1 size-4 accent-[var(--workspace-accent)]"
            name="nonConfidentialAuthorized"
            required
            type="checkbox"
            value="yes"
          />
          <span>
            This interview contains only non-confidential organizational information
            that I am authorized to share. I will not enter donor, student, HR,
            payment, credential, or other sensitive record-level information.
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-[10px] border border-[var(--border)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
          <input
            className="mt-1 size-4 accent-[var(--workspace-accent)]"
            name="providerRetentionAccepted"
            required
            type="checkbox"
            value="yes"
          />
          <span>
            I understand the provider-retention statement and want Lotura to
            use OpenAI for this interview. Each message or explicit synthesis
            action will make at most one request.
          </span>
        </label>
        {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
          <p className="text-xs leading-5 text-[var(--text-tertiary)]">
            AI proposes understanding. Human review establishes organizational knowledge.
          </p>
          <Button disabled={pending} type="submit" variant="primary">
            {pending ? "Starting analyst…" : "Start AI interview"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
