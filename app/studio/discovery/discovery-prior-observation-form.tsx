"use client";

import { useActionState } from "react";

import { Alert, Button } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import { confirmPriorDiscoveryObservationAction } from "./actions";

export function DiscoveryPriorObservationForm({
  promptKey,
  revision,
  sessionId,
  sourceObservationId,
}: {
  promptKey: string;
  revision: number;
  sessionId: string;
  sourceObservationId: string;
}) {
  const [state, action, pending] = useActionState(
    confirmPriorDiscoveryObservationAction,
    initialDiscoveryActionState,
  );

  return (
    <form action={action}>
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="expectedRevision" type="hidden" value={revision} />
      <input name="promptKey" type="hidden" value={promptKey} />
      <input
        name="sourceObservationId"
        type="hidden"
        value={sourceObservationId}
      />
      {state.status === "error" ? (
        <Alert className="mb-3" tone="error">
          {state.message}
        </Alert>
      ) : null}
      <Button disabled={pending} size="sm" type="submit" variant="primary">
        {pending ? "Confirming…" : "Still accurate"}
      </Button>
    </form>
  );
}
