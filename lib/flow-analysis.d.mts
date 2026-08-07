import type { ProcessExplorerSeed } from "./process-explorer-data";

export type FlowEvidence =
  | "Direct impact"
  | "Potential indirect impact"
  | "Review recommended";

export type FlowFact = { label: string; value: string };

export type FlowFinding = {
  id: string;
  evidence: FlowEvidence;
  title: string;
  summary: string;
  facts: FlowFact[];
  howDetermined: string;
  limitation: string | null;
  processIds: string[];
  roleIds: string[];
  systemIds: string[];
};

export type FlowPersonAssignment = {
  membershipId: string;
  personId: string;
  personName: string;
  assignmentType: "permanent" | "interim" | "acting" | "backup";
  effectiveFrom: string;
  effectiveUntil: string | null;
  reason: string | null;
};

export type FlowRoleCoverage = {
  roleId: string;
  primary: FlowPersonAssignment | null;
  backups: FlowPersonAssignment[];
};

export type StepResponsibilityClassification =
  | "explicit"
  | "inherited"
  | "unclear"
  | "unstaffed"
  | "retired";

export type FlowStepResponsibility = {
  stepId: string;
  stepTitle: string;
  processId: string;
  processName: string;
  roleId: string | null;
  roleName: string | null;
  basis: "explicit" | "inherited";
  classification: StepResponsibilityClassification;
};

export type FlowAnalysisResult = {
  organization: { name: string };
  asOf: string;
  evidenceLanguage: {
    direct: "Direct impact";
    indirect: "Potential indirect impact";
    review: "Review recommended";
  };
  roleCoverage: FlowRoleCoverage[];
  responsibilityCounts: Record<StepResponsibilityClassification, number>;
  responsibilities: FlowStepResponsibility[];
  currentGaps: FlowFinding[];
  concentrations: {
    roles: FlowFinding[];
    exceptions: FlowFinding[];
    systems: FlowFinding[];
    dependencies: FlowFinding[];
  };
  scenarios: {
    roles: Array<{
      roleId: string;
      roleName: string;
      vacancy: FlowFinding;
      restructuring: FlowFinding;
    }>;
    systems: FlowFinding[];
    processes: FlowFinding[];
  };
};

export function isAssignmentCurrent(
  assignment: ProcessExplorerSeed["roleAssignments"][number],
  membership: ProcessExplorerSeed["memberships"][number] | undefined,
  asOf: string,
): boolean;

export function getRoleCoverage(
  seed: ProcessExplorerSeed,
  asOf: string,
): FlowRoleCoverage[];

export function analyzeStepResponsibilities(
  seed: ProcessExplorerSeed,
  asOf: string,
): FlowStepResponsibility[];

export function analyzeDependencyGraph(seed: ProcessExplorerSeed): Array<{
  processId: string;
  directUpstreamIds: string[];
  directDownstreamIds: string[];
  allUpstreamIds: string[];
  allDownstreamIds: string[];
  upstreamDepth: number;
  downstreamDepth: number;
  longestUpstreamPath: string[];
  longestDownstreamPath: string[];
  cycleProcessIds: string[];
}>;

export function analyzeRoleImpact(
  seed: ProcessExplorerSeed,
  asOf: string,
): unknown[];

export function analyzeSystemImpact(
  seed: ProcessExplorerSeed,
  graph?: ReturnType<typeof analyzeDependencyGraph>,
): Array<{
  systemId: string;
  systemName: string;
  directProcessIds: string[];
  directProcessNames: string[];
  potentialIndirectIds: string[];
  potentialIndirectNames: string[];
}>;

export function analyzeProcessChangeImpact(
  seed: ProcessExplorerSeed,
  graph?: ReturnType<typeof analyzeDependencyGraph>,
): Array<{
  processId: string;
  processName: string;
  directUpstreamIds: string[];
  directDownstreamIds: string[];
  potentialIndirectIds: string[];
  participatingRoleIds: string[];
  participatingRoleNames: string[];
  directSystemIds: string[];
  directSystemNames: string[];
  contextualSystemIds: string[];
  contextualSystemNames: string[];
  activeExceptionIds: string[];
}>;

export function buildFlowAnalysis(
  seed: ProcessExplorerSeed,
  asOf: string,
): FlowAnalysisResult;
