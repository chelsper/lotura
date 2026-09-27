"use client";

import { useRef, useState, type FormEvent } from "react";

import type { OrganizationPosition, OrganizationStructureData } from "@/lib/organization-structure-data.mjs";
import { rolePickerOptions } from "@/lib/structure-picker-options";
import { establishRoleMandateAction } from "../organization/actions";
import { initialStructureActionState, type StructureActionState } from "../organization/action-state";
import { ChangeMetadataFields } from "../organization/structure-administration-panel";
import { Alert, Badge, Button, Input, RequiredMark, Select } from "../ui/primitives";
import { SearchableSelect } from "../ui/searchable-select";

export function UnitResponsibilitiesPanel({ data, position, onSaved, onPendingChange, onDirty }: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
  onSaved: (message: string) => void;
  onPendingChange: (pending: boolean) => void;
  onDirty: () => void;
}) {
  const [roleKey, setRoleKey] = useState("");
  const [mandateType, setMandateType] = useState("");
  const [state, setState] = useState<StructureActionState>(initialStructureActionState);
  const [pending, setPending] = useState(false);
  const [saveUnconfirmed, setSaveUnconfirmed] = useState(false);
  const submitting = useRef(false);
  const selectionHasEdits = useRef(false);
  const currentRoleIds = new Set(position.mandates.map((mandate) => mandate.role.id));
  const availableRoles = data.operationalRoles.filter((role) => role.status === "active" && !currentRoleIds.has(role.id));
  const selectedRole = availableRoles.find((role) => role.id === roleKey);
  const holders = selectedRole ? data.positions.flatMap((candidate) => candidate.mandates
    .filter((mandate) => mandate.role.id === selectedRole.id)
    .map((mandate) => ({ position: candidate, mandate }))) : [];
  const hasPrimary = holders.some(({ mandate }) => mandate.type === "primary");
  const unavailable = position.status !== "active" || !position.revision;
  const disabled = pending || saveUnconfirmed || state.status === "success" || unavailable;
  const validChoice = Boolean(selectedRole) && (mandateType === "shared" || (mandateType === "primary" && !hasPrimary));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || disabled || !validChoice) return;
    const formData = new FormData(event.currentTarget);
    // Only the explicit existing-role choice is accepted here; creation stays in full details.
    if (formData.get("roleKey") !== selectedRole?.id || formData.get("mandateType") !== mandateType) return;
    if (mandateType === "shared" && !String(formData.get("scope") ?? "").trim()) return;
    submitting.current = true;
    setPending(true);
    onPendingChange(true);
    setState(initialStructureActionState);
    let result: StructureActionState | undefined;
    try {
      result = await establishRoleMandateAction(initialStructureActionState, formData);
      setState(result);
    } catch {
      setSaveUnconfirmed(true);
      setState({ status: "error", message: "We couldn't confirm the save. Your entries are still here. Close this panel and refresh the Unit before trying again." });
    } finally {
      submitting.current = false;
      setPending(false);
      onPendingChange(false);
    }
    if (result?.status === "success") onSaved("Responsibility linked. The change is saved in history.");
  }

  return (
    <div className="mt-4 space-y-6">
      <section aria-label="Current responsibilities">
        <h3 className="text-sm font-semibold">Currently linked</h3>
        {position.mandates.length ? <ul className="mt-3 space-y-3">
          {position.mandates.map((mandate) => {
            const role = data.operationalRoles.find((candidate) => candidate.id === mandate.role.id);
            return (
              <li className="rounded-[10px] border border-[var(--border)] p-3" key={mandate.id}>
                <p className="font-medium">{mandate.role.name}</p>
                <div className="mt-2"><Badge>{mandate.type === "primary" ? "Primary accountability" : "Shared responsibility"}</Badge></div>
                {role?.description ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{role.description}</p> : null}
                {mandate.scope ? <p className="mt-2 text-sm text-[var(--text-secondary)]">Scope: {mandate.scope}</p> : null}
                <p className="mt-2 text-xs text-[var(--text-secondary)]">{mandate.coverage.length ? `Recorded coverage: ${mandate.coverage.map((coverage) => `${coverage.person.name} (${coverage.typeLabel})`).join("; ")}` : "Who carries this out: not yet recorded."}</p>
              </li>
            );
          })}
        </ul> : <p className="mt-2 text-sm text-[var(--text-secondary)]">No current responsibilities are linked to this job title yet.</p>}
      </section>

      <section aria-label="Link an existing responsibility" className="border-t border-[var(--border)] pt-5">
        <h3 className="text-sm font-semibold">Link an existing responsibility</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">This links work to the position. It does not automatically assign that work to its people or change Process ownership.</p>
        {availableRoles.length && !unavailable ? <form className="mt-4" onChange={(event) => {
          if (["mandateType", "scope"].includes(event.target.name)) selectionHasEdits.current = true;
          onDirty();
        }} onSubmit={save}>
          <fieldset className="grid gap-4" disabled={disabled}>
            <input name="positionStableKey" type="hidden" value={position.id} />
            <input name="expectedRevision" type="hidden" value={position.revision} />
            <SearchableSelect
              label="Responsibility"
              name="roleKey"
              onChange={(event) => {
                if (event.target.value === roleKey) return;
                if (selectionHasEdits.current && !window.confirm("Choose a different responsibility? The responsibility type and scope will reset. Your reason and date will stay here.")) return;
                selectionHasEdits.current = false;
                setRoleKey(event.target.value);
                setMandateType("");
              }}
              options={rolePickerOptions(availableRoles)}
              placeholder="Choose a responsibility"
              searchPlaceholder="Search responsibilities"
              required
              value={roleKey}
            />
            {selectedRole ? <div className="rounded-[10px] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text)]">{selectedRole.name}</p>
              {selectedRole.description ? <p className="mt-1">{selectedRole.description}</p> : null}
              {holders.length ? <>
                <p className="mt-3 text-xs font-medium">Currently linked elsewhere</p>
                <ul className="mt-1 space-y-1 text-xs">{holders.map(({ position: holder, mandate }) => <li key={mandate.id}>{holder.title}{holder.unit ? ` · ${holder.unit.name}` : ""} — {mandate.type === "primary" ? "Primary accountability" : "Shared responsibility"}{mandate.scope ? ` · ${mandate.scope}` : ""}</li>)}</ul>
              </> : <p className="mt-2 text-xs">No current position link is recorded.</p>}
            </div> : null}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">This position’s part<RequiredMark /></span>
              <Select name="mandateType" onChange={(event) => setMandateType(event.target.value)} required value={mandateType}>
                <option value="">Choose its responsibility</option>
                <option disabled={hasPrimary} value="primary">Primary accountability</option>
                <option value="shared">Shared responsibility</option>
              </Select>
              {hasPrimary ? <span className="mt-2 block text-xs text-[var(--text-secondary)]">Primary accountability is already recorded above. Choose Shared responsibility to add this position; the existing link stays unchanged.</span> : null}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">{mandateType === "shared" ? <>Which part does this position handle?<RequiredMark /></> : "Scope (optional)"}</span>
              <Input key={roleKey} maxLength={2000} name="scope" required={mandateType === "shared"} />
            </label>
            <div className="rounded-[10px] border border-[var(--border)] p-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Record this change</p>
              <div className="mt-3 grid gap-3"><ChangeMetadataFields fixedKind="organizational_change" /></div>
            </div>
            <Button disabled={disabled || !validChoice} type="submit" variant="primary">{pending ? "Linking…" : "Link responsibility"}</Button>
          </fieldset>
          {state.status !== "idle" ? <div aria-live="polite" className="mt-4"><Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert></div> : null}
        </form> : <p className="mt-3 text-sm text-[var(--text-secondary)]">{unavailable ? "This job title isn’t available for linking. Refresh the Unit or open its full details." : "No other active responsibilities are available to link. To create a new one, open full job details below."}</p>}
      </section>
    </div>
  );
}
