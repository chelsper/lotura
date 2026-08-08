const LOTURA_DEFAULT_ACCENT = Object.freeze({
  base: "#286653",
  hover: "#205746",
  subtle: "#edf4f1",
  border: "#cfe0da",
  foreground: "#ffffff",
  focus: "#4d806f",
});

function normalizedHex(value) {
  if (typeof value !== "string") return null;

  const compact = value.trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/.exec(compact);
  if (short) {
    return `#${[...short[1]].map((character) => character.repeat(2)).join("")}`;
  }

  return /^#[0-9a-f]{6}$/.test(compact) ? compact : null;
}

function rgbChannels(value) {
  const color = normalizedHex(value);
  if (!color) {
    throw new Error("Workspace colors must use three- or six-digit hexadecimal notation.");
  }

  return [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
}

function relativeLuminance(value) {
  const channels = rgbChannels(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(left, right) {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function hasAccessibleContrast(
  foreground,
  background,
  minimumRatio = 4.5,
) {
  return contrastRatio(foreground, background) >= minimumRatio;
}

export function accessibleForeground(background) {
  const candidates = ["#ffffff", "#1c1f1d"];
  return candidates.sort(
    (left, right) =>
      contrastRatio(right, background) - contrastRatio(left, background),
  )[0];
}

function organizationMonogram(name) {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length === 0) return null;

  return words
    .slice(0, 2)
    .map((word) => [...word][0])
    .join("")
    .toLocaleUpperCase();
}

function mixColors(left, right, rightWeight) {
  const leftChannels = rgbChannels(left);
  const rightChannels = rgbChannels(right);
  const channels = leftChannels.map((channel, index) =>
    Math.round(channel * (1 - rightWeight) + rightChannels[index] * rightWeight),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function focusColor(base) {
  if (contrastRatio(base, "#ffffff") >= 3) return base;

  for (let weight = 0.1; weight <= 0.8; weight += 0.1) {
    const candidate = mixColors(base, "#000000", weight);
    if (contrastRatio(candidate, "#ffffff") >= 3) return candidate;
  }

  return "#1c1f1d";
}

function workspaceAccent(base) {
  const normalized = normalizedHex(base);
  if (!normalized) {
    throw new Error("Workspace accent must use three- or six-digit hexadecimal notation.");
  }

  const foreground = accessibleForeground(normalized);
  if (!hasAccessibleContrast(foreground, normalized)) {
    throw new Error("Workspace accent does not provide accessible text contrast.");
  }

  return Object.freeze({
    base: normalized,
    hover: mixColors(normalized, "#000000", 0.14),
    subtle: mixColors(normalized, "#ffffff", 0.92),
    border: mixColors(normalized, "#ffffff", 0.72),
    foreground,
    focus: focusColor(normalized),
  });
}

const KNOWLEDGE_STATES = Object.freeze({
  "sanitized-working-draft": Object.freeze({
    description:
      "This private preparation snapshot is a working draft. Human sanitization review remains required, and the information may be incomplete or unvalidated.",
    label: "Sanitized working draft",
    tone: "warning",
  }),
  validated: Object.freeze({
    description:
      "This snapshot has been checked by an appropriate participant or source but is not yet approved for pilot use.",
    label: "Validated",
    tone: "informational",
  }),
  "approved-for-pilot": Object.freeze({
    description:
      "This snapshot is approved for private pilot use. It does not represent formal institutional policy approval.",
    label: "Approved for pilot",
    tone: "success",
  }),
});

export function resolveWorkspaceConfiguration({
  organizationName,
  overrides = {},
}) {
  const displayName =
    typeof overrides.displayName === "string" && overrides.displayName.trim()
      ? overrides.displayName.trim()
      : typeof organizationName === "string" && organizationName.trim()
        ? organizationName.trim()
      : "Organization";
  const monogram = overrides.logoMonogram || organizationMonogram(displayName);
  const logo = overrides.logoUrl
    ? {
        kind: "image",
        src: overrides.logoUrl,
        accessibleLabel: `${displayName} logo`,
      }
    : monogram
      ? {
          kind: "monogram",
          text: monogram,
          accessibleLabel: `${displayName} monogram`,
        }
      : {
          kind: "lotura-mark",
          text: "L",
          accessibleLabel: "Lotura mark",
        };

  return {
    appearance: {
      displayName,
      scopeLabel: overrides.scopeLabel || null,
      logo,
      accent: overrides.accent
        ? workspaceAccent(overrides.accent)
        : LOTURA_DEFAULT_ACCENT,
    },
    knowledgeState: overrides.knowledgeState
      ? {
          id: overrides.knowledgeState,
          ...KNOWLEDGE_STATES[overrides.knowledgeState],
        }
      : null,
  };
}

export { KNOWLEDGE_STATES, LOTURA_DEFAULT_ACCENT };
