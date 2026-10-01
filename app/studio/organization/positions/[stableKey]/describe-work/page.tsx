import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";
import { PositionWorkDiscoveryForm } from "../../../../position-work-discovery-form";
import { WorkspaceShell } from "../../../../../workspace-shell";

export default async function PositionWorkDiscoveryPage({ params }: {
  params: Promise<{ stableKey: string }>;
}) {
  await connection();
  const { stableKey } = await params;
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled || !experience.discovery.enabled) notFound();
  const position = experience.data.positions.find((item) => item.id === stableKey && item.status === "active");
  if (!position) notFound();
  return (
    <WorkspaceShell activeView="studio" asOf={experience.asOf} configuration={experience.configuration} source={experience.source}>
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm text-[var(--workspace-accent)] hover:underline" href={`/studio/organization/positions/${encodeURIComponent(position.id)}`}>
          ← Back to {position.title}
        </Link>
        <header className="my-7">
          <p className="text-sm text-[var(--text-secondary)]">{position.title}{position.unit ? ` · ${position.unit.name}` : ""}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">Help me describe this work</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Start in your own words. Lotura can help you sort out responsibilities, related processes, and what still needs an answer.</p>
        </header>
        <PositionWorkDiscoveryForm position={{ id: position.id, title: position.title, unit: position.unit }} requestId={randomUUID()} />
      </div>
    </WorkspaceShell>
  );
}
