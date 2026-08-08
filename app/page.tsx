import { connection } from "next/server";

import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { HomeOrientation } from "./home-orientation";
import { WorkspaceShell } from "./workspace-shell";

export default async function Home() {
  await connection();

  const { asOf, configuration, source } = await loadWorkspaceExperience();

  return (
    <WorkspaceShell
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <HomeOrientation
        asOf={asOf}
        configuration={configuration}
        source={source}
      />
    </WorkspaceShell>
  );
}
