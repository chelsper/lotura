"use client";

import { useActionState, useState } from "react";

import { Alert, Button, Card, FieldLabel, Select } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import {
  routeDiscoveryInquiryAction,
  startInquiryDiscoverySessionAction,
  startProcessDiscoveryFromInquiryAction,
} from "./actions";

type CatalogItem = { id: string; name: string; status: string };

export function DiscoveryInquiryRoutingControls({
  families,
  inquiryId,
  processes,
  revision,
}: {
  families: CatalogItem[];
  inquiryId: string;
  processes: CatalogItem[];
  revision: number;
}) {
  const [explorationState, explorationAction, explorationPending] =
    useActionState(
      startInquiryDiscoverySessionAction,
      initialDiscoveryActionState,
    );
  const [processState, processAction, processPending] = useActionState(
    startProcessDiscoveryFromInquiryAction,
    initialDiscoveryActionState,
  );
  const [routeState, routeAction, routePending] = useActionState(
    routeDiscoveryInquiryAction,
    initialDiscoveryActionState,
  );
  const [routeKind, setRouteKind] = useState("review_process");
  const routeNeedsTarget = routeKind === "review_process"
    || routeKind === "review_process_family";
  const routeNeedsNote = routeKind === "wait_for_source";
  const targets = routeKind === "review_process_family" ? families : processes;

  return (
    <section className="mt-7 space-y-5">
      <div>
        <p className="text-xs font-medium text-[var(--text-tertiary)]">
          Choose the next useful step
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
          What would you like to do with this question?
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Lotura will preserve your choice. It will not select or create a
          Process automatically.
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <p className="text-xs font-medium text-[var(--workspace-accent)]">
          When the Process is not clear yet
        </p>
        <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">
          Explore before choosing a Process
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Start with what you know about the work. You can decide later whether
          it belongs with an existing Process, crosses several Processes, or
          may justify a new working draft.
        </p>
        <form action={explorationAction} className="mt-5 space-y-4">
          <input name="inquiryId" type="hidden" value={inquiryId} />
          <input name="expectedRevision" type="hidden" value={revision} />
          <label className="block">
            <FieldLabel>What should this conversation focus on?</FieldLabel>
            <textarea
              className="min-h-28 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
              maxLength={2000}
              name="scopeStatement"
              placeholder="For example: Understand how this work begins, who participates, what happens, and where it hands off."
              required
            />
          </label>
          <p className="text-xs leading-5 text-[var(--text-tertiary)]">
            This starts an interview and preserves answers for review. It does
            not create or change a documented Process.
          </p>
          {explorationState.status === "error" ? (
            <Alert tone="error">{explorationState.message}</Alert>
          ) : null}
          <Button disabled={explorationPending} type="submit" variant="primary">
            {explorationPending
              ? "Starting conversation…"
              : "Explore before choosing a Process"}
          </Button>
        </form>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">
            When an existing Process is already clear
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">
            Start an interview about a Process
          </h3>
          <form action={processAction} className="mt-5 space-y-4">
            <input name="inquiryId" type="hidden" value={inquiryId} />
            <input name="expectedRevision" type="hidden" value={revision} />
            <label className="block">
              <FieldLabel>Process</FieldLabel>
              <Select name="processKey" required>
                <option value="">Choose a Process</option>
                {processes.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name} — {process.status === "draft"
                      ? "Working draft"
                      : process.status}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <FieldLabel>What should this conversation cover?</FieldLabel>
              <textarea
                className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
                maxLength={2000}
                name="scopeStatement"
                placeholder="For example: The whole Process, from beginning to end."
                required
              />
            </label>
            {processState.status === "error" ? (
              <Alert tone="error">{processState.message}</Alert>
            ) : null}
            <Button disabled={processPending} type="submit">
              {processPending ? "Starting interview…" : "Start Process interview"}
            </Button>
          </form>
        </Card>

        <Card className="p-5 sm:p-6">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">
            When an interview is not the next step
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">
            Record another direction
          </h3>
          <form action={routeAction} className="mt-5 space-y-4">
            <input name="inquiryId" type="hidden" value={inquiryId} />
            <input name="expectedRevision" type="hidden" value={revision} />
            <label className="block">
              <FieldLabel>Next step</FieldLabel>
              <Select
                name="routeKind"
                onChange={(event) => setRouteKind(event.target.value)}
                value={routeKind}
              >
                <option value="review_process">Look at an existing Process</option>
                <option value="review_process_family">Look at a Process Family</option>
                <option value="wait_for_source">Wait for someone or something else</option>
                <option value="finish_for_now">Finish for now</option>
              </Select>
            </label>
            {routeNeedsTarget ? (
              <label className="block">
                <FieldLabel>
                  {routeKind === "review_process_family"
                    ? "Process Family"
                    : "Process"}
                </FieldLabel>
                <Select name="targetKey" required>
                  <option value="">Choose one</option>
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </Select>
              </label>
            ) : (
              <input name="targetKey" type="hidden" value="" />
            )}
            <label className="block">
              <FieldLabel>
                {routeNeedsNote
                  ? "Who or what can help answer this?"
                  : "Note (optional)"}
              </FieldLabel>
              <textarea
                className="min-h-20 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
                maxLength={2000}
                name="routeNote"
                placeholder={routeNeedsNote
                  ? "For example: Ask Finance to explain the handoff."
                  : "Why is this the useful next place to look?"}
                required={routeNeedsNote}
              />
            </label>
            {routeState.status === "error" ? (
              <Alert tone="error">{routeState.message}</Alert>
            ) : null}
            <Button disabled={routePending} type="submit">
              {routePending ? "Preserving choice…" : "Preserve this choice"}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
