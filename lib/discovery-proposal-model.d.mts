import type { ExplorerProcess } from "./process-explorer-data";

export type DiscoveryProposalDisposition =
  | "use_in_proposal"
  | "keep_documented"
  | "leave_for_later";

export type DocumentedProcessSnapshot = {
  dependencies: {
    downstream: ExplorerProcess["downstream"];
    upstream: ExplorerProcess["upstream"];
  };
  exceptions: ExplorerProcess["exceptions"];
  process: Pick<ExplorerProcess, "id" | "name" | "purpose" | "status"> & {
    ownerRole: { id: string; name: string } | null;
  };
  steps: ExplorerProcess["steps"];
  systems: ExplorerProcess["systems"];
};

export type DiscoveryProposalDecisionLike = {
  decisionSequence: number;
  disposition: DiscoveryProposalDisposition;
  observationId: string;
};

export const DISCOVERY_PROPOSAL_DISPOSITIONS: DiscoveryProposalDisposition[];
export const DISCOVERY_PROPOSAL_DISPOSITION_LABELS: Record<
  DiscoveryProposalDisposition,
  string
>;

export function buildDocumentedProcessSnapshot(
  process: ExplorerProcess,
): DocumentedProcessSnapshot;

export function currentDiscoveryProposalDecisions<
  T extends DiscoveryProposalDecisionLike,
>(decisions: T[]): Map<string, T>;

export function discoveryProposalReadiness(
  observationIds: string[],
  decisions: DiscoveryProposalDecisionLike[],
): {
  canFinish: boolean;
  included: number;
  kept: number;
  later: number;
  remaining: number;
  reviewed: number;
  total: number;
};
