import { connection } from "next/server";

import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { EvidenceLegend, FlowAnalysis } from "../flow-analysis";
import { FlowIcon } from "../ui/icons";
import { WorkspacePageHeader, WorkspaceShell } from "../workspace-shell";

export default async function FlowPage() {
  await connection();
  const { analysis, asOf, configuration, data, source } =
    await loadWorkspaceExperience();

  return (
    <WorkspaceShell
      activeView="flow"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description="FLOW reviews the documented operating model for ownership gaps, responsibility questions, concentrations, and possible change impact. It identifies what may deserve review without proving failure or recommending a decision."
        eyebrow={
          <>
            <FlowIcon className="size-3.5" />
            Evidence-based review
          </>
        }
        stats={[
          { label: "Items to review", value: analysis.currentGaps.length },
          { label: "Processes reviewed", value: data.processes.length },
          {
            label: "What-if views",
            value:
              analysis.scenarios.roles.length * 2 +
              analysis.scenarios.systems.length +
              analysis.scenarios.processes.length,
          },
        ]}
        title="FLOW Analysis"
      />
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
        <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Use FLOW to see where responsibility may be unclear, where operational
          reach is concentrated, and what should be reviewed before something
          changes.
        </p>
        <EvidenceLegend />
      </div>
      <FlowAnalysis analysis={analysis} />
    </WorkspaceShell>
  );
}
