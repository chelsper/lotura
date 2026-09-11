import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadPersonalContextExperience } from "@/lib/personal-context-experience";

import { PersonalContextView } from "../personal-context";
import { WorkspaceShell } from "../workspace-shell";

export default async function PersonalContextPage() {
  await connection();
  const experience = await loadPersonalContextExperience();
  if (!experience.enabled) notFound();

  return (
    <WorkspaceShell
      activeView="context"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <PersonalContextView
        authoringEnabled={experience.authoring.enabled}
        context={experience.personalContext}
        discoveryEnabled={experience.discovery.enabled}
        organizationName={experience.configuration.appearance.displayName}
      />
    </WorkspaceShell>
  );
}
