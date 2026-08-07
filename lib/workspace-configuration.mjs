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

export function resolveWorkspaceConfiguration({ organizationName }) {
  const displayName =
    typeof organizationName === "string" && organizationName.trim()
      ? organizationName.trim()
      : "Organization";
  const monogram = organizationMonogram(displayName);

  return {
    appearance: {
      displayName,
      logo: monogram
        ? {
            kind: "monogram",
            text: monogram,
            accessibleLabel: `${displayName} monogram`,
          }
        : {
            kind: "lotura-mark",
            text: "L",
            accessibleLabel: "Lotura mark",
          },
      accent: LOTURA_DEFAULT_ACCENT,
    },
  };
}

export { LOTURA_DEFAULT_ACCENT };
