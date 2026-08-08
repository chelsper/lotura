export const MAX_ORGANIZATION_STRUCTURE_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ORGANIZATION_STRUCTURE_RECORDS = 25_000;
export const MAX_ORGANIZATION_STRUCTURE_COLUMNS = 100;

export const organizationStructureColumnDefinitions = [
  {
    id: "personName",
    label: "Person name",
    description: "The human currently associated with the source row.",
    aliases: ["name", "person", "person name", "employee", "employee name", "full name"],
  },
  {
    id: "reportsToName",
    label: "Reports to",
    description: "The source-provided manager or supervisor name.",
    aliases: ["reports to", "manager", "manager name", "supervisor", "supervisor name"],
  },
  {
    id: "positionTitle",
    label: "Position title",
    description: "The title shown by the source. A title is not an Operational Role.",
    aliases: ["job title", "position title", "title", "job"],
  },
  {
    id: "statedDirectReports",
    label: "Number of direct reports",
    description: "An optional source count used only for reconciliation.",
    aliases: [
      "number of direct reports",
      "direct reports",
      "direct report count",
      "reports count",
    ],
  },
  {
    id: "organizationUnit",
    label: "Organization unit",
    description: "A department, office, division, college, or team supplied by the source.",
    aliases: [
      "department",
      "organization unit",
      "organizational unit",
      "org unit",
      "division",
      "office",
      "team",
    ],
  },
  {
    id: "location",
    label: "Location",
    description: "The source-provided location, campus, or workplace label.",
    aliases: ["location", "work location", "campus", "workplace"],
  },
];

const columnIds = new Set(
  organizationStructureColumnDefinitions.map((definition) => definition.id),
);

export class OrganizationStructurePreviewError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "OrganizationStructurePreviewError";
    this.code = code;
  }
}

function cleanCell(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim().replace(/\s+/g, " ");
}

function normalize(value) {
  return cleanCell(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[_/–—-]+/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function groupBy(items, selector) {
  const groups = new Map();
  for (const item of items) {
    const selected = selector(item);
    if (!groups.has(selected)) groups.set(selected, []);
    groups.get(selected).push(item);
  }
  return groups;
}

function median(numbers) {
  if (!numbers.length) return null;
  const sorted = [...numbers].sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

function parseNonnegativeInteger(value) {
  const cleaned = cleanCell(value);
  if (!cleaned) return { kind: "blank", value: null };
  const number = Number(cleaned);
  if (!Number.isInteger(number) || number < 0) {
    return { kind: "invalid", value: null };
  }
  return { kind: "valid", value: number };
}

function getMappedValue(row, mapping, columnId) {
  const index = mapping[columnId];
  return index === null || index === undefined ? "" : cleanCell(row[index]);
}

function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new OrganizationStructurePreviewError(
      "empty-workbook",
      "The selected sheet must contain a header row and at least one data row.",
    );
  }
  if (!Array.isArray(rows[0]) || rows[0].length === 0) {
    throw new OrganizationStructurePreviewError(
      "missing-headers",
      "The selected sheet does not contain a readable header row.",
    );
  }
  if (rows[0].length > MAX_ORGANIZATION_STRUCTURE_COLUMNS) {
    throw new OrganizationStructurePreviewError(
      "too-many-columns",
      `The preview supports up to ${MAX_ORGANIZATION_STRUCTURE_COLUMNS} columns.`,
    );
  }

  const populatedRows = rows
    .slice(1)
    .map((row, index) => ({ row, sourceRow: index + 2 }))
    .filter(({ row }) =>
      Array.isArray(row) && row.some((cell) => cleanCell(cell) !== ""),
    );
  if (populatedRows.length > MAX_ORGANIZATION_STRUCTURE_RECORDS) {
    throw new OrganizationStructurePreviewError(
      "too-many-records",
      `The preview supports up to ${MAX_ORGANIZATION_STRUCTURE_RECORDS.toLocaleString("en-US")} source rows.`,
    );
  }

  for (const row of rows) {
    if (!Array.isArray(row)) {
      throw new OrganizationStructurePreviewError(
        "invalid-row",
        "The selected sheet contains an unreadable row.",
      );
    }
    for (const cell of row) {
      if (cleanCell(cell).length > 2_000) {
        throw new OrganizationStructurePreviewError(
          "cell-too-long",
          "The selected sheet contains a cell that is too long for safe preview.",
        );
      }
    }
  }

  return populatedRows;
}

export function detectOrganizationStructureColumnMapping(headers) {
  const normalizedHeaders = headers.map(normalize);
  const mapping = {};
  const conflicts = [];

  for (const definition of organizationStructureColumnDefinitions) {
    const aliases = new Set(definition.aliases.map(normalize));
    const matches = normalizedHeaders
      .map((header, index) => (aliases.has(header) ? index : null))
      .filter((index) => index !== null);

    mapping[definition.id] = matches.length === 1 ? matches[0] : null;
    if (matches.length > 1) conflicts.push(definition.id);
  }

  return {
    conflicts,
    headers: headers.map(cleanCell),
    mapping,
  };
}

function validateMapping(mapping, headerCount) {
  const usedIndexes = new Map();
  for (const [columnId, index] of Object.entries(mapping)) {
    if (!columnIds.has(columnId)) continue;
    if (index === null || index === undefined) continue;
    if (!Number.isInteger(index) || index < 0 || index >= headerCount) {
      throw new OrganizationStructurePreviewError(
        "invalid-column-mapping",
        "A selected column is outside the workbook header range.",
      );
    }
    if (usedIndexes.has(index)) {
      throw new OrganizationStructurePreviewError(
        "duplicate-column-mapping",
        "Each source column can describe only one preview field.",
      );
    }
    usedIndexes.set(index, columnId);
  }

  if (mapping.personName === null && mapping.positionTitle === null) {
    throw new OrganizationStructurePreviewError(
      "insufficient-column-mapping",
      "Choose at least a Person name or Position title column.",
    );
  }
}

function issue(kind, title, description, tone, recordKeys, unitKeys = []) {
  return {
    count: recordKeys.length || unitKeys.length,
    description,
    kind,
    recordKeys,
    title,
    tone,
    unitKeys,
  };
}

function findCycleRecordKeys(records, managerKeyByRecordKey) {
  const state = new Map();
  const stack = [];
  const cycleKeys = new Set();

  const visit = (recordKey) => {
    state.set(recordKey, 1);
    stack.push(recordKey);
    const managerKey = managerKeyByRecordKey.get(recordKey);
    if (managerKey) {
      if (!state.has(managerKey)) visit(managerKey);
      else if (state.get(managerKey) === 1) {
        const start = stack.lastIndexOf(managerKey);
        for (const key of stack.slice(start)) cycleKeys.add(key);
      }
    }
    stack.pop();
    state.set(recordKey, 2);
  };

  for (const record of records) {
    if (!state.has(record.key)) visit(record.key);
  }
  return cycleKeys;
}

function calculateDepth(recordKey, managerKeyByRecordKey, cycleKeys) {
  if (cycleKeys.has(recordKey)) return null;
  let depth = 0;
  let cursor = recordKey;
  const seen = new Set();
  while (managerKeyByRecordKey.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    cursor = managerKeyByRecordKey.get(cursor);
    depth += 1;
  }
  return seen.has(cursor) ? null : depth;
}

export function buildOrganizationStructurePreview({
  fileName,
  mapping: suppliedMapping,
  organizationName,
  rows,
  sheetName,
  sourceAsOf = null,
}) {
  const populatedRows = validateRows(rows);
  const headers = rows[0].map(cleanCell);
  const detected = detectOrganizationStructureColumnMapping(headers);
  const mapping = {
    ...detected.mapping,
    ...(suppliedMapping ?? {}),
  };
  validateMapping(mapping, headers.length);

  const records = populatedRows.map(({ row, sourceRow }) => {
    const statedDirectReports = parseNonnegativeInteger(
      mapping.statedDirectReports === null
        ? null
        : row[mapping.statedDirectReports],
    );
    const personName = getMappedValue(row, mapping, "personName");
    const positionTitle = getMappedValue(row, mapping, "positionTitle");

    return {
      derivedDirectReports: 0,
      key: `source-row-${sourceRow}`,
      location: getMappedValue(row, mapping, "location"),
      managerResolution: mapping.reportsToName === null ? "not-provided" : "blank",
      normalizedName: normalize(personName),
      organizationUnit: getMappedValue(row, mapping, "organizationUnit"),
      personName,
      positionTitle,
      possibleInterim: /\b(?:interim|acting|temporary|temp)\b/i.test(positionTitle),
      possibleVacancy:
        mapping.personName !== null &&
        mapping.positionTitle !== null &&
        !personName &&
        Boolean(positionTitle),
      reportsToName: getMappedValue(row, mapping, "reportsToName"),
      sourceRow,
      statedDirectReports: statedDirectReports.value,
      statedDirectReportsState: statedDirectReports.kind,
    };
  });

  const recordsByKey = new Map(records.map((record) => [record.key, record]));
  const nameGroups = groupBy(
    records.filter((record) => record.normalizedName),
    (record) => record.normalizedName,
  );
  const managerKeyByRecordKey = new Map();
  const unresolvedManagerKeys = [];
  const ambiguousManagerKeys = [];
  const blankManagerKeys = [];
  const selfReportingKeys = [];

  for (const record of records) {
    if (mapping.reportsToName === null) continue;
    const normalizedManager = normalize(record.reportsToName);
    if (!normalizedManager) {
      record.managerResolution = "blank";
      blankManagerKeys.push(record.key);
      continue;
    }
    const candidates = nameGroups.get(normalizedManager) ?? [];
    if (candidates.length === 0) {
      record.managerResolution = "unresolved";
      unresolvedManagerKeys.push(record.key);
      continue;
    }
    if (candidates.length > 1) {
      record.managerResolution = "ambiguous";
      ambiguousManagerKeys.push(record.key);
      continue;
    }
    if (candidates[0].key === record.key) {
      record.managerResolution = "self";
      selfReportingKeys.push(record.key);
      continue;
    }
    record.managerResolution = "resolved";
    record.managerRecordKey = candidates[0].key;
    managerKeyByRecordKey.set(record.key, candidates[0].key);
    candidates[0].derivedDirectReports += 1;
  }

  const cycleKeys = findCycleRecordKeys(records, managerKeyByRecordKey);
  const duplicateNameGroups = [...nameGroups.values()].filter(
    (group) => group.length > 1,
  );
  const exactGroups = groupBy(records, (record) =>
    [
      record.personName,
      record.reportsToName,
      record.positionTitle,
      record.organizationUnit,
      record.location,
      record.statedDirectReports ?? "",
    ]
      .map(normalize)
      .join("\u001f"),
  );
  const duplicateRowGroups = [...exactGroups.values()].filter(
    (group) => group.length > 1,
  );
  const invalidDirectReportKeys = records
    .filter((record) => record.statedDirectReportsState === "invalid")
    .map((record) => record.key);
  const directReportMismatchKeys = mapping.reportsToName === null
    ? []
    : records
        .filter(
          (record) =>
            record.statedDirectReportsState === "valid" &&
            record.statedDirectReports !== record.derivedDirectReports,
        )
        .map((record) => record.key);
  const missingUnitKeys = mapping.organizationUnit === null
    ? []
    : records.filter((record) => !record.organizationUnit).map((record) => record.key);
  const missingLocationKeys = mapping.location === null
    ? []
    : records.filter((record) => !record.location).map((record) => record.key);
  const possibleVacancyKeys = records
    .filter((record) => record.possibleVacancy)
    .map((record) => record.key);
  const possibleInterimKeys = records
    .filter((record) => record.possibleInterim)
    .map((record) => record.key);

  const issues = [
    issue(
      "reporting-cycle",
      "Reporting cycle",
      "These source relationships form a cycle and cannot become an approved reporting hierarchy without review.",
      "review",
      [...cycleKeys],
    ),
    issue(
      "self-reporting",
      "Self-reporting relationship",
      "The source names the same record as both the Person and manager.",
      "review",
      selfReportingKeys,
    ),
    issue(
      "unresolved-manager",
      "Manager not found",
      "The manager value does not match one Person name in this source.",
      "review",
      unresolvedManagerKeys,
    ),
    issue(
      "ambiguous-manager",
      "Manager name is ambiguous",
      "The manager value matches more than one source record and needs a stable identifier or human decision.",
      "review",
      ambiguousManagerKeys,
    ),
    issue(
      "duplicate-name",
      "Duplicate Person name",
      "Matching names may represent different people or duplicate source rows. Names are not stable identities.",
      "review",
      duplicateNameGroups.flatMap((group) => group.map((record) => record.key)),
    ),
    issue(
      "duplicate-row",
      "Exact duplicate source row",
      "The same mapped values appear more than once in the source.",
      "review",
      duplicateRowGroups.flatMap((group) => group.map((record) => record.key)),
    ),
    issue(
      "invalid-direct-report-count",
      "Direct-report count is not usable",
      "The source value is present but is not a nonnegative whole number.",
      "review",
      invalidDirectReportKeys,
    ),
    issue(
      "direct-report-mismatch",
      "Direct-report count differs",
      "The source count differs from the relationships Lotura can resolve in this preview.",
      "review",
      directReportMismatchKeys,
    ),
    issue(
      "blank-manager",
      "Manager is blank",
      "A blank value may indicate a hierarchy root or missing information. Lotura does not decide which.",
      "neutral",
      blankManagerKeys,
    ),
    issue(
      "missing-organization-unit",
      "Organization unit is blank",
      "The source does not place these records in a department, office, division, college, or team.",
      "neutral",
      missingUnitKeys,
    ),
    issue(
      "missing-location",
      "Location is blank",
      "The source includes a Location column but leaves these records blank.",
      "neutral",
      missingLocationKeys,
    ),
    issue(
      "possible-vacancy",
      "Possible vacancy",
      "A Position title is present without a Person name. This is a review question, not a confirmed vacancy.",
      "review",
      possibleVacancyKeys,
    ),
    issue(
      "possible-temporary-coverage",
      "Possible temporary coverage",
      "The title contains interim, acting, or temporary wording but does not establish assignment type or dates.",
      "review",
      possibleInterimKeys,
    ),
  ].filter((item) => item.count > 0);

  const relationships = [...managerKeyByRecordKey.entries()].map(
    ([recordKey, managerRecordKey]) => ({ managerRecordKey, recordKey }),
  );
  const crossUnitConnections = new Map();
  for (const relationship of relationships) {
    const record = recordsByKey.get(relationship.recordKey);
    const manager = recordsByKey.get(relationship.managerRecordKey);
    const recordUnit = normalize(record.organizationUnit);
    const managerUnit = normalize(manager.organizationUnit);
    if (!recordUnit || !managerUnit || recordUnit === managerUnit) continue;
    const pair = `${recordUnit}\u001f${managerUnit}`;
    crossUnitConnections.set(pair, (crossUnitConnections.get(pair) ?? 0) + 1);
  }

  const unitGroups = groupBy(
    records.filter((record) => normalize(record.organizationUnit)),
    (record) => normalize(record.organizationUnit),
  );
  const units = [...unitGroups.entries()]
    .map(([key, unitRecords]) => ({
      crossUnitConnections: [...crossUnitConnections.entries()].reduce(
        (count, [pair, value]) =>
          pair.split("\u001f").includes(key) ? count + value : count,
        0,
      ),
      key,
      managerRecords: unitRecords.filter((record) => record.derivedDirectReports > 0).length,
      name: unitRecords[0].organizationUnit,
      recordCount: unitRecords.length,
      rootOrUnknownRecords: unitRecords.filter(
        (record) => record.managerResolution !== "resolved",
      ).length,
    }))
    .sort((left, right) =>
      right.recordCount - left.recordCount || left.name.localeCompare(right.name),
    );

  const depths = mapping.reportsToName === null
    ? []
    : records
        .map((record) => calculateDepth(record.key, managerKeyByRecordKey, cycleKeys))
        .filter((depth) => depth !== null);
  const nonzeroSpans = records
    .map((record) => record.derivedDirectReports)
    .filter((count) => count > 0);

  return {
    columns: { headers, mapping },
    issues,
    records,
    relationships,
    source: {
      fileName: cleanCell(fileName) || "Organization structure.xlsx",
      organizationName: cleanCell(organizationName) || "Organization structure",
      sheetName: cleanCell(sheetName) || "First worksheet",
      sourceAsOf: cleanCell(sourceAsOf) || null,
    },
    stats: {
      distinctNameStrings: nameGroups.size,
      distinctPositionTitles: new Set(
        records.map((record) => normalize(record.positionTitle)).filter(Boolean),
      ).size,
      duplicateNameGroups: duplicateNameGroups.length,
      exactDuplicateRowGroups: duplicateRowGroups.length,
      managerRecords: nonzeroSpans.length,
      maximumDepth: depths.length ? Math.max(...depths) : null,
      maximumDirectReports: nonzeroSpans.length ? Math.max(...nonzeroSpans) : null,
      medianDepth: median(depths),
      medianNonzeroDirectReports: median(nonzeroSpans),
      organizationUnits: units.length,
      possibleVacancies: possibleVacancyKeys.length,
      recordCount: records.length,
      resolvedRelationships: relationships.length,
      rootOrUnknownRecords: records.filter(
        (record) => record.managerResolution !== "resolved",
      ).length,
      unresolvedRelationships:
        unresolvedManagerKeys.length + ambiguousManagerKeys.length,
    },
    units,
    vacancyAssessment:
      mapping.personName === null || mapping.positionTitle === null
        ? {
            kind: "not-determinable",
            message:
              "This source does not provide both Person names and Position titles, so vacancy review is not available.",
          }
        : possibleVacancyKeys.length
          ? {
              kind: "possible",
              message:
                "Blank Person names beside Position titles identify review questions, not confirmed vacancies.",
            }
          : {
              kind: "not-determinable",
              message:
                "No possible vacancy rows appear in this source, but a person-centric workbook cannot prove that every Position is filled.",
            },
  };
}
