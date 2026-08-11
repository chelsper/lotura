const coverageOrder = new Map([
  ["permanent", 0],
  ["interim", 1],
  ["acting", 2],
  ["delegated", 3],
  ["backup", 4],
]);

function timestamp(value, label) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Invalid ${label} timestamp in Role Coverage.`);
  }
  return parsed;
}

function isCurrent(record, asOf, label) {
  const effectiveFrom = timestamp(record.effectiveFrom, `${label} effective-from`);
  const effectiveUntil = record.effectiveUntil
    ? timestamp(record.effectiveUntil, `${label} effective-until`)
    : null;

  return (
    record.status === "active" &&
    effectiveFrom <= asOf &&
    (!effectiveUntil || effectiveUntil > asOf)
  );
}

function requiredFromMap(map, key, label) {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Invalid Process Explorer data: ${label} '${key}' is missing.`);
  }
  return value;
}

export function getCanonicalRoleCoverage(seed, asOfValue) {
  const sources = [seed.people, seed.roleMandates, seed.roleCoverages];
  if (sources.every((source) => source === undefined)) return null;
  if (sources.some((source) => !Array.isArray(source))) {
    throw new Error(
      "Invalid Process Explorer data: canonical Role Coverage requires people, Role Mandates, and Role Coverages together.",
    );
  }

  const asOf = timestamp(asOfValue, "as-of");
  const rolesByKey = new Map(seed.roles.map((item) => [item.key, item]));
  const peopleByKey = new Map(seed.people.map((item) => [item.key, item]));
  const mandatesByKey = new Map(
    seed.roleMandates.map((item) => [item.key, item]),
  );

  for (const mandate of seed.roleMandates) {
    requiredFromMap(rolesByKey, mandate.roleKey, "mandated Role");
  }

  const currentMandates = new Set(
    seed.roleMandates
      .filter((mandate) => isCurrent(mandate, asOf, "Role Mandate"))
      .map((mandate) => mandate.key),
  );
  const coverageByRole = new Map();

  for (const coverage of seed.roleCoverages) {
    const mandate = requiredFromMap(
      mandatesByKey,
      coverage.roleMandateKey,
      "Role Coverage mandate",
    );
    const coveredPerson = requiredFromMap(
      peopleByKey,
      coverage.personKey,
      "Role Coverage person",
    );

    if (
      !currentMandates.has(mandate.key) ||
      !isCurrent(coverage, asOf, "Role Coverage") ||
      coveredPerson.status !== "active"
    ) {
      continue;
    }

    const current = coverageByRole.get(mandate.roleKey) ?? [];
    current.push({
      name: coveredPerson.displayName,
      coverageType: coverage.coverageType,
      mandateType: mandate.mandateType,
      scope: mandate.scope ?? null,
    });
    coverageByRole.set(mandate.roleKey, current);
  }

  for (const coverage of coverageByRole.values()) {
    coverage.sort(
      (left, right) =>
        (coverageOrder.get(left.coverageType) ?? 99) -
          (coverageOrder.get(right.coverageType) ?? 99) ||
        left.name.localeCompare(right.name) ||
        (left.scope ?? "").localeCompare(right.scope ?? ""),
    );
  }

  return coverageByRole;
}
