import mongoose from "mongoose";

import EnvironmentalImportJob from "../models/EnvironmentalImportJob.js";
import EnvironmentalSignal, { ENVIRONMENTAL_SIGNAL_SOURCES } from "../models/EnvironmentalSignal.js";
import { importEnvironmentalFeed as importEnvironmentalFeedData } from "../services/environmentalImportService.js";
import { listEnvironmentalProviderStatuses, triggerEnvironmentalProviderSync } from "../services/environmentalProviderService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sanitizeEnvironmentalSignalPayload } from "../utils/environmentalSignalPayload.js";
import { serializeEnvironmentalImportJob, serializeEnvironmentalSignal } from "../utils/serializers.js";

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
  const payload = sanitizeEnvironmentalSignalPayload(req.body, { requireCoreFields: true });

  const signal = await EnvironmentalSignal.create({
    county: payload.county,
    locationName: payload.locationName || "Regional",
    sourceType: payload.sourceType || "MANUAL_ENTRY",
    providerKey: payload.providerKey || "",
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

  const payload = sanitizeEnvironmentalSignalPayload(req.body);
  const nextCounty = payload.county ?? signal.county;

  if (!nextCounty) {
    throw new ApiError(400, "County is required.");
  }

  signal.county = nextCounty;
  signal.locationName = payload.locationName ?? signal.locationName;
  signal.sourceType = payload.sourceType ?? signal.sourceType;
  signal.providerKey = payload.providerKey ?? signal.providerKey;
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

export const importEnvironmentalFeed = asyncHandler(async (req, res) => {
  const sourceType = ENVIRONMENTAL_SIGNAL_SOURCES.includes(req.body.sourceType) && req.body.sourceType !== "MANUAL_ENTRY"
    ? req.body.sourceType
    : null;

  if (!sourceType) {
    throw new ApiError(400, "Source type must be WEATHER_FEED, SATELLITE_FEED, or GOV_UPLOAD for bulk imports.");
  }

  const result = await importEnvironmentalFeedData({
    sourceType,
    importFormat: req.body.importFormat,
    providerName: req.body.providerName || "",
    rawData: req.body.rawData || "",
    createdBy: req.user.id,
  });

  res.status(201).json(result);
});

export const listEnvironmentalImportJobs = asyncHandler(async (_req, res) => {
  const jobs = await EnvironmentalImportJob.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("createdBy", "name role");

  res.json({
    jobs: jobs.map(serializeEnvironmentalImportJob),
    total: jobs.length,
  });
});

export const listEnvironmentalProviders = asyncHandler(async (_req, res) => {
  const providers = await listEnvironmentalProviderStatuses();

  res.json({
    providers,
    total: providers.length,
  });
});

export const syncEnvironmentalProvider = asyncHandler(async (req, res) => {
  const providerKey = String(req.params.providerKey || "").trim().toUpperCase();
  const result = await triggerEnvironmentalProviderSync(providerKey, {
    triggerMode: "MANUAL",
    createdBy: req.user.id,
  });

  res.status(201).json(result);
});
