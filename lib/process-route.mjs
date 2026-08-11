export function decodeProcessRouteId(value) {
  if (typeof value !== "string" || value.length === 0) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
