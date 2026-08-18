export const DISCOVERY_SCOPE_MODES = ["whole", "part"];

export function buildDiscoveryScopeStatement({ mode, details }) {
  if (mode === "whole") {
    return "The whole process, from beginning to end.";
  }

  if (mode !== "part") return null;

  const statement = typeof details === "string" ? details.trim() : "";
  return statement.length > 0 && statement.length <= 2000 ? statement : null;
}
