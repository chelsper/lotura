import type { DiscoveryObservationRecord } from "./discovery-data";

export type DiscoveryReconciliationSection = {
  description: string;
  evidence: Array<
    Pick<
      DiscoveryObservationRecord,
      | "epistemicState"
      | "id"
      | "promptKey"
      | "promptText"
      | "responseText"
      | "sequence"
    >
  >;
  key:
    | "definition"
    | "boundaries"
    | "responsibility"
    | "steps"
    | "systems"
    | "exceptions"
    | "dependencies"
    | "unresolved";
  label: string;
  topics: DiscoveryObservationRecord["topic"][];
};

export const DISCOVERY_RECONCILIATION_SECTIONS: Array<
  Omit<DiscoveryReconciliationSection, "evidence">
>;

export function buildDiscoveryReconciliationEvidence(
  observations: DiscoveryObservationRecord[],
): DiscoveryReconciliationSection[];
