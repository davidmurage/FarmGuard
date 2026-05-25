import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

import { env } from "../config/env.js";
import User from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { buildStoredLocation } from "../utils/locationTargeting.js";
import { normalizePhoneNumber } from "../utils/phoneNumber.js";
import { serializeUser } from "../utils/serializers.js";
import { createStructuredReport } from "./reportIngestionService.js";

const CHANNEL_NAMES = ["USSD", "WHATSAPP"];
const REPORT_TYPE_ALIASES = {
  LIVESTOCK: "LIVESTOCK",
  ANIMAL: "LIVESTOCK",
  ANIMALS: "LIVESTOCK",
  CATTLE: "LIVESTOCK",
  GOAT: "LIVESTOCK",
  GOATS: "LIVESTOCK",
  POULTRY: "LIVESTOCK",
  CROP: "CROP",
  CROPS: "CROP",
  PLANT: "CROP",
  PLANTS: "CROP",
  PEST: "CROP",
  ENVIRONMENT: "ENVIRONMENT",
  WEATHER: "ENVIRONMENT",
};
const SEVERITY_ALIASES = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  MODERATE: "MEDIUM",
  HIGH: "HIGH",
  SEVERE: "HIGH",
  CRITICAL: "CRITICAL",
  URGENT: "CRITICAL",
};
const FIELD_ALIASES = {
  type: "reportType",
  report: "reportType",
  reporttype: "reportType",
  title: "title",
  subject: "title",
  description: "description",
  desc: "description",
  details: "description",
  symptoms: "symptoms",
  signs: "symptoms",
  county: "county",
  location: "locationName",
  area: "locationName",
  village: "locationName",
  severity: "severity",
};

function normalizeReportType(value) {
  const key = String(value || "").trim().toUpperCase();
  return REPORT_TYPE_ALIASES[key] || "";
}

function normalizeSeverity(value) {
  const key = String(value || "").trim().toUpperCase();
  return SEVERITY_ALIASES[key] || "MEDIUM";
}

function splitSymptoms(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFallbackTitle(reportType, locationName, symptoms) {
  const label = reportType === "LIVESTOCK" ? "Livestock warning signs" : reportType === "CROP" ? "Crop warning signs" : "Environmental signal";
  const signLabel = symptoms.length ? symptoms.slice(0, 2).join(", ") : "reported conditions";
  return `${label} near ${locationName}: ${signLabel}`;
}

function buildFallbackDescription(channel, locationName, county, messageText, symptoms) {
  if (String(messageText || "").trim()) {
    return String(messageText).trim();
  }

  if (symptoms.length) {
    return `Reported via ${channel} from ${locationName}, ${county}. Symptoms or warning signs: ${symptoms.join(", ")}.`;
  }

  return `Reported via ${channel} from ${locationName}, ${county}.`;
}

function parseDelimitedMessage(text) {
  const parts = String(text || "")
    .split("*")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 4) {
    return {};
  }

  return {
    reportType: normalizeReportType(parts[0]),
    title: parts[1] || "",
    description: parts[2] || "",
    county: parts[3] || "",
    locationName: parts[4] || "",
    severity: normalizeSeverity(parts[5]),
    symptoms: splitSymptoms(parts[6]),
  };
}

function parseKeyValueMessage(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = {};

  for (const line of lines) {
    const match = line.match(/^([^:=-]+)\s*[:=-]\s*(.+)$/);

    if (!match) {
      continue;
    }

    const key = FIELD_ALIASES[match[1].trim().toLowerCase().replace(/\s+/g, "")];
    if (!key) {
      continue;
    }

    parsed[key] = key === "symptoms" ? splitSymptoms(match[2]) : match[2].trim();
  }

  if (parsed.reportType) {
    parsed.reportType = normalizeReportType(parsed.reportType);
  }

  if (parsed.severity) {
    parsed.severity = normalizeSeverity(parsed.severity);
  }

  return parsed;
}

function buildNormalizedInput({ payload, messageText, reporter }) {
  const keyValueInput = parseKeyValueMessage(messageText);
  const delimitedInput = parseDelimitedMessage(messageText);
  const reportType = normalizeReportType(payload.reportType || keyValueInput.reportType || delimitedInput.reportType);
  const locationName = String(payload.locationName || keyValueInput.locationName || delimitedInput.locationName || reporter?.location?.name || "").trim();
  const county = String(payload.county || keyValueInput.county || delimitedInput.county || reporter?.location?.county || "").trim();
  const symptoms = splitSymptoms(payload.symptoms || keyValueInput.symptoms || delimitedInput.symptoms);
  const title = String(payload.title || keyValueInput.title || delimitedInput.title || buildFallbackTitle(reportType, locationName || "the area", symptoms)).trim();
  const description = String(
    payload.description
      || keyValueInput.description
      || delimitedInput.description
      || buildFallbackDescription(payload.channel || "field channel", locationName || "the area", county || "Unspecified", messageText, symptoms),
  ).trim();

  return {
    reportType,
    locationName,
    county,
    severity: normalizeSeverity(payload.severity || keyValueInput.severity || delimitedInput.severity),
    symptoms,
    title,
    description,
  };
}

function buildChannelEmail(phoneNumber, channel) {
  const compactPhone = String(phoneNumber || "").replace(/[^\d]/g, "") || randomUUID().slice(0, 12);
  return `${channel.toLowerCase()}-${compactPhone}@farmguard.local`;
}

async function ensureChannelReporter({ phoneNumber, channel, displayName, county, locationName }) {
  let reporter = await User.findOne({ phoneNumber });

  if (reporter) {
    const nextLocation = buildStoredLocation({ locationName, county }, reporter.location?.toObject ? reporter.location.toObject() : reporter.location);
    const currentCounty = reporter.location?.county || "";
    const currentLocation = reporter.location?.name || "";

    if ((!currentCounty && nextLocation.county) || (!currentLocation && nextLocation.name)) {
      reporter.location = nextLocation;
      await reporter.save();
    }

    return reporter;
  }

  if (!env.fieldChannelAutoCreateUsers) {
    throw new ApiError(404, "No FarmGuard user is registered with this phone number.");
  }

  const passwordHash = await bcrypt.hash(randomUUID(), 10);
  const safeLocation = buildStoredLocation({ locationName, county });

  reporter = await User.create({
    name: String(displayName || `Channel farmer ${phoneNumber.slice(-4)}`).trim(),
    email: buildChannelEmail(phoneNumber, channel),
    password: passwordHash,
    role: "FARMER",
    phoneNumber,
    location: safeLocation,
    notificationPreferences: {
      sms: true,
      whatsapp: channel === "WHATSAPP",
      inApp: false,
    },
  });

  return reporter;
}

export async function ingestFieldChannelReport({
  channel,
  phoneNumber,
  messageText,
  displayName,
  payload = {},
}) {
  const safeChannel = CHANNEL_NAMES.includes(channel) ? channel : "";
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  if (!safeChannel) {
    throw new ApiError(400, "Unsupported field reporting channel.");
  }

  if (!normalizedPhoneNumber) {
    throw new ApiError(400, "A valid phone number is required for field reporting.");
  }

  const existingReporter = await User.findOne({ phoneNumber: normalizedPhoneNumber });
  const normalizedInput = buildNormalizedInput({
    payload: {
      ...payload,
      channel: safeChannel,
    },
    messageText,
    reporter: existingReporter,
  });

  if (!normalizedInput.reportType) {
    throw new ApiError(400, "FarmGuard could not detect the report type. Send LIVESTOCK, CROP, or ENVIRONMENT.");
  }

  if (!normalizedInput.locationName || !normalizedInput.county) {
    throw new ApiError(400, "Location and county are required so FarmGuard can place the report accurately.");
  }

  const reporter = await ensureChannelReporter({
    phoneNumber: normalizedPhoneNumber,
    channel: safeChannel,
    displayName,
    county: normalizedInput.county,
    locationName: normalizedInput.locationName,
  });

  const report = await createStructuredReport({
    reporterId: reporter._id,
    reporterRole: reporter.role,
    reportType: normalizedInput.reportType,
    title: normalizedInput.title,
    description: normalizedInput.description,
    symptoms: normalizedInput.symptoms,
    severity: normalizedInput.severity,
    source: safeChannel,
    locationName: normalizedInput.locationName,
    county: normalizedInput.county,
  });

  return {
    report,
    reporter: serializeUser(reporter),
  };
}
