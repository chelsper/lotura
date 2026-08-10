import type { RuntimeAccessConfiguration } from "./authentication";

export type DisabledOrganizationStructureAdministrationConfiguration = {
  enabled: false;
};

export type EnabledOrganizationStructureAdministrationConfiguration = {
  actorIdentifier: string;
  databaseUrl: string;
  enabled: true;
  organizationId: number;
};

export type OrganizationStructureAdministrationConfiguration =
  | DisabledOrganizationStructureAdministrationConfiguration
  | EnabledOrganizationStructureAdministrationConfiguration;

export class OrganizationStructureAdministrationConfigurationError extends Error {}

export function resolveOrganizationStructureAdministrationConfiguration(
  environment: Record<string, string | undefined>,
  runtimeAccess: RuntimeAccessConfiguration,
): OrganizationStructureAdministrationConfiguration;
