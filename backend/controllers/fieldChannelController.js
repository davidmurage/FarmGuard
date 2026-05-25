import { env } from "../config/env.js";
import { ingestFieldChannelReport } from "../services/fieldChannelService.js";
import { refreshAutoReportWarningsSafely } from "../services/outbreakWarningService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeReport } from "../utils/serializers.js";

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function requireFieldChannelSecret(req) {
  if (!env.fieldChannelSecret) {
    return;
  }

  const providedSecret = req.headers["x-field-channel-secret"] || req.body.secret || "";

  if (String(providedSecret) !== env.fieldChannelSecret) {
    throw new ApiError(403, "Invalid field channel secret.");
  }
}

function buildAcknowledgement(report) {
  return `FarmGuard saved your ${report.reportType.toLowerCase()} report for ${report.location?.name || "your area"}, ${report.location?.county || "Unspecified"}. Ref ${report.id}.`;
}

function shouldUseUssdTextResponse(req) {
  return Boolean(req.body.sessionId || req.body.serviceCode || req.query.format === "ussd");
}

function shouldUseTwimlResponse(req) {
  return Boolean(req.body.Body !== undefined || req.headers["x-twilio-signature"]);
}

function sendUssdResponse(res, message) {
  res.type("text/plain").send(`END ${message}`);
}

function sendTwimlResponse(res, message) {
  res.type("text/xml").send(`<Response><Message>${escapeXml(message)}</Message></Response>`);
}

export const submitUssdReport = asyncHandler(async (req, res) => {
  requireFieldChannelSecret(req);

  const result = await ingestFieldChannelReport({
    channel: "USSD",
    phoneNumber: req.body.phoneNumber,
    messageText: req.body.text || req.body.message || "",
    displayName: req.body.name || req.body.displayName || "",
    payload: req.body,
  });

  await refreshAutoReportWarningsSafely();

  const report = serializeReport(result.report);
  const message = buildAcknowledgement(report);

  if (shouldUseUssdTextResponse(req)) {
    sendUssdResponse(res, message);
    return;
  }

  res.status(201).json({
    message,
    report,
    reporter: result.reporter,
  });
});

export const submitWhatsAppReport = asyncHandler(async (req, res) => {
  requireFieldChannelSecret(req);

  const result = await ingestFieldChannelReport({
    channel: "WHATSAPP",
    phoneNumber: req.body.phoneNumber || req.body.From,
    messageText: req.body.message || req.body.Body || "",
    displayName: req.body.displayName || req.body.ProfileName || req.body.name || "",
    payload: req.body,
  });

  await refreshAutoReportWarningsSafely();

  const report = serializeReport(result.report);
  const message = buildAcknowledgement(report);

  if (shouldUseTwimlResponse(req)) {
    sendTwimlResponse(res, message);
    return;
  }

  res.status(201).json({
    message,
    report,
    reporter: result.reporter,
  });
});
