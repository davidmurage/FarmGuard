import mongoose from "mongoose";

import EnvironmentalSignal, { ENVIRONMENTAL_SIGNAL_SOURCES } from "../models/EnvironmentalSignal.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeEnvironmentalSignal } from "../utils/serializers.js";

function sanitizeNumber(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function sanitizeSignalPayload(body = {}, { requireCoreFields = false } = {}) {
  const payload = {};

  if (body.county !== undefined) {
    payload.county = body.county?.trim();
  }

  if (body.locationName !== undefined) {
    payload.locationName = body.locationName?.trim() || "Regional";
  }

  if (body.sourceType !== undefined) {
    payload.sourceType = ENVIRONMENTAL_SIGNAL_SOURCES.includes(body.sourceType) ? body.sourceType : "MANUAL_ENTRY";
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
    payload.notes = body.notes?.trim() || "";
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

function assertValidSignalId(signalId) {
  if (!mongoose.Types.ObjectId.isValid(signalId)) {
    throw new ApiError(400, "Invalid environmental signal id.");
  }
}

export const listEnvironmentalSignals = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  const filters = {};

  if (req.query.county) {
    filters.county = req.query.county.trim();
  }

  if (ENVIRONMENTAL_SIGNAL_SOURCES.includes(req.query.sourceType)) {
    filters.sourceType = req.query.sourceType;
  }

  const signals = await EnvironmentalSignal.find(filters)
    .sort({ capturedAt: -1, createdAt: -1 })
    .limit(limit)
    .populate("createdBy", "name role");

  res.json({
    signals: signals.map(serializeEnvironmentalSignal),
    total: signals.length,
  });
});

export const createEnvironmentalSignal = asyncHandler(async (req, res) => {
  const payload = sanitizeSignalPayload(req.body, { requireCoreFields: true });

  const signal = await EnvironmentalSignal.create({
    county: payload.county,
    locationName: payload.locationName || "Regional",
    sourceType: payload.sourceType || "MANUAL_ENTRY",
    rainfallMm: payload.rainfallMm ?? 0,
    humidityPct: payload.humidityPct ?? 0,
    temperatureC: payload.temperatureC ?? 0,
    vegetationIndex: payload.vegetationIndex ?? 50,
    soilMoisturePct: payload.soilMoisturePct ?? 50,
    notes: payload.notes || "",
    capturedAt: payload.capturedAt || new Date(),
    createdBy: req.user.id,
  });

  const hydratedSignal = await EnvironmentalSignal.findById(signal._id).populate("createdBy", "name role");

  res.status(201).json({
    message: "Environmental signal logged successfully.",
    signal: serializeEnvironmentalSignal(hydratedSignal),
  });
});

export const updateEnvironmentalSignal = asyncHandler(async (req, res) => {
  const { signalId } = req.params;
  assertValidSignalId(signalId);

  const signal = await EnvironmentalSignal.findById(signalId);

  if (!signal) {
    throw new ApiError(404, "Environmental signal not found.");
  }

  const payload = sanitizeSignalPayload(req.body);
  const nextCounty = payload.county ?? signal.county;

  if (!nextCounty) {
    throw new ApiError(400, "County is required.");
  }

  signal.county = nextCounty;
  signal.locationName = payload.locationName ?? signal.locationName;
  signal.sourceType = payload.sourceType ?? signal.sourceType;
  signal.rainfallMm = payload.rainfallMm ?? signal.rainfallMm;
  signal.humidityPct = payload.humidityPct ?? signal.humidityPct;
  signal.temperatureC = payload.temperatureC ?? signal.temperatureC;
  signal.vegetationIndex = payload.vegetationIndex ?? signal.vegetationIndex;
  signal.soilMoisturePct = payload.soilMoisturePct ?? signal.soilMoisturePct;
  signal.notes = payload.notes ?? signal.notes;
  signal.capturedAt = payload.capturedAt ?? signal.capturedAt;

  await signal.save();

  const hydratedSignal = await EnvironmentalSignal.findById(signalId).populate("createdBy", "name role");

  res.json({
    message: "Environmental signal updated successfully.",
    signal: serializeEnvironmentalSignal(hydratedSignal),
  });
});

export const deleteEnvironmentalSignal = asyncHandler(async (req, res) => {
  const { signalId } = req.params;
  assertValidSignalId(signalId);

  const signal = await EnvironmentalSignal.findById(signalId);

  if (!signal) {
    throw new ApiError(404, "Environmental signal not found.");
  }

  await signal.deleteOne();

  res.json({
    message: "Environmental signal deleted successfully.",
  });
});
