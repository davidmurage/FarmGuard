import Alert from "../models/Alert.js";
import Report from "../models/Report.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeAlert, serializeReport } from "../utils/serializers.js";

function buildSummaryCards(role, metrics) {
  const secondLabel = role === "ADMIN" ? "Pending triage" : role === "VET" ? "Field follow-ups" : "Open follow-ups";

  return [
    {
      key: "totalReports",
      label: role === "FARMER" ? "My reports" : "Reports tracked",
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
      label: "Active alerts",
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

  const [recentReports, activeAlerts, totalReports, openReports, highRiskReports] = await Promise.all([
    Report.find(reportFilters)
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("reporter", "name email role")
      .populate("review.reviewedBy", "name email role"),
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
    recentReports: recentReports.map(serializeReport),
    activeAlerts: activeAlerts.map(serializeAlert),
    quickActions: buildQuickActions(req.user.role),
  });
});
