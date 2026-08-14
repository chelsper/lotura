import type { DiscoveryMappingItemRecord } from "@/lib/discovery-data";

function value(value: unknown, fallback = "Not documented") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function documentedTreatment(item: DiscoveryMappingItemRecord) {
  switch (item.action) {
    case "update_process_purpose":
      return value(item.beforeState.purpose);
    case "change_process_owner":
      return value(item.beforeState.ownerRoleName, "Not assigned");
    case "revise_process_step":
      return `${value(item.beforeState.title)}\n${value(item.beforeState.instructions)}`;
    case "change_step_responsibility":
      return value(item.beforeState.responsibleRoleName, "Not assigned");
    case "revise_process_exception":
      return `${value(item.beforeState.name)}\nWhen: ${value(item.beforeState.condition)}\nInstead: ${value(item.beforeState.response)}`;
    default:
      return "No documented field is being replaced.";
  }
}

function proposedTreatment(item: DiscoveryMappingItemRecord) {
  switch (item.action) {
    case "update_process_purpose":
      return value(item.proposedState.purpose);
    case "change_process_owner":
      return value(item.proposedState.ownerRoleName, "No Owner Role");
    case "add_process_step":
      return `Step ${String(item.proposedState.position)}: ${value(item.proposedState.title)}\n${value(item.proposedState.instructions)}\nResponsible Role: ${value(item.proposedState.responsibleRoleName, "Not assigned")}`;
    case "revise_process_step":
      return `${value(item.proposedState.title)}\n${value(item.proposedState.instructions)}`;
    case "change_step_responsibility":
      return value(item.proposedState.responsibleRoleName, "Not assigned");
    case "link_existing_system":
      return `${value(item.proposedState.systemName)}\nUse: ${value(item.proposedState.usage)}`;
    case "add_process_exception":
    case "revise_process_exception":
      return `${value(item.proposedState.name)}\nWhen: ${value(item.proposedState.condition)}\nInstead: ${value(item.proposedState.response)}${item.action === "add_process_exception" ? `\nRelated Step: ${value(item.proposedState.processStepTitle, "Whole Process")}` : ""}`;
    case "add_process_dependency":
      return `${value(item.proposedState.relatedProcessName)} · ${value(item.proposedState.direction)} · ${value(item.proposedState.dependencyType)}${item.proposedState.description ? `\n${value(item.proposedState.description)}` : ""}`;
    case "preserve_unresolved":
      return value(item.proposedState.question);
  }
}

export type DiscoveryMappingEvidence = {
  id: string;
  responseText: string | null;
  sequence: number;
};

export function DiscoveryProposalItemSummary({
  item,
  observationById,
}: {
  item: DiscoveryMappingItemRecord;
  observationById: Map<string, DiscoveryMappingEvidence>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[10px] bg-[var(--surface-subtle)] p-4">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Documented when mapped</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
            {documentedTreatment(item)}
          </p>
        </div>
        <div className="rounded-[10px] bg-[var(--accent-subtle)] p-4">
          <p className="text-xs font-medium text-[var(--workspace-accent)]">Proposed treatment</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
            {proposedTreatment(item)}
          </p>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-[var(--text-tertiary)]">Supporting interview answers</p>
        <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          {item.sourceObservationIds.map((observationId) => {
            const observation = observationById.get(observationId);
            return (
              <li key={observationId}>
                {observation
                  ? `Answer ${observation.sequence}: ${observation.responseText || "Explicitly unknown"}`
                  : "Interview answer retained by immutable reference"}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--text)]">Rationale:</span> {item.rationale}
      </p>
    </div>
  );
}
