"use client";

import { useActionState } from "react";

import { Alert, Button, FieldLabel } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import { createDiscoveryInquiryAction } from "./actions";

export function DiscoveryInquiryForm() {
  const [state, action, pending] = useActionState(
    createDiscoveryInquiryAction,
    initialDiscoveryActionState,
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <FieldLabel>What are you trying to understand?</FieldLabel>
        <textarea
          autoComplete="off"
          className="min-h-28 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={2000}
          minLength={3}
          name="questionText"
          placeholder="For example: What happens after a gift is received?"
          required
        />
      </label>
      <p className="text-xs leading-5 text-[var(--text-tertiary)]">
        Record an organizational question without choosing a Process first. This does not create an interview, change documentation, or decide the answer.
      </p>
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <div className="flex justify-end border-t border-[var(--border)] pt-4">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Preserving question…" : "Explore this question"}
        </Button>
      </div>
    </form>
  );
}
