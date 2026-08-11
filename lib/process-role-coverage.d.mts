export type CurrentRoleCoverage = {
  name: string;
  coverageType: "permanent" | "interim" | "acting" | "delegated" | "backup";
  mandateType: "primary" | "shared";
  scope: string | null;
};

type EffectiveStatus = "scheduled" | "active" | "ended" | "cancelled";

export function getCanonicalRoleCoverage(
  seed: {
    roles: Array<{ key: string }>;
    people?: Array<{
      key: string;
      displayName: string;
      status: "active" | "inactive";
    }>;
    roleMandates?: Array<{
      key: string;
      roleKey: string;
      mandateType: "primary" | "shared";
      scope?: string;
      status: EffectiveStatus;
      effectiveFrom: string;
      effectiveUntil?: string;
    }>;
    roleCoverages?: Array<{
      key: string;
      roleMandateKey: string;
      personKey: string;
      coverageType:
        | "permanent"
        | "interim"
        | "acting"
        | "delegated"
        | "backup";
      status: EffectiveStatus;
      effectiveFrom: string;
      effectiveUntil?: string;
    }>;
  },
  asOfValue: string,
): Map<string, CurrentRoleCoverage[]> | null;
