import type { Metadata } from "next";
import { connection } from "next/server";

import { requireWorkspaceAccess } from "@/lib/authentication";
import { resolveWorkspaceConfigurationOverrides } from "@/lib/workspace-configuration-policy.mjs";
import { resolveWorkspaceConfiguration } from "@/lib/workspace-configuration.mjs";

import { OrganizationStructurePreviewExperience } from "./organization-structure-preview";

export const metadata: Metadata = {
  title: "Organization structure preview | Lotura",
  description:
    "Review an organizational-structure workbook locally before any import.",
};

export default async function OrganizationStructurePreviewPage() {
  await connection();
  await requireWorkspaceAccess();

  const configuration = resolveWorkspaceConfiguration({
    organizationName: "Organization",
    overrides: resolveWorkspaceConfigurationOverrides(process.env),
  });

  return <OrganizationStructurePreviewExperience configuration={configuration} />;
}
