"use client";

import { useActionState } from "react";

import {
  DISCOVERY_MAPPING_ACTION_LABELS,
} from "@/lib/discovery-mapping-model.mjs";
import type {
  DiscoveryMappingCatalog,
} from "@/lib/discovery-data";

import { Alert, Badge, Button, Card } from "../../ui/primitives";
import {
  draftDiscoveryProcessProposalAction,
} from "./actions";
import {
  initialDiscoveryProcessProposalDraftState,
} from "./action-state";
import { DiscoveryMappingItemForm } from "./discovery-mapping-controls";

type Evidence = {
  id: string;
  responseText: string | null;
  sequence: number;
};

type RoleOption = {
  id: string;
  name: string;
};

function InsightList({ empty, items }: { empty: string; items: string[] }) {
  return items.length ? (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
      {items.map((item, index) => (
        <li className="flex gap-2" key={`${index}-${item}`}>
          <span aria-hidden="true" className="text-[var(--workspace-accent)]">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-3 text-sm leading-6 text-[var(--text-tertiary)]">{empty}</p>
  );
}

export function DiscoveryProcessProposalDraft({
  catalog,
  currentPurpose,
  evidence,
  expectedMappingRevision,
  expectedProposalRevision,
  ownerRoleId,
  roles,
  sessionId,
}: {
  catalog: DiscoveryMappingCatalog;
  currentPurpose: string | null;
  evidence: Evidence[];
  expectedMappingRevision: number;
  expectedProposalRevision: number;
  ownerRoleId: string | null;
  roles: RoleOption[];
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    draftDiscoveryProcessProposalAction,
    initialDiscoveryProcessProposalDraftState,
  );
  const drafted = state.status === "drafted" ? state : null;

  return (
    <section className="mt-7" id="lotura-proposal-draft">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">AI-assisted</Badge>
                <span className="text-xs text-[var(--text-tertiary)]">Temporary working draft</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
                Let Lotura organize the proposed Process
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Lotura will read the complete reviewed evidence package, organize the best-supported current-state Process, and suggest exactly where selected evidence may belong. It will keep validation needs and conflicts separate.
              </p>
            </div>
            <form action={action}>
              <input name="sessionId" type="hidden" value={sessionId} />
              <input
                name="expectedProposalRevision"
                type="hidden"
                value={expectedProposalRevision}
              />
              <input
                name="expectedMappingRevision"
                type="hidden"
                value={expectedMappingRevision}
              />
              <Button disabled={pending} type="submit" variant="primary">
                {pending
                  ? "Drafting proposed Process…"
                  : drafted
                    ? "Draft again with current work"
                    : "Draft proposed Process with Lotura"}
              </Button>
            </form>
          </div>
          <p className="mt-4 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
            This is one explicit, stateless AI request using the reviewed non-confidential pilot configuration. The draft does not change the Process. Only candidates you review, edit, and save enter the governed proposal path.
          </p>
          {state.status === "error" ? (
            <Alert className="mt-4" tone="error">{state.message}</Alert>
          ) : null}
        </div>

        {drafted ? (
          <div className="space-y-7 p-5 sm:p-6">
            <Alert tone="success">{drafted.message}</Alert>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                Proposed current-state description
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">
                How this Process appears to work today
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                {drafted.draft.summary}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-4">
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Purpose</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {drafted.draft.process.purpose || "Not established by the reviewed evidence."}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Start and end</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  <strong className="font-medium text-[var(--text)]">Starts:</strong>{" "}
                  {drafted.draft.process.trigger || "Not established"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  <strong className="font-medium text-[var(--text)]">Ends:</strong>{" "}
                  {drafted.draft.process.endBoundary || "Not established"}
                </p>
              </Card>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[var(--text)]">Proposed Step sequence</h3>
                <Badge tone="neutral">Readable synthesis—not approved documentation</Badge>
              </div>
              {drafted.draft.process.steps.length ? (
                <ol className="mt-4 space-y-3">
                  {drafted.draft.process.steps.map((step) => (
                    <li className="rounded-[10px] border border-[var(--border)] p-4" key={`${step.sequence}-${step.title}`}>
                      <div className="flex gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--workspace-accent)]">
                          {step.sequence}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text)]">{step.title}</p>
                          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{step.description}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
                            {step.responsibleRole ? <span>Role: {step.responsibleRole}</span> : null}
                            {step.systems.length ? <span>Systems: {step.systems.join(", ")}</span> : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-tertiary)]">The evidence does not yet establish a reliable Step sequence.</p>
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="p-4">
                <p className="text-sm font-semibold text-[var(--text)]">What seems clear</p>
                <InsightList empty="No point was strong enough to list as clear." items={drafted.draft.clear} />
              </Card>
              <Card className="p-4">
                <p className="text-sm font-semibold text-[var(--text)]">Still needs validation</p>
                <InsightList empty="No separate validation need was identified." items={drafted.draft.needsValidation} />
              </Card>
              <Card className="p-4">
                <p className="text-sm font-semibold text-[var(--text)]">Possible conflicts</p>
                <InsightList empty="No evidence conflict was identified." items={drafted.draft.conflicts} />
              </Card>
            </div>

            <div className="border-t border-[var(--border)] pt-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[var(--text-tertiary)]">Evidence-linked candidates</p>
                  <h3 className="mt-1 text-xl font-semibold text-[var(--text)]">
                    Review exactly what Lotura proposes changing
                  </h3>
                </div>
                <Badge tone="warning">Nothing is saved automatically</Badge>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                Each candidate is prefilled from the selected evidence. Correct its wording, placement, target, or supporting answers before adding it to the governed proposal.
              </p>

              {drafted.draft.changes.length ? (
                <div className="mt-5 space-y-4">
                  {drafted.draft.changes.map((change, index) => (
                    <details
                      className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4 open:shadow-sm sm:p-5"
                      key={`${index}-${change.action}-${change.title}`}
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="accent">AI-assisted candidate</Badge>
                              <span className="text-xs text-[var(--text-tertiary)]">
                                {DISCOVERY_MAPPING_ACTION_LABELS[change.action]}
                              </span>
                            </div>
                            <p className="mt-2 font-semibold text-[var(--text)]">{change.title}</p>
                            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{change.rationale}</p>
                          </div>
                          <span className="text-xs font-medium text-[var(--workspace-accent)]">Review and edit</span>
                        </div>
                      </summary>
                      <div className="mt-5 border-t border-[var(--border)] pt-5">
                        <DiscoveryMappingItemForm
                          availableActions={[change.action]}
                          catalog={catalog}
                          currentPurpose={currentPurpose}
                          evidence={evidence}
                          expectedMappingRevision={expectedMappingRevision}
                          initialDraft={change}
                          ownerRoleId={ownerRoleId}
                          roles={roles}
                          sessionId={sessionId}
                        />
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <Alert className="mt-5" tone="warning">
                  Lotura could organize the evidence but could not support a safely targeted change. Preserve the validation needs or use the manual proposal form below.
                </Alert>
              )}
            </div>

            <p className="border-t border-[var(--border)] pt-4 text-[11px] leading-5 text-[var(--text-tertiary)]">
              One request · {drafted.providerMetadata.model} · {drafted.providerMetadata.totalTokens.toLocaleString()} tokens · {(drafted.providerMetadata.durationMs / 1000).toFixed(1)}s. The temporary draft is not an observation, mapping, approval, or Process change.
            </p>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
