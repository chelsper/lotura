import type {
  NonConfidentialPilotPreview,
} from "@/lib/discovery-assistance-non-confidential-pilot.mjs";

import { Alert, FieldLabel } from "../../ui/primitives";

type Props = {
  preview: NonConfidentialPilotPreview;
};

const sourceLabels = {
  inquiry_context: "Original question and interview focus",
  inquiry_observation: "Earlier saved answer",
  process_observation: "Earlier saved Process answer",
  process_snapshot: "Current documented Process",
};

function displayLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function DisplayValue({ value }: { value: unknown }) {
  if (value === null || value === "") {
    return <span className="text-[var(--text-tertiary)]">Not provided</span>;
  }
  return <>{String(value)}</>;
}

export function DiscoveryAssistancePilotAuthorization({ preview }: Props) {
  const { packet } = preview.providerContext;

  return (
    <section
      aria-labelledby="external-assistance-review-heading"
      className="rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] p-4"
    >
      <h3
        className="text-base font-semibold text-[var(--text)]"
        id="external-assistance-review-heading"
      >
        Review what would be shared
      </h3>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
        This is the exact interview context Lotura prepared for external AI
        assistance. If anything here should not be shared, use the regular
        interview question instead.
      </p>

      <div className="mt-4 space-y-3">
        <div className="rounded-[9px] bg-[var(--surface-subtle)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            Current question
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
            {packet.currentQuestion}
          </p>
        </div>

        {packet.participantFocus ? (
          <div className="rounded-[9px] bg-[var(--surface-subtle)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              Your requested focus
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
              {packet.participantFocus}
            </p>
          </div>
        ) : null}

        {preview.providerContext.originalText ? (
          <div className="rounded-[9px] bg-[var(--surface-subtle)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              Your rough notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
              {preview.providerContext.originalText}
            </p>
          </div>
        ) : null}

        {packet.sources.map((source) => (
          <div
            className="rounded-[9px] bg-[var(--surface-subtle)] p-3"
            key={`${source.kind}-${source.sequence}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              {sourceLabels[source.kind]}
            </p>
            <dl className="mt-2 space-y-2">
              {Object.entries(source.snapshot).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs font-medium text-[var(--text-tertiary)]">
                    {displayLabel(key)}
                  </dt>
                  <dd className="whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
                    <DisplayValue value={value} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <Alert className="mt-4" tone="warning">
        {preview.disclosure}
      </Alert>

      <input
        name="confirmedContextFingerprint"
        type="hidden"
        value={preview.contextFingerprint}
      />
      <fieldset className="mt-4 space-y-3">
        <legend className="sr-only">Confirm external assistance</legend>
        {preview.affirmations.map((affirmation) => (
          <label
            className="flex items-start gap-3 rounded-[9px] border border-[var(--border)] p-3"
            key={affirmation.key}
          >
            <input
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--workspace-accent)]"
              name={affirmation.key}
              required
              type="checkbox"
              value="yes"
            />
            <span className="text-sm leading-6 text-[var(--text-secondary)]">
              <FieldLabel>{affirmation.label}</FieldLabel>
            </span>
          </label>
        ))}
      </fieldset>

      <p className="mt-4 text-xs leading-5 text-[var(--text-tertiary)]">
        Leaving either box unchecked sends nothing. The regular interview stays
        available.
      </p>
    </section>
  );
}
