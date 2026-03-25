import Alert from "../models/Alert.js";
import Report, { REPORT_TYPES } from "../models/Report.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildRiskMapPayload, clampRiskMapDays, isValidRiskMapType } from "../utils/riskMap.js";
import { serializeAlert, serializeReport } from "../utils/serializers.js";

function buildSummaryCards(role, metrics) {
  const secondLabel =
    role === "ADMIN"
      ? "Pending triage"
      : role === "VET"
        ? "Field follow-ups"
        : role === "PARTNER"
          ? "Open signals"
          : "Open follow-ups";
  const firstLabel =
    role === "FARMER"
      ? "My reports"
      : role === "PARTNER"
        ? "Signals monitored"
        : "Reports tracked";
  const alertLabel = role === "PARTNER" ? "Planning alerts" : "Active alerts";

  return [
    {
      key: "totalReports",
      label: firstLabel,
      value: metrics.totalReports,
      description: "Total reports available in your workspace.",
      tone: "neutral",
    },
    {
      key: "openReports",
      label: secondLabel,
      value: metrics.openReports,
      description: "Reports that still need action or verification.",
      tone: "warning",
    },
    {
      key: "highRiskReports",
      label: "High-risk signals",
      value: metrics.highRiskReports,
      description: "High or critical reports in recent activity.",
      tone: "danger",
    },
    {
      key: "activeAlerts",
      label: alertLabel,
      value: metrics.activeAlerts,
      description: "Advisories currently visible to your role.",
      tone: "success",
    },
  ];
}

function buildQuickActions(role) {
  if (role === "ADMIN") {
    return [
      "Publish regional alerts for farmers and field teams.",
      "Monitor high-severity reports awaiting intervention.",
      "Coordinate exports and response summaries for partners.",
    ];
  }

  if (role === "VET") {
    return [
      "Review new farmer reports and prioritize follow-up visits.",
      "Validate severe livestock and crop incidents from the field.",
      "Share location-specific recommendations with affected farmers.",
    ];
  }

  if (role === "PARTNER") {
    return [
      "Monitor anonymized hotspot movement to plan outreach and resource allocation.",
      "Download partner-safe monthly or quarterly reports for coordination meetings.",
      "Use trend shifts to identify counties that may need prevention support next.",
    ];
  }

  return [
    "Submit early disease, pest, or weather-related warning signs.",
    "Track alert updates for your local area.",
    "Use recommended actions before issues spread further.",
  ];
}

export const getDashboardOverview = asyncHandler(async (req, res) => {
  const reportFilters = req.user.role === "FARMER" ? { reporter: req.user.id } : {};
  const alertFilters = {
    isActive: true,
    targetRoles: { $in: [req.user.role, "ALL"] },
  };
  const canViewRecentReports = req.user.role !== "PARTNER";

  const [recentReports, activeAlerts, totalReports, openReports, highRiskReports] = await Promise.all([
    canViewRecentReports
      ? Report.find(reportFilters)
          .sort({ createdAt: -1 })
          .limit(6)
          .populate("reporter", "name email role")
          .populate("review.reviewedBy", "name email role")
      : Promise.resolve([]),
    Alert.find(alertFilters)
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("createdBy", "name role"),
    Report.countDocuments(reportFilters),
    Report.countDocuments({
      ...reportFilters,
      status: { $in: ["SUBMITTED", "UNDER_REVIEW", "VERIFIED"] },
    }),
    Report.countDocuments({
      ...reportFilters,
      severity: { $in: ["HIGH", "CRITICAL"] },
    }),
  ]);

  res.json({
    role: req.user.role,
    summaryCards: buildSummaryCards(req.user.role, {
      totalReports,
      openReports,
      highRiskReports,
      activeAlerts: activeAlerts.length,
    }),
    recentReports: canViewRecentReports ? recentReports.map(serializeReport) : [],
    activeAlerts: activeAlerts.map(serializeAlert),
    quickActions: buildQuickActions(req.user.role),
  });
});

export const getRiskMapOverview = asyncHandler(async (req, res) => {
  const days = clampRiskMapDays(req.query.days);
  const reportType = isValidRiskMapType(req.query.reportType) ? req.query.reportType : "ALL";
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const filters = {
    createdAt: { $gte: since },
    status: { $in: ["SUBMITTED", "UNDER_REVIEW", "VERIFIED"] },
  };

  if (REPORT_TYPES.includes(reportType)) {
    filters.reportType = reportType;
  }

  const reports = await Report.find(filters)
    .sort({ createdAt: -1 })
    .limit(300)
    .select("title reportType severity status createdAt location review.reviewedAt");

  const payload = buildRiskMapPayload(reports, { days, reportType });

  if (req.user.role === "PARTNER") {
    const sanitizeHotspot = (hotspot) => ({
      ...hotspot,
      label: hotspot.county || "Regional cluster",
      sampleTitles: [],
    });

    res.json({
      ...payload,
      hotspots: payload.hotspots.map(sanitizeHotspot),
      topHotspots: payload.topHotspots.map(sanitizeHotspot),
    });
    return;
  }

  res.json(payload);
});
