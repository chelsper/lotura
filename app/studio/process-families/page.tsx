import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadProcessFamilyCatalog } from "@/lib/process-family-data";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { LayersIcon } from "../../ui/icons";
import { Alert } from "../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../workspace-shell";
import { ProcessFamilyBrowser } from "./process-family-browser";

export default async function ProcessFamiliesPage() {
  await connection();
  const experience = await loadWorkspaceExperience();
  if (!experience.authoring.enabled) notFound();
  const catalog = await loadProcessFamilyCatalog(experience.authoring.organizationId);
  const current = catalog.families.filter((family) => family.status === "active");
  const memberships = current.reduce((total, family) => total + family.activeMemberCount, 0);

  return (
    <WorkspaceShell activeView="studio" asOf={experience.asOf} configuration={experience.configuration} source={experience.source}>
      <WorkspacePageHeader
        description="Organize related Processes without flattening their meaningful differences. Family membership is explicit and never creates inheritance, dependency, or approval."
        eyebrow={<><LayersIcon className="size-3.5" />Workspace Studio · Operating Model</>}
        stats={[
          { label: "Families", value: catalog.families.length },
          { label: "Current", value: current.length },
          { label: "Current memberships", value: memberships },
        ]}
        title="Process Families"
      />
      <Alert className="mt-5" tone="info">
        A Process may belong to more than one Family. Lotura does not choose a primary Family or copy Family information into member Processes.
      </Alert>
      <ProcessFamilyBrowser families={catalog.families} />
    </WorkspaceShell>
  );
}
