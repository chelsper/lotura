import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadTechnologyCatalog } from "@/lib/technology-authoring-data";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { SystemIcon } from "../../ui/icons";
import { WorkspacePageHeader, WorkspaceShell } from "../../workspace-shell";
import { TechnologyBrowser } from "./technology-browser";

export default async function TechnologyPage() {
  await connection();
  const experience = await loadWorkspaceExperience();
  if (!experience.authoring.enabled) notFound();
  const catalog = await loadTechnologyCatalog(experience.authoring.organizationId);
  const active = catalog.systems.filter((item) => item.status === "active").length;
  const relationships = catalog.systems.reduce(
    (total, item) => total + item.processCount,
    0,
  );

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description="Maintain the technology explicitly documented in the operating model. A System link records use; it does not establish criticality, performance, or risk."
        eyebrow={
          <>
            <SystemIcon className="size-3.5" />
            Workspace Studio · Technology
          </>
        }
        stats={[
          { label: "Systems", value: catalog.systems.length },
          { label: "Active", value: active },
          { label: "Process links", value: relationships },
        ]}
        title="Technology"
      />
      <TechnologyBrowser systems={catalog.systems} />
    </WorkspaceShell>
  );
}
