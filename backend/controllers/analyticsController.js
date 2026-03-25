import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildAnalyticsCsv, buildAnalyticsPdf } from "../utils/analyticsExport.js";
import { ANALYTICS_PERIODS, EXPORT_AUDIENCES, buildAnalyticsOverview, buildExportView } from "../services/analyticsService.js";

function getSafePeriod(period) {
  return ANALYTICS_PERIODS.includes(period) ? period : "monthly";
}

function getSafeAudience(audience, role) {
  if (role === "PARTNER") {
    return "partner";
  }

  return EXPORT_AUDIENCES.includes(audience) ? audience : "admin";
}

function buildExportFilename({ period, audience, extension }) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `farmguard-${period}-${audience}-report-${stamp}.${extension}`;
}

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const period = getSafePeriod(req.query.period);
  const intervals = req.query.intervals;
  const audience = req.user.role === "PARTNER" ? "partner" : "admin";
  const overview = await buildAnalyticsOverview({ period, intervals, audience });

  if (req.user.role === "PARTNER") {
    res.json(buildExportView(overview, "partner"));
    return;
  }

  res.json(overview);
});

export const exportAnalyticsCsv = asyncHandler(async (req, res) => {
  const period = getSafePeriod(req.query.period);
  const intervals = req.query.intervals;
  const audience = getSafeAudience(req.query.audience, req.user.role);
  const overview = await buildAnalyticsOverview({ period, intervals, audience });
  const exportView = buildExportView(overview, audience);
  const csv = buildAnalyticsCsv(exportView);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${buildExportFilename({ period, audience, extension: "csv" })}"`);
  res.send(csv);
});

export const exportAnalyticsPdf = asyncHandler(async (req, res) => {
  const period = getSafePeriod(req.query.period);
  const intervals = req.query.intervals;
  const audience = getSafeAudience(req.query.audience, req.user.role);
  const overview = await buildAnalyticsOverview({ period, intervals, audience });
  const exportView = buildExportView(overview, audience);
  const pdfBuffer = buildAnalyticsPdf(exportView);

  if (!pdfBuffer?.length) {
    throw new ApiError(500, "Unable to generate analytics PDF.");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${buildExportFilename({ period, audience, extension: "pdf" })}"`);
  res.send(pdfBuffer);
});
