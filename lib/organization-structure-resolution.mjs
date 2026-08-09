const normalText = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[_/–—-]+/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const groupBy = (items, selector) => {
  const groups = new Map();
  for (const item of items) {
    const key = selector(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};

export const organizationStructureResolutionActions = {
  "choose-manager": {
    description: "Use one source candidate for the proposed reporting relationship.",
    label: "Choose a manager candidate",
    requiresCandidate: true,
    requiresNote: true,
    result: "resolved",
  },
  "omit-manager-relationship": {
    description: "Keep the source row but omit this reporting relationship from the proposed import basis.",
    label: "Omit the reporting relationship",
    requiresNote: true,
    result: "resolved",
  },
  "manager-outside-source": {
    description: "Treat the named manager as outside this source scope and omit the relationship.",
    label: "Manager is outside source scope",
    requiresNote: true,
    result: "resolved",
  },
  "legitimate-root": {
    description: "Treat the blank manager value as an intentional root for this proposed import basis.",
    label: "Classify as a legitimate root",
    requiresNote: true,
    result: "resolved",
  },
  "treat-as-distinct-people": {
    description: "Treat matching name strings as separate Person candidates for this proposed import basis.",
    label: "Treat as distinct Person candidates",
    requiresNote: true,
    result: "resolved",
  },
  "treat-as-one-person-candidate": {
    description: "Treat the source rows as evidence about one proposed Person candidate while preserving each source row.",
    label: "Treat as one Person candidate",
    requiresCandidate: true,
    requiresNote: true,
    result: "resolved",
  },
  "keep-one-source-record": {
    description: "Keep one source row and exclude the other rows in this exact-evidence cluster.",
    label: "Keep one source row",
    requiresCandidate: true,
    requiresNote: true,
    result: "resolved",
  },
  "omit-source-relationship": {
    description: "Omit the conflicting source relationship from the proposed import basis.",
    label: "Omit the conflicting relationship",
    requiresNote: true,
    result: "resolved",
  },
  "exclude-source-records": {
    description: "Exclude the affected source records from the proposed import basis.",
    label: "Skip these source records",
    requiresNote: true,
    result: "excluded",
  },
  "omit-organization-unit": {
    description: "Keep the records without asserting an Organization Unit from this source.",
    label: "Omit Organization Unit",
    requiresNote: true,
    result: "reviewed",
  },
  "preserve-temporary-wording": {
    description: "Preserve the source wording without creating a temporary assignment or coverage claim.",
    label: "Preserve wording only",
    requiresNote: false,
    result: "reviewed",
  },
  "preserve-vacancy-question": {
    description: "Keep this as an unresolved vacancy question without asserting that a Position is vacant.",
    label: "Preserve as a vacancy question",
    requiresNote: false,
    result: "reviewed",
  },
  "accept-source-field": {
    description: "Keep the source field as supplied after reviewing its limitation.",
    label: "Keep the source field",
    requiresNote: false,
    result: "reviewed",
  },
  "omit-source-field": {
    description: "Omit this field from the proposed import basis without changing the source evidence.",
    label: "Omit the source field",
    requiresNote: true,
    result: "reviewed",
  },
  "classify-span-as-understood": {
    description: "Record that the documented reporting span was reviewed without labeling it workload, performance, or risk.",
    label: "Mark documented span as understood",
    requiresNote: false,
    result: "reviewed",
  },
  "requires-authoritative-information": {
    description: "Record that the source cannot resolve this question and authoritative external information is required.",
    label: "Needs authoritative information",
    requiresNote: true,
    result: "needs-validation",
  },
};

function createGroup({
  actions,
  candidateRecordKeys = [],
  description,
  key,
  kind,
  recordKeys,
  severity,
  title,
}) {
  return {
    actions,
    candidateRecordKeys,
    description,
    key,
    kind,
    recordKeys: [...new Set(recordKeys)],
    severity,
    title,
  };
}

function issueRecords(preview, kind) {
  const issue = preview.issues.find((item) => item.kind === kind);
  return issue?.recordKeys ?? [];
}

function duplicateRowSignature(record) {
  return [
    record.personName,
    record.reportsToName,
    record.positionTitle,
    record.organizationUnit,
    record.location,
    record.statedDirectReports ?? "",
  ]
    .map(normalText)
    .join("\u001f");
}

export function buildOrganizationStructureResolutionGroups(preview) {
  const recordsByKey = new Map(preview.records.map((record) => [record.key, record]));
  const nameGroups = groupBy(
    preview.records.filter((record) => record.normalizedName),
    (record) => record.normalizedName,
  );
  const groups = [];

  const cycleKeys = issueRecords(preview, "reporting-cycle");
  if (cycleKeys.length) {
    groups.push(createGroup({
      actions: [
        "omit-source-relationship",
        "exclude-source-records",
        "requires-authoritative-information",
      ],
      description: "The source relationships form a cycle. The evidence remains unchanged while the proposed treatment is reviewed.",
      key: "reporting-cycle:source",
      kind: "reporting-cycle",
      recordKeys: cycleKeys,
      severity: "blocker",
      title: "Reporting cycle",
    }));
  }

  const selfReportingKeys = issueRecords(preview, "self-reporting");
  if (selfReportingKeys.length) {
    groups.push(createGroup({
      actions: [
        "omit-manager-relationship",
        "exclude-source-records",
        "requires-authoritative-information",
      ],
      description: "One source record names itself as its manager.",
      key: "self-reporting:source",
      kind: "self-reporting",
      recordKeys: selfReportingKeys,
      severity: "blocker",
      title: "Self-reporting source relationship",
    }));
  }

  const ambiguousManagerGroups = groupBy(
    issueRecords(preview, "ambiguous-manager")
      .map((key) => recordsByKey.get(key))
      .filter(Boolean),
    (record) => normalText(record.reportsToName),
  );
  for (const [managerName, records] of ambiguousManagerGroups) {
    const candidates = nameGroups.get(managerName) ?? [];
    groups.push(createGroup({
      actions: [
        "choose-manager",
        "omit-manager-relationship",
        "exclude-source-records",
        "requires-authoritative-information",
      ],
      candidateRecordKeys: candidates.map((candidate) => candidate.key),
      description: "The manager name matches more than one source record. A name alone is not a stable identity.",
      key: `ambiguous-manager:${records[0].key}`,
      kind: "ambiguous-manager",
      recordKeys: records.map((record) => record.key),
      severity: "blocker",
      title: "Ambiguous manager reference",
    }));
  }

  const unresolvedManagerGroups = groupBy(
    issueRecords(preview, "unresolved-manager")
      .map((key) => recordsByKey.get(key))
      .filter(Boolean),
    (record) => normalText(record.reportsToName),
  );
  for (const records of unresolvedManagerGroups.values()) {
    groups.push(createGroup({
      actions: [
        "manager-outside-source",
        "omit-manager-relationship",
        "exclude-source-records",
        "requires-authoritative-information",
      ],
      description: "The manager value does not match one Person name in this source.",
      key: `unresolved-manager:${records[0].key}`,
      kind: "unresolved-manager",
      recordKeys: records.map((record) => record.key),
      severity: "blocker",
      title: "Manager not found in the source",
    }));
  }

  for (const records of nameGroups.values()) {
    if (records.length < 2) continue;
    groups.push(createGroup({
      actions: [
        "treat-as-one-person-candidate",
        "treat-as-distinct-people",
        "exclude-source-records",
        "requires-authoritative-information",
      ],
      candidateRecordKeys: records.map((record) => record.key),
      description: "Matching name strings may describe different people or repeated evidence. This review does not merge Person records.",
      key: `duplicate-person:${records[0].key}`,
      kind: "duplicate-person",
      recordKeys: records.map((record) => record.key),
      severity: "blocker",
      title: "Duplicate Person candidates",
    }));
  }

  const duplicateRows = groupBy(preview.records, duplicateRowSignature);
  for (const records of duplicateRows.values()) {
    if (records.length < 2) continue;
    groups.push(createGroup({
      actions: [
        "keep-one-source-record",
        "exclude-source-records",
        "requires-authoritative-information",
      ],
      candidateRecordKeys: records.map((record) => record.key),
      description: "These rows contain the same mapped source values and cannot all remain included without a treatment decision.",
      key: `duplicate-row:${records[0].key}`,
      kind: "duplicate-row",
      recordKeys: records.map((record) => record.key),
      severity: "blocker",
      title: "Exact duplicate source rows",
    }));
  }

  const groupedIssue = ({
    actions,
    description,
    kind,
    previewKind = kind,
    severity = "warning",
    title,
  }) => {
    const recordKeys = issueRecords(preview, previewKind);
    if (!recordKeys.length) return;
    groups.push(createGroup({
      actions,
      description,
      key: `${kind}:source`,
      kind,
      recordKeys,
      severity,
      title,
    }));
  };

  groupedIssue({
    actions: [
      "legitimate-root",
      "manager-outside-source",
      "exclude-source-records",
      "requires-authoritative-information",
    ],
    description: "A blank manager may be a legitimate hierarchy root, an out-of-scope relationship, or missing evidence.",
    kind: "blank-manager",
    severity: "blocker",
    title: "Blank manager classification",
  });
  groupedIssue({
    actions: [
      "omit-organization-unit",
      "exclude-source-records",
      "requires-authoritative-information",
    ],
    description: "The source provides no department, office, division, college, or team for these records.",
    kind: "missing-organization-unit",
    title: "Missing Organization Unit context",
  });
  groupedIssue({
    actions: [
      "preserve-temporary-wording",
      "exclude-source-records",
      "requires-authoritative-information",
    ],
    description: "Interim, acting, or temporary wording is evidence, not a PositionAssignment or RoleCoverage classification.",
    kind: "temporary-wording",
    previewKind: "possible-temporary-coverage",
    title: "Temporary or interim wording",
  });
  groupedIssue({
    actions: [
      "preserve-vacancy-question",
      "exclude-source-records",
      "requires-authoritative-information",
    ],
    description: "A title without a Person name is a possible vacancy question, not a confirmed vacancy.",
    kind: "vacancy-question",
    previewKind: "possible-vacancy",
    title: "Possible vacancy evidence",
  });
  groupedIssue({
    actions: [
      "accept-source-field",
      "omit-source-field",
      "exclude-source-records",
      "requires-authoritative-information",
    ],
    description: "The source count is not a usable nonnegative whole number.",
    kind: "invalid-direct-report-count",
    title: "Unusable direct-report count",
  });
  groupedIssue({
    actions: [
      "accept-source-field",
      "omit-source-field",
      "exclude-source-records",
      "requires-authoritative-information",
    ],
    description: "The source count differs from the reporting relationships resolved from this workbook.",
    kind: "source-record-conflict",
    previewKind: "direct-report-mismatch",
    severity: "blocker",
    title: "Source-record count conflict",
  });
  groupedIssue({
    actions: [
      "accept-source-field",
      "omit-source-field",
      "exclude-source-records",
      "requires-authoritative-information",
    ],
    description: "The source includes a Location field but leaves it blank for these records.",
    kind: "missing-location",
    title: "Missing location context",
  });

  const unusableRecordKeys = preview.records
    .filter((record) => !record.personName && !record.positionTitle)
    .map((record) => record.key);
  if (unusableRecordKeys.length) {
    groups.push(createGroup({
      actions: ["exclude-source-records", "requires-authoritative-information"],
      description: "These rows contain neither a Person name nor a Position title and cannot identify a structure record.",
      key: "unusable-record:source",
      kind: "unusable-record",
      recordKeys: unusableRecordKeys,
      severity: "blocker",
      title: "Unusable structure records",
    }));
  }

  const maximumSpan = preview.stats.maximumDirectReports;
  if (maximumSpan && maximumSpan > 0) {
    const largestSpanKeys = preview.records
      .filter((record) => record.derivedDirectReports === maximumSpan)
      .map((record) => record.key);
    groups.push(createGroup({
      actions: [
        "classify-span-as-understood",
        "exclude-source-records",
        "requires-authoritative-information",
      ],
      description: `These source records have the largest resolved reporting span in this workbook (${maximumSpan}). This is documented reach, not workload, performance, importance, or risk.`,
      key: "broad-reporting-span:source",
      kind: "broad-reporting-span",
      recordKeys: largestSpanKeys,
      severity: "warning",
      title: "Largest documented reporting span",
    }));
  }

  return groups.sort((left, right) =>
    (left.severity === right.severity ? 0 : left.severity === "blocker" ? -1 : 1) ||
    left.title.localeCompare(right.title) ||
    left.key.localeCompare(right.key),
  );
}

export function createOrganizationStructureResolutionSession() {
  return {
    approval: null,
    attestations: {
      basisOnly: false,
      humanReview: false,
      localOnly: false,
    },
    decisions: {},
    preparation: {
      identityStrategyNote: "",
      identityStrategyReviewed: false,
      reviewedSourceAsOf: "",
      sourceAsOfNote: "",
    },
  };
}

function clearApproval(session) {
  return session.approval ? { ...session, approval: null } : session;
}

export function applyOrganizationStructureResolutionDecision(
  session,
  groups,
  input,
) {
  const group = groups.find((item) => item.key === input.groupKey);
  if (!group) throw new Error("Choose a valid issue group.");
  if (!group.actions.includes(input.action)) {
    throw new Error("Choose a treatment available for this issue group.");
  }
  const action = organizationStructureResolutionActions[input.action];
  const note = String(input.note ?? "").trim();
  const candidateRecordKey = input.candidateRecordKey || null;
  if (action.requiresNote && !note) {
    throw new Error("Add a reason or review note before applying this treatment.");
  }
  if (
    action.requiresCandidate &&
    (!candidateRecordKey || !group.candidateRecordKeys.includes(candidateRecordKey))
  ) {
    throw new Error("Choose one of the source candidates before applying this treatment.");
  }

  const decision = {
    action: input.action,
    candidateRecordKey,
    groupKey: group.key,
    note,
    recordKeys: [...group.recordKeys],
    result: action.result,
  };
  const next = clearApproval(session);
  return {
    ...next,
    decisions: {
      ...next.decisions,
      [group.key]: decision,
    },
  };
}

export function removeOrganizationStructureResolutionDecision(session, groupKey) {
  if (!session.decisions[groupKey]) return session;
  const decisions = { ...session.decisions };
  delete decisions[groupKey];
  return { ...clearApproval(session), decisions };
}

export function updateOrganizationStructureResolutionPreparation(session, changes) {
  return {
    ...clearApproval(session),
    preparation: {
      ...session.preparation,
      ...changes,
    },
  };
}

export function updateOrganizationStructureResolutionAttestation(
  session,
  attestation,
  checked,
) {
  if (!(attestation in session.attestations)) {
    throw new Error("Choose a valid approval attestation.");
  }
  return {
    ...clearApproval(session),
    attestations: {
      ...session.attestations,
      [attestation]: Boolean(checked),
    },
  };
}

function excludedRecordKeys(groups, decisions) {
  const excluded = new Set();
  for (const group of groups) {
    const decision = decisions[group.key];
    if (!decision) continue;
    if (decision.action === "exclude-source-records") {
      for (const key of group.recordKeys) excluded.add(key);
    }
    if (decision.action === "keep-one-source-record") {
      for (const key of group.recordKeys) {
        if (key !== decision.candidateRecordKey) excluded.add(key);
      }
    }
  }
  return excluded;
}

export function evaluateOrganizationStructureResolutionReadiness(preview, session) {
  const groups = buildOrganizationStructureResolutionGroups(preview);
  const excluded = excludedRecordKeys(groups, session.decisions);
  const issueStates = groups.map((group) => {
    const includedRecordKeys = group.recordKeys.filter((key) => !excluded.has(key));
    const decision = session.decisions[group.key] ?? null;
    let state = decision?.result ?? "source-evidence";
    if (includedRecordKeys.length === 0) state = "excluded";
    if (
      !decision &&
      ["duplicate-person", "duplicate-row"].includes(group.kind) &&
      includedRecordKeys.length < 2
    ) {
      state = "resolved";
    }
    if (decision?.result === "needs-validation") state = "needs-validation";
    return {
      decision,
      group,
      includedRecordKeys,
      state,
    };
  });

  const blockers = [];
  const warnings = [];
  for (const item of issueStates) {
    if (item.state === "excluded") continue;
    if (item.state === "needs-validation") {
      blockers.push({
        key: item.group.key,
        message: `${item.group.title} requires authoritative external information.`,
      });
      continue;
    }
    if (item.state === "resolved" || item.state === "reviewed") continue;
    if (!item.decision && item.group.severity === "blocker") {
      blockers.push({
        key: item.group.key,
        message: `${item.group.title} has no recorded treatment.`,
      });
    } else if (!item.decision && item.group.severity === "warning") {
      warnings.push({
        key: item.group.key,
        message: `${item.group.title} has not been explicitly reviewed.`,
      });
    }
  }

  const effectiveSourceAsOf =
    preview.source.sourceAsOf || session.preparation.reviewedSourceAsOf.trim();
  if (!effectiveSourceAsOf) {
    blockers.push({
      key: "source-as-of",
      message: "The proposed import basis needs a reviewed source date.",
    });
  } else if (!preview.source.sourceAsOf && !session.preparation.sourceAsOfNote.trim()) {
    blockers.push({
      key: "source-as-of-note",
      message: "Explain the authoritative basis for the locally supplied source date.",
    });
  }
  if (!preview.source.organizationName.trim()) {
    blockers.push({
      key: "organization-scope",
      message: "The proposed import basis needs an Organization scope.",
    });
  }
  if (
    !session.preparation.identityStrategyReviewed ||
    !session.preparation.identityStrategyNote.trim()
  ) {
    blockers.push({
      key: "identity-strategy",
      message: "Review and document how stable Person and Position identities will be reconciled before import.",
    });
  }

  const includedRecordKeys = preview.records
    .map((record) => record.key)
    .filter((key) => !excluded.has(key));
  if (!includedRecordKeys.length) {
    blockers.push({
      key: "empty-basis",
      message: "At least one source record must remain in the proposed import basis.",
    });
  }

  const attestationsComplete = Object.values(session.attestations).every(Boolean);
  return {
    attestationsComplete,
    blockers,
    effectiveSourceAsOf: effectiveSourceAsOf || null,
    excludedRecordKeys: [...excluded],
    includedRecordKeys,
    issueStates,
    readyForLocalApproval:
      blockers.length === 0 && warnings.length === 0 && attestationsComplete,
    warnings,
  };
}

export function approveOrganizationStructureResolutionSession(
  preview,
  session,
  approvedAt,
) {
  const readiness = evaluateOrganizationStructureResolutionReadiness(preview, session);
  if (!readiness.readyForLocalApproval) {
    throw new Error(
      "Resolve all blockers, explicitly review every warning, and complete the attestation before local approval.",
    );
  }
  return {
    ...session,
    approval: {
      approvedAt,
      excludedRecordKeys: readiness.excludedRecordKeys,
      includedRecordKeys: readiness.includedRecordKeys,
      status: "approved-for-import",
    },
  };
}
