export const KENYA_BOUNDS = {
  minLatitude: -4.75,
  maxLatitude: 4.75,
  minLongitude: 33.9,
  maxLongitude: 41.95,
};

export const KNOWN_COUNTY_CENTROIDS = {
  baringo: { latitude: 0.47, longitude: 35.98 },
  bungoma: { latitude: 0.57, longitude: 34.56 },
  busia: { latitude: 0.46, longitude: 34.11 },
  "elgeyo marakwet": { latitude: 0.8, longitude: 35.5 },
  embu: { latitude: -0.54, longitude: 37.45 },
  garissa: { latitude: -0.46, longitude: 39.66 },
  "homa bay": { latitude: -0.53, longitude: 34.46 },
  isiolo: { latitude: 0.35, longitude: 37.58 },
  kajiado: { latitude: -1.85, longitude: 36.78 },
  kakamega: { latitude: 0.29, longitude: 34.75 },
  kericho: { latitude: -0.37, longitude: 35.29 },
  kiambu: { latitude: -1.03, longitude: 36.87 },
  kilifi: { latitude: -3.5, longitude: 39.85 },
  kirinyaga: { latitude: -0.58, longitude: 37.28 },
  kisii: { latitude: -0.68, longitude: 34.78 },
  kisumu: { latitude: -0.1, longitude: 34.75 },
  kitui: { latitude: -1.37, longitude: 38.02 },
  kwale: { latitude: -4.18, longitude: 39.45 },
  laikipia: { latitude: 0.26, longitude: 36.78 },
  machakos: { latitude: -1.52, longitude: 37.27 },
  makueni: { latitude: -2.25, longitude: 37.83 },
  mandera: { latitude: 3.94, longitude: 41.86 },
  marsabit: { latitude: 2.33, longitude: 37.99 },
  meru: { latitude: 0.05, longitude: 37.65 },
  migori: { latitude: -1.07, longitude: 34.47 },
  mombasa: { latitude: -4.05, longitude: 39.67 },
  muranga: { latitude: -0.73, longitude: 37.16 },
  nairobi: { latitude: -1.29, longitude: 36.82 },
  nakuru: { latitude: -0.28, longitude: 36.07 },
  nandi: { latitude: 0.17, longitude: 35.1 },
  narok: { latitude: -1.09, longitude: 35.87 },
  nyamira: { latitude: -0.57, longitude: 34.93 },
  nyandarua: { latitude: -0.18, longitude: 36.52 },
  nyeri: { latitude: -0.42, longitude: 36.95 },
  samburu: { latitude: 1.21, longitude: 36.95 },
  siaya: { latitude: 0.06, longitude: 34.29 },
  "taita taveta": { latitude: -3.32, longitude: 38.35 },
  "tana river": { latitude: -1.65, longitude: 40.0 },
  "tharaka nithi": { latitude: -0.3, longitude: 37.9 },
  "trans nzoia": { latitude: 1.02, longitude: 35.0 },
  turkana: { latitude: 3.12, longitude: 35.6 },
  "uasin gishu": { latitude: 0.52, longitude: 35.29 },
  vihiga: { latitude: 0.08, longitude: 34.73 },
  wajir: { latitude: 1.75, longitude: 40.06 },
  "west pokot": { latitude: 1.45, longitude: 35.12 },
};

export function normalizeCountyName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function deriveFallbackCoordinates(seed) {
  const primaryHash = hashString(seed);
  const secondaryHash = hashString(seed.split("").reverse().join(""));
  const latitudeRatio = (primaryHash % 1000) / 1000;
  const longitudeRatio = (secondaryHash % 1000) / 1000;

  return {
    latitude:
      KENYA_BOUNDS.minLatitude +
      latitudeRatio * (KENYA_BOUNDS.maxLatitude - KENYA_BOUNDS.minLatitude),
    longitude:
      KENYA_BOUNDS.minLongitude +
      longitudeRatio * (KENYA_BOUNDS.maxLongitude - KENYA_BOUNDS.minLongitude),
  };
}

export function resolveLocationCoordinates({ county, locationName, fallbackSeed = "" } = {}) {
  const countyKey = normalizeCountyName(county);

  if (countyKey && KNOWN_COUNTY_CENTROIDS[countyKey]) {
    return {
      coordinates: KNOWN_COUNTY_CENTROIDS[countyKey],
      source: "county_lookup",
    };
  }

  const safeLocationName = String(locationName || "").trim();
  const seed = `${countyKey}|${safeLocationName}|${fallbackSeed}` || "kenya";

  return {
    coordinates: deriveFallbackCoordinates(seed),
    source: countyKey ? "county_estimate" : "location_estimate",
  };
}

export function listKnownCountyCentroids() {
  return Object.entries(KNOWN_COUNTY_CENTROIDS).map(([countyKey, coordinates]) => ({
    countyKey,
    county: countyKey.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    coordinates,
  }));
}
