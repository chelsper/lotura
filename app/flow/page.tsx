import { connection } from "next/server";

import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { EvidenceLegend, FlowAnalysis } from "../flow-analysis";
import { FlowIcon } from "../ui/icons";
import { WorkspacePageHeader, WorkspaceShell } from "../workspace-shell";

export default async function FlowPage() {
  await connection();
  const { analysis, asOf, configuration, source } =
    await loadWorkspaceExperience();

  return (
    <WorkspaceShell
      activeView="flow"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description="FLOW turns the documented operating model into explainable questions: what deserves attention now, and what might need review before something changes."
        eyebrow={
          <>
            <FlowIcon className="size-3.5" />
            Evidence-based review
          </>
        }
        title="FLOW Analysis"
      />
      <div className="mt-4">
        <EvidenceLegend />
      </div>
      <FlowAnalysis analysis={analysis} />
    </WorkspaceShell>
  );
}
