import Report, { REPORT_SEVERITIES, REPORT_TYPES } from "../models/Report.js";
import { ApiError } from "../utils/apiError.js";
import { resolveLocationCoordinates } from "../utils/locationResolver.js";

const REPORT_SOURCES = ["FARMER_APP", "VET_APP", "API_IMPORT", "USSD", "WHATSAPP"];

export function sanitizeSymptoms(symptoms) {
  if (!Array.isArray(symptoms)) {
    return [];
  }

  return symptoms.map((symptom) => String(symptom).trim()).filter(Boolean);
}

function sanitizeCoordinates(latitude, longitude) {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return undefined;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

export function resolveReportCoordinates({ latitude, longitude, locationName, county, fallbackSeed }) {
  const explicitCoordinates = sanitizeCoordinates(latitude, longitude);

  if (explicitCoordinates) {
    return explicitCoordinates;
  }

  return resolveLocationCoordinates({
    county,
    locationName,
    fallbackSeed,
  }).coordinates;
}

function normalizeReportSource(source, fallback) {
  return REPORT_SOURCES.includes(source) ? source : fallback;
}

export async function createStructuredReport({
  reporterId,
  reporterRole = "FARMER",
  reportType,
  title,
  description,
  symptoms,
  severity,
  status,
  source,
  locationName,
  county,
  latitude,
  longitude,
}) {
  const safeReportType = REPORT_TYPES.includes(reportType) ? reportType : null;
  const safeTitle = title?.trim();
  const safeDescription = description?.trim();
  const safeLocationName = locationName?.trim();
  const safeCounty = county?.trim() || "Unspecified";
  const safeSeverity = REPORT_SEVERITIES.includes(severity) ? severity : "MEDIUM";
  const safeSymptoms = sanitizeSymptoms(symptoms);
  const safeStatus = status || (reporterRole === "FARMER" ? "SUBMITTED" : "UNDER_REVIEW");
  const safeSource = normalizeReportSource(source, reporterRole === "VET" ? "VET_APP" : "FARMER_APP");

  if (!reporterId) {
    throw new ApiError(400, "Reporter id is required.");
  }

  if (!safeReportType) {
    throw new ApiError(400, "A valid report type is required.");
  }

  if (!safeTitle || !safeDescription || !safeLocationName) {
    throw new ApiError(400, "Title, description and location are required.");
  }

  const report = await Report.create({
    reporter: reporterId,
    reportType: safeReportType,
    title: safeTitle,
    description: safeDescription,
    severity: safeSeverity,
    symptoms: safeSymptoms,
    source: safeSource,
    status: safeStatus,
    location: {
      name: safeLocationName,
      county: safeCounty,
      coordinates: resolveReportCoordinates({
        latitude,
        longitude,
        locationName: safeLocationName,
        county: safeCounty,
        fallbackSeed: safeTitle,
      }),
    },
  });

  return Report.findById(report._id)
    .populate("reporter", "name email role")
    .populate("review.reviewedBy", "name email role");
}
