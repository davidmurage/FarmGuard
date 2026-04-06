import { REPORT_TYPES } from "../models/Report.js";
import { KENYA_BOUNDS, normalizeCountyName, resolveLocationCoordinates } from "./locationResolver.js";

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

  const fallbackSeed = report.title || report._id;
  const resolvedLocation = resolveLocationCoordinates({
    county: report.location?.county,
    locationName: report.location?.name,
    fallbackSeed,
  });

  return {
    ...resolvedLocation.coordinates,
    source: resolvedLocation.source,
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
