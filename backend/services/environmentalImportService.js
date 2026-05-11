import EnvironmentalImportJob from "../models/EnvironmentalImportJob.js";
import EnvironmentalSignal from "../models/EnvironmentalSignal.js";
import { ApiError } from "../utils/apiError.js";
import { sanitizeEnvironmentalSignalPayload } from "../utils/environmentalSignalPayload.js";
import { serializeEnvironmentalImportJob, serializeEnvironmentalSignal } from "../utils/serializers.js";

function splitCsvLine(line) {
  const values = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());
  return values;
}

function parseCsvPayload(rawData) {
  const lines = String(rawData || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new ApiError(400, "CSV import needs a header row and at least one data row.");
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function parseJsonPayload(rawData) {
  let parsedPayload;

  try {
    parsedPayload = JSON.parse(rawData);
  } catch {
    throw new ApiError(400, "JSON import payload is invalid.");
  }

  if (!Array.isArray(parsedPayload) || !parsedPayload.length) {
    throw new ApiError(400, "JSON import expects an array of signal objects.");
  }

  return parsedPayload;
}

function parseFeedPayload({ importFormat, rawData }) {
  const normalizedFormat = String(importFormat || "JSON").toUpperCase();

  if (!rawData?.trim()) {
    throw new ApiError(400, "Import data cannot be empty.");
  }

  if (normalizedFormat === "CSV") {
    return parseCsvPayload(rawData);
  }

  if (normalizedFormat === "JSON") {
    return parseJsonPayload(rawData);
  }

  throw new ApiError(400, "Import format must be CSV or JSON.");
}

function buildSummaryMessage({ importedRecords, failedRecords, providerName }) {
  const providerLabel = providerName ? ` from ${providerName}` : "";

  if (!importedRecords && failedRecords) {
    return `FarmGuard could not import any records${providerLabel}.`;
  }

  if (failedRecords) {
    return `Imported ${importedRecords} records${providerLabel} with ${failedRecords} row issues.`;
  }

  return `Imported ${importedRecords} records${providerLabel} successfully.`;
}

export async function importEnvironmentalFeed({
  sourceType,
  importFormat,
  providerName = "",
  rawData,
  createdBy,
}) {
  const rows = parseFeedPayload({ importFormat, rawData });
  const validPayloads = [];
  const errorSamples = [];

  rows.forEach((row, index) => {
    try {
      const payload = sanitizeEnvironmentalSignalPayload(row, {
        requireCoreFields: true,
        defaultSourceType: sourceType,
      });

      validPayloads.push({
        county: payload.county,
        locationName: payload.locationName || "Regional",
        sourceType: payload.sourceType || sourceType,
        providerKey: payload.providerKey || "",
        rainfallMm: payload.rainfallMm ?? 0,
        humidityPct: payload.humidityPct ?? 0,
        temperatureC: payload.temperatureC ?? 0,
        vegetationIndex: payload.vegetationIndex ?? 50,
        soilMoisturePct: payload.soilMoisturePct ?? 50,
        notes: payload.notes || "",
        capturedAt: payload.capturedAt || new Date(),
        createdBy,
      });
    } catch (error) {
      errorSamples.push(`Row ${index + 2}: ${error.message}`);
    }
  });

  const importedSignals = validPayloads.length
    ? await EnvironmentalSignal.insertMany(validPayloads)
    : [];
  const importedCounties = Array.from(new Set(importedSignals.map((signal) => signal.county))).slice(0, 8);
  const importedRecords = importedSignals.length;
  const failedRecords = errorSamples.length;
  const status =
    importedRecords && failedRecords
      ? "PARTIAL"
      : importedRecords
        ? "COMPLETED"
        : "FAILED";
  const summaryMessage = buildSummaryMessage({ importedRecords, failedRecords, providerName });

  const importJob = await EnvironmentalImportJob.create({
    sourceType,
    importFormat: String(importFormat || "JSON").toUpperCase(),
    providerName: providerName.trim(),
    providerKey: "",
    jobType: "MANUAL_IMPORT",
    triggerMode: "MANUAL",
    status,
    totalRecords: rows.length,
    importedRecords,
    failedRecords,
    importedCounties,
    errorSamples: errorSamples.slice(0, 6),
    summaryMessage,
    createdBy,
  });
  const hydratedJob = await EnvironmentalImportJob.findById(importJob._id).populate("createdBy", "name role");

  return {
    message: summaryMessage,
    importJob: serializeEnvironmentalImportJob(hydratedJob),
    importedSignals: importedSignals.slice(0, 8).map(serializeEnvironmentalSignal),
  };
}
