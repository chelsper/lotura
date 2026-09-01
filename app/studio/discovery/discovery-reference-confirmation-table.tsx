"use client";

import { useActionState, useMemo, useState } from "react";

import type {
  DiscoveryReferenceCandidateRecord,
} from "@/lib/discovery-reference-data";

import { Alert, Badge, Button, Card, Select } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import { saveInquiryReferenceConfirmationsAction } from "./actions";

type DecisionState = {
  dirty: boolean;
  disposition: "confirmed" | "rejected" | "unresolved";
  targetKey: string | null;
};

function initialDecision(candidate: DiscoveryReferenceCandidateRecord): DecisionState {
  if (candidate.decision) {
    return {
      dirty: false,
      disposition: candidate.decision.disposition,
      targetKey: candidate.decision.selectedTargetKey,
    };
  }
  return candidate.suggestedTargetKey
    ? { dirty: true, disposition: "confirmed", targetKey: candidate.suggestedTargetKey }
    : { dirty: true, disposition: "unresolved", targetKey: null };
}

function candidateKey(candidate: DiscoveryReferenceCandidateRecord) {
  return candidate.sourceFingerprint;
}

export function DiscoveryReferenceConfirmationTable({
  candidates,
  inquiryId,
  runId,
  sessionId,
}: {
  candidates: DiscoveryReferenceCandidateRecord[];
  inquiryId: string;
  runId: string;
  sessionId: string;
}) {
  const [actionState, action, pending] = useActionState(
    saveInquiryReferenceConfirmationsAction,
    initialDiscoveryActionState,
  );
  const [decisions, setDecisions] = useState<Record<string, DecisionState>>(
    () => Object.fromEntries(candidates.map((candidate) => [
      candidateKey(candidate),
      initialDecision(candidate),
    ])),
  );
  const changed = useMemo(() => candidates.filter((candidate) =>
    decisions[candidateKey(candidate)]?.dirty), [candidates, decisions]);

  if (candidates.length === 0) return null;

  function update(
    candidate: DiscoveryReferenceCandidateRecord,
    patch: Partial<DecisionState>,
  ) {
    const key = candidateKey(candidate);
    setDecisions((current) => ({
      ...current,
      [key]: { ...current[key], ...patch, dirty: true },
    }));
  }

  return (
    <Card className="p-5 sm:p-7" id="references-to-confirm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge tone="warning">Human confirmation required</Badge>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
            References to confirm
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Lotura matched wording in your answers to current organizational identities. Confirm the intended match, choose another, reject it, or leave it unresolved. These decisions provide review context only.
          </p>
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">
          {candidates.length} {candidates.length === 1 ? "reference" : "references"}
        </span>
      </div>

      <form action={action} className="mt-5 space-y-5">
        <input name="inquiryId" type="hidden" value={inquiryId} />
        <input name="sessionId" type="hidden" value={sessionId} />
        <input name="decisionCount" type="hidden" value={changed.length} />
        {changed.map((candidate, index) => {
          const decision = decisions[candidateKey(candidate)];
          return (
            <span className="hidden" key={`changed-${candidate.sourceFingerprint}`}>
              <input name={`decision.${index}.disposition`} type="hidden" value={decision.disposition} />
              <input name={`decision.${index}.kind`} type="hidden" value={candidate.kind} />
              <input name={`decision.${index}.mentionSequence`} type="hidden" value={candidate.mentionSequence} />
              <input name={`decision.${index}.mentionText`} type="hidden" value={candidate.mentionText} />
              <input name={`decision.${index}.runId`} type="hidden" value={runId} />
              <input name={`decision.${index}.sourceFingerprint`} type="hidden" value={candidate.sourceFingerprint} />
              <input name={`decision.${index}.sourceObservationId`} type="hidden" value={candidate.sourceObservationId} />
              <input name={`decision.${index}.targetKey`} type="hidden" value={decision.targetKey ?? ""} />
            </span>
          );
        })}

        <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Mention</th>
                <th className="px-4 py-3 font-semibold">Suggested match</th>
                <th className="px-4 py-3 font-semibold">Type and context</th>
                <th className="px-4 py-3 font-semibold">Your decision</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                const decision = decisions[candidateKey(candidate)];
                const selected = candidate.options.find((option) => option.key === decision.targetKey)
                  ?? candidate.options.find((option) => option.key === candidate.suggestedTargetKey)
                  ?? null;
                return (
                  <tr className="border-t border-[var(--border)] align-top" key={candidate.sourceFingerprint}>
                    <td className="max-w-56 px-4 py-4">
                      <p className="font-semibold text-[var(--text)]">“{candidate.mentionText}”</p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">Answer {candidate.observationSequence}</p>
                    </td>
                    <td className="max-w-64 px-4 py-4">
                      {candidate.options.length > 0 ? (
                        <Select
                          aria-label={`Match for ${candidate.mentionText}`}
                          disabled={decision.disposition !== "confirmed"}
                          onChange={(event) => update(candidate, {
                            disposition: "confirmed",
                            targetKey: event.target.value,
                          })}
                          value={decision.targetKey ?? candidate.suggestedTargetKey ?? ""}
                        >
                          {candidate.options.map((option) => (
                            <option key={option.key} value={option.key}>{option.label}</option>
                          ))}
                        </Select>
                      ) : (
                        <p className="text-sm leading-6 text-[var(--text-secondary)]">
                          No first-class identity exists yet.
                        </p>
                      )}
                    </td>
                    <td className="max-w-72 px-4 py-4">
                      <Badge tone="neutral">{candidate.kindLabel}</Badge>
                      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                        {selected?.context ?? "Preserve this wording without forcing a typed match."}
                      </p>
                      {candidate.kind === "person_capacity" ? (
                        <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">
                          Confirm the person and the capacity shown; Lotura will not silently replace a person with a Role.
                        </p>
                      ) : null}
                    </td>
                    <td className="w-56 px-4 py-4">
                      <Select
                        aria-label={`Decision for ${candidate.mentionText}`}
                        onChange={(event) => {
                          const disposition = event.target.value as DecisionState["disposition"];
                          update(candidate, {
                            disposition,
                            targetKey: disposition === "confirmed"
                              ? decision.targetKey ?? candidate.suggestedTargetKey
                              : null,
                          });
                        }}
                        value={decision.disposition}
                      >
                        {candidate.options.length > 0 ? <option value="confirmed">Confirm match</option> : null}
                        <option value="unresolved">Keep unresolved</option>
                        <option value="rejected">Not this reference</option>
                      </Select>
                      {candidate.decision ? (
                        <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                          A prior decision is preserved. Saving a change appends a correction.
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {actionState.status === "error" ? <Alert tone="error">{actionState.message}</Alert> : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
          <p className="text-xs leading-5 text-[var(--text-tertiary)]">
            Unresolved references do not block the interview or human review.
          </p>
          <Button disabled={pending || changed.length === 0} type="submit" variant="primary">
            {pending ? "Preserving decisions…" : changed.length > 0
              ? `Save ${changed.length} ${changed.length === 1 ? "decision" : "decisions"}`
              : "Reference decisions saved"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
