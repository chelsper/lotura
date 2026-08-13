export type DiscoveryMappingAction =
  | "update_process_purpose"
  | "change_process_owner"
  | "preserve_unresolved";

export type DiscoveryMappingItemState = "active" | "withdrawn";

export type DiscoveryMappingItemLike = {
  action: DiscoveryMappingAction;
  itemId: string;
  itemSequence: number;
  sourceObservationIds: string[];
  state: DiscoveryMappingItemState;
};

export const DISCOVERY_MAPPING_ACTIONS: DiscoveryMappingAction[];
export const DISCOVERY_MAPPING_ACTION_LABELS: Record<
  DiscoveryMappingAction,
  string
>;

export function currentDiscoveryMappingItems<
  T extends DiscoveryMappingItemLike,
>(items: T[]): Map<string, T>;

export function discoveryMappingReadiness(
  includedObservationIds: string[],
  items: DiscoveryMappingItemLike[],
): {
  activeItems: number;
  canFinish: boolean;
  proposedChanges: number;
  unresolved: number;
  uncoveredObservationIds: string[];
  withdrawnItems: number;
};
