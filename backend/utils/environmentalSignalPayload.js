import { ENVIRONMENTAL_SIGNAL_SOURCES } from "../models/EnvironmentalSignal.js";
import { ApiError } from "./apiError.js";

function sanitizeNumber(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function sanitizeEnvironmentalSignalPayload(body = {}, { requireCoreFields = false, defaultSourceType = "" } = {}) {
  const payload = {};

  if (body.county !== undefined) {
    payload.county = String(body.county || "").trim();
  }

  if (body.locationName !== undefined) {
    payload.locationName = String(body.locationName || "").trim() || "Regional";
  }

  const nextSourceType = body.sourceType ?? defaultSourceType;

  if (nextSourceType !== undefined && nextSourceType !== "") {
    payload.sourceType = ENVIRONMENTAL_SIGNAL_SOURCES.includes(nextSourceType) ? nextSourceType : "MANUAL_ENTRY";
  }

  if (body.providerKey !== undefined) {
    payload.providerKey = String(body.providerKey || "").trim();
  }

  if (body.rainfallMm !== undefined) {
    payload.rainfallMm = Math.max(0, sanitizeNumber(body.rainfallMm, 0));
  }

  if (body.humidityPct !== undefined) {
    payload.humidityPct = Math.min(Math.max(sanitizeNumber(body.humidityPct, 0), 0), 100);
  }

  if (body.temperatureC !== undefined) {
    payload.temperatureC = sanitizeNumber(body.temperatureC, 0);
  }

  if (body.vegetationIndex !== undefined) {
    payload.vegetationIndex = Math.min(Math.max(sanitizeNumber(body.vegetationIndex, 50), 0), 100);
  }

  if (body.soilMoisturePct !== undefined) {
    payload.soilMoisturePct = Math.min(Math.max(sanitizeNumber(body.soilMoisturePct, 50), 0), 100);
  }

  if (body.notes !== undefined) {
    payload.notes = String(body.notes || "").trim();
  }

  if (body.capturedAt !== undefined) {
    const parsedDate = new Date(body.capturedAt);
    payload.capturedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  }

  if (requireCoreFields && !payload.county) {
    throw new ApiError(400, "County is required.");
  }

  return payload;
}
