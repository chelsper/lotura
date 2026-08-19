import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadProcessFamilyContext } from "@/lib/process-family-data";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { WorkspaceShell } from "../../../workspace-shell";
import { ProcessFamilyWorkspace } from "../process-family-workspace";

export default async function ProcessFamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ stableKey: string }>;
  searchParams: Promise<{ broaderFamily?: string | string[] }>;
}) {
  await connection();
  const { stableKey } = await params;
  const query = await searchParams;
  const experience = await loadWorkspaceExperience();
  if (!experience.authoring.enabled) notFound();
  const context = await loadProcessFamilyContext(
    experience.authoring.organizationId,
    stableKey,
  );
  if (!context) notFound();
  const requestedBroaderFamily =
    typeof query.broaderFamily === "string" ? query.broaderFamily : null;
  const suggestedBroaderFamilyStableKey = context.broaderFamilyOptions.some(
    (family) =>
      family.stableKey === requestedBroaderFamily && family.disabledReason === null,
  )
    ? requestedBroaderFamily
    : null;
  return (
    <WorkspaceShell activeView="studio" asOf={experience.asOf} configuration={experience.configuration} source={experience.source}>
      <ProcessFamilyWorkspace
        context={context}
        suggestedBroaderFamilyStableKey={suggestedBroaderFamilyStableKey}
        today={new Date().toISOString().slice(0, 10)}
      />
    </WorkspaceShell>
  );
}
