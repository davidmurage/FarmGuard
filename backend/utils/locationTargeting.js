export function normalizeCountyKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeText(value, fallback = "") {
  return value === undefined ? String(fallback || "").trim() : String(value || "").trim();
}

export function buildStoredLocation(input = {}, fallback = {}) {
  const name = sanitizeText(input.locationName ?? input.name, fallback.name);
  const county = sanitizeText(input.county, fallback.county);

  return {
    name,
    county,
    countyKey: normalizeCountyKey(county),
  };
}

export function hasCounty(location) {
  return Boolean(normalizeCountyKey(location?.countyKey || location?.county));
}
