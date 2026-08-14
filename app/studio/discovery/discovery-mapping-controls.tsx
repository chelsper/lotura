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
  DiscoveryMappingCatalog,
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
  catalog,
  currentPurpose,
  evidence,
  expectedMappingRevision,
  item = null,
  ownerRoleId,
  roles,
  sessionId,
}: {
  availableActions: DiscoveryMappingAction[];
  catalog: DiscoveryMappingCatalog;
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
  const [selectedStepId, setSelectedStepId] = useState(
    item?.processStepId ?? "",
  );
  const [selectedExceptionId, setSelectedExceptionId] = useState(
    item?.exceptionId ?? "",
  );
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
  const selectedStep = catalog.steps.find((step) => step.id === selectedStepId) ?? null;
  const selectedException = catalog.exceptions.find(
    (exception) => exception.id === selectedExceptionId,
  ) ?? null;
  const proposedStepTitle = String(
    item?.proposedState.title ?? selectedStep?.title ?? "",
  );
  const proposedStepInstructions = String(
    item?.proposedState.instructions ?? selectedStep?.instructions ?? "",
  );

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

      {mappingAction === "add_process_step" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <FieldLabel>Step title</FieldLabel>
            <input className={textAreaClass.replace("min-h-24", "min-h-0")} defaultValue={String(item?.proposedState.title ?? "")} maxLength={255} name="proposedStepTitle" required />
          </label>
          <label className="block md:col-span-2">
            <FieldLabel>What happens in this Step?</FieldLabel>
            <textarea className={textAreaClass} defaultValue={String(item?.proposedState.instructions ?? "")} maxLength={10000} name="proposedStepInstructions" required />
          </label>
          <label className="block">
            <FieldLabel>Proposed order</FieldLabel>
            <input className={textAreaClass.replace("min-h-24", "min-h-0")} defaultValue={Number(item?.proposedState.position ?? catalog.steps.length + 1)} min={1} name="proposedStepPosition" required type="number" />
          </label>
          <label className="block">
            <FieldLabel>Responsible Operational Role</FieldLabel>
            <Select defaultValue={item?.responsibleRoleId ?? ""} name="responsibleRoleId">
              <option value="">Not assigned</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </Select>
          </label>
        </div>
      ) : null}

      {mappingAction === "revise_process_step" || mappingAction === "change_step_responsibility" ? (
        <label className="block">
          <FieldLabel>Existing Step</FieldLabel>
          <Select
            disabled={Boolean(item)}
            name="processStepId"
            onChange={(event) => setSelectedStepId(event.target.value)}
            required
            value={selectedStepId}
          >
            <option value="">Choose a Step</option>
            {catalog.steps.map((step) => (
              <option key={step.id} value={step.id}>{step.position}. {step.title}</option>
            ))}
          </Select>
          {item ? <input name="processStepId" type="hidden" value={selectedStepId} /> : null}
        </label>
      ) : null}

      {mappingAction === "revise_process_step" ? (
        <div className="grid gap-4" key={selectedStepId || "step-fields"}>
          <label className="block">
            <FieldLabel>Proposed Step title</FieldLabel>
            <input className={textAreaClass.replace("min-h-24", "min-h-0")} defaultValue={proposedStepTitle} maxLength={255} name="proposedStepTitle" required />
          </label>
          <label className="block">
            <FieldLabel>Proposed Step wording</FieldLabel>
            <textarea className={textAreaClass} defaultValue={proposedStepInstructions} maxLength={10000} name="proposedStepInstructions" required />
          </label>
        </div>
      ) : null}

      {mappingAction === "change_step_responsibility" ? (
        <label className="block">
          <FieldLabel>Proposed Responsible Operational Role</FieldLabel>
          <Select
            defaultValue={item?.responsibleRoleId ?? selectedStep?.responsibleRoleId ?? ""}
            key={`${selectedStepId}-responsibility`}
            name="responsibleRoleId"
          >
            <option value="">Not assigned</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </Select>
          <span className="mt-1 block text-xs leading-5 text-[var(--text-tertiary)]">
            Responsibility is assigned to an Operational Role, not inferred from a Person, title, Position, or reporting line.
          </span>
        </label>
      ) : null}

      {mappingAction === "link_existing_system" ? (
        <div className="grid gap-4">
          <label className="block">
            <FieldLabel>Existing System</FieldLabel>
            <Select
              defaultValue={item?.systemId ?? ""}
              disabled={Boolean(item)}
              name="systemId"
              required
            >
              <option value="">Choose a System</option>
              {catalog.systems.filter((system) =>
                system.status === "active" &&
                (!system.alreadyLinked || system.id === item?.systemId)
              ).map((system) => (
                <option key={system.id} value={system.id}>{system.name}</option>
              ))}
            </Select>
            {item ? <input name="systemId" type="hidden" value={item.systemId ?? ""} /> : null}
          </label>
          <label className="block">
            <FieldLabel>How is the System used?</FieldLabel>
            <textarea className={textAreaClass} defaultValue={String(item?.proposedState.usage ?? "")} maxLength={2000} name="systemUsage" required />
          </label>
        </div>
      ) : null}

      {mappingAction === "add_process_exception" ? (
        <div className="grid gap-4">
          <label className="block">
            <FieldLabel>Exception name</FieldLabel>
            <input className={textAreaClass.replace("min-h-24", "min-h-0")} defaultValue={String(item?.proposedState.name ?? "")} maxLength={255} name="exceptionName" required />
          </label>
          <label className="block">
            <FieldLabel>When does this alternate path apply?</FieldLabel>
            <textarea className={textAreaClass} defaultValue={String(item?.proposedState.condition ?? "")} maxLength={5000} name="exceptionCondition" required />
          </label>
          <label className="block">
            <FieldLabel>What happens instead?</FieldLabel>
            <textarea className={textAreaClass} defaultValue={String(item?.proposedState.response ?? "")} maxLength={5000} name="exceptionResponse" required />
          </label>
          <label className="block">
            <FieldLabel>Related existing Step (optional)</FieldLabel>
            <Select defaultValue={item?.processStepId ?? ""} disabled={Boolean(item)} name="processStepId">
              <option value="">Whole Process</option>
              {catalog.steps.map((step) => <option key={step.id} value={step.id}>{step.position}. {step.title}</option>)}
            </Select>
            {item ? <input name="processStepId" type="hidden" value={item.processStepId ?? ""} /> : null}
          </label>
        </div>
      ) : null}

      {mappingAction === "revise_process_exception" ? (
        <div className="grid gap-4">
          <label className="block">
            <FieldLabel>Existing Exception</FieldLabel>
            <Select
              disabled={Boolean(item)}
              name="exceptionId"
              onChange={(event) => setSelectedExceptionId(event.target.value)}
              required
              value={selectedExceptionId}
            >
              <option value="">Choose an Exception</option>
              {catalog.exceptions.map((exception) => <option key={exception.id} value={exception.id}>{exception.name}</option>)}
            </Select>
            {item ? <input name="exceptionId" type="hidden" value={selectedExceptionId} /> : null}
          </label>
          <div className="grid gap-4" key={selectedExceptionId || "exception-fields"}>
            <label className="block">
              <FieldLabel>Proposed Exception name</FieldLabel>
              <input className={textAreaClass.replace("min-h-24", "min-h-0")} defaultValue={String(item?.proposedState.name ?? selectedException?.name ?? "")} maxLength={255} name="exceptionName" required />
            </label>
            <label className="block">
              <FieldLabel>Proposed condition</FieldLabel>
              <textarea className={textAreaClass} defaultValue={String(item?.proposedState.condition ?? selectedException?.condition ?? "")} maxLength={5000} name="exceptionCondition" required />
            </label>
            <label className="block">
              <FieldLabel>Proposed response</FieldLabel>
              <textarea className={textAreaClass} defaultValue={String(item?.proposedState.response ?? selectedException?.response ?? "")} maxLength={5000} name="exceptionResponse" required />
            </label>
          </div>
        </div>
      ) : null}

      {mappingAction === "add_process_dependency" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <FieldLabel>Related Process</FieldLabel>
            <Select defaultValue={item?.relatedProcessId ?? ""} disabled={Boolean(item)} name="relatedProcessId" required>
              <option value="">Choose a Process</option>
              {catalog.processes.filter((process) => process.status !== "archived").map((process) => <option key={process.id} value={process.id}>{process.name}</option>)}
            </Select>
            {item ? <input name="relatedProcessId" type="hidden" value={item.relatedProcessId ?? ""} /> : null}
          </label>
          <label className="block">
            <FieldLabel>Relationship</FieldLabel>
            <Select defaultValue={String(item?.proposedState.direction ?? "upstream")} disabled={Boolean(item)} name="dependencyDirection">
              <option value="upstream">Upstream — this work relies on it</option>
              <option value="downstream">Downstream — it receives or follows this work</option>
            </Select>
            {item ? <input name="dependencyDirection" type="hidden" value={String(item.proposedState.direction ?? "upstream")} /> : null}
          </label>
          <label className="block">
            <FieldLabel>Dependency type</FieldLabel>
            <Select defaultValue={String(item?.proposedState.dependencyType ?? "requires")} disabled={Boolean(item)} name="dependencyType">
              <option value="requires">Requires</option>
              <option value="receives_from">Receives from</option>
              <option value="provides_to">Provides to</option>
              <option value="triggers">Triggers</option>
            </Select>
            {item ? <input name="dependencyType" type="hidden" value={String(item.proposedState.dependencyType ?? "requires")} /> : null}
          </label>
          <label className="block md:col-span-2">
            <FieldLabel>Describe the dependency (optional)</FieldLabel>
            <textarea className={textAreaClass} defaultValue={String(item?.proposedState.description ?? "")} maxLength={2000} name="dependencyDescription" />
          </label>
        </div>
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
