function byName(left, right) {
  return left.name.localeCompare(right.name, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function organizationUnitPath(units, unitId) {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const path = [];
  const visited = new Set();
  let current = unitsById.get(unitId) ?? null;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parent ? unitsById.get(current.parent.id) ?? null : null;
  }

  return path;
}

export function buildOrganizationUnitHierarchy(units) {
  const sortedUnits = [...units].sort(byName);
  const unitsById = new Map(sortedUnits.map((unit) => [unit.id, unit]));
  const childrenByParent = new Map();

  for (const unit of sortedUnits) {
    const parentId = unit.parent?.id ?? null;
    if (!parentId || !unitsById.has(parentId)) continue;
    childrenByParent.set(parentId, [
      ...(childrenByParent.get(parentId) ?? []),
      unit,
    ]);
  }

  const projected = new Set();
  const project = (unit, depth, lineage) => {
    projected.add(unit.id);
    const nextLineage = new Set(lineage);
    nextLineage.add(unit.id);
    const children = (childrenByParent.get(unit.id) ?? [])
      .filter((child) => !nextLineage.has(child.id))
      .map((child) => project(child, depth + 1, nextLineage));
    return {
      unit,
      depth,
      path: organizationUnitPath(sortedUnits, unit.id),
      children,
      descendantCount: children.reduce(
        (total, child) => total + child.descendantCount + 1,
        0,
      ),
    };
  };

  const roots = sortedUnits.filter(
    (unit) => !unit.parent || !unitsById.has(unit.parent.id),
  );
  const hierarchy = roots.map((unit) => project(unit, 0, new Set()));

  // Defensive fallback for malformed cyclic evidence. Canonical database
  // constraints prevent cycles, but the UI should never recurse forever if a
  // noncanonical fixture or future source projection is incomplete.
  for (const unit of sortedUnits) {
    if (!projected.has(unit.id)) {
      hierarchy.push(project(unit, 0, new Set()));
    }
  }

  return hierarchy;
}
