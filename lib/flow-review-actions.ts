import type { FlowFinding } from "./flow-analysis.mjs";
import type { ProcessExplorerData } from "./process-explorer-data";

export type FlowReviewItem = {
  actions: Array<{ label: string; href: string }>;
  processLinks: Array<{ name: string; href: string }>;
  note: string | null;
};

export type FlowReviewActions = Record<string, FlowReviewItem>;

// Navigation only. Destinations independently authorize and audit every change.
// Resolve identities from the same scoped snapshot used to produce the findings.
export function buildFlowReviewActions({
  findings,
  data,
  canAuthorProcesses,
  canManageResponsibilities,
  canDiscover,
}: {
  findings: FlowFinding[];
  data: ProcessExplorerData;
  canAuthorProcesses: boolean;
  canManageResponsibilities: boolean;
  canDiscover: boolean;
}): FlowReviewActions {
  return Object.fromEntries(findings.map((finding) => {
    const actions: FlowReviewItem["actions"] = [];
    const process = data.processes.find((item) => item.id === finding.processIds[0]);
    const role = data.roles.find((item) => item.id === finding.roleIds[0]);
    const system = data.systems.find((item) => item.id === finding.systemIds[0]);
    const staffing = finding.id.startsWith("vacant-") || finding.id.startsWith("temporary-");
    const steps = finding.id.startsWith("responsibility-");
    const legacyStaffing = staffing || (steps && finding.facts.some(
      (fact) => fact.label === "Unstaffed" && Number(fact.value) > 0,
    ));

    if (canAuthorProcesses && process) {
      const base = `/studio/processes/${encodeURIComponent(process.id)}`;
      if (finding.id.startsWith("ownership-process-") || finding.id.startsWith("ownership-retired-process-")) {
        actions.push({ label: "Review Process owner", href: `${base}#ownership` });
      } else if (finding.id.startsWith("ownership-exception-")) {
        actions.push({ label: "Review Exception owner", href: `${base}#exceptions` });
      } else if (steps) {
        actions.push({ label: "Review Step responsibilities", href: `${base}#steps` });
      }
    }
    if (canAuthorProcesses && finding.id.startsWith("ownership-system-") && system?.stableKey) {
      actions.push({ label: "Review System owner", href: `/studio/technology/systems/${encodeURIComponent(system.stableKey)}` });
    }
    if (canManageResponsibilities && staffing && role?.stableKey) {
      actions.push({ label: "Review Role coverage", href: `/studio/responsibilities/roles/${encodeURIComponent(role.stableKey)}#coverage` });
    }
    if (canDiscover) {
      actions.push({
        label: "Explore in Discovery",
        href: process ? `/studio/discovery?process=${encodeURIComponent(process.id)}` : "/studio/discovery",
      });
    }

    return [finding.id, {
      actions,
      processLinks: [...new Set(finding.processIds)].flatMap((id) => {
        const related = data.processes.find((item) => item.id === id);
        return related ? [{ name: related.name, href: `/explorer/${encodeURIComponent(id)}` }] : [];
      }),
      note: legacyStaffing
        ? "This staffing check uses older assignment records. Review current Role coverage before treating it as a gap; changing that coverage will not clear this finding yet."
        : null,
    }];
  }));
}
