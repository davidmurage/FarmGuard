import Alert from "../models/Alert.js";
import Report from "../models/Report.js";
import { normalizeCountyKey } from "../utils/locationTargeting.js";

const AUTO_REPORT_SOURCE = "AUTO_REPORT_CLUSTER";
const AUTO_ALERT_TARGET_ROLES = ["FARMER", "VET"];
const AUTO_ALERT_CHANNELS = ["IN_APP"];
const SUPPORTED_REPORT_TYPES = new Set(["LIVESTOCK", "CROP"]);
const ACTIVE_REPORT_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "VERIFIED"];
const REPORT_WINDOW_DAYS = 14;
const MAX_DOMINANT_SIGNALS = 4;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "for",
  "from",
  "in",
  "into",
  "near",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "crop",
  "crops",
  "disease",
  "diseases",
  "field",
  "fields",
  "farm",
  "farms",
  "livestock",
  "animal",
  "animals",
  "plant",
  "plants",
  "reported",
  "report",
  "reports",
  "suspected",
]);

let refreshInFlight = null;

function normalizeCounty(value) {
  return String(value || "Unspecified").trim() || "Unspecified";
}

function buildSourceKey(county, reportType) {
  return `${normalizeCountyKey(county)}:${String(reportType || "").toUpperCase()}`;
}

function formatReportTypeLabel(reportType) {
  return reportType === "LIVESTOCK" ? "livestock disease" : "crop disease or pest";
}

function formatReportTypeTitle(reportType) {
  return reportType === "LIVESTOCK" ? "Livestock" : "Crop";
}

function normalizePhrase(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function titleCasePhrase(value) {
  return String(value || "").replace(/\b\w/g, (character) => character.toUpperCase());
}

function isUsefulPhrase(phrase) {
  if (!phrase || phrase.length < 3) {
    return false;
  }

  const terms = phrase.split(/\s+/).filter((term) => term.length > 2 && !STOP_WORDS.has(term));
  return terms.length > 0;
}

function extractSignalPhrases(report) {
  const phrases = [
    ...(report.symptoms || []),
    report.review?.diagnosis || "",
  ]
    .map(normalizePhrase)
    .filter(isUsefulPhrase);

  if (!phrases.length && report.title) {
    const fallbackTitle = normalizePhrase(report.title);

    if (isUsefulPhrase(fallbackTitle)) {
      phrases.push(fallbackTitle);
    }
  }

  return phrases;
}

function incrementCounter(counter, key) {
  counter.set(key, (counter.get(key) || 0) + 1);
}

function getSeverityWeight(severity) {
  switch (severity) {
    case "CRITICAL":
      return 5;
    case "HIGH":
      return 3.4;
    case "MEDIUM":
      return 2.1;
    default:
      return 1;
  }
}

function getStatusWeight(status) {
  switch (status) {
    case "VERIFIED":
      return 1.35;
    case "UNDER_REVIEW":
      return 1.15;
    default:
      return 1;
  }
}

function getRecencyWeight(createdAt) {
  const ageDays = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0.7, Number((1.45 - ageDays * 0.05).toFixed(2)));
}

function computeReportContribution(report) {
  return Number((getSeverityWeight(report.severity) * getStatusWeight(report.status) * getRecencyWeight(report.createdAt)).toFixed(2));
}

function buildRiskLevel(clusterScore, { reportCount, highRiskCount, verifiedCount }) {
  if (clusterScore >= 12 || (verifiedCount >= 2 && highRiskCount >= 2)) {
    return "CRITICAL";
  }

  if (clusterScore >= 8 || highRiskCount >= 2 || verifiedCount >= 2) {
    return "HIGH";
  }

  if (clusterScore >= 4.5 || (reportCount >= 2 && highRiskCount >= 1)) {
    return "MEDIUM";
  }

  return "LOW";
}

function shouldWarnCluster(cluster) {
  if (cluster.reportCount >= 3 && cluster.riskLevel !== "LOW") {
    return true;
  }

  if (cluster.reportCount >= 2 && (cluster.highRiskCount >= 1 || cluster.verifiedCount >= 1 || cluster.clusterScore >= 5.5)) {
    return true;
  }

  return cluster.reportCount === 1 && cluster.verifiedCount >= 1 && cluster.highRiskCount >= 1 && cluster.riskLevel === "CRITICAL";
}

function formatSignalList(signals) {
  if (!signals.length) {
    return "";
  }

  if (signals.length === 1) {
    return signals[0];
  }

  if (signals.length === 2) {
    return `${signals[0]} and ${signals[1]}`;
  }

  return `${signals.slice(0, -1).join(", ")}, and ${signals[signals.length - 1]}`;
}

function buildActionItems(cluster) {
  const actions = cluster.reportType === "LIVESTOCK"
    ? [
        "Isolate sick or exposed animals and reduce movement between herds until the pattern is clearer.",
        "Ask a vet to sample suspect cases, review feed and water hygiene, and disinfect shared housing or equipment.",
        "Report any new fever, diarrhea, cough, lesions, sudden deaths, or feed refusal in FarmGuard immediately.",
      ]
    : [
        "Inspect neighboring fields for the same warning signs and separate suspect planting material or shared tools where possible.",
        "Consult an extension officer early, remove heavily affected plants, and apply the recommended pest or disease control plan promptly.",
        "Report fresh spread, unusual wilting, leaf damage, discoloration, or rapid pest pressure in FarmGuard immediately.",
      ];

  if (cluster.dominantSignals.length) {
    actions.push(`Watch closely for matching signs such as ${formatSignalList(cluster.dominantSignals.map(titleCasePhrase))}.`);
  } else {
    actions.push("Compare any new cases against this county watch before symptoms spread further.");
  }

  return actions.slice(0, 4);
}

function buildAlertMessage(cluster) {
  const domainLabel = formatReportTypeLabel(cluster.reportType);
  const repeatedSignals = cluster.dominantSignals.length
    ? ` Repeated warning signs include ${formatSignalList(cluster.dominantSignals.map(titleCasePhrase))}.`
    : "";

  return `FarmGuard detected ${cluster.reportCount} recent ${cluster.reportType.toLowerCase()} reports in ${cluster.county} during the last ${REPORT_WINDOW_DAYS} days, including ${cluster.highRiskCount} high-risk and ${cluster.verifiedCount} verified cases.${repeatedSignals} This pattern suggests an elevated chance of a ${domainLabel} outbreak if new cases continue.`;
}

function buildSignalSummary(cluster) {
  return {
    county: cluster.county,
    reportType: cluster.reportType,
    reportCount: cluster.reportCount,
    highRiskCount: cluster.highRiskCount,
    verifiedCount: cluster.verifiedCount,
    dominantSignals: cluster.dominantSignals.map(titleCasePhrase),
    combinedRiskScore: cluster.clusterScore,
    detectionWindowDays: REPORT_WINDOW_DAYS,
    latestReportAt: cluster.latestReportAt,
  };
}

function toPlain(value) {
  return value?.toObject ? value.toObject() : value || {};
}

function arraysEqual(left = [], right = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasAlertChanged(alert, payload) {
  const currentSignalSummary = toPlain(alert.signalSummary);
  const nextSignalSummary = toPlain(payload.signalSummary);

  return alert.title !== payload.title
    || alert.message !== payload.message
    || alert.category !== payload.category
    || alert.riskLevel !== payload.riskLevel
    || alert.locationName !== payload.locationName
    || alert.isActive !== payload.isActive
    || alert.sourceKind !== payload.sourceKind
    || alert.sourceKey !== payload.sourceKey
    || !arraysEqual(alert.targetRoles || [], payload.targetRoles || [])
    || !arraysEqual(alert.targetCounties || [], payload.targetCounties || [])
    || !arraysEqual(alert.targetCountyKeys || [], payload.targetCountyKeys || [])
    || !arraysEqual(alert.deliveryChannels || [], payload.deliveryChannels || [])
    || !arraysEqual(alert.actionItems || [], payload.actionItems || [])
    || JSON.stringify(currentSignalSummary) !== JSON.stringify(nextSignalSummary);
}

function buildAutoAlertPayload(cluster, existingAlert = null) {
  const riskLevel = cluster.riskLevel;
  const statusLabel = riskLevel === "MEDIUM" ? "Watch" : "Warning";
  const preservedChannels = existingAlert?.deliveryChannels?.length ? existingAlert.deliveryChannels : AUTO_ALERT_CHANNELS;

  return {
    title: `${cluster.county} ${formatReportTypeTitle(cluster.reportType)} Outbreak ${statusLabel}`,
    message: buildAlertMessage(cluster),
    category: "AI outbreak warning",
    riskLevel,
    locationName: cluster.county,
    targetRoles: AUTO_ALERT_TARGET_ROLES,
    targetCounties: [cluster.county],
    targetCountyKeys: [normalizeCountyKey(cluster.county)],
    deliveryChannels: preservedChannels,
    actionItems: buildActionItems(cluster),
    isActive: true,
    sourceKind: AUTO_REPORT_SOURCE,
    sourceKey: cluster.sourceKey,
    signalSummary: buildSignalSummary(cluster),
  };
}

function createEmptyCluster(report) {
  return {
    county: normalizeCounty(report.location?.county),
    reportType: report.reportType,
    sourceKey: buildSourceKey(report.location?.county, report.reportType),
    reportCount: 0,
    highRiskCount: 0,
    verifiedCount: 0,
    latestReportAt: report.createdAt,
    clusterScore: 0,
    signalCounter: new Map(),
  };
}

function buildClusters(reports) {
  const clusterMap = new Map();

  for (const report of reports) {
    const county = normalizeCounty(report.location?.county);

    if (county === "Unspecified" || !SUPPORTED_REPORT_TYPES.has(report.reportType)) {
      continue;
    }

    const sourceKey = buildSourceKey(county, report.reportType);

    if (!clusterMap.has(sourceKey)) {
      clusterMap.set(sourceKey, createEmptyCluster(report));
    }

    const cluster = clusterMap.get(sourceKey);
    cluster.reportCount += 1;
    cluster.highRiskCount += ["HIGH", "CRITICAL"].includes(report.severity) ? 1 : 0;
    cluster.verifiedCount += report.status === "VERIFIED" ? 1 : 0;
    cluster.clusterScore += computeReportContribution(report);
    cluster.latestReportAt = new Date(report.createdAt).getTime() > new Date(cluster.latestReportAt).getTime()
      ? report.createdAt
      : cluster.latestReportAt;

    for (const phrase of extractSignalPhrases(report)) {
      incrementCounter(cluster.signalCounter, phrase);
    }
  }

  return Array.from(clusterMap.values())
    .map((cluster) => {
      const dominantSignals = Array.from(cluster.signalCounter.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, MAX_DOMINANT_SIGNALS)
        .map(([phrase]) => phrase);
      const clusterScore = Number(cluster.clusterScore.toFixed(2));
      const riskLevel = buildRiskLevel(clusterScore, cluster);

      return {
        county: cluster.county,
        reportType: cluster.reportType,
        sourceKey: cluster.sourceKey,
        reportCount: cluster.reportCount,
        highRiskCount: cluster.highRiskCount,
        verifiedCount: cluster.verifiedCount,
        latestReportAt: cluster.latestReportAt,
        clusterScore,
        dominantSignals,
        riskLevel,
        shouldWarn: shouldWarnCluster({
          reportCount: cluster.reportCount,
          highRiskCount: cluster.highRiskCount,
          verifiedCount: cluster.verifiedCount,
          clusterScore,
          riskLevel,
        }),
      };
    })
    .sort((left, right) => right.clusterScore - left.clusterScore || right.reportCount - left.reportCount);
}

async function saveAutoAlert(existingAlert, payload) {
  if (!existingAlert) {
    const createdAlert = new Alert(payload);
    await createdAlert.save();
    return "created";
  }

  if (!hasAlertChanged(existingAlert, payload)) {
    return "unchanged";
  }

  existingAlert.title = payload.title;
  existingAlert.message = payload.message;
  existingAlert.category = payload.category;
  existingAlert.riskLevel = payload.riskLevel;
  existingAlert.locationName = payload.locationName;
  existingAlert.targetRoles = payload.targetRoles;
  existingAlert.targetCounties = payload.targetCounties;
  existingAlert.targetCountyKeys = payload.targetCountyKeys;
  existingAlert.deliveryChannels = payload.deliveryChannels;
  existingAlert.actionItems = payload.actionItems;
  existingAlert.isActive = payload.isActive;
  existingAlert.sourceKind = payload.sourceKind;
  existingAlert.sourceKey = payload.sourceKey;
  existingAlert.signalSummary = payload.signalSummary;
  await existingAlert.save();
  return "updated";
}

export async function refreshAutoReportWarnings() {
  const since = new Date(Date.now() - REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [reports, currentAutoAlerts] = await Promise.all([
    Report.find({
      createdAt: { $gte: since },
      status: { $in: ACTIVE_REPORT_STATUSES },
      reportType: { $in: Array.from(SUPPORTED_REPORT_TYPES) },
    }).select("reportType severity status symptoms title location review.diagnosis createdAt"),
    Alert.find({ sourceKind: AUTO_REPORT_SOURCE }),
  ]);

  const clusters = buildClusters(reports);
  const activeClusters = clusters.filter((cluster) => cluster.shouldWarn);
  const autoAlertMap = new Map(currentAutoAlerts.map((alert) => [alert.sourceKey, alert]));
  const activeKeys = new Set();

  let created = 0;
  let updated = 0;
  let deactivated = 0;

  for (const cluster of activeClusters) {
    activeKeys.add(cluster.sourceKey);
    const payload = buildAutoAlertPayload(cluster, autoAlertMap.get(cluster.sourceKey));
    const result = await saveAutoAlert(autoAlertMap.get(cluster.sourceKey), payload);

    if (result === "created") {
      created += 1;
    } else if (result === "updated") {
      updated += 1;
    }
  }

  for (const alert of currentAutoAlerts) {
    if (!activeKeys.has(alert.sourceKey) && alert.isActive) {
      alert.isActive = false;
      await alert.save();
      deactivated += 1;
    }
  }

  return {
    windowDays: REPORT_WINDOW_DAYS,
    activeClusterCount: activeClusters.length,
    created,
    updated,
    deactivated,
  };
}

export async function refreshAutoReportWarningsSafely() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = refreshAutoReportWarnings()
    .catch((error) => {
      console.error("FarmGuard auto outbreak warning refresh failed", error);
      return {
        error: error.message,
        activeClusterCount: 0,
        created: 0,
        updated: 0,
        deactivated: 0,
      };
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}
