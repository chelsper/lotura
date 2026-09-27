import type { OrganizationPerson, OrganizationPosition } from "./organization-structure-data.mjs";

type Option = { value: string; label: string };

function distinguish(options: Option[]): Option[] {
  const counts = new Map<string, number>();
  for (const option of options) counts.set(option.label, (counts.get(option.label) ?? 0) + 1);
  return options.map((option) => {
    if (counts.get(option.label) === 1) return option;
    const suffix = option.value.slice(-8);
    const suffixIsUnique = !options.some((other) => other.value !== option.value && other.label === option.label && other.value.slice(-8) === suffix);
    return { ...option, label: `${option.label} · Record ${suffixIsUnique ? suffix : option.value}` };
  });
}

export function personPickerOptions(people: OrganizationPerson[]): Option[] {
  return distinguish(people.map((person) => ({
    value: person.id,
    label: `${person.name} — ${person.assignments.length ? person.assignments.map(({ position }) => `${position.title}${position.unit ? ` (${position.unit.name})` : ""}`).join("; ") : "No current job title recorded"}`,
  })));
}

export function positionPickerOptions(positions: OrganizationPosition[]): Option[] {
  return distinguish(positions.map((position) => ({
    value: position.id,
    label: `${position.title} — ${position.unit?.name ?? "No Unit recorded"} — ${position.assignments.length ? position.assignments.map(({ person }) => person.name).join(", ") : "No current person recorded"}`,
  })));
}
