import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadProcessFamilyContext } from "@/lib/process-family-data";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { WorkspaceShell } from "../../../workspace-shell";
import { ProcessFamilyCreateForm } from "../process-family-create-form";

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function NewProcessFamilyPage({
  searchParams,
}: {
  searchParams: Promise<{
    relationshipIntent?: string | string[];
    sourceFamily?: string | string[];
  }>;
}) {
  await connection();
  const experience = await loadWorkspaceExperience();
  if (!experience.authoring.enabled) notFound();
  const query = await searchParams;
  const requestedIntent = single(query.relationshipIntent);
  const requestedSource = single(query.sourceFamily);
  const sourceFamily = requestedSource && uuidPattern.test(requestedSource)
    ? await loadProcessFamilyContext(
        experience.authoring.organizationId,
        requestedSource,
      )
    : null;
  const relationshipIntent =
    sourceFamily?.status === "active" &&
    (requestedIntent === "broader" || requestedIntent === "narrower")
      ? requestedIntent
      : null;
  return (
    <WorkspaceShell activeView="studio" asOf={experience.asOf} configuration={experience.configuration} source={experience.source}>
      <ProcessFamilyCreateForm
        relationshipIntent={relationshipIntent}
        sourceFamilyName={relationshipIntent ? sourceFamily?.name : null}
        sourceFamilyStableKey={relationshipIntent ? sourceFamily?.stableKey : null}
        today={new Date().toISOString().slice(0, 10)}
      />
    </WorkspaceShell>
  );
}
