import type { KnowledgeGaps } from "./knowledge-gaps.mjs";
import type { OrganizationStructureData } from "./organization-structure-data.mjs";
import type { ProcessExplorerData } from "./process-explorer-data";

export class PersonalContextResolutionError extends Error {}

export function describePersonalContextDependency(
  processName: string,
  dependency: {
    direction: "incoming" | "outgoing";
    processName: string;
    type: string;
  },
): string;

export type PersonalContext = ReturnType<typeof buildPersonalContext>;

export function buildPersonalContext(input: {
  association: {
    applicationIdentity: "temporary-admin";
    personStableKey: string;
    positionStableKey: string;
  };
  data: OrganizationStructureData;
  explorerData: ProcessExplorerData;
  familyIndex?: Record<
    string,
    Array<{ name: string; stableKey: string; status: "active" | "inactive" }>
  >;
  knowledgeGaps: KnowledgeGaps;
  systemStableKeys?: Record<string, string>;
}): {
  applicationIdentity: "temporary-admin";
  assignment: {
    effectiveFrom: string;
    effectiveUntil: string | null;
    type: string;
    typeLabel: string;
  };
  connectedUnits: Array<{ id: string; name: string; relationship: string }>;
  directReports: Array<{
    id: string;
    title: string;
    unit: { id: string; name: string } | null;
    people: Array<{ id: string; name: string }>;
    isCrossUnit: boolean;
  }>;
  manager: {
    id: string;
    title: string;
    unit: { id: string; name: string } | null;
    people: Array<{ id: string; name: string }>;
  } | null;
  ownedProcesses: Array<PersonalProcess>;
  participatedProcesses: Array<PersonalProcess>;
  person: { id: string; name: string };
  position: { id: string; title: string };
  roles: Array<{
    coverageType: string;
    coverageTypeLabel: string;
    effectiveFrom: string;
    effectiveUntil: string | null;
    id: string;
    mandateType: string;
    mandateTypeLabel: string;
    name: string;
    processes: OrganizationStructureData["people"][number]["coverages"][number]["processes"];
    scope: string | null;
    stableKey: string | null;
  }>;
  systems: Array<{
    id: string;
    name: string;
    processId: string;
    processName: string;
    stableKey: string | null;
    usage: string;
  }>;
  unit: {
    children: Array<{ id: string; name: string }>;
    id: string;
    name: string;
    parent: { id: string; name: string } | null;
  } | null;
  unresolved: KnowledgeGaps["items"];
};

type PersonalProcess = {
  dependencies: Array<{
    description: string | null;
    direction: "incoming" | "outgoing";
    processId: string;
    processName: string;
    type: string;
  }>;
  families: Array<{
    name: string;
    stableKey: string;
    status: "active" | "inactive";
  }>;
  id: string;
  name: string;
  purpose: string | null;
  relationships: string[];
  status: "draft" | "active" | "archived";
  systems: Array<{
    id: string;
    name: string;
    stableKey: string | null;
    usage: string;
  }>;
};
