import Alert from "../models/Alert.js";
import Report, { REPORT_TYPES, REPORT_SEVERITIES, REPORT_STATUSES } from "../models/Report.js";

export const ANALYTICS_PERIODS = ["monthly", "quarterly"];
export const EXPORT_AUDIENCES = ["admin", "partner"];

function buildActiveAlertFilters(audience) {
  if (audience === "partner") {
    return {
      isActive: true,
      targetRoles: { $in: ["PARTNER", "ALL"] },
    };
  }

  return { isActive: true };
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfQuarter(date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth, 1);
}

function addQuarters(date, quarters) {
  return addMonths(date, quarters * 3);
}

function clampIntervals(period, intervals) {
  const parsedValue = Number(intervals);

  if (!Number.isFinite(parsedValue)) {
    return period === "quarterly" ? 4 : 6;
  }

  return period === "quarterly"
    ? Math.min(Math.max(Math.round(parsedValue), 2), 8)
    : Math.min(Math.max(Math.round(parsedValue), 3), 12);
}

function buildBuckets(period, intervals, now = new Date()) {
  const baseStart = period === "quarterly"
    ? startOfQuarter(now)
    : startOfMonth(now);

  const buckets = [];

  for (let index = intervals - 1; index >= 0; index -= 1) {
    const start = period === "quarterly"
      ? addQuarters(baseStart, -index)
      : addMonths(baseStart, -index);
    const end = period === "quarterly"
      ? addQuarters(start, 1)
      : addMonths(start, 1);

    buckets.push({
      key: period === "quarterly"
        ? `${start.getFullYear()}-Q${Math.floor(start.getMonth() / 3) + 1}`
        : `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: period === "quarterly"
        ? `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`
        : new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(start),
      start,
      end,
      totalReports: 0,
      highRiskReports: 0,
      verifiedReports: 0,
      resolvedReports: 0,
      reportTypeBreakdown: {
        LIVESTOCK: 0,
        CROP: 0,
        ENVIRONMENT: 0,
      },
    });
  }

  return buckets;
}

function incrementRecordCount(record, key) {
  record[key] = (record[key] || 0) + 1;
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function calculateTrendDirection(currentValue, previousValue) {
  if (!previousValue) {
    return currentValue ? "up" : "flat";
  }

  if (currentValue > previousValue) {
    return "up";
  }

  if (currentValue < previousValue) {
    return "down";
  }

  return "flat";
}

function buildInsights({ totals, topCounties, reportTypeBreakdown, buckets }) {
  const highestCounty = topCounties[0];
  const leadingType = reportTypeBreakdown[0];
  const currentBucket = buckets[buckets.length - 1];
  const previousBucket = buckets[buckets.length - 2] || null;
  const trendDirection = calculateTrendDirection(currentBucket?.totalReports || 0, previousBucket?.totalReports || 0);
  const insights = [];

  if (highestCounty) {
    insights.push(`${highestCounty.county} is the current top hotspot with ${highestCounty.reportCount} reports in the selected range.`);
  }

  if (leadingType) {
    insights.push(`${leadingType.type.toLowerCase()} reports are currently the dominant signal category.`);
  }

  insights.push(`Verification rate is ${formatPercent(totals.verificationRate)} and resolution rate is ${formatPercent(totals.resolutionRate)}.`);

  if (trendDirection === "up") {
    insights.push("Recent report volume is rising compared with the previous reporting window.");
  } else if (trendDirection === "down") {
    insights.push("Recent report volume is declining compared with the previous reporting window.");
  } else {
    insights.push("Recent report volume is stable compared with the previous reporting window.");
  }

  return insights;
}

function sortBreakdownEntries(record, labelKey) {
  return Object.entries(record)
    .map(([label, count]) => ({ [labelKey]: label, count }))
    .sort((left, right) => right.count - left.count);
}

function findBucketForDate(buckets, dateValue) {
  const timestamp = new Date(dateValue).getTime();

  return buckets.find((bucket) => timestamp >= bucket.start.getTime() && timestamp < bucket.end.getTime());
}

export async function buildAnalyticsOverview({ period = "monthly", intervals = 6, audience = "admin" } = {}) {
  const safePeriod = ANALYTICS_PERIODS.includes(period) ? period : "monthly";
  const safeIntervals = clampIntervals(safePeriod, intervals);
  const safeAudience = EXPORT_AUDIENCES.includes(audience) ? audience : "admin";
  const buckets = buildBuckets(safePeriod, safeIntervals);
  const earliestStart = buckets[0].start;

  const [reports, activeAlertCount] = await Promise.all([
    Report.find({ createdAt: { $gte: earliestStart } })
      .sort({ createdAt: -1 })
      .select("title reportType severity status createdAt location review"),
    Alert.countDocuments(buildActiveAlertFilters(safeAudience)),
  ]);

  const severityCounts = Object.fromEntries(REPORT_SEVERITIES.map((severity) => [severity, 0]));
  const statusCounts = Object.fromEntries(REPORT_STATUSES.map((status) => [status, 0]));
  const typeCounts = Object.fromEntries(REPORT_TYPES.map((type) => [type, 0]));
  const countyMap = new Map();

  let totalReports = 0;
  let highRiskReports = 0;
  let verifiedReports = 0;
  let resolvedReports = 0;

  for (const report of reports) {
    totalReports += 1;
    incrementRecordCount(severityCounts, report.severity);
    incrementRecordCount(statusCounts, report.status);
    incrementRecordCount(typeCounts, report.reportType);

    if (["HIGH", "CRITICAL"].includes(report.severity)) {
      highRiskReports += 1;
    }

    if (report.status === "VERIFIED") {
      verifiedReports += 1;
    }

    if (report.status === "RESOLVED") {
      resolvedReports += 1;
    }

    const county = report.location?.county?.trim() || "Unspecified";

    if (!countyMap.has(county)) {
      countyMap.set(county, {
        county,
        reportCount: 0,
        highRiskReports: 0,
        verifiedReports: 0,
      });
    }

    const countyEntry = countyMap.get(county);
    countyEntry.reportCount += 1;
    countyEntry.highRiskReports += ["HIGH", "CRITICAL"].includes(report.severity) ? 1 : 0;
    countyEntry.verifiedReports += report.status === "VERIFIED" ? 1 : 0;

    const bucket = findBucketForDate(buckets, report.createdAt);
    if (bucket) {
      bucket.totalReports += 1;
      bucket.highRiskReports += ["HIGH", "CRITICAL"].includes(report.severity) ? 1 : 0;
      bucket.verifiedReports += report.status === "VERIFIED" ? 1 : 0;
      bucket.resolvedReports += report.status === "RESOLVED" ? 1 : 0;
      incrementRecordCount(bucket.reportTypeBreakdown, report.reportType);
    }
  }

  const verificationRate = totalReports ? (verifiedReports / totalReports) * 100 : 0;
  const resolutionRate = totalReports ? (resolvedReports / totalReports) * 100 : 0;
  const highRiskRate = totalReports ? (highRiskReports / totalReports) * 100 : 0;

  const topCounties = Array.from(countyMap.values()).sort((left, right) => right.reportCount - left.reportCount).slice(0, 5);
  const reportTypeBreakdown = sortBreakdownEntries(typeCounts, "type");
  const severityBreakdown = sortBreakdownEntries(severityCounts, "severity");
  const statusBreakdown = sortBreakdownEntries(statusCounts, "status");

  const recentHighlights = reports.slice(0, 6).map((report) => ({
    id: String(report._id),
    title: report.title,
    county: report.location?.county?.trim() || "Unspecified",
    locationName: report.location?.name?.trim() || "Unknown location",
    reportType: report.reportType,
    severity: report.severity,
    status: report.status,
    createdAt: report.createdAt,
  }));

  const totals = {
    totalReports,
    highRiskReports,
    verifiedReports,
    resolvedReports,
    activeAlertCount,
    verificationRate,
    resolutionRate,
    highRiskRate,
  };

  return {
    generatedAt: new Date().toISOString(),
    audience: safeAudience,
    period: safePeriod,
    intervals: safeIntervals,
    rangeLabel: `${safeIntervals} ${safePeriod === "quarterly" ? "quarters" : "months"}`,
    totals,
    trendBuckets: buckets.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      totalReports: bucket.totalReports,
      highRiskReports: bucket.highRiskReports,
      verifiedReports: bucket.verifiedReports,
      resolvedReports: bucket.resolvedReports,
      reportTypeBreakdown: bucket.reportTypeBreakdown,
    })),
    reportTypeBreakdown,
    severityBreakdown,
    statusBreakdown,
    topCounties,
    recentHighlights,
    insights: buildInsights({
      totals,
      topCounties,
      reportTypeBreakdown,
      buckets,
    }),
  };
}

export function buildExportView(overview, audience = "admin") {
  const safeAudience = EXPORT_AUDIENCES.includes(audience) ? audience : "admin";

  return {
    audience: safeAudience,
    generatedAt: overview.generatedAt,
    period: overview.period,
    intervals: overview.intervals,
    rangeLabel: overview.rangeLabel,
    totals: overview.totals,
    trendBuckets: overview.trendBuckets,
    reportTypeBreakdown: overview.reportTypeBreakdown,
    severityBreakdown: overview.severityBreakdown,
    statusBreakdown: overview.statusBreakdown,
    topCounties: overview.topCounties,
    recentHighlights:
      safeAudience === "admin"
        ? overview.recentHighlights
        : overview.recentHighlights.map((item) => ({
            id: `${item.county}-${item.reportType}-${item.createdAt}`,
            title: `${item.county} aggregated signal`,
            county: item.county,
            reportType: item.reportType,
            severity: item.severity,
            status: item.status,
            createdAt: item.createdAt,
          })),
    insights: overview.insights,
    confidentialityNote:
      safeAudience === "partner"
        ? "Partner export view is aggregated and anonymized for safer sharing."
        : "Admin export view includes operational details for internal coordination.",
  };
}
