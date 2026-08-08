export type OrganizationStructureColumnId =
  | "personName"
  | "reportsToName"
  | "positionTitle"
  | "statedDirectReports"
  | "organizationUnit"
  | "location";

export type OrganizationStructureColumnMapping = Record<
  OrganizationStructureColumnId,
  number | null
>;

export type OrganizationStructureCell =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

export type OrganizationStructureRecord = {
  derivedDirectReports: number;
  key: string;
  location: string;
  managerRecordKey?: string;
  managerResolution:
    | "not-provided"
    | "blank"
    | "resolved"
    | "unresolved"
    | "ambiguous"
    | "self";
  normalizedName: string;
  organizationUnit: string;
  personName: string;
  positionTitle: string;
  possibleInterim: boolean;
  possibleVacancy: boolean;
  reportsToName: string;
  sourceRow: number;
  statedDirectReports: number | null;
  statedDirectReportsState: "blank" | "valid" | "invalid";
};

export type OrganizationStructureIssue = {
  count: number;
  description: string;
  kind: string;
  recordKeys: string[];
  title: string;
  tone: "review" | "neutral";
  unitKeys: string[];
};

export type OrganizationStructurePreview = {
  columns: {
    headers: string[];
    mapping: OrganizationStructureColumnMapping;
  };
  issues: OrganizationStructureIssue[];
  records: OrganizationStructureRecord[];
  relationships: Array<{
    managerRecordKey: string;
    recordKey: string;
  }>;
  source: {
    fileName: string;
    organizationName: string;
    sheetName: string;
    sourceAsOf: string | null;
  };
  stats: {
    distinctNameStrings: number;
    distinctPositionTitles: number;
    duplicateNameGroups: number;
    exactDuplicateRowGroups: number;
    managerRecords: number;
    maximumDepth: number | null;
    maximumDirectReports: number | null;
    medianDepth: number | null;
    medianNonzeroDirectReports: number | null;
    organizationUnits: number;
    possibleVacancies: number;
    recordCount: number;
    resolvedRelationships: number;
    rootOrUnknownRecords: number;
    unresolvedRelationships: number;
  };
  units: Array<{
    crossUnitConnections: number;
    key: string;
    managerRecords: number;
    name: string;
    recordCount: number;
    rootOrUnknownRecords: number;
  }>;
  vacancyAssessment: {
    kind: "not-determinable" | "possible";
    message: string;
  };
};

export const MAX_ORGANIZATION_STRUCTURE_FILE_BYTES: number;
export const MAX_ORGANIZATION_STRUCTURE_RECORDS: number;
export const MAX_ORGANIZATION_STRUCTURE_COLUMNS: number;

export const organizationStructureColumnDefinitions: Array<{
  id: OrganizationStructureColumnId;
  label: string;
  description: string;
  aliases: string[];
}>;

export class OrganizationStructurePreviewError extends Error {
  code: string;

  constructor(code: string, message: string);
}

export function detectOrganizationStructureColumnMapping(
  headers: OrganizationStructureCell[],
): {
  conflicts: OrganizationStructureColumnId[];
  headers: string[];
  mapping: OrganizationStructureColumnMapping;
};

export function buildOrganizationStructurePreview(input: {
  fileName: string;
  mapping?: OrganizationStructureColumnMapping;
  organizationName?: string;
  rows: OrganizationStructureCell[][];
  sheetName: string;
  sourceAsOf?: string | null;
}): OrganizationStructurePreview;
