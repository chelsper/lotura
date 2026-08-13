"use client";

import { useActionState, useMemo, useState } from "react";

import type {
  DiscoveryMappingAction,
} from "@/lib/discovery-mapping-model.mjs";
import {
  DISCOVERY_MAPPING_ACTION_LABELS,
} from "@/lib/discovery-mapping-model.mjs";
import type {
  DiscoveryMappingItemRecord,
} from "@/lib/discovery-data";

import { Alert, Button, FieldLabel, Select } from "../../ui/primitives";
import {
  changeDiscoveryMappingItemStateAction,
  finishDiscoveryProposalMappingAction,
  saveDiscoveryMappingItemAction,
} from "./actions";
import { initialDiscoveryActionState } from "./action-state";

const textAreaClass =
  "min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]";

type RoleOption = {
  id: string;
  name: string;
};

type DiscoveryMappingEvidence = {
  id: string;
  responseText: string | null;
  sequence: number;
};

export function DiscoveryMappingItemForm({
  availableActions,
  currentPurpose,
  evidence,
  expectedMappingRevision,
  item = null,
  ownerRoleId,
  roles,
  sessionId,
}: {
  availableActions: DiscoveryMappingAction[];
  currentPurpose: string | null;
  evidence: DiscoveryMappingEvidence[];
  expectedMappingRevision: number;
  item?: DiscoveryMappingItemRecord | null;
  ownerRoleId: string | null;
  roles: RoleOption[];
  sessionId: string;
}) {
  const initialAction = item?.action ?? availableActions[0] ?? "preserve_unresolved";
  const [mappingAction, setMappingAction] = useState<DiscoveryMappingAction>(initialAction);
  const [state, action, pending] = useActionState(
    saveDiscoveryMappingItemAction,
    initialDiscoveryActionState,
  );
  const selectedEvidence = useMemo(
    () => new Set(item?.sourceObservationIds ?? []),
    [item],
  );
  const proposedPurpose = item?.action === "update_process_purpose"
    ? String(item.proposedState.purpose ?? "")
    : currentPurpose ?? "";
  const proposedOwner = item?.action === "change_process_owner"
    ? String(item.proposedState.ownerRoleStableKey ?? "")
    : ownerRoleId ?? "";
  const unresolvedQuestion = item?.action === "preserve_unresolved"
    ? String(item.proposedState.question ?? "")
    : "";

  return (
    <form action={action} className="space-y-5">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="itemId" type="hidden" value={item?.itemId ?? ""} />
      <input
        name="expectedMappingRevision"
        type="hidden"
        value={expectedMappingRevision}
      />

      <label className="block">
        <FieldLabel>What specific change are you proposing?</FieldLabel>
        <Select
          disabled={Boolean(item)}
          name="mappingAction"
          onChange={(event) => setMappingAction(event.target.value as DiscoveryMappingAction)}
          value={mappingAction}
        >
          {(item ? [item.action] : availableActions).map((value) => (
            <option key={value} value={value}>
              {DISCOVERY_MAPPING_ACTION_LABELS[value]}
            </option>
          ))}
        </Select>
        {item ? <input name="mappingAction" type="hidden" value={item.action} /> : null}
      </label>

      {mappingAction === "update_process_purpose" ? (
        <label className="block">
          <FieldLabel>Proposed Process purpose</FieldLabel>
          <textarea
            className={textAreaClass}
            defaultValue={proposedPurpose}
            maxLength={10000}
            name="proposedPurpose"
            required
          />
          <span className="mt-1 block text-xs leading-5 text-[var(--text-tertiary)]">
            Current purpose: {currentPurpose || "Not documented"}
          </span>
        </label>
      ) : null}

      {mappingAction === "change_process_owner" ? (
        <label className="block">
          <FieldLabel>Proposed Owner Operational Role</FieldLabel>
          <Select defaultValue={proposedOwner} name="ownerRoleId">
            <option value="">No Owner Role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </Select>
          <span className="mt-1 block text-xs leading-5 text-[var(--text-tertiary)]">
            Choose an existing active Operational Role. Lotura does not infer ownership from a Person, Position, title, coverage, or reporting line.
          </span>
        </label>
      ) : null}

      {mappingAction === "preserve_unresolved" ? (
        <label className="block">
          <FieldLabel>What question still needs an answer?</FieldLabel>
          <textarea
            className={textAreaClass}
            defaultValue={unresolvedQuestion}
            maxLength={2000}
            name="unresolvedQuestion"
            placeholder="Describe what must be validated and, if known, who may be able to help."
            required
          />
        </label>
      ) : null}

      <fieldset>
        <legend className="text-xs font-medium text-[var(--text-secondary)]">
          Which interview answers support this item?
        </legend>
        <div className="mt-2 space-y-2">
          {evidence.map((observation) => (
            <label
              className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-[var(--border)] p-3 hover:bg-[var(--surface-subtle)]"
              key={observation.id}
            >
              <input
                className="mt-1 size-4 accent-[var(--workspace-accent)]"
                defaultChecked={selectedEvidence.has(observation.id)}
                name="observationId"
                type="checkbox"
                value={observation.id}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-[var(--text)]">
                  Interview answer {observation.sequence}
                </span>
                <span className="mt-0.5 line-clamp-3 block text-xs leading-5 text-[var(--text-secondary)]">
                  {observation.responseText || "Explicitly unknown"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <FieldLabel>Why are you proposing this?</FieldLabel>
        <textarea
          className={textAreaClass}
          defaultValue={item?.rationale ?? ""}
          maxLength={2000}
          name="rationale"
          placeholder="Explain the interpretation for the next reviewer."
          required
        />
      </label>

      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <div className="flex justify-end">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Saving…" : item ? "Save a new revision" : "Add proposed item"}
        </Button>
      </div>
    </form>
  );
}

export function DiscoveryMappingItemStateForm({
  expectedMappingRevision,
  item,
  sessionId,
}: {
  expectedMappingRevision: number;
  item: DiscoveryMappingItemRecord;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    changeDiscoveryMappingItemStateAction,
    initialDiscoveryActionState,
  );
  const nextState = item.state === "active" ? "withdrawn" : "active";
  return (
    <form action={action} className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="itemId" type="hidden" value={item.itemId} />
      <input name="itemState" type="hidden" value={nextState} />
      <input
        name="expectedMappingRevision"
        type="hidden"
        value={expectedMappingRevision}
      />
      <label className="block">
        <FieldLabel>
          {nextState === "withdrawn" ? "Why is this proposal being withdrawn?" : "Why is this proposal being restored?"}
        </FieldLabel>
        <textarea className={textAreaClass} maxLength={2000} name="rationale" required />
      </label>
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Button disabled={pending} size="sm" type="submit" variant="secondary">
        {pending ? "Saving…" : nextState === "withdrawn" ? "Withdraw item" : "Restore item"}
      </Button>
    </form>
  );
}

export function FinishDiscoveryMappingForm({
  canFinish,
  expectedMappingRevision,
  sessionId,
}: {
  canFinish: boolean;
  expectedMappingRevision: number;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    finishDiscoveryProposalMappingAction,
    initialDiscoveryActionState,
  );
  return (
    <form action={action} className="space-y-3">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input
        name="expectedMappingRevision"
        type="hidden"
        value={expectedMappingRevision}
      />
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Button disabled={!canFinish || pending} type="submit" variant="primary">
        {pending ? "Finishing…" : "Finish specific changes"}
      </Button>
    </form>
  );
}
