import { createHash } from "node:crypto";

const REFERENCE_KIND_LABELS = Object.freeze({
  organization_unit: "Organization Unit",
  operational_role: "Operational Role",
  person_capacity: "Person and capacity",
  policy: "Policy or governing document",
  process: "Process",
  process_family: "Process Family",
  system: "System",
});

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function acronym(value) {
  const words = normalize(value).split(" ").filter(Boolean);
  return words.length >= 2 ? words.map((word) => word[0]).join("") : "";
}

function exactSourceWording(source, label) {
  const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(
    `(^|[^A-Za-z0-9])(${escaped.replace(/\s+/g, "\\s+")})(?=$|[^A-Za-z0-9])`,
    "i",
  ));
  return match?.[2] ?? null;
}

function findMention(source, label, aliases = [], kind) {
  for (const candidate of [label, ...aliases]) {
    const exact = exactSourceWording(source, candidate);
    if (exact) return { score: candidate === label ? 100 : 90, text: exact };
  }
  // A person's initials are not enough to establish that the person was named.
  // Short two-letter acronyms also collide frequently with ordinary words.
  if (kind === "person_capacity") return null;
  const words = source.match(/\b[A-Za-z][A-Za-z0-9&'.-]*\b/g) ?? [];
  const abbreviations = new Set(words.map((word) => word.toLowerCase()));
  for (const candidate of [label, ...aliases]) {
    const short = acronym(candidate);
    if (short.length >= 3 && abbreviations.has(short)) {
      const original = words.find((word) => word.toLowerCase() === short);
      return { score: candidate === label ? 80 : 75, text: original };
    }
  }
  return null;
}

function targetKey(option) {
  if (option.kind === "person_capacity") {
    return [
      option.kind,
      option.personStableKey,
      option.positionStableKey,
      option.roleStableKey ?? "none",
    ].join(":");
  }
  return `${option.kind}:${option.stableKey}`;
}

function policyMentions(source) {
  const matches = source
    .split(/(?<=[.!?])\s+/)
    .flatMap((sentence) => sentence.match(
      /\b(?:[A-Z][A-Za-z0-9&’'-]*\s+){0,5}(?:Policy|Policies)\b/g,
    ) ?? []);
  return matches
    .map((text) => text.trim())
    .filter((text) => text.length >= 6 && text.length <= 160);
}

export function buildDiscoveryReferenceCandidates({
  catalog,
  observations,
}) {
  const candidates = [];
  const seen = new Set();
  const optionsByKind = new Map();
  for (const option of catalog) {
    const key = targetKey(option);
    const normalizedOption = { ...option, key };
    const options = optionsByKind.get(option.kind) ?? [];
    options.push(normalizedOption);
    optionsByKind.set(option.kind, options);
  }

  for (const observation of observations) {
    if (!observation.responseText) continue;
    const detected = [];
    for (const option of catalog) {
      const mention = findMention(
        observation.responseText,
        option.label,
        option.aliases,
        option.kind,
      );
      if (!mention) continue;
      detected.push({ mention, option });
    }
    for (const mentionText of policyMentions(observation.responseText)) {
      detected.push({
        mention: { score: 70, text: mentionText },
        option: {
          aliases: [],
          context: "No first-class Policy identity exists yet. Preserve this reference unresolved.",
          kind: "policy",
          label: mentionText,
        },
      });
    }
    detected.sort((left, right) =>
      right.mention.score - left.mention.score
      || left.mention.text.localeCompare(right.mention.text));
    let mentionSequence = 0;
    for (const detectedReference of detected) {
      const { mention, option } = detectedReference;
      const dedupeKey = [
        observation.id,
        option.kind,
        normalize(mention.text),
      ].join("|");
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      mentionSequence += 1;
      const availableOptions = option.kind === "policy"
        ? []
        : (optionsByKind.get(option.kind) ?? [])
          .sort((left, right) =>
            (left.key === targetKey(option) ? -1 : 0)
            - (right.key === targetKey(option) ? -1 : 0)
            || left.label.localeCompare(right.label))
          .slice(0, 75);
      candidates.push({
        kind: option.kind,
        kindLabel: REFERENCE_KIND_LABELS[option.kind] ?? "Reference",
        mentionSequence,
        mentionText: mention.text,
        observationSequence: observation.sequence,
        options: availableOptions,
        sourceObservationId: observation.id,
        suggestedTargetKey: option.kind === "policy" ? null : targetKey(option),
      });
      if (candidates.length >= 16) return candidates;
    }
  }
  return candidates;
}

export function parseDiscoveryReferenceTargetKey(value) {
  if (typeof value !== "string" || value.length > 256) return null;
  const [kind, first, second, third, ...rest] = value.split(":");
  if (rest.length > 0) return null;
  if (kind === "person_capacity") {
    if (!first || !second || !third) return null;
    return {
      kind,
      personStableKey: first,
      positionStableKey: second,
      roleStableKey: third === "none" ? null : third,
    };
  }
  if (
    !first
    || second !== undefined
    || ![
      "organization_unit",
      "operational_role",
      "system",
      "process",
      "process_family",
    ].includes(kind)
  ) return null;
  return { kind, stableKey: first };
}

export function fingerprintDiscoveryReferenceMention({
  mentionSequence,
  mentionText,
  referenceKind,
  sourceObservationId,
}) {
  void mentionSequence;
  return createHash("sha256")
    .update([
      sourceObservationId,
      referenceKind,
      normalize(mentionText),
    ].join("\n"))
    .digest("hex");
}
