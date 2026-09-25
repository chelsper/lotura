"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import type { OrganizationStructureData } from "@/lib/organization-structure-data.mjs";

import {
  createOrganizationUnitAction,
  createPersonAction,
  createPositionAction,
} from "../../organization/actions";
import {
  initialStructureActionState,
} from "../../organization/action-state";
import { Alert, Button, Input, RequiredMark, Select } from "../../ui/primitives";

type CreationType = "organization_unit" | "position" | "person";

function effectiveDateDefault() {
  return new Date().toISOString().slice(0, 10);
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function CreationMetadataFields({
  reason,
  setReason,
}: {
  reason: string;
  setReason: (value: string) => void;
}) {
  const [changeKind, setChangeKind] = useState("organizational_change");
  const [effectiveDate, setEffectiveDate] = useState(effectiveDateDefault());
  return (
    <fieldset className="grid gap-4 border-t border-[var(--border)] pt-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="px-1 text-sm font-medium text-[var(--text)]">Change history</legend>
      <p className="text-xs text-[var(--text-secondary)] sm:col-span-2">A short note helps others understand why this record was added.</p>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Type of change<RequiredMark />
        </span>
        <Select name="changeKind" onChange={(event) => setChangeKind(event.target.value)} required value={changeKind}>
          <option value="organizational_change">Organizational change</option>
          <option value="correction">Correction to an omitted record</option>
        </Select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Effective date<RequiredMark />
        </span>
        <Input name="effectiveDate" onChange={(event) => setEffectiveDate(event.target.value)} required type="date" value={effectiveDate} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Why are you adding this?<RequiredMark />
        </span>
        <textarea
          className="min-h-20 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={2000}
          name="reason"
          onChange={(event) => setReason(event.target.value)}
          placeholder="For example, “Documenting our current team.”"
          required
          value={reason}
        />
      </label>
    </fieldset>
  );
}

export function StructureCreateForm({
  data,
  entityType,
  initialUnitStableKey = "",
  onPendingChange,
}: {
  data: OrganizationStructureData;
  entityType: CreationType;
  initialUnitStableKey?: string;
  onPendingChange?: (pending: boolean) => void;
}) {
  const action =
    entityType === "organization_unit"
      ? createOrganizationUnitAction
      : entityType === "position"
        ? createPositionAction
        : createPersonAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialStructureActionState,
  );
  useEffect(() => { onPendingChange?.(pending); }, [onPendingChange, pending]);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [unitStableKey, setUnitStableKey] = useState(initialUnitStableKey);
  const contextUnit = data.units.find((unit) => unit.id === initialUnitStableKey && unit.status === "active");
  const duplicate = useMemo(() => {
    const value = normalized(name);
    if (!value) return null;
    if (entityType === "organization_unit") {
      return data.units.find(
        (unit) =>
          unit.status === "active" &&
          normalized(unit.name) === value &&
          (unit.parent?.id ?? "") === unitStableKey,
      );
    }
    if (entityType === "position") {
      return data.positions.find(
        (position) =>
          position.status === "active" &&
          normalized(position.title) === value &&
          (position.unit?.id ?? "") === unitStableKey,
      );
    }
    return data.people.find(
      (person) => person.status === "active" && normalized(person.name) === value,
    );
  }, [data, entityType, name, unitStableKey]);
  const label =
    entityType === "organization_unit"
      ? contextUnit ? "child Unit" : "Organization Unit"
      : entityType === "position"
        ? "job title"
        : "person";

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {contextUnit ? <input name="returnToUnitStableKey" type="hidden" value={contextUnit.id} /> : null}
      <p className="text-xs text-[var(--text-secondary)] sm:col-span-2">* Required. Everything else is optional.</p>
      {entityType === "organization_unit" ? (
        <>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Organization Unit name<RequiredMark />
            </span>
            <Input
              maxLength={255}
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          {contextUnit ? <div className="sm:col-span-2 text-sm text-[var(--text-secondary)]"><input name="parentOrganizationUnitStableKey" type="hidden" value={contextUnit.id} />Within {contextUnit.name}</div> : <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Parent Organization Unit (optional)
            </span>
            <Select
              name="parentOrganizationUnitStableKey"
              onChange={(event) => setUnitStableKey(event.target.value)}
              value={unitStableKey}
            >
              <option value="">No Parent Unit — root Unit</option>
              {data.units
                .filter((unit) => unit.status === "active")
                .map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}{unit.parent ? ` — within ${unit.parent.name}` : " — root Unit"}
                  </option>
                ))}
            </Select>
            <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
              Unit hierarchy does not establish manager reporting, Process ownership, or operational responsibility.
            </span>
          </label>}
        </>
      ) : null}

      {entityType === "position" ? (
        <>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Job title<RequiredMark />
            </span>
            <Input
              maxLength={255}
              name="title"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          {contextUnit ? <div className="sm:col-span-2 text-sm text-[var(--text-secondary)]"><input name="organizationUnitStableKey" type="hidden" value={contextUnit.id} />In {contextUnit.name}</div> : <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Organization Unit (optional)
            </span>
            <Select
              name="organizationUnitStableKey"
              onChange={(event) => setUnitStableKey(event.target.value)}
              value={unitStableKey}
            >
              <option value="">No Organization Unit recorded</option>
              {data.units
                .filter((unit) => unit.status === "active")
                .map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}{unit.parent ? ` — within ${unit.parent.name}` : " — root Unit"}
                  </option>
                ))}
            </Select>
            <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
              A Position is a durable structural seat. Its title does not create an Operational Role.
            </span>
          </label>}
        </>
      ) : null}

      {entityType === "person" ? (
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Person’s name<RequiredMark />
          </span>
          <Input
            maxLength={255}
            name="displayName"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
          <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
            {contextUnit ? "You can choose their job title after saving. This does not create a login." : "This does not create a Lotura login or assign a job title."}
          </span>
        </label>
      ) : null}

      {duplicate ? (
        <Alert className="sm:col-span-2" tone="warning">
          <div>
            <p className="font-medium">A matching active {label} already exists.</p>
            <p className="mt-1 text-xs leading-5">
              Duplicate names and titles can be legitimate, but stable identity must remain distinct. Review the existing record before continuing.
            </p>
            <label className="mt-3 flex items-start gap-2 text-xs">
              <input
                className="mt-0.5 size-4"
                name="acknowledgePossibleDuplicate"
                required
                type="checkbox"
                value="confirmed"
              />
              <span>Create a separate record after reviewing this possible duplicate.<RequiredMark /></span>
            </label>
          </div>
        </Alert>
      ) : null}

      <CreationMetadataFields reason={reason} setReason={setReason} />
      {state.status !== "idle" ? (
        <Alert
          className="sm:col-span-2"
          tone={state.status === "success" ? "success" : "error"}
        >
          {state.message}
        </Alert>
      ) : null}
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? `Adding ${label}…` : `Add ${label}`}
        </Button>
      </div>
    </form>
  );
}
