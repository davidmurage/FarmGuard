import { REPORT_TYPES } from "../models/Report.js";

const KENYA_BOUNDS = {
  minLatitude: -4.75,
  maxLatitude: 4.75,
  minLongitude: 33.9,
  maxLongitude: 41.95,
};

const KNOWN_COUNTY_CENTROIDS = {
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

const SEVERITY_WEIGHTS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3.4,
  CRITICAL: 4.8,
};

const STATUS_WEIGHTS = {
  SUBMITTED: 1.25,
  UNDER_REVIEW: 1.15,
  VERIFIED: 1.1,
  RESOLVED: 0.45,
};

function normalizeCountyName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function getLocationPoint(report) {
  const reportLatitude = Number(report.location?.coordinates?.latitude);
  const reportLongitude = Number(report.location?.coordinates?.longitude);

  if (Number.isFinite(reportLatitude) && Number.isFinite(reportLongitude)) {
    return {
      latitude: reportLatitude,
      longitude: reportLongitude,
      source: "report_coordinates",
    };
  }

  const countyKey = normalizeCountyName(report.location?.county);
  if (countyKey && KNOWN_COUNTY_CENTROIDS[countyKey]) {
    return {
      ...KNOWN_COUNTY_CENTROIDS[countyKey],
      source: "county_lookup",
    };
  }

  const fallbackSeed = `${countyKey}|${report.location?.name || ""}|${report.title || report._id}`;
  return {
    ...deriveFallbackCoordinates(fallbackSeed),
    source: countyKey ? "county_estimate" : "location_estimate",
  };
}

function getRecencyWeight(createdAt) {
  const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays <= 3) {
    return 1.35;
  }

  if (ageInDays <= 7) {
    return 1.18;
  }

  if (ageInDays <= 14) {
    return 1.02;
  }

  if (ageInDays <= 30) {
    return 0.88;
  }

  return 0.72;
}

function getReviewWeight(report) {
  if (report.status === "VERIFIED" && report.review?.reviewedAt) {
    return 1.08;
  }

  if (report.status === "RESOLVED") {
    return 0.5;
  }

  return 1;
}

function getRiskBand(score) {
  if (score >= 16) {
    return "CRITICAL";
  }

  if (score >= 10) {
    return "HIGH";
  }

  if (score >= 5) {
    return "MEDIUM";
  }

  return "LOW";
}

function buildHotspotSummary(hotspot) {
  const dominantType = Object.entries(hotspot.typeBreakdown).sort((left, right) => right[1] - left[1])[0]?.[0] || "MIXED";
  const latestReportAt = hotspot.latestReportAt || hotspot.createdAt;
  const normalizedRiskScore = Number(hotspot.riskScore.toFixed(2));

  return {
    id: hotspot.id,
    label: hotspot.label,
    county: hotspot.county,
    latitude: Number(hotspot.latitude.toFixed(4)),
    longitude: Number(hotspot.longitude.toFixed(4)),
    pointSource: hotspot.pointSource,
    reportCount: hotspot.reportCount,
    riskScore: normalizedRiskScore,
    band: getRiskBand(normalizedRiskScore),
    dominantType,
    severityBreakdown: hotspot.severityBreakdown,
    typeBreakdown: hotspot.typeBreakdown,
    latestReportAt,
    sampleTitles: hotspot.sampleTitles.slice(0, 3),
  };
}

export function clampRiskMapDays(daysValue) {
  return clamp(Number(daysValue) || 30, 7, 180);
}

export function isValidRiskMapType(type) {
  return type === "ALL" || REPORT_TYPES.includes(type);
}

export function buildRiskMapPayload(reports, { days, reportType }) {
  const hotspots = new Map();

  for (const report of reports) {
    const point = getLocationPoint(report);
    const locationCounty = report.location?.county?.trim() || "Unspecified";
    const locationName = report.location?.name?.trim() || report.title;
    const hotspotKey = normalizeCountyName(locationCounty) || normalizeCountyName(locationName) || String(report._id);
    const severityWeight = SEVERITY_WEIGHTS[report.severity] || 1;
    const statusWeight = STATUS_WEIGHTS[report.status] || 1;
    const recencyWeight = getRecencyWeight(report.createdAt);
    const reviewWeight = getReviewWeight(report);
    const riskContribution = severityWeight * statusWeight * recencyWeight * reviewWeight;

    if (!hotspots.has(hotspotKey)) {
      hotspots.set(hotspotKey, {
        id: hotspotKey,
        label: locationName,
        county: locationCounty,
        latitude: point.latitude,
        longitude: point.longitude,
        pointSource: point.source,
        reportCount: 0,
        riskScore: 0,
        severityBreakdown: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        typeBreakdown: { LIVESTOCK: 0, CROP: 0, ENVIRONMENT: 0 },
        latestReportAt: report.createdAt,
        sampleTitles: [],
      });
    }

    const hotspot = hotspots.get(hotspotKey);
    hotspot.reportCount += 1;
    hotspot.riskScore += riskContribution;
    hotspot.severityBreakdown[report.severity] = (hotspot.severityBreakdown[report.severity] || 0) + 1;
    hotspot.typeBreakdown[report.reportType] = (hotspot.typeBreakdown[report.reportType] || 0) + 1;
    hotspot.latestReportAt =
      new Date(report.createdAt).getTime() > new Date(hotspot.latestReportAt).getTime()
        ? report.createdAt
        : hotspot.latestReportAt;

    if (hotspot.sampleTitles.length < 3) {
      hotspot.sampleTitles.push(report.title);
    }
  }

  const hotspotList = Array.from(hotspots.values())
    .map(buildHotspotSummary)
    .sort((left, right) => right.riskScore - left.riskScore);

  const estimatedHotspotCount = hotspotList.filter((hotspot) => hotspot.pointSource !== "report_coordinates").length;

  const summary = {
    days,
    reportType,
    reportCount: reports.length,
    hotspotCount: hotspotList.length,
    estimatedHotspotCount,
    highestRiskScore: hotspotList[0]?.riskScore || 0,
    bands: hotspotList.reduce(
      (counts, hotspot) => ({
        ...counts,
        [hotspot.band]: counts[hotspot.band] + 1,
      }),
      { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    ),
  };

  return {
    bounds: KENYA_BOUNDS,
    summary,
    hotspots: hotspotList,
    topHotspots: hotspotList.slice(0, 5),
  };
}
