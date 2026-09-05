"use client";

import { useActionState, useState } from "react";

import { Alert, Button, FieldLabel, Input, Select } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import { createDiscoveryProcessBaselineAction } from "./actions";

type Option = { id: string; name: string };

export function DiscoveryProcessBaselineForm({
  defaultName,
  defaultPurpose,
  defaultSteps,
  families,
  inquiryId,
  reviewId,
  roles,
  sessionId,
}: {
  defaultName: string;
  defaultPurpose: string;
  defaultSteps: string;
  families: Option[];
  inquiryId: string;
  reviewId: string;
  roles: Option[];
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    createDiscoveryProcessBaselineAction,
    initialDiscoveryActionState,
  );
  const [ownerRoleKey, setOwnerRoleKey] = useState("");
  const [familyKey, setFamilyKey] = useState("");

  return (
    <form action={action} className="space-y-5">
      <input name="inquiryId" type="hidden" value={inquiryId} />
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="reviewId" type="hidden" value={reviewId} />

      <Alert tone="info">
        Lotura used the working synthesis only as a starting point. Edit it so
        this describes what actually happens today. This will remain a Draft,
        not an approved or complete Process.
      </Alert>

      <label className="block">
        <FieldLabel>Process name</FieldLabel>
        <Input defaultValue={defaultName} maxLength={255} name="name" required />
      </label>

      <label className="block">
        <FieldLabel>Purpose and boundaries</FieldLabel>
        <textarea
          className="min-h-40 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          defaultValue={defaultPurpose}
          maxLength={5000}
          name="purpose"
          placeholder="What is this Process for? When does it start and end?"
          required
        />
      </label>

      <label className="block">
        <FieldLabel>Major steps — one per line</FieldLabel>
        <textarea
          className="min-h-52 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          defaultValue={defaultSteps}
          maxLength={20000}
          name="steps"
          placeholder={"Receive the request\nReview the request against current guidance\nRecord and communicate the decision"}
          required
        />
        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
          Keep this to the 1–12 steps someone needs to understand the basic flow.
          Exceptions and finer detail can be added later.
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block">
            <FieldLabel>Owner Role (optional)</FieldLabel>
            <Select
              name="ownerRoleKey"
              onChange={(event) => setOwnerRoleKey(event.target.value)}
              value={ownerRoleKey}
            >
              <option value="">Leave unassigned for now</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </Select>
          </label>
          {ownerRoleKey ? (
            <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--text-secondary)]">
              <input
                className="mt-0.5 size-4 accent-[var(--workspace-accent)]"
                name="ownerConfirmed"
                required
                type="checkbox"
                value="yes"
              />
              I confirm this is the intended Owner Role, not merely a person or
              Role mentioned in the interview.
            </label>
          ) : null}
        </div>

        <div>
          <label className="block">
            <FieldLabel>Process Family (optional)</FieldLabel>
            <Select
              name="processFamilyStableKey"
              onChange={(event) => setFamilyKey(event.target.value)}
              value={familyKey}
            >
              <option value="">Leave ungrouped for now</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>{family.name}</option>
              ))}
            </Select>
          </label>
          {familyKey ? (
            <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--text-secondary)]">
              <input
                className="mt-0.5 size-4 accent-[var(--workspace-accent)]"
                name="familyConfirmed"
                required
                type="checkbox"
                value="yes"
              />
              I confirm this existing Family is the right grouping for the new
              Process.
            </label>
          ) : null}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-[10px] border border-[var(--workspace-accent-border)] bg-[var(--workspace-accent-subtle)] p-4">
        <input
          className="mt-0.5 size-4 accent-[var(--workspace-accent)]"
          name="reviewedBaseline"
          required
          type="checkbox"
          value="yes"
        />
        <span className="text-sm leading-6 text-[var(--text-secondary)]">
          I reviewed this baseline. Create it as a shared working Draft and keep
          the unanswered and Needs validation items available for later work.
        </span>
      </label>

      {state.status === "error" ? (
        <Alert tone="error">{state.message}</Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <p className="max-w-xl text-xs leading-5 text-[var(--text-tertiary)]">
          You can use the Draft immediately, take a break, and return later to
          strengthen it with more Discovery evidence.
        </p>
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Creating baseline…" : "Create shared working baseline"}
        </Button>
      </div>
    </form>
  );
}
