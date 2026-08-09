import type { OrganizationStructureSeed } from "./organization-structure-data.mjs";
import type { ProcessExplorerSeed } from "./process-explorer-data";
import type {
  OperatingModelConfiguration,
  OperatingModelSource,
} from "./process-explorer-source-policy.mjs";

export type LoadedOrganizationStructure = {
  structure: OrganizationStructureSeed;
  operatingModel: ProcessExplorerSeed;
  asOf: string;
  source: OperatingModelSource;
};

export function loadOrganizationStructureFromPolicy(
  configuration: OperatingModelConfiguration,
  dependencies: {
    loadDemo: () => Promise<{
      structure: OrganizationStructureSeed;
      operatingModel: ProcessExplorerSeed;
    }>;
    loadNeon: (organizationId: number) => Promise<{
      structure: OrganizationStructureSeed;
      operatingModel: ProcessExplorerSeed;
      asOf: string;
    }>;
    now?: () => Date | string | number;
  },
): Promise<LoadedOrganizationStructure>;
